import Link from "next/link";

const SHORTCUTS = [
  { label: "精选", href: "/" },
  { label: "全部动态", href: "/all" },
  { label: "产品看板", href: "/leaderboard" },
  { label: "信源库", href: "/sources" },
];

export function NotFoundView() {
  return (
    <div className="mx-auto max-w-[420px] px-4 py-24 text-center">
      <p className="font-mono text-[13px] tracking-[0.2em] text-ink-3">404</p>
      <h1 className="mt-3 text-[22px] font-bold text-ink">页面不存在</h1>
      <nav aria-label="常用入口" className="mt-6 flex flex-wrap justify-center gap-2">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="rounded-full border border-line bg-panel px-[14px] py-[5px] text-[13px] text-ink-2 transition hover:border-accent hover:text-accent-ink"
          >
            {shortcut.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
