import { useCallback } from "react";
import { z } from "zod";

// ---------- Error Schemas ----------
export const APIErrorSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
  code: z.string().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

// ---------- Custom Hook for API Errors ----------
const useApiError = () => {
  const handleApiError = useCallback((error: unknown): APIError => {
    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        message: "Network error occurred",
        code: "NETWORK_ERROR",
      };
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        message: error.message,
        code: "GENERIC_ERROR",
      };
    }

    // Handle API response errors with status codes
    if (typeof error === "object" && error !== null) {
      const errorObj = error as Record<string, unknown>;

      if (typeof errorObj.message === "string") {
        return {
          message: errorObj.message,
          status:
            typeof errorObj.status === "number" ? errorObj.status : undefined,
          code: typeof errorObj.code === "string" ? errorObj.code : undefined,
        };
      }
    }

    // Fallback for unknown error types
    return {
      message: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    };
  }, []);

  const createApiError = useCallback(
    (message: string, status?: number, code?: string): APIError => {
      return { message, status, code };
    },
    []
  );

  return {
    handleApiError,
    createApiError,
  };
};

export default useApiError;
