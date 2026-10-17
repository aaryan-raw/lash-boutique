// Netlify scheduled function: releases stock held by unpaid online orders. Needs CRON_SECRET set in Netlify env vars.
const handler = async () => {
  const base = process.env.URL; const secret = process.env.CRON_SECRET;
  if (!base || !secret) { console.log("expire-pending skipped: URL or CRON_SECRET not set"); return; }
  const res = await fetch(`${base}/api/cron/expire-pending`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
  console.log("expire-pending status", res.status);
};
export default handler;
export const config = { schedule: "*/10 * * * *" };
