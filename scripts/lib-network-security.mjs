import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";

export const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export const MAX_REQUEST_DURATION_MS = 120_000;

const PUBLIC_ERROR_MESSAGES = new Set([
  "acceptance_failed",
  "analysis_error",
  "collection_error",
  "configuration_missing",
  "historical_error",
  "model_processing_failed",
  "provider_error",
  "request_failed",
  "url_invalid",
  "url_scheme_not_allowed",
  "url_credentials_not_allowed",
  "url_port_not_allowed",
  "url_private_address",
  "redirect_not_allowed",
  "discovery_content_fetch_failed",
  "discovery_content_fetch_unavailable",
  "unsupported_request_body",
  "credentialed_cross_origin_redirect",
]);

const PUBLIC_NETWORK_ERROR_CODES = new Set([
  "eai_again",
  "econnaborted",
  "econnrefused",
  "econnreset",
  "ehostunreach",
  "enetunreach",
  "enotfound",
  "epipe",
  "etimedout",
]);

function normalizedErrorCode(value, fallback) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 64);
  return normalized || fallback;
}

function ipv4ToNumber(value) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts.reduce((result, part) => result * 256 + part, 0);
}

function ipv6ToBigInt(address) {
  let normalized = address.toLowerCase().split("%")[0];
  const dottedTail = normalized.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dottedTail) {
    const ipv4 = ipv4ToNumber(dottedTail);
    if (ipv4 === null) return null;
    normalized = normalized.slice(0, -dottedTail.length) + `${(ipv4 >>> 16).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((result, group) => (result << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function matchesIpv6Cidr(value, prefix, bits) {
  const shift = BigInt(128 - bits);
  return value >> shift === prefix >> shift;
}

const BLOCKED_IPV6_CIDRS = [
  ["::", 64], // Low-address IPv4-compatible, mapped, and translated forms.
  ["64:ff9b::", 96], // Well-known NAT64 prefix.
  ["64:ff9b:1::", 48], // Local-use NAT64 prefix.
  ["100::", 64], // Discard-only prefix.
  ["2001:db8::", 32], // Documentation.
  ["2002::", 16], // 6to4 embeds an IPv4 destination.
  ["fc00::", 7], // Unique local.
  ["fe80::", 10], // Link local.
  ["ff00::", 8], // Multicast.
].map(([prefix, bits]) => [ipv6ToBigInt(prefix), bits]);

function isPrivateAddress(address) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (net.isIPv4(normalized)) {
    const value = ipv4ToNumber(normalized);
    if (value === null) return true;
    const ranges = [
      [0x00000000, 0x00ffffff],
      [0x0a000000, 0x0affffff],
      [0x64400000, 0x647fffff],
      [0x7f000000, 0x7fffffff],
      [0xa9fe0000, 0xa9feffff],
      [0xac100000, 0xac1fffff],
      [0xc0a80000, 0xc0a8ffff],
      [0xc0000000, 0xc00000ff],
      [0xc0000200, 0xc00002ff],
      [0xc0120000, 0xc012ffff],
      [0xc6336400, 0xc63364ff],
      [0xc6120000, 0xc613ffff],
      [0xcb007100, 0xcb0071ff],
      [0xe0000000, 0xffffffff],
    ];
    return ranges.some(([start, end]) => value >= start && value <= end);
  }
  if (net.isIPv6(normalized)) {
    const value = ipv6ToBigInt(normalized);
    if (value === null) return true;
    return BLOCKED_IPV6_CIDRS.some(([prefix, bits]) => matchesIpv6Cidr(value, prefix, bits));
  }
  return true;
}

export async function validatePublicUrl(input, { allowHttp = false } = {}) {
  let url;
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(String(input));
  } catch {
    throw new Error("url_invalid");
  }
  const protocols = allowHttp ? new Set(["http:", "https:"]) : new Set(["https:"]);
  if (!protocols.has(url.protocol)) throw new Error("url_scheme_not_allowed");
  if (url.username || url.password) throw new Error("url_credentials_not_allowed");
  if (url.port && !new Set(allowHttp ? ["80", "443"] : ["443"]).has(url.port)) throw new Error("url_port_not_allowed");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true, order: "ipv4first" })).map(({ address }) => address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error("url_private_address");
  return { url, addresses };
}

export async function fetchPublic(input, init = {}, { allowHttp = false, maxRedirects = MAX_REDIRECTS } = {}) {
  let current = String(input);
  const durationSignal = AbortSignal.timeout(MAX_REQUEST_DURATION_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, durationSignal]) : durationSignal;
  let requestInit = { ...init, signal, redirect: "manual" };
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const validated = await validatePublicUrl(current, { allowHttp });
    const response = await requestValidated(validated, requestInit);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirects === maxRedirects) throw new Error("redirect_not_allowed");
    await response.body?.cancel();
    const next = new URL(location, validated.url);
    if (next.origin !== validated.url.origin) {
      assertSafeCrossOriginRedirect(requestInit);
      const headers = new Headers(requestInit.headers);
      for (const name of ["authorization", "cookie", "proxy-authorization"]) headers.delete(name);
      requestInit = { ...requestInit, headers };
    }
    current = next.href;
    if ([301, 302, 303].includes(response.status) && requestInit.method && requestInit.method !== "GET" && requestInit.method !== "HEAD") {
      requestInit = { ...requestInit, method: "GET", body: undefined };
    }
  }
  throw new Error("redirect_not_allowed");
}

export function assertSafeCrossOriginRedirect(init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  if (!new Set(["GET", "HEAD"]).has(method) || (init.body !== undefined && init.body !== null)) {
    throw new Error("credentialed_cross_origin_redirect");
  }
  const safeHeaders = new Set(["accept", "accept-language", "user-agent"]);
  for (const name of new Headers(init.headers).keys()) {
    if (!safeHeaders.has(name)) throw new Error("credentialed_cross_origin_redirect");
  }
}

function requestValidated({ url, addresses }, init) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const headers = new Headers(init.headers);
    let body = null;
    if (typeof init.body === "string") body = Buffer.from(init.body);
    else if (init.body instanceof URLSearchParams) body = Buffer.from(init.body.toString());
    else if (init.body instanceof ArrayBuffer) body = Buffer.from(init.body);
    else if (ArrayBuffer.isView(init.body)) body = Buffer.from(init.body.buffer, init.body.byteOffset, init.body.byteLength);
    else if (init.body !== undefined && init.body !== null) throw new TypeError("unsupported_request_body");
    if (body && !headers.has("content-length")) headers.set("content-length", String(body.byteLength));
    let settled = false;
    const request = transport.request(url, {
      method: init.method || "GET",
      headers: Object.fromEntries(headers.entries()),
      servername: url.hostname,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0], net.isIPv6(addresses[0]) ? 6 : 4),
      signal: init.signal,
    }, (response) => {
      settled = true;
      const status = response.statusCode || 500;
      const responseHeaders = Object.fromEntries(
        Object.entries(response.headers).filter((entry) => entry[1] !== undefined)
      );
      const hasBody = ![204, 205, 304].includes(status);
      if (!hasBody) response.resume();
      resolve(new Response(hasBody ? Readable.toWeb(response) : null, {
        status,
        statusText: response.statusMessage,
        headers: responseHeaders,
      }));
    });
    request.once("error", (error) => {
      if (!settled) reject(error);
    });
    if (body) request.write(body);
    request.end();
  });
}

export async function readCappedBody(response, label, maxBytes = MAX_RESPONSE_BYTES) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel(`${label}_body_too_large`).catch(() => {});
    throw new Error(`${label}_body_too_large`);
  }
  if (!response.body) {
    if (Number.isFinite(declared) && declared === 0) return "";
    throw new Error(`${label}_body_unavailable`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`${label}_body_too_large`);
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return chunks.join("");
}

export async function fetchPublicText(url, label, init = {}, options = {}) {
  const response = await fetchPublic(url, init, options);
  if (!response.ok) throw new Error(`${label}_http_${response.status}`);
  return readCappedBody(response, label, options.maxBytes);
}

export function publicErrorCode(error, fallback = "request_failed") {
  const safeFallback = normalizedErrorCode(fallback, "request_failed");
  const message = String(error?.message || error || "");
  const status = /(?:\bHTTP\s+|_http_)(\d{3})\b/i.exec(message)?.[1];
  if (status) return `http_${status}`;
  if (PUBLIC_ERROR_MESSAGES.has(message)) return message;
  if (/_body_too_large\b/.test(message)) return "response_too_large";
  if (/_body_unavailable\b/.test(message)) return "response_unavailable";
  const networkCode = normalizedErrorCode(error?.code, "");
  if (PUBLIC_NETWORK_ERROR_CODES.has(networkCode)) return networkCode;
  if (error?.name === "AbortError") return "request_aborted";
  if (error?.name === "TimeoutError") return "request_timeout";
  return safeFallback;
}
