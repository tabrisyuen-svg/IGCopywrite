module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const productIndex = pathParts.indexOf("products");

    // Shopify JSON API
    if (productIndex !== -1 && pathParts[productIndex + 1]) {
      const handle = pathParts[productIndex + 1].split("?")[0];
      const jsonUrl = `${urlObj.origin}/products/${handle}.json`;

      const response = await fetch(jsonUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      });

      if (response.ok) {
        const data = await response.json();
        const product = data.product;
        const description = product.body_html
          ? product.body_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600)
          : "";

        return res.status(200).json({
          name: product.title || "",
          description,
          price: product.variants?.[0]?.price || "",
          image: product.images?.[0]?.src || "",
        });
      }
    }

    // Fallback: HTML scrape
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    const html = await response.text();

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const metaMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);

    return res.status(200).json({
      name: titleMatch?.[1]?.trim() || "",
      description: metaMatch?.[1]?.trim() || "",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed: " + error.message });
  }
};
