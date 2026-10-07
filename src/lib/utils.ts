import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundIfNumber(value: number | string | null) {
  if (typeof value === "number") {
    return parseFloat(value.toFixed(2)); // Round to 2 decimal places
  } else if (typeof value === "string") {
    const num = parseFloat(value);
    const rounded = parseFloat(num.toFixed(2));
    return rounded; // Return as is if it's not a number
  }
  return value;
}

export function convertDateToString(date: Date): string {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

export const PRICE_ID: string = "price_1TDBdm2NxTeRy0bMFFNy0qkC";
