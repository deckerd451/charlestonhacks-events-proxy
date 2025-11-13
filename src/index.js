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

      // 🧩 Updated regex tuned to Chucktown Startups structure
      const events = [];
      const eventRegex = /<article[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>[\s\S]*?<time[^>]*datetime="([^"]+)"[^>]*>(.*?)<\/time>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[^<]*<\/a>/gi;

      let match;
      while ((match = eventRegex.exec(html)) !== null) {
        const [_, title, dateISO, dateText, link] = match;
        events.push({
          title: title.replace(/<[^>]+>/g, "").trim(),
          date: dateText.trim(),
          link: link.startsWith("http") ? link : new URL(link, target).href,
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
