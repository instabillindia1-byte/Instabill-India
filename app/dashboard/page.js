export const dynamic = "force-dynamic";
"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtS(n){n=parseFloat(n||0);if(n>=10000000)return "₹"+(n/10000000).toFixed(1)+"Cr";if(n>=100000)return "₹"+(n/100000).toFixed(1)+"L";if(n>=1000)return "₹"+(n/1000).toFixed(1)+"K";return "₹"+Math.round(n);}

function calcMonthly(invoices){
  const map={};
  invoices.forEach(inv=>{
    const d=new Date(inv.created_at);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const lbl=d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
    if(!map[key])map[key]={key,label:lbl,total:0,paid:0,pending:0,gst:0,count:0};
    const total=parseFloat(inv.total_amount)||0,base=parseFloat(inv.amount)||0;
    map[key].total+=total;map[key].gst+=(total-base);map[key].count++;
    if(inv.status==="paid")map[key].paid+=total;else map[key].pending+=total;
  });
  return Object.values(map).sort((a,b)=>a.key>b.key?1:-1);
}
function calcGST(invoices){
  let cgst=0,sgst=0,igst=0;
  invoices.forEach(inv=>{
    const base=parseFloat(inv.amount)||0,rate=parseFloat(inv.gst_rate)||18;
    const gst=parseFloat(((base*rate)/100).toFixed(2));
    if(inv.gst_type==="intra"){cgst+=gst/2;sgst+=gst/2;}else igst+=gst;
  });
  return{cgst,sgst,igst,total:cgst+sgst+igst};
}
function calcClients(invoices){
  const map={};
  invoices.forEach(inv=>{
    if(!map[inv.client_name])map[inv.client_name]={name:inv.client_name,total:0,count:0};
    map[inv.client_name].total+=parseFloat(inv.total_amount)||0;map[inv.client_name].count++;
  });
  return Object.values(map).sort((a,b)=>b.total-a.total);
}

function BarChart({data,valueKey,color}){
  const[hovered,setHovered]=useState(null);
  const max=Math.max(...data.map(d=>d[valueKey]),1);
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:130,padding:"0 4px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}
          onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}>
          {hovered===i&&(
            <div style={{fontSize:10,fontWeight:700,color:"#fff",background:color,padding:"2px 7px",borderRadius:6,whiteSpace:"nowrap",marginBottom:2}}>
              {fmtS(d[valueKey])}
            </div>
          )}
          <div style={{width:"100%",borderRadius:"4px 4px 0 0",height:`${Math.max((d[valueKey]/max)*100,2)}%`,background:hovered===i?color:color+"77",transition:"all 0.3s ease",cursor:"pointer"}}/>
          <div style={{fontSize:9,color:"#475569",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",maxWidth:"100%",fontWeight:500}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({cgst,sgst,igst}){
  const total=cgst+sgst+igst;
  if(total===0)return<div style={{textAlign:"center",color:"#475569",fontSize:13,padding:40}}>No GST data yet</div>;
  const segs=[{label:"CGST",value:cgst,color:"#0EA5E9"},{label:"SGST",value:sgst,color:"#38BDF8"},{label:"IGST",value:igst,color:"#7C3AED"}].filter(s=>s.value>0);
  const r=55,cx=70,cy=70,circ=2*Math.PI*r;
  let offset=0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:20}}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="22"/>
        {segs.map((s,i)=>{
          const pct=s.value/total,dash=pct*circ;
          const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth="22" strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset*circ} style={{transition:"all 0.5s ease"}} transform={`rotate(-90 ${cx} ${cy})`}/>;
          offset+=pct;return el;
        })}
        <text x={cx} y={cy-8} textAnchor="middle" style={{fontSize:10,fill:"#64748B",fontFamily:"inherit"}}>Total GST</text>
        <text x={cx} y={cy+10} textAnchor="middle" style={{fontSize:12,fontWeight:700,fill:"#E2E8F0",fontFamily:"inherit"}}>{fmtS(total)}</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {segs.map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:3,background:s.color,flexShrink:0}}/>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#E2E8F0"}}>{s.label}</div>
              <div style={{fontSize:11,color:"#64748B"}}>₹{fmt(s.value)}</div>
              <div style={{fontSize:10,color:"#475569"}}>{((s.value/total)*100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlassBox({children,style={}}){
  return(
    <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,...style}}>
      {children}
    </div>
  );
}

export default function DashboardPage(){
  const[user,setUser]=useState(null);
  const[invoices,setInvoices]=useState([]);
  const[loading,setLoading]=useState(true);
  const[year,setYear]=useState(new Date().getFullYear());
  const[exporting,setExporting]=useState(false);
  const router=useRouter();const supabase=createClient();

  useEffect(()=>{
    async function load(){
      const{data:{user:u}}=await supabase.auth.getUser();
      if(!u){router.push("/login");return;}
      setUser(u);
      const{data}=await supabase.from("invoices").select("*").eq("user_id",u.id).order("created_at",{ascending:true});
      setInvoices(data||[]);setLoading(false);
    }
    load();
  },[]);

  const filtered=invoices.filter(i=>new Date(i.created_at).getFullYear()===year);
  const monthly=calcMonthly(filtered);
  const gstData=calcGST(filtered);
  const clients=calcClients(filtered);
  const paid=filtered.filter(i=>i.status==="paid");
  const pending=filtered.filter(i=>i.status==="pending");
  const totalRevenue=paid.reduce((s,i)=>s+parseFloat(i.total_amount||0),0);
  const totalPending=pending.reduce((s,i)=>s+parseFloat(i.total_amount||0),0);
  const years=[...new Set(invoices.map(i=>new Date(i.created_at).getFullYear()))].sort((a,b)=>b-a);

  async function handleExport(){
    setExporting(true);
    try{
      const{jsPDF}=await import("jspdf");
      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const W=210,M=14;
      doc.setFillColor(2,11,24);doc.rect(0,0,W,36,"F");
      doc.setFillColor(14,165,233);doc.rect(0,30,W,6,"F");
      doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(255,255,255);
      doc.text("InstaBill India — GST Summary Report",M,16);
      doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);
      doc.text(`Financial Year ${year} · Generated on ${new Date().toLocaleString("en-IN")}`,M,24);
      doc.setTextColor(14,165,233);doc.text(`Total GST: Rs. ${fmt(gstData.total)}`,W-M,20,{align:"right"});
      let y=46;
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(14,165,233);
      doc.text("GST COLLECTED SUMMARY",M,y);y+=8;
      [["CGST Collected",`Rs. ${fmt(gstData.cgst)}`],["SGST Collected",`Rs. ${fmt(gstData.sgst)}`],["IGST Collected",`Rs. ${fmt(gstData.igst)}`],["TOTAL GST",`Rs. ${fmt(gstData.total)}`]].forEach(([l,v],i)=>{
        if(i===3){doc.setFillColor(14,165,233);doc.rect(M,y-4,W-M*2,10,"F");doc.setTextColor(255,255,255);}
        else{doc.setFillColor(i%2===0?20:30,30,50);doc.rect(M,y-4,W-M*2,9,"F");doc.setTextColor(226,232,240);}
        doc.setFont("helvetica",i===3?"bold":"normal");
        doc.text(l,M+4,y+1);doc.text(v,W-M-4,y+1,{align:"right"});y+=10;
      });
      y+=8;
      doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(14,165,233);
      doc.text("MONTHLY BREAKDOWN",M,y);y+=8;
      ["Month","Total Billed","GST","Paid","Pending"].forEach((h,i)=>{
        doc.setFillColor(2,11,24);doc.rect(M+[0,30,80,110,150][i],y-5,[30,50,30,40,42][i],8,"F");
        doc.setTextColor(14,165,233);doc.setFont("helvetica","bold");doc.setFontSize(7.5);
        doc.text(h,M+[2,32,82,112,152][i],y);
      });y+=6;
      monthly.forEach((m,i)=>{
        doc.setFillColor(i%2===0?15:22,22,40);doc.rect(M,y-4,W-M*2,9,"F");
        doc.setTextColor(226,232,240);doc.setFont("helvetica","normal");doc.setFontSize(7.5);
        doc.text(m.label,M+2,y+1);doc.text(`Rs. ${fmt(m.total)}`,M+32,y+1);
        doc.text(`Rs. ${fmt(m.gst)}`,M+82,y+1);doc.text(`Rs. ${fmt(m.paid)}`,M+112,y+1);
        doc.text(`Rs. ${fmt(m.pending)}`,M+152,y+1);y+=9;
      });
      doc.setFillColor(2,11,24);doc.rect(0,276,W,21,"F");
      doc.setDrawColor(14,165,233);doc.setLineWidth(0.3);doc.line(0,276,W,276);
      doc.setFontSize(7);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);
      doc.text("Generated by InstaBill India · instabillindia.com",W/2,284,{align:"center"});
      doc.setTextColor(14,165,233);doc.text(`Report: FY ${year} · ${new Date().toLocaleString("en-IN")}`,W/2,290,{align:"center"});
      doc.save(`InstaBill_GST_Report_${year}.pdf`);
    }catch(e){alert("Export failed.");}
    setExporting(false);
  }

  if(loading){
    return(
      <main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{textAlign:"center"}}>
          <div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/>
          <p style={{color:"#64748B",fontSize:13}}>Loading dashboard...</p>
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
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .dash-box{animation:fadeUp 0.5s ease both;}
        .stat-box{transition:all 0.3s ease;}
        .stat-box:hover{transform:translateY(-3px);box-shadow:0 8px 30px rgba(14,165,233,0.12)!important;}
      `}</style>

      <Navbar/>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* Header */}
        <div className="dash-box" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Earnings Dashboard</h1>
            <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>{user?.email} · {filtered.length} invoices in {year}</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <select value={year} onChange={e=>setYear(parseInt(e.target.value))}
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:600,color:"#E2E8F0",outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {(years.length>0?years:[new Date().getFullYear()]).map(y=><option key={y} value={y} style={{background:"#0F172A"}}>{y}</option>)}
            </select>
            <button onClick={handleExport} disabled={exporting||filtered.length===0}
              style={{display:"flex",alignItems:"center",gap:8,background:filtered.length===0?"rgba(14,165,233,0.2)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:filtered.length===0?"not-allowed":"pointer",transition:"all 0.2s",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(14,165,233,0.25)"}}
              onMouseEnter={e=>{if(filtered.length>0){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(14,165,233,0.4)";}}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 16px rgba(14,165,233,0.25)";}}>
              {exporting?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>Exporting...</>:<>⬇ Export GST Report</>}
            </button>
          </div>
        </div>

        {filtered.length===0?(
          <GlassBox style={{padding:60,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:14}}>📊</div>
            <h2 style={{color:"#E2E8F0",fontSize:18,fontWeight:800,margin:"0 0 8px"}}>No invoices for {year}</h2>
            <p style={{color:"#64748B",fontSize:13,marginBottom:20}}>Create invoices and your earnings will appear here</p>
            <a href="/invoice" style={{display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,padding:"10px 24px",borderRadius:12,textDecoration:"none",fontSize:13}}>⚡ Create Invoice</a>
          </GlassBox>
        ):(
          <>
            {/* Stat cards */}
            <div className="dash-box" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}>
              {[
                {label:"Total Earned",value:fmtS(totalRevenue),sub:`${paid.length} paid invoices`,color:"#0EA5E9",icon:"💰"},
                {label:"Pending Amount",value:fmtS(totalPending),sub:`${pending.length} awaiting`,color:"#F59E0B",icon:"⏳"},
                {label:"Total GST",value:fmtS(gstData.total),sub:"Collected this year",color:"#7C3AED",icon:"🧮"},
                {label:"Avg Invoice",value:fmtS(filtered.length>0?filtered.reduce((s,i)=>s+parseFloat(i.total_amount||0),0)/filtered.length:0),sub:`${filtered.length} invoices`,color:"#10B981",icon:"📄"},
              ].map((s,idx)=>(
                <div key={s.label} className="stat-box" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"20px 18px",animation:`fadeUp 0.5s ease ${idx*80}ms both`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span>
                    <span style={{fontSize:20}}>{s.icon}</span>
                  </div>
                  <div style={{fontSize:24,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:6}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="dash-box" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16,animationDelay:"0.15s"}}>
              <GlassBox style={{padding:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div>
                    <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:0}}>Monthly Revenue</h3>
                    <p style={{color:"#64748B",fontSize:11,margin:"3px 0 0"}}>Total billed per month</p>
                  </div>
                  <span style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#0EA5E9",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{year}</span>
                </div>
                {monthly.length>0?<BarChart data={monthly} valueKey="total" color="#0EA5E9"/>:<div style={{textAlign:"center",color:"#475569",padding:40,fontSize:13}}>No data</div>}
              </GlassBox>
              <GlassBox style={{padding:20}}>
                <div style={{marginBottom:16}}>
                  <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:0}}>GST Breakdown</h3>
                  <p style={{color:"#64748B",fontSize:11,margin:"3px 0 0"}}>CGST · SGST · IGST split</p>
                </div>
                <DonutChart cgst={gstData.cgst} sgst={gstData.sgst} igst={gstData.igst}/>
              </GlassBox>
            </div>

            {/* Paid vs Pending */}
            <div className="dash-box" style={{animationDelay:"0.25s"}}>
              <GlassBox style={{padding:20,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div>
                    <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:0}}>Paid vs Pending — Month by Month</h3>
                    <p style={{color:"#64748B",fontSize:11,margin:"3px 0 0"}}>Track your collection rate</p>
                  </div>
                  <div style={{display:"flex",gap:12}}>
                    {[{color:"#10B981",label:"Paid"},{color:"#F59E0B",label:"Pending"}].map(l=>(
                      <div key={l.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748B"}}>
                        <div style={{width:10,height:10,borderRadius:3,background:l.color}}/>{l.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",gap:8,height:110}}>
                  {monthly.map((m,i)=>{
                    const max=Math.max(...monthly.map(x=>x.total),1);
                    return(
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%",justifyContent:"flex-end",gap:2}}>
                        <div style={{width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:"100%",gap:1}}>
                          <div style={{width:"100%",height:`${(m.paid/max)*100}%`,background:"#10B981",borderRadius:"3px 3px 0 0",minHeight:m.paid>0?3:0,transition:"height 0.6s ease"}}/>
                          <div style={{width:"100%",height:`${(m.pending/max)*100}%`,background:"#F59E0B",minHeight:m.pending>0?3:0,transition:"height 0.6s ease"}}/>
                        </div>
                        <div style={{fontSize:9,color:"#475569",textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",maxWidth:"100%"}}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>
              </GlassBox>
            </div>

            {/* Clients + Monthly Table */}
            <div className="dash-box" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16,animationDelay:"0.3s"}}>
              <GlassBox style={{padding:20}}>
                <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:"0 0 16px"}}>Top Clients</h3>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {clients.slice(0,5).map((c,i)=>{
                    const colors=["#0EA5E9","#38BDF8","#7C3AED","#10B981","#F59E0B"];
                    const pct=(c.total/clients[0].total)*100;
                    return(
                      <div key={c.name}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:26,height:26,borderRadius:"50%",background:colors[i],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0}}>
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:"#E2E8F0"}}>{c.name.length>20?c.name.slice(0,20)+"...":c.name}</div>
                              <div style={{fontSize:10,color:"#475569"}}>{c.count} invoice{c.count!==1?"s":""}</div>
                            </div>
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:colors[i]}}>{fmtS(c.total)}</div>
                        </div>
                        <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:colors[i],borderRadius:4,transition:"width 0.8s ease"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassBox>
              <GlassBox style={{padding:20}}>
                <h3 style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:"0 0 16px"}}>Monthly Summary</h3>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr>{["Month","Billed","GST","Paid"].map(h=>(
                      <th key={h} style={{textAlign:h==="Month"?"left":"right",color:"#475569",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:1,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {monthly.map(m=>(
                      <tr key={m.key} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <td style={{padding:"7px 0",color:"#E2E8F0",fontWeight:600}}>{m.label}</td>
                        <td style={{padding:"7px 0",textAlign:"right",color:"#E2E8F0",fontWeight:600}}>{fmtS(m.total)}</td>
                        <td style={{padding:"7px 0",textAlign:"right",color:"#0EA5E9",fontWeight:600}}>{fmtS(m.gst)}</td>
                        <td style={{padding:"7px 0",textAlign:"right"}}>
                          <span style={{background:m.paid>0?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.1)",color:m.paid>0?"#10B981":"#F59E0B",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>
                            {fmtS(m.paid)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{borderTop:"1px solid rgba(14,165,233,0.2)"}}>
                      <td style={{padding:"8px 0",fontWeight:800,color:"#E2E8F0"}}>Total</td>
                      <td style={{padding:"8px 0",textAlign:"right",fontWeight:800,color:"#0EA5E9"}}>{fmtS(filtered.reduce((s,i)=>s+parseFloat(i.total_amount||0),0))}</td>
                      <td style={{padding:"8px 0",textAlign:"right",fontWeight:800,color:"#7C3AED"}}>{fmtS(gstData.total)}</td>
                      <td style={{padding:"8px 0",textAlign:"right",fontWeight:800,color:"#10B981"}}>{fmtS(totalRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
              </GlassBox>
            </div>

            {/* GST for CA */}
            <div className="dash-box" style={{animationDelay:"0.35s"}}>
              <div style={{background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:16,padding:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
                  <div>
                    <h3 style={{color:"#E2E8F0",fontSize:14,fontWeight:800,margin:"0 0 4px"}}>GST Summary for your CA</h3>
                    <p style={{color:"#64748B",fontSize:12,margin:0}}>Share this with your accountant for GST filing</p>
                  </div>
                  <button onClick={handleExport} disabled={exporting}
                    style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(14,165,233,0.25)"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none"}}>
                    ⬇ Download GST Report PDF
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
                  {[
                    {label:"CGST Collected",value:gstData.cgst,color:"#0EA5E9"},
                    {label:"SGST Collected",value:gstData.sgst,color:"#38BDF8"},
                    {label:"IGST Collected",value:gstData.igst,color:"#7C3AED"},
                    {label:"Total GST",value:gstData.total,color:"#10B981"},
                  ].map(s=>(
                    <div key={s.label} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(255,255,255,0.06)"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:18,fontWeight:900,color:s.color}}>₹{fmt(s.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <p style={{textAlign:"center",color:"#1E293B",fontSize:11,paddingTop:24}}>
          InstaBill India · Dashboard data is live from your invoices · Private & secure
        </p>
      </div>
    </main>
  );
}
