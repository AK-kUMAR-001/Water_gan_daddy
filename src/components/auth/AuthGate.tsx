import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearCachedData, reloadData, supabase } from "@/lib/store";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let active = true;

    async function applySession(nextSession: Session | null) {
      const version = ++requestVersion.current;
      setSession(nextSession);
      setAuthReady(true);
      setDataError("");

      if (!nextSession) {
        clearCachedData();
        setDataLoading(false);
        return;
      }

      clearCachedData();
      setDataLoading(true);
      try {
        await reloadData();
        if (active && version === requestVersion.current) {
          setDataLoading(false);
        }
      } catch (err) {
        if (active && version === requestVersion.current) {
          setDataError(err instanceof Error ? err.message : "Could not load account data");
          setDataLoading(false);
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (active) void applySession(nextSession);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data: result, error }) => {
      if (!active) return;
      if (error) {
        setAuthReady(true);
        setFormError(error.message);
        return;
      }
      void applySession(result.session);
    });

    return () => {
      active = false;
      requestVersion.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setFormError("");
    setNotice("");

    const result = creatingAccount
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });

    setSubmitting(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    if (creatingAccount && !result.data.session) {
      setNotice("Account created. Confirm your email, then sign in.");
    }
  }

  async function retryDataLoad() {
    if (!session) return;
    const version = ++requestVersion.current;
    setDataLoading(true);
    setDataError("");
    clearCachedData();
    try {
      await reloadData();
      if (version === requestVersion.current) {
        setDataLoading(false);
      }
    } catch (err) {
      if (version === requestVersion.current) {
        setDataError(err instanceof Error ? err.message : "Could not load account data");
        setDataLoading(false);
      }
    }
  }

  if (!supabase) {
    return (
      <AuthMessage title="Supabase configuration missing">
        Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment.
      </AuthMessage>
    );
  }

  if (!authReady || dataLoading) {
    return <AuthMessage title="Loading account" />;
  }

  if (session && dataError) {
    return (
      <AuthMessage title="Could not load account data">
        <p className="break-words text-sm text-muted-foreground">{dataError}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button type="button" onClick={() => void retryDataLoad()}>
            Retry
          </Button>
          <Button type="button" variant="outline" onClick={() => void supabase?.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </AuthMessage>
    );
  }

  if (session) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Water Can Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {creatingAccount ? "Create your account" : "Sign in to your account"}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={creatingAccount ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {notice && (
            <p role="status" className="text-sm text-emerald-700">
              {notice}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : creatingAccount ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline"
          type="button"
          onClick={() => {
            setCreatingAccount((current) => !current);
            setFormError("");
            setNotice("");
          }}
        >
          {creatingAccount ? "Already registered? Sign in" : "Create an account"}
        </button>
      </section>
    </main>
  );
}

function AuthMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="font-semibold">{title}</h1>
        {children && <div className="mt-3 text-sm text-muted-foreground">{children}</div>}
      </section>
    </main>
  );
}
