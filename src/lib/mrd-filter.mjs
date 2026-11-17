/** Independent tissue discovery and blood tracking facets; no cross-unit ranking. */
export function filterMrdProducts(products, filter = {}) {
  const q = String(filter.q || "").trim().toLowerCase();
  return products.filter((p) => ["approach", "tissue", "tracking", "region", "category"].every((key) => !filter[key] || filter[key] === "all" || String(p[key] ?? "none") === filter[key]) && (!q || [p.company, p.product, p.country, p.targets, p.tissueDetail, p.trackingDetail, ...p.clinical.map((s) => s.cancer)].join(" ").toLowerCase().includes(q)));
}
