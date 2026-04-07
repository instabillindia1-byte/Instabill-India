export default function NotFound() {
  return (
    <main style={{ minHeight:"100vh", background:"#020B18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:"20px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:80, marginBottom:16, animation:"float 3s ease-in-out infinite" }}>⚡</div>
        <h1 style={{ fontSize:48, fontWeight:900, color:"#fff", margin:"0 0 8px", letterSpacing:-2 }}>404</h1>
        <p style={{ color:"#64748B", fontSize:18, margin:"0 0 6px", fontWeight:600 }}>Page not found</p>
        <p style={{ color:"#334155", fontSize:14, margin:"0 0 32px" }}>This page does not exist or was moved.</p>
        <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
          <a href="/invoice" style={{ background:"linear-gradient(135deg,#0EA5E9,#0284C7)", color:"#fff", fontWeight:700, fontSize:14, padding:"12px 24px", borderRadius:12, textDecoration:"none" }}>Create Invoice ⚡</a>
          <a href="/"        style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#94A3B8", fontWeight:600, fontSize:14, padding:"12px 24px", borderRadius:12, textDecoration:"none" }}>Go Home</a>
        </div>
        <p style={{ color:"#1E293B", fontSize:11, marginTop:40 }}>InstaBill India · instabillindia.com</p>
      </div>
    </main>
  );
}
