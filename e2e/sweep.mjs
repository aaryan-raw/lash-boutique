import { launch, check, go, BASE, axeSrc, results } from "./lib.mjs";
const widths = [[360, 740, "small-phone"], [390, 844, "phone"], [768, 1024, "tablet"], [1024, 768, "laptop"], [1440, 900, "desktop"]];
const pages = ["/", "/shop", "/category/kurtis", "/collections/new-arrivals", "/product/sample-kurti-sage", "/product/sample-saree-champagne", "/cart", "/checkout", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms", "/nope-404"];
const b = await launch(); const axeAgg = {}; const clsAgg = [];
for (const [w, h, label] of widths) {
  const page = await b.newPage(); await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const errors = []; page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text())); page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  for (const p of pages) {
    const res = await go(page, p);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelectorAll("h1").length, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length, noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length, cls: window.__cls, title: document.title }));
    const okStatus = p === "/nope-404" ? res.status() === 404 : [200, 304].includes(res.status());
    check(`[${label} ${w}] ${p} status/overflow/h1/images`, okStatus && m.sw <= m.iw && m.h1 === 1 && m.broken === 0 && m.noAlt === 0, `status=${res.status()} scrollW=${m.sw}/${m.iw} h1=${m.h1} brokenImgs=${m.broken}`);
    clsAgg.push([`${label} ${p}`, m.cls]);
    if (w === 390 || w === 1440) { // axe on two widths
      await page.evaluate(axeSrc); const r = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, html: v.nodes[0].html.slice(0, 110) })));
      for (const v of r) { const k = `${v.id} (${v.impact})`; (axeAgg[k] ??= []).push(`${p}@${w}: ${v.html}`); }
    }
    if ((p === "/" || p === "/shop" || p === "/product/sample-kurti-sage" || p === "/cart") && (w === 390 || w === 1440)) await page.screenshot({ path: `./shots/${label}-${p.replace(/\W+/g, "_")}.png`, fullPage: true });
  }
  check(`[${label}] no console/page errors across all pages`, errors.length === 0, errors.slice(0, 3).join(" || "));
  await page.close();
}
console.log("\n== axe-core violations (aggregated)"); for (const [k, v] of Object.entries(axeAgg)) console.log(`${k}: ${v.length} hits; e.g. ${v[0]}`); if (!Object.keys(axeAgg).length) console.log("none");
const worst = clsAgg.sort((a, b) => b[1] - a[1]).slice(0, 3); console.log("\n== highest CLS:", worst.map(([n, v]) => `${n}=${v.toFixed(3)}`).join("; "));
await b.close(); console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
