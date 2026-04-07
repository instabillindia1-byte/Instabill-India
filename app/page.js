"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── TYPEWRITER ───────────────────────────────────────
function useTypewriter(words, speed=80, pause=2000){
  const[text,setText]=useState("");const[wordIdx,setWordIdx]=useState(0);const[typing,setTyping]=useState(true);
  useEffect(()=>{
    const word=words[wordIdx];
    if(typing){
      if(text.length<word.length){const t=setTimeout(()=>setText(word.slice(0,text.length+1)),speed);return()=>clearTimeout(t);}
      else{const t=setTimeout(()=>setTyping(false),pause);return()=>clearTimeout(t);}
    }else{
      if(text.length>0){const t=setTimeout(()=>setText(text.slice(0,-1)),speed/2);return()=>clearTimeout(t);}
      else{setWordIdx(i=>(i+1)%words.length);setTyping(true);}
    }
  },[text,typing,wordIdx]);
  return text;
}

// ── FADE UP ──────────────────────────────────────────
function useFadeUp(){
  const ref=useRef(null);const[v,setV]=useState(false);
  useEffect(()=>{const o=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold:0.1});if(ref.current)o.observe(ref.current);return()=>o.disconnect();},[]);
  return[ref,v];
}
function FadeUp({children,delay=0,className=""}){
  const[ref,v]=useFadeUp();
  return(<div ref={ref} className={className} style={{transition:`opacity 0.7s ease ${delay}ms,transform 0.7s ease ${delay}ms`,opacity:v?1:0,transform:v?"translateY(0)":"translateY(36px)"}}>{children}</div>);
}

// ── CURSOR GLOW ──────────────────────────────────────
function CursorGlow(){
  const[pos,setPos]=useState({x:-200,y:-200});
  useEffect(()=>{const move=e=>setPos({x:e.clientX,y:e.clientY});window.addEventListener("mousemove",move);return()=>window.removeEventListener("mousemove",move);},[]);
  return(<div style={{position:"fixed",pointerEvents:"none",zIndex:9999,left:pos.x-200,top:pos.y-200,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,165,233,0.1) 0%,transparent 70%)",transition:"left 0.1s ease,top 0.1s ease"}}/>);
}

// ── SPLASH ───────────────────────────────────────────
function SplashScreen({onDone}){
  const[phase,setPhase]=useState(0);
  useEffect(()=>{const t1=setTimeout(()=>setPhase(1),400);const t2=setTimeout(()=>setPhase(2),1200);const t3=setTimeout(()=>onDone(),2200);return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};},[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:99999,background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",transition:"opacity 0.5s ease",opacity:phase===2?0:1,pointerEvents:phase===2?"none":"all"}}>
      <div style={{transition:"transform 0.6s cubic-bezier(.34,1.56,.64,1),opacity 0.6s ease",transform:phase>=1?"scale(1)":"scale(0.5)",opacity:phase>=1?1:0,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:24,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 0 60px rgba(14,165,233,0.5)"}}>
          <svg width="36" height="46" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
        </div>
        <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:-1}}>Insta<span style={{color:"#0EA5E9"}}>Bill</span><span style={{fontSize:14,color:"#64748B",marginLeft:8,letterSpacing:3}}>INDIA</span></div>
        <div style={{color:"#64748B",fontSize:13,marginTop:8}}>GST Invoicing · UPI Payments</div>
      </div>
    </div>
  );
}

// ── GLASS CARD ───────────────────────────────────────
function GlassCard({children,className="",style={}}){
  const[h,setH]=useState(false);
  return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className={className} style={{background:"rgba(14,165,233,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${h?"rgba(14,165,233,0.4)":"rgba(14,165,233,0.15)"}`,borderRadius:20,transition:"all 0.3s ease",boxShadow:h?"0 0 40px rgba(14,165,233,0.15),inset 0 1px 0 rgba(255,255,255,0.1)":"inset 0 1px 0 rgba(255,255,255,0.05)",transform:h?"translateY(-4px)":"translateY(0)",...style}}>{children}</div>);
}

function FeatureCard({icon,title,desc,delay}){
  return(<FadeUp delay={delay}><GlassCard style={{padding:"28px 24px",height:"100%"}}>
    <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,rgba(14,165,233,0.2),rgba(14,165,233,0.05))",border:"1px solid rgba(14,165,233,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16}}>{icon}</div>
    <h3 style={{color:"#E2E8F0",fontWeight:800,fontSize:16,marginBottom:8}}>{title}</h3>
    <p style={{color:"#64748B",fontSize:13,lineHeight:1.7,margin:0}}>{desc}</p>
  </GlassCard></FadeUp>);
}

function StepCard({n,title,desc,delay}){
  const colors=["#0EA5E9","#F59E0B","#10B981"];
  return(<FadeUp delay={delay}><GlassCard style={{padding:"28px 24px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",right:16,top:8,fontSize:80,fontWeight:900,color:"rgba(14,165,233,0.04)",lineHeight:1,userSelect:"none"}}>{n}</div>
    <div style={{width:40,height:40,borderRadius:"50%",background:colors[n-1],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:16,marginBottom:16,boxShadow:`0 0 20px ${colors[n-1]}60`}}>{n}</div>
    <h3 style={{color:"#E2E8F0",fontWeight:800,fontSize:17,marginBottom:8}}>{title}</h3>
    <p style={{color:"#64748B",fontSize:13,lineHeight:1.7,margin:0}}>{desc}</p>
  </GlassCard></FadeUp>);
}

// ── RIPPLE BUTTON ────────────────────────────────────
function RippleBtn({href,children,style={},gold=false}){
  function handleClick(e){
    const r=document.createElement("span");
    r.style.cssText="position:absolute;border-radius:50%;background:rgba(255,255,255,0.25);animation:ripple 0.6s linear;pointer-events:none;";
    const rect=e.currentTarget.getBoundingClientRect();const size=Math.max(rect.width,rect.height);
    r.style.width=r.style.height=size+"px";r.style.left=(e.clientX-rect.left-size/2)+"px";r.style.top=(e.clientY-rect.top-size/2)+"px";
    e.currentTarget.appendChild(r);setTimeout(()=>r.remove(),600);
  }
  return(
    <Link href={href} style={{textDecoration:"none"}}>
      <button onClick={handleClick} className={gold?"gold-btn":"primary-btn"}
        style={{position:"relative",overflow:"hidden",border:"none",cursor:"pointer",padding:"16px 32px",borderRadius:16,fontWeight:800,fontSize:16,display:"flex",alignItems:"center",gap:10,transition:"all 0.2s ease",
          background:gold?"linear-gradient(135deg,#F59E0B,#D97706)":"linear-gradient(135deg,#0EA5E9,#0284C7)",
          color:"#fff",boxShadow:gold?"0 4px 20px rgba(245,158,11,0.3)":"0 4px 20px rgba(14,165,233,0.3)",
          ...style}}>
        {children}
      </button>
    </Link>
  );
}

export default function LandingPage(){
  const[showSplash,setShowSplash]=useState(true);
  const[scrolled,setScrolled]=useState(false);
  const[email,setEmail]=useState("");
  const[submitted,setSubmitted]=useState(false);
  const[orbs,setOrbs]=useState([]);
  const[menuOpen,setMenuOpen]=useState(false);

  const typed=useTypewriter(["GST Invoices","UPI Payments","Happy Clients","More Revenue"],80,2000);

  useEffect(()=>{
    setOrbs(Array.from({length:6},(_,i)=>({id:i,x:[10,80,20,70,40,60][i],y:[20,10,70,60,40,80][i],size:[400,300,350,250,450,300][i],dur:[18,22,16,20,24,18][i],delay:i*2})));
    const onScroll=()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll",onScroll);
    return()=>window.removeEventListener("scroll",onScroll);
  },[]);

  function handleSubmit(e){e.preventDefault();if(email.includes("@"))setSubmitted(true);}

  const features=[
    {icon:"🧮",title:"Smart GST Logic",       desc:"Auto-detects intra vs inter-state. CGST+SGST or IGST applied correctly every time."},
    {icon:"⚡",title:"60-Second Invoice",      desc:"Fill the form, generate PDF. Done before your tea gets cold."},
    {icon:"📲",title:"UPI QR on Invoice",      desc:"Client scans with PhonePe, GPay or Paytm. Money in your account instantly."},
    {icon:"📧",title:"Auto Email to Client",   desc:"Invoice gets emailed to your client the moment you generate it."},
    {icon:"✅",title:"Payment Tracking",       desc:"Mark as paid, send reminders, auto receipt. Full payment lifecycle covered."},
    {icon:"🖼️",title:"Custom Logo Upload",    desc:"Upload your business logo and it appears on every PDF invoice automatically."},
  ];

  return(
    <>
      {showSplash&&<SplashScreen onDone={()=>setShowSplash(false)}/>}
      <CursorGlow/>

      <main style={{background:"#020B18",minHeight:"100vh",overflowX:"hidden"}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          *{font-family:'Inter',sans-serif;box-sizing:border-box;}
          ::selection{background:rgba(14,165,233,0.3);color:#fff;}
          ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
          @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,30px) scale(0.95)}}
          @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
          @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.4)}70%{box-shadow:0 0 0 20px rgba(14,165,233,0)}}
          @keyframes ripple{0%{transform:scale(0);opacity:0.6}100%{transform:scale(4);opacity:0}}
          @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .glow-text{background:linear-gradient(90deg,#0EA5E9 0%,#38BDF8 30%,#7DD3FC 50%,#38BDF8 70%,#0EA5E9 100%);background-size:200% 100%;animation:shimmer 3s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
          .primary-btn{animation:pulse 3s ease infinite;}
          .primary-btn:hover,.gold-btn:hover{animation:none;transform:translateY(-3px)!important;filter:brightness(1.1);}
          .primary-btn:active,.gold-btn:active{transform:scale(0.97)!important;}
          .nav-link{color:#64748B;text-decoration:none;font-size:14px;font-weight:600;transition:color 0.2s;}
          .nav-link:hover{color:#0EA5E9;}
          .cursor{display:inline-block;animation:blink 1s step-end infinite;color:#0EA5E9;}
          .stat-num{background:linear-gradient(135deg,#0EA5E9,#38BDF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
          .mob-menu{animation:fadeIn 0.2s ease forwards;}
        `}</style>

        {/* Orbs */}
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
          {orbs.map(o=>(<div key={o.id} style={{position:"absolute",left:`${o.x}%`,top:`${o.y}%`,width:o.size,height:o.size,borderRadius:"50%",background:o.id%2===0?"radial-gradient(circle,rgba(14,165,233,0.08) 0%,transparent 70%)":"radial-gradient(circle,rgba(56,189,248,0.05) 0%,transparent 70%)",animation:`orbFloat ${o.dur}s ease-in-out ${o.delay}s infinite`,transform:"translate(-50%,-50%)"}}/>))}
        </div>

        {/* NAVBAR */}
        <nav style={{position:"sticky",top:0,zIndex:100,background:scrolled?"rgba(2,11,24,0.92)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",borderBottom:scrolled?"1px solid rgba(14,165,233,0.1)":"none",transition:"all 0.3s ease"}}>
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 20px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <Link href="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(14,165,233,0.4)"}}>
                <svg width="14" height="18" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
              </div>
              <span style={{color:"#fff",fontWeight:900,fontSize:20,letterSpacing:-0.5}}>Insta<span style={{color:"#0EA5E9"}}>Bill</span></span>
              <span style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:6,letterSpacing:2}}>INDIA</span>
            </Link>

            {/* Desktop links */}
            <div style={{display:"flex",alignItems:"center",gap:32}} className="hidden-mobile">
              <a href="#features"    className="nav-link">Features</a>
              <a href="#how-it-works" className="nav-link">How it Works</a>
              <Link href="/pricing"  className="nav-link" style={{color:"#F59E0B"}}>Pricing 💎</Link>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Link href="/pricing" style={{textDecoration:"none",display:"flex"}}>
                <button style={{padding:"8px 16px",borderRadius:10,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#F59E0B",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(245,158,11,0.1)";}}>
                  💎 Pricing
                </button>
              </Link>
              <Link href="/invoice" style={{textDecoration:"none"}}>
                <button style={{padding:"10px 24px",borderRadius:12,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",border:"none",color:"white",cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8,boxShadow:"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(14,165,233,0.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(14,165,233,0.3)";}}>
                  <svg width="14" height="18" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section style={{position:"relative",zIndex:1,padding:"100px 20px 60px",textAlign:"center"}}>
          <div style={{maxWidth:800,margin:"0 auto"}}>
            <FadeUp delay={0}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:100,padding:"6px 16px",marginBottom:32}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#10B981",animation:"bounce 2s ease infinite"}}/>
                <span style={{color:"#64748B",fontSize:12,fontWeight:600}}>🎉 First 50 users get 20 FREE credits · No credit card needed</span>
              </div>
            </FadeUp>

            <FadeUp delay={100}>
              <h1 style={{fontSize:"clamp(40px,6vw,72px)",fontWeight:900,lineHeight:1.1,margin:"0 0 24px",color:"#fff",letterSpacing:-2}}>
                Create{" "}<span className="glow-text">{typed}</span><span className="cursor">|</span>
                <br/><span style={{color:"#E2E8F0"}}>in 60 Seconds.</span>
              </h1>
            </FadeUp>

            <FadeUp delay={200}>
              <p style={{color:"#64748B",fontSize:18,lineHeight:1.7,marginBottom:48,maxWidth:560,margin:"0 auto 48px"}}>
                India&apos;s most beautiful invoicing tool for freelancers. Auto GST · UPI QR · Email to client · All free to start.
              </p>
            </FadeUp>

            <FadeUp delay={300}>
              <div style={{display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
                <RippleBtn href="/invoice">
                  <svg width="18" height="22" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
                  Get Started — It&apos;s Free
                </RippleBtn>
                <RippleBtn href="/pricing" gold={true}>
                  💎 View Pricing
                </RippleBtn>
                <a href="#how-it-works" style={{textDecoration:"none"}}>
                  <button style={{padding:"16px 32px",borderRadius:16,fontWeight:700,fontSize:16,background:"transparent",border:"1px solid rgba(14,165,233,0.3)",color:"#0EA5E9",cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(14,165,233,0.1)";e.currentTarget.style.borderColor="rgba(14,165,233,0.6)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="rgba(14,165,233,0.3)";}}>
                    See How it Works ↓
                  </button>
                </a>
              </div>
            </FadeUp>

            {/* Stats */}
            <FadeUp delay={400}>
              <div style={{display:"flex",justifyContent:"center",gap:48,marginTop:64,flexWrap:"wrap"}}>
                {[{value:"60s",label:"To create invoice"},{value:"₹0",label:"Cost to start"},{value:"100%",label:"GST compliant"},{value:"20",label:"Free credits for first 50 users"}].map(s=>(
                  <div key={s.label} style={{textAlign:"center"}}>
                    <p className="stat-num" style={{fontSize:36,fontWeight:900,margin:0}}>{s.value}</p>
                    <p style={{color:"#64748B",fontSize:12,fontWeight:600,margin:"4px 0 0",textTransform:"uppercase",letterSpacing:1}}>{s.label}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* INVOICE MOCKUP */}
        <section style={{position:"relative",zIndex:1,padding:"20px 20px 60px"}}>
          <div style={{maxWidth:520,margin:"0 auto"}}>
            <FadeUp delay={0}>
              <GlassCard style={{overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#0284C7,#0EA5E9)",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:"#fff",fontWeight:900,fontSize:18}}>Insta<span style={{color:"#F59E0B"}}>Bill</span></div>
                    <div style={{color:"rgba(255,255,255,0.6)",fontSize:11,marginTop:2}}>TAX INVOICE</div>
                  </div>
                  <div style={{background:"rgba(16,185,129,0.2)",border:"1px solid rgba(16,185,129,0.4)",color:"#10B981",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20}}>PAID</div>
                </div>
                <div style={{padding:24}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <div style={{background:"rgba(14,165,233,0.05)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(14,165,233,0.1)"}}>
                      <div style={{color:"#0EA5E9",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>From</div>
                      <div style={{color:"#E2E8F0",fontWeight:700,fontSize:13}}>Vamshi Kumar</div>
                      <div style={{color:"#64748B",fontSize:11}}>Karnataka</div>
                    </div>
                    <div style={{background:"rgba(245,158,11,0.05)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(245,158,11,0.1)"}}>
                      <div style={{color:"#F59E0B",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>To</div>
                      <div style={{color:"#E2E8F0",fontWeight:700,fontSize:13}}>Acme Pvt Ltd</div>
                      <div style={{color:"#64748B",fontSize:11}}>Maharashtra</div>
                    </div>
                  </div>
                  <div style={{background:"rgba(14,165,233,0.04)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(14,165,233,0.08)",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{color:"#E2E8F0",fontWeight:700,fontSize:14}}>Web Development</div>
                      <div style={{color:"#64748B",fontSize:11,marginTop:2}}>SAC: 998312 · IGST 18%</div>
                    </div>
                    <div style={{color:"#0EA5E9",fontWeight:900,fontSize:18}}>₹29,500</div>
                  </div>
                  <div style={{display:"flex",gap:12,alignItems:"center",background:"rgba(14,165,233,0.05)",borderRadius:12,padding:"12px 14px",border:"1px solid rgba(14,165,233,0.1)"}}>
                    <div style={{width:56,height:56,background:"#fff",borderRadius:8,padding:4,flexShrink:0,display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:1}}>
                      {[1,0,1,1,0,1,0,1,0,1,1,0,1,0,0,1,1,1,0,1,0,0,1,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,1,1,1,0,0,1,0,1,1,0,1,1,0,0,1,1,0,1].map((v,i)=>(<div key={i} style={{background:v?"#0284C7":"#fff",borderRadius:0}}/>))}
                    </div>
                    <div>
                      <div style={{color:"#E2E8F0",fontWeight:700,fontSize:12}}>Scan & Pay Instantly</div>
                      <div style={{color:"#64748B",fontSize:11,marginTop:2}}>vamshi@upi</div>
                      <div style={{display:"flex",gap:4,marginTop:6}}>
                        {["PhonePe","GPay","Paytm"].map(a=>(<span key={a} style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6}}>{a}</span>))}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </FadeUp>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{position:"relative",zIndex:1,padding:"60px 20px"}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <FadeUp>
              <div style={{textAlign:"center",marginBottom:56}}>
                <div style={{display:"inline-block",background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9",fontSize:11,fontWeight:700,padding:"6px 16px",borderRadius:100,marginBottom:16,letterSpacing:2,textTransform:"uppercase"}}>Features</div>
                <h2 style={{color:"#E2E8F0",fontSize:36,fontWeight:900,margin:"0 0 12px",letterSpacing:-1}}>Everything you need</h2>
                <p style={{color:"#64748B",fontSize:16,margin:0}}>No bloat. Just the tools Indian freelancers actually use.</p>
              </div>
            </FadeUp>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
              {features.map((f,i)=><FeatureCard key={f.title} {...f} delay={i*80}/>)}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{position:"relative",zIndex:1,padding:"60px 20px"}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <FadeUp>
              <div style={{textAlign:"center",marginBottom:56}}>
                <div style={{display:"inline-block",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#F59E0B",fontSize:11,fontWeight:700,padding:"6px 16px",borderRadius:100,marginBottom:16,letterSpacing:2,textTransform:"uppercase"}}>How it Works</div>
                <h2 style={{color:"#E2E8F0",fontSize:36,fontWeight:900,margin:"0 0 12px",letterSpacing:-1}}>Invoice to payment in 3 steps</h2>
                <p style={{color:"#64748B",fontSize:16,margin:0}}>No accountant needed. No GST calculator tab open.</p>
              </div>
            </FadeUp>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
              {[
                {n:1,title:"Fill the form",          desc:"Enter your details, client info, and service. Takes under 60 seconds on any device."},
                {n:2,title:"GST auto-calculates",    desc:"We detect intra-state vs inter-state and apply correct GST split automatically."},
                {n:3,title:"Download PDF + Get Paid",desc:"One-click PDF with UPI QR. Client scans and pays. Receipt auto-sent on payment."},
              ].map((s,i)=><StepCard key={s.n} {...s} delay={i*100}/>)}
            </div>
            <FadeUp delay={400}>
              <div style={{textAlign:"center",marginTop:48,display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
                <RippleBtn href="/invoice">Try it now — It&apos;s Free ⚡</RippleBtn>
                <RippleBtn href="/pricing" gold={true}>💎 View All Plans</RippleBtn>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section style={{position:"relative",zIndex:1,padding:"40px 20px 60px"}}>
          <div style={{maxWidth:700,margin:"0 auto"}}>
            <FadeUp>
              <GlassCard style={{padding:40,textAlign:"center",position:"relative",overflow:"hidden",border:"1px solid rgba(245,158,11,0.2)"}}>
                <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.1),transparent 70%)"}}/>
                <div style={{position:"relative",zIndex:1}}>
                  <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:100,padding:"6px 16px",marginBottom:20}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:"#F59E0B",animation:"bounce 2s ease infinite"}}/>
                    <span style={{color:"#F59E0B",fontSize:12,fontWeight:700}}>⚡ First 50 users get 20 FREE credits</span>
                  </div>
                  <h2 style={{color:"#E2E8F0",fontSize:28,fontWeight:900,margin:"0 0 10px",letterSpacing:-0.5}}>Simple pricing, no surprises</h2>
                  <p style={{color:"#64748B",fontSize:14,marginBottom:28,lineHeight:1.6}}>Start free with 5 credits. Upgrade to Solo (₹149/mo) or Pro (₹349/mo) when you need more.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
                    {[
                      {name:"Free",  price:"₹0",    credits:"5 invoices",  color:"#64748B"},
                      {name:"Solo",  price:"₹149",   credits:"50 invoices", color:"#0EA5E9"},
                      {name:"Pro",   price:"₹349",   credits:"Unlimited",   color:"#F59E0B"},
                    ].map(p=>(
                      <div key={p.name} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${p.color}33`,borderRadius:14,padding:"16px 12px",textAlign:"center"}}>
                        <div style={{color:p.color,fontSize:18,fontWeight:900}}>{p.price}</div>
                        <div style={{color:"#E2E8F0",fontSize:12,fontWeight:700,margin:"4px 0 2px"}}>{p.name}</div>
                        <div style={{color:"#475569",fontSize:11}}>{p.credits}</div>
                      </div>
                    ))}
                  </div>
                  <RippleBtn href="/pricing" gold={true} style={{margin:"0 auto"}}>
                    💎 See Full Pricing
                  </RippleBtn>
                </div>
              </GlassCard>
            </FadeUp>
          </div>
        </section>

        {/* EMAIL CAPTURE */}
        <section style={{position:"relative",zIndex:1,padding:"20px 20px 60px"}}>
          <div style={{maxWidth:560,margin:"0 auto"}}>
            <FadeUp>
              <GlassCard style={{padding:48,textAlign:"center",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,165,233,0.15),transparent 70%)"}}/>
                <div style={{position:"relative",zIndex:1}}>
                  <h2 style={{color:"#E2E8F0",fontSize:28,fontWeight:900,margin:"0 0 12px",letterSpacing:-0.5}}>Join the waitlist</h2>
                  <p style={{color:"#64748B",fontSize:14,marginBottom:32,lineHeight:1.6}}>Get early access · Free Pro plan for first 50 · Launch updates</p>
                  {submitted?(
                    <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:16,padding:24}}>
                      <div style={{fontSize:40,marginBottom:8}}>🎉</div>
                      <p style={{color:"#10B981",fontWeight:800,fontSize:16,margin:0}}>You&apos;re on the list!</p>
                      <p style={{color:"#64748B",fontSize:13,marginTop:4}}>We&apos;ll reach out when Pro launches.</p>
                    </div>
                  ):(
                    <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:10}}>
                      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                        style={{background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:12,padding:"14px 18px",color:"#E2E8F0",fontSize:14,outline:"none",width:"100%",transition:"border-color 0.2s",fontFamily:"inherit"}}
                        onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.6)"}
                        onBlur={e=>e.target.style.borderColor="rgba(14,165,233,0.2)"}/>
                      <button type="submit" style={{padding:"14px 32px",borderRadius:12,fontWeight:700,fontSize:15,width:"100%",background:"linear-gradient(135deg,#0EA5E9,#0284C7)",border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",boxShadow:"0 4px 16px rgba(14,165,233,0.3)"}}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="none";}}>
                        Get Early Access
                      </button>
                    </form>
                  )}
                  <p style={{color:"#334155",fontSize:11,marginTop:16}}>No spam. Unsubscribe anytime.</p>
                </div>
              </GlassCard>
            </FadeUp>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{position:"relative",zIndex:1,borderTop:"1px solid rgba(14,165,233,0.1)",padding:"32px 20px"}}>
          <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="12" height="15" viewBox="0 0 15 20" fill="none"><polygon points="9,0 3,11 8,11 6,20 13,9 8,9 9,0" fill="#F59E0B"/></svg>
              </div>
              <span style={{color:"#E2E8F0",fontWeight:900,fontSize:16}}>Insta<span style={{color:"#0EA5E9"}}>Bill</span></span>
              <span style={{color:"#334155",fontSize:11,fontWeight:700,letterSpacing:2}}>INDIA</span>
            </div>
            <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
              <a href="#features"     className="nav-link" style={{fontSize:13}}>Features</a>
              <a href="#how-it-works" className="nav-link" style={{fontSize:13}}>How it Works</a>
              <Link href="/pricing"   style={{color:"#F59E0B",fontSize:13,fontWeight:700,textDecoration:"none"}}>Pricing 💎</Link>
              <Link href="/invoice"   style={{color:"#0EA5E9",fontSize:13,fontWeight:700,textDecoration:"none"}}>Create Invoice</Link>
            </div>
            <p style={{color:"#334155",fontSize:12}}>© 2025 InstaBill India · Made with 💙 for Indian Freelancers</p>
          </div>
        </footer>

      </main>
    </>
  );
}
