import {
  Monitor,
  Link2,
  Star,
  Lock,
  Settings,
  FileText,
  Activity,
  ShoppingBag,
  LucideIcon
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: string;
  badge?: string;
  hasNotif?: boolean;
};

export const mainNav: NavItem[] = [
  { label: "Agents", icon: Monitor, href: "/", badge: "6" },
  { label: "Agent Store", icon: ShoppingBag, href: "/store" },
  { label: "MCP Servers", icon: Link2, href: "/mcps", badge: "8" },
  { label: "Skills", icon: Star, href: "/skills", badge: "12" },
  { label: "Credentials", icon: Lock, href: "/credentials", hasNotif: true },
];

export const workspaceNav: NavItem[] = [
  { label: "Logs", icon: FileText, href: "/logs" },
  { label: "Activity", icon: Activity, href: "/activity" },
];

export const settingsNav: NavItem[] = [
  { label: "Settings", icon: Settings, action: "open-settings" },
];

export const allNavigation = [...mainNav, ...workspaceNav, ...settingsNav];
