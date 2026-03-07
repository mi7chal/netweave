import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ErrorProvider, useError } from "./contexts/ErrorContext";
import { AuthProvider } from "./contexts/AuthContext";
import { setOnBackendDown } from "./lib/api-client";
import { NetworkErrorPage } from "./components/NetworkErrorPage";
import { Toaster } from "@/components/ui/sonner";

const Main = () => {
  const { isBackendDown, setBackendDown } = useError();

  useState(() => {
    setOnBackendDown(() => setBackendDown(true));
  });

  if (isBackendDown) return <NetworkErrorPage />;

  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorProvider>
      <Main />
    </ErrorProvider>
  </StrictMode>,
);

export default Main;
