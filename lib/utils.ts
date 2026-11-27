import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Index a list by a key, e.g. lookup(people, (p) => p.user_id).get(id)
export function lookup<T>(items: T[], key: (item: T) => string) {
  return new Map(items.map((item) => [key(item), item]));
}
