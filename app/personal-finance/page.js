"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter }    from "next/navigation";
import Navbar           from "../../components/Navbar";
import { jsPDF }        from "jspdf";

// ── CATEGORIES ────────────────────────────────────────
// INCOME (money coming IN — credited to your account)
const INCOME_CATS = [
  {cat:"Salary",            icon:"💼", color:"#10B981", desc:"Monthly / weekly salary"},
  {cat:"Freelance",         icon:"💻", color:"#0EA5E9", desc:"Project payments"},
  {cat:"Business Income",   icon:"🏢", color:"#7C3AED", desc:"Business revenue"},
  {cat:"Loan Received",     icon:"🏦", color:"#F59E0B", desc:"Bank loan, personal loan"},
  {cat:"Investment Returns",icon:"📈", color:"#06B6D4", desc:"Dividends, mutual funds"},
  {cat:"Bonus / Incentive", icon:"🎯", color:"#EC4899", desc:"Performance bonus"},
  {cat:"Gift / Received",   icon:"🎁", color:"#F97316", desc:"Money received as gift"},
  {cat:"Rental Income",     icon:"🏠", color:"#84CC16", desc:"Rent collected"},
  {cat:"Other Income",      icon:"💰", color:"#64748B", desc:"Any other credit"},
];

// EXPENSE (money going OUT — debited from your account)
const EXPENSE_CATS = [
  {cat:"Food & Dining",     icon:"🍽️", color:"#EF4444", desc:"Groceries, restaurants"},
  {cat:"Transport",         icon:"🚗", color:"#F59E0B", desc:"Petrol, auto, cab, bus"},
  {cat:"Shopping",          icon:"🛍️", color:"#EC4899", desc:"Clothes, electronics"},
  {cat:"Bills & Utilities", icon:"⚡", color:"#8B5CF6", desc:"Electricity, internet, phone"},
  {cat:"Rent / EMI",        icon:"🏠", color:"#F97316", desc:"House rent or loan EMI"},
  {cat:"Health",            icon:"🏥", color:"#10B981", desc:"Medicine, hospital, doctor"},
  {cat:"Entertainment",     icon:"🎬", color:"#0EA5E9", desc:"OTT, movies, games"},
  {cat:"Education",         icon:"📚", color:"#06B6D4", desc:"Fees, books, courses"},
  {cat:"Investments",       icon:"📊", color:"#7C3AED", desc:"SIP, stocks, FD, gold"},
  {cat:"Savings",           icon:"🏦", color:"#10B981", desc:"Transfer to savings"},
  {cat:"Loan Repayment",    icon:"💳", color:"#EF4444", desc:"Paying back loans"},
  {cat:"Other Expense",     icon:"📌", color:"#64748B", desc:"Any other debit"},
];

function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtDate(d){if(!d)return"—";return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function today(){return new Date().toISOString().split("T")[0];}
function monthLabel(m){if(!m)return"";const[y,mo]=m.split("-");return new Date(y,mo-1).toLocaleString("en-IN",{month:"long",year:"numeric"});}

export default function PersonalFinancePage(){
  const[entries,   setEntries]  =useState([]);
  const[loading,   setLoading]  =useState(true);
  const[tab,       setTab]      =useState("overview");
  const[type,      setType]     =useState("expense");
  const[form,      setForm]     =useState({date:today(),category:"",description:"",amount:""});
  const[saving,    setSaving]   =useState(false);
  const[deleting,  setDeleting] =useState(null);
  const[month,     setMonth]    =useState(new Date().toISOString().slice(0,7));
  const[savingsGoal,setSavingsGoal]=useState("");
  const[exporting, setExporting]=useState(false);
  const[exportPeriod,setExportPeriod]=useState("monthly");
  const[customFrom,setCustomFrom]=useState("");
  const[customTo,  setCustomTo] =useState("");
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      const{data}=await supabase.from("expenses").select("*").eq("user_id",user.id).like("category","PF:%").order("date",{ascending:false});
      setEntries(data||[]);setLoading(false);
    }
    load();
  },[]);

  // ── Category helpers ──────────────────────────────
  function catType(cat){return cat.startsWith("PF:INCOME:")?"income":"expense";}
  function catName(cat){return cat.split(":").slice(2).join(":");}
  function getCatInfo(catFullName,isIncome){return(isIncome?INCOME_CATS:EXPENSE_CATS).find(c=>c.cat===catFullName)||{icon:"📌",color:"#64748B",desc:""};}

  // ── Derived data ──────────────────────────────────
  const monthEntries   =entries.filter(e=>e.date?.startsWith(month));
  const incomeEntries  =monthEntries.filter(e=>e.category.startsWith("PF:INCOME:"));
  const expenseEntries =monthEntries.filter(e=>e.category.startsWith("PF:EXPENSE:"));
  const totalIncome    =incomeEntries.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const totalExpense   =expenseEntries.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const totalSavings   =totalIncome-totalExpense;
  const savingsPct     =totalIncome>0?((totalSavings/totalIncome)*100):0;

  // Category breakdown
  const expBycat=(EXPENSE_CATS.map(c=>({...c,total:expenseEntries.filter(e=>catName(e.category)===c.cat).reduce((s,e)=>s+parseFloat(e.amount||0),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total));
  const incBycat=(INCOME_CATS.map(c=>({...c,total:incomeEntries.filter(e=>catName(e.category)===c.cat).reduce((s,e)=>s+parseFloat(e.amount||0),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total));

  // ── Add entry ────────────────────────────────────
  async function saveEntry(){
    if(!form.category||!form.amount||parseFloat(form.amount)<=0){alert("Category and amount are required.");return;}
    setSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const{data,error}=await supabase.from("expenses").insert({
      user_id:user.id,date:form.date,
      category:`PF:${type.toUpperCase()}:${form.category}`,
      description:form.description||null,
      amount:parseFloat(form.amount),gst_paid:0,
      vendor_name:form.description||null,
    }).select().single();
    if(!error){setEntries(prev=>[data,...prev]);setForm({date:today(),category:"",description:"",amount:""});setTab("overview");}
    else alert("Could not save. Try again.");
    setSaving(false);
  }

  async function deleteEntry(id){
    if(!confirm("Delete this entry?"))return;
    setDeleting(id);
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from("expenses").delete().eq("id",id).eq("user_id",user.id);
    setEntries(prev=>prev.filter(e=>e.id!==id));setDeleting(null);
  }

  // ── PDF Export ────────────────────────────────────
  async function exportPDF(){
    setExporting(true);
    try{
      let filtered=entries;let label="";
      if(exportPeriod==="monthly"){filtered=entries.filter(e=>e.date?.startsWith(month));label=monthLabel(month);}
      else if(exportPeriod==="halfyear"){const now=new Date();const from=new Date(now.getFullYear(),now.getMonth()-5,1);filtered=entries.filter(e=>e.date>=from.toISOString().split("T")[0]);label=`Last 6 Months`;}
      else{if(!customFrom||!customTo){alert("Select from and to dates.");setExporting(false);return;}filtered=entries.filter(e=>e.date>=customFrom&&e.date<=customTo);label=`${customFrom} to ${customTo}`;}

      const inc=filtered.filter(e=>e.category.startsWith("PF:INCOME:"));
      const exp=filtered.filter(e=>e.category.startsWith("PF:EXPENSE:"));
      const tInc=inc.reduce((s,e)=>s+parseFloat(e.amount||0),0);
      const tExp=exp.reduce((s,e)=>s+parseFloat(e.amount||0),0);
      const tSav=tInc-tExp;
      const sPct=tInc>0?((tSav/tInc)*100).toFixed(1):"0.0";

      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const W=210,M=14,CW=W-M*2;

      // White background
      doc.setFillColor(255,255,255);doc.rect(0,0,W,297,"F");

      // Header
      doc.setFillColor(15,23,42);doc.rect(0,0,W,44,"F");
      doc.setFillColor(14,165,233);doc.rect(0,41,W,3,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(22);doc.setTextColor(255,255,255);
      doc.text("Insta",M,20);doc.setTextColor(14,165,233);doc.text("Bill",M+24,20);
      doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(148,163,184);
      doc.text("INDIA  ·  Personal Finance Report",M,28);
      doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(255,255,255);
      doc.text("PERSONAL FINANCE",W-M,18,{align:"right"});
      doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(148,163,184);
      doc.text(`Period: ${label}`,W-M,25,{align:"right"});
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`,W-M,31,{align:"right"});
      let y=52;

      // Summary cards
      const cards=[
        {l:"Total Income",  v:tInc,  r:16,g:185,b:129},
        {l:"Total Expenses",v:tExp,  r:239,g:68,b:68},
        {l:"Net Savings",   v:tSav,  r:tSav>=0?14:239,g:tSav>=0?165:68,b:tSav>=0?233:68},
        {l:"Savings Rate",  v:null,  r:245,g:158,b:11,text:`${sPct}%`},
      ];
      const bw=(CW-9)/4;
      cards.forEach((c,i)=>{
        const bx=M+i*(bw+3);
        doc.setFillColor(c.r,c.g,c.b,15);doc.roundedRect(bx,y,bw,22,2,2,"F");
        doc.setDrawColor(c.r,c.g,c.b,50);doc.setLineWidth(0.3);doc.roundedRect(bx,y,bw,22,2,2,"S");
        doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.setTextColor(c.r,c.g,c.b);
        doc.text(c.l,bx+bw/2,y+7,{align:"center"});
        doc.setFontSize(9);doc.setTextColor(30,41,59);
        doc.text(c.text||`Rs.${fmt(c.v)}`,bx+bw/2,y+16,{align:"center"});
      });
      y+=30;

      // Income table
      if(inc.length>0){
        doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(16,185,129);
        doc.text("INCOME",M,y);y+=7;
        doc.setFillColor(30,41,59);doc.rect(M,y,CW,8,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
        doc.text("Date",M+2,y+5.5);doc.text("Category",M+24,y+5.5);doc.text("Description",M+68,y+5.5);doc.text("Amount (Rs.)",W-M-4,y+5.5,{align:"right"});
        y+=8;
        inc.forEach((e,idx)=>{
          if(y>260){doc.addPage();doc.setFillColor(255,255,255);doc.rect(0,0,W,297,"F");y=20;}
          doc.setFillColor(idx%2===0?248:255,idx%2===0?250:255,idx%2===0?252:255);doc.rect(M,y,CW,8,"F");
          doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(30,41,59);
          doc.text(e.date||"",M+2,y+5.5);doc.text(catName(e.category),M+24,y+5.5);
          doc.text((e.description||"").substring(0,30),M+68,y+5.5);
          doc.setFont("helvetica","bold");doc.setTextColor(16,185,129);
          doc.text(`Rs. ${fmt(e.amount)}`,W-M-4,y+5.5,{align:"right"});
          y+=8;
        });
        doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(16,185,129);
        doc.text(`Total Income: Rs. ${fmt(tInc)}`,W-M-4,y+5,{align:"right"});y+=12;
      }

      // Expense table
      if(exp.length>0){
        if(y>220){doc.addPage();doc.setFillColor(255,255,255);doc.rect(0,0,W,297,"F");y=20;}
        doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(239,68,68);
        doc.text("EXPENSES",M,y);y+=7;
        doc.setFillColor(30,41,59);doc.rect(M,y,CW,8,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(255,255,255);
        doc.text("Date",M+2,y+5.5);doc.text("Category",M+24,y+5.5);doc.text("Description",M+68,y+5.5);doc.text("Amount (Rs.)",W-M-4,y+5.5,{align:"right"});
        y+=8;
        exp.forEach((e,idx)=>{
          if(y>260){doc.addPage();doc.setFillColor(255,255,255);doc.rect(0,0,W,297,"F");y=20;}
          doc.setFillColor(idx%2===0?248:255,idx%2===0?250:255,idx%2===0?252:255);doc.rect(M,y,CW,8,"F");
          doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(30,41,59);
          doc.text(e.date||"",M+2,y+5.5);doc.text(catName(e.category),M+24,y+5.5);
          doc.text((e.description||"").substring(0,30),M+68,y+5.5);
          doc.setFont("helvetica","bold");doc.setTextColor(239,68,68);
          doc.text(`Rs. ${fmt(e.amount)}`,W-M-4,y+5.5,{align:"right"});
          y+=8;
        });
        doc.setFont("helvetica","bold");doc.setFontSize(8.5);doc.setTextColor(239,68,68);
        doc.text(`Total Expenses: Rs. ${fmt(tExp)}`,W-M-4,y+5,{align:"right"});y+=12;
      }

      // Net savings box
      if(y<260){
        doc.setFillColor(tSav>=0?14:239,tSav>=0?165:68,tSav>=0?233:68,15);
        doc.roundedRect(M,y,CW,14,2,2,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(10);
        doc.setTextColor(tSav>=0?2:185,tSav>=0?132:28,tSav>=0?199:28);
        doc.text(`NET SAVINGS: Rs. ${fmt(tSav)}  (${sPct}% of income)`,W/2,y+9,{align:"center"});
      }

      // Footer
      doc.setFillColor(15,23,42);doc.rect(0,274,W,23,"F");
      doc.setFillColor(14,165,233);doc.rect(0,274,W,2.5,"F");
      doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(148,163,184);
      doc.text("Generated by InstaBill India · Personal Finance · instabillindia.com",W/2,282,{align:"center"});
      doc.setTextColor(14,165,233);doc.text("This report is for personal reference only.",W/2,288,{align:"center"});

      doc.save(`Personal_Finance_${exportPeriod}_${new Date().toISOString().split("T")[0]}.pdf`);
    }catch(err){console.error(err);alert("Export failed. Please try again.");}
    setExporting(false);
  }

  if(loading)return(<main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}><style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{textAlign:"center"}}><div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/><p style={{color:"#64748B",fontSize:13}}>Loading personal finance...</p></div></main>);

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .entry-row{transition:all 0.2s;animation:slideIn 0.3s ease forwards;}
        .entry-row:hover{background:rgba(14,165,233,0.04)!important;border-color:rgba(14,165,233,0.15)!important;}
        .cat-btn{transition:all 0.15s ease;cursor:pointer;}
        .cat-btn:hover{transform:scale(1.03);}
      `}</style>

      <Navbar/>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px 80px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,animation:"fadeUp 0.5s ease"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Personal Finance 💰</h1>
              <span style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:"#10B981",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>FREE FOR ALL</span>
            </div>
            <p style={{color:"#475569",fontSize:13,margin:0}}>Track salary, expenses, loans, savings — everything</p>
          </div>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 14px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}
            onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:6,marginBottom:20,background:"rgba(255,255,255,0.03)",borderRadius:14,padding:5,animation:"fadeUp 0.5s ease 0.05s both"}}>
          {[{v:"overview",l:"📊 Overview"},{v:"add",l:"+ Add Entry"},{v:"history",l:"📋 History"},{v:"export",l:"📄 Export PDF"}].map(t=>(
            <button key={t.v} onClick={()=>setTab(t.v)} style={{flex:1,padding:"10px 8px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all 0.2s",background:tab===t.v?"linear-gradient(135deg,#0EA5E9,#0284C7)":"transparent",color:tab===t.v?"#fff":"#64748B",boxShadow:tab===t.v?"0 4px 16px rgba(14,165,233,0.3)":"none"}}>{t.l}</button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            {/* Big 3 stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
              {[
                {label:"Total Income",  value:totalIncome,  color:"#10B981",bg:"rgba(16,185,129,0.08)",border:"rgba(16,185,129,0.2)", icon:"💚"},
                {label:"Total Expenses",value:totalExpense, color:"#EF4444",bg:"rgba(239,68,68,0.08)",  border:"rgba(239,68,68,0.2)",  icon:"❤️"},
                {label:"Net Savings",   value:totalSavings, color:totalSavings>=0?"#0EA5E9":"#EF4444",bg:totalSavings>=0?"rgba(14,165,233,0.08)":"rgba(239,68,68,0.08)",border:totalSavings>=0?"rgba(14,165,233,0.2)":"rgba(239,68,68,0.2)",icon:totalSavings>=0?"💙":"⚠️"},
              ].map(s=>(
                <div key={s.label} style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:16,padding:"18px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span>
                    <span style={{fontSize:20}}>{s.icon}</span>
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:s.color,letterSpacing:-0.5}}>₹{fmt(s.value)}</div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:4}}>{monthLabel(month)}</div>
                </div>
              ))}
            </div>

            {/* Savings rate */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div>
                  <span style={{color:"#E2E8F0",fontSize:13,fontWeight:700}}>Savings Rate</span>
                  <span style={{color:"#64748B",fontSize:11,marginLeft:10}}>₹{fmt(totalSavings)} saved of ₹{fmt(totalIncome)}</span>
                </div>
                <span style={{color:savingsPct>=20?"#10B981":savingsPct>=10?"#F59E0B":"#EF4444",fontSize:22,fontWeight:900}}>{savingsPct.toFixed(1)}%</span>
              </div>
              <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:5,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${Math.min(100,Math.max(0,savingsPct))}%`,background:savingsPct>=20?"linear-gradient(90deg,#059669,#10B981)":savingsPct>=10?"linear-gradient(90deg,#D97706,#F59E0B)":"linear-gradient(90deg,#DC2626,#EF4444)",borderRadius:5,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748B"}}>
                <span>{savingsPct>=30?"🌟 Excellent!":savingsPct>=20?"✅ Good savings habit":savingsPct>=10?"⚠️ Aim for 20%+":"❌ More going out than coming in"}</span>
                <span>Target: 20%+ of income</span>
              </div>
            </div>

            {/* Savings goal */}
            <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:18}}>🎯</span>
                <span style={{color:"#F59E0B",fontSize:13,fontWeight:700}}>Monthly Savings Goal</span>
              </div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#F59E0B",fontWeight:700}}>₹</span>
                <input type="number" value={savingsGoal} onChange={e=>setSavingsGoal(e.target.value)} placeholder="Enter your target savings..."
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:10,padding:"10px 12px 10px 28px",color:"#E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
              </div>
              {savingsGoal&&parseFloat(savingsGoal)>0&&(
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:"#64748B"}}>Progress this month</span>
                    <span style={{color:"#F59E0B",fontWeight:700}}>₹{fmt(totalSavings)} / ₹{fmt(parseFloat(savingsGoal))}</span>
                  </div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,Math.max(0,(totalSavings/parseFloat(savingsGoal))*100))}%`,background:"linear-gradient(90deg,#F59E0B,#FBBF24)",borderRadius:4,transition:"width 0.8s ease"}}/>
                  </div>
                  <div style={{fontSize:11,color:"#64748B",marginTop:4,textAlign:"right"}}>{Math.round(Math.min(100,Math.max(0,(totalSavings/parseFloat(savingsGoal))*100)))}% of goal</div>
                </div>
              )}
            </div>

            {/* Income breakdown */}
            {incBycat.length>0&&(
              <div style={{background:"rgba(16,185,129,0.04)",border:"1px solid rgba(16,185,129,0.12)",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
                <h3 style={{color:"#10B981",fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Income Sources</h3>
                {incBycat.map(c=>(
                  <div key={c.cat} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{color:"#CBD5E1",fontSize:12,display:"flex",alignItems:"center",gap:6}}>{c.icon} {c.cat}</span>
                      <div style={{textAlign:"right"}}><span style={{color:"#10B981",fontSize:13,fontWeight:700}}>₹{fmt(c.total)}</span><span style={{color:"#475569",fontSize:10,marginLeft:6}}>{totalIncome>0?((c.total/totalIncome)*100).toFixed(1):0}%</span></div>
                    </div>
                    <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${totalIncome>0?(c.total/totalIncome)*100:0}%`,background:c.color||"#10B981",borderRadius:4,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expense breakdown */}
            {expBycat.length>0&&(
              <div style={{background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.12)",borderRadius:14,padding:"16px 18px",marginBottom:12}}>
                <h3 style={{color:"#EF4444",fontSize:13,fontWeight:700,margin:"0 0 12px"}}>Spending Breakdown</h3>
                {expBycat.map(c=>(
                  <div key={c.cat} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{color:"#CBD5E1",fontSize:12,display:"flex",alignItems:"center",gap:6}}>{c.icon} {c.cat}</span>
                      <div style={{textAlign:"right"}}><span style={{color:"#EF4444",fontSize:13,fontWeight:700}}>₹{fmt(c.total)}</span><span style={{color:"#475569",fontSize:10,marginLeft:6}}>{totalExpense>0?((c.total/totalExpense)*100).toFixed(1):0}%</span></div>
                    </div>
                    <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${totalExpense>0?(c.total/totalExpense)*100:0}%`,background:c.color||"#EF4444",borderRadius:4,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {monthEntries.length===0&&(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:48,textAlign:"center"}}>
                <div style={{fontSize:48,marginBottom:12}}>💰</div>
                <p style={{color:"#E2E8F0",fontSize:15,fontWeight:700,margin:"0 0 6px"}}>No entries for {monthLabel(month)}</p>
                <p style={{color:"#64748B",fontSize:12,marginBottom:16}}>Add your salary, expenses, loans — track everything</p>
                <button onClick={()=>setTab("add")} style={{background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add First Entry</button>
              </div>
            )}
          </div>
        )}

        {/* ══ ADD ENTRY ══ */}
        {tab==="add"&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:20,padding:28}}>
              <h2 style={{color:"#E2E8F0",fontSize:16,fontWeight:700,margin:"0 0 20px"}}>Add Entry</h2>

              {/* Type toggle */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:22,background:"rgba(255,255,255,0.04)",borderRadius:14,padding:5}}>
                {[
                  {v:"expense",l:"💸 Expense",bg:"linear-gradient(135deg,#DC2626,#EF4444)",shadow:"rgba(239,68,68,0.4)"},
                  {v:"income", l:"💚 Income", bg:"linear-gradient(135deg,#059669,#10B981)",shadow:"rgba(16,185,129,0.4)"},
                ].map(t=>(
                  <button key={t.v} onClick={()=>{setType(t.v);setForm(f=>({...f,category:""}));}}
                    style={{padding:"12px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,transition:"all 0.2s",background:type===t.v?t.bg:"transparent",color:type===t.v?"#fff":"#64748B",boxShadow:type===t.v?`0 4px 16px ${t.shadow}`:"none"}}>
                    {t.l}
                  </button>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Date</label>
                  <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                    style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Amount ₹ *</label>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#0EA5E9",fontWeight:700}}>₹</span>
                    <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" step="0.01"
                      style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 12px 11px 28px",color:"#E2E8F0",fontSize:14,fontWeight:700,outline:"none",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
                  </div>
                </div>
              </div>

              {/* Category grid */}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"block",marginBottom:10}}>Category *</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                  {(type==="income"?INCOME_CATS:EXPENSE_CATS).map(c=>(
                    <button key={c.cat} onClick={()=>setForm(f=>({...f,category:c.cat}))} className="cat-btn"
                      style={{padding:"10px 12px",borderRadius:12,border:`1px solid ${form.category===c.cat?c.color+"66":"rgba(255,255,255,0.08)"}`,background:form.category===c.cat?c.color+"18":"rgba(255,255,255,0.03)",color:form.category===c.cat?c.color:"#94A3B8",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:form.category===c.cat?700:400,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2,textAlign:"left",transition:"all 0.15s"}}>
                      <span style={{fontSize:18}}>{c.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{c.cat}</span>
                      <span style={{fontSize:10,color:"#64748B",lineHeight:1.3}}>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:16}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Note (optional)</label>
                <input type="text" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder={type==="income"?"e.g. January salary from XYZ Company, HDFC loan received...":"e.g. Big Bazaar groceries, electricity bill paid..."}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}
                  onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
              </div>

              <button onClick={saveEntry} disabled={saving}
                style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:saving?"rgba(14,165,233,0.3)":type==="income"?"linear-gradient(135deg,#059669,#10B981)":"linear-gradient(135deg,#DC2626,#EF4444)",color:"#fff",fontWeight:700,fontSize:15,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",transition:"all 0.2s",boxShadow:type==="income"?"0 4px 16px rgba(16,185,129,0.3)":"0 4px 16px rgba(239,68,68,0.3)"}}>
                {saving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Saving...</>:
                  type==="income"?"✓ Add Income Entry":"✓ Add Expense Entry"}
              </button>
            </div>
          </div>
        )}

        {/* ══ HISTORY ══ */}
        {tab==="history"&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            {monthEntries.length===0?(
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:40,textAlign:"center"}}>
                <p style={{color:"#64748B",fontSize:13}}>No entries for {monthLabel(month)}</p>
              </div>
            ):(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{color:"#64748B",fontSize:13}}>{monthEntries.length} entries · {monthLabel(month)}</span>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{color:"#10B981",fontSize:12,fontWeight:700}}>+₹{fmt(totalIncome)}</span>
                    <span style={{color:"#EF4444",fontSize:12,fontWeight:700}}>-₹{fmt(totalExpense)}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {monthEntries.map((e,i)=>{
                    const isInc=e.category.startsWith("PF:INCOME:");
                    const cn=catName(e.category);
                    const ci=getCatInfo(cn,isInc);
                    return(
                      <div key={e.id} className="entry-row"
                        style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,animationDelay:`${i*20}ms`}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                          <div style={{width:42,height:42,borderRadius:12,background:ci.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{ci.icon}</div>
                          <div style={{minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                              <span style={{color:"#E2E8F0",fontWeight:700,fontSize:13}}>{cn}</span>
                              <span style={{background:isInc?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:isInc?"#10B981":"#EF4444",fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:20}}>{isInc?"Income":"Expense"}</span>
                            </div>
                            <div style={{color:"#475569",fontSize:11}}>{e.description||"—"} · {fmtDate(e.date)}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                          <span style={{color:isInc?"#10B981":"#EF4444",fontWeight:900,fontSize:16,letterSpacing:-0.3}}>{isInc?"+":"-"}₹{fmt(e.amount)}</span>
                          <button onClick={()=>deleteEntry(e.id)} disabled={deleting===e.id}
                            style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:16,transition:"color 0.2s",padding:"4px"}}
                            onMouseEnter={e2=>e2.currentTarget.style.color="#EF4444"} onMouseLeave={e2=>e2.currentTarget.style.color="#334155"}>
                            {deleting===e.id?<svg style={{animation:"spin 0.8s linear infinite"}} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/></svg>:"🗑"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ EXPORT ══ */}
        {tab==="export"&&(
          <div style={{animation:"fadeUp 0.4s ease"}}>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:20,padding:28}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                <span style={{fontSize:28}}>📄</span>
                <div>
                  <h2 style={{color:"#E2E8F0",fontSize:16,fontWeight:700,margin:0}}>Export Finance Report</h2>
                  <p style={{color:"#64748B",fontSize:12,margin:"3px 0 0"}}>Download PDF — income, expenses, savings — completely free</p>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
                {[{v:"monthly",l:"📅 Monthly",d:"Selected month"},{v:"halfyear",l:"📆 Half Year",d:"Last 6 months"},{v:"custom",l:"🗓 Custom",d:"Pick date range"}].map(p=>(
                  <button key={p.v} onClick={()=>setExportPeriod(p.v)}
                    style={{padding:"14px",borderRadius:12,border:`1px solid ${exportPeriod===p.v?"rgba(14,165,233,0.4)":"rgba(255,255,255,0.08)"}`,background:exportPeriod===p.v?"rgba(14,165,233,0.12)":"rgba(255,255,255,0.03)",cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all 0.2s"}}>
                    <div style={{color:exportPeriod===p.v?"#0EA5E9":"#E2E8F0",fontSize:13,fontWeight:700,marginBottom:3}}>{p.l}</div>
                    <div style={{color:"#64748B",fontSize:11}}>{p.d}</div>
                  </button>
                ))}
              </div>
              {exportPeriod==="monthly"&&(
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"block",marginBottom:6}}>Select Month</label>
                  <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(14,165,233,0.3)",borderRadius:10,padding:"11px 14px",color:"#E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%"}}/>
                  <p style={{color:"#64748B",fontSize:12,marginTop:6}}>{monthEntries.length} entries will be exported</p>
                </div>
              )}
              {exportPeriod==="custom"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                  {[{l:"From Date",v:customFrom,s:setCustomFrom},{l:"To Date",v:customTo,s:setCustomTo}].map(f=>(
                    <div key={f.l} style={{display:"flex",flexDirection:"column",gap:5}}>
                      <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>{f.l}</label>
                      <input type="date" value={f.v} onChange={e=>f.s(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}
                        onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
                    </div>
                  ))}
                </div>
              )}
              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
                <p style={{color:"#94A3B8",fontSize:12,fontWeight:600,margin:"0 0 8px"}}>PDF includes:</p>
                {["All income entries with date, category, amount","All expense entries with date, category, amount","Summary: total income, expenses, savings, savings rate","Income sources breakdown","Net savings calculation"].map(i=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{color:"#10B981",fontSize:12}}>✓</span>
                    <span style={{color:"#64748B",fontSize:12}}>{i}</span>
                  </div>
                ))}
              </div>
              <button onClick={exportPDF} disabled={exporting}
                style={{width:"100%",padding:"15px",borderRadius:12,border:"none",background:exporting?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,fontSize:15,cursor:exporting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"inherit",boxShadow:"0 4px 20px rgba(14,165,233,0.3)",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(!exporting){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 30px rgba(14,165,233,0.4)";}}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 20px rgba(14,165,233,0.3)";}}>
                {exporting?<><svg style={{animation:"spin 0.8s linear infinite"}} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Generating PDF...</>:
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Finance Report PDF</>}
              </button>
              <p style={{textAlign:"center",color:"#334155",fontSize:11,marginTop:12}}>Free for all users · No watermark · Your data, your PDF</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
