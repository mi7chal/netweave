import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataFetcher } from "./DataFetcher";

describe("DataFetcher", () => {
  it("renders loading state", () => {
    const { container } = render(
      <DataFetcher isLoading data={[]} onRetry={vi.fn()}>
        {() => <div>content</div>}
      </DataFetcher>,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders error state and triggers retry callback", () => {
    const retry = vi.fn();
    render(
      <DataFetcher isLoading={false} error={new Error("failed")} onRetry={retry}>
        {() => <div>content</div>}
      </DataFetcher>,
    );

    expect(screen.getByText("Error loading data")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders empty state message", () => {
    render(
      <DataFetcher isLoading={false} data={[]}>
        {() => <div>content</div>}
      </DataFetcher>,
    );

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders children with loaded data", () => {
    render(
      <DataFetcher isLoading={false} data={[{ name: "Service A" }, { name: "Service B" }]}>
        {(items) => <div>{items.map((item) => item.name).join(", ")}</div>}
      </DataFetcher>,
    );

    expect(screen.getByText("Service A, Service B")).toBeInTheDocument();
  });
});
