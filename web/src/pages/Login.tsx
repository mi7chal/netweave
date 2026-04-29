import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Server, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);

  useEffect(() => {
    const checkOidc = async () => {
      try {
        const data = await fetchApi<{ oidc_enabled: boolean }>("/api/auth/check-oidc", { silent: true });
        setOidcEnabled(data.oidc_enabled);
      } catch {
        // Error is handled by api-client toast/backend down detection.
      }
    };
    checkOidc();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "auth_failed") {
      setError("Authentication failed. The account might be inactive or auto-import might be disabled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="flex items-center justify-center">
            <Server />
          </div>
          <CardTitle>NetWeave</CardTitle>
          <CardDescription>Sign in to your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            {error ? <p>{error}</p> : null}
            <Button type="submit" disabled={isSubmitting}>
              <LogIn data-icon="inline-start" />
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          {oidcEnabled ? (
            <>
              <Separator />
              <Button type="button" variant="outline" onClick={() => { window.location.href = "/api/auth/login"; }}>
                <Shield data-icon="inline-start" />
                Sign in with SSO
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
