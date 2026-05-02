import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatElevation(value: number) {
  return `${value.toLocaleString()} ft`;
}

export function formatWind(speed: number, direction: string) {
  return `${direction} ${speed} mph`;
}
