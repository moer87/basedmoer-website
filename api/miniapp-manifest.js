const ROOT_URL = "https://basedmoer.com";

function env(name) {
  return String(process.env[name] || "").trim();
}

export default function handler(req, res) {
  const association = {
    header: env("BASE_APP_ASSOCIATION_HEADER"),
    payload: env("BASE_APP_ASSOCIATION_PAYLOAD"),
    signature: env("BASE_APP_ASSOCIATION_SIGNATURE"),
  };

  const manifest = {
    accountAssociation: association,
    miniapp: {
      version: "1",
      name: "Based Moer",
      subtitle: "Pixel Art. Onchain Intelligence.",
      description: "Enter the Moerverse: original pixel art, Based Ape Punks, Moer AI, Token Radar, Academy, Arcade, Moer Flip and holder experiences built on Base.",
      screenshotUrls: [`${ROOT_URL}/assets/moerverse-preview.png`],
      iconUrl: `${ROOT_URL}/assets/based-moer-logo.jpg`,
      splashImageUrl: `${ROOT_URL}/assets/bald-moe-looking-up.png`,
      splashBackgroundColor: "#070d17",
      homeUrl: ROOT_URL,
      primaryCategory: "social",
      tags: ["base", "pixel-art", "ai", "nft", "games"],
      heroImageUrl: `${ROOT_URL}/assets/moerverse-preview.png`,
      tagline: "Pixel art adventures with onchain intelligence.",
      ogTitle: "Based Moer — Enter the Moerverse",
      ogDescription: "Original pixel art, Based Ape Punks, Moer AI and interactive holder experiences on Base.",
      ogImageUrl: `${ROOT_URL}/assets/moerverse-preview.png`,
    },
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).json(manifest);
}
