export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Default to Chucktown Startups public WildApricot API
    const target =
      url.searchParams.get("url") ||
      "https://api.wildapricot.org/publicview/v1/accounts/149952/Events";

    try {
      const res = await fetch(target, {
        headers: {
          "User-Agent": "CharlestonHacks-EventsProxy",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch events", status: res.status }), {
          status: res.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      const data = await res.json();

      // Normalize response
      const events = (data.Events || []).map((e) => ({
        title: e.Name,
        startDate: e.StartDate,
        endDate: e.EndDate,
        location: e.Location?.Name || "Charleston",
        link: e.Url || "https://chucktownstartups.com/events",
      }));

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
