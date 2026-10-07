import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PRICE_ID: string = "price_1TDBdm2NxTeRy0bMFFNy0qkC";
