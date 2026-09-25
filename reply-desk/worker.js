// Cloudflare Worker per Reply Desk: tiene la chiave DeepSeek come segreto sul server.
// La pagina https://alessandrobrozzi1-ux.github.io/doterra-manager/reply-desk/ chiama questo Worker,
// il Worker chiama DeepSeek. La chiave non passa mai dal browser e non sta su GitHub.
// Segreto da impostare in Cloudflare (Settings → Variables and Secrets): DEEPSEEK_API_KEY.

const ALLOWED_ORIGIN = "https://alessandrobrozzi1-ux.github.io";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (request.method !== "POST" || origin !== ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403, headers: cors(origin) });
    }
    let body;
    try { body = await request.json(); } catch { return new Response("Bad request", { status: 400, headers: cors(origin) }); }
    const system = String(body.system || "").slice(0, 20000);
    const user = String(body.user || "").slice(0, 20000);
    if (!system || !user) return new Response("Bad request", { status: 400, headers: cors(origin) });

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.DEEPSEEK_API_KEY },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [{ role: "system", content: system }, { role: "user", content: user + "\n\nReturn only the JSON object." }],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      }),
    });
    const text = await r.text();
    return new Response(text, { status: r.status, headers: { ...cors(origin), "Content-Type": "application/json" } });
  },
};
