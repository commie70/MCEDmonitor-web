import type { MatrixProduct } from "@/components/board/mrd-parts";
import { resolveSources, sourceHref, type MrdProduct } from "@/data";
import type { EventLink } from "@/lib/event-model";

/** 信源 ID → 可点击的公开链接(站内重建页走站内路由)。 */
export function sourceLinks(ids: string[]): EventLink[] {
  return resolveSources(ids).map((source) => ({ label: source.label, href: sourceHref(source), kind: source.kind }));
}

function withLinks<T extends { sources: string[] }>({ sources, ...rest }: T): Omit<T, "sources"> & { links: EventLink[] } {
  return { ...rest, links: sourceLinks(sources) };
}

/** 证据库里的 MRD 产品 → 页面用的形态：逐格信源解析成链接。 */
export function toMatrixProduct({ sources, lod, clinical, statuses, prices, ...product }: MrdProduct): MatrixProduct {
  return {
    ...product,
    lod: lod.map(withLinks),
    clinical: clinical.map(withLinks),
    statuses: statuses.map(withLinks),
    prices: prices.map(withLinks),
    links: sourceLinks(sources),
  };
}
