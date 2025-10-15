import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatRuntime = (minutes?: number | string): string => {
  if (!minutes) return "-";
  const mins = typeof minutes === "string" ? parseInt(minutes) : minutes;
  if (isNaN(mins)) return "-";

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours === 0) return `${remainingMins}min`;
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
};
