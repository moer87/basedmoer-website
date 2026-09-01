const ROOT_URL = "https://basedmoer.com";

function boolEnv(name) {
  return Boolean(String(process.env[name] || "").trim());
}

export default function handler(req, res) {
  const appIdConfigured = boolEnv("BASE_APP_ID");
  const checks = {
    standard_web_app: true,
    base_account_client_present: true,
    production_domain: ROOT_URL,
    base_dashboard_app_id_configured: appIdConfigured,
    legacy_farcaster_manifest_required: false,
    legacy_minikit_required: false,
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).json({
    success: true,
    mode: "BASE_STANDARD_WEB_APP_READINESS",
    checks,
    registration_ready: appIdConfigured,
    app_id_exposed: false,
    next_gate: appIdConfigured
      ? "Hardcode the registered Base Dashboard app ID in the homepage base:app_id meta tag, then verify the production URL in Base Dashboard."
      : "Register Based Moer in Base Dashboard to obtain the app ID. Do not invent an app ID or use the deprecated Farcaster manifest flow.",
  });
}
