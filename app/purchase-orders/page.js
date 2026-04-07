"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtS(n){n=parseFloat(n||0);if(n>=100000)return "₹"+(n/100000).toFixed(1)+"L";if(n>=1000)return "₹"+(n/1000).toFixed(1)+"K";return "₹"+Math.round(n);}
function fmtDate(d){if(!d)return "—";return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function genPONo(){const d=new Date();return `PO-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;}
const EMPTY_ITEM={id:Date.now(),description:"",quantity:"1",rate:"0"};

export default function PurchaseOrdersPage(){
  const[orders,   setOrders]  =useState([]);
  const[loading,  setLoading] =useState(true);
  const[showForm, setShowForm]=useState(false);
  const[saving,   setSaving]  =useState(false);
  const[deleting, setDeleting]=useState(null);
  const[receiving,setReceiving]=useState(null); // order being received
  const[filter,   setFilter]  =useState("all");
  const[form,     setForm]    =useState({po_no:genPONo(),supplier_name:"",supplier_email:"",supplier_phone:"",expected_date:"",notes:""});
  const[items,    setItems]   =useState([{...EMPTY_ITEM,id:1},{...EMPTY_ITEM,id:2}]);
  const[expandedId,setExpanded]=useState(null);
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      const{data}=await supabase.from("purchase_orders").select("*, purchase_order_items(*)").eq("user_id",user.id).order("created_at",{ascending:false});
      setOrders(data||[]);setLoading(false);
    }
    load();
  },[]);

  function updateForm(f,v){setForm(p=>({...p,[f]:v}));}
  function updateItem(id,f,v){setItems(p=>p.map(i=>i.id===id?{...i,[f]:v}:i));}
  function addItem(){setItems(p=>[...p,{...EMPTY_ITEM,id:Date.now()}]);}
  function removeItem(id){if(items.length<=1)return;setItems(p=>p.filter(i=>i.id!==id));}

  const validItems=items.filter(i=>i.description.trim());
  const calcTotal=validItems.reduce((s,i)=>s+parseFloat(i.quantity||0)*parseFloat(i.rate||0),0);

  async function savePO(){
    if(!form.supplier_name.trim()){alert("Supplier name is required");return;}
    if(validItems.length===0){alert("Add at least one item");return;}
    setSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const{data:po,error}=await supabase.from("purchase_orders").insert({
      user_id:user.id,po_no:form.po_no,supplier_name:form.supplier_name,
      supplier_email:form.supplier_email||null,supplier_phone:form.supplier_phone||null,
      status:"pending",expected_date:form.expected_date||null,
      total_amount:calcTotal,notes:form.notes||null,
    }).select().single();
    if(!error&&po){
      await supabase.from("purchase_order_items").insert(
        validItems.map(i=>({purchase_order_id:po.id,user_id:user.id,description:i.description,quantity:parseFloat(i.quantity||1),rate:parseFloat(i.rate||0),received_qty:0}))
      );
      const{data:full}=await supabase.from("purchase_orders").select("*, purchase_order_items(*)").eq("id",po.id).single();
      setOrders(p=>[full,...p]);
      setShowForm(false);setForm({po_no:genPONo(),supplier_name:"",supplier_email:"",supplier_phone:"",expected_date:"",notes:""});
      setItems([{...EMPTY_ITEM,id:1},{...EMPTY_ITEM,id:2}]);
    }else alert("Could not create PO.");
    setSaving(false);
  }

  async function deletePO(id){
    if(!confirm("Delete this Purchase Order?"))return;
    setDeleting(id);
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from("purchase_orders").delete().eq("id",id).eq("user_id",user.id);
    setOrders(p=>p.filter(o=>o.id!==id));setDeleting(null);
  }

  async function markReceived(order){
    // Update all items as fully received + update stock
    const{data:{user}}=await supabase.auth.getUser();
    const items=order.purchase_order_items||[];
    for(const item of items){
      await supabase.from("purchase_order_items").update({received_qty:item.quantity}).eq("id",item.id);
      // Update product stock if linked
      if(item.product_id){
        const{data:prod}=await supabase.from("products").select("stock_qty").eq("id",item.product_id).single();
        if(prod){
          await supabase.from("products").update({stock_qty:parseFloat(prod.stock_qty)+parseFloat(item.quantity),updated_at:new Date().toISOString()}).eq("id",item.product_id);
          await supabase.from("stock_movements").insert({user_id:user.id,product_id:item.product_id,type:"purchase",quantity:parseFloat(item.quantity),ref_no:order.po_no,notes:`PO from ${order.supplier_name}`});
        }
      }
    }
    await supabase.from("purchase_orders").update({status:"received"}).eq("id",order.id);
    setOrders(p=>p.map(o=>o.id===order.id?{...o,status:"received"}:o));
    alert("✅ PO marked as received! Stock updated.");
  }

  const filtered=orders.filter(o=>filter==="all"?true:o.status===filter);
  const pendingCount=orders.filter(o=>o.status==="pending").length;
  const receivedCount=orders.filter(o=>o.status==="received").length;
  const totalPending=orders.filter(o=>o.status==="pending").reduce((s,o)=>s+parseFloat(o.total_amount||0),0);

  const STATUS_COLORS={pending:"#F59E0B",received:"#10B981",partial:"#0EA5E9",cancelled:"#EF4444"};
  const STATUS_BG={pending:"rgba(245,158,11,0.1)",received:"rgba(16,185,129,0.1)",partial:"rgba(14,165,233,0.1)",cancelled:"rgba(239,68,68,0.1)"};

  if(loading)return(<main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}><style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{textAlign:"center"}}><div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/><p style={{color:"#64748B",fontSize:13}}>Loading purchase orders...</p></div></main>);

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder,textarea::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .po-card{transition:all 0.2s ease;animation:fadeUp 0.3s ease forwards;}
        .po-card:hover{border-color:rgba(14,165,233,0.25)!important;}
        .item-inp{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 10px;color:#E2E8F0;font-size:12px;outline:none;font-family:inherit;transition:border 0.2s;width:100%;}
        .item-inp:focus{border-color:rgba(14,165,233,0.5);}
      `}</style>
      <Navbar/>
      <div style={{maxWidth:960,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,animation:"fadeUp 0.5s ease"}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Purchase Orders 🛒</h1>
            <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>Raise POs to suppliers · Track received goods</p>
          </div>
          <button onClick={()=>{setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}}
            style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            + New Purchase Order
          </button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16,animation:"fadeUp 0.5s ease 0.05s both"}}>
          {[
            {label:"Total POs",     value:orders.length,       color:"#0EA5E9",icon:"🛒"},
            {label:"Pending",       value:pendingCount,        color:"#F59E0B",icon:"⏳"},
            {label:"Received",      value:receivedCount,       color:"#10B981",icon:"✅"},
            {label:"Pending Value", value:fmtS(totalPending),  color:"#EF4444",icon:"💰"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span><span>{s.icon}</span></div>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* New PO Form */}
        {showForm&&(
          <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:18,padding:22,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{color:"#E2E8F0",fontSize:15,fontWeight:700,margin:0}}>New Purchase Order</h2>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:"#64748B",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {/* Supplier info */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
              {[
                {label:"PO Number",        name:"po_no",         placeholder:"PO-2501-001"},
                {label:"Supplier Name *",  name:"supplier_name", placeholder:"ABC Traders"},
                {label:"Supplier Email",   name:"supplier_email",placeholder:"supplier@email.com"},
                {label:"Supplier Phone",   name:"supplier_phone",placeholder:"9876543210"},
                {label:"Expected Delivery",name:"expected_date", placeholder:"",type:"date"},
                {label:"Notes",            name:"notes",         placeholder:"Any special instructions"},
              ].map(f=>(
                <div key={f.name} style={{display:"flex",flexDirection:"column",gap:5}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>{f.label}</label>
                  <input type={f.type||"text"} value={form[f.name]} onChange={e=>updateForm(f.name,e.target.value)} placeholder={f.placeholder} className="item-inp" style={{padding:"10px 12px",borderRadius:10,fontSize:13}}/>
                </div>
              ))}
            </div>

            {/* Items */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{color:"#E2E8F0",fontSize:13,fontWeight:700}}>Items to Order</span>
                <button onClick={addItem} style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.2)",color:"#38BDF8",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add Item</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr auto",gap:6,marginBottom:6,padding:"0 2px"}}>
                {["Description","Qty","Rate ₹",""].map(h=><div key={h} style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
              </div>
              {items.map(item=>(
                <div key={item.id} style={{display:"grid",gridTemplateColumns:"3fr 1fr 1fr auto",gap:6,marginBottom:6,alignItems:"center"}}>
                  <input value={item.description} onChange={e=>updateItem(item.id,"description",e.target.value)} placeholder="Item description" className="item-inp"/>
                  <input type="number" value={item.quantity} onChange={e=>updateItem(item.id,"quantity",e.target.value)} min="1" className="item-inp" style={{textAlign:"center"}}/>
                  <input type="number" value={item.rate} onChange={e=>updateItem(item.id,"rate",e.target.value)} placeholder="0.00" className="item-inp"/>
                  <button onClick={()=>removeItem(item.id)} style={{background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:16,padding:"4px",opacity:items.length<=1?0.3:1}}>✕</button>
                </div>
              ))}
              {calcTotal>0&&(
                <div style={{textAlign:"right",marginTop:8,fontSize:14,fontWeight:700,color:"#0EA5E9"}}>PO Total: ₹{fmt(calcTotal)}</div>
              )}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={savePO} disabled={saving}
                style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:saving?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
                {saving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Creating...</>:"Create Purchase Order"}
              </button>
              <button onClick={()=>setShowForm(false)} style={{padding:"12px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748B",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{display:"flex",gap:8,marginBottom:14,animation:"fadeUp 0.5s ease 0.1s both"}}>
          {[{v:"all",l:`All (${orders.length})`},{v:"pending",l:`Pending (${pendingCount})`},{v:"received",l:`Received (${receivedCount})`}].map(t=>(
            <button key={t.v} onClick={()=>setFilter(t.v)}
              style={{padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",
                background:filter===t.v?(t.v==="received"?"linear-gradient(135deg,#059669,#10B981)":t.v==="pending"?"linear-gradient(135deg,#D97706,#F59E0B)":"linear-gradient(135deg,#0284C7,#0EA5E9)"):"rgba(255,255,255,0.06)",
                color:filter===t.v?"#fff":"#64748B"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* PO list */}
        {orders.length===0?(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:56,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🛒</div>
            <h2 style={{color:"#E2E8F0",fontSize:18,fontWeight:800,margin:"0 0 8px"}}>No purchase orders yet</h2>
            <p style={{color:"#64748B",fontSize:13,marginBottom:18}}>Create your first PO to start tracking orders from suppliers</p>
            <button onClick={()=>setShowForm(true)} style={{background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ New Purchase Order</button>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map((order,i)=>{
              const poItems=order.purchase_order_items||[];
              const isExpanded=expandedId===order.id;
              return(
                <div key={order.id} className="po-card"
                  style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${order.status==="received"?"rgba(16,185,129,0.2)":order.status==="pending"?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.08)"}`,borderRadius:14,overflow:"hidden",animationDelay:`${i*40}ms`}}>
                  {/* Main row */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>setExpanded(isExpanded?null:order.id)}>
                    <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                      <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🛒</div>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{color:"#E2E8F0",fontWeight:800,fontSize:14}}>{order.po_no}</span>
                          <span style={{background:STATUS_BG[order.status]||"rgba(255,255,255,0.06)",color:STATUS_COLORS[order.status]||"#94A3B8",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,textTransform:"uppercase"}}>{order.status}</span>
                        </div>
                        <p style={{color:"#E2E8F0",fontSize:13,fontWeight:700,margin:"0 0 2px"}}>{order.supplier_name}</p>
                        <p style={{color:"#64748B",fontSize:11,margin:0}}>{poItems.length} item{poItems.length!==1?"s":""} · {fmtDate(order.created_at)}{order.expected_date&&` · Expected ${fmtDate(order.expected_date)}`}</p>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:STATUS_COLORS[order.status]||"#E2E8F0",fontWeight:900,fontSize:18}}>₹{fmt(order.total_amount)}</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        {order.status==="pending"&&(
                          <button onClick={e=>{e.stopPropagation();markReceived(order);}}
                            style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",color:"#10B981",borderRadius:8,padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                            ✓ Mark Received
                          </button>
                        )}
                        <button onClick={e=>{e.stopPropagation();deletePO(order.id);}} disabled={deleting===order.id}
                          style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",borderRadius:8,padding:"7px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                          {deleting===order.id?<svg style={{animation:"spin 0.8s linear infinite"}} width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/></svg>:"🗑"}
                        </button>
                        <span style={{color:"#475569",fontSize:16,display:"flex",alignItems:"center"}}>{isExpanded?"▲":"▼"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded&&poItems.length>0&&(
                    <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 18px",background:"rgba(255,255,255,0.02)"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr>
                            {["Item","Qty","Rate","Total","Received"].map(h=>(
                              <th key={h} style={{textAlign:h==="Item"?"left":"right",color:"#64748B",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:1,paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map(item=>(
                            <tr key={item.id} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                              <td style={{padding:"7px 0",color:"#E2E8F0",fontWeight:600}}>{item.description}</td>
                              <td style={{padding:"7px 0",textAlign:"right",color:"#94A3B8"}}>{item.quantity}</td>
                              <td style={{padding:"7px 0",textAlign:"right",color:"#94A3B8"}}>₹{fmt(item.rate)}</td>
                              <td style={{padding:"7px 0",textAlign:"right",color:"#0EA5E9",fontWeight:700}}>₹{fmt(parseFloat(item.quantity)*parseFloat(item.rate))}</td>
                              <td style={{padding:"7px 0",textAlign:"right"}}>
                                <span style={{color:parseFloat(item.received_qty)>=parseFloat(item.quantity)?"#10B981":parseFloat(item.received_qty)>0?"#F59E0B":"#64748B",fontWeight:600}}>{item.received_qty}/{item.quantity}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {order.notes&&<p style={{color:"#64748B",fontSize:11,marginTop:10}}>Note: {order.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
