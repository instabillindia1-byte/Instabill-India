"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

const CATEGORIES=["Office Supplies","Travel","Software / Tools","Marketing","Rent","Utilities","Food & Entertainment","Professional Services","Equipment","Other"];
const EMPTY={date:new Date().toISOString().split("T")[0],category:"",description:"",amount:"",gst_paid:"0",vendor_name:""};
function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtS(n){n=parseFloat(n||0);if(n>=100000)return "₹"+(n/100000).toFixed(1)+"L";if(n>=1000)return "₹"+(n/1000).toFixed(1)+"K";return "₹"+Math.round(n);}

const CAT_ICONS={"Office Supplies":"🖊️","Travel":"✈️","Software / Tools":"💻","Marketing":"📣","Rent":"🏢","Utilities":"⚡","Food & Entertainment":"🍽️","Professional Services":"👔","Equipment":"🔧","Other":"📌"};

export default function ExpensesPage(){
  const[expenses, setExpenses]=useState([]);
  const[loading,  setLoading] =useState(true);
  const[showForm, setShowForm]=useState(false);
  const[editId,   setEditId]  =useState(null);
  const[form,     setForm]    =useState(EMPTY);
  const[saving,   setSaving]  =useState(false);
  const[deleting, setDeleting]=useState(null);
  const[search,   setSearch]  =useState("");
  const[filterCat,setFilterCat]=useState("");
  const[month,    setMonth]   =useState(new Date().toISOString().slice(0,7));
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      const{data}=await supabase.from("expenses").select("*").eq("user_id",user.id).order("date",{ascending:false});
      setExpenses(data||[]);setLoading(false);
    }
    load();
  },[]);

  function update(field,val){setForm(p=>({...p,[field]:val}));}

  async function saveExpense(){
    if(!form.category||!form.amount||parseFloat(form.amount)<=0){alert("Category and amount are required.");return;}
    setSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const record={user_id:user.id,date:form.date,category:form.category,description:form.description||null,amount:parseFloat(form.amount),gst_paid:parseFloat(form.gst_paid)||0,vendor_name:form.vendor_name||null};
    if(editId){
      const{error}=await supabase.from("expenses").update(record).eq("id",editId).eq("user_id",user.id);
      if(!error)setExpenses(p=>p.map(x=>x.id===editId?{...x,...record,id:editId}:x));
      else alert("Could not update.");
    }else{
      const{data,error}=await supabase.from("expenses").insert(record).select().single();
      if(!error)setExpenses(p=>[data,...p]);
      else alert("Could not save.");
    }
    setShowForm(false);setEditId(null);setForm(EMPTY);setSaving(false);
  }

  async function deleteExpense(id){
    if(!confirm("Delete this expense?"))return;
    setDeleting(id);
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from("expenses").delete().eq("id",id).eq("user_id",user.id);
    setExpenses(p=>p.filter(x=>x.id!==id));setDeleting(null);
  }

  function openEdit(exp){setForm({date:exp.date||"",category:exp.category||"",description:exp.description||"",amount:String(exp.amount||""),gst_paid:String(exp.gst_paid||"0"),vendor_name:exp.vendor_name||""});setEditId(exp.id);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}

  const monthlyExp=expenses.filter(e=>e.date&&e.date.startsWith(month));
  const filtered=monthlyExp
    .filter(e=>!filterCat||e.category===filterCat)
    .filter(e=>!search||e.description?.toLowerCase().includes(search.toLowerCase())||e.vendor_name?.toLowerCase().includes(search.toLowerCase())||e.category.toLowerCase().includes(search.toLowerCase()));

  const totalAmt    =monthlyExp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const totalGST    =monthlyExp.reduce((s,e)=>s+parseFloat(e.gst_paid||0),0);
  const catTotals   =CATEGORIES.map(c=>({cat:c,total:monthlyExp.filter(e=>e.category===c).reduce((s,e)=>s+parseFloat(e.amount||0),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  if(loading)return(<main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}><style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{textAlign:"center"}}><div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/><p style={{color:"#64748B",fontSize:13}}>Loading expenses...</p></div></main>);

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder,textarea::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .exp-row{transition:all 0.2s;animation:fadeUp 0.3s ease forwards;}
        .exp-row:hover{background:rgba(14,165,233,0.04)!important;border-color:rgba(14,165,233,0.2)!important;}
      `}</style>
      <Navbar/>
      <div style={{maxWidth:960,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,animation:"fadeUp 0.5s ease"}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Expense Tracker 💸</h1>
            <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>Track business expenses · GST input credit</p>
          </div>
          <button onClick={()=>{setForm(EMPTY);setEditId(null);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}}
            style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            + Add Expense
          </button>
        </div>

        {/* Month selector + stats */}
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr",gap:12,marginBottom:16,alignItems:"center",animation:"fadeUp 0.5s ease 0.05s both"}}>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Month</label>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          </div>
          {[
            {label:"Total Expenses", value:fmtS(totalAmt), color:"#EF4444",icon:"💸"},
            {label:"GST Input Credit",value:fmtS(totalGST),color:"#10B981",icon:"🧮"},
            {label:"Net Cost",        value:fmtS(totalAmt-totalGST),color:"#F59E0B",icon:"📊"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span><span>{s.icon}</span></div>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add/Edit form */}
        {showForm&&(
          <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:18,padding:22,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{color:"#E2E8F0",fontSize:15,fontWeight:700,margin:0}}>{editId?"Edit Expense":"Add Expense"}</h2>
              <button onClick={()=>{setShowForm(false);setEditId(null);setForm(EMPTY);}} style={{background:"none",border:"none",color:"#64748B",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Date</label>
                <input type="date" value={form.date} onChange={e=>update("date",e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 2"}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Category *</label>
                <select value={form.category} onChange={e=>update("category",e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:form.category?"#E2E8F0":"#64748B",fontSize:13,outline:"none",fontFamily:"inherit"}}>
                  <option value="" style={{background:"#0F172A"}}>Select category...</option>
                  {CATEGORIES.map(c=><option key={c} value={c} style={{background:"#0F172A"}}>{CAT_ICONS[c]} {c}</option>)}
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Amount ₹ *</label>
                <input type="number" value={form.amount} onChange={e=>update("amount",e.target.value)} placeholder="0.00" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>GST Paid ₹ (input credit)</label>
                <input type="number" value={form.gst_paid} onChange={e=>update("gst_paid",e.target.value)} placeholder="0.00" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Vendor / Payee</label>
                <input type="text" value={form.vendor_name} onChange={e=>update("vendor_name",e.target.value)} placeholder="e.g. Amazon, Airtel" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,gridColumn:"span 3"}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Description</label>
                <input type="text" value={form.description} onChange={e=>update("description",e.target.value)} placeholder="Brief description..." style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={saveExpense} disabled={saving}
                style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:saving?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                {saving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Saving...</>:(editId?"Save Changes":"Add Expense")}
              </button>
              <button onClick={()=>{setShowForm(false);setEditId(null);setForm(EMPTY);}} style={{padding:"12px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748B",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
          {/* Expense list */}
          <div>
            {/* Search + Filter */}
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:150}}>
                <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 10px 9px 28px",color:"#E2E8F0",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 12px",color:filterCat?"#E2E8F0":"#64748B",fontSize:12,outline:"none",fontFamily:"inherit"}}>
                <option value="" style={{background:"#0F172A"}}>All Categories</option>
                {CATEGORIES.map(c=><option key={c} value={c} style={{background:"#0F172A"}}>{c}</option>)}
              </select>
            </div>

            {monthlyExp.length===0?(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:40,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:10}}>💸</div>
                <p style={{color:"#E2E8F0",fontSize:15,fontWeight:700,margin:"0 0 6px"}}>No expenses this month</p>
                <p style={{color:"#64748B",fontSize:12}}>Add your first expense above</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map((exp,i)=>(
                  <div key={exp.id} className="exp-row"
                    style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 16px",animationDelay:`${i*30}ms`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                        {CAT_ICONS[exp.category]||"📌"}
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                          <span style={{color:"#E2E8F0",fontWeight:700,fontSize:13}}>{exp.vendor_name||exp.category}</span>
                          <span style={{background:"rgba(255,255,255,0.06)",color:"#94A3B8",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>{exp.category}</span>
                        </div>
                        <div style={{color:"#64748B",fontSize:11}}>{exp.description} · {exp.date}</div>
                        {parseFloat(exp.gst_paid)>0&&<div style={{color:"#10B981",fontSize:10,marginTop:2}}>GST Input Credit: ₹{fmt(exp.gst_paid)}</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:"#EF4444",fontWeight:900,fontSize:16}}>₹{fmt(exp.amount)}</div>
                        {parseFloat(exp.gst_paid)>0&&<div style={{color:"#10B981",fontSize:10}}>-₹{fmt(exp.gst_paid)} GST</div>}
                      </div>
                      <button onClick={()=>openEdit(exp)} style={{background:"none",border:"none",color:"#64748B",cursor:"pointer",fontSize:14,padding:"4px",transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#E2E8F0"} onMouseLeave={e=>e.currentTarget.style.color="#64748B"}>✏️</button>
                      <button onClick={()=>deleteExpense(exp.id)} disabled={deleting===exp.id} style={{background:"none",border:"none",color:"#64748B",cursor:"pointer",fontSize:14,padding:"4px",transition:"color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#64748B"}>
                        {deleting===exp.id?<svg style={{animation:"spin 0.8s linear infinite"}} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/></svg>:"🗑"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div>
            <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Category Breakdown</h3>
            {catTotals.length===0?(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:24,textAlign:"center"}}>
                <p style={{color:"#64748B",fontSize:12,margin:0}}>No data this month</p>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {catTotals.map(c=>(
                  <div key={c.cat} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{color:"#E2E8F0",fontSize:12,fontWeight:600}}>{CAT_ICONS[c.cat]} {c.cat}</span>
                      <span style={{color:"#EF4444",fontSize:12,fontWeight:700}}>{fmtS(c.total)}</span>
                    </div>
                    <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(c.total/totalAmt)*100}%`,background:"linear-gradient(90deg,#EF4444,#F87171)",borderRadius:4,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                ))}
                <div style={{background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:12,padding:"12px 14px",marginTop:4}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#10B981",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>GST Input Credit</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#10B981"}}>₹{fmt(totalGST)}</div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:2}}>Claim this against GST payable</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
