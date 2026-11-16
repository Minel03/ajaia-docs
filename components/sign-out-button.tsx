"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError("Could not sign out. Please try again.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button onClick={signOut}>Sign out</Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
