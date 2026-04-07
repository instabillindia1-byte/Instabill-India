"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

const UNITS=["pcs","kg","g","litre","ml","metre","cm","box","carton","dozen","set","pair","hour","day"];
const GST_RATES=["0","5","12","18","28"];
const EMPTY={name:"",description:"",hsn_code:"",unit:"pcs",selling_price:"",purchase_price:"",gst_rate:"18",stock_qty:"0",low_stock_alert:"5"};

function fmt(n){return parseFloat(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});}

function GField({label,name,type="text",placeholder="",value,onChange,style={}}){
  const[f,setF]=useState(false);const filled=value&&String(value).length>0;
  return(<div style={{display:"flex",flexDirection:"column",gap:5,...style}}>
    <label style={{fontSize:10,fontWeight:700,color:filled?"#38BDF8":"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>{label}</label>
    <input type={type} value={value} placeholder={placeholder} autoComplete="off"
      onChange={e=>onChange(name,e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:f?"rgba(14,165,233,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${f?"rgba(14,165,233,0.7)":filled?"rgba(14,165,233,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",transition:"all 0.2s",fontFamily:"inherit"}}/>
  </div>);}

export default function InventoryPage(){
  const[products,setProducts]=useState([]);
  const[loading,  setLoading] =useState(true);
  const[search,   setSearch]  =useState("");
  const[showForm, setShowForm]=useState(false);
  const[editId,   setEditId]  =useState(null);
  const[form,     setForm]    =useState(EMPTY);
  const[saving,   setSaving]  =useState(false);
  const[deleting, setDeleting]=useState(null);
  const[adjModal, setAdjModal]=useState(null); // product to adjust stock
  const[adjQty,   setAdjQty]  =useState("");
  const[adjType,  setAdjType] =useState("stock_in");
  const[adjNote,  setAdjNote] =useState("");
  const[adjSaving,setAdjSaving]=useState(false);
  const[tab,setTab]=useState("all"); // all | low | out
  const supabase=createClient();const router=useRouter();

  useEffect(()=>{
    async function load(){
      const{data:{user}}=await supabase.auth.getUser();
      if(!user){router.push("/login");return;}
      const{data}=await supabase.from("products").select("*").eq("user_id",user.id).order("name");
      setProducts(data||[]);setLoading(false);
    }
    load();
  },[]);

  function update(field,val){setForm(p=>({...p,[field]:val}));}

  async function saveProduct(){
    if(!form.name.trim()){alert("Product name is required");return;}
    setSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const record={user_id:user.id,name:form.name.trim(),description:form.description||null,hsn_code:form.hsn_code||null,unit:form.unit||"pcs",selling_price:parseFloat(form.selling_price)||0,purchase_price:parseFloat(form.purchase_price)||0,gst_rate:parseFloat(form.gst_rate)||18,stock_qty:parseFloat(form.stock_qty)||0,low_stock_alert:parseFloat(form.low_stock_alert)||5,updated_at:new Date().toISOString()};
    if(editId){
      const{error}=await supabase.from("products").update(record).eq("id",editId).eq("user_id",user.id);
      if(!error)setProducts(p=>p.map(x=>x.id===editId?{...x,...record,id:editId}:x).sort((a,b)=>a.name.localeCompare(b.name)));
      else alert("Could not update.");
    }else{
      const{data,error}=await supabase.from("products").insert(record).select().single();
      if(!error)setProducts(p=>[...p,data].sort((a,b)=>a.name.localeCompare(b.name)));
      else alert("Could not save.");
    }
    setShowForm(false);setEditId(null);setForm(EMPTY);setSaving(false);
  }

  async function deleteProduct(id){
    if(!confirm("Delete this product? Stock history will also be deleted."))return;
    setDeleting(id);
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from("products").delete().eq("id",id).eq("user_id",user.id);
    setProducts(p=>p.filter(x=>x.id!==id));setDeleting(null);
  }

  async function adjustStock(){
    if(!adjQty||parseFloat(adjQty)<=0){alert("Enter a valid quantity");return;}
    setAdjSaving(true);
    const{data:{user}}=await supabase.auth.getUser();
    const qty=parseFloat(adjQty);
    const product=adjModal;
    const newQty=adjType==="stock_in"?parseFloat(product.stock_qty)+qty:Math.max(0,parseFloat(product.stock_qty)-qty);
    const{error}=await supabase.from("products").update({stock_qty:newQty,updated_at:new Date().toISOString()}).eq("id",product.id).eq("user_id",user.id);
    if(!error){
      await supabase.from("stock_movements").insert({user_id:user.id,product_id:product.id,type:adjType,quantity:qty,notes:adjNote||null,ref_no:`ADJ-${Date.now()}`});
      setProducts(p=>p.map(x=>x.id===product.id?{...x,stock_qty:newQty}:x));
      setAdjModal(null);setAdjQty("");setAdjNote("");
    }else alert("Could not update stock.");
    setAdjSaving(false);
  }

  function openEdit(p){setForm({name:p.name||"",description:p.description||"",hsn_code:p.hsn_code||"",unit:p.unit||"pcs",selling_price:String(p.selling_price||""),purchase_price:String(p.purchase_price||""),gst_rate:String(p.gst_rate||"18"),stock_qty:String(p.stock_qty||"0"),low_stock_alert:String(p.low_stock_alert||"5")});setEditId(p.id);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}

  const filtered=products
    .filter(p=>{
      if(tab==="low")return parseFloat(p.stock_qty)<=parseFloat(p.low_stock_alert)&&parseFloat(p.stock_qty)>0;
      if(tab==="out")return parseFloat(p.stock_qty)<=0;
      return true;
    })
    .filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||(p.hsn_code&&p.hsn_code.includes(search)));

  const lowCount =products.filter(p=>parseFloat(p.stock_qty)<=parseFloat(p.low_stock_alert)&&parseFloat(p.stock_qty)>0).length;
  const outCount =products.filter(p=>parseFloat(p.stock_qty)<=0).length;
  const totalValue=products.reduce((s,p)=>s+parseFloat(p.stock_qty)*parseFloat(p.purchase_price||0),0);

  if(loading)return(<main style={{minHeight:"100vh",background:"#020B18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}><style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{textAlign:"center"}}><div style={{width:44,height:44,border:"3px solid rgba(14,165,233,0.2)",borderTopColor:"#0EA5E9",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 14px"}}/><p style={{color:"#64748B",fontSize:13}}>Loading inventory...</p></div></main>);

  return(
    <main style={{minHeight:"100vh",background:"#020B18",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}::selection{background:rgba(14,165,233,0.3);color:#fff;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#020B18;}::-webkit-scrollbar-thumb{background:#0EA5E9;border-radius:4px;}
        input::placeholder{color:#334155!important;}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes formIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        .prod-card{transition:all 0.2s ease;animation:fadeUp 0.3s ease forwards;}
        .prod-card:hover{border-color:rgba(14,165,233,0.3)!important;background:rgba(14,165,233,0.04)!important;}
      `}</style>

      <Navbar/>

      <div style={{maxWidth:1000,margin:"0 auto",padding:"28px 20px 60px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,animation:"fadeUp 0.5s ease"}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:900,color:"#fff",margin:0,letterSpacing:-0.5}}>Inventory 📦</h1>
            <p style={{color:"#475569",fontSize:13,margin:"4px 0 0"}}>{products.length} products · Stock value ₹{fmt(totalValue)}</p>
          </div>
          <button onClick={()=>{setForm(EMPTY);setEditId(null);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});}}
            style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(14,165,233,0.3)",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            + Add Product
          </button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16,animation:"fadeUp 0.5s ease 0.05s both"}}>
          {[
            {label:"Total Products", value:products.length, color:"#0EA5E9",icon:"📦"},
            {label:"Low Stock",      value:lowCount,        color:"#F59E0B",icon:"⚠️"},
            {label:"Out of Stock",   value:outCount,        color:"#EF4444",icon:"❌"},
            {label:"Stock Value",    value:`₹${fmt(totalValue)}`,color:"#10B981",icon:"💰"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1}}>{s.label}</span><span style={{fontSize:18}}>{s.icon}</span></div>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add/Edit Form */}
        {showForm&&(
          <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(20px)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:18,padding:22,marginBottom:16,animation:"formIn 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{color:"#E2E8F0",fontSize:15,fontWeight:700,margin:0}}>{editId?"Edit Product":"Add New Product"}</h2>
              <button onClick={()=>{setShowForm(false);setEditId(null);setForm(EMPTY);}} style={{background:"none",border:"none",color:"#64748B",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <GField label="Product Name *" name="name" placeholder="e.g. A4 Paper Ream" value={form.name} onChange={update} style={{gridColumn:"span 2"}}/>
              <GField label="HSN Code" name="hsn_code" placeholder="e.g. 4802" value={form.hsn_code} onChange={update}/>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>Unit</label>
                <select value={form.unit} onChange={e=>update("unit",e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}>
                  {UNITS.map(u=><option key={u} value={u} style={{background:"#0F172A"}}>{u}</option>)}
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2}}>GST Rate</label>
                <select value={form.gst_rate} onChange={e=>update("gst_rate",e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit"}}>
                  {GST_RATES.map(r=><option key={r} value={r} style={{background:"#0F172A"}}>{r}%</option>)}
                </select>
              </div>
              <GField label="Selling Price ₹" name="selling_price" type="number" placeholder="0.00" value={form.selling_price} onChange={update}/>
              <GField label="Purchase Price ₹" name="purchase_price" type="number" placeholder="0.00" value={form.purchase_price} onChange={update}/>
              <GField label="Opening Stock" name="stock_qty" type="number" placeholder="0" value={form.stock_qty} onChange={update}/>
              <GField label="Low Stock Alert at" name="low_stock_alert" type="number" placeholder="5" value={form.low_stock_alert} onChange={update}/>
            </div>
            <GField label="Description (optional)" name="description" placeholder="Brief description..." value={form.description} onChange={update} style={{marginTop:12}}/>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={saveProduct} disabled={saving}
                style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:saving?"rgba(14,165,233,0.3)":"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",transition:"all 0.2s"}}>
                {saving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Saving...</>:(editId?"Save Changes":"Add Product")}
              </button>
              <button onClick={()=>{setShowForm(false);setEditId(null);setForm(EMPTY);}} style={{padding:"12px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748B",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center",animation:"fadeUp 0.5s ease 0.1s both"}}>
          <div style={{display:"flex",gap:6}}>
            {[{v:"all",l:`All (${products.length})`},{v:"low",l:`Low Stock (${lowCount})`},{v:"out",l:`Out of Stock (${outCount})`}].map(t=>(
              <button key={t.v} onClick={()=>setTab(t.v)}
                style={{padding:"7px 14px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit",background:tab===t.v?(t.v==="out"?"linear-gradient(135deg,#DC2626,#EF4444)":t.v==="low"?"linear-gradient(135deg,#D97706,#F59E0B)":"linear-gradient(135deg,#0284C7,#0EA5E9)"):"rgba(255,255,255,0.06)",color:tab===t.v?"#fff":"#64748B"}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <svg style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or HSN..."
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"9px 12px 9px 32px",color:"#E2E8F0",fontSize:13,outline:"none",fontFamily:"inherit",transition:"border 0.2s"}}
              onFocus={e=>e.target.style.borderColor="rgba(14,165,233,0.5)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}/>
          </div>
        </div>

        {/* Product list */}
        {products.length===0?(
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:56,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>📦</div>
            <h2 style={{color:"#E2E8F0",fontSize:18,fontWeight:800,margin:"0 0 8px"}}>No products yet</h2>
            <p style={{color:"#64748B",fontSize:13,marginBottom:18}}>Add your products to track inventory</p>
            <button onClick={()=>{setForm(EMPTY);setEditId(null);setShowForm(true);}} style={{background:"linear-gradient(135deg,#0EA5E9,#0284C7)",color:"#fff",border:"none",borderRadius:12,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Add First Product</button>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
            {filtered.map((p,i)=>{
              const stock=parseFloat(p.stock_qty);
              const alert=parseFloat(p.low_stock_alert);
              const isOut=stock<=0;
              const isLow=stock<=alert&&stock>0;
              return(
                <div key={p.id} className="prod-card"
                  style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${isOut?"rgba(239,68,68,0.25)":isLow?"rgba(245,158,11,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:14,padding:"16px 18px",animationDelay:`${i*30}ms`}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{color:"#E2E8F0",fontWeight:800,fontSize:14,margin:"0 0 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {p.hsn_code&&<span style={{background:"rgba(14,165,233,0.1)",color:"#38BDF8",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20}}>HSN: {p.hsn_code}</span>}
                        <span style={{background:"rgba(255,255,255,0.06)",color:"#94A3B8",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20}}>{p.unit} · {p.gst_rate}% GST</span>
                        {isOut&&<span style={{background:"rgba(239,68,68,0.15)",color:"#EF4444",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20}}>OUT OF STOCK</span>}
                        {isLow&&!isOut&&<span style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20}}>LOW STOCK</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:2}}>Stock</div>
                      <div style={{fontSize:16,fontWeight:900,color:isOut?"#EF4444":isLow?"#F59E0B":"#10B981"}}>{stock} <span style={{fontSize:10,fontWeight:400}}>{p.unit}</span></div>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:2}}>Sell Price</div>
                      <div style={{fontSize:14,fontWeight:800,color:"#0EA5E9"}}>₹{fmt(p.selling_price)}</div>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:2}}>Buy Price</div>
                      <div style={{fontSize:14,fontWeight:800,color:"#7C3AED"}}>₹{fmt(p.purchase_price)}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setAdjModal(p);setAdjQty("");setAdjType("stock_in");setAdjNote("");}}
                      style={{flex:1,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",color:"#10B981",borderRadius:9,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(16,185,129,0.18)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(16,185,129,0.1)"}>
                      ± Adjust Stock
                    </button>
                    <button onClick={()=>openEdit(p)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#E2E8F0",borderRadius:9,padding:"8px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
                    <button onClick={()=>deleteProduct(p.id)} disabled={deleting===p.id} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#EF4444",borderRadius:9,padding:"8px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      {deleting===p.id?<svg style={{animation:"spin 0.8s linear infinite"}} width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/></svg>:"🗑"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjModal&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0F172A",border:"1px solid rgba(14,165,233,0.3)",borderRadius:20,padding:28,width:"100%",maxWidth:420,animation:"modalIn 0.25s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{color:"#E2E8F0",fontSize:16,fontWeight:700,margin:0}}>Adjust Stock — {adjModal.name}</h2>
              <button onClick={()=>setAdjModal(null)} style={{background:"none",border:"none",color:"#64748B",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"#64748B",fontSize:13}}>Current Stock</span>
              <span style={{color:"#E2E8F0",fontWeight:700,fontSize:13}}>{adjModal.stock_qty} {adjModal.unit}</span>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[{v:"stock_in",l:"Stock In +",c:"#10B981"},{v:"stock_out",l:"Stock Out −",c:"#EF4444"}].map(t=>(
                <button key={t.v} onClick={()=>setAdjType(t.v)}
                  style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${adjType===t.v?t.c+"66":"rgba(255,255,255,0.1)"}`,background:adjType===t.v?t.c+"22":"transparent",color:adjType===t.v?t.c:"#64748B",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                  {t.l}
                </button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"block",marginBottom:5}}>Quantity ({adjModal.unit})</label>
                <input type="number" value={adjQty} onChange={e=>setAdjQty(e.target.value)} min="0.01" step="0.01" placeholder="Enter quantity"
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"12px 14px",color:"#E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:1.2,display:"block",marginBottom:5}}>Note (optional)</label>
                <input type="text" value={adjNote} onChange={e=>setAdjNote(e.target.value)} placeholder="e.g. Received from supplier"
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"12px 14px",color:"#E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            {adjQty&&parseFloat(adjQty)>0&&(
              <div style={{marginTop:12,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#64748B",fontSize:13}}>New stock will be</span>
                <span style={{color:"#10B981",fontWeight:700,fontSize:13}}>
                  {adjType==="stock_in"?parseFloat(adjModal.stock_qty)+parseFloat(adjQty):Math.max(0,parseFloat(adjModal.stock_qty)-parseFloat(adjQty))} {adjModal.unit}
                </span>
              </div>
            )}
            <button onClick={adjustStock} disabled={adjSaving}
              style={{width:"100%",marginTop:16,padding:"13px",borderRadius:12,border:"none",background:adjSaving?"rgba(14,165,233,0.3)":adjType==="stock_in"?"linear-gradient(135deg,#059669,#10B981)":"linear-gradient(135deg,#DC2626,#EF4444)",color:"#fff",fontWeight:700,fontSize:14,cursor:adjSaving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
              {adjSaving?<><svg style={{animation:"spin 0.8s linear infinite"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Updating...</>:adjType==="stock_in"?"Confirm Stock In":"Confirm Stock Out"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
