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

      // 🧩 Extract event title, date, and link
      const events = [];
      const eventRegex =
        /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:<time[^>]*>([^<]+)<\/time>)?/gi;

      let match;
      while ((match = eventRegex.exec(html)) !== null) {
        const [_, link, title, date] = match;
        if (title && link) {
          events.push({
            title: title.trim(),
            date: date ? date.trim() : null,
            link: link.startsWith("http") ? link : new URL(link, target).href,
          });
        }
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
