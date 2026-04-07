"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../../supabase/client";
import Navbar from "../../components/Navbar";

// ── FADE UP ANIMATION ─────────────────────────────────
function useFadeUp() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

function FadeUp({ children, delay = 0 }) {
  const [ref, visible] = useFadeUp();
  return (
    <div
      ref={ref}
      style={{
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  );
}

// ── INVOICE PLANS ─────────────────────────────────────
const INVOICE_PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    credits: 5,
    earlyCredits: 20,
    color: "#64748B",
    glow: "rgba(100,116,139,0.15)",
    border: "rgba(100,116,139,0.25)",
    features: [
      "5 invoice credits/month",
      "GST auto-calculation",
      "UPI QR code on PDF",
      "Email invoice to client",
      "PDF download",
      "Invoice history",
    ],
    cta: "Get Started Free",
    ctaBg: "rgba(255,255,255,0.08)",
    ctaColor: "#E2E8F0",
  },
  {
    key: "solo",
    name: "Solo",
    price: 149,
    credits: 50,
    color: "#0EA5E9",
    glow: "rgba(14,165,233,0.15)",
    border: "rgba(14,165,233,0.3)",
    popular: true,
    features: [
      "50 invoice credits/month",
      "GST auto-calculation",
      "UPI QR code on PDF",
      "Email invoice to client",
      "PDF download",
      "Invoice history",
      "Earnings dashboard",
      "Annual GST report PDF",
    ],
    cta: "Upgrade to Solo",
    ctaBg: "linear-gradient(135deg,#0EA5E9,#0284C7)",
    ctaColor: "#fff",
  },
  {
    key: "pro",
    name: "Pro",
    price: 349,
    credits: -1,
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.3)",
    features: [
      "Unlimited invoices",
      "GST auto-calculation",
      "UPI QR code on PDF",
      "Email invoice to client",
      "PDF download",
      "Invoice history",
      "Earnings dashboard",
      "Annual GST report PDF",
      "Custom logo on invoices",
      "Client address book",
      "Multi-item invoices",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaBg: "linear-gradient(135deg,#F59E0B,#D97706)",
    ctaColor: "#fff",
  },
];

function Check({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [userCredits, setUserCredits] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [billing,     setBilling]     = useState("monthly");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_credits")
          .select("*")
          .eq("id", user.id)
          .single();
        setUserCredits(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleUpgrade(plan) {
    if (plan.key === "free") {
      window.location.href = "/invoice";
      return;
    }
    window.location.href = `/payment?plan=${plan.key}`;
  }

  const yearlyPrice = (p) => Math.round(p * 12 * 0.75);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#020B18",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(14,165,233,0.3); color: #fff; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #020B18; }
        ::-webkit-scrollbar-thumb { background: #0EA5E9; border-radius: 4px; }
        @keyframes orbFloat {
          0%, 100% { transform: translate(-50%,-50%) scale(1); }
          50% { transform: translate(-50%,-50%) scale(1.12); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4); }
          70% { box-shadow: 0 0 0 14px rgba(14,165,233,0); }
        }
        .glow-text {
          background: linear-gradient(90deg, #0EA5E9 0%, #38BDF8 40%, #0EA5E9 100%);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .plan-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: default;
        }
        .plan-card:hover { transform: translateY(-6px); }
        .cta-btn {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .cta-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .cta-btn:active { transform: scale(0.97); }
        .popular-cta { animation: pulse 3s ease infinite; }
        .popular-cta:hover { animation: none; }
        .toggle-pill { transition: all 0.25s ease; }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[
          { x: 15, y: 20, size: 420, color: "rgba(14,165,233,0.07)",  dur: 18 },
          { x: 80, y: 55, size: 360, color: "rgba(245,158,11,0.05)",  dur: 22 },
          { x: 45, y: 80, size: 300, color: "rgba(124,58,237,0.06)",  dur: 16 },
        ].map((o, i) => (
          <div key={i} style={{
            position: "absolute", left: `${o.x}%`, top: `${o.y}%`,
            width: o.size, height: o.size, borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            animation: `orbFloat ${o.dur}s ease-in-out ${i * 2}s infinite`,
            transform: "translate(-50%,-50%)",
          }} />
        ))}
      </div>

      <Navbar />

      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "44px 20px 80px", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ── */}
        <FadeUp delay={0}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900, letterSpacing: -2, margin: "0 0 14px", color: "#fff" }}>
              Simple, honest <span className="glow-text">pricing</span>
            </h1>
            <p style={{ color: "#64748B", fontSize: 16, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.7 }}>
              Pay only for invoicing. Personal Finance is free forever for everyone.
            </p>

            {/* Monthly / Yearly toggle */}
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 4, gap: 4 }}>
              {["monthly", "yearly"].map(b => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className="toggle-pill"
                  style={{
                    padding: "8px 22px", borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                    background: billing === b ? "linear-gradient(135deg,#0EA5E9,#0284C7)" : "transparent",
                    color: billing === b ? "#fff" : "#64748B",
                    boxShadow: billing === b ? "0 4px 14px rgba(14,165,233,0.35)" : "none",
                  }}
                >
                  {b === "monthly" ? "Monthly" : (
                    <>Yearly <span style={{ marginLeft: 6, background: "rgba(16,185,129,0.2)", color: "#10B981", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>-25%</span></>
                  )}
                </button>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ── CURRENT PLAN BANNER ── */}
        {!loading && userCredits && (
          <FadeUp delay={60}>
            <div style={{
              background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)",
              borderRadius: 14, padding: "14px 20px", marginBottom: 36,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>
                  {userCredits.plan === "pro" ? "⭐" : userCredits.plan === "solo" ? "🚀" : "🆓"}
                </span>
                <div>
                  <p style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    You are on the{" "}
                    <span style={{
                      color: userCredits.plan === "pro" ? "#F59E0B" :
                             userCredits.plan === "solo" ? "#0EA5E9" : "#64748B",
                      textTransform: "capitalize",
                    }}>
                      {userCredits.plan}
                    </span>{" "}
                    plan
                    {userCredits.is_early && (
                      <span style={{ marginLeft: 8, background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                        ⚡ Early User
                      </span>
                    )}
                  </p>
                  <p style={{ color: "#475569", fontSize: 12, margin: "3px 0 0" }}>
                    {userCredits.plan === "pro"
                      ? "Unlimited invoices — no limits ever"
                      : `${userCredits.credits} credits remaining · ${userCredits.total_used || 0} invoices created`}
                  </p>
                </div>
              </div>

              {/* Credit bar */}
              {userCredits.plan !== "pro" && (
                <div style={{ minWidth: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "#64748B", fontSize: 11 }}>Credits used</span>
                    <span style={{ color: "#E2E8F0", fontSize: 11, fontWeight: 700 }}>
                      {userCredits.credits} left
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (userCredits.credits / (userCredits.is_early ? 20 : 5)) * 100)}%`,
                      background: userCredits.credits <= 2 ? "#EF4444" : userCredits.credits <= 5 ? "#F59E0B" : "#10B981",
                      borderRadius: 4,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              )}
            </div>
          </FadeUp>
        )}

        {/* ── INVOICE PLAN CARDS ── */}
        <FadeUp delay={80}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧾</div>
            <div>
              <h2 style={{ color: "#E2E8F0", fontSize: 17, fontWeight: 800, margin: 0 }}>Invoice Plans</h2>
              <p style={{ color: "#64748B", fontSize: 12, margin: 0 }}>
                Credit-based · First 50 users get 20 free credits instead of 5
              </p>
            </div>
          </div>
        </FadeUp>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 52 }}>
          {INVOICE_PLANS.map((plan, i) => {
            const isCurrent = userCredits?.plan === plan.key;
            const displayPrice = billing === "yearly" && plan.price > 0
              ? Math.round(plan.price * 0.75)
              : plan.price;

            return (
              <FadeUp key={plan.key} delay={100 + i * 80}>
                <div
                  className="plan-card"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${isCurrent ? plan.color + "77" : plan.popular ? plan.border : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: isCurrent ? `0 0 40px ${plan.glow}` : plan.popular ? `0 0 30px ${plan.glow}` : "none",
                    height: "100%",
                  }}
                >
                  {/* Popular banner */}
                  {plan.popular && (
                    <div style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`, padding: "6px 0", textAlign: "center" }}>
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
                        ⭐ Most Popular
                      </span>
                    </div>
                  )}

                  {/* Current badge */}
                  {isCurrent && (
                    <div style={{
                      position: "absolute", top: plan.popular ? 40 : 14, right: 14,
                      background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                      color: "#10B981", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    }}>
                      ✓ Current
                    </div>
                  )}

                  <div style={{ padding: 26 }}>
                    {/* Name + price */}
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 11, background: plan.glow,
                          border: `1px solid ${plan.border}`, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 19,
                        }}>
                          {plan.key === "free" ? "🆓" : plan.key === "solo" ? "🚀" : "⭐"}
                        </div>
                        <span style={{ color: "#E2E8F0", fontSize: 19, fontWeight: 800 }}>{plan.name}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: plan.price === 0 ? "#64748B" : plan.color, fontSize: 42, fontWeight: 900, lineHeight: 1 }}>
                          {plan.price === 0 ? "Free" : `₹${displayPrice}`}
                        </span>
                        {plan.price > 0 && (
                          <div>
                            <span style={{ color: "#475569", fontSize: 13 }}>/month</span>
                            {billing === "yearly" && (
                              <div style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>
                                ₹{yearlyPrice(plan.price)}/yr
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Credits pill */}
                      <div style={{
                        background: plan.glow, border: `1px solid ${plan.border}`,
                        borderRadius: 10, padding: "9px 13px",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 16 }}>🪙</span>
                        <div>
                          <p style={{ color: plan.color, fontSize: 13, fontWeight: 700, margin: 0 }}>
                            {plan.credits === -1 ? "Unlimited invoices" : `${plan.credits} credits/month`}
                          </p>
                          {plan.key === "free" && (
                            <p style={{ color: "#64748B", fontSize: 11, margin: "2px 0 0" }}>
                              First 50 users get 20 credits
                            </p>
                          )}
                          {plan.key === "pro" && (
                            <p style={{ color: "#64748B", fontSize: 11, margin: "2px 0 0" }}>No limits ever</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                      {plan.features.map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                          <Check color={plan.color} />
                          <span style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 1.4 }}>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isCurrent}
                      className={!isCurrent && plan.popular ? "cta-btn popular-cta" : !isCurrent ? "cta-btn" : ""}
                      style={{
                        width: "100%", padding: "13px 20px", borderRadius: 12,
                        border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                        cursor: isCurrent ? "not-allowed" : "pointer",
                        background: isCurrent ? "rgba(255,255,255,0.05)" : plan.ctaBg,
                        color: isCurrent ? "#475569" : plan.ctaColor,
                        boxShadow: !isCurrent && plan.key === "solo"
                          ? "0 4px 20px rgba(14,165,233,0.3)"
                          : !isCurrent && plan.key === "pro"
                          ? "0 4px 20px rgba(245,158,11,0.3)"
                          : "none",
                      }}
                    >
                      {isCurrent ? "✓ Current Plan" : `${plan.cta} →`}
                    </button>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>

        {/* ── EARLY BIRD BANNER ── */}
        <FadeUp delay={200}>
          <div style={{
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)",
            borderRadius: 18, padding: "22px 26px", marginBottom: 52,
            display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 40 }}>⚡</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ color: "#F59E0B", fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>
                Early Bird Offer — First 50 Users
              </h3>
              <p style={{ color: "#64748B", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Sign up early and get <strong style={{ color: "#E2E8F0" }}>20 free invoice credits</strong> instead of 5.
                That is 20 full GST invoices at absolutely zero cost. No credit card ever needed to start.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Early users get",  val: "20 credits", color: "#F59E0B" },
                { label: "Regular users get", val: "5 credits",  color: "#64748B" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "12px 18px", textAlign: "center",
                }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 900 }}>{s.val}</div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* ── DIVIDER ── */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 52 }} />

        {/* ── PERSONAL FINANCE — FREE FOREVER ── */}
        <FadeUp delay={240}>
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(14,165,233,0.06))",
            border: "1px solid rgba(16,185,129,0.25)", borderRadius: 22, padding: "32px 28px",
            marginBottom: 52, position: "relative", overflow: "hidden",
          }}>
            {/* Background accent */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  💰
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 900, margin: 0 }}>Personal Finance</h2>
                    <span style={{
                      background: "linear-gradient(135deg, #059669, #10B981)",
                      color: "#fff", fontSize: 11, fontWeight: 700,
                      padding: "4px 12px", borderRadius: 20,
                      boxShadow: "0 2px 10px rgba(16,185,129,0.4)",
                    }}>
                      FREE FOREVER
                    </span>
                  </div>
                  <p style={{ color: "#64748B", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                    Track your daily income, expenses and savings — no payment ever
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { icon: "💚", label: "Income tracking",        desc: "Log every salary, payment or side income"    },
                  { icon: "💸", label: "Expense tracking",       desc: "Daily expenses by category"                 },
                  { icon: "📊", label: "Savings analytics",      desc: "Savings rate, goal tracker, breakdowns"      },
                  { icon: "📄", label: "PDF export",             desc: "Monthly, half-year, or custom date range"    },
                ].map(f => (
                  <div key={f.label} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(16,185,129,0.15)",
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                    <div>
                      <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{f.label}</div>
                      <div style={{ color: "#64748B", fontSize: 11, lineHeight: 1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/personal-finance" style={{ textDecoration: "none" }}>
                <button style={{
                  padding: "13px 28px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #059669, #10B981)",
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(16,185,129,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(16,185,129,0.35)"; }}>
                  Open Personal Finance →
                </button>
              </a>
            </div>
          </div>
        </FadeUp>

        {/* ── FAQ ── */}
        <FadeUp delay={280}>
          <h2 style={{ color: "#E2E8F0", fontSize: 20, fontWeight: 800, textAlign: "center", margin: "0 0 22px" }}>
            Frequently asked questions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 48 }}>
            {[
              { q: "What is an invoice credit?",       a: "1 credit = 1 invoice generated. Free plan gives 5 credits/month. First 50 users get 20 credits. Pro plan is unlimited." },
              { q: "Do credits reset monthly?",        a: "Yes, credits reset at the start of each month on Solo and Pro plans. Free plan credits do not reset." },
              { q: "Is Personal Finance really free?", a: "Yes, completely free forever for all users. No payment ever required. Download your PDF reports anytime." },
              { q: "How do I upgrade?",               a: "Click Upgrade above. Razorpay payment integration is coming very soon. Contact us to upgrade manually today." },
              { q: "Can I downgrade later?",          a: "Yes, anytime. Your invoice history and finance data are always safe regardless of plan." },
              { q: "Is GST included in price?",       a: "Prices shown are exclusive of GST. 18% GST will be added at checkout." },
            ].map(f => (
              <div key={f.q} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "18px 20px",
              }}>
                <p style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>{f.q}</p>
                <p style={{ color: "#64748B", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* ── FOOTER CTA ── */}
        <FadeUp delay={300}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#475569", fontSize: 13, margin: "0 0 8px" }}>
              Questions? We are here to help.
            </p>
            <a href="mailto:instabillindia@gmail.com"
              style={{ color: "#0EA5E9", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              instabillindia@gmail.com
            </a>
          </div>
        </FadeUp>

      </div>
    </main>
  );
}
