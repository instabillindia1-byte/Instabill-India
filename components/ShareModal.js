"use client";
import { useState } from "react";

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

// ── Build WhatsApp message ────────────────────────────
function buildWhatsAppMsg(inv, type = "invoice") {
  const amount = `Rs.${fmt(inv.total_amount)}`;
  if (type === "reminder") {
    return (
      `Hi ${inv.client_name},\n\n` +
      `This is a gentle reminder for your pending invoice.\n\n` +
      `📄 *Invoice Details*\n` +
      `Invoice No: ${inv.invoice_no}\n` +
      `Date: ${fmtDate(inv.invoice_date)}\n` +
      (inv.due_date ? `Due Date: ${fmtDate(inv.due_date)}\n` : "") +
      `Amount Due: *${amount}*\n\n` +
      `💳 *Pay via UPI*\n` +
      `UPI ID: ${inv.sender_upi}\n` +
      `(Open PhonePe / GPay / Paytm and pay)\n\n` +
      `Please let me know once paid.\n` +
      `Thank you!\n${inv.sender_name}`
    );
  }
  return (
    `Hi ${inv.client_name},\n\n` +
    `Please find your invoice details below:\n\n` +
    `📄 *Invoice from ${inv.sender_name}*\n` +
    `Invoice No: ${inv.invoice_no}\n` +
    `Date: ${fmtDate(inv.invoice_date)}\n` +
    (inv.due_date ? `Due Date: ${fmtDate(inv.due_date)}\n` : "") +
    `Service: ${inv.service_desc || "Professional Services"}\n` +
    `Amount: *${amount}* (incl. GST)\n\n` +
    `💳 *Pay via UPI*\n` +
    `UPI ID: ${inv.sender_upi}\n` +
    `(Open PhonePe / GPay / Paytm / BHIM)\n\n` +
    `PDF invoice is attached. Please check and confirm payment.\n` +
    `Thank you!\n${inv.sender_name}`
  );
}

// ── Build email subject + body ────────────────────────
function buildEmailContent(inv, type = "invoice") {
  const amount = `Rs.${fmt(inv.total_amount)}`;
  if (type === "reminder") {
    return {
      subject: `Payment Reminder — Invoice ${inv.invoice_no} — ${amount}`,
      body:
        `Hi ${inv.client_name},\n\n` +
        `This is a friendly reminder for your pending invoice.\n\n` +
        `Invoice No: ${inv.invoice_no}\n` +
        `Date: ${fmtDate(inv.invoice_date)}\n` +
        (inv.due_date ? `Due Date: ${fmtDate(inv.due_date)}\n` : "") +
        `Amount Due: ${amount}\n\n` +
        `Please pay via UPI: ${inv.sender_upi}\n` +
        `(Open PhonePe / GPay / Paytm / BHIM)\n\n` +
        `Please find the invoice PDF attached.\n\n` +
        `Thank you!\n${inv.sender_name}`,
    };
  }
  return {
    subject: `Invoice ${inv.invoice_no} from ${inv.sender_name} — ${amount}`,
    body:
      `Hi ${inv.client_name},\n\n` +
      `Please find your invoice details below.\n\n` +
      `Invoice No: ${inv.invoice_no}\n` +
      `Date: ${fmtDate(inv.invoice_date)}\n` +
      (inv.due_date ? `Due Date: ${fmtDate(inv.due_date)}\n` : "") +
      `Service: ${inv.service_desc || "Professional Services"}\n` +
      `Amount: ${amount} (incl. GST)\n\n` +
      `Pay via UPI: ${inv.sender_upi}\n` +
      `(Open PhonePe / GPay / Paytm / BHIM)\n\n` +
      `Please find the invoice PDF attached to this email.\n\n` +
      `Thank you!\n${inv.sender_name}`,
  };
}

// ── Clean phone number ────────────────────────────────
function cleanPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return digits;
}

// ══════════════════════════════════════════════════════
// SHARE MODAL
// ══════════════════════════════════════════════════════
export function ShareModal({ inv, type = "invoice", onClose, onMarkPaid, showMarkPaid = false }) {
  const [copied,   setCopied]   = useState(false);
  const [tab,      setTab]      = useState("whatsapp"); // whatsapp | email

  const waMsg    = buildWhatsAppMsg(inv, type);
  const { subject, body } = buildEmailContent(inv, type);
  const phone    = cleanPhone(inv.client_phone);
  const waUrl    = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
  const mailUrl  = `mailto:${inv.client_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function copyText() {
    navigator.clipboard.writeText(waMsg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const isReminder = type === "reminder";
  const accentColor = isReminder ? "#F59E0B" : "#10B981";
  const title = isReminder ? "Send Reminder" : "Share Invoice";
  const emoji = isReminder ? "⏰" : "🎉";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)", zIndex: 1000,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto",
        background: "#0D1829",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24, zIndex: 1001,
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        animation: "modalSlide 0.25s ease",
        fontFamily: "'Inter',sans-serif",
      }}>
        <style>{`
          @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes modalSlide { from{opacity:0;transform:translate(-50%,-54%)} to{opacity:1;transform:translate(-50%,-50%)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          .share-tab-btn { transition: all 0.2s; border: none; cursor: pointer; font-family: inherit; }
          .share-action  { transition: all 0.2s ease; cursor: pointer; border: none; font-family: inherit; }
          .share-action:hover { transform: translateY(-2px); filter: brightness(1.08); }
          .share-action:active { transform: scale(0.97); }
        `}</style>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
          borderBottom: `1px solid ${accentColor}22`,
          padding: "20px 24px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
            </div>
            <p style={{ color: "#64748B", fontSize: 12, margin: "4px 0 0 34px" }}>
              Invoice {inv.invoice_no} · Rs.{fmt(inv.total_amount)}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#64748B", fontSize: 18, cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* PDF reminder banner */}
          <div style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <p style={{ color: "#38BDF8", fontSize: 12, fontWeight: 600, margin: 0 }}>
              PDF downloaded to your device — attach it manually after opening WhatsApp or Email
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 5 }}>
            {[
              { v: "whatsapp", l: "💬 WhatsApp", hasContact: !!phone },
              { v: "email",    l: "📧 Email",    hasContact: !!inv.client_email },
            ].map(t => (
              <button key={t.v} className="share-tab-btn"
                onClick={() => setTab(t.v)}
                style={{
                  padding: "11px", borderRadius: 10,
                  background: tab === t.v ? (t.v === "whatsapp" ? "linear-gradient(135deg,#25D366,#128C7E)" : "linear-gradient(135deg,#0EA5E9,#0284C7)") : "transparent",
                  color: tab === t.v ? "#fff" : "#64748B",
                  fontSize: 13, fontWeight: 700,
                  boxShadow: tab === t.v ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
                }}>
                {t.l}
                {!t.hasContact && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(239,68,68,0.2)", color: "#EF4444", padding: "1px 6px", borderRadius: 10 }}>no {t.v === "whatsapp" ? "phone" : "email"}</span>}
              </button>
            ))}
          </div>

          {/* WhatsApp tab */}
          {tab === "whatsapp" && (
            <div>
              {/* Message preview */}
              <div style={{ background: "#075E54", borderRadius: 16, padding: 16, marginBottom: 16, position: "relative" }}>
                <div style={{ background: "#DCF8C6", borderRadius: "12px 12px 4px 12px", padding: "12px 14px", maxWidth: "85%", marginLeft: "auto" }}>
                  <pre style={{ color: "#1a1a1a", fontSize: 12, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6 }}>{waMsg}</pre>
                </div>
                <div style={{ textAlign: "right", color: "rgba(220,248,198,0.7)", fontSize: 11, marginTop: 4 }}>
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>

              {!phone && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>
                    ⚠️ No phone number saved for this client. Add it in the{" "}
                    <a href="/clients" style={{ color: "#F87171" }}>Client Address Book</a>{" "}
                    to open WhatsApp directly to their number.
                  </p>
                </div>
              )}

              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="share-action"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#25D366,#128C7E)", color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: "0 4px 20px rgba(37,211,102,0.35)", marginBottom: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {phone ? `Open WhatsApp — Send to ${inv.client_name}` : "Open WhatsApp (no number)"}
              </a>

              <button onClick={copyText} className="share-action"
                style={{ width: "100%", padding: "11px", borderRadius: 12, background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#10B981" : "#94A3B8", fontSize: 13, fontWeight: 600 }}>
                {copied ? "✓ Copied to clipboard!" : "📋 Copy message text"}
              </button>
            </div>
          )}

          {/* Email tab */}
          {tab === "email" && (
            <div>
              {/* Email preview */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "#64748B", width: 40 }}>To:</span>
                    <span style={{ color: inv.client_email ? "#38BDF8" : "#EF4444", fontWeight: 600 }}>{inv.client_email || "No email saved"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "#64748B", width: 40 }}>Sub:</span>
                    <span style={{ color: "#CBD5E1" }}>{subject}</span>
                  </div>
                </div>
                <div style={{ padding: "12px 16px", maxHeight: 160, overflowY: "auto" }}>
                  <pre style={{ color: "#94A3B8", fontSize: 11.5, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7 }}>{body}</pre>
                </div>
              </div>

              {!inv.client_email && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>
                    ⚠️ No email saved for this client.{" "}
                    <a href="/clients" style={{ color: "#F87171" }}>Add in Address Book →</a>
                  </p>
                </div>
              )}

              <a href={mailUrl} className="share-action"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#0EA5E9,#0284C7)", color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none", boxShadow: "0 4px 20px rgba(14,165,233,0.35)", marginBottom: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Open Email App — Send to Client
              </a>

              <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ color: "#F59E0B", fontSize: 11.5, fontWeight: 600, margin: "0 0 3px" }}>📎 Attach PDF</p>
                <p style={{ color: "#64748B", fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  After your email app opens, click the attachment icon (📎) and select the downloaded invoice PDF from your Downloads folder.
                </p>
              </div>
            </div>
          )}

          {/* Mark as Paid button */}
          {showMarkPaid && (
            <button onClick={onMarkPaid} className="share-action"
              style={{ width: "100%", marginTop: 16, padding: "13px", borderRadius: 12, background: "linear-gradient(135deg,#10B981,#059669)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Mark as Paid — Disable Reminders
            </button>
          )}

        </div>
      </div>
    </>
  );
}
