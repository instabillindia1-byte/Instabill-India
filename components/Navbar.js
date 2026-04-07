"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../supabase/client";

// ── PRIMARY NAV (always visible in menu) ────────────
const PRIMARY = [
  { href:"/invoice",          label:"Invoice",        emoji:"⚡", desc:"GST invoice + UPI QR"   },
  { href:"/invoice-multi",    label:"Multi Invoice",  emoji:"🧾", desc:"Multiple items invoice"  },
  { href:"/history",          label:"My Invoices",    emoji:"📄", desc:"History & payments"      },
  { href:"/clients",          label:"Clients",        emoji:"👥", desc:"Address book"            },
  { href:"/dashboard",        label:"Dashboard",      emoji:"📊", desc:"Earnings & analytics"    },
  { href:"/personal-finance", label:"My Finance",     emoji:"💰", desc:"Income, expenses, savings"},
];

// ── MORE ITEMS (shown in secondary section) ──────────
const MORE = [
  { href:"/inventory",        label:"Inventory",      emoji:"📦", desc:"Stock management"        },
  { href:"/expenses",         label:"Expenses",       emoji:"💸", desc:"Business expenses"       },
  { href:"/purchase-orders",  label:"Purchase Orders",emoji:"🛒", desc:"Supplier POs"            },
  { href:"/profile",          label:"Profile",        emoji:"👤", desc:"Your saved details"      },
  { href:"/pricing",          label:"Pricing",        emoji:"💎", desc:"Plans & credits"         },
];

export default function Navbar({ totalAmount }) {
  const [open,    setOpen]    = useState(false);
  const [user,    setUser]    = useState(null);
  const [scrolled,setScrolled]= useState(false);
  const [credits, setCredits] = useState(null);
  const menuRef  = useRef(null);
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("user_credits").select("credits,plan,is_early").eq("id", session.user.id).single();
        if (data) setCredits(data);
      }
    }
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
    });
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => { subscription.unsubscribe(); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) { if (open && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    setOpen(false);
  }

  const isActive = (href) => pathname === href;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .nb-item { text-decoration:none; display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; border:1px solid transparent; transition:all 0.15s ease; cursor:pointer; }
        .nb-item:hover { background:rgba(14,165,233,0.08) !important; border-color:rgba(14,165,233,0.15) !important; }
        .nb-item.active { background:rgba(14,165,233,0.12) !important; border-color:rgba(14,165,233,0.25) !important; }
        @keyframes menuSlide { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        .hline { width:22px; height:2px; background:#fff; border-radius:2px; transition:all 0.25s ease; display:block; }
      `}</style>

      <nav style={{ position:"sticky", top:0, zIndex:100, background:scrolled?"rgba(2,11,24,0.95)":"transparent", backdropFilter:scrolled?"blur(20px)":"none", borderBottom:scrolled?"1px solid rgba(14,165,233,0.1)":"none", transition:"all 0.3s ease", fontFamily:"'Inter',sans-serif" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

          {/* Logo */}
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none", flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#0EA5E9,#0284C7)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 16px rgba(14,165,233,0.4)" }}>
              <svg width="13" height="17" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
            </div>
            <span style={{ color:"#fff", fontWeight:900, fontSize:18, letterSpacing:-0.5 }}>Insta<span style={{ color:"#0EA5E9" }}>Bill</span></span>
          </Link>

          {/* Center — total amount if on invoice */}
          {totalAmount && (
            <div style={{ background:"rgba(14,165,233,0.1)", border:"1px solid rgba(14,165,233,0.25)", borderRadius:10, padding:"5px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"#64748B", fontSize:11, fontWeight:600 }}>Total</span>
              <span style={{ color:"#0EA5E9", fontSize:15, fontWeight:900 }}>₹{totalAmount}</span>
            </div>
          )}

          <div ref={menuRef} style={{ position:"relative" }}>
            {/* Hamburger */}
            <button onClick={() => setOpen(o => !o)}
              style={{ width:40, height:40, borderRadius:10, background:open?"rgba(14,165,233,0.15)":"rgba(255,255,255,0.06)", border:`1px solid ${open?"rgba(14,165,233,0.3)":"rgba(255,255,255,0.1)"}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:5, cursor:"pointer", transition:"all 0.2s", padding:0 }}>
              <span className="hline" style={{ transform:open?"rotate(45deg) translate(5px,5px)":"none" }}/>
              <span className="hline" style={{ opacity:open?0:1 }}/>
              <span className="hline" style={{ transform:open?"rotate(-45deg) translate(5px,-5px)":"none" }}/>
            </button>

            {/* Menu panel */}
            {open && (
              <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, width:300, background:"rgba(8,18,36,0.97)", backdropFilter:"blur(24px)", border:"1px solid rgba(14,165,233,0.2)", borderRadius:18, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", animation:"menuSlide 0.2s ease", overflow:"hidden", zIndex:200 }}>

                {/* User info */}
                {user && (
                  <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#0EA5E9,#0284C7)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:14, flexShrink:0 }}>
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ color:"#E2E8F0", fontSize:12, fontWeight:700, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</p>
                      {credits && (
                        <p style={{ color:"#475569", fontSize:11, margin:"2px 0 0" }}>
                          {credits.plan==="pro"?"⭐ Pro plan":`🪙 ${credits.credits} credits${credits.is_early?" · ⚡ Early Bird":""}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary nav — scrollable */}
                <div style={{ maxHeight:"60vh", overflowY:"auto", padding:"8px 10px" }}>
                  <p style={{ color:"#334155", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"4px 4px 6px", padding:"0 2px" }}>Main</p>
                  {PRIMARY.map(l => (
                    <Link key={l.href} href={l.href} className={`nb-item${isActive(l.href)?" active":""}`}
                      style={{ background:isActive(l.href)?"rgba(14,165,233,0.12)":"transparent", border:`1px solid ${isActive(l.href)?"rgba(14,165,233,0.25)":"transparent"}`, marginBottom:2 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{l.emoji}</span>
                      <div style={{ minWidth:0 }}>
                        <p style={{ color:"#E2E8F0", fontSize:13, fontWeight:isActive(l.href)?700:500, margin:0 }}>{l.label}</p>
                        <p style={{ color:"#475569", fontSize:11, margin:0 }}>{l.desc}</p>
                      </div>
                      {isActive(l.href) && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#0EA5E9", flexShrink:0 }}/>}
                    </Link>
                  ))}

                  {/* More section */}
                  <p style={{ color:"#334155", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, margin:"10px 4px 6px", padding:"0 2px" }}>More</p>
                  {MORE.map(l => (
                    <Link key={l.href} href={l.href} className={`nb-item${isActive(l.href)?" active":""}`}
                      style={{ background:isActive(l.href)?"rgba(14,165,233,0.12)":"transparent", border:`1px solid ${isActive(l.href)?"rgba(14,165,233,0.25)":"transparent"}`, marginBottom:2 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{l.emoji}</span>
                      <div>
                        <p style={{ color:"#CBD5E1", fontSize:13, fontWeight:isActive(l.href)?700:400, margin:0 }}>{l.label}</p>
                        <p style={{ color:"#475569", fontSize:11, margin:0 }}>{l.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Sign out */}
                {user && (
                  <div style={{ padding:"8px 10px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={signOut}
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10, background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)", color:"#EF4444", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, transition:"all 0.2s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.12)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.06)"}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign Out
                    </button>
                  </div>
                )}

                {!user && (
                  <div style={{ padding:"8px 10px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                    <Link href="/login" style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"10px", borderRadius:10, background:"linear-gradient(135deg,#0EA5E9,#0284C7)", color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                      Sign In with Google
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
