export const dynamic = "force-dynamic";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../supabase/client";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Completing sign in...");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function handle() {
      try {
        // ── OAuth Callback Processing ──────────────────────────────
        // After Google OAuth, Supabase redirects here with
        // either ?code=xxx (PKCE flow) or #access_token=xxx (implicit)
        // We must handle BOTH cases gracefully.

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          setMsg("Sign in was cancelled. Redirecting...");
          setTimeout(() => router.push("/login?error=cancelled"), 1500);
          return;
        }

        if (code) {
          // PKCE flow — exchange authorization code for an active session
          setMsg("Verifying your account...");
          const { data, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchErr) {
            console.error("Exchange error:", exchErr);
            setMsg("Verification failed. Redirecting...");
            setTimeout(() => router.push("/login?error=exchange_failed"), 1500);
            return;
          }
          
          if (data?.session) {
            await ensureCredits(data.session.user.id);
            setMsg("Success! Taking you to your dashboard...");
            // Use a microtask delay to allow storage engine to settle session tokens
            setTimeout(() => router.push("/invoice"), 50);
            return;
          }
        }

        // Implicit flow — fallback check if session is already parsed via hash
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await ensureCredits(session.user.id);
          setMsg("Success! Taking you to your dashboard...");
          setTimeout(() => router.push("/invoice"), 50);
          return;
        }

        // Nothing worked — redirect to authentication landing page
        setMsg("Something went wrong. Redirecting...");
        setTimeout(() => router.push("/login?error=no_session"), 2000);

      } catch (err) {
        console.error("Callback error:", err);
        router.push("/login?error=unexpected");
      }
    }

    handle();
  }, [router, supabase]);

  async function ensureCredits(userId) {
    try {
      const { data } = await supabase
        .from("user_credits")
        .select("id")
        .eq("id", userId)
        .single();

      if (!data) {
        // Warning: This headcount selection depends on RLS policy architecture permissions.
        const { count } = await supabase
          .from("user_credits")
          .select("*", { count: "exact", head: true });

        const isEarly = (count || 0) < 50;
        
        await supabase.from("user_credits").upsert({
          id: userId,
          credits: isEarly ? 20 : 5,
          is_early: isEarly,
          plan: "free",
          total_used: 0,
          signup_date: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });
      }
    } catch (e) {
      console.error("ensureCredits error:", e);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#020B18",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      
      <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#0EA5E9,#0284C7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 40px rgba(14,165,233,0.4)" }}>
          <svg width="26" height="32" viewBox="0 0 15 20" fill="none">
            <polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B" />
          </svg>
        </div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
          Insta<span style={{ color: "#0EA5E9" }}>Bill</span> India
        </h2>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(14,165,233,0.2)", borderTopColor: "#0EA5E9", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "20px auto 14px" }} />
        <p style={{ color: "#64748B", fontSize: 14, animation: "pulse 2s ease infinite" }}>{msg}</p>
        <p style={{ color: "#1E293B", fontSize: 11, marginTop: 8 }}>Please wait...</p>
      </div>
    </main>
  );
}