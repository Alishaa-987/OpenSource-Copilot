"use client";

import { Loader2 } from "lucide-react";

import { GitHubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useGitHubLogin } from "@/lib/backend-hooks";

export function GitHubLoginButton({ label, className }: { label: string; className?: string }) {
  const login = useGitHubLogin("/dashboard");
  return (
    <Button size="lg" className={className} onClick={() => login.mutate()} disabled={login.isPending} aria-busy={login.isPending}>
      {/* The OAuth redirect is not instant, so the button has to look busy -
          otherwise it reads as unresponsive and gets clicked again. */}
      {login.isPending ? <Loader2 className="size-4 animate-spin" /> : <GitHubIcon className="size-4" />}
      {login.isPending ? "Redirecting to GitHub…" : label}
    </Button>
  );
}
