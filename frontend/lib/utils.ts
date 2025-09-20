import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const MAX_WORDS = 40;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUserTimezone = (): string => {
  try {
    // Modern browsers support Intl.DateTimeFormat
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback for older browsers or if Intl is not available
    console.warn("Unable to determine timezone:", error);
    return "UTC";
  }
};

export const getTimezoneInfo = () => {
  const timezone = getUserTimezone();
  const now = new Date();

  // Get timezone offset in minutes
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.abs(offsetMinutes / 60);
  const offsetSign = offsetMinutes > 0 ? "-" : "+";

  // Format offset as +/-HH:MM
  const formattedOffset = `${offsetSign}${String(
    Math.floor(offsetHours)
  ).padStart(2, "0")}:${String(Math.abs(offsetMinutes % 60)).padStart(2, "0")}`;

  // Get timezone abbreviation (e.g., EST, PST)
  const abbreviation =
    new Intl.DateTimeFormat("en", {
      timeZoneName: "short",
      timeZone: timezone,
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value || "Unknown";

  return {
    timezone,
    offset: formattedOffset,
    abbreviation,
    offsetMinutes,
  };
};

export const formatMessageTime = (
  timestamp: string | Date,
  timezone?: string
) => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const userTimezone = timezone || getUserTimezone();

  return new Intl.DateTimeFormat("en-US", {
    timeZone: userTimezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};
