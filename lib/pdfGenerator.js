// ═══════════════════════════════════════════════════════════
// InstaBill India — Premium PDF Generator
// WHITE professional design — prints perfectly, looks great on screen
// ═══════════════════════════════════════════════════════════

import { jsPDF } from "jspdf";
import QRCode    from "qrcode";

const C = {
  navy:     [15,  23,  42],
  navyMid:  [30,  41,  59],
  cyan:     [14,  165, 233],
  cyanDark: [2,   132, 199],
  cyanPale: [224, 242, 254],
  gold:     [245, 158, 11],
  goldDark: [180, 115,  0],
  goldPale: [254, 243, 199],
  green:    [16,  185, 129],
  greenPale:[209, 250, 229],
  body:     [30,  41,  59],
  muted:    [100, 116, 139],
  rowAlt:   [248, 250, 252],
  border:   [226, 232, 240],
  white:    [255, 255, 255],
};

function safe(s)   { return String(s || "").replace(/[\x00-\x1F\x7F]/g, "").trim(); }
function fmt(n)    { return parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function words(n) {
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
    "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  n = Math.floor(n);
  if (!n) return "Zero";
  if (n < 20) return a[n];
  if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " "+a[n%10] : "");
  if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100 ? " "+words(n%100) : "");
  if (n < 1e5)  return words(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " "+words(n%1000) : "");
  if (n < 1e7)  return words(Math.floor(n/1e5)) + " Lakh" + (n%1e5 ? " "+words(n%1e5) : "");
  return words(Math.floor(n/1e7)) + " Crore" + (n%1e7 ? " "+words(n%1e7) : "");
}

async function loadLogo(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateInvoicePDF({
  senderName, senderGSTIN, senderAddress, senderState, senderUPI,
  clientName, clientGSTIN, clientAddress, clientState, clientEmail,
  invoiceNo, invoiceDate, dueDate,
  items,   // [{ description, sacCode, qty, rate, gstRate }]
  notes,
  logoUrl,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 14, CW = W - M * 2;

  // ── CALC ──────────────────────────────────────────────
  const intra = senderState === clientState;
  let sub = 0, gstTotal = 0, cgst = 0, sgst = 0, igst = 0;
  const rows = items.filter(i => i.description?.trim() && parseFloat(i.rate) > 0).map(item => {
    const base = parseFloat(item.qty || 1) * parseFloat(item.rate || 0);
    const gst  = parseFloat(((base * parseFloat(item.gstRate || 0)) / 100).toFixed(2));
    const tot  = parseFloat((base + gst).toFixed(2));
    sub += base; gstTotal += gst;
    if (intra) { cgst += gst/2; sgst += gst/2; } else igst += gst;
    return { ...item, base: parseFloat(base.toFixed(2)), gst, tot };
  });
  sub = parseFloat(sub.toFixed(2));
  gstTotal = parseFloat(gstTotal.toFixed(2));
  cgst = parseFloat(cgst.toFixed(2));
  sgst = parseFloat(sgst.toFixed(2));
  igst = parseFloat(igst.toFixed(2));
  const grand = parseFloat((sub + gstTotal).toFixed(2));

  // ── WHITE PAGE ────────────────────────────────────────
  doc.setFillColor(...C.white);
  doc.rect(0, 0, W, 297, "F");

  // ════════════════════════════════════════════════════
  // HEADER — Navy bar with cyan accent stripe
  // ════════════════════════════════════════════════════
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 44, "F");
  doc.setFillColor(...C.cyan);
  doc.rect(0, 41, W, 3, "F");

  // Logo or brand
  const logo64 = logoUrl ? await loadLogo(logoUrl) : null;
  if (logo64) {
    doc.addImage(logo64, "PNG", M, 7, 46, 26, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.setTextColor(...C.white);    doc.text("Insta", M, 22);
    doc.setTextColor(...C.cyan);     doc.text("Bill", M + 24, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("INDIA  ·  GST Invoicing & UPI Payments", M, 30);
  }

  // Invoice label + meta (right)
  doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.setTextColor(...C.white);
  doc.text("TAX INVOICE", W - M, 17, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`No: ${safe(invoiceNo)}`,    W - M, 25, { align: "right" });
  doc.text(`Date: ${safe(invoiceDate)}`,W - M, 31, { align: "right" });
  if (dueDate) doc.text(`Due: ${safe(dueDate)}`, W - M, 37, { align: "right" });

  let y = 52;

  // ════════════════════════════════════════════════════
  // FROM / TO PANELS
  // ════════════════════════════════════════════════════
  const panW = (CW - 6) / 2;

  // FROM
  doc.setFillColor(...C.cyanPale);
  doc.roundedRect(M, y, panW, 36, 2, 2, "F");
  doc.setDrawColor(...C.cyan); doc.setLineWidth(0.4);
  doc.roundedRect(M, y, panW, 36, 2, 2, "S");
  // "FROM" pill
  doc.setFillColor(...C.cyan);
  doc.roundedRect(M + 2, y + 2, 20, 6, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
  doc.setTextColor(...C.white);
  doc.text("FROM", M + 12, y + 6.2, { align: "center" });
  // Content
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.setTextColor(...C.body);
  doc.text(safe(senderName).substring(0, 28), M + 4, y + 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  if (senderGSTIN) doc.text(`GSTIN: ${safe(senderGSTIN).toUpperCase()}`, M + 4, y + 19);
  if (senderAddress) {
    doc.text(doc.splitTextToSize(safe(senderAddress), panW - 8).slice(0, 2), M + 4, y + 25);
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.setTextColor(...C.cyanDark);
  doc.text(safe(senderState), M + 4, y + 33);

  // TO
  const toX = M + panW + 6;
  doc.setFillColor(...C.goldPale);
  doc.roundedRect(toX, y, panW, 36, 2, 2, "F");
  doc.setDrawColor(...C.gold); doc.setLineWidth(0.4);
  doc.roundedRect(toX, y, panW, 36, 2, 2, "S");
  doc.setFillColor(...C.gold);
  doc.roundedRect(toX + 2, y + 2, 14, 6, 1, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
  doc.setTextColor(...C.white);
  doc.text("TO", toX + 9, y + 6.2, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
  doc.setTextColor(...C.body);
  doc.text(safe(clientName).substring(0, 28), toX + 4, y + 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  if (clientGSTIN) doc.text(`GSTIN: ${safe(clientGSTIN).toUpperCase()}`, toX + 4, y + 19);
  if (clientAddress) {
    doc.text(doc.splitTextToSize(safe(clientAddress), panW - 8).slice(0, 2), toX + 4, y + 25);
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.setTextColor(...C.goldDark);
  doc.text(safe(clientState), toX + 4, y + 33);

  y += 43;

  // ════════════════════════════════════════════════════
  // GST BADGE
  // ════════════════════════════════════════════════════
  const bc = intra ? C.green : C.cyan;
  const bp = intra ? C.greenPale : C.cyanPale;
  doc.setFillColor(...bp);
  doc.roundedRect(M, y, 118, 7, 1, 1, "F");
  doc.setDrawColor(...bc); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, 118, 7, 1, 1, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.setTextColor(...bc);
  doc.text(
    intra ? "INTRA-STATE SUPPLY  ·  CGST + SGST" : "INTER-STATE SUPPLY  ·  IGST",
    M + 4, y + 5
  );

  y += 11;

  // ════════════════════════════════════════════════════
  // ITEMS TABLE
  // ════════════════════════════════════════════════════
  // Column x positions + widths
  const cols = [
    { x: M,       w: 66 },  // Description
    { x: M + 67,  w: 26 },  // SAC
    { x: M + 94,  w: 18 },  // Qty
    { x: M + 113, w: 22 },  // Rate
    { x: M + 136, w: 16 },  // GST%
    { x: M + 153, w: CW - 153 + M - M }, // Total — fills rest
  ];
  cols[5].w = W - M - cols[5].x;

  const headers = ["Description", "SAC Code", "Qty", "Rate (Rs.)", "GST%", "Total (Rs.)"];

  // Header row
  doc.setFillColor(...C.navyMid);
  doc.rect(M, y, CW, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  headers.forEach((h, i) => {
    const right = i >= 2;
    doc.text(h, right ? cols[i].x + cols[i].w - 2 : cols[i].x + 2, y + 5.6, { align: right ? "right" : "left" });
  });
  y += 8;

  // Rows
  rows.forEach((row, idx) => {
    const rh = 9;
    doc.setFillColor(...(idx % 2 === 0 ? C.rowAlt : C.white));
    doc.rect(M, y, CW, rh, "F");

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(...C.body);

    // Description — truncate if needed
    const desc = doc.splitTextToSize(safe(row.description), cols[0].w - 3);
    doc.text(desc[0], cols[0].x + 2, y + 6.2);
    doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text(safe(row.sacCode || "—"), cols[1].x + 2, y + 6.2);

    doc.setFontSize(8.5); doc.setTextColor(...C.body);
    doc.text(String(row.qty || 1), cols[2].x + cols[2].w - 2, y + 6.2, { align: "right" });
    doc.text(fmt(row.rate),        cols[3].x + cols[3].w - 2, y + 6.2, { align: "right" });
    doc.setTextColor(...C.muted);
    doc.text(`${row.gstRate}%`,    cols[4].x + cols[4].w - 2, y + 6.2, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setTextColor(...C.cyanDark);
    doc.text(fmt(row.tot),         cols[5].x + cols[5].w - 2, y + 6.2, { align: "right" });

    y += rh;
  });

  // Table outer border
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.rect(M, y - rows.length * 9 - 8, CW, rows.length * 9 + 8);
  // Vertical dividers
  [1,2,3,4,5].forEach(i => {
    doc.line(cols[i].x, y - rows.length * 9 - 8, cols[i].x, y);
  });

  y += 5;

  // ════════════════════════════════════════════════════
  // TOTALS BOX
  // ════════════════════════════════════════════════════
  const tW = 74;
  const tX = W - M - tW;
  const tRows = intra
    ? [
        { label: "Subtotal",    val: `Rs. ${fmt(sub)}`,   muted: true  },
        { label: `CGST`,        val: `Rs. ${fmt(cgst)}`,  muted: false, color: C.green },
        { label: `SGST`,        val: `Rs. ${fmt(sgst)}`,  muted: false, color: C.green },
      ]
    : [
        { label: "Subtotal",    val: `Rs. ${fmt(sub)}`,   muted: true  },
        { label: "IGST",        val: `Rs. ${fmt(igst)}`,  muted: false, color: C.cyan  },
      ];

  const tH = tRows.length * 8 + 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.4);
  doc.roundedRect(tX, y, tW, tH, 2, 2, "FD");

  let ty2 = y + 7;
  tRows.forEach(tr => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(tr.label, tX + 5, ty2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(tr.color || C.body));
    doc.text(tr.val, tX + tW - 5, ty2, { align: "right" });
    ty2 += 8;
  });

  // Divider
  doc.setDrawColor(...C.border); doc.setLineWidth(0.4);
  doc.line(tX + 4, ty2, tX + tW - 4, ty2);
  ty2 += 3;

  // Grand total
  doc.setFillColor(...C.navy);
  doc.roundedRect(tX, ty2, tW, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.setTextColor(...C.white);
  doc.text("TOTAL", tX + 5, ty2 + 8);
  doc.setFontSize(10); doc.setTextColor(...C.gold);
  doc.text(`Rs. ${fmt(grand)}`, tX + tW - 5, ty2 + 8, { align: "right" });

  y = ty2 + 18;

  // Amount in words
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(`${words(grand)} Rupees Only`, M, y);
  y += 7;

  // Notes
  if (notes) {
    const nl = doc.splitTextToSize(`Note: ${safe(notes)}`, CW - 80);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(nl.slice(0, 3), M, y);
    y += nl.slice(0, 3).length * 4.5 + 4;
  }

  // ════════════════════════════════════════════════════
  // UPI QR + PAYMENT INFO
  // ════════════════════════════════════════════════════
  if (senderUPI && y < 232) {
    const upiStr = `upi://pay?pa=${senderUPI.trim()}&pn=${encodeURIComponent(safe(senderName))}&am=${grand.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Invoice " + safe(invoiceNo))}`;
    const qrUrl  = await QRCode.toDataURL(upiStr, { width: 200, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0F172A", light: "#FFFFFF" } });

    const qrBoxW = 62, qrBoxH = 60;
    doc.setFillColor(...C.cyanPale);
    doc.setDrawColor(...C.cyan); doc.setLineWidth(0.4);
    doc.roundedRect(M, y, qrBoxW, qrBoxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    doc.setTextColor(...C.cyanDark);
    doc.text("SCAN & PAY", M + qrBoxW/2, y + 6, { align: "center" });
    doc.addImage(qrUrl, "PNG", M + 5, y + 8, 52, 44);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text(safe(senderUPI), M + qrBoxW/2, y + 55.5, { align: "center" });

    // Payment info
    const piX = M + qrBoxW + 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setTextColor(...C.body);
    doc.text("Payment Details", piX, y + 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text("Pay via PhonePe / GPay / Paytm / BHIM", piX, y + 15);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.setTextColor(...C.body);
    doc.text(`Payee: ${safe(senderName).substring(0, 28)}`, piX, y + 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`UPI: ${safe(senderUPI)}`, piX, y + 31);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.setTextColor(...C.cyanDark);
    doc.text(`Rs. ${fmt(grand)}`, piX, y + 41);
  }

  // ════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════
  doc.setFillColor(...C.navy);
  doc.rect(0, 274, W, 23, "F");
  doc.setFillColor(...C.cyan);
  doc.rect(0, 274, W, 2.5, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated by InstaBill India  ·  instabillindia.com", W/2, 282, { align: "center" });
  doc.setTextColor(...C.cyan);
  doc.text("Computer-generated invoice — No physical signature required", W/2, 288, { align: "center" });
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, W/2, 293, { align: "center" });

  const filename = `${safe(invoiceNo)}_${safe(clientName).replace(/\s+/g,"_").substring(0,18)}.pdf`;
  doc.save(filename);

  return { grand, intra, cgst, sgst, igst, sub, gstTotal };
}
