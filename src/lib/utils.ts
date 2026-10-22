import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// British English leaves out the comma before "or" ("5, 10 or 15"), as the rest of the copy does.
const orList = new Intl.ListFormat("en-GB", { type: "disjunction" });

/** "5, 10 or 15" */
export const formatOrList = (items: readonly number[]) => orList.format(items.map(String));
