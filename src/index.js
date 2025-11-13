/**
 * CharlestonHacks Events Hybrid Worker v3
 * ----------------------------------------
 * Multi-source event aggregator for Charleston’s tech ecosystem.
 * Fetches events from Charleston Digital Corridor, Startup Grind,
 * and Charleston Technology Group Meetup, with fallback to curated JSON.
 *
 * Includes real date parsing, caching, and CORS.
 */

export default {
  async fetch(request, env, ctx) {
    const cacheKey = "charlestonhacks_events_cache_v3";
    const CACHE_TTL = 3 * 60 * 60; // 3 hours (seconds)
    const tz = "America/New_York";

    // Serve cached copy if available
    if (env.CACHE) {
      const cached = await env.CACHE.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Utility for date normalization
    function parseDate(str) {
      if (!str) return null;
      try {
        const d = new Date(str);
        if (!isNaN(d)) return d.toISOString();
        // Try extracting formats like "Nov 14, 2025"
        const m = str.match(
          /([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2}:\d{2}\s?(AM|PM)?))?/i
        );
        if (m) {
          return new Date(`${m[1]} ${m[2]}, ${m[3]} ${m[4] || ""} EST`).toISOString();
        }
      } catch {
        return null;
      }
      return null;
    }

    // Generic fetch + extractor
    async function trySource(name, url, extractor) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "CharlestonHacksBot/1.0 (+https://charlestonhacks.com)" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const events = extractor(html);
        console.log(`✅ ${name}: ${events.length} events`);
        return events;
      } catch (err) {
        console.warn(`❌ ${name} failed:`, err.message);
        return [];
      }
    }

    // 1️⃣ Charleston Digital Corridor
    const cdcEvents = await trySource(
      "Charleston Digital Corridor",
      "https://www.charlestondigital.com/events",
      (html) => {
        const regex = /<h3[^>]*>(.*?)<\/h3>[\s\S]*?(?:<p[^>]*>(.*?)<\/p>)?/g;
        const matches = [...html.matchAll(regex)];
        return matches.map((m) => ({
          title: m[1].replace(/<.*?>/g, "").trim(),
          startDate: parseDate(m[2]) || new Date().toISOString(),
          location: "Charleston, SC",
          link: "https://www.charlestondigital.com/events",
        }));
      }
    );

    // 2️⃣ Startup Grind Charleston
    const sgEvents = await trySource(
      "Startup Grind Charleston",
      "https://www.startupgrind.com/charleston/",
      (html) => {
        const regex = /<h3[^>]*>(.*?)<\/h3>[\s\S]*?<span[^>]*>([^<]*\d{4})<\/span>/g;
        const matches = [...html.matchAll(regex)];
        return matches.map((m) => ({
          title: m[1].replace(/<.*?>/g, "").trim(),
          startDate: parseDate(m[2]),
          location: "Charleston, SC",
          link: "https://www.startupgrind.com/charleston/",
        }));
      }
    );

    // 3️⃣ Charleston Technology Group (Meetup)
    const meetupEvents = await trySource(
      "Charleston Technology Group",
      "https://www.meetup.com/charleston-technology-group/",
      (html) => {
        const eventBlocks = html.split("eventCard--link").slice(1);
        return eventBlocks.map((block) => {
          const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/);
          const dateMatch = block.match(/datetime="([^"]+)"/);
          const urlMatch = block.match(/href="([^"]+)"/);
          return {
            title: titleMatch ? titleMatch[1].replace(/<.*?>/g, "").trim() : "Meetup Event",
            startDate: dateMatch ? new Date(dateMatch[1]).toISOString() : null,
            location: "Charleston, SC",
            link: urlMatch
              ? "https://www.meetup.com" + urlMatch[1]
              : "https://www.meetup.com/charleston-technology-group/",
          };
        });
      }
    );

    // 4️⃣ Fallback static events
    const fallback = [
      {
        title: "Charleston Tech Happy Hour",
        startDate: "2025-11-15T17:00:00-05:00",
        location: "Revelry Brewing",
        link: "https://www.linkedin.com/company/charlestonhacks",
      },
      {
        title: "HarborHack 2025",
        startDate: "2025-10-03T08:00:00-04:00",
        location: "Charleston Tech Center",
        link: "https://charlestonhacks.com/hackathon",
      },
      {
        title: "Blue Sky Demo Day",
        startDate: "2026-02-14T09:00:00-05:00",
        location: "Charleston Digital Corridor",
        link: "https://charlestonhacks.com/events",
      },
    ];

    // Combine and clean
    const allEvents = [...cdcEvents, ...sgEvents, ...meetupEvents, ...fallback]
      .filter((e) => e && e.title)
      .map((e) => ({
        ...e,
        startDate: parseDate(e.startDate) || new Date().toISOString(),
      }));

    const deduped = allEvents.filter(
      (v, i, a) => a.findIndex((t) => t.title === v.title) === i
    );

    const sorted = deduped.sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    const payload = JSON.stringify({ events: sorted }, null, 2);

    // Cache result for 3 hours if KV exists
    if (env.CACHE) await env.CACHE.put(cacheKey, payload, { expirationTtl: CACHE_TTL });

    return new Response(payload, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
