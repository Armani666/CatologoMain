module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    });
  }

  const select = [
    "id",
    "name",
    "brand",
    "category",
    "type",
    "barcode",
    "description",
    "stock",
    "tone",
    "price",
    "image_url",
    "image_urls",
    "reference_url",
    "is_active"
  ].join(",");

  const endpoint = `${supabaseUrl}/rest/v1/products?select=${encodeURIComponent(select)}&is_active=eq.true&order=id.asc`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Supabase request failed",
        details: text
      });
    }

    const products = text ? JSON.parse(text) : [];
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({
      error: "Catalog endpoint failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
