import { LayoutDashboard, Trophy, Users, Calendar, type LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
];
