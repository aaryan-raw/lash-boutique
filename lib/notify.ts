// Order emails via Resend. Does nothing unless RESEND_API_KEY and EMAIL_FROM are set. WhatsApp automation is NOT implemented.
export type OrderMail = { ref: string; total: number; customerName: string; customerEmail?: string; paymentMethod: string };
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export async function notifyOrder(o: OrderMail, fetchImpl: typeof fetch = fetch): Promise<{ sent: number; reason?: string }> {
  if (!emailConfigured()) return { sent: 0, reason: "email_not_configured" };
  const to = [process.env.OWNER_EMAIL, o.customerEmail].filter((x): x is string => !!x);
  let sent = 0;
  for (const addr of to) {
    try {
      const mine = addr === process.env.OWNER_EMAIL;
      const res = await fetchImpl("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: addr, subject: mine ? `New order ${o.ref}` : `Your Lash Boutique order ${o.ref}`, text: `Order ${o.ref} (${o.paymentMethod}), total INR ${o.total}.${mine ? ` Customer: ${o.customerName}.` : " Thank you for shopping with us."}` }) });
      if (res.ok) sent++;
    } catch { /* notification failure must never fail the order */ }
  }
  return { sent };
}
