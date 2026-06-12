"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { 
        router.push("/invoice"); 
        return; 
      }
      setChecking(false);
      const err = searchParams.get("error");
      if (err === "auth_failed") setError("Sign in failed. Please try again.");
      if (err === "timeout")     setError("Sign in timed out. Please try again.");
    }
    check();
  }, [supabase.auth, router, searchParams]);

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (error) { 
        setError("Could not connect to Google. Try again."); 
        setLoading(false); 
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main style={{ minHeight:"100vh", background:"#020B18", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:32, height:32, border:"3px solid rgba(14,165,233,0.2)", borderTopColor:"#0EA5E9", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      </main>
    );
  }

  return (
    <main style={{ minHeight:"100vh", background:"#020B18", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin   {to{transform:rotate(360deg)}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes orbF   {0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .google-btn{transition:all 0.2s ease;}
        .google-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(14,165,233,0.4)!important;filter:brightness(1.05);}
        .google-btn:active{transform:scale(0.97);}
        .glow-text{background:linear-gradient(90deg,#0EA5E9 0%,#38BDF8 40%,#0EA5E9 100%);background-size:200% 100%;animation:shimmer 3s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      `}</style>

      {/* Orbs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        {[[20,20,400,"rgba(14,165,233,0.08)"],[80,70,300,"rgba(245,158,11,0.05)"],[50,80,350,"rgba(124,58,237,0.06)"]].map((o,i)=>(
          <div key={i} style={{ position:"absolute", left:`${o[0]}%`, top:`${o[1]}%`, width:o[2], height:o[2], borderRadius:"50%", background:`radial-gradient(circle,${o[3]} 0%,transparent 70%)`, animation:`orbF ${14+i*4}s ease-in-out ${i*2}s infinite`, transform:"translate(-50%,-50%)" }}/>
        ))}
      </div>

      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1, animation:"fadeUp 0.6s ease" }}>
        <div style={{ background:"rgba(255,255,255,0.03)", backdropFilter:"blur(24px)", border:"1px solid rgba(14,165,233,0.2)", borderRadius:24, padding:"40px 36px", textAlign:"center", boxShadow:"0 0 80px rgba(14,165,233,0.1)" }}>

          {/* Logo */}
          <div style={{ width:68, height:68, borderRadius:20, background:"linear-gradient(135deg,#0EA5E9,#0284C7)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 0 40px rgba(14,165,233,0.5)" }}>
            <svg width="28" height="36" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
          </div>

          <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:"0 0 6px", letterSpacing:-0.5 }}>
            Insta<span className="glow-text">Bill</span>
            <span style={{ color:"#F59E0B", fontSize:14, marginLeft:6, letterSpacing:2, verticalAlign:"middle" }}>INDIA</span>
          </h1>
          <p style={{ color:"#64748B", fontSize:14, margin:"0 0 28px", lineHeight:1.6 }}>
            GST invoicing for Indian freelancers and businesses
          </p>

          {/* Features */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:28, textAlign:"left" }}>
            {[
              {icon:"⚡", text:"Create GST invoice in 60 seconds"},
              {icon:"📲", text:"UPI QR — clients pay instantly"},
              {icon:"🆓", text:"All features free to start"},
            ].map(f=>(
              <div key={f.text} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 14px", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ color:"#CBD5E1", fontSize:13, fontWeight:500 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#EF4444", fontSize:13, textAlign:"left" }}>
              ⚠ {error}
            </div>
          )}

          {/* Google button */}
          <button onClick={signInWithGoogle} disabled={loading} className="google-btn"
            style={{ width:"100%", padding:"15px 24px", background:loading?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)", border:"none", borderRadius:14, color:"#fff", fontSize:16, fontWeight:800, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, fontFamily:"inherit", boxShadow:"0 4px 24px rgba(14,165,233,0.35)", transition:"all 0.2s" }}>
            {loading ? (
              <><svg style={{ animation:"spin 0.8s linear infinite" }} width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Connecting...</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="rgba(255,255,255,0.85)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="rgba(255,255,255,0.6)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p style={{ color:"#334155", fontSize:11, marginTop:20, lineHeight:1.7 }}>
            No spam. No credit card. Cancel anytime.
          </p>
        </div>
        <p style={{ textAlign:"center", color:"#1E293B", fontSize:11, marginTop:20 }}>
          Made with 💙 for Indian freelancers · InstaBill India
        </p>
      </div>
    </main>
  );
}