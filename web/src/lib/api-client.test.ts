import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchApi, setOnBackendDown } from "./api-client";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("fetchApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnBackendDown(null);
  });

  it("returns parsed JSON on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchApi<{ ok: boolean }>("/api/ok");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/ok", { headers: undefined });
  });

  it("auto-adds content type when body exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchApi("/api/save", {
      method: "POST",
      body: JSON.stringify({ name: "item" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/save",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("returns an empty object for 202 and 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    const result = await fetchApi<Record<string, never>>("/api/no-content");
    expect(result).toEqual({});
  });

  it("maps API errors, emits toast and throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Request failed" }), {
          status: 400,
          statusText: "Bad Request",
        }),
      ),
    );

    await expect(fetchApi("/api/fail")).rejects.toThrow("Request failed");
    expect(toast.error).toHaveBeenCalledWith("Request failed");
  });

  it("triggers backend-down callback for service-unavailable responses", async () => {
    const onBackendDown = vi.fn();
    setOnBackendDown(onBackendDown);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Service unavailable", { status: 503, statusText: "Unavailable" }),
      ),
    );

    await expect(fetchApi("/api/down", { silent: true })).rejects.toThrow(
      "API Error: 503",
    );
    expect(onBackendDown).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
