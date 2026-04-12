"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await register(email, password);
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "注册失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      mode="signup"
      onSubmit={handleSubmit}
      error={error}
      isLoading={isLoading}
    />
  );
}
