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
      const res = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (Cloudflare Worker)" },
      });
      const html = await res.text();

      const events = [];
      // Match div-based event listings (used on chucktownstartups.com)
      const regex =
        /<div class="em-item[^"]*">[\s\S]*?<div class="em-item-title">([^<]+)<\/div>[\s\S]*?(?:<abbr class="em-date"[^>]*title="([^"]+)")?[\s\S]*?<\/div>/gi;

      let match;
      while ((match = regex.exec(html)) !== null) {
        const [_, title, dateAttr] = match;
        events.push({
          title: title.trim(),
          date: dateAttr ? new Date(dateAttr).toLocaleDateString() : "TBA",
          link: target,
        });
      }

      return new Response(JSON.stringify({ events }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
