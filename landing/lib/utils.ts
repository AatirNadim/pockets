import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const generateRandomUsername = (): string => {
  const adjectives = [
    "Swift", "Bright", "Cool", "Fast", "Smart",
    "Bold", "Calm", "Keen", "Quick", "Sharp",
    "Wise", "Brave", "Clear", "Fresh",
  ];
  const nouns = [
    "Fox", "Eagle", "Wolf", "Tiger", "Lion",
    "Bear", "Hawk", "Owl", "Shark", "Falcon",
    "Raven", "Phoenix", "Dragon", "Panther",
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}${noun}${number}`;
};

export const getAppUrl = (): string => {
  if (typeof window !== "undefined") {
    // If configured via environment variable, use it
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    // In local development, default to port 3000 if landing is on 3001
    if (window.location.port === "3001") {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    // Otherwise fallback to same origin
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};
