export type CommandCategory = "page" | "user" | "course";

export interface CommandItem {
  id: string;
  category: CommandCategory;
  label: string;
  description?: string;
  icon: string;
  action: () => void;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  items: CommandItem[];
}

export interface RecentItem {
  label: string;
  description?: string;
  category: CommandCategory;
  icon: string;
  path: string;
}
