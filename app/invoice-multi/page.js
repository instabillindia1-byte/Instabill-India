"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient }      from "../../supabase/client";
import { useRouter }          from "next/navigation";
import Navbar                 from "../../components/Navbar";
import { loadCredits, canCreateInvoice } from "../../lib/credits";
import { generateInvoicePDF } from "../../lib/pdfGenerator";

// ── HELPERS ───────────────────────────────────────────
function validateGSTIN(g){if(!g)return true;return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g.toUpperCase());}
function validateUPI(u){return /^[a-zA-Z0-9._\-]{2,}@[a-zA-Z]{2,}$/.test(u);}
function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function genNo(){const d=new Date();return `INV-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;}

const STATES=["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].sort();

function calcItem(qty,rate,gst){const base=parseFloat(qty||0)*parseFloat(rate||0);const g=parseFloat(((base*parseFloat(gst||0))/100).toFixed(2));return{base:parseFloat(base.toFixed(2)),gst:g,total:parseFloat((base+g).toFixed(2))};}
function calcTotals(items,ss,cs){const intra=ss===cs;let sub=0,gstT=0,cgst=0,sgst=0,igst=0;items.forEach(it=>{if(!it.desc?.trim()||!parseFloat(it.rate))return;const c=calcItem(it.qty,it.rate,it.gst);sub+=c.base;gstT+=c.gst;if(intra){cgst+=c.gst/2;sgst+=c.gst/2;}else igst+=c.gst;});return{sub:parseFloat(sub.toFixed(2)),gstT:parseFloat(gstT.toFixed(2)),cgst:parseFloat(cgst.toFixed(2)),sgst:parseFloat(sgst.toFixed(2)),igst:parseFloat(igst.toFixed(2)),grand:parseFloat((sub+gstT).toFixed(2)),intra};}

function launchConfetti(){const colors=["#0EA5E9","#38BDF8","#F59E0B","#10B981","#fff","#7C3AED"];const c=document.createElement("div");c.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;";document.body.appendChild(c);for(let i=0;i<80;i++){const el=document.createElement("div");const color=colors[Math.floor(Math.random()*colors.length)];const sz=Math.random()*8+4,x=Math.random()*100,dl=Math.random()*0.5,dr=Math.random()*2+2;el.style.cssText=`position:absolute;left:${x}%;top:-10px;width:${sz}px;height:${sz}px;background:${color};border-radius:${Math.random()>.5?"50%":"2px"};animation:cFall ${dr}s ease-in ${dl}s forwards;`;c.appendChild(el);}const s=document.createElement("style");s.textContent=`@keyframes cFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(720deg);opacity:0}}`;document.head.appendChild(s);setTimeout(()=>{c.remove();s.remove();},4000);}

function newItem(){return{desc:"",qty:"1",rate:"",gst:"18"};}

function Field({label,value,onChange,placeholder,type="text",required,error,style={}}){const[f,setF]=useState(false);const filled=value&&String(value).length>0;return(<div style={{display:"flex",flexDirection:"column",gap:5,...style}}><label style={{fontSize:10,fontWeight:700,color:filled?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"flex",alignItems:"center",gap:4}}>{label}{required&&<span style={{color:"#F59E0B"}}>*</span>}{filled&&<span style={{color:"#10B981"}}>✓</span>}</label><input type={type} value={value} placeholder={placeholder} autoComplete="off" onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":filled?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit",width:"100%"}}/>{error&&<p style={{color:"#EF4444",fontSize:11,margin:0}}>⚠ {error}</p>}</div>);}

function StateSelect({label,value,onChange,required,error}){const[f,setF]=useState(false);return(<div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:10,fontWeight:700,color:value?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"flex",alignItems:"center",gap:4}}>{label}{required&&<span style={{color:"#F59E0B"}}>*</span>}{value&&<span style={{color:"#10B981"}}>✓</span>}</label><select value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"10px 12px",color:value?"#E2E8F0":"#64748B",fontSize:13,outline:"none",fontFamily:"inherit",width:"100%"}}><option value="" style={{background:"#0F172A"}}>Select state...</option>{STATES.map(s=><option key={s} value={s} style={{background:"#0F172A"}}>{s}</option>)}</select>{error&&<p style={{color:"#EF4444",fontSize:11,margin:0}}>⚠ {error}</p>}</div>);}

function ItemRow({index,item,onUpdate,onRemove,canRemove}){const c=item.desc&&item.rate?calcItem(item.qty,item.rate,item.gst):null;return(<div style={{display:"grid",gridTemplateColumns:"1fr 70px 100px 76px 88px 30px",gap:7,alignItems:"center",background:index%2===0?"rgba(255,255,255,0.02)":"rgba(14,165,233,0.02)",borderRadius:10,padding:"9px",border:"1px solid rgba(255,255,255,0.06)",marginBottom:5}}><input value={item.desc} onChange={e=>onUpdate(index,"desc",e.target.value)} placeholder={`Item ${index+1}`} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"#E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",width:"100%",transition:"border 0.2s"}} onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.6)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/><input type="number" value={item.qty} onChange={e=>onUpdate(index,"qty",e.target.value)} min="0.01" step="0.01" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px",color:"#E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"center",width:"100%"}} onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.6)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/><input type="number" value={item.rate} onChange={e=>onUpdate(index,"rate",e.target.value)} placeholder="0.00" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px",color:"#E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",width:"100%"}} onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.6)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/><select value={item.gst} onChange={e=>onUpdate(index,"gst",e.target.value)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 4px",color:"#E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit",width:"100%"}}>{["0","5","12","18","28"].map(r=><option key={r} value={r} style={{background:"#0F172A"}}>{r}%</option>)}</select><div style={{textAlign:"right",fontSize:12,fontWeight:700,color:c?"#0EA5E9":"#334155"}}>{c?`₹${fmt(c.total)}`:"—"}</div><button onClick={()=>onRemove(index)} disabled={!canRemove} style={{background:canRemove?"rgba(239,68,68,0.1)":"transparent",border:"none",borderRadius:6,color:canRemove?"#EF4444":"#1E293B",cursor:canRemove?"pointer":"default",fontSize:15,padding:"4px",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",transition:"all 0.15s"}} onMouseEnter={e=>{if(canRemove)e.currentTarget.style.background="rgba(239,68,68,0.2)";}} onMouseLeave={e=>{if(canRemove)e.currentTarget.style.background="rgba(239,68,68,0.1)";}}>✕</button></div>);}

export default function MultiInvoicePage(){
  const[senderName,setSenderName]=useState("");const[senderGSTIN,setSenderGSTIN]=useState("");
  const[senderAddress,setSenderAddress]=useState("");const[senderState,setSenderState]=useState("");
  const[senderUPI,setSenderUPI]=useState("");const[clientName,setClientName]=useState("");
  const[clientGSTIN,setClientGSTIN]=useState("");const[clientAddress,setClientAddress]=useState("");
  const[clientState,setClientState]=useState("");const[clientEmail,setClientEmail]=useState("");
  const[invoiceNo,setInvoiceNo]=useState("");const[invoiceDate,setInvoiceDate]=useState("");
  const[dueDate,setDueDate]=useState("");const[notes,setNotes]=useState("");
  const[items,setItems]=useState([newItem(),newItem()]);
  const[errors,setErrors]=useState({});const[gen,setGen]=useState(false);
  const[success,setSuccess]=useState(false);const[successData,setSuccessData]=useState(null);
  const[userCredits,setUserCredits]=useState(null);const[logoUrl,setLogoUrl]=useState(null);
  const[currentUser,setCurrentUser]=useState(null);
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    setInvoiceNo(genNo());setInvoiceDate(new Date().toISOString().split("T")[0]);
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      setCurrentUser(user);
      const{data:p}=await supabase.from("profiles").select("*").eq("id",user.id).single();
      if(p){if(p.full_name)setSenderName(p.full_name);if(p.gstin)setSenderGSTIN(p.gstin);if(p.upi_id)setSenderUPI(p.upi_id);if(p.address)setSenderAddress(p.address);if(p.state)setSenderState(p.state);}
      try{const raw=sessionStorage.getItem("prefill_client");if(raw){const cd=JSON.parse(raw);if(cd.clientName)setClientName(cd.clientName);if(cd.clientGSTIN)setClientGSTIN(cd.clientGSTIN);if(cd.clientEmail)setClientEmail(cd.clientEmail);if(cd.clientState)setClientState(cd.clientState);if(cd.clientAddress)setClientAddress(cd.clientAddress);sessionStorage.removeItem("prefill_client");}}catch{sessionStorage.removeItem("prefill_client");}
      const credits=await loadCredits(supabase,user.id);setUserCredits(credits);
      try{const{data:lf}=await supabase.storage.from("logos").list(user.id);if(lf&&lf.length>0){const{data:{publicUrl}}=supabase.storage.from("logos").getPublicUrl(`${user.id}/logo`);setLogoUrl(publicUrl+"?t="+Date.now());}}catch{}
    }
    load();
  },[]);

  const updateItem=useCallback((index,field,value)=>{setItems(prev=>prev.map((item,i)=>i===index?{...item,[field]:value}:item));},[]);
  const addItem=useCallback(()=>{setItems(prev=>[...prev,newItem()]);},[]);
  const removeItem=useCallback((index)=>{setItems(prev=>prev.length>1?prev.filter((_,i)=>i!==index):prev);},[]);

  const validItems=items.filter(it=>it.desc?.trim()&&parseFloat(it.rate)>0);
  const totals=senderState&&clientState&&validItems.length>0?calcTotals(validItems,senderState,clientState):null;

  function validate(){
    const e={};
    if(!senderName.trim())e.senderName="Required";
    if(!senderState)e.senderState="Required";
    if(!senderUPI.trim())e.senderUPI="Required";
    else if(!validateUPI(senderUPI.trim()))e.senderUPI="Invalid UPI ID";
    if(senderGSTIN&&!validateGSTIN(senderGSTIN))e.senderGSTIN="Invalid GSTIN";
    if(!clientName.trim())e.clientName="Required";
    if(!clientState)e.clientState="Required";
    if(clientGSTIN&&!validateGSTIN(clientGSTIN))e.clientGSTIN="Invalid GSTIN";
    if(validItems.length===0)e.items="Add at least one item with description and rate";
    return e;
  }

  async function generateInvoice(){
    if(userCredits){const check=canCreateInvoice(userCredits.credits,userCredits.plan);if(!check.allowed){if(confirm("No credits left! Upgrade to continue."))window.location.href="/pricing";return;}}
    const e=validate();if(Object.keys(e).length>0){setErrors(e);window.scrollTo({top:0,behavior:"smooth"});return;}
    setErrors({});setGen(true);
    const user=currentUser;
    if(!user){alert("Session expired. Please refresh.");setGen(false);return;}

    // STEP 3: PDF
    let pdfResult=null;
    try{
      pdfResult=await generateInvoicePDF({
        senderName,senderGSTIN,senderAddress,senderState,senderUPI,
        clientName,clientGSTIN,clientAddress,clientState,clientEmail,
        invoiceNo,invoiceDate,dueDate:dueDate||null,
        items:validItems.map(i=>({description:i.desc,sacCode:"",qty:parseFloat(i.qty)||1,rate:parseFloat(i.rate)||0,gstRate:parseFloat(i.gst)||18})),
        notes,logoUrl,
      });
    }catch(pdfErr){console.error("PDF error:",pdfErr);alert("PDF generation failed. Check all fields.");setGen(false);return;}

    const{grand,intra,cgst,sgst,igst,sub}=pdfResult;
    const gstType=intra?"intra":"inter";

    // STEP 4: Save invoice + items
    try{
      const{data:savedInv,error:invErr}=await supabase.from("invoices").insert({
        user_id:user.id,invoice_no:invoiceNo,invoice_date:invoiceDate,due_date:dueDate||null,
        sender_name:senderName,sender_gstin:senderGSTIN||null,sender_state:senderState,
        sender_upi:senderUPI,sender_address:senderAddress||null,client_name:clientName,
        client_gstin:clientGSTIN||null,client_state:clientState,client_address:clientAddress||null,
        client_email:clientEmail||null,service_desc:validItems.map(i=>i.desc).join(", ").substring(0,200),
        amount:sub,gst_rate:0,gst_type:gstType,total_amount:grand,notes:notes||null,status:"pending",
      }).select().single();
      if(invErr)console.error("❌ Invoice save:",invErr.message);
      else if(savedInv){
        await supabase.from("invoice_items").insert(validItems.map(it=>({invoice_id:savedInv.id,user_id:user.id,description:it.desc,quantity:parseFloat(it.qty)||1,rate:parseFloat(it.rate)||0,gst_rate:parseFloat(it.gst)||18,amount:calcItem(it.qty,it.rate,it.gst).total})));
        console.log("✅ Invoice+items saved:",savedInv.invoice_no);
      }
    }catch(dbErr){console.error("❌ DB:",dbErr.message);}

    // STEP 5: Credit deduction
    try{
      if(userCredits&&userCredits.plan!=="pro"){
        const nc=Math.max(0,userCredits.credits-1),ntu=(userCredits.total_used||0)+1;
        const{error:cErr}=await supabase.from("user_credits").update({credits:nc,total_used:ntu,updated_at:new Date().toISOString()}).eq("id",user.id);
        if(!cErr){setUserCredits(prev=>({...prev,credits:nc,total_used:ntu}));console.log("✅ Credit deducted:",nc,"remaining");}
        else console.error("❌ Credit:",cErr.message);
      }
    }catch(cErr){console.error("❌ Credit error:",cErr.message);}

    // STEP 6: Email with auth token
    if(clientEmail&&clientEmail.includes("@")){
      try{
        const{data:{session}}=await supabase.auth.getSession();
        const emailRes=await fetch("/api/send-email",{
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":`Bearer ${session?.access_token||""}`},
          body:JSON.stringify({type:"pending",invoice:{
            client_email:clientEmail,sender_name:senderName,sender_upi:senderUPI,
            sender_state:senderState,client_name:clientName,client_state:clientState,
            invoice_no:invoiceNo,invoice_date:invoiceDate,due_date:dueDate||null,
            service_desc:validItems.map(i=>i.desc).join(", "),
            total_amount:grand,gst_rate:0,gst_type:gstType,notes:notes||null,
          }}),
        });
        const ej=await emailRes.json();
        if(ej.success)console.log("✅ Email sent to:",clientEmail);
        else console.error("❌ Email:",ej.error);
      }catch(emailErr){console.error("❌ Email error:",emailErr.message);}
    }

    // STEP 7: Success
    launchConfetti();
    setSuccessData({grand,cgst,sgst,igst,intra,itemCount:validItems.length});
    setSuccess(true);
    window.scrollTo({top:0,behavior:"smooth"});
    setGen(false);
  }

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 40px rgba(14,165,233,0.25)}50%{box-shadow:0 0 70px rgba(14,165,233,0.5)}}
        @keyframes bounce{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        .gen-btn{animation:glow 2.5s ease infinite;transition:transform 0.2s;}
        .gen-btn:hover{animation:none;transform:translateY(-3px);box-shadow:0 20px 60px rgba(14,165,233,0.4);}
        .gen-btn:disabled{animation:none;}
        .card{background:rgba(255,255,255,0.03);backdrop-filter:blur(20px);border-radius:16px;padding:20px;transition:border-color 0.3s;}
      `}</style>
      <Navbar/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px 60px",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:28,fontWeight:900,color:"#fff",margin:"0 0 6px",letterSpacing:-1}}>Multi-Item Invoice 🧾</h1>
          <p style={{color:"#475569",fontSize:13,margin:0}}>Bill multiple services or products in one invoice</p>
          <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10,flexWrap:"wrap"}}>
            <a href="/invoice" style={{color:"#64748B",fontSize:11,fontWeight:600,textDecoration:"none",padding:"4px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)"}}>← Single Item</a>
            <a href="/clients" style={{color:"#F59E0B",fontSize:11,fontWeight:600,textDecoration:"none",padding:"4px 12px",borderRadius:20,border:"1px solid rgba(245,158,11,0.2)"}}>👥 Address Book</a>
          </div>
        </div>
        {userCredits&&(<div style={{background:userCredits.plan==="pro"?"rgba(245,158,11,0.06)":userCredits.credits<=2?"rgba(239,68,68,0.06)":"rgba(14,165,233,0.06)",border:`1px solid ${userCredits.plan==="pro"?"rgba(245,158,11,0.2)":userCredits.credits<=2?"rgba(239,68,68,0.2)":"rgba(14,165,233,0.15)"}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><p style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:0}}>{userCredits.plan==="pro"?"⭐ Unlimited invoices":`🪙 ${userCredits.credits} credits remaining`}</p><a href="/pricing" style={{background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:7,textDecoration:"none"}}>{userCredits.plan==="pro"?"View Plan":"Upgrade ↗"}</a></div>)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card" style={{border:"1px solid rgba(14,165,233,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#0EA5E9,#0284C7)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11}}>1</div><span style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Your Details</span></div>
              <a href="/profile" style={{color:"#38BDF8",fontSize:10,fontWeight:700,textDecoration:"none"}}>✏️ Edit</a>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Field label="Name *" value={senderName} onChange={setSenderName} placeholder="Vamshi Kumar" required error={errors.senderName}/>
              <Field label="GSTIN" value={senderGSTIN} onChange={setSenderGSTIN} placeholder="29ABCDE1234F1Z5" error={errors.senderGSTIN}/>
              <Field label="UPI ID *" value={senderUPI} onChange={setSenderUPI} placeholder="vamshi@upi" required error={errors.senderUPI}/>
              <StateSelect label="State *" value={senderState} onChange={setSenderState} required error={errors.senderState}/>
            </div>
          </div>
          <div className="card" style={{border:"1px solid rgba(245,158,11,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#D97706)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11}}>2</div><span style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Client Details</span></div>
              <a href="/clients" style={{color:"#F59E0B",fontSize:10,fontWeight:700,textDecoration:"none"}}>👥 Book</a>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Field label="Client Name *" value={clientName} onChange={setClientName} placeholder="Acme Technologies" required error={errors.clientName}/>
              <Field label="GSTIN" value={clientGSTIN} onChange={setClientGSTIN} placeholder="27ABCDE1234F1Z5" error={errors.clientGSTIN}/>
              <Field label="Email" value={clientEmail} onChange={setClientEmail} placeholder="client@gmail.com" type="email"/>
              <StateSelect label="State *" value={clientState} onChange={setClientState} required error={errors.clientState}/>
            </div>
          </div>
        </div>
        <div className="card" style={{border:"1px solid rgba(16,185,129,0.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#10B981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11}}>3</div><span style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Invoice Details</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Field label="Invoice No" value={invoiceNo} onChange={setInvoiceNo} placeholder="INV-2501-001"/>
            <Field label="Date *" value={invoiceDate} onChange={setInvoiceDate} type="date" required/>
            <Field label="Due Date" value={dueDate} onChange={setDueDate} type="date"/>
          </div>
          <div style={{marginTop:10}}><Field label="Notes / Terms" value={notes} onChange={setNotes} placeholder="Payment due within 15 days..."/></div>
        </div>
        <div className="card" style={{border:"1px solid rgba(124,58,237,0.25)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11}}>4</div><span style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2}}>Items ({items.length})</span></div>
            <button onClick={addItem} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",color:"#A78BFA",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,0.25)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(124,58,237,0.15)"}>+ Add Item</button>
          </div>
          {errors.items&&<p style={{color:"#EF4444",fontSize:12,marginBottom:10}}>⚠ {errors.items}</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 70px 100px 76px 88px 30px",gap:7,marginBottom:6,padding:"0 5px"}}>
            {["Description *","Qty","Rate ₹ *","GST%","Total",""].map(h=>(<div key={h} style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{h}</div>))}
          </div>
          {items.map((item,index)=>(<ItemRow key={index} index={index} item={item} onUpdate={updateItem} onRemove={removeItem} canRemove={items.length>1}/>))}
          {totals&&(
            <div style={{marginTop:12,background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:12,padding:"14px 16px"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Subtotal</div><div style={{fontSize:18,fontWeight:900,color:"#E2E8F0"}}>₹{fmt(totals.sub)}</div></div>
                {totals.intra?<><div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>CGST</div><div style={{fontSize:18,fontWeight:900,color:"#10B981"}}>₹{fmt(totals.cgst)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>SGST</div><div style={{fontSize:18,fontWeight:900,color:"#10B981"}}>₹{fmt(totals.sgst)}</div></div></>:<div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#64748B",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>IGST</div><div style={{fontSize:18,fontWeight:900,color:"#0EA5E9"}}>₹{fmt(totals.igst)}</div></div>}
                <div style={{textAlign:"center",background:"linear-gradient(135deg,#0284C7,#0EA5E9)",borderRadius:10,padding:"10px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>TOTAL</div><div style={{fontSize:22,fontWeight:900,color:"#fff"}}>₹{fmt(totals.grand)}</div></div>
              </div>
            </div>
          )}
        </div>
        <button onClick={generateInvoice} disabled={gen} className="gen-btn" style={{width:"100%",padding:"18px",background:gen?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",border:"none",borderRadius:16,color:"#fff",fontWeight:900,fontSize:18,cursor:gen?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"inherit"}}>
          {gen?(<><svg style={{animation:"spin 0.8s linear infinite"}} width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Generating...</>):(<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Generate Multi-Item Invoice PDF ⚡</>)}
        </button>
        {success&&successData&&(<div style={{animation:"bounce 0.5s ease forwards",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:20,padding:28,textAlign:"center"}}><div style={{fontSize:48,marginBottom:10}}>🎉</div><p style={{color:"#10B981",fontWeight:900,fontSize:20,margin:"0 0 6px"}}>Invoice Generated!</p><p style={{color:"#64748B",fontSize:13,margin:"0 0 16px"}}>{successData.itemCount} items · ₹{fmt(successData.grand)}{clientEmail?` · Emailed to ${clientEmail}`:""}</p><div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}><a href="/history" style={{color:"#0EA5E9",fontSize:13,fontWeight:700,textDecoration:"none"}}>History →</a><a href="/dashboard" style={{color:"#0EA5E9",fontSize:13,fontWeight:700,textDecoration:"none"}}>Dashboard →</a><a href={`https://wa.me/?text=${encodeURIComponent(`Hi ${clientName}, invoice ${invoiceNo} ready. Total: Rs.${fmt(successData.grand)}. Pay via UPI: ${senderUPI}`)}`} target="_blank" rel="noopener noreferrer" style={{color:"#25D366",fontSize:13,fontWeight:700,textDecoration:"none"}}>💬 WhatsApp →</a></div></div>)}
      </div>
    </main>
  );
}
