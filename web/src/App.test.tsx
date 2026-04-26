import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const authState = {
  isAuthenticated: false,
  isAdmin: false,
  isLoading: false,
};

const errorState = {
  isBackendDown: false,
  setBackendDown: vi.fn(),
};

const fetchApiMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/contexts/ErrorContext", () => ({
  useError: () => errorState,
}));

vi.mock("./lib/api-client", () => ({
  fetchApi: (...args: unknown[]) => fetchApiMock(...args),
  setOnBackendDown: vi.fn(),
}));

vi.mock("@/pages/Login", () => ({ Login: () => <div>login-page</div> }));
vi.mock("@/pages/Dashboard", () => ({ Dashboard: () => <div>dashboard-page</div> }));
vi.mock("@/pages/Integrations", () => ({ Integrations: () => <div>integrations-page</div> }));
vi.mock("@/pages/Services", () => ({ Services: () => <div>services-page</div> }));
vi.mock("@/pages/Networks", () => ({ Networks: () => <div>networks-page</div> }));
vi.mock("@/pages/Devices", () => ({ Devices: () => <div>devices-page</div> }));
vi.mock("@/pages/DeviceDetails", () => ({
  DeviceDetailsPage: () => <div>device-details-page</div>,
}));
vi.mock("@/pages/Users", () => ({ Users: () => <div>users-page</div> }));
vi.mock("@/pages/Settings", () => ({ Settings: () => <div>settings-page</div> }));
vi.mock("@/pages/AuthCallback", () => ({ AuthCallback: () => <div>auth-callback-page</div> }));
vi.mock("./components/NetworkErrorPage", () => ({
  NetworkErrorPage: () => <div>network-error-page</div>,
}));

describe("App route protection", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isAdmin = false;
    authState.isLoading = false;
    errorState.isBackendDown = false;
    errorState.setBackendDown = vi.fn();
    fetchApiMock.mockReset();
    fetchApiMock.mockResolvedValue({ homepage_public: "false" });
  });

  it("redirects unauthenticated user from admin route to login", async () => {
    window.history.pushState({}, "", "/services");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("login-page")).toBeInTheDocument();
    });
    expect(fetchApiMock).toHaveBeenCalledWith("/api/settings/public", {
      silent: true,
    });
  });

  it("redirects authenticated non-admin user to dashboard on admin route", async () => {
    authState.isAuthenticated = true;
    authState.isAdmin = false;
    window.history.pushState({}, "", "/services");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("dashboard-page")).toBeInTheDocument();
    });
  });

  it("allows public dashboard access when homepage_public is true", async () => {
    fetchApiMock.mockResolvedValue({ homepage_public: "true" });
    window.history.pushState({}, "", "/dashboard");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("dashboard-page")).toBeInTheDocument();
    });
  });

  it("allows authenticated admin user to access admin routes", async () => {
    authState.isAuthenticated = true;
    authState.isAdmin = true;
    window.history.pushState({}, "", "/services");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("services-page")).toBeInTheDocument();
    });
  });

  it("shows network error page when backend is marked as down", async () => {
    errorState.isBackendDown = true;
    window.history.pushState({}, "", "/dashboard");
    render(<App />);

    expect(screen.getByText("network-error-page")).toBeInTheDocument();
  });
});
