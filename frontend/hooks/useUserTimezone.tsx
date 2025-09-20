import { getTimezoneInfo } from "@/lib/utils";
import React from "react";

export const useUserTimezone = () => {
  const [timezoneInfo, setTimezoneInfo] = React.useState(() =>
    getTimezoneInfo()
  );

  React.useEffect(() => {
    // Update timezone info when component mounts
    // This handles cases where timezone might change (very rare)
    const updateTimezone = () => {
      setTimezoneInfo(getTimezoneInfo());
    };

    // Optional: Listen for focus events to detect potential timezone changes
    // (e.g., user travels with laptop and changes system timezone)
    window.addEventListener("focus", updateTimezone);

    return () => {
      window.removeEventListener("focus", updateTimezone);
    };
  }, []);

  return timezoneInfo;
};
