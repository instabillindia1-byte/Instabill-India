// ══════════════════════════════════════════════════════════════
// InstaBill India — Email Route (Gmail SMTP via Nodemailer)
// WHY: Resend sandbox only sends to your own email without a domain.
//      Gmail SMTP works for any recipient immediately, 500 emails/day free.
//
// SETUP (one time):
//   1. Go to your Gmail → Settings → Security → 2-Step Verification → ON
//   2. Then go to: myaccount.google.com/apppasswords
//   3. Select "Mail" + "Windows Computer" → Generate
//   4. Copy the 16-char password (e.g. "abcd efgh ijkl mnop")
//   5. Add to Vercel env vars:
//        GMAIL_USER = instabillindia1@gmail.com
//        GMAIL_PASS = abcdefghijklmnop  (no spaces)
// ══════════════════════════════════════════════════════════════

import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// ── Rate limiter ──────────────────────────────────────
const rateMap = new Map();
function isRateLimited(ip) {
  const now  = Date.now();
  const data = rateMap.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > data.resetAt) { data.count = 0; data.resetAt = now + 60_000; }
  data.count++;
  rateMap.set(ip, data);
  return data.count > 10;
}

// ── Input sanitizer ───────────────────────────────────
function clean(s, max = 200) {
  return String(s || "").replace(/[<>'"]/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim().substring(0, max);
}

function fmt(n) {
  return parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

// ── Gmail transporter ─────────────────────────────────
// Created fresh per request to avoid stale connections on serverless
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // App Password — not your real password
    },
  });
}

// ── EMAIL TEMPLATES ───────────────────────────────────

function pendingHTML(inv) {
  const upiLink = `upi://pay?pa=${encodeURIComponent(clean(inv.sender_upi))}&pn=${encodeURIComponent(clean(inv.sender_name))}&am=${parseFloat(inv.total_amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent("Invoice " + clean(inv.invoice_no))}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice from ${clean(inv.sender_name)}</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:#0F172A;padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="color:#ffffff;font-size:22px;font-weight:900;font-family:Arial;">Insta<span style="color:#0EA5E9;">Bill</span></span>
        <span style="display:block;color:#64748B;font-size:11px;letter-spacing:2px;margin-top:2px;">INDIA &middot; GST Invoicing</span>
      </td>
      <td style="text-align:right;">
        <span style="background:#F59E0B;color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;font-family:Arial;">INVOICE</span>
      </td>
    </tr></table>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px;">
    <p style="color:#1E293B;font-size:15px;margin:0 0 4px;font-family:Arial;">Hi <strong>${clean(inv.client_name)}</strong>,</p>
    <p style="color:#64748B;font-size:13px;margin:0 0 22px;font-family:Arial;">You have a new invoice from <strong>${clean(inv.sender_name)}</strong>. Please review and pay at your earliest convenience.</p>

    <!-- Invoice details box -->
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:22px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial;font-size:13px;">
        <tr><td style="color:#64748B;padding:5px 0;">Invoice No</td><td style="text-align:right;font-weight:700;color:#1E293B;">${clean(inv.invoice_no)}</td></tr>
        <tr><td style="color:#64748B;padding:5px 0;">Date</td><td style="text-align:right;color:#1E293B;">${fmtDate(inv.invoice_date)}</td></tr>
        ${inv.due_date ? `<tr><td style="color:#64748B;padding:5px 0;">Due Date</td><td style="text-align:right;color:#EF4444;font-weight:700;">${fmtDate(inv.due_date)}</td></tr>` : ""}
        <tr><td style="color:#64748B;padding:5px 0;vertical-align:top;">Service</td><td style="text-align:right;color:#1E293B;">${clean(inv.service_desc, 120)}</td></tr>
        <tr style="border-top:2px solid #E2E8F0;">
          <td style="color:#0F172A;font-weight:900;font-size:15px;padding-top:14px;font-family:Arial;">Total Amount</td>
          <td style="text-align:right;color:#0EA5E9;font-weight:900;font-size:22px;padding-top:14px;font-family:Arial;">&#8377;${fmt(inv.total_amount)}</td>
        </tr>
      </table>
    </div>

    <!-- Pay via UPI -->
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:22px;text-align:center;">
      <p style="color:#1E3A8A;font-size:14px;font-weight:700;margin:0 0 6px;font-family:Arial;">&#128241; Pay via UPI</p>
      <p style="color:#1D4ED8;font-size:18px;font-weight:700;margin:0 0 6px;font-family:Arial;">${clean(inv.sender_upi)}</p>
      <p style="color:#64748B;font-size:12px;margin:0 0 14px;font-family:Arial;">Open PhonePe / GPay / Paytm / BHIM and pay using the UPI ID above</p>
      <a href="${upiLink}" style="display:inline-block;background:#1D4ED8;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:10px;text-decoration:none;font-family:Arial;">&#9889; Pay &#8377;${fmt(inv.total_amount)} Now</a>
    </div>

    ${inv.notes ? `<div style="background:#FFFBEB;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px;"><p style="color:#78350F;font-size:12px;margin:0;font-family:Arial;"><strong>Note:</strong> ${clean(inv.notes, 300)}</p></div>` : ""}

    <p style="color:#94A3B8;font-size:11px;font-family:Arial;margin:0;">If you have any questions, please contact <strong>${clean(inv.sender_name)}</strong> directly.</p>
  </div>

  <!-- Footer -->
  <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center;">
    <p style="color:#94A3B8;font-size:11px;margin:0;font-family:Arial;">Generated by <strong>InstaBill India</strong> &middot; instabillindia.com &middot; GST Invoicing for Indian Freelancers</p>
  </div>
</div>
</body></html>`;
}

function paidHTML(inv) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0F172A;padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="color:#fff;font-size:22px;font-weight:900;">Insta<span style="color:#0EA5E9;">Bill</span></span></td>
      <td style="text-align:right;"><span style="background:#10B981;color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;">&#10003; PAYMENT RECEIVED</span></td>
    </tr></table>
  </div>
  <div style="padding:32px;text-align:center;">
    <div style="font-size:52px;margin-bottom:12px;">&#127881;</div>
    <h2 style="color:#10B981;font-size:22px;margin:0 0 8px;font-family:Arial;">Payment Confirmed!</h2>
    <p style="color:#64748B;font-size:13px;margin:0 0 24px;font-family:Arial;">Thank you <strong>${clean(inv.client_name)}</strong>! Your payment has been received.</p>
    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:20px;text-align:left;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial;font-size:13px;">
        <tr><td style="color:#166534;padding:5px 0;">Invoice No</td><td style="text-align:right;font-weight:700;color:#14532D;">${clean(inv.invoice_no)}</td></tr>
        <tr><td style="color:#166534;padding:5px 0;">Paid To</td><td style="text-align:right;color:#14532D;">${clean(inv.sender_name)}</td></tr>
        <tr><td style="color:#166534;font-weight:900;font-size:15px;padding-top:10px;">Amount Paid</td><td style="text-align:right;color:#10B981;font-weight:900;font-size:22px;padding-top:10px;">&#8377;${fmt(inv.total_amount)}</td></tr>
      </table>
    </div>
  </div>
  <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center;">
    <p style="color:#94A3B8;font-size:11px;margin:0;font-family:Arial;">Generated by InstaBill India &middot; instabillindia.com</p>
  </div>
</div></body></html>`;
}

function reminderHTML(inv) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0F172A;padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="color:#fff;font-size:22px;font-weight:900;">Insta<span style="color:#0EA5E9;">Bill</span></span></td>
      <td style="text-align:right;"><span style="background:#F59E0B;color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;">&#9201; REMINDER</span></td>
    </tr></table>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#1E293B;font-size:15px;margin:0 0 4px;font-family:Arial;">Hi <strong>${clean(inv.client_name)}</strong>,</p>
    <p style="color:#64748B;font-size:13px;margin:0 0 22px;font-family:Arial;">Friendly reminder for your invoice from <strong>${clean(inv.sender_name)}</strong>.</p>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial;font-size:13px;">
        <tr><td style="color:#92400E;padding:5px 0;">Invoice No</td><td style="text-align:right;font-weight:700;color:#78350F;">${clean(inv.invoice_no)}</td></tr>
        ${inv.due_date ? `<tr><td style="color:#92400E;padding:5px 0;">Due Date</td><td style="text-align:right;color:#EF4444;font-weight:700;">${fmtDate(inv.due_date)}</td></tr>` : ""}
        <tr><td style="color:#92400E;font-weight:900;font-size:15px;padding-top:10px;">Amount Due</td><td style="text-align:right;color:#F59E0B;font-weight:900;font-size:22px;padding-top:10px;">&#8377;${fmt(inv.total_amount)}</td></tr>
      </table>
    </div>
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;text-align:center;">
      <p style="color:#1E3A8A;font-size:13px;font-weight:700;margin:0 0 4px;font-family:Arial;">Pay via UPI: ${clean(inv.sender_upi)}</p>
      <p style="color:#64748B;font-size:11px;margin:0;font-family:Arial;">PhonePe / GPay / Paytm / BHIM</p>
    </div>
  </div>
  <div style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center;">
    <p style="color:#94A3B8;font-size:11px;margin:0;font-family:Arial;">Generated by InstaBill India &middot; instabillindia.com</p>
  </div>
</div></body></html>`;
}

// ── MAIN HANDLER ──────────────────────────────────────
export async function POST(request) {
  try {
    // Rate limit
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      return Response.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    // Auth check — verify user is signed in
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // Parse body
    let body;
    try { body = await request.json(); }
    catch { return Response.json({ success: false, error: "Invalid request body" }, { status: 400 }); }

    const { type, invoice: inv } = body;
    if (!type || !inv) return Response.json({ success: false, error: "Missing type or invoice" }, { status: 400 });

    // Validate recipient email
    const toEmail = clean(inv.client_email || "", 200);
    if (!toEmail || !toEmail.includes("@") || !toEmail.includes(".")) {
      return Response.json({ success: false, error: "Invalid email address" }, { status: 400 });
    }

    // Build email
    let subject = "";
    let html    = "";
    switch (type) {
      case "pending":
        subject = `Invoice ${clean(inv.invoice_no)} from ${clean(inv.sender_name)} — Rs.${fmt(inv.total_amount)}`;
        html    = pendingHTML(inv);
        break;
      case "paid":
        subject = `Payment Confirmed — Invoice ${clean(inv.invoice_no)}`;
        html    = paidHTML(inv);
        break;
      case "reminder":
        subject = `Payment Reminder — Invoice ${clean(inv.invoice_no)} — Rs.${fmt(inv.total_amount)}`;
        html    = reminderHTML(inv);
        break;
      default:
        return Response.json({ success: false, error: "Unknown email type" }, { status: 400 });
    }

    // Check Gmail credentials configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.error("GMAIL_USER or GMAIL_PASS not set in environment variables");
      return Response.json({ success: false, error: "Email not configured on server" }, { status: 500 });
    }

    // Send via Gmail SMTP
    const transporter = createTransporter();
    const mailOptions = {
      from:    `"InstaBill India" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${toEmail} (type: ${type})`);
    return Response.json({ success: true });

  } catch (err) {
    console.error("Email route error:", err.message);
    // Return success:false with specific error for debugging
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
