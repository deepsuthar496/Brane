import {
  Monitor,
  Link2,
  Star,
  Lock,
  Settings,
  ShoppingBag,
  BrainCircuit,
  Bot,
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
  { label: "Agents", icon: Monitor, href: "/" },
  { label: "Brainzo", icon: Bot, href: "/brainzo" },
  { label: "Agent Store", icon: ShoppingBag, href: "/store" },
  { label: "Knowledge", icon: BrainCircuit, href: "/knowledge" },
  { label: "MCP Servers", icon: Link2, href: "/mcps" },
  { label: "Skills", icon: Star, href: "/skills" },
];

export const workspaceNav: NavItem[] = [];

export const settingsNav: NavItem[] = [
  { label: "Settings", icon: Settings, action: "open-settings" },
];

export const allNavigation = [...mainNav, ...settingsNav];
