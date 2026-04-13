"use client";

"use client";

import { Sparkles, Mail, Lock, LogIn, UserPlus, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export function AuthForm({ mode, onSubmit, error, isLoading }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      {/* Brand Panel - Hidden on mobile */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden p-20 lg:flex">
        <div className="absolute inset-0 bg-linear-to-br from-neutral-800 to-black">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200"
            alt=""
            className="h-full w-full object-cover mix-blend-overlay opacity-30 grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-lg bg-white/90 shadow-lg">
            <Sparkles className="h-8 w-8 fill-black text-black" />
          </div>
          <h3 className="mb-4 text-3xl font-heading font-bold text-white">MetaNote</h3>
          <p className="text-lg font-medium leading-relaxed text-white/80">
            面向研究、合成与创作的本地智能工作区。
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="relative flex w-full flex-col items-center justify-center p-8 md:p-20 lg:w-1/2">
        <div className="absolute right-10 top-10 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 fill-white text-white" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="mb-3 font-heading text-4xl font-black tracking-tight text-foreground">
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {mode === "login"
                ? "登录以继续使用工作区。"
                : "注册后开始使用智能笔记本。"}
            </p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                邮箱
              </label>
              <div className="group relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring focus:outline-none transition-colors"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                密码
              </label>
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="password"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-ring focus:outline-none transition-colors"
                  placeholder="至少 8 位字符"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-3 text-base font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "login" ? (
                <LogIn className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              {isLoading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          <p className="mt-12 text-center text-sm text-muted-foreground">
            {mode === "login" ? "还没有账号？" : "已有账号？"}{" "}
            {mode === "login" ? (
              <Link href="/register" className="font-bold text-primary hover:underline transition-colors">
                免费注册
              </Link>
            ) : (
              <Link href="/login" className="font-bold text-primary hover:underline transition-colors">
                去登录
              </Link>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
