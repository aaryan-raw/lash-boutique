import http from "node:http"; import fs from "node:fs"; let n = 0;
http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
  const auth = req.headers.authorization === "Basic " + Buffer.from("rzp_test_e2e:e2e_key_secret_value").toString("base64");
  fs.appendFileSync((process.env.RZP_STUB_LOG ?? "/tmp/rzp-stub.log"), JSON.stringify({ url: req.url, auth, body: b }) + "\n");
  if (!auth) { res.statusCode = 401; return res.end("{}"); } res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ id: "order_stub_" + ++n })); }); }).listen(4010);
