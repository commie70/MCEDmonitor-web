import {
  BadgeCheck,
  Bookmark,
  ChartScatter,
  Flame,
  Grid3x3,
  History,
  Info,
  LayoutGrid,
  Library,
  List,
  MessageSquareText,
  Microscope,
  Newspaper,
  Plug,
  Table2,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 这些路径前缀也算作该项激活 */
  match?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "动态",
    items: [
      { label: "精选", href: "/", icon: Zap },
      { label: "全部动态", href: "/all", icon: List, match: ["/items"] },
      { label: "热点榜", href: "/hot", icon: Flame },
      { label: "监测日报", href: "/daily", icon: Newspaper },
      { label: "主题", href: "/topics", icon: LayoutGrid },
      { label: "收藏", href: "/starred", icon: Bookmark },
    ],
  },
  {
    label: "证据库",
    items: [
      { label: "产品看板", href: "/leaderboard", icon: Table2, match: ["/companies"] },
      { label: "性能对照", href: "/performance", icon: ChartScatter, match: ["/studies"] },
      { label: "报证进度", href: "/regulatory", icon: BadgeCheck },
      { label: "癌种覆盖", href: "/coverage", icon: Grid3x3 },
      { label: "MRD 矩阵", href: "/mrd", icon: Microscope },
      { label: "信源库", href: "/sources", icon: Library },
    ],
  },
  {
    label: "更多",
    items: [
      { label: "Agent 接入", href: "/agent", icon: Plug },
      { label: "更新日志", href: "/changelog", icon: History },
      { label: "反馈", href: "/feedback", icon: MessageSquareText },
      { label: "关于", href: "/about", icon: Info },
    ],
  },
];

/** 移动端底部标签栏 */
export const MOBILE_TABS: NavItem[] = [
  { label: "精选", href: "/", icon: Zap },
  { label: "动态", href: "/all", icon: List, match: ["/items"] },
  { label: "看板", href: "/leaderboard", icon: Table2, match: ["/companies"] },
  { label: "对照", href: "/performance", icon: ChartScatter, match: ["/studies"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
