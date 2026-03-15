import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ErrorProvider } from "./contexts/ErrorContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const Main = () => {
  return (
    <StrictMode>
      <ErrorProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Toaster />
      </ErrorProvider>
    </StrictMode>
  );
};

createRoot(document.getElementById("root")!).render(<Main />);

export default Main;
