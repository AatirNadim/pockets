import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChatMessage } from "@pockets/shared";
import { generateRandomUsername } from "./stores/userStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const formatBytes = (size: number) => {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );
  const value = size / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveSender = (
  message: ChatMessage & { user?: string },
  currentUserId: string
) => {
  if (message.userName) {
    return message.userName;
  }
  if (message.user) {
    return message.user;
  }
  if (message.userId && message.userId === currentUserId) {
    return "You";
  }
  return "Guest";
};

export {
  isValidUUID,
  formatBytes,
  formatTimestamp,
  resolveSender,
  generateRandomUsername,
};
