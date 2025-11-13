export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url= parameter", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    try {
      // ✅ Plain HTTP fetch — no Browser Rendering required
      const res = await fetch(target);
      const html = await res.text();

      // 🧠 Very simple pattern match to prove it works
      const events = [...html.matchAll(/HH2025|Hackathon|Event|(\d{1,2}\/\d{1,2}\/\d{4})/g)]
        .map(m => m[0])
        .slice(0, 10);

      return new Response(JSON.stringify({ events }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
