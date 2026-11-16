"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "DemoPass123!";
const demoUsers = ["alice@demo.test", "bob@demo.test", "carol@demo.test"];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your email and password.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await createClient().auth.signInWithPassword(parsed.data);
    if (signInError) {
      setError("Sign in failed. Check your email and password, then try again.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use a demo account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">Quick fill demo account</p>
          <div className="flex flex-wrap gap-2">
            {demoUsers.map((user) => (
              <Button key={user} type="button" variant="outline" size="sm" onClick={() => { setEmail(user); setPassword(demoPassword); setError(null); }}>
                {user.split("@")[0]}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
