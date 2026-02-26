import { toast } from "sonner";

// Simple event bus/callback for non-component files to trigger UI updates
let onBackendDown: (() => void) | null = null;

export const setOnBackendDown = (cb: () => void) => {
    onBackendDown = cb;
};

export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.text();
            // Check for backend down conditions
            // 502/503/504 are usually gateway/proxy errors
            // 500 with specific messages or empty body (Vite proxy)
            if ([502, 503, 504].includes(response.status) ||
                (response.status === 500 && (
                    errorBody === "" ||
                    errorBody.includes("ECONNREFUSED") ||
                    errorBody.includes("proxy error") ||
                    errorBody.includes("AggregateError") ||
                    errorBody.includes("Failed to acquire connection from pool") ||
                    errorBody.includes("Connection pool timed out") ||
                    errorBody.includes("Database connection error")
                ))) {
                if (onBackendDown) onBackendDown();
            }

            // Handle 5xx errors or 4xx errors
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            try {
                const json = JSON.parse(errorBody);
                if (json.error) errorMessage = json.error;
            } catch (e) {
                // ignore
            }

            toast.error(errorMessage);
            throw new Error(errorMessage);
        }

        if (response.status === 204 || response.status === 202) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        // Network error (fetch failed completely)
        // TypeError is thrown by fetch for network errors (DNS, connection refused, etc.)
        if (error instanceof TypeError) {
            console.error("Network request failed - Backend might be down", error);
            if (onBackendDown) onBackendDown();
            // Also toast just in case
            toast.error("Could not connect to backend server.");
        }
        throw error;
    }
}
