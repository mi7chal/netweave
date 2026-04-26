import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDeleteWithConfirm } from "./useDeleteWithConfirm";

describe("useDeleteWithConfirm", () => {
  it("prompts and clears delete state", () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithConfirm(onDelete));

    act(() => {
      result.current.promptDelete("id-1", "Device A");
    });
    expect(result.current.deleteConfirm).toEqual({ id: "id-1", label: "Device A" });

    act(() => {
      result.current.clearDeleteConfirm();
    });
    expect(result.current.deleteConfirm).toBeNull();
  });

  it("calls delete callback and clears state on confirm", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteWithConfirm(onDelete));

    act(() => {
      result.current.promptDelete("id-2", "Device B");
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDelete).toHaveBeenCalledWith("id-2", "Device B");
    expect(result.current.deleteConfirm).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it("always resets isDeleting even when delete fails", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useDeleteWithConfirm(onDelete));

    act(() => {
      result.current.promptDelete("id-3", "Device C");
    });

    await expect(
      act(async () => {
        await result.current.confirmDelete();
      }),
    ).rejects.toThrow("boom");
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.deleteConfirm).toEqual({ id: "id-3", label: "Device C" });
  });
});
