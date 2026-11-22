"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

interface Form { name: string; email: string; password: string; confirm: string }

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>();

  const onSubmit = async (d: Form) => {
    setError("");
    try { await signup(d.name, d.email, d.password); router.push("/dashboard"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Could not create the account."); }
  };
  const err = (m?: string) => m && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{m}</p>;
  return (
    <AuthShell title="Create your account" subtitle="Upload your first file in under a minute.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-lg bg-red-500/10 text-red-700 dark:text-red-300 text-sm px-3 py-2">{error}</div>}
        <div><Label htmlFor="name">Full name</Label><Input id="name" autoComplete="name" {...register("name", { required: "Enter your name", minLength: { value: 2, message: "Name must be at least 2 characters" } })} />{err(errors.name?.message)}</div>
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" {...register("email", { required: "Enter your email", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" } })} />{err(errors.email?.message)}</div>
        <div><Label htmlFor="password">Password</Label><PasswordInput id="password" autoComplete="new-password" {...register("password", { required: "Choose a password", minLength: { value: 8, message: "Use at least 8 characters" } })} />{err(errors.password?.message)}</div>
        <div><Label htmlFor="confirm">Confirm password</Label><PasswordInput id="confirm" autoComplete="new-password" {...register("confirm", { validate: (v) => v === getValues("password") || "Passwords do not match" })} />{err(errors.confirm?.message)}</div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create account <ArrowRight className="h-4 w-4" /></Button>
      </form>
      <p className="mt-6 text-sm text-text-muted text-center">Already registered? <Link href="/login" className="font-medium text-link underline underline-offset-4">Log in</Link></p>
    </AuthShell>
  );
}
