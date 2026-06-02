import type { ComponentType } from "react";

export interface UserData {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface SubItem {
  label: string;
  href: string;
}

export interface SidebarItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  subItems?: SubItem[];
}

export interface SidebarGroup {
  groupName: string;
  items: SidebarItem[];
}
