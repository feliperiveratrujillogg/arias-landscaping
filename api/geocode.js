/* ============================================================
   /api/geocode — Vercel serverless function (runs on the server).

   The browser never talks to the geocoding providers directly and no
   secret keys are needed: this proxy adds the identifying User-Agent the
   providers require, limits requests to US addresses, and returns only
   the fields the site needs.

   Providers (both OpenStreetMap-based, keyless):
     - Photon (komoot)   -> address suggestions as the user types
     - Nominatim (OSM)   -> final verification of the submitted address
       (falls back to Photon if Nominatim is unavailable)

   GET /api/geocode?mode=suggest&q=123 Main St        -> { suggestions: [...] }
   GET /api/geocode?mode=verify&q=123 Main St, ...    -> { ok, lat, lon, label, precise, parts }
   ============================================================ */

const USER_AGENT = "AriasLandscapingWebsite/1.0 (ariaslandscaping912@gmail.com)";
const SAVANNAH = { lat: 32.0809, lon: -81.0912 };
const PRECISE_TYPES = new Set(["house", "building", "street", "residential", "address", "locality", "hamlet", "neighbourhood"]);

function clean(q) {
  return String(q || "").replace(/\s+/g, " ").trim().slice(0, 200);
}

async function fetchJson(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "en" }, signal: ctrl.signal });
    if (!r.ok) throw new Error("upstream " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---- Photon (suggestions + fallback verify) ---- */
function photonToResult(f) {
  const p = f.properties || {};
  const [lon, lat] = (f.geometry && f.geometry.coordinates) || [];
  const street = [p.housenumber, p.street].filter(Boolean).join(" ") || (p.type === "street" || p.type === "house" ? p.name : "");
  const city = p.city || p.town || p.village || p.locality || p.county || "";
  const state = p.state || "";
  const zip = p.postcode || "";
  const nameFirst = street || p.name || "";
  const label = [nameFirst, city, state, zip].filter(Boolean).join(", ");
  const precise = Boolean(p.housenumber || p.street || PRECISE_TYPES.has(p.type) || p.osm_key === "building");
  return { lat: Number(lat), lon: Number(lon), label, precise, parts: { street: street || p.name || "", city, state, zip } };
}

async function photonSuggest(q) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=${SAVANNAH.lat}&lon=${SAVANNAH.lon}`;
  const data = await fetchJson(url);
  const seen = new Set();
  return (data.features || [])
    .filter((f) => (f.properties || {}).countrycode === "US")
    .map(photonToResult)
    .filter((r) => r.label && Number.isFinite(r.lat) && !seen.has(r.label) && seen.add(r.label))
    .slice(0, 5);
}

/* ---- Nominatim (verify) ---- */
function nominatimToResult(n) {
  const a = n.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  const label = [street || n.name || "", city, state, zip].filter(Boolean).join(", ");
  const precise = Boolean(a.house_number || a.road);
  return { lat: Number(n.lat), lon: Number(n.lon), label: label || n.display_name, precise, parts: { street, city, state, zip } };
}

async function nominatimVerify(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const data = await fetchJson(url);
  return Array.isArray(data) && data.length ? nominatimToResult(data[0]) : null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }
  const mode = req.query.mode === "suggest" ? "suggest" : "verify";
  const q = clean(req.query.q);
  if (q.length < 3) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "Address too short" }));
  }

  try {
    if (mode === "suggest") {
      res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
      const suggestions = await photonSuggest(q);
      return res.end(JSON.stringify({ suggestions }));
    }

    res.setHeader("Cache-Control", "public, s-maxage=86400");
    let result = null;
    try {
      result = await nominatimVerify(q);
    } catch (_) {
      result = null; // fall through to Photon
    }
    if (!result) {
      const alt = await photonSuggest(q);
      result = alt[0] || null;
    }
    if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lon)) {
      return res.end(JSON.stringify({ ok: false, reason: "not_found" }));
    }
    return res.end(JSON.stringify({ ok: true, ...result }));
  } catch (err) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: false, reason: "provider_error" }));
  }
};
