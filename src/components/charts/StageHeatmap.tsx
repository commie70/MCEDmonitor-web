import type { PathfinderTable, PfCell } from "@/data/types";

/** 灵敏度 → 6 档(单一色相由浅到深)；配色在 globals.css 的 [data-heat]。 */
function bin(pct: number): number {
  if (pct <= 0) return 0;
  if (pct < 20) return 1;
  if (pct < 40) return 2;
  if (pct < 60) return 3;
  if (pct < 80) return 4;
  return 5;
}

function Cell({ cell, strong }: { cell: PfCell; strong?: boolean }) {
  if (!cell) return <td className="border border-panel px-1 py-[5px] text-center text-line-strong">·</td>;
  const [pct, fraction] = cell;
  return (
    <td
      data-heat={bin(pct)}
      title={`${pct}%（${fraction}）`}
      className={`border border-panel px-1 py-[5px] text-center tabular-nums ${strong ? "font-bold" : ""}`}
    >
      <span className="block text-[12px] leading-[1.2]">{pct}%</span>
      <span className="block text-[10.5px] leading-[1.2] opacity-80">{fraction}</span>
    </td>
  );
}

/** 癌种 × 分期的灵敏度热力表(检出 / 总数)。 */
export function StageHeatmap({ table }: { table: PathfinderTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="sticky-first w-full min-w-[720px] border-collapse text-[12px]">
        <thead>
          <tr className="text-[11.5px] text-ink-3">
            <th scope="col" className="px-2 py-2 text-left font-semibold">
              癌种
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              n
            </th>
            {table.stages.map((stage) => (
              <th key={stage} scope="col" className="px-1 py-2 text-center font-semibold">
                {stage}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.cancer}>
              <th scope="row" className="whitespace-nowrap px-2 py-[5px] text-left font-normal text-ink-2">
                {row.cancer}
              </th>
              <td className="px-2 text-right tabular-nums text-ink-3">{row.n}</td>
              {row.cells.map((cell, index) => (
                <Cell key={table.stages[index]} cell={cell} strong={index === row.cells.length - 1} />
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="px-2 py-[5px] text-left font-bold text-ink">
              合计
            </th>
            <td />
            {table.total.map((cell, index) => (
              <Cell key={table.stages[index]} cell={cell} strong />
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
