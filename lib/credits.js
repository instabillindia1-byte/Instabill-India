// ═══════════════════════════════════════════════════════
// InstaBill India — Credits & Plans System
// Import this wherever you need credit checks
// ═══════════════════════════════════════════════════════

export const PLANS = {
  free: {
    name:       "Free",
    price:      0,
    credits:    5,
    color:      "#64748B",
    colorLight: "rgba(100,116,139,0.15)",
    border:     "rgba(100,116,139,0.3)",
    features: [
      "5 invoices per month",
      "GST auto-calculation",
      "UPI QR on invoice",
      "PDF download",
      "Email to client",
    ],
    notIncluded: [
      "Unlimited invoices",
      "Custom logo",
      "Priority support",
      "Annual GST report",
    ],
  },
  solo: {
    name:       "Solo",
    price:      149,
    credits:    50,
    color:      "#0EA5E9",
    colorLight: "rgba(14,165,233,0.12)",
    border:     "rgba(14,165,233,0.3)",
    popular:    true,
    features: [
      "50 invoices per month",
      "GST auto-calculation",
      "UPI QR on invoice",
      "PDF download",
      "Email to client",
      "Invoice history",
      "Earnings dashboard",
      "Annual GST report",
    ],
    notIncluded: [
      "Custom logo",
      "Priority support",
    ],
  },
  pro: {
    name:       "Pro",
    price:      349,
    credits:    999,
    color:      "#F59E0B",
    colorLight: "rgba(245,158,11,0.12)",
    border:     "rgba(245,158,11,0.3)",
    features: [
      "Unlimited invoices",
      "GST auto-calculation",
      "UPI QR on invoice",
      "PDF download",
      "Email to client",
      "Invoice history",
      "Earnings dashboard",
      "Annual GST report",
      "Custom logo upload",
      "Priority support",
      "Client address book",
      "WhatsApp share",
    ],
    notIncluded: [],
  },
};

// ── Check if user can create invoice ──────────────────
export function canCreateInvoice(credits, plan) {
  if (plan === "pro")  return { allowed: true,  reason: "unlimited"   };
  if (credits <= 0)    return { allowed: false, reason: "no_credits"  };
  return               { allowed: true,  reason: "has_credits" };
}

// ── Deduct 1 credit ───────────────────────────────────
export function getNewCredits(credits, plan) {
  if (plan === "pro") return credits;
  return Math.max(0, credits - 1);
}

// ── Credit bar percentage ─────────────────────────────
export function creditPercent(credits, plan) {
  if (plan === "pro") return 100;
  const max = plan === "solo" ? 50 : 20;
  return Math.min(100, Math.round((credits / max) * 100));
}

// ── Credit bar color ──────────────────────────────────
export function creditColor(credits, plan) {
  if (plan === "pro")   return "#F59E0B";
  if (plan === "solo")  return "#0EA5E9";
  const pct = (credits / 20) * 100;
  if (pct > 50) return "#10B981";
  if (pct > 20) return "#F59E0B";
  return "#EF4444";
}

// ── Load user credits from Supabase ───────────────────
export async function loadCredits(supabase, userId) {
  const { data, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    // Create default credits if not exists
    const { data: newData } = await supabase
      .from("user_credits")
      .insert({ id: userId, credits: 5, plan: "free", is_early: false })
      .select()
      .single();
    return newData || { id: userId, credits: 5, plan: "free", total_used: 0, is_early: false };
  }
  return data;
}

// ── Deduct credit in Supabase ─────────────────────────
export async function deductCredit(supabase, userId, currentCredits, plan) {
  if (plan === "pro") return true; // no deduction needed
  const newCredits = Math.max(0, currentCredits - 1);
  const { error } = await supabase
    .from("user_credits")
    .update({
      credits:    newCredits,
      total_used: supabase.rpc ? undefined : undefined, // handled by increment below
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  // Also increment total_used
  await supabase.rpc("increment_total_used", { user_id: userId }).catch(() => {});
  return !error;
}
