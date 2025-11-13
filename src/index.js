export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target)
      return new Response("Missing ?url= parameter", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });

    try {
      const res = await fetch(target);
      const text = await res.text();

      // Basic scraping example
      const matches = [...text.matchAll(/HH2025|Hackathon|Event|(\d{1,2}\/\d{1,2}\/\d{4})/g)];

      return new Response(
        JSON.stringify({ events: matches.slice(0, 5) }),
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
