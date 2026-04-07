"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"].sort();

function validateGSTIN(g){if(!g)return true;return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g.toUpperCase());}
function validateUPI(u){if(!u)return true;return /^[a-zA-Z0-9._\-]{2,}@[a-zA-Z]{2,}$/.test(u);}

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
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${error?"#EF4444":f?"rgba(14,165,233,0.7)":filled?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"12px 16px",color:"#E2E8F0",fontSize:14,outline:"none",transition:"all 0.2s",boxShadow:f?"0 0 0 3px rgba(14,165,233,0.12)":"none",fontFamily:"inherit"}}
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
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"12px 16px",color:value?"#E2E8F0":"#64748B",fontSize:14,outline:"none",transition:"all 0.2s",fontFamily:"inherit"}}>
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
      <textarea value={value} placeholder={placeholder} rows={3} onChange={e=>onChange(name,e.target.value)}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${f?"rgba(14,165,233,0.7)":value?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"12px 16px",color:"#E2E8F0",fontSize:14,outline:"none",resize:"none",transition:"all 0.2s",fontFamily:"inherit"}}
      />
    </div>
  );
}

export default function ProfilePage(){
  const[form,setForm]       = useState({fullName:"",gstin:"",upiId:"",address:"",state:""});
  const[errors,setErrors]   = useState({});
  const[loading,setLoading] = useState(true);
  const[saving,setSaving]   = useState(false);
  const[saved,setSaved]     = useState(false);
  const[user,setUser]       = useState(null);
  const[invoiceCount,setInvoiceCount] = useState(0);

  // Logo state
  const[logoUrl,    setLogoUrl]     = useState(null);
  const[logoFile,   setLogoFile]    = useState(null);
  const[logoPreview,setLogoPreview] = useState(null);
  const[uploadingLogo,setUploadingLogo] = useState(false);
  const[removingLogo, setRemovingLogo]  = useState(false);
  const logoInputRef = useRef(null);

  const supabase = createClient();
  const router   = useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user:u}}=await supabase.auth.getUser();
      if(!u){router.push("/login");return;}
      setUser(u);

      // Load profile
      const{data}=await supabase.from("profiles").select("*").eq("id",u.id).single();
      if(data) setForm({fullName:data.full_name||"",gstin:data.gstin||"",upiId:data.upi_id||"",address:data.address||"",state:data.state||""});

      // Load logo
      const{data:logoData}=await supabase.storage.from("logos").list(u.id);
      if(logoData && logoData.length > 0){
        const{data:{publicUrl}}=supabase.storage.from("logos").getPublicUrl(`${u.id}/logo`);
        setLogoUrl(publicUrl + "?t=" + Date.now()); // cache bust
      }

      // Invoice count
      const{count}=await supabase.from("invoices").select("*",{count:"exact",head:true}).eq("user_id",u.id);
      setInvoiceCount(count||0);
      setLoading(false);
    }
    load();
  },[]);

  function update(field,val){setForm(p=>({...p,[field]:val}));setErrors(p=>({...p,[field]:""}));setSaved(false);}

  function validate(){
    const e={};
    if(!form.fullName.trim()) e.fullName="Name is required";
    if(form.gstin&&!validateGSTIN(form.gstin)) e.gstin="Invalid GSTIN (15 characters)";
    if(form.upiId&&!validateUPI(form.upiId))   e.upiId="Invalid UPI ID (e.g. name@upi)";
    return e;
  }

  // ── Handle logo file selection ───────────────────────
  function handleLogoSelect(e){
    const file = e.target.files[0];
    if(!file) return;

    // Validate type
    const validTypes = ["image/png","image/jpeg","image/jpg","image/webp"];
    if(!validTypes.includes(file.type)){
      alert("Please upload a PNG, JPG or WebP image.");
      return;
    }
    // Validate size (max 2MB)
    if(file.size > 2*1024*1024){
      alert("Image too large! Please upload an image under 2MB.");
      return;
    }

    setLogoFile(file);
    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  // ── Upload logo to Supabase Storage ─────────────────
  async function uploadLogo(){
    if(!logoFile || !user) return;
    setUploadingLogo(true);
    try{
      const path = `${user.id}/logo`;
      const{ error } = await supabase.storage
        .from("logos")
        .upload(path, logoFile, {
          upsert: true, // overwrite if exists
          contentType: logoFile.type,
        });

      if(error){ alert("Upload failed: " + error.message); return; }

      const{data:{publicUrl}} = supabase.storage.from("logos").getPublicUrl(path);
      setLogoUrl(publicUrl + "?t=" + Date.now());
      setLogoFile(null);
      setLogoPreview(null);
      alert("✅ Logo uploaded! It will appear on your invoices.");
    }catch(err){
      alert("Something went wrong. Please try again.");
    }
    setUploadingLogo(false);
  }

  // ── Remove logo ──────────────────────────────────────
  async function removeLogo(){
    if(!confirm("Remove your logo from all invoices?")) return;
    setRemovingLogo(true);
    await supabase.storage.from("logos").remove([`${user.id}/logo`]);
    setLogoUrl(null);
    setLogoFile(null);
    setLogoPreview(null);
    setRemovingLogo(false);
    alert("Logo removed.");
  }

  // ── Save profile ─────────────────────────────────────
  async function saveProfile(){
    const e=validate();if(Object.keys(e).length>0){setErrors(e);return;}
    setSaving(true);
    const record={id:user.id,full_name:form.fullName||null,gstin:form.gstin||null,upi_id:form.upiId||null,address:form.address||null,state:form.state||null,updated_at:new Date().toISOString()};
    const{error}=await supabase.from("profiles").upsert(record,{onConflict:"id"});
    if(error){alert("Could not save. Please try again.");}
    else{setSaved(true);setTimeout(()=>setSaved(false),4000);}
    setSaving(false);
  }

  const fields=[form.fullName,form.gstin,form.upiId,form.address,form.state];
  const filled=fields.filter(f=>f&&String(f).trim()).length;
  const pct=Math.round((filled/fields.length)*100);

  if(loading){
    return(
      <main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{textAlign:"center"}}>
          <div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
          <p style={{color:"#64748B",fontSize:13}}>Loading your profile...</p>
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
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 40px rgba(14,165,233,0.25)}50%{box-shadow:0 0 70px rgba(14,165,233,0.45)}}
        @keyframes logoIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        .save-btn{animation:glow 2.5s ease infinite;transition:transform 0.2s,filter 0.2s;}
        .save-btn:hover{animation:none;transform:translateY(-2px);box-shadow:0 16px 40px rgba(14,165,233,0.4);filter:brightness(1.1);}
        .save-btn:active{transform:scale(0.97);}
        .save-btn:disabled{animation:none;filter:none;}
        .saved-anim{animation:bounce 0.45s ease forwards;}
        .logo-drop:hover{border-color:rgba(14,165,233,0.6)!important;background:rgba(14,165,233,0.08)!important;}
      `}</style>

      <Navbar/>

      <div style={{maxWidth:680,margin:"0 auto",padding:"28px 20px 60px",display:"flex",flexDirection:"column",gap:16}}>

        {/* Header */}
        <div style={{animation:"fadeUp 0.5s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
            <div>
              <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>My Profile</h1>
              <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>{user?.email}</p>
            </div>
            <div style={{textAlign:"center",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"12px 20px"}}>
              <div style={{fontSize:26,fontWeight:900,color:pct===100?"#10B981":"#0EA5E9"}}>{pct}%</div>
              <div style={{fontSize:11,color:"#64748B",fontWeight:600}}>Complete</div>
              <div style={{width:80,height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,marginTop:8,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#10B981":"linear-gradient(90deg,#0EA5E9,#38BDF8)",borderRadius:4,transition:"width 0.5s ease"}}/>
              </div>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[
              {label:"Invoices Created",value:invoiceCount,      color:"#0EA5E9",icon:"📄"},
              {label:"Profile Status",  value:pct===100?"Complete":"Incomplete",color:pct===100?"#10B981":"#F59E0B",icon:pct===100?"✅":"⚠️"},
              {label:"Logo",            value:logoUrl?"Uploaded":"Not set",color:logoUrl?"#10B981":"#64748B",icon:logoUrl?"🖼️":"📷"},
            ].map(s=>(
              <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:15,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:"#475569",marginTop:2,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LOGO UPLOAD SECTION ── */}
        <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:20,padding:24,animation:"fadeUp 0.5s ease 0.1s both"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#D97706)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:13,boxShadow:"0 0 14px rgba(245,158,11,0.5)"}}>🖼</div>
            <h2 style={{color:"#E2E8F0",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:2,margin:0}}>Business Logo</h2>
            <span style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>Pro Feature</span>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>

            {/* Left — current logo or placeholder */}
            <div>
              <p style={{color:"#64748B",fontSize:12,margin:"0 0 12px"}}>Your logo appears in the top-left of every PDF invoice you generate.</p>

              {/* Logo preview box */}
              <div style={{
                width:"100%",height:120,borderRadius:14,
                background:"rgba(255,255,255,0.03)",
                border:`2px dashed ${logoUrl||logoPreview?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.1)"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                overflow:"hidden",position:"relative",
                transition:"all 0.3s ease",
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview"
                    style={{maxWidth:"90%",maxHeight:"90%",objectFit:"contain",animation:"logoIn 0.3s ease"}}/>
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Your logo"
                    style={{maxWidth:"90%",maxHeight:"90%",objectFit:"contain"}}/>
                ) : (
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:32,marginBottom:6}}>🏢</div>
                    <p style={{color:"#334155",fontSize:12,margin:0}}>No logo uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — upload controls */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>

              {/* Drop zone */}
              <div className="logo-drop"
                onClick={()=>logoInputRef.current?.click()}
                style={{
                  border:"1px dashed rgba(14,165,233,0.3)",borderRadius:12,
                  padding:"16px",textAlign:"center",cursor:"pointer",
                  background:"rgba(14,165,233,0.03)",transition:"all 0.2s",
                }}>
                <div style={{fontSize:24,marginBottom:6}}>📁</div>
                <p style={{color:"#38BDF8",fontSize:12,fontWeight:700,margin:"0 0 3px"}}>Click to choose logo</p>
                <p style={{color:"#475569",fontSize:11,margin:0}}>PNG, JPG, WebP · Max 2MB</p>
                <p style={{color:"#334155",fontSize:10,margin:"4px 0 0"}}>Recommended: 200×80px transparent PNG</p>
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{display:"none"}} onChange={handleLogoSelect}/>

              {/* Upload button — shows when file selected */}
              {logoFile && (
                <button onClick={uploadLogo} disabled={uploadingLogo}
                  style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#10B981,#059669)",color:"#fff",fontWeight:700,fontSize:13,cursor:uploadingLogo?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",transition:"all 0.2s"}}>
                  {uploadingLogo
                    ?<><svg style={{animation:"spin 0.8s linear infinite"}} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Uploading...</>
                    :"⬆ Upload Logo"
                  }
                </button>
              )}

              {/* Remove button — shows when logo exists */}
              {logoUrl && !logoFile && (
                <button onClick={removeLogo} disabled={removingLogo}
                  style={{width:"100%",padding:"10px",borderRadius:10,border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)",color:"#EF4444",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}>
                  {removingLogo ? "Removing..." : "🗑 Remove Logo"}
                </button>
              )}

              {/* Cancel preview */}
              {logoFile && (
                <button onClick={()=>{setLogoFile(null);setLogoPreview(null);}}
                  style={{width:"100%",padding:"8px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#64748B",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  Cancel
                </button>
              )}

              {logoUrl && (
                <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#10B981",fontSize:16}}>✓</span>
                  <p style={{color:"#10B981",fontSize:11,fontWeight:600,margin:0}}>Logo active on all invoices</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div style={{background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:12,animation:"fadeUp 0.5s ease 0.15s both"}}>
          <span style={{fontSize:20,flexShrink:0}}>💡</span>
          <div>
            <p style={{color:"#38BDF8",fontWeight:700,fontSize:13,margin:"0 0 3px"}}>Save once, auto-fill forever</p>
            <p style={{color:"#64748B",fontSize:12,margin:0,lineHeight:1.6}}>Fill your details here and they auto-fill on every new invoice.</p>
          </div>
        </div>

        {/* Profile form */}
        <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(14,165,233,0.15)",borderRadius:20,padding:24,animation:"fadeUp 0.5s ease 0.2s both"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,paddingBottom:20,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:22,fontWeight:900,flexShrink:0,boxShadow:"0 0 24px rgba(14,165,233,0.4)"}}>
              {form.fullName?form.fullName.charAt(0).toUpperCase():user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{color:"#E2E8F0",fontWeight:800,fontSize:16,margin:"0 0 3px"}}>{form.fullName||"Your Name"}</p>
              <p style={{color:"#475569",fontSize:12,margin:0}}>{user?.email}</p>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{gridColumn:"span 2"}}>
              <GField label="Full Name / Business Name" name="fullName" required
                placeholder="e.g. Vamshi Kumar or Vamshi Designs"
                value={form.fullName} onChange={update} error={errors.fullName}
                hint="Appears as sender name on all invoices"/>
            </div>
            <GField label="Your GSTIN (optional)" name="gstin" placeholder="29ABCDE1234F1Z5"
              value={form.gstin} onChange={update} error={errors.gstin} hint="15-character GST number"/>
            <GField label="Your UPI ID" name="upiId" placeholder="vamshi@upi"
              value={form.upiId} onChange={update} error={errors.upiId} hint="Used for UPI QR on invoices"/>
            <GSelect label="Your State" name="state" value={form.state} onChange={update}/>
            <div style={{background:"rgba(14,165,233,0.05)",border:"1px solid rgba(14,165,233,0.1)",borderRadius:12,padding:"12px 14px",fontSize:12,color:"#64748B"}}>
              📍 Your state determines CGST+SGST or IGST on invoices.
            </div>
            <div style={{gridColumn:"span 2"}}>
              <GTextarea label="Business Address (optional)" name="address"
                placeholder="Flat 101, MG Road, Bengaluru — 560001" value={form.address} onChange={update}/>
            </div>
          </div>
        </div>

        {/* Auto-fill status */}
        <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:16,padding:18,animation:"fadeUp 0.5s ease 0.25s both"}}>
          <h3 style={{color:"#10B981",fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,margin:"0 0 12px",display:"flex",alignItems:"center",gap:8}}>
            <span>✓</span> Auto-filled on every new invoice
          </h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
            {[
              {icon:"👤",label:"Your name",   filled:!!form.fullName},
              {icon:"🏦",label:"GSTIN",       filled:!!form.gstin},
              {icon:"📲",label:"UPI ID",      filled:!!form.upiId},
              {icon:"📍",label:"Your state",  filled:!!form.state},
              {icon:"🏠",label:"Address",     filled:!!form.address},
              {icon:"🖼️",label:"Logo",        filled:!!logoUrl},
            ].map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:item.filled?"rgba(16,185,129,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${item.filled?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.06)"}`,fontSize:12,fontWeight:600,color:item.filled?"#10B981":"#475569",transition:"all 0.2s"}}>
                <span>{item.icon}</span><span>{item.label}</span>
                {item.filled&&<span style={{marginLeft:"auto"}}>✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={saveProfile} disabled={saving} className={saving?"":"save-btn"}
          style={{width:"100%",padding:"18px 32px",background:saving?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",border:"none",borderRadius:16,color:"#fff",fontWeight:900,fontSize:18,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"inherit"}}>
          {saving?(
            <><svg style={{animation:"spin 0.9s linear infinite"}} width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.2"/>
              <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>Saving...</>
          ):(
            <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>Save Profile</>
          )}
        </button>

        {/* Success */}
        {saved&&(
          <div className="saved-anim" style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:20,padding:28,textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:10}}>🎉</div>
            <p style={{color:"#10B981",fontWeight:900,fontSize:18,margin:"0 0 6px"}}>Profile Saved!</p>
            <p style={{color:"#64748B",fontSize:13,margin:"0 0 16px"}}>Your details will auto-fill on every new invoice</p>
            <a href="/invoice" style={{color:"#0EA5E9",fontSize:13,fontWeight:700,textDecoration:"none"}}>
              ⚡ Create an invoice now →
            </a>
          </div>
        )}

        <p style={{textAlign:"center",color:"#1E293B",fontSize:11,paddingBottom:8}}>
          InstaBill India · Your profile is private and encrypted · Only you can see it
        </p>
      </div>
    </main>
  );
}
