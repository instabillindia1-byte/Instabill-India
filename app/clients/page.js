"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].sort();

function validateGSTIN(g){if(!g)return true;return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g.toUpperCase());}
function validatePhone(p){if(!p)return true;return /^[6-9]\d{9}$/.test(p.replace(/\s/g,""));}
function getInitial(name){return name?name.trim().charAt(0).toUpperCase():"?";}
function whatsappLink(phone,msg){const c=phone.replace(/\D/g,"");const n=c.startsWith("91")?c:"91"+c;return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;}

const AVATAR_COLORS = ["#0EA5E9","#7C3AED","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#84CC16"];
function avatarColor(name){return AVATAR_COLORS[(name||"?").charCodeAt(0)%AVATAR_COLORS.length];}

const EMPTY_FORM = {name:"",gstin:"",email:"",phone:"",state:"",address:""};

function GField({label,name,type="text",placeholder="",value,onChange,error,hint}){
  const[f,setF]=useState(false);
  const filled=value&&String(value).length>0;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:10,fontWeight:700,color:filled?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,transition:"color 0.2s",display:"flex",alignItems:"center",gap:6}}>
        {label}{filled&&<span style={{color:"#10B981",fontSize:12}}>✓</span>}
      </label>
      <input type={type} value={value} placeholder={placeholder} autoComplete="off"
        onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":filled?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:"#E2E8F0",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit",boxShadow:f?"0 0 0 3px rgba(14,165,233,0.1)":"none"}}
      />
      {error&&<p style={{color:"#EF4444",fontSize:11,margin:0,fontWeight:600}}>⚠ {error}</p>}
      {hint&&!error&&<p style={{color:"#475569",fontSize:11,margin:0}}>{hint}</p>}
    </div>
  );
}

function GSelect({label,name,value,onChange}){
  const[f,setF]=useState(false);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:10,fontWeight:700,color:value?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6}}>
        {label}{value&&<span style={{color:"#10B981",fontSize:12}}>✓</span>}
      </label>
      <select value={value} onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:value?"#E2E8F0":"#64748B",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit"}}>
        <option value="" style={{background:"#0F172A"}}>Select state...</option>
        {STATES.map(s=><option key={s} value={s} style={{background:"#0F172A"}}>{s}</option>)}
      </select>
    </div>
  );
}

function GTextarea({label,name,placeholder,value,onChange}){
  const[f,setF]=useState(false);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:10,fontWeight:700,color:value?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.5,display:"flex",alignItems:"center",gap:6}}>
        {label}{value&&<span style={{color:"#10B981",fontSize:12}}>✓</span>}
      </label>
      <textarea value={value} placeholder={placeholder} rows={2} onChange={e=>onChange(name,e.target.value)}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"11px 14px",color:"#E2E8F0",fontSize:13,outline:"none",resize:"none",transition:"all 0.2s",fontFamily:"inherit"}}
      />
    </div>
  );
}

export default function ClientsPage(){
  const[clients,  setClients]  = useState([]);
  const[loading,  setLoading]  = useState(true);
  const[search,   setSearch]   = useState("");
  const[showForm, setShowForm] = useState(false);
  const[editId,   setEditId]   = useState(null);
  const[form,     setForm]     = useState(EMPTY_FORM);
  const[errors,   setErrors]   = useState({});
  const[saving,   setSaving]   = useState(false);
  const[deleting, setDeleting] = useState(null);
  const[copied,   setCopied]   = useState(null);
  const supabase = createClient();
  const router   = useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      const{data}=await supabase.from("clients").select("*").eq("user_id",user.id).order("name");
      setClients(data||[]);
      setLoading(false);
    }
    load();
  },[]);

  function update(field,val){setForm(p=>({...p,[field]:val}));setErrors(p=>({...p,[field]:""}));}

  function validate(){
    const e={};
    if(!form.name.trim())                         e.name  ="Client name is required";
    if(form.gstin&&!validateGSTIN(form.gstin))    e.gstin ="Invalid GSTIN (15 chars)";
    if(form.phone&&!validatePhone(form.phone))     e.phone ="Invalid phone (10 digits starting with 6-9)";
    if(form.email&&!form.email.includes("@"))      e.email ="Invalid email address";
    return e;
  }

  async function saveClient(){
    const e=validate();if(Object.keys(e).length>0){setErrors(e);return;}
    setSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const record={
      user_id:user.id, name:form.name.trim(),
      gstin:form.gstin||null, email:form.email||null,
      phone:form.phone||null, state:form.state||null,
      address:form.address||null,
    };
    if(editId){
      const{error}=await supabase.from("clients").update(record).eq("id",editId).eq("user_id",user.id);
      if(!error) setClients(p=>p.map(c=>c.id===editId?{...c,...record,id:editId}:c));
      else alert("Could not update. Please try again.");
    }else{
      const{data,error}=await supabase.from("clients").insert(record).select().single();
      if(!error) setClients(p=>[...p,data].sort((a,b)=>a.name.localeCompare(b.name)));
      else alert("Could not save. Please try again.");
    }
    setShowForm(false);setEditId(null);setForm(EMPTY_FORM);setErrors({});
    setSaving(false);
  }

  async function deleteClient(id){
    if(!confirm("Delete this client? This cannot be undone."))return;
    setDeleting(id);
    const{data:{user}}=await supabase.auth.getUser();
    const{error}=await supabase.from("clients").delete().eq("id",id).eq("user_id",user.id);
    if(!error) setClients(p=>p.filter(c=>c.id!==id));
    else alert("Could not delete. Please try again.");
    setDeleting(null);
  }

  function openEdit(client){
    setForm({name:client.name||"",gstin:client.gstin||"",email:client.email||"",phone:client.phone||"",state:client.state||"",address:client.address||""});
    setEditId(client.id);setShowForm(true);setErrors({});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function openNew(){setForm(EMPTY_FORM);setEditId(null);setShowForm(true);setErrors({});window.scrollTo({top:0,behavior:"smooth"});}
  function cancel(){setShowForm(false);setEditId(null);setForm(EMPTY_FORM);setErrors({});}

  function useOnInvoice(client){
    // Store in sessionStorage so invoice page can pick it up
    sessionStorage.setItem("prefill_client", JSON.stringify({
      clientName:    client.name,
      clientGSTIN:   client.gstin||"",
      clientEmail:   client.email||"",
      clientState:   client.state||"",
      clientAddress: client.address||"",
    }));
    router.push("/invoice");
  }

  function copyEmail(email,id){
    navigator.clipboard.writeText(email);
    setCopied(id);setTimeout(()=>setCopied(null),2000);
  }

  const filtered = clients.filter(c=>{
    const s=search.toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || (c.email&&c.email.toLowerCase().includes(s)) || (c.phone&&c.phone.includes(s)) || (c.gstin&&c.gstin.toLowerCase().includes(s));
  });

  if(loading){
    return(
      <main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{textAlign:"center"}}>
          <div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
          <p style={{color:"#64748B",fontSize:13}}>Loading clients...</p>
        </div>
      </main>
    );
  }

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder,textarea::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes formIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        .client-card{animation:slideIn 0.3s ease forwards;transition:all 0.2s ease;}
        .client-card:hover{background:rgba(14,165,233,0.05)!important;border-color:rgba(14,165,233,0.2)!important;}
        .action-btn{transition:all 0.15s ease;cursor:pointer;}
        .action-btn:hover{transform:scale(1.05);}
        .action-btn:active{transform:scale(0.95);}
        .save-btn{transition:all 0.2s ease;}
        .save-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(14,165,233,0.4);}
        .save-btn:active{transform:scale(0.97);}
      `}</style>

      <Navbar/>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12,animation:"fadeUp 0.5s ease"}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Client Address Book</h1>
            <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>{clients.length} client{clients.length!==1?"s":""} saved</p>
          </div>
          <button onClick={openNew}
            style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s",fontFamily:"inherit"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(14,165,233,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(14,165,233,0.3)";}}>
            + Add Client
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm&&(
          <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:20,padding:24,marginBottom:20,animation:"formIn 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{color:"#E2E8F0",fontSize:16,fontWeight:700,margin:0}}>{editId?"Edit Client":"Add New Client"}</h2>
              <button onClick={cancel} style={{background:"none",border:"none",color:"#64748B",fontSize:20,cursor:"pointer",lineHeight:1,padding:4}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"span 2"}}>
                <GField label="Client Name / Company *" name="name" placeholder="e.g. Acme Technologies Pvt Ltd" value={form.name} onChange={update} error={errors.name}/>
              </div>
              <GField label="GSTIN (optional)" name="gstin" placeholder="27ABCDE1234F1Z5" value={form.gstin} onChange={update} error={errors.gstin}/>
              <GField label="Email" name="email" type="email" placeholder="client@gmail.com" value={form.email} onChange={update} error={errors.email}/>
              <GField label="Phone" name="phone" type="tel" placeholder="9876543210" value={form.phone} onChange={update} error={errors.phone} hint="10 digits starting with 6-9"/>
              <GSelect label="State" name="state" value={form.state} onChange={update}/>
              <div style={{gridColumn:"span 2"}}>
                <GTextarea label="Address (optional)" name="address" placeholder="Office address, city, pincode" value={form.address} onChange={update}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={saveClient} disabled={saving} className="save-btn"
                style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:saving?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                {saving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Saving...</>
                :(editId?"Save Changes":"Add Client")}
              </button>
              <button onClick={cancel} style={{padding:"13px 20px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748B",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {clients.length>0&&(
          <div style={{position:"relative",marginBottom:16,animation:"fadeUp 0.5s ease 0.1s both"}}>
            <svg style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#475569"}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, phone, GSTIN..."
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"11px 14px 11px 38px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",transition:"border 0.2s"}}
              onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
            {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#64748B",cursor:"pointer",fontSize:16,lineHeight:1}}>✕</button>}
          </div>
        )}

        {/* Client list */}
        {clients.length===0?(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:60,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:14}}>👥</div>
            <h2 style={{color:"#E2E8F0",fontSize:18,fontWeight:800,margin:"0 0 8px"}}>No clients yet</h2>
            <p style={{color:"#64748B",fontSize:13,marginBottom:20}}>Save client details once and auto-fill on every invoice</p>
            <button onClick={openNew} style={{display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              + Add First Client
            </button>
          </div>
        ):filtered.length===0?(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:32,textAlign:"center"}}>
            <p style={{color:"#64748B",fontSize:13,margin:"0 0 8px"}}>No clients match your search</p>
            <button onClick={()=>setSearch("")} style={{color:"#0EA5E9",fontSize:12,fontWeight:700,background:"none",border:"none",cursor:"pointer"}}>Clear search</button>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:12}}>
            {filtered.map((c,i)=>(
              <div key={c.id} className="client-card"
                style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"16px 18px",animationDelay:`${i*40}ms`}}>

                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  {/* Avatar */}
                  <div style={{width:44,height:44,borderRadius:12,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:18,flexShrink:0,boxShadow:`0 0 16px ${avatarColor(c.name)}44`}}>
                    {getInitial(c.name)}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{color:"#E2E8F0",fontWeight:800,fontSize:15,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {c.state&&<span style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#38BDF8",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{c.state}</span>}
                      {c.gstin&&<span style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",color:"#10B981",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>GST</span>}
                    </div>
                    {c.email&&(
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span style={{color:"#64748B",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.email}</span>
                        <button onClick={()=>copyEmail(c.email,c.id)} className="action-btn"
                          style={{background:"none",border:"none",color:copied===c.id?"#10B981":"#475569",fontSize:10,cursor:"pointer",padding:"2px 6px",borderRadius:6,background:copied===c.id?"rgba(16,185,129,0.1)":"transparent"}}>
                          {copied===c.id?"✓ Copied":"Copy"}
                        </button>
                      </div>
                    )}
                    {c.phone&&(
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.9a16 16 0 006.13 6.13l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                        <span style={{color:"#64748B",fontSize:12}}>{c.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:8,marginTop:14,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  {/* Use on invoice */}
                  <button onClick={()=>useOnInvoice(c)} className="action-btn"
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:10,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 10px rgba(14,165,233,0.3)"}}>
                    ⚡ Create Invoice
                  </button>

                  {/* WhatsApp */}
                  {c.phone&&(
                    <a href={whatsappLink(c.phone,`Hi ${c.name.split(" ")[0]}, please find your invoice attached.`)} target="_blank" rel="noopener noreferrer"
                      className="action-btn"
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.25)",color:"#25D366",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      WhatsApp
                    </a>
                  )}

                  {/* Edit */}
                  <button onClick={()=>openEdit(c)} className="action-btn"
                    style={{display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#E2E8F0",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    ✏️
                  </button>

                  {/* Delete */}
                  <button onClick={()=>deleteClient(c.id)} disabled={deleting===c.id} className="action-btn"
                    style={{display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",borderRadius:10,padding:"9px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                    {deleting===c.id?<svg style={{animation:"spin 0.8s linear infinite"}} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/></svg>:"🗑"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats bar at bottom */}
        {clients.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:20,animation:"fadeUp 0.5s ease 0.2s both"}}>
            {[
              {label:"Total Clients",  value:clients.length,                                            color:"#0EA5E9"},
              {label:"With Email",     value:clients.filter(c=>c.email).length,                         color:"#10B981"},
              {label:"With GST",       value:clients.filter(c=>c.gstin).length,                         color:"#F59E0B"},
            ].map(s=>(
              <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:"#475569",marginTop:4,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <p style={{textAlign:"center",color:"#1E293B",fontSize:11,paddingTop:24}}>
          InstaBill India · Client data is private and encrypted · Only you can see it
        </p>
      </div>
    </main>
  );
}
