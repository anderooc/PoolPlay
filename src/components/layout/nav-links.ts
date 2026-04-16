import {
  Home,
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Home", href: "/", icon: Home, exact: true },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Explore", href: "/explore", icon: Globe },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
];
