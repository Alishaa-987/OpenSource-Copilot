"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Compass, ListChecks, Loader2, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Wordmark } from "@/components/brand";
import { GitHubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { toUiUser } from "@/lib/backend-adapters";
import { useCurrentUser, useGitHubLogin, useLogout } from "@/lib/backend-hooks";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const login = useGitHubLogin("/dashboard");
  const logout = useLogout();

  if (currentUser.isLoading) return <SessionLoading />;

  if (currentUser.error) {
    const unauthorized = currentUser.error instanceof BackendApiError && currentUser.error.status === 401;
    return unauthorized
      ? <ConnectGitHub
          onConnect={() => login.mutate()}
          pending={login.isPending}
          error={login.error instanceof BackendApiError ? login.error.message : login.error ? "GitHub login failed. Please try again." : null}
        />
      : <SessionError message={currentUser.error.message} onRetry={() => void currentUser.refetch()} />;
  }

  if (!currentUser.data) return null;

  const user = toUiUser(currentUser.data);
  const onSignOut = () => logout.mutate();
  return (
    <div className="min-h-dvh bg-background lg:pl-64">
      <AppSidebar user={user} onSignOut={onSignOut} />
      <Topbar user={user} onSignOut={onSignOut} />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

/**
 * Checking the session used to render a blank pulsing rectangle, which reads
 * as a broken page. A named, centred state makes the wait legible.
 */
function SessionLoading() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Checking your session…</p>
    </main>
  );
}

const VALUE_PROPS = [
  { icon: Compass, title: "Understand any repository", detail: "An evidence-backed map of how a project is actually put together." },
  { icon: ListChecks, title: "Find the right first issue", detail: "Difficulty and reasoning for every open issue, not just its labels." },
  { icon: UserCheck, title: "Know if you're ready", detail: "Compare your resume against a specific issue before you start." },
];

/**
 * The sign-in screen - the first thing a new contributor sees.
 *
 * The background is built from layered, purely decorative elements (a soft
 * colour mesh that drifts, a faint dot grid, and a top glow) so the page has
 * depth without shipping an image. All of it is theme-token based, so it
 * holds up in light and dark, and it is hidden from assistive tech.
 */
function ConnectGitHub({ onConnect, pending, error }: { onConnect: () => void; pending: boolean; error: string | null }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <style>{`
        @keyframes op-drift-a { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(4rem,2.5rem,0) scale(1.12); } }
        @keyframes op-drift-b { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 50% { transform: translate3d(-3.5rem,-2rem,0) scale(0.92); } }
        @keyframes op-drift-c { 0%,100% { transform: translate3d(0,0,0) scale(0.95); } 50% { transform: translate3d(2rem,-3rem,0) scale(1.15); } }
        .op-orb { animation-duration: 22s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @media (prefers-reduced-motion: reduce) { .op-orb { animation: none; } }
      `}</style>

      {/* Decorative background: colour mesh + dot grid + top glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="op-orb absolute left-[-10%] top-[-18%] size-[34rem] rounded-full bg-primary/25 blur-[100px]" style={{ animationName: "op-drift-a" }} />
        <div className="op-orb absolute bottom-[-20%] right-[-12%] size-[30rem] rounded-full bg-info/25 blur-[110px]" style={{ animationName: "op-drift-b", animationDelay: "-7s" }} />
        <div className="op-orb absolute left-[45%] top-[35%] size-[24rem] rounded-full bg-chart-5/20 blur-[110px]" style={{ animationName: "op-drift-c", animationDelay: "-13s" }} />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Pitch column - desktop only, so mobile stays focused on the button. */}
        <section className="hidden lg:block">
          <Wordmark />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Built for first-time contributors
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground">
            A clearer path into{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">open source</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Import a repository, understand its issues in plain language, and keep a record of everything you contribute.
          </p>
          <ul className="mt-8 space-y-5">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <prop.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{prop.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{prop.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Sign-in card */}
        <section className="w-full max-w-md justify-self-center rounded-2xl border border-border bg-card/80 p-7 shadow-xl backdrop-blur-xl sm:p-8 lg:justify-self-end">
          <div className="lg:hidden">
            <Wordmark />
          </div>

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground lg:mt-0">
            Welcome in
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Connect your GitHub account to import a repository and start working through its issues.
          </p>

          {/* Mobile keeps a condensed version of the pitch. */}
          <ul className="mt-6 space-y-3.5 lg:hidden">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <prop.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{prop.title}</span>
                  <span className="block text-xs leading-5 text-muted-foreground">{prop.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          {error ? (
            <p role="alert" className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-5 text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button size="lg" className="mt-6 w-full" onClick={onConnect} disabled={pending} aria-busy={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <GitHubIcon className="size-4" />}
            {pending ? "Redirecting to GitHub…" : "Continue with GitHub"}
          </Button>

          <p className="mt-4 flex items-start gap-1.5 text-xs leading-5 text-subtle-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Read access to your repositories and issues. Nothing is pushed or changed on your behalf.
          </p>
        </section>
      </div>
    </main>
  );
}

function SessionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Unable to load your session</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button className="mt-5" onClick={onRetry}>Try again</Button>
      </section>
    </main>
  );
}
