// src/policy.mjs
import { createHash } from "node:crypto";
import { isIP } from "node:net";
function summarize(policy) {
  if (policy.decision !== "allow" || !Array.isArray(policy.include) || policy.include.some((r) => Object.keys(r).length !== 1 || !r.geo && !r.ip)) throw Error("\u4E0D\u652F\u6301\u7684\u7B56\u7565\u7ED3\u6784\uFF0C\u672A\u4FEE\u6539\u4EFB\u4F55\u89C4\u5219");
  return { countries: policy.include.filter((r) => r.geo).map((r) => r.geo.country_code), ips: policy.include.filter((r) => r.ip).map((r) => r.ip.ip), revision: createHash("sha256").update(JSON.stringify(policy)).digest("hex") };
}
function updatePolicy(policy, input) {
  if (input?.revision !== summarize(policy).revision) throw Error("\u914D\u7F6E\u5DF2\u88AB\u4FEE\u6539\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
  if (!Array.isArray(input.countries) || !Array.isArray(input.ips) || input.countries.length + input.ips.length > 100) throw Error("\u89C4\u5219\u683C\u5F0F\u65E0\u6548");
  const countries = [...new Set(input.countries.map((c) => String(c).toUpperCase()))], ips = [...new Set(input.ips)];
  if (countries.some((c) => !/^[A-Z]{2}$/.test(c))) throw Error("\u56FD\u5BB6\u4EE3\u7801\u5E94\u4E3A\u4E24\u4F4D\u5B57\u6BCD");
  for (const ip of ips) {
    if (typeof ip !== "string") throw Error("IP \u683C\u5F0F\u65E0\u6548");
    const parts = ip.split("/"), v = isIP(parts[0]);
    if (!v || parts.length > 2 || parts.length === 2 && (!/^\d+$/.test(parts[1]) || Number(parts[1]) > (v === 4 ? 32 : 128))) throw Error("IP/CIDR \u683C\u5F0F\u65E0\u6548");
  }
  if (!countries.length && !ips.length) throw Error("\u81F3\u5C11\u4FDD\u7559\u4E00\u4E2A\u56FD\u5BB6\u6216 IP");
  return { ...policy, include: [...countries.map((country_code) => ({ geo: { country_code } })), ...ips.map((ip) => ({ ip: { ip } }))] };
}

// src/backend.mjs
var accountId = "a13429beb138043df35e2a9162f1b095";
async function dispatch(method, input, options = {}) {
  if (!["access.read", "access.update"].includes(method)) throw Error("\u4E0D\u652F\u6301\u7684\u64CD\u4F5C");
  const credentials = options.credentials ?? { accountId, token: process.env.CLOUDFLARE_ACCESS_TOKEN };
  if (!credentials.token) throw Error("\u8BF7\u5728 Settings \u7684 Connector secrets \u4E2D\u914D\u7F6E Cloudflare Access \u51ED\u636E");
  if (!/^[a-f0-9]{32}$/.test(credentials.accountId) || typeof credentials.token !== "string" || !credentials.token) throw Error("\u63D2\u4EF6\u4E13\u7528\u51ED\u636E\u65E0\u6548");
  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/access/apps/3534f755-aa33-4a89-b46e-3188465c177d/policies/86e572c9-33e5-4ef4-8772-b50743ba0c83`;
  const cf = async (method2 = "GET", body) => {
    let response, json;
    try {
      response = await (options.fetch ?? fetch)(url, { method: method2, headers: { authorization: `Bearer ${credentials.token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : void 0, redirect: "manual", signal: AbortSignal.timeout(15e3) });
      if (!response.ok) throw Error();
      json = await response.json();
      if (!json.success) throw Error();
    } catch {
      throw Error("Cloudflare \u8BF7\u6C42\u5931\u8D25\uFF1B\u672A\u80FD\u786E\u8BA4\u4FDD\u5B58\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5");
    }
    return json.result;
  };
  const current = await cf();
  if (method === "access.read") return summarize(current);
  const updated = updatePolicy(current, input);
  if (JSON.stringify(current.include) !== JSON.stringify(updated.include)) {
    const { id, uid, created_at, updated_at, reusable, ...body } = updated;
    await cf("PUT", body);
  }
  const saved = await cf();
  if (JSON.stringify(saved.include) !== JSON.stringify(updated.include)) throw Error("\u4FDD\u5B58\u540E\u89C4\u5219\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u5237\u65B0\u786E\u8BA4");
  return summarize(saved);
}

// src/rpc.mjs
try {
  let size = 0;
  const chunks = [];
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 16384) throw Error("\u8BF7\u6C42\u8FC7\u5927");
    chunks.push(chunk);
  }
  let request;
  try {
    request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("\u8BF7\u6C42\u683C\u5F0F\u65E0\u6548");
  }
  if (request.version !== 1 || typeof request.method !== "string") throw Error("\u8BF7\u6C42\u534F\u8BAE\u65E0\u6548");
  const result = await dispatch(request.method, request.params ?? {});
  process.stdout.write(JSON.stringify({ version: 1, ok: true, result }));
} catch (error) {
  process.stdout.write(JSON.stringify({ version: 1, ok: false, error: { code: "access_control_failed", message: error.message } }));
  process.exitCode = 1;
}
