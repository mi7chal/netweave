import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { ErrorProvider, useError } from './contexts/ErrorContext'
import { setOnBackendDown } from './lib/api-client'
import { NetworkErrorPage } from './components/NetworkErrorPage'
import { Toaster } from "@/components/ui/sonner"

const Main = () => {
  const { isBackendDown, setBackendDown } = useError();

  // Initialize global error handler synchronously to catch early errors
  useState(() => {
    console.log("[Main] Registering onBackendDown handler");
    setOnBackendDown(() => {
      console.log("[Main] Backend down handler triggered!");
      setBackendDown(true);
    });
  });

  if (isBackendDown) {
    return <NetworkErrorPage />;
  }

  return (
    <>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster />
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorProvider>
      <Main />
    </ErrorProvider>
  </StrictMode>,
)
