"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";
import Navbar from "../../components/Navbar";
import QRCode from "qrcode";

// ── InstaBill owner UPI ───────────────────────────────
const OWNER_UPI  = "kvamshiiyan445@ybl";
const OWNER_NAME = "InstaBill India";

const PLANS = [
  { key:"solo",  name:"Solo",  price:149, credits:"50 invoice credits/month", color:"#0EA5E9", glow:"rgba(14,165,233,0.3)",  features:["50 invoices per month","All sections unlocked","Priority support"] },
  { key:"pro",   name:"Pro",   price:349, credits:"Unlimited invoices",        color:"#F59E0B", glow:"rgba(245,158,11,0.3)",  features:["Unlimited invoices","All sections unlocked","Custom logo on invoices","Priority support"] },
];

const UPI_APPS = [
  { name:"PhonePe", id:"phonepe", color:"#5F259F", icon:"📱",
    getUrl:(upi,amount,name,note)=>`phonepe://pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
  { name:"Google Pay",id:"gpay",  color:"#1A73E8", icon:"💳",
    getUrl:(upi,amount,name,note)=>`tez://upi/pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
  { name:"Paytm",   id:"paytm",  color:"#00BAF2", icon:"💙",
    getUrl:(upi,amount,name,note)=>`paytmmp://pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
  { name:"BHIM",    id:"bhim",   color:"#FF6B35", icon:"🇮🇳",
    getUrl:(upi,amount,name,note)=>`upi://pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}` },
];

export default function PaymentPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const selectedPlan  = PLANS.find(p => p.key === searchParams.get("plan")) || PLANS[0];
  const [plan, setPlan]           = useState(selectedPlan);
  const [qrUrl, setQrUrl]         = useState("");
  const [step, setStep]           = useState("select"); // select | pay | verify
  const [userEmail, setUserEmail]  = useState("");
  const [txnId, setTxnId]         = useState("");
  const [submitted, setSubmitted]  = useState(false);
  const [user, setUser]            = useState(null);
  const supabase = createClient();

  const upiNote = `InstaBill ${plan.name} Plan - ${userEmail || "user"}`;
  const upiStr  = `upi://pay?pa=${OWNER_UPI}&pn=${encodeURIComponent(OWNER_NAME)}&am=${plan.price}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      setUserEmail(user.email || "");
    }
    load();
  }, []);

  useEffect(() => {
    // Generate QR code whenever plan changes
    QRCode.toDataURL(upiStr, {
      width: 240, margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    }).then(setQrUrl).catch(console.error);
  }, [plan, upiStr]);

  async function handleVerify() {
    if (!txnId.trim()) { alert("Please enter your UPI Transaction ID or UTR number."); return; }
    setSubmitted(true);
    // Save payment request to Supabase for manual verification
    try {
      await supabase.from("payment_requests").insert({
        user_id:   user?.id,
        user_email:userEmail,
        plan:      plan.key,
        amount:    plan.price,
        txn_id:    txnId.trim(),
        status:    "pending_verification",
        created_at:new Date().toISOString(),
      });
    } catch (e) {
      // Table might not exist yet — that's ok, email is enough
      console.log("payment_requests table not created yet:", e.message);
    }
    setStep("verify");
  }

  return (
    <main style={{ minHeight:"100vh", background:"#020B18", fontFamily:"'Inter',sans-serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%{transform:scale(0.9);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        .upi-btn{transition:all 0.2s ease;cursor:pointer;}
        .upi-btn:hover{transform:translateY(-3px);filter:brightness(1.1);}
        .upi-btn:active{transform:scale(0.97);}
        .plan-card{transition:all 0.2s ease;cursor:pointer;}
        .plan-card:hover{transform:translateY(-4px);}
      `}</style>

      <Navbar />

      <div style={{ maxWidth:580, margin:"0 auto", padding:"36px 20px 80px", position:"relative", zIndex:1 }}>

        {/* ── STEP: SELECT PLAN ── */}
        {step === "select" && (
          <div style={{ animation:"fadeUp 0.5s ease" }}>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:"0 0 8px", letterSpacing:-1 }}>
                Upgrade InstaBill India ⚡
              </h1>
              <p style={{ color:"#64748B", fontSize:14, margin:0 }}>
                Pay via UPI · Instant activation after verification
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
              {PLANS.map(p => (
                <div key={p.key} className="plan-card"
                  onClick={() => setPlan(p)}
                  style={{ background:plan.key===p.key?`rgba(${p.color==="#0EA5E9"?"14,165,233":"245,158,11"},0.1)`:"rgba(255,255,255,0.03)", border:`2px solid ${plan.key===p.key?p.color+"77":"rgba(255,255,255,0.08)"}`, borderRadius:18, padding:20, boxShadow:plan.key===p.key?`0 0 32px ${p.glow}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <span style={{ color:"#E2E8F0", fontSize:16, fontWeight:800 }}>{p.name}</span>
                    {plan.key===p.key && <span style={{ background:p.color, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20 }}>Selected</span>}
                  </div>
                  <div style={{ color:p.color, fontSize:36, fontWeight:900, lineHeight:1, marginBottom:6 }}>₹{p.price}</div>
                  <div style={{ color:"#64748B", fontSize:12, marginBottom:12 }}>/month</div>
                  <div style={{ fontSize:11, color:p.color, fontWeight:700, background:`rgba(${p.color==="#0EA5E9"?"14,165,233":"245,158,11"},0.1)`, padding:"6px 10px", borderRadius:8, marginBottom:12 }}>
                    {p.credits}
                  </div>
                  {p.features.map(f => (
                    <div key={f} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                      <span style={{ color:p.color, fontSize:11 }}>✓</span>
                      <span style={{ color:"#94A3B8", fontSize:11 }}>{f}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button onClick={() => setStep("pay")}
              style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${plan.color},${plan.color}cc)`, color:"#fff", fontWeight:800, fontSize:17, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 4px 24px ${plan.glow}`, transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 32px ${plan.glow}`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow=`0 4px 24px ${plan.glow}`; }}>
              Pay ₹{plan.price} for {plan.name} Plan →
            </button>

            <p style={{ textAlign:"center", color:"#334155", fontSize:12, marginTop:12 }}>
              Secure UPI payment · Your account is upgraded within 2 hours
            </p>
          </div>
        )}

        {/* ── STEP: PAY ── */}
        {step === "pay" && (
          <div style={{ animation:"fadeUp 0.5s ease" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <button onClick={() => setStep("select")} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 14px", color:"#94A3B8", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
              <div>
                <h2 style={{ color:"#fff", fontSize:20, fontWeight:800, margin:0 }}>Pay ₹{plan.price} — {plan.name}</h2>
                <p style={{ color:"#64748B", fontSize:12, margin:0 }}>Paying to: {OWNER_UPI}</p>
              </div>
            </div>

            {/* Amount badge */}
            <div style={{ background:"linear-gradient(135deg,rgba(14,165,233,0.15),rgba(14,165,233,0.05))", border:"1px solid rgba(14,165,233,0.3)", borderRadius:16, padding:"18px 20px", marginBottom:22, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ color:"#64748B", fontSize:12, marginBottom:4 }}>Amount to pay</div>
                <div style={{ color:"#fff", fontSize:32, fontWeight:900 }}>₹{plan.price}</div>
                <div style={{ color:"#64748B", fontSize:11, marginTop:2 }}>InstaBill India — {plan.name} Plan</div>
              </div>
              <div style={{ background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.2)", borderRadius:12, padding:"10px 14px", textAlign:"center" }}>
                <div style={{ color:"#0EA5E9", fontSize:11, fontWeight:700 }}>UPI ID</div>
                <div style={{ color:"#E2E8F0", fontSize:13, fontWeight:700, marginTop:2 }}>{OWNER_UPI}</div>
              </div>
            </div>

            {/* QR Code */}
            {qrUrl && (
              <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:20, textAlign:"center" }}>
                <p style={{ color:"#94A3B8", fontSize:12, fontWeight:600, margin:"0 0 14px" }}>
                  Scan with any UPI app
                </p>
                <div style={{ display:"inline-block", background:"#fff", padding:12, borderRadius:12 }}>
                  <img src={qrUrl} alt="UPI QR Code" style={{ width:180, height:180, display:"block" }} />
                </div>
                <p style={{ color:"#475569", fontSize:11, margin:"12px 0 0" }}>
                  Amount: ₹{plan.price} · To: {OWNER_UPI}
                </p>
              </div>
            )}

            {/* UPI App buttons */}
            <p style={{ color:"#64748B", fontSize:12, fontWeight:600, margin:"0 0 12px", textTransform:"uppercase", letterSpacing:1 }}>
              Or open directly in your UPI app
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
              {UPI_APPS.map(app => (
                <a key={app.id}
                  href={app.getUrl(OWNER_UPI, plan.price, OWNER_NAME, upiNote)}
                  className="upi-btn"
                  style={{ display:"flex", alignItems:"center", gap:10, background:`${app.color}18`, border:`1px solid ${app.color}44`, borderRadius:12, padding:"14px 16px", textDecoration:"none" }}>
                  <span style={{ fontSize:24 }}>{app.icon}</span>
                  <div>
                    <div style={{ color:"#E2E8F0", fontSize:13, fontWeight:700 }}>{app.name}</div>
                    <div style={{ color:"#64748B", fontSize:11 }}>Tap to pay ₹{plan.price}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* After payment — enter txn ID */}
            <div style={{ background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:16, padding:20 }}>
              <h3 style={{ color:"#10B981", fontSize:14, fontWeight:700, margin:"0 0 12px" }}>
                ✅ After paying — enter your Transaction ID
              </h3>
              <p style={{ color:"#64748B", fontSize:12, margin:"0 0 14px", lineHeight:1.6 }}>
                Copy the UPI Transaction ID / UTR number from your payment app and paste it below. Your account will be upgraded within 2 hours.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:1.2 }}>UPI Transaction ID / UTR *</label>
                  <input value={txnId} onChange={e => setTxnId(e.target.value)}
                    placeholder="e.g. 428516293847 or T2501234567890"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:10, padding:"11px 14px", color:"#E2E8F0", fontSize:13, outline:"none", fontFamily:"inherit" }}
                    onFocus={e => e.target.style.borderColor="rgba(16,185,129,0.6)"}
                    onBlur={e => e.target.style.borderColor="rgba(16,185,129,0.3)"}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:1.2 }}>Your Email (auto-filled)</label>
                  <input value={userEmail} onChange={e => setUserEmail(e.target.value)}
                    placeholder="your@email.com" type="email"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"#E2E8F0", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
                </div>
                <button onClick={handleVerify}
                  style={{ padding:"13px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#059669,#10B981)", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px rgba(16,185,129,0.3)", transition:"all 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                  Submit for Verification →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: VERIFIED ── */}
        {step === "verify" && (
          <div style={{ animation:"bounce 0.5s ease forwards", textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🎉</div>
            <h2 style={{ color:"#10B981", fontSize:24, fontWeight:900, margin:"0 0 10px" }}>
              Payment Submitted!
            </h2>
            <p style={{ color:"#64748B", fontSize:14, margin:"0 0 24px", lineHeight:1.7 }}>
              We have received your transaction ID. Your <strong style={{ color:"#E2E8F0" }}>{plan.name} plan</strong> will be activated within <strong style={{ color:"#E2E8F0" }}>2 hours</strong>.
            </p>

            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:24, textAlign:"left" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                {[
                  ["Plan",           plan.name],
                  ["Amount",        `₹${plan.price}`],
                  ["Transaction ID", txnId],
                  ["Email",          userEmail],
                  ["Status",         "Pending verification ⏳"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color:"#64748B", fontSize:13, padding:"6px 0" }}>{k}</td>
                    <td style={{ color:"#E2E8F0", fontSize:13, fontWeight:600, textAlign:"right", padding:"6px 0" }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>

            <div style={{ background:"rgba(14,165,233,0.06)", border:"1px solid rgba(14,165,233,0.2)", borderRadius:14, padding:16, marginBottom:24 }}>
              <p style={{ color:"#38BDF8", fontSize:13, fontWeight:600, margin:"0 0 4px" }}>Questions? Contact us</p>
              <a href="mailto:instabillindia@gmail.com" style={{ color:"#0EA5E9", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                instabillindia@gmail.com
              </a>
            </div>

            <a href="/invoice" style={{ display:"inline-block", background:"linear-gradient(135deg,#0EA5E9,#0284C7)", color:"#fff", fontWeight:700, fontSize:14, padding:"13px 28px", borderRadius:12, textDecoration:"none" }}>
              Back to Invoice →
            </a>
          </div>
        )}

      </div>
    </main>
  );
}
