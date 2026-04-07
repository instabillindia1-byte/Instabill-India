"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "../../supabase/client";
import { useRouter }    from "next/navigation";
import Navbar           from "../../components/Navbar";
import { ShareModal }   from "../../components/ShareModal";

function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return"—";try{return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}catch{return d;}}

// Returns time string until next reminder is available
function reminderCountdown(lastReminderAt) {
  if (!lastReminderAt) return null;
  const lastTime = new Date(lastReminderAt).getTime();
  const nextTime = lastTime + 24 * 60 * 60 * 1000;
  const diff     = nextTime - Date.now();
  if (diff <= 0) return null; // available now
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function canSendReminder(inv) {
  if (inv.status === "paid") return false;
  if (!inv.last_reminder_at) return true;
  const lastTime = new Date(inv.last_reminder_at).getTime();
  return Date.now() - lastTime >= 24 * 60 * 60 * 1000;
}

const STATUS_CONFIG = {
  paid:    { color:"#10B981", bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.25)", label:"Paid ✓"   },
  pending: { color:"#F59E0B", bg:"rgba(245,158,11,0.12)", border:"rgba(245,158,11,0.25)", label:"Pending"  },
  overdue: { color:"#EF4444", bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.25)",  label:"Overdue"  },
};

export default function HistoryPage() {
  const [invoices,    setInvoices]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [search,      setSearch]      = useState("");
  const [shareModal,  setShareModal]  = useState(null); // {inv, type}
  const [markingPaid, setMarkingPaid] = useState(null);
  const [sendingRem,  setSendingRem]  = useState(null);
  const [, tick] = useState(0); // force re-render for countdown
  const supabase = createClient();
  const router   = useRouter();

  // Tick every minute to update countdowns
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("invoices").select("*").eq("user_id", user.id)
        .order("invoice_date", { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    }
    load();
  }, []);

  // Detect overdue
  function getStatus(inv) {
    if (inv.status === "paid") return "paid";
    if (inv.due_date && new Date(inv.due_date) < new Date() && inv.status === "pending") return "overdue";
    return inv.status || "pending";
  }

  // Filtered + searched
  const filtered = invoices.filter(inv => {
    const status = getStatus(inv);
    if (filter !== "all" && status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (inv.client_name||"").toLowerCase().includes(q) ||
             (inv.invoice_no||"").toLowerCase().includes(q)  ||
             (inv.service_desc||"").toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue = filtered.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const paidValue  = filtered.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const pendingCount = filtered.filter(i => getStatus(i) === "pending").length;
  const overdueCount = filtered.filter(i => getStatus(i) === "overdue").length;

  // Mark invoice as paid
  async function markPaid(inv) {
    setMarkingPaid(inv.id);
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (!error) {
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "paid" } : i));
    }
    setMarkingPaid(null);
    setShareModal(null);
  }

  // Send reminder — update last_reminder_at in DB + open share modal
  async function sendReminder(inv) {
    setSendingRem(inv.id);
    const now = new Date().toISOString();
    await supabase.from("invoices").update({
      last_reminder_at: now,
      reminder_count: (inv.reminder_count || 0) + 1,
    }).eq("id", inv.id);
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, last_reminder_at: now, reminder_count: (i.reminder_count || 0) + 1 } : i));
    setSendingRem(null);
    setShareModal({ inv: { ...inv, last_reminder_at: now }, type: "reminder" });
  }

  if (loading) return (
    <main style={{ minHeight:"100vh", background:"#020B18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, border:"3px solid rgba(14,165,233,0.2)", borderTopColor:"#0EA5E9", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
        <p style={{ color:"#64748B", fontSize:13 }}>Loading invoices...</p>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight:"100vh", background:"#020B18", fontFamily:"'Inter',sans-serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder{color:#334155!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .inv-row{transition:all 0.2s;animation:slideIn 0.3s ease forwards;}
        .inv-row:hover{background:rgba(14,165,233,0.04)!important;border-color:rgba(14,165,233,0.15)!important;}
        .action-btn{transition:all 0.2s ease;cursor:pointer;border:none;font-family:inherit;}
        .action-btn:hover:not(:disabled){transform:translateY(-1px);}
        .action-btn:active:not(:disabled){transform:scale(0.97);}
      `}</style>

      {/* Share Modal */}
      {shareModal && (
        <ShareModal
          inv={shareModal.inv}
          type={shareModal.type}
          onClose={() => setShareModal(null)}
          showMarkPaid={shareModal.type === "reminder" || shareModal.type === "invoice"}
          onMarkPaid={() => markPaid(shareModal.inv)}
        />
      )}

      <Navbar />

      <div style={{ maxWidth:920, margin:"0 auto", padding:"28px 20px 60px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12, animation:"fadeUp 0.5s ease" }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#fff", margin:0, letterSpacing:-0.5 }}>Invoice History 📄</h1>
            <p style={{ color:"#475569", fontSize:13, margin:"4px 0 0" }}>{invoices.length} invoices total</p>
          </div>
          <a href="/invoice" style={{ background:"linear-gradient(135deg,#0EA5E9,#0284C7)", color:"#fff", fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10, textDecoration:"none", boxShadow:"0 4px 14px rgba(14,165,233,0.35)" }}>
            + New Invoice
          </a>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:20, animation:"fadeUp 0.5s ease 0.05s both" }}>
          {[
            { label:"Total Value",  value:`₹${fmt(totalValue)}`,  color:"#E2E8F0", bg:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)" },
            { label:"Collected",   value:`₹${fmt(paidValue)}`,    color:"#10B981", bg:"rgba(16,185,129,0.06)", border:"rgba(16,185,129,0.15)" },
            { label:"Pending",     value:`${pendingCount} invoices`, color:"#F59E0B", bg:"rgba(245,158,11,0.06)", border:"rgba(245,158,11,0.15)" },
            { label:"Overdue",     value:`${overdueCount} invoices`, color:"#EF4444", bg:"rgba(239,68,68,0.06)", border:"rgba(239,68,68,0.15)" },
          ].map(s => (
            <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:10, color:"#64748B", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:17, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", animation:"fadeUp 0.5s ease 0.1s both" }}>
          <div style={{ flex:1, minWidth:200, position:"relative" }}>
            <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:0.4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client, invoice no, service..."
              style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 12px 10px 36px", color:"#E2E8F0", fontSize:13, outline:"none", fontFamily:"inherit" }}
              onFocus={e => e.target.style.borderColor="rgba(14,165,233,0.5)"}
              onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
          <div style={{ display:"flex", gap:7, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:5 }}>
            {["all","pending","paid","overdue"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:700, transition:"all 0.2s", background:filter===f?"linear-gradient(135deg,#0EA5E9,#0284C7)":"transparent", color:filter===f?"#fff":"#64748B" }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:18, padding:60, textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
            <p style={{ color:"#E2E8F0", fontSize:15, fontWeight:700, margin:"0 0 6px" }}>
              {search ? "No invoices match your search" : filter === "all" ? "No invoices yet" : `No ${filter} invoices`}
            </p>
            <a href="/invoice" style={{ color:"#0EA5E9", fontSize:13, fontWeight:700, textDecoration:"none" }}>Create your first invoice →</a>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map((inv, i) => {
              const status   = getStatus(inv);
              const sc       = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const canRemind = canSendReminder(inv);
              const countdown = reminderCountdown(inv.last_reminder_at);
              const isLoading = markingPaid === inv.id || sendingRem === inv.id;

              return (
                <div key={inv.id} className="inv-row"
                  style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"16px 18px", animationDelay:`${i*25}ms` }}>

                  {/* Top row */}
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginBottom:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                        <span style={{ color:"#E2E8F0", fontWeight:800, fontSize:14 }}>{inv.client_name}</span>
                        <span style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>{sc.label}</span>
                        {inv.reminder_count > 0 && (
                          <span style={{ background:"rgba(124,58,237,0.12)", color:"#A78BFA", border:"1px solid rgba(124,58,237,0.2)", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20 }}>
                            {inv.reminder_count} reminder{inv.reminder_count>1?"s":""} sent
                          </span>
                        )}
                      </div>
                      <div style={{ color:"#475569", fontSize:12, display:"flex", gap:12, flexWrap:"wrap" }}>
                        <span>#{inv.invoice_no}</span>
                        <span>{fmtDate(inv.invoice_date)}</span>
                        {inv.due_date && <span style={{ color:status==="overdue"?"#EF4444":"#64748B" }}>Due {fmtDate(inv.due_date)}</span>}
                        {inv.service_desc && <span style={{ maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inv.service_desc}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ color:"#0EA5E9", fontWeight:900, fontSize:18, letterSpacing:-0.5 }}>₹{fmt(inv.total_amount)}</div>
                      <div style={{ color:"#475569", fontSize:11 }}>incl. GST</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>

                    {/* Share invoice */}
                    <button className="action-btn"
                      onClick={() => setShareModal({ inv, type: "invoice" })}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.2)", color:"#0EA5E9", fontSize:12, fontWeight:700 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                      Share Invoice
                    </button>

                    {/* Send reminder — only if pending/overdue */}
                    {status !== "paid" && (
                      <button className="action-btn"
                        disabled={!canRemind || !!sendingRem}
                        onClick={() => canRemind && sendReminder(inv)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, background:canRemind?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.04)", border:`1px solid ${canRemind?"rgba(245,158,11,0.25)":"rgba(255,255,255,0.08)"}`, color:canRemind?"#F59E0B":"#475569", fontSize:12, fontWeight:700, opacity:sendingRem===inv.id?0.7:1 }}>
                        {sendingRem === inv.id ? (
                          <svg style={{ animation:"spin 0.8s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                        )}
                        {canRemind
                          ? (inv.reminder_count > 0 ? "Send Reminder Again" : "Send Reminder")
                          : `Reminder in ${countdown}`}
                      </button>
                    )}

                    {/* Mark as paid — only if pending/overdue */}
                    {status !== "paid" && (
                      <button className="action-btn"
                        disabled={!!markingPaid}
                        onClick={() => markPaid(inv)}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", color:"#10B981", fontSize:12, fontWeight:700, opacity:markingPaid===inv.id?0.7:1 }}>
                        {markingPaid === inv.id ? (
                          <svg style={{ animation:"spin 0.8s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                        Mark as Paid
                      </button>
                    )}

                    {/* Paid — show share receipt */}
                    {status === "paid" && (
                      <button className="action-btn"
                        onClick={() => setShareModal({ inv, type: "paid" })}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", color:"#10B981", fontSize:12, fontWeight:700 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Share Receipt
                      </button>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
