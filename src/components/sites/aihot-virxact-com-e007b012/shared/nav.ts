import {
  BarChart3,
  Bookmark,
  Flame,History,
  Info,
  LayoutGrid,
  List,
  MessageSquareText,
  Newspaper,
  Plug,
  Zap, type LucideIcon,} from "lucide-react";

export interface NavItem {
  label: string;
  /** 已实现路由；undefined = 演示版未开放(渲染为视觉项，不跳转) */
  href?: string;
  icon: LucideIcon;
  /** 侧栏红点徽章(如「更新日志」) */
  dot?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "内容",
    items: [
      { label: "精选", href: "/", icon: Zap },{ label: "全部动态", href: "/all", icon: List },{ label: "热点榜", href: "/hot", icon: Flame },{ label: "监测日报", href: "/daily", icon: Newspaper },{ label: "主题", href: "/topics", icon: LayoutGrid },{ label: "收藏", href: "/starred", icon: Bookmark },],},{
    label: "竞品",
    items: [{ label: "早筛产品看板", href: "/leaderboard", icon: BarChart3 }],},{
    label: "更多",
    items: [
      { label: "Agent 接入", href: "/agent", icon: Plug },{ label: "更新日志", href: "/changelog", icon:History, dot: true },{ label: "反馈", href: "/feedback", icon: MessageSquareText },{ label: "关于", href: "/about", icon: Info },],},];

/** 移动端底部标签栏(4 项) */
export const MOBILE_TABS: NavItem[] = [
  { label: "精选", href: "/", icon: Zap },{ label: "动态", href: "/all", icon: List },{ label: "热点", href: "/hot", icon: Flame },{ label: "更多", icon: LayoutGrid },];
