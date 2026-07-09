import {
  LayoutDashboard,
  Trophy,
  Users,
  Building2,
  Calendar,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Highlight when pathname equals or is nested under this prefix. */
  activePrefix?: string;
  /** Render only for admin users. */
  adminOnly?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  {
    label: "Schools",
    href: "/schools",
    icon: Building2,
    activePrefix: "/schools",
  },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Admin", href: "/admin", icon: ShieldAlert, adminOnly: true },
];
