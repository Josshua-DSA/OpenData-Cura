export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const customBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const baseUrl = typeof customBase === "string" ? customBase.trim() : "";
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const url = endpoint.startsWith("http")
    ? endpoint
    : baseUrl
      ? `${baseUrl.replace(/\/$/, "")}${cleanEndpoint}`
      : cleanEndpoint;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
