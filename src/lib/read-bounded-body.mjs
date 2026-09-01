/**
 * @param {Request} request
 * @param {number} maxBytes
 * @param {number} timeoutMs
 */
export async function readBoundedBody(request, maxBytes, timeoutMs = 10_000) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks = [];
  let total = 0;
  let timeout;
  const deadline = new Promise((_resolve, reject) => {
    timeout = setTimeout(() => reject(new RangeError("body timeout")), timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("body too large");
        throw new RangeError("body too large");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    if (timeout) clearTimeout(timeout);
    if (total <= maxBytes) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
