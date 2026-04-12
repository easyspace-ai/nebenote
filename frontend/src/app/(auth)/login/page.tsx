"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const from = searchParams.get("from");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(from || "/");
    }
  }, [authLoading, isAuthenticated, router, from]);

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      router.push(from || "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      onSubmit={handleSubmit}
      error={error}
      isLoading={isLoading}
    />
  );
}
