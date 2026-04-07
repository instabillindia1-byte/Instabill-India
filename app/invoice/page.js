"use client";
import { useState, useEffect, useRef } from "react";
import { createClient }      from "../../supabase/client";
import { useRouter }          from "next/navigation";
import Navbar                 from "../../components/Navbar";
import { ShareModal }         from "../../components/ShareModal";
import { loadCredits, canCreateInvoice, PLANS } from "../../lib/credits";
import { generateInvoicePDF } from "../../lib/pdfGenerator";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].sort();
const SAC_CODES = [
  {code:"998311",label:"Software / IT Services"},{code:"998312",label:"Web Design & Development"},
  {code:"998313",label:"Digital Marketing"},{code:"998315",label:"Social Media Management"},
  {code:"998361",label:"Video Editing & Production"},{code:"998371",label:"Graphic Design"},
  {code:"998381",label:"Photography"},{code:"999293",label:"Content Writing"},
  {code:"998214",label:"Management Consulting"},{code:"998221",label:"Legal Services"},
  {code:"998231",label:"Accounting / CA Services"},{code:"999299",label:"Other Professional Services"},
];

function validateGSTIN(g){if(!g)return true;return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g.toUpperCase());}
function validateUPI(u){return /^[a-zA-Z0-9._\-]{2,}@[a-zA-Z]{2,}$/.test(u);}
function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function genInvNo(){const d=new Date();return `INV-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;}

function calcGST(amount,sS,cS,rate){
  const base=parseFloat(amount)||0,r=parseFloat(rate)||18;
  const gst=parseFloat(((base*r)/100).toFixed(2));const intra=sS===cS;
  return{intra,cgst:intra?gst/2:0,sgst:intra?gst/2:0,igst:intra?0:gst,total:parseFloat((base+gst).toFixed(2)),sub:base};
}

function launchConfetti(){
  const colors=["#0EA5E9","#38BDF8","#F59E0B","#10B981","#fff","#7C3AED"];
  const c=document.createElement("div");c.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;";document.body.appendChild(c);
  for(let i=0;i<100;i++){const el=document.createElement("div");const color=colors[Math.floor(Math.random()*colors.length)];const sz=Math.random()*8+4,x=Math.random()*100,dl=Math.random()*0.5,dr=Math.random()*2+2;el.style.cssText=`position:absolute;left:${x}%;top:-10px;width:${sz}px;height:${sz}px;background:${color};border-radius:${Math.random()>.5?"50%":"2px"};animation:cFall ${dr}s ease-in ${dl}s forwards;`;c.appendChild(el);}
  const s=document.createElement("style");s.textContent=`@keyframes cFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}`;document.head.appendChild(s);
  setTimeout(()=>{c.remove();s.remove();},4000);
}

function useFadeUp(){const ref=useRef(null);const[v,setV]=useState(false);useEffect(()=>{const o=new IntersectionObserver(([e])=>{if(e.isIntersecting)setV(true);},{threshold:0.08});if(ref.current)o.observe(ref.current);return()=>o.disconnect();},[]);return[ref,v];}
function FadeUp({children,delay=0}){const[ref,v]=useFadeUp();return<div ref={ref} style={{transition:`opacity 0.6s ease ${delay}ms,transform 0.6s ease ${delay}ms`,opacity:v?1:0,transform:v?"translateY(0)":"translateY(24px)"}}>{children}</div>;}

function AnimNumber({value}){const[d,setD]=useState(0);const prev=useRef(0);useEffect(()=>{const t=parseFloat(value)||0;if(t===prev.current)return;const diff=t-prev.current,steps=25,start=prev.current;let i=0;const id=setInterval(()=>{i++;const e=1-Math.pow(1-i/steps,3);setD(start+diff*e);if(i>=steps){setD(t);prev.current=t;clearInterval(id);}},16);return()=>clearInterval(id);},[value]);return<span>{fmt(d)}</span>;}

function GField({label,name,type="text",placeholder="",required,value,onChange,error,hint}){
  const[f,setF]=useState(false);const filled=value&&String(value).length>0;
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <label style={{fontSize:10,fontWeight:700,color:filled?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:4}}>{label}{required&&<span style={{color:"#F59E0B"}}>*</span>}{filled&&<span style={{color:"#10B981",fontSize:11}}>✓</span>}</label>
    <input type={type} value={value} placeholder={placeholder} autoComplete="off" onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":filled?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:"#E2E8F0",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit",boxShadow:f?"0 0 0 3px rgba(14,165,233,0.1)":"none"}}/>
    {hint&&!error&&<p style={{color:"#475569",fontSize:11,margin:0}}>{hint}</p>}
    {error&&<p style={{color:"#EF4444",fontSize:11,margin:0}}>⚠ {error}</p>}
  </div>);}

function GSelect({label,name,options,required,value,onChange,error,placeholder}){
  const[f,setF]=useState(false);
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <label style={{fontSize:10,fontWeight:700,color:value?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:4}}>{label}{required&&<span style={{color:"#F59E0B"}}>*</span>}{value&&<span style={{color:"#10B981",fontSize:11}}>✓</span>}</label>
    <select value={value} onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:value?"#E2E8F0":"#64748B",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit"}}>
      <option value="" style={{background:"#0F172A"}}>{placeholder||"Select..."}</option>
      {options.map(o=><option key={o.value} value={o.value} style={{background:"#0F172A"}}>{o.label}</option>)}
    </select>
    {error&&<p style={{color:"#EF4444",fontSize:11,margin:0}}>⚠ {error}</p>}
  </div>);}

function GTextarea({label,name,placeholder,rows=2,value,onChange,error}){
  const[f,setF]=useState(false);
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <label style={{fontSize:10,fontWeight:700,color:value?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:4}}>{label}{value&&<span style={{color:"#10B981",fontSize:11}}>✓</span>}</label>
    <textarea value={value} placeholder={placeholder} rows={rows} onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:"#E2E8F0",fontSize:13,outline:"none",resize:"none",transition:"all 0.2s",fontFamily:"inherit"}}/>
    {error&&<p style={{color:"#EF4444",fontSize:11,margin:0}}>⚠ {error}</p>}
  </div>);}

function GlassCard({children,accent="#0EA5E9",style={}}){const[h,setH]=useState(false);return(<div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:`1px solid ${h?accent+"55":accent+"22"}`,borderRadius:20,padding:24,transition:"all 0.3s",boxShadow:h?`0 0 40px ${accent}15`:"none",...style}}>{children}</div>);}
function SectionTitle({step,title,accent="#0EA5E9"}){return(<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${accent},${accent}88)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13,boxShadow:`0 0 14px ${accent}60`,flexShrink:0}}>{step}</div><h2 style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2,margin:0}}>{title}</h2></div>);}

export default function InvoicePage(){
  const[form,setForm]=useState({
    senderName:"",senderGSTIN:"",senderAddress:"",senderState:"",senderUPI:"",
    clientName:"",clientGSTIN:"",clientAddress:"",clientState:"",clientEmail:"",clientPhone:"",
    invoiceNo:"",invoiceDate:"",dueDate:"",
    serviceDesc:"",sacCode:"",amount:"",gstRate:"18",notes:"",
  });
  const[errors,       setErrors]       =useState({});
  const[gen,          setGen]          =useState(false);
  const[shareData,    setShareData]    =useState(null); // triggers share modal
  const[profileLoaded,setProfileLoaded]=useState(false);
  const[clientLoaded, setClientLoaded] =useState(false);
  const[userCredits,  setUserCredits]  =useState(null);
  const[logoUrl,      setLogoUrl]      =useState(null);
  const[currentUser,  setCurrentUser]  =useState(null);
  const[orbs,         setOrbs]         =useState([]);
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    setForm(p=>({...p,invoiceNo:genInvNo(),invoiceDate:new Date().toISOString().split("T")[0]}));
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      setCurrentUser(user);
      const{data:profile}=await supabase.from("profiles").select("*").eq("id",user.id).single();
      if(profile){
        setForm(p=>({...p,senderName:profile.full_name||p.senderName,senderGSTIN:profile.gstin||p.senderGSTIN,senderUPI:profile.upi_id||p.senderUPI,senderAddress:profile.address||p.senderAddress,senderState:profile.state||p.senderState}));
        setProfileLoaded(true);
      }
      try{const raw=sessionStorage.getItem("prefill_client");if(raw){const cd=JSON.parse(raw);setForm(p=>({...p,clientName:cd.clientName||p.clientName,clientGSTIN:cd.clientGSTIN||p.clientGSTIN,clientEmail:cd.clientEmail||p.clientEmail,clientPhone:cd.clientPhone||p.clientPhone,clientState:cd.clientState||p.clientState,clientAddress:cd.clientAddress||p.clientAddress}));setClientLoaded(true);sessionStorage.removeItem("prefill_client");}}catch{sessionStorage.removeItem("prefill_client");}
      const credits=await loadCredits(supabase,user.id);setUserCredits(credits);
      try{const{data:lf}=await supabase.storage.from("logos").list(user.id);if(lf&&lf.length>0){const{data:{publicUrl}}=supabase.storage.from("logos").getPublicUrl(`${user.id}/logo`);setLogoUrl(publicUrl+"?t="+Date.now());}}catch{}
    }
    load();
    setOrbs(Array.from({length:5},(_,i)=>({id:i,x:[15,75,30,60,45][i],y:[20,15,65,55,40][i],size:[300,250,280,220,350][i],dur:[18,22,16,20,24][i],delay:i*2})));
  },[]);

  const gstPreview=form.amount&&form.senderState&&form.clientState&&parseFloat(form.amount)>0?calcGST(form.amount,form.senderState,form.clientState,form.gstRate):null;
  function update(f,v){setForm(p=>({...p,[f]:v}));setErrors(p=>({...p,[f]:""}));}

  function validate(){
    const e={};
    if(!form.senderName.trim())e.senderName="Your name is required";
    if(!form.senderState)e.senderState="Select your state";
    if(!form.senderUPI.trim())e.senderUPI="UPI ID is required";
    else if(!validateUPI(form.senderUPI.trim()))e.senderUPI="Invalid format (e.g. name@upi)";
    if(form.senderGSTIN&&!validateGSTIN(form.senderGSTIN))e.senderGSTIN="Invalid GSTIN";
    if(!form.clientName.trim())e.clientName="Client name is required";
    if(!form.clientState)e.clientState="Select client state";
    if(form.clientGSTIN&&!validateGSTIN(form.clientGSTIN))e.clientGSTIN="Invalid GSTIN";
    if(!form.serviceDesc.trim())e.serviceDesc="Describe the service";
    if(!form.amount||isNaN(form.amount)||parseFloat(form.amount)<=0)e.amount="Enter valid amount";
    if(parseFloat(form.amount)>10000000)e.amount="Cannot exceed Rs.1 Crore";
    return e;
  }

  async function generateInvoice(){
    if(userCredits){const check=canCreateInvoice(userCredits.credits,userCredits.plan);if(!check.allowed){if(confirm("All credits used! Upgrade to create more."))window.location.href="/pricing";return;}}
    const e=validate();if(Object.keys(e).length>0){setErrors(e);window.scrollTo({top:0,behavior:"smooth"});return;}
    setErrors({});setGen(true);
    const user=currentUser;
    if(!user){alert("Session expired. Refresh and try again.");setGen(false);return;}

    // STEP 3: PDF
    let pdfResult=null;
    try{
      pdfResult=await generateInvoicePDF({
        senderName:form.senderName,senderGSTIN:form.senderGSTIN,senderAddress:form.senderAddress,
        senderState:form.senderState,senderUPI:form.senderUPI,clientName:form.clientName,
        clientGSTIN:form.clientGSTIN,clientAddress:form.clientAddress,clientState:form.clientState,
        clientEmail:form.clientEmail,invoiceNo:form.invoiceNo,invoiceDate:form.invoiceDate,
        dueDate:form.dueDate||null,
        items:[{description:form.serviceDesc,sacCode:form.sacCode||"",qty:1,rate:parseFloat(form.amount),gstRate:parseFloat(form.gstRate)}],
        notes:form.notes,logoUrl,
      });
    }catch(err){console.error("PDF:",err);alert("PDF generation failed. Check all fields.");setGen(false);return;}

    const{grand,intra,cgst,sgst,igst,sub,gstTotal}=pdfResult;
    const gstType=intra?"intra":"inter";

    // STEP 4: Save to DB
    try{
      await supabase.from("invoices").insert({
        user_id:user.id,invoice_no:form.invoiceNo,invoice_date:form.invoiceDate,due_date:form.dueDate||null,
        sender_name:form.senderName,sender_gstin:form.senderGSTIN||null,sender_state:form.senderState,
        sender_upi:form.senderUPI,sender_address:form.senderAddress||null,client_name:form.clientName,
        client_gstin:form.clientGSTIN||null,client_state:form.clientState,client_address:form.clientAddress||null,
        client_email:form.clientEmail||null,client_phone:form.clientPhone||null,
        service_desc:form.serviceDesc,sac_code:form.sacCode||null,
        amount:parseFloat(form.amount),gst_rate:parseFloat(form.gstRate),
        gst_type:gstType,total_amount:grand,notes:form.notes||null,status:"pending",
      });
      console.log("✅ Invoice saved");
    }catch(dbErr){console.error("❌ DB:",dbErr.message);}

    // STEP 5: Deduct credit
    try{
      if(userCredits&&userCredits.plan!=="pro"){
        const nc=Math.max(0,userCredits.credits-1),ntu=(userCredits.total_used||0)+1;
        await supabase.from("user_credits").update({credits:nc,total_used:ntu,updated_at:new Date().toISOString()}).eq("id",user.id);
        setUserCredits(prev=>({...prev,credits:nc,total_used:ntu}));
        console.log("✅ Credit deducted:",nc,"left");
      }
    }catch(cErr){console.error("❌ Credit:",cErr.message);}

    // STEP 6 & 7: Confetti + Show share modal
    launchConfetti();
    setShareData({
      // Invoice data for share modal
      invoice_no:    form.invoiceNo,
      invoice_date:  form.invoiceDate,
      due_date:      form.dueDate||null,
      sender_name:   form.senderName,
      sender_upi:    form.senderUPI,
      client_name:   form.clientName,
      client_email:  form.clientEmail||null,
      client_phone:  form.clientPhone||null,
      service_desc:  form.serviceDesc,
      total_amount:  grand,
      gst_type:      gstType,
      notes:         form.notes||null,
    });
    window.scrollTo({top:0,behavior:"smooth"});
    setGen(false);
  }

  const stateOpts=STATES.map(s=>({value:s,label:s}));
  const sacOpts=SAC_CODES.map(s=>({value:s.code,label:`${s.label} (${s.code})`}));
  const gstOpts=[{value:"0",label:"0% — Exempt"},{value:"5",label:"5%"},{value:"12",label:"12%"},{value:"18",label:"18% — Most services"},{value:"28",label:"28%"}];

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder,textarea::placeholder{color:#334155!important;}
        @keyframes orbF{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes glow{0%,100%{box-shadow:0 0 40px rgba(14,165,233,0.25)}50%{box-shadow:0 0 80px rgba(14,165,233,0.5)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        .gen-btn{animation:glow 2.5s ease infinite;transition:transform 0.2s,filter 0.2s;}
        .gen-btn:hover{animation:none;transform:translateY(-3px);box-shadow:0 20px 60px rgba(14,165,233,0.4);filter:brightness(1.1);}
        .gen-btn:active{transform:scale(0.97);}.gen-btn:disabled{animation:none;filter:none;}
      `}</style>

      {/* Share Modal */}
      {shareData && (
        <ShareModal
          inv={shareData}
          type="invoice"
          onClose={() => setShareData(null)}
        />
      )}

      <Navbar totalAmount={gstPreview?fmt(gstPreview.total):null}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {orbs.map(o=>(<div key={o.id} style={{position:"absolute",left:`${o.x}%`,top:`${o.y}%`,width:o.size,height:o.size,borderRadius:"50%",background:"radial-gradient(circle,rgba(14,165,233,0.07) 0%,transparent 70%)",animation:`orbF ${o.dur}s ease-in-out ${o.delay}s infinite`,transform:"translate(-50%,-50%)"}}/>))}
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"32px 20px 60px",position:"relative",zIndex:1,display:"flex",flexDirection:"column",gap:16}}>

        <FadeUp delay={0}>
          <div style={{textAlign:"center"}}>
            <h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:900,color:"#fff",letterSpacing:-1.5,margin:"0 0 8px"}}>Create GST Invoice <span style={{display:"inline-block",animation:"pulse 2s ease infinite"}}>⚡</span></h1>
            <p style={{color:"#475569",fontSize:13,margin:0}}>Auto GST · UPI QR · Share via WhatsApp or Email · PDF in 60 seconds</p>
            <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginTop:10}}>
              {profileLoaded&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10B981",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:100}}><span style={{width:5,height:5,borderRadius:"50%",background:"#10B981"}}/>Profile auto-filled</div>}
              {clientLoaded&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.3)",color:"#38BDF8",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:100}}>👥 Client auto-filled</div>}
              {logoUrl&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#F59E0B",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:100}}>🖼 Logo included</div>}
            </div>
          </div>
        </FadeUp>

        {/* Credit bar */}
        {userCredits&&(
          <FadeUp delay={40}>
            <div style={{background:userCredits.plan==="pro"?"rgba(245,158,11,0.06)":userCredits.credits<=2?"rgba(239,68,68,0.06)":"rgba(14,165,233,0.06)",border:`1px solid ${userCredits.plan==="pro"?"rgba(245,158,11,0.2)":userCredits.credits<=2?"rgba(239,68,68,0.2)":"rgba(14,165,233,0.15)"}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{userCredits.plan==="pro"?"⭐":userCredits.credits<=2?"⚠️":"🪙"}</span>
                <p style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:0}}>{userCredits.plan==="pro"?"Pro — Unlimited invoices":`${userCredits.credits} credit${userCredits.credits!==1?"s":""} remaining`}{userCredits.is_early&&userCredits.plan!=="pro"&&<span style={{marginLeft:8,background:"rgba(245,158,11,0.15)",color:"#F59E0B",fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20}}>⚡ Early User</span>}</p>
              </div>
              <a href="/pricing" style={{background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:8,textDecoration:"none"}}>{userCredits.plan==="pro"?"View Plan":"Upgrade ↗"}</a>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={80}>
          <GlassCard accent="#0EA5E9">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <SectionTitle step="1" title="Your Details" accent="#0EA5E9"/>
              <a href="/profile" style={{color:"#38BDF8",fontSize:11,fontWeight:700,textDecoration:"none",padding:"6px 12px",borderRadius:8,border:"1px solid rgba(14,165,233,0.2)",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(14,165,233,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>✏️ Edit Profile</a>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"span 2"}}><GField label="Your Full Name / Business Name" name="senderName" required placeholder="e.g. Vamshi Kumar" value={form.senderName} onChange={update} error={errors.senderName}/></div>
              <GField label="Your GSTIN" name="senderGSTIN" placeholder="29ABCDE1234F1Z5" value={form.senderGSTIN} onChange={update} error={errors.senderGSTIN}/>
              <GField label="Your UPI ID *" name="senderUPI" placeholder="vamshi@upi" required value={form.senderUPI} onChange={update} error={errors.senderUPI}/>
              <GSelect label="Your State *" name="senderState" options={stateOpts} required placeholder="Select your state" value={form.senderState} onChange={update} error={errors.senderState}/>
              <div style={{background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.1)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"#64748B"}}>💡 UPI ID appears on the QR — clients scan and pay instantly</div>
              <div style={{gridColumn:"span 2"}}><GTextarea label="Your Address" name="senderAddress" placeholder="Flat 101, MG Road, Bengaluru — 560001" value={form.senderAddress} onChange={update}/></div>
            </div>
          </GlassCard>
        </FadeUp>

        <FadeUp delay={110}>
          <GlassCard accent="#F59E0B">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <SectionTitle step="2" title="Client Details" accent="#F59E0B"/>
              <a href="/clients" style={{color:"#F59E0B",fontSize:11,fontWeight:700,textDecoration:"none",padding:"6px 12px",borderRadius:8,border:"1px solid rgba(245,158,11,0.2)",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>👥 Address Book</a>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"span 2"}}><GField label="Client Name / Company *" name="clientName" required placeholder="e.g. Acme Technologies Pvt Ltd" value={form.clientName} onChange={update} error={errors.clientName}/></div>
              <GField label="Client GSTIN" name="clientGSTIN" placeholder="27ABCDE1234F1Z5" value={form.clientGSTIN} onChange={update} error={errors.clientGSTIN}/>
              <GSelect label="Client State *" name="clientState" options={stateOpts} required placeholder="Select client state" value={form.clientState} onChange={update} error={errors.clientState}/>
              {/* Phone + Email — used for WhatsApp and Email sharing */}
              <GField label="Client Phone" name="clientPhone" type="tel" placeholder="9876543210" value={form.clientPhone} onChange={update} hint="Used for WhatsApp sharing"/>
              <GField label="Client Email" name="clientEmail" type="email" placeholder="client@gmail.com" value={form.clientEmail} onChange={update} hint="Used for email sharing"/>
              <div style={{gridColumn:"span 2"}}><GTextarea label="Client Address" name="clientAddress" placeholder="Client office address" value={form.clientAddress} onChange={update}/></div>
            </div>
          </GlassCard>
        </FadeUp>

        <FadeUp delay={140}>
          <GlassCard accent="#10B981">
            <SectionTitle step="3" title="Invoice & Service" accent="#10B981"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <GField label="Invoice Number" name="invoiceNo" placeholder="INV-2501-001" value={form.invoiceNo} onChange={update}/>
              <GField label="Invoice Date *" name="invoiceDate" type="date" required value={form.invoiceDate} onChange={update}/>
              <GField label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={update}/>
              <GSelect label="SAC Code" name="sacCode" options={sacOpts} placeholder="Select service type" value={form.sacCode} onChange={update}/>
              <div style={{gridColumn:"span 2"}}><GTextarea label="Service Description *" name="serviceDesc" required placeholder="e.g. Website design — 5 pages, responsive, SEO optimised" value={form.serviceDesc} onChange={update} error={errors.serviceDesc}/></div>
              <GSelect label="GST Rate" name="gstRate" options={gstOpts} value={form.gstRate} onChange={update}/>
              <GField label="Amount Rs. (before GST) *" name="amount" type="number" required placeholder="e.g. 25000" value={form.amount} onChange={update} error={errors.amount}/>
              <div style={{gridColumn:"span 2"}}><GTextarea label="Notes / Payment Terms" name="notes" placeholder="e.g. Payment due within 15 days." value={form.notes} onChange={update}/></div>
            </div>
          </GlassCard>
        </FadeUp>

        {gstPreview&&(
          <FadeUp delay={0}>
            <div style={{background:gstPreview.intra?"rgba(16,185,129,0.06)":"rgba(14,165,233,0.06)",backdropFilter:"blur(20px)",border:`1px solid ${gstPreview.intra?"rgba(16,185,129,0.2)":"rgba(14,165,233,0.2)"}`,borderRadius:20,padding:24}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <span style={{background:gstPreview.intra?"rgba(16,185,129,0.2)":"rgba(14,165,233,0.2)",color:gstPreview.intra?"#10B981":"#0EA5E9",fontSize:11,fontWeight:700,padding:"5px 14px",borderRadius:100,border:`1px solid ${gstPreview.intra?"rgba(16,185,129,0.3)":"rgba(14,165,233,0.3)"}`}}>{gstPreview.intra?"INTRA-STATE — CGST + SGST":"INTER-STATE — IGST"}</span>
                <span style={{color:"#475569",fontSize:12,fontFamily:"monospace",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",padding:"4px 12px",borderRadius:8}}>{form.senderState} → {form.clientState}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
                {[{label:"Base Amount",value:form.amount,color:"#E2E8F0"},...(gstPreview.intra?[{label:`CGST ${parseFloat(form.gstRate)/2}%`,value:gstPreview.cgst,color:"#10B981"},{label:`SGST ${parseFloat(form.gstRate)/2}%`,value:gstPreview.sgst,color:"#10B981"}]:[{label:`IGST ${form.gstRate}%`,value:gstPreview.igst,color:"#0EA5E9"}])].map(s=>(
                  <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{s.label}</div>
                    <div style={{color:s.color,fontWeight:900,fontSize:17}}>₹ <AnimNumber value={s.value}/></div>
                  </div>
                ))}
                <div style={{background:gstPreview.intra?"linear-gradient(135deg,#059669,#10B981)":"linear-gradient(135deg,#0284C7,#0EA5E9)",borderRadius:12,padding:"12px 14px",textAlign:"center",boxShadow:gstPreview.intra?"0 0 24px rgba(16,185,129,0.3)":"0 0 24px rgba(14,165,233,0.3)"}}>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Total</div>
                  <div style={{color:"#fff",fontWeight:900,fontSize:20}}>₹ <AnimNumber value={gstPreview.total}/></div>
                </div>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={60}>
          <button onClick={generateInvoice} disabled={gen} className="gen-btn"
            style={{width:"100%",padding:"18px 32px",background:gen?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",border:"none",borderRadius:16,color:"#fff",fontWeight:900,fontSize:18,cursor:gen?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"inherit"}}>
            {gen?(<><svg style={{animation:"spin 0.8s linear infinite"}} width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Generating PDF...</>):(
              <><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Generate Invoice PDF + Share ⚡</>
            )}
          </button>
        </FadeUp>

        <p style={{textAlign:"center",color:"#1E293B",fontSize:11,paddingBottom:20}}>InstaBill India · Your data is private and secure</p>
      </div>
    </main>
  );
}
