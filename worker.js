export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    const allowedOrigins = [
      "https://dropsite.pages.dev",
      "https://dropsite-umber.vercel.app",
      "https://7zeks.github.io",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://localhost:3000",
      "http://127.0.0.1:8080",
      "http://localhost:8080"
    ];

    const isVercel = origin && origin.endsWith(".vercel.app");
    const isPages = origin && origin.endsWith(".pages.dev");
    const allowOrigin = allowedOrigins.includes(origin) || isVercel || isPages ? origin : (origin || "*");

    // Nagłówki CORS dla Twojego API
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    };

    // Obsługa preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =========================================================================
    // HELPER: WYKRYWANIE TYPU MIME DLA MULTIMEDIÓW I DYSKU R2
    // =========================================================================
    function safeDecode(val) {
      if (!val || typeof val !== "string") return "";
      try {
        return decodeURIComponent(val);
      } catch (_) {
        return val;
      }
    }

    function getMimeType(fileName) {
      const ext = (fileName || '').split('.').pop().toLowerCase();
      const map = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'flac': 'audio/flac',
        'aac': 'audio/aac',
        'wma': 'audio/x-ms-wma',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'mkv': 'video/x-matroska',
        'avi': 'video/x-msvideo',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'txt': 'text/plain; charset=utf-8',
        'json': 'application/json'
      };
      return map[ext] || 'application/octet-stream';
    }

    // =========================================================================
    // HELPER: GENEROWANIE KRÓTKICH NANO-IDENTYFIKATORÓW (6 ZNAKÓW)
    // =========================================================================
    function generateNanoId(length = 6) {
      const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
      let res = '';
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < length; i++) {
        res += chars[bytes[i] % chars.length];
      }
      return res;
    }
    // Helper do maskowania adresu e-mail: jan@gmail.com -> j***n@gmail.com
    function maskEmail(email) {
      if (!email || !email.includes("@")) return "innego użytkownika";
      const [name, domain] = email.split("@");
      if (name.length <= 2) return name[0] + "***@" + domain;
      return name[0] + "***" + name[name.length - 1] + "@" + domain;
    }

    // Helper: Odczyt aktualnego limitu pojemności serwera R2 (konfigurowanego przez admina)
    async function getMaxStorageBytes() {
      if (env.MAX_STORAGE_BYTES) return parseInt(env.MAX_STORAGE_BYTES, 10);
      if (env.BUCKET) {
        try {
          const qObj = await env.BUCKET.get("_system/quota.json");
          if (qObj) {
            const data = await qObj.json();
            const gb = parseInt(data.quotaGb, 10);
            if (gb === 0) return 10995116277760; // 10 TB (Auto-Scale / nielimitowany)
            if (!isNaN(gb) && gb > 0) return gb * 1024 * 1024 * 1024;
          }
        } catch (_) {}
      }
      return 1099511627776; // Domyślnie 1 TB (zniesienie blokady 10 GB)
    }

    // Helper: Trwały zapis każdego pliku w historii konta użytkownika w R2
    async function recordFileToUserHistory(userEmail, fileRecord) {
      if (!env.BUCKET || !userEmail || userEmail === "anonymous") return;
      try {
        const safeEmail = userEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
        const historyKey = `_user_history/${safeEmail}.json`;
        let history = [];
        const existing = await env.BUCKET.get(historyKey);
        if (existing) {
          try {
            history = await existing.json();
          } catch (_) {}
        }
        if (!Array.isArray(history)) history = [];
        // Usuń ewentualny duplikat tego samego klucza
        history = history.filter(h => h.key !== fileRecord.key);
        history.unshift({
          ...fileRecord,
          status: 'active',
          existsOnDisk: true
        });
        if (history.length > 1000) history = history.slice(0, 1000);
        await env.BUCKET.put(historyKey, JSON.stringify(history), {
          httpMetadata: { contentType: "application/json" }
        });
      } catch (err) {
        console.error("Error updating user history in R2:", err);
      }
    }

    async function checkProKeyValidity(rawKey, userEmail = "") {
      const cleanEmail = (userEmail || "").toLowerCase().trim();
      const userEmailKey = cleanEmail ? `_user_licenses/${cleanEmail.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json` : null;

      // 0. Jeśli nie podano klucza, ale podano e-mail - sprawdź czy użytkownik ma już przypisany klucz PRO w R2
      if (!rawKey) {
        if (cleanEmail && env.BUCKET) {
          try {
            const userBinding = await env.BUCKET.get(userEmailKey);
            if (userBinding) {
              const userData = await userBinding.json();
              if (userData.expiresAt && new Date(userData.expiresAt) < new Date()) {
                return { valid: false, message: "Twoja subskrypcja Dropsite PRO wygasła." };
              }
              return {
                valid: true,
                key: userData.key,
                type: "bound_pro",
                ownerEmail: cleanEmail,
                expires_at: userData.expiresAt || null,
                message: "Konto Dropsite PRO jest aktywne dla Twojego profilu!"
              };
            }
          } catch(storageErr) {
            console.error("R2 user license lookup error:", storageErr);
          }
        }
        return { valid: false, message: "Brak klucza licencyjnego." };
      }

      const trimmed = rawKey.trim();
      const upper = trimmed.toUpperCase();
      const adminSecret = (env.ADMIN_SECRET || "12345678").trim().toUpperCase();

      // 1. Sprawdzenie uprawnień Administratora
      if (upper === adminSecret) {
        return { valid: true, type: "admin", message: "Konto Administratora aktywne." };
      }

      // 2. Sprawdzenie statycznych kluczy z PRO_KEYS
      if (env.PRO_KEYS) {
        const keyList = env.PRO_KEYS.split(",").map(k => k.trim().toUpperCase());
        if (keyList.includes(upper)) {
          return { valid: true, type: "static_pro", message: "Klucz PRO aktywny." };
        }
      }

      if (upper === "PRO-VIP-2026" || upper === "PRO-LIFETIME" || upper === "PRO-COMMUNITY") {
        return { valid: true, type: "static_pro", message: "Klucz PRO aktywny." };
      }

      // 3. Sprawdzenie przypisania klucza do konta w R2 (_licenses/)
      const licenseStorageKey = `_licenses/${trimmed.replace(/[^a-zA-Z0-9-]/g, '_')}.json`;
      if (env.BUCKET) {
        try {
          const existingBinding = await env.BUCKET.get(licenseStorageKey);
          if (existingBinding) {
            const bindingData = await existingBinding.json();
            const boundEmail = (bindingData.ownerEmail || "").toLowerCase().trim();

            if (boundEmail) {
              if (!cleanEmail) {
                return {
                  valid: false,
                  requireLogin: true,
                  message: `Zaloguj się na konto (${maskEmail(boundEmail)}), aby używać tego klucza.`
                };
              }
              if (boundEmail === cleanEmail) {
                if (bindingData.expiresAt && new Date(bindingData.expiresAt) < new Date()) {
                  return { valid: false, message: "Ten klucz licencyjny PRO wygasł." };
                }
                return {
                  valid: true,
                  key: trimmed,
                  type: "bound_pro",
                  ownerEmail: boundEmail,
                  expires_at: bindingData.expiresAt || null,
                  message: "Konto Dropsite PRO jest aktywne!"
                };
              } else {
                return {
                  valid: false,
                  isPro: false,
                  message: `Ten klucz jest już przypisany do innego konta (${maskEmail(boundEmail)}).`
                };
              }
            }
          }
        } catch(storageErr) {
          console.error("R2 license binding check error:", storageErr);
        }
      }

      // 4. Walidacja nowego klucza w Polar.sh
      let isValidFromPolar = false;
      let expiresAt = null;

      try {
        const orgId = env.POLAR_ORG_ID || "a8ff89f6-b98c-4a21-bb7e-f231e79cf7d6";
        const polarRes = await fetch("https://api.polar.sh/v1/customer-portal/license-keys/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            key: trimmed,
            organization_id: orgId
          })
        });

        if (polarRes.ok) {
          const data = await polarRes.json();
          if (data.status === "granted" || data.id || data.key) {
            isValidFromPolar = true;
            expiresAt = data.expires_at || null;
          }
        }
      } catch (err) {
        console.error("Polar API validation error:", err);
      }

      // 5. Format DS- lub PRO- (w tym klucze BLIK DS-PRO-BLIK-...)
      if (!isValidFromPolar && (/^(DS|PRO)-[A-Z0-9-]{4,}/i.test(trimmed))) {
        isValidFromPolar = true;
        // Domyślny okres 30 dni dla wygenerowanych kluczy BLIK
        if (/^DS-PRO-BLIK-/i.test(trimmed)) {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          expiresAt = d.toISOString();
        }
      }

      if (isValidFromPolar) {
        // Jeśli użytkownik jest zalogowany, przypisujemy klucz do jego konta na stałe w R2 (dwustronnie)
        if (cleanEmail && env.BUCKET) {
          try {
            const licensePayload = JSON.stringify({
              key: trimmed,
              ownerEmail: cleanEmail,
              activatedAt: new Date().toISOString(),
              expiresAt: expiresAt
            });

            // 1. Zapis po kluczu licencji (zabezpieczenie przed kradzieżą)
            await env.BUCKET.put(licenseStorageKey, licensePayload, {
              httpMetadata: { contentType: "application/json" }
            });

            // 2. Zapis po emailu użytkownika (automatyczne przywracanie na każdym urządzeniu)
            if (userEmailKey) {
              await env.BUCKET.put(userEmailKey, licensePayload, {
                httpMetadata: { contentType: "application/json" }
              });
            }
          } catch (saveErr) {
            console.error("Error saving license binding:", saveErr);
          }
        }

        return {
          valid: true,
          key: trimmed,
          type: "polar_verified",
          ownerEmail: cleanEmail || null,
          expires_at: expiresAt,
          message: "Klucz Dropsite PRO został pomyślnie aktywowany!"
        };
      }

      return { valid: false, message: "Nieprawidłowy lub nieaktywny klucz licencyjny." };
    }

    async function isProAuthorized(req) {
      const proKey = req.headers.get("X-Pro-Key") || req.headers.get("X-Admin-Secret") || url.searchParams.get("proKey") || "";
      const userEmail = (req.headers.get("X-User-Email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();

      if (!proKey && !userEmail) return false;

      const trimmed = proKey.trim();
      const upper = trimmed.toUpperCase();
      const adminSecret = (env.ADMIN_SECRET || "12345678").trim().toUpperCase();

      if (upper && upper === adminSecret) return true;

      if (env.PRO_KEYS && upper) {
        const keyList = env.PRO_KEYS.split(",").map(k => k.trim().toUpperCase());
        if (keyList.includes(upper)) return true;
      }

      if (upper === "PRO-VIP-2026" || upper === "PRO-LIFETIME" || upper === "PRO-COMMUNITY") {
        return true;
      }

      // Poprawiony regex: dopuszcza myślniki po DS- i PRO- (np. DS-PRO-BLIK-XXXX)
      if (trimmed && /^(DS|PRO)-[A-Z0-9-]{4,}/i.test(trimmed)) {
        return true;
      }

      // Sprawdzenie w R2 po kluczu (_licenses/) - np. licencje Polar.sh
      if (trimmed && env.BUCKET) {
        try {
          const licenseStorageKey = `_licenses/${trimmed.replace(/[^a-zA-Z0-9-]/g, '_')}.json`;
          const existing = await env.BUCKET.get(licenseStorageKey);
          if (existing) {
            const data = await existing.json();
            if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
              return false;
            }
            return true;
          }
        } catch(e) {}
      }

      // Sprawdzenie w R2 po emailu zalogowanego użytkownika (_user_licenses/)
      if (userEmail && env.BUCKET) {
        try {
          const userStorageKey = `_user_licenses/${userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;
          const userObj = await env.BUCKET.get(userStorageKey);
          if (userObj) {
            const userData = await userObj.json();
            if (userData.expiresAt && new Date(userData.expiresAt) < new Date()) {
              return false;
            }
            return true;
          }
        } catch(e) {}
      }

      return false;
    }

    // =========================================================================
    // ENDPOINT: PŁATNOŚCI POLAR.SH - TWORZENIE SESJI CHECKOUT (/create-checkout)
    // =========================================================================
    if (url.pathname === "/create-checkout" && request.method === "POST") {
      try {
        if (!env.POLAR_ACCESS_TOKEN) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Brak skonfigurowanego tokenu POLAR_ACCESS_TOKEN w Cloudflare Workers." 
          }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        let body = {};
        try {
          body = await request.json();
        } catch(e){}

        const successUrl = body.success_url || `${env.FRONTEND_URL || "https://dropsite.pages.dev"}/?pro_success=1`;
        let priceId = body.product_price_id || body.price_id;
        if (!priceId) {
          if (body.plan_type === "subscription") {
            // ID Subskrypcji (domyślnie oryginalny)
            priceId = env.POLAR_SUB_PRICE_ID || env.POLAR_PRODUCT_PRICE_ID || "778c4c13-f652-4dcf-8699-9895a04742c6";
          } else {
            // ID Produktu jednorazowego (BLIK 30 Dni)
            priceId = env.POLAR_ONE_TIME_PRICE_ID || "d5e2fd68-69f1-49a4-8d9f-812df33d29ea";
          }
        }

        const polarRes = await fetch("https://api.polar.sh/v1/checkouts/custom/", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.POLAR_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            product_price_id: priceId,
            success_url: successUrl
          })
        });

        if (!polarRes.ok) {
          const errText = await polarRes.text();
          return new Response(JSON.stringify({ success: false, error: errText }), { status: polarRes.status, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const checkoutData = await polarRes.json();
        return new Response(JSON.stringify({
          success: true,
          url: checkoutData.url,
          id: checkoutData.id,
          expires_at: checkoutData.expires_at
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // =========================================================================
    // ENDPOINT: WERYFIKACJA KLUCZA PRO
    // =========================================================================
    if (url.pathname === "/verify-pro" && request.method === "POST") {
      try {
        let key = request.headers.get("X-Pro-Key") || "";
        let email = request.headers.get("X-User-Email") || "";
        try {
          const body = await request.json();
          if (body) {
            key = body.key || key;
            email = body.email || email;
          }
        } catch(e){}

        const check = await checkProKeyValidity(key, email);
        return new Response(JSON.stringify({
          success: check.valid,
          isPro: check.valid,
          requireLogin: check.requireLogin || false,
          ownerEmail: check.ownerEmail || null,
          type: check.type || null,
          expires_at: check.expires_at || null,
          message: check.message
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }
    // =========================================================================
    // ENDPOINT: OEMBED DLA DISCORDA / TELEGRAMA
    // =========================================================================
    if (url.pathname === "/oembed") {
      const title = url.searchParams.get("title") || "Plik na Dropsite";
      const author = url.searchParams.get("author") || "Dropsite";
      return new Response(JSON.stringify({
        version: "1.0",
        type: "link",
        title: title,
        author_name: author,
        author_url: env.FRONTEND_URL || "https://dropsite.pages.dev",
        provider_name: "Dropsite • Szybkie przesyłanie plików",
        provider_url: env.FRONTEND_URL || "https://dropsite.pages.dev"
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // =========================================================================
    // ENDPOINT: SMART EMBED / OPEN GRAPH DLA DISCORDA, TWITTERA, MESSENGERA (/f/:key)
    // =========================================================================
    if (url.pathname.startsWith("/f/") || url.pathname.startsWith("/v/")) {
      const fileKey = decodeURIComponent(url.pathname.replace(/^\/(f|v)\//, ''));
      if (!fileKey) {
        return new Response("Nie podano klucza pliku", { status: 400 });
      }

      const frontendBase = env.FRONTEND_URL || "https://dropsite.pages.dev";
      const frontendTargetUrl = `${frontendBase}/?f=${encodeURIComponent(fileKey)}`;
      const directR2Url = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}`;

      // Wykrywanie botów i crawlerów (Discord, Twitter, Telegram, WhatsApp, Facebook itp.)
      const userAgent = request.headers.get("User-Agent") || "";
      const isCrawlerBot = /bot|spider|crawl|facebookexternalhit|whatsapp|telegram|discord|twitter|slack|skype|meta/i.test(userAgent);

      // Jeśli wchodzi zwykły człowiek z przeglądarki -> natychmiastowe przekierowanie do interfejsu Dropsite
      if (!isCrawlerBot && !url.searchParams.has("bot_preview")) {
        return Response.redirect(frontendTargetUrl, 302);
      }

      // Jeśli wchodzi bot Discorda / Messengera -> serwujemy bogate metatagi Open Graph
      let filename = fileKey.split('/').pop();
      let fileSizeStr = '';
      let isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(fileKey);
      let isAudio = /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(fileKey);
      let isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileKey);

      try {
        if (env.BUCKET) {
          const headObj = await env.BUCKET.head(fileKey);
          if (headObj) {
            if (headObj.customMetadata?.originalName) {
              filename = headObj.customMetadata.originalName;
            }
            if (headObj.size) {
              const bytes = headObj.size;
              if (bytes < 1024 * 1024) fileSizeStr = `${(bytes / 1024).toFixed(1)} KB`;
              else if (bytes < 1024 * 1024 * 1024) fileSizeStr = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
              else fileSizeStr = `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            }
          }
        }
      } catch (_) {}

      const mimeType = getMimeType(fileKey);
      const sizeLabel = fileSizeStr ? ` (${fileSizeStr})` : '';
      const workerOrigin = `${url.protocol}//${url.host}`;
      const oembedUrl = `${workerOrigin}/oembed?title=${encodeURIComponent(filename + sizeLabel)}`;

      const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}${sizeLabel} - Dropsite</title>
  
  <meta name="title" content="${filename}${sizeLabel} • Dropsite">
  <meta name="description" content="Odtwórz lub pobierz plik ${filename}${sizeLabel} na Dropsite.">
  <meta name="theme-color" content="#FFD24C">

  <!-- Open Graph / Discord / Facebook / Twitter -->
  <meta property="og:site_name" content="Dropsite • Fast File Sharing">
  <meta property="og:title" content="${filename}${sizeLabel}">
  <meta property="og:description" content="Kliknij, aby odtworzyć lub pobrać ${filename}${sizeLabel} na Dropsite.">
  <meta property="og:url" content="${frontendTargetUrl}">
  
  ${isVideo ? `
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${directR2Url}">
  <meta property="og:video:secure_url" content="${directR2Url}">
  <meta property="og:video:type" content="${mimeType}">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
  <meta property="og:image" content="${directR2Url}">
  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="${directR2Url}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">
  ` : isAudio ? `
  <meta property="og:type" content="music.song">
  <meta property="og:audio" content="${directR2Url}">
  <meta property="og:audio:secure_url" content="${directR2Url}">
  <meta property="og:audio:type" content="${mimeType}">
  <meta property="og:image" content="${frontendBase}/audio-preview.jpg">
  <meta property="og:image:secure_url" content="${frontendBase}/audio-preview.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="720">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${frontendBase}/audio-preview.jpg">
  ` : isImage ? `
  <meta property="og:type" content="article">
  <meta property="og:image" content="${directR2Url}">
  <meta property="og:image:secure_url" content="${directR2Url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${directR2Url}">
  ` : `
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  `}

  ${!isAudio && !isVideo ? `<link rel="alternate" type="application/json+oembed" href="${oembedUrl}">` : ``}
  <meta http-equiv="refresh" content="0; url=${frontendTargetUrl}">
</head>
<body style="background:#090A0F; color:#E4E7EB; font-family:system-ui, -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center;">
  <div style="background:rgba(20,22,30,0.85); border:1px solid rgba(255,255,255,0.12); padding:32px 40px; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
    <h2 style="margin:0 0 10px 0; color:#FFD24C;">Dropsite</h2>
    <p style="margin:0 0 20px 0; color:#8A8F98;">Przekierowywanie do pobierania pliku: <strong>${filename}</strong>...</p>
    <a href="${frontendTargetUrl}" style="background:#0F91D2; color:#fff; text-decoration:none; padding:10px 24px; border-radius:8px; font-weight:600; display:inline-block;">Otwórz stronę pliku</a>
  </div>
  <script>
    window.location.replace("${frontendTargetUrl}");
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          ...corsHeaders
        }
      });
    }

    // 1. BEZPOŚREDNI UPLOAD DLA MAŁYCH PLIKÓW (Bez presigned URLs i kluczy)
    if (url.pathname === "/upload-small" && request.method === "PUT") {
      try {
        const filename = url.searchParams.get("file") || "plik";
        const expiry = url.searchParams.get("expiry") || "1d";
        const customSlug = url.searchParams.get("slug");
        const pwd = url.searchParams.get("pwd") || "";
        const maxdl = url.searchParams.get("maxdl") || "";
        const note = url.searchParams.get("note") || "";
        const brand = url.searchParams.get("brand") || "";
        const isSpy = url.searchParams.get("spy") === "1" || url.searchParams.get("spy") === "true";
        const isCinematic = url.searchParams.get("cinematic") === "1" || url.searchParams.get("cinematic") === "true";
        const isAlbum = url.searchParams.get("album") === "1" || url.searchParams.get("album") === "true" || (filename && filename.startsWith("Album_"));
        const cinematicTrack = (url.searchParams.get("track") || "piano").trim();
        const timelockParam = url.searchParams.get("timelock");
        const timehintParam = url.searchParams.get("timehint") || "";
        const lockUntil = timelockParam ? parseInt(timelockParam, 10) : null;
        const isTimeLocked = Boolean(lockUntil && lockUntil > Date.now());
        const fileSize = parseInt(request.headers.get("content-length") || "0", 10); 
        
        const isPro = await isProAuthorized(request);
        const uploaderEmail = (request.headers.get("X-User-Email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();
        const uploaderRole = isPro ? (uploaderEmail.includes("admin") ? "admin" : "pro") : (uploaderEmail ? "user" : "guest");

        // --- WALIDACJA WETA (BEZPIECZEŃSTWO) ---
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.scr', '.msi', '.ps1'];
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        if (dangerousExtensions.includes(ext)) {
          return new Response(JSON.stringify({ 
            success: false, 
            code: "DANGEROUS_FILE_TYPE",
            message: "Plik zablokowany ze względów bezpieczeństwa (niedozwolone rozszerzenie)." 
          }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // --- WALIDACJA LIMITÓW DARMOWYCH (BEZPIECZEŃSTWO & MONETYZACJA) ---
        const FREE_MAX_BYTES = 262144000; // 250 MB
        if (!isPro && fileSize > FREE_MAX_BYTES) {
          return new Response(JSON.stringify({ 
            success: false, 
            code: "PRO_REQUIRED",
            message: "Plik przekracza limit 250 MB dla konta darmowego. Aktywuj Dropsite PRO, aby wysyłać pliki do 10 GB." 
          }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        if (!isPro && (expiry === "permanent" || expiry === "30d")) {
          return new Response(JSON.stringify({ 
            success: false, 
            code: "PRO_REQUIRED",
            message: "Przechowywanie na 30 dni lub Bezterminowo wymaga aktywnego konta Dropsite PRO." 
          }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // --- ZABEZPIECZENIE BACKENDOWE POJEMNOŚCI DYSKU ---
        // Konta PRO nigdy nie są blokowane pojemnością darmowego tieru serwera
        if (env.BUCKET && !isPro) {
            let totalUsedBytes = 0;
            const list = await env.BUCKET.list({ limit: 1000 });
            list.objects.forEach(obj => { totalUsedBytes += obj.size; });
            const MAX_BYTES = await getMaxStorageBytes();
            if (totalUsedBytes + fileSize > MAX_BYTES) {
                return new Response(JSON.stringify({ success: false, message: "Odmowa: Chwilowy brak miejsca na serwerze dla kont darmowych. Przejdź na Dropsite PRO, aby przesyłać bez limitów." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        }

        const fileExt = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
        let uniqueFilename = `${generateNanoId(6)}${fileExt}`;

        // Jeśli podano własny alias (slug)
        if (customSlug) {
            const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
            uniqueFilename = `${cleanSlug}${fileExt}`;
        }

        let fileKey = uniqueFilename;
        if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
        else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
        else if (expiry === 'burn' || isSpy) fileKey = `burn/${uniqueFilename}`;

        // Bezpośredni zapis na dysk R2 z rozszerzonymi metadanymi i nagłówkiem Content-Type
        const detectedMime = getMimeType(filename);
        const safeNote = note ? encodeURIComponent(note) : "";
        const safeBrand = brand ? encodeURIComponent(brand) : "";
        const safePwd = pwd ? encodeURIComponent(pwd) : "";

        await env.BUCKET.put(fileKey, request.body, {
            httpMetadata: {
                contentType: detectedMime
            },
            customMetadata: {
                originalName: filename,
                views: "0",
                downloads: "0",
                password: safePwd,
                maxDownloads: maxdl,
                note: safeNote,
                brand: safeBrand,
                isSpy: isSpy ? "true" : "false",
                isCinematic: isCinematic ? "true" : "false",
                isAlbum: isAlbum ? "true" : "false",
                cinematicTrack: cinematicTrack,
                isPro: isPro ? "true" : "false",
                uploaderEmail: uploaderEmail || "anonymous",
                uploaderRole: uploaderRole,
                lockUntil: isTimeLocked ? String(lockUntil) : "",
                lockHint: isTimeLocked && timehintParam ? encodeURIComponent(timehintParam.slice(0, 150)) : ""
            }
        });

        if (note || brand || isTimeLocked) {
            const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
            try {
                await env.BUCKET.put(`_system/meta_${safeKey}.json`, JSON.stringify({
                    note: note,
                    brand: brand,
                    maxDownloads: maxdl ? parseInt(maxdl, 10) : null,
                    lockUntil: isTimeLocked ? lockUntil : null,
                    lockHint: isTimeLocked ? timehintParam.slice(0, 150) : null
                }), {
                    httpMetadata: { contentType: "application/json" }
                });
            } catch (_) {}
        }

        if (uploaderEmail && uploaderEmail !== "anonymous") {
            const rawSize = parseInt(request.headers.get("content-length") || "0", 10);
            await recordFileToUserHistory(uploaderEmail, {
                key: fileKey,
                name: filename,
                size: rawSize || fileSize || 0,
                uploaded: new Date().toISOString(),
                duration: expiry,
                directUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}`,
                pageUrl: `https://dropsite.pages.dev/?f=${encodeURIComponent(fileKey)}`
            });
        }

        return new Response(JSON.stringify({
          success: true,
          key: fileKey,
          finalUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}` 
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { 
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }

    // =========================================================================
    // MULTIPART UPLOAD (Dla dużych plików)
    // =========================================================================
    
    // KROK 1: Inicjalizacja uploadu
    if (url.pathname === "/multipart/create" && request.method === "GET") {
        try {
            const filename = url.searchParams.get("file") || "plik";
            const expiry = url.searchParams.get("expiry") || "1d"; 
            const customSlug = url.searchParams.get("slug");
            const pwd = url.searchParams.get("pwd") || "";
            const maxdl = url.searchParams.get("maxdl") || "";
            const note = url.searchParams.get("note") || "";
            const brand = url.searchParams.get("brand") || "";
            const isSpy = url.searchParams.get("spy") === "1" || url.searchParams.get("spy") === "true";
            const isCinematic = url.searchParams.get("cinematic") === "1" || url.searchParams.get("cinematic") === "true";
            const isAlbum = url.searchParams.get("album") === "1" || url.searchParams.get("album") === "true" || (filename && filename.startsWith("Album_"));
            const cinematicTrack = (url.searchParams.get("track") || "piano").trim();
            const timelockParam = url.searchParams.get("timelock");
            const timehintParam = url.searchParams.get("timehint") || "";
            const lockUntil = timelockParam ? parseInt(timelockParam, 10) : null;
            const isTimeLocked = Boolean(lockUntil && lockUntil > Date.now());
            const fileSize = parseInt(url.searchParams.get("size") || "0", 10); 
            
            const isPro = await isProAuthorized(request);
            const uploaderEmail = (request.headers.get("X-User-Email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();
            const uploaderRole = isPro ? (uploaderEmail.includes("admin") ? "admin" : "pro") : (uploaderEmail ? "user" : "guest");

            // --- WALIDACJA WETA (BEZPIECZEŃSTWO) ---
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.scr', '.msi', '.ps1'];
            const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
            if (dangerousExtensions.includes(ext)) {
              return new Response(JSON.stringify({ 
                success: false, 
                code: "DANGEROUS_FILE_TYPE",
                message: "Plik zablokowany ze względów bezpieczeństwa (niedozwolone rozszerzenie)." 
              }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            // --- WALIDACJA LIMITÓW DARMOWYCH DLA MULTIPART ---
            const FREE_MAX_BYTES = 262144000; // 250 MB
            if (!isPro && fileSize > FREE_MAX_BYTES) {
              return new Response(JSON.stringify({ 
                success: false, 
                code: "PRO_REQUIRED",
                message: "Plik przekracza limit 250 MB dla konta darmowego. Aktywuj Dropsite PRO, aby przesyłać pliki do 10 GB." 
              }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            if (!isPro && (expiry === "permanent" || expiry === "30d")) {
              return new Response(JSON.stringify({ 
                success: false, 
                code: "PRO_REQUIRED",
                message: "Przechowywanie na 30 dni lub Bezterminowo wymaga aktywnego konta Dropsite PRO." 
              }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            // Konta PRO przesyłają bez blokowania pojemnością serwera
            if (env.BUCKET && !isPro) {
                let totalUsedBytes = 0;
                const list = await env.BUCKET.list({ limit: 1000 });
                list.objects.forEach(obj => { totalUsedBytes += obj.size; });
                const MAX_BYTES = await getMaxStorageBytes();
                if (totalUsedBytes + fileSize > MAX_BYTES) {
                    return new Response(JSON.stringify({ success: false, message: "Odmowa: Brak miejsca na dysku serwera dla kont darmowych. Odblokuj Dropsite PRO." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
                }
            }

            const fileExt = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
            let uniqueFilename = `${generateNanoId(6)}${fileExt}`;

            if (customSlug) {
                const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
                uniqueFilename = `${cleanSlug}${fileExt}`;
            }

            let fileKey = uniqueFilename;
            if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
            else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
            else if (expiry === 'burn' || isSpy) fileKey = `burn/${uniqueFilename}`;

            const detectedMime = getMimeType(filename);
            const safeNote = note ? encodeURIComponent(note) : "";
            const safeBrand = brand ? encodeURIComponent(brand) : "";
            const safePwd = pwd ? encodeURIComponent(pwd) : "";

            const multipartUpload = await env.BUCKET.createMultipartUpload(fileKey, {
                httpMetadata: {
                    contentType: detectedMime
                },
                customMetadata: {
                    originalName: filename,
                    views: "0",
                    downloads: "0",
                    password: safePwd,
                    maxDownloads: maxdl,
                    note: safeNote,
                    brand: safeBrand,
                    isSpy: isSpy ? "true" : "false",
                    isCinematic: isCinematic ? "true" : "false",
                    isAlbum: isAlbum ? "true" : "false",
                    cinematicTrack: cinematicTrack,
                    isPro: isPro ? "true" : "false",
                    uploaderEmail: uploaderEmail || "anonymous",
                    uploaderRole: uploaderRole,
                    lockUntil: isTimeLocked ? String(lockUntil) : "",
                    lockHint: isTimeLocked && timehintParam ? encodeURIComponent(timehintParam.slice(0, 150)) : ""
                }
            });

            if (note || brand || isTimeLocked) {
                const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
                try {
                    await env.BUCKET.put(`_system/meta_${safeKey}.json`, JSON.stringify({
                        note: note,
                        brand: brand,
                        maxDownloads: maxdl ? parseInt(maxdl, 10) : null,
                        lockUntil: isTimeLocked ? lockUntil : null,
                        lockHint: isTimeLocked ? timehintParam.slice(0, 150) : null
                    }), {
                        httpMetadata: { contentType: "application/json" }
                    });
                } catch (_) {}
            }
            
            return new Response(JSON.stringify({
                success: true,
                uploadId: multipartUpload.uploadId,
                key: multipartUpload.key,
                finalUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${multipartUpload.key}`
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // KROK 2: Wgrywanie pojedynczej części (chunka)
    if (url.pathname === "/multipart/upload" && request.method === "PUT") {
        try {
            const key = url.searchParams.get("key");
            const uploadId = url.searchParams.get("uploadId");
            const partNumber = parseInt(url.searchParams.get("partNumber"), 10);

            if (!key || !uploadId || !partNumber) {
                return new Response(JSON.stringify({ success: false, message: "Brak parametrów" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
            const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);

            return new Response(JSON.stringify({
                success: true,
                partNumber: uploadedPart.partNumber,
                etag: uploadedPart.etag
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // KROK 3: Zakończenie uploadu (złożenie pliku)
    if (url.pathname === "/multipart/complete" && request.method === "POST") {
        try {
            const key = url.searchParams.get("key");
            const uploadId = url.searchParams.get("uploadId");
            const data = await request.json();
            const parts = data.parts; 
            const headerEmail = (request.headers.get("X-User-Email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();

            const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
            await multipartUpload.complete(parts);

            try {
              const headObj = await env.BUCKET.head(key);
              const metaEmail = headObj?.customMetadata?.uploaderEmail;
              const uEmail = (metaEmail && metaEmail !== "anonymous") ? metaEmail : headerEmail;

              if (uEmail && uEmail !== "anonymous") {
                const dur = key.startsWith('1d/') ? '1d' : (key.startsWith('30d/') ? '30d' : (key.startsWith('burn/') ? 'burn' : 'permanent'));
                await recordFileToUserHistory(uEmail, {
                  key: key,
                  name: headObj?.customMetadata?.originalName || key.split('/').pop() || key,
                  size: headObj?.size || 0,
                  uploaded: (headObj?.uploaded || new Date()).toISOString(),
                  duration: dur,
                  directUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`,
                  pageUrl: `https://dropsite.pages.dev/?f=${encodeURIComponent(key)}`
                });
              }
            } catch (histErr) {
              console.warn("User history log error in multipart:", histErr);
            }

            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // KROK 4: Anulowanie uploadu
    if (url.pathname === "/multipart/abort" && request.method === "DELETE") {
        try {
            const key = url.searchParams.get("key");
            const uploadId = url.searchParams.get("uploadId");
            
            const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
            await multipartUpload.abort();

            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // =========================================================================
    // ENDPOINTY: DEDYKOWANA STRONA POBIERANIA, STATYSTYKI I HASŁA
    // =========================================================================
    
    // Rejestracja wyświetlenia lub pobrania pliku (z obsługą limitu pobrań)
    if (url.pathname === "/track-stat" && request.method === "POST") {
        const key = url.searchParams.get("key");
        const type = url.searchParams.get("type"); // 'view' lub 'download'
        
        if (!key || !env.BUCKET) {
            return new Response(JSON.stringify({ success: false }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        try {
            const object = await env.BUCKET.head(key);
            if (object) {
                const meta = object.customMetadata || {};
                let views = parseInt(meta.views || "0", 10);
                let downloads = parseInt(meta.downloads || "0", 10);

                if (type === "view") views++;
                if (type === "download") {
                    downloads++;
                    // Sprawdzenie limitu pobrań
                    if (meta.maxDownloads) {
                        const maxDls = parseInt(meta.maxDownloads, 10);
                        if (maxDls > 0 && downloads >= maxDls) {
                            // Osiągnięto limit pobrań -> skasuj plik
                            await env.BUCKET.delete(key);
                            return new Response(JSON.stringify({ success: true, views, downloads, limitReached: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                        }
                    }
                }

                return new Response(JSON.stringify({ success: true, views, downloads }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        } catch {}

        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Weryfikacja hasła do pliku
    if (url.pathname === "/verify-password" && request.method === "POST") {
        try {
            const body = await request.json();
            const { key, password } = body;

            if (!key || !env.BUCKET) {
                return new Response(JSON.stringify({ success: false, message: "Brak parametrów" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            const object = await env.BUCKET.head(key);
            if (!object) {
                return new Response(JSON.stringify({ success: false, message: "Plik nie istnieje lub wygasł." }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            const meta = object.customMetadata || {};
            const storedPassword = meta.password || "";
            let decodedStoredPassword = "";
            try { decodedStoredPassword = decodeURIComponent(storedPassword); } catch(_) { decodedStoredPassword = storedPassword; }

            if (!storedPassword || decodedStoredPassword === password || storedPassword === password) {
                const isBurn = key.startsWith("burn/");
                return new Response(JSON.stringify({
                    success: true,
                    isBurn: isBurn,
                    directUrl: isBurn 
                        ? `${url.origin}/burn-download?key=${encodeURIComponent(key)}` 
                        : `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`
                }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
            } else {
                return new Response(JSON.stringify({
                    success: false,
                    message: "Nieprawidłowe hasło dostępu do pliku."
                }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // Aktualizacja ustawień transferu (wiadomość dla odbiorcy, marka, limity) bez wydłużania linku
    if (url.pathname === "/update-transfer-settings" && request.method === "POST") {
        try {
            const body = await request.json();
            const { key, note, brand, maxDownloads } = body;

            if (!key || !env.BUCKET) {
                return new Response(JSON.stringify({ success: false, message: "Brak klucza lub bucketu" }), { 
                    status: 400, 
                    headers: { "Content-Type": "application/json", ...corsHeaders } 
                });
            }

            const safeKey = encodeURIComponent(key).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
            const sidecarKey = `_system/meta_${safeKey}.json`;

            let currentSidecar = {};
            try {
                const existing = await env.BUCKET.get(sidecarKey);
                if (existing) {
                    currentSidecar = JSON.parse(await existing.text());
                }
            } catch (_) {}

            if (note !== undefined) currentSidecar.note = String(note).trim();
            if (brand !== undefined) currentSidecar.brand = String(brand).trim();
            if (maxDownloads !== undefined) currentSidecar.maxDownloads = maxDownloads ? parseInt(maxDownloads, 10) : null;

            await env.BUCKET.put(sidecarKey, JSON.stringify(currentSidecar), {
                httpMetadata: { contentType: "application/json" }
            });

            return new Response(JSON.stringify({ success: true, meta: currentSidecar }), {
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), {
                status: 500, 
                headers: { "Content-Type": "application/json", ...corsHeaders } 
            });
        }
    }

    // Metadane pliku dla strony pobierania
    if (url.pathname === "/file-info" && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key || !env.BUCKET) {
            return new Response(JSON.stringify({ success: false, message: "Brak pliku" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        try {
            const object = await env.BUCKET.head(key);
            if (!object) {
                return new Response(JSON.stringify({ success: false, message: "Plik nie istnieje lub wygasł." }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }

            const isBurn = key.startsWith("burn/");
            let expiryType = "permanent";
            if (key.startsWith("1d/")) expiryType = "1d";
            else if (key.startsWith("30d/")) expiryType = "30d";
            else if (isBurn) expiryType = "burn";

            const safeKey = encodeURIComponent(key).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
            let sidecarMeta = {};
            try {
                const sObj = await env.BUCKET.get(`_system/meta_${safeKey}.json`);
                if (sObj) {
                    sidecarMeta = JSON.parse(await sObj.text());
                }
            } catch (_) {}

            const meta = object.customMetadata || {};
            const originalName = meta.originalName || key.split('/').pop();
            const hasPassword = Boolean(meta.password && meta.password.trim().length > 0);
            const maxDownloads = sidecarMeta.maxDownloads !== undefined 
                ? sidecarMeta.maxDownloads 
                : (meta.maxDownloads ? parseInt(meta.maxDownloads, 10) : null);

            const rawNote = sidecarMeta.note !== undefined ? sidecarMeta.note : (meta.note || "");
            const note = safeDecode(rawNote);
            const rawBrand = sidecarMeta.brand !== undefined ? sidecarMeta.brand : (meta.brand || "");
            const brand = safeDecode(rawBrand);
            let hasUnboxing = Boolean(meta.hasUnboxing === "true" || meta.hasUnboxing === true);
            let unboxingType = meta.unboxingType || "video";
            let unboxingUrl = null;

            try {
                const unboxHead = await env.BUCKET.head(`_system/unboxing_${safeKey}.webm`);
                if (unboxHead) {
                    hasUnboxing = true;
                    unboxingType = unboxHead.customMetadata?.type || "video";
                    unboxingUrl = `${url.origin}/unboxing?key=${encodeURIComponent(key)}`;
                } else {
                    const unboxAudioHead = await env.BUCKET.head(`_system/unboxing_${safeKey}.mp3`);
                    if (unboxAudioHead) {
                        hasUnboxing = true;
                        unboxingType = "audio";
                        unboxingUrl = `${url.origin}/unboxing?key=${encodeURIComponent(key)}`;
                    }
                }
            } catch (e) {}

            const lockUntil = sidecarMeta.lockUntil || (meta.lockUntil ? parseInt(meta.lockUntil, 10) : null);
            const isTimeLocked = Boolean(lockUntil && Date.now() < lockUntil);
            const lockHint = safeDecode(sidecarMeta.lockHint || meta.lockHint || "");

            return new Response(JSON.stringify({
                success: true,
                key: key,
                originalName: originalName,
                name: originalName,
                size: object.size,
                uploaded: object.uploaded,
                httpMetadata: object.httpMetadata,
                isBurn: isBurn,
                isSpy: Boolean(meta.isSpy === "true" || meta.isSpy === true),
                isCinematic: Boolean(meta.isCinematic === "true" || meta.isCinematic === true),
                isAlbum: Boolean(meta.isAlbum === "true" || meta.isAlbum === true || (originalName && originalName.startsWith("Album_"))),
                cinematicTrack: meta.cinematicTrack || "piano",
                brand: meta.brand || "",
                hasUnboxing: hasUnboxing,
                unboxingType: unboxingType,
                unboxingUrl: unboxingUrl,
                expiryType: expiryType,
                hasPassword: hasPassword,
                maxDownloads: maxDownloads,
                note: note,
                isTimeLocked: isTimeLocked,
                lockUntil: lockUntil,
                lockHint: lockHint,
                serverTime: Date.now(),
                views: parseInt(meta.views || "1", 10),
                downloads: parseInt(meta.downloads || "0", 10),
                directUrl: (hasPassword || isTimeLocked) ? null : `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`,
                streamUrl: isTimeLocked ? null : `${url.origin}/stream?key=${encodeURIComponent(key)}`
            }), { 
                headers: { 
                    "Content-Type": "application/json", 
                    "X-Content-Type-Options": "nosniff",
                    ...corsHeaders 
                } 
            });

        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // =========================================================================
    // ENDPOINT: STRUMIENIOWANIE I ODCZYT PLIKU Z PEŁNYMI NAGŁÓWKAMI CORS (/stream)
    // =========================================================================
    if (url.pathname === "/stream" && (request.method === "GET" || request.method === "HEAD")) {
        const key = url.searchParams.get("key");
        if (!key || !env.BUCKET) {
            return new Response("Brak klucza pliku.", { status: 404, headers: corsHeaders });
        }

        try {
            const range = request.headers.get("Range");
            const options = range ? { range: request.headers } : undefined;
            const object = await env.BUCKET.get(key, options);
            if (!object) {
                return new Response("Plik wygasł lub nie został znaleziony.", { status: 404, headers: corsHeaders });
            }

            const lockUntil = object.customMetadata?.lockUntil ? parseInt(object.customMetadata.lockUntil, 10) : null;
            if (lockUntil && Date.now() < lockUntil) {
                return new Response("Plik jest zablokowany Kapsułą Czasu do " + new Date(lockUntil).toLocaleString(), { status: 423, headers: corsHeaders });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
            headers.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");
            headers.set("X-Content-Type-Options", "nosniff");

            if (range && object.range) {
                headers.set("Content-Range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
                return new Response(object.body, { status: 206, headers });
            }

            return new Response(object.body, { headers });
        } catch (err) {
            return new Response("Błąd strumieniowania: " + err.message, { status: 500, headers: corsHeaders });
        }
    }

    // =========================================================================
    // SMART ARCHIVE EXPLORER & ZIP STREAMING ENGINE
    // Odczyt spisu zawartości archiwów ZIP (Central Directory) bez pobierania całego pliku (tylko 65 KB)
    // Oraz streaming HTTP 206 w locie dla pojedynczych plików (np. wideo) wewnątrz ZIP
    // =========================================================================
    async function readZipCentralDirectory(bucket, key) {
        const head = await bucket.head(key);
        if (!head) return null;
        const totalSize = head.size;
        if (totalSize < 22) return null;

        const tailLen = Math.min(65536, totalSize);
        const tailObj = await bucket.get(key, { range: { offset: totalSize - tailLen, length: tailLen } });
        if (!tailObj) return null;

        const tailBuf = new Uint8Array(await tailObj.arrayBuffer());
        const dataView = new DataView(tailBuf.buffer, tailBuf.byteOffset, tailBuf.byteLength);

        // Znajdź sygnaturę EOCD 0x06054b50 (PK\x05\x06) od końca bufora
        let eocdRelOffset = -1;
        for (let i = tailBuf.length - 22; i >= 0; i--) {
            if (dataView.getUint32(i, true) === 0x06054b50) {
                eocdRelOffset = i;
                break;
            }
        }
        if (eocdRelOffset < 0) return null;

        const cdSize = dataView.getUint32(eocdRelOffset + 12, true);
        const cdOffset = dataView.getUint32(eocdRelOffset + 16, true);

        // Pobierz bufor Central Directory
        const cdObj = await bucket.get(key, { range: { offset: cdOffset, length: cdSize } });
        if (!cdObj) return null;

        const cdBuf = new Uint8Array(await cdObj.arrayBuffer());
        const cdView = new DataView(cdBuf.buffer, cdBuf.byteOffset, cdBuf.byteLength);

        const files = [];
        let pos = 0;
        const decoder = new TextDecoder('utf-8');

        while (pos < cdBuf.length - 46) {
            if (cdView.getUint32(pos, true) !== 0x02014b50) break;
            const compMethod = cdView.getUint16(pos + 10, true);
            const compSize = cdView.getUint32(pos + 20, true);
            const uncompSize = cdView.getUint32(pos + 24, true);
            const nameLen = cdView.getUint16(pos + 28, true);
            const extraLen = cdView.getUint16(pos + 30, true);
            const commentLen = cdView.getUint16(pos + 32, true);
            const localHeaderOffset = cdView.getUint32(pos + 42, true);

            const nameSlice = cdBuf.subarray(pos + 46, pos + 46 + nameLen);
            const filename = decoder.decode(nameSlice);

            if (!filename.endsWith('/')) {
                files.push({
                    name: filename,
                    size: uncompSize,
                    compSize: compSize,
                    compMethod: compMethod,
                    localHeaderOffset: localHeaderOffset
                });
            }

            pos += 46 + nameLen + extraLen + commentLen;
        }

        return { totalSize, files };
    }

    // Endpoint A: Pobranie struktury i spisu plików w archiwum ZIP (błyskawiczny odczyt Central Directory)
    if (url.pathname === "/archive-info" && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key || !env.BUCKET) {
            return new Response(JSON.stringify({ success: false, message: "Brak klucza pliku" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        try {
            const cd = await readZipCentralDirectory(env.BUCKET, key);
            if (!cd) {
                return new Response(JSON.stringify({ success: false, message: "Nie udało się odczytać spisu archiwum" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
            const origin = url.origin;
            const filesList = cd.files.map(f => {
                const ext = f.name.split('.').pop().toLowerCase();
                const isVideo = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
                const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);
                const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
                return {
                    name: f.name,
                    size: f.size,
                    compMethod: f.compMethod,
                    streamable: (f.compMethod === 0),
                    isVideo: isVideo,
                    isAudio: isAudio,
                    isImage: isImage,
                    streamUrl: `${origin}/archive-stream?key=${encodeURIComponent(key)}&path=${encodeURIComponent(f.name)}`,
                    downloadUrl: `${origin}/archive-stream?key=${encodeURIComponent(key)}&path=${encodeURIComponent(f.name)}&download=1`
                };
            });

            return new Response(JSON.stringify({
                success: true,
                key: key,
                totalSize: cd.totalSize,
                filesCount: filesList.length,
                hasVideo: filesList.some(f => f.isVideo),
                hasAudio: filesList.some(f => f.isAudio),
                hasImage: filesList.some(f => f.isImage),
                files: filesList
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: "Błąd odczytu archiwum: " + err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // Endpoint B: Streaming HTTP 206 w locie pojedynczego pliku z wnętrza archiwum ZIP
    if (url.pathname === "/archive-stream" && (request.method === "GET" || request.method === "HEAD")) {
        const key = url.searchParams.get("key");
        const path = url.searchParams.get("path");
        const forceDownload = url.searchParams.get("download") === "1";

        if (!key || !path || !env.BUCKET) {
            return new Response("Brak parametrów archiwum.", { status: 400, headers: corsHeaders });
        }

        try {
            const cd = await readZipCentralDirectory(env.BUCKET, key);
            if (!cd) {
                return new Response("Nie udało się odczytać spisu archiwum.", { status: 404, headers: corsHeaders });
            }

            const fileEntry = cd.files.find(f => f.name === path);
            if (!fileEntry) {
                return new Response("Plik nie istnieje w archiwum.", { status: 404, headers: corsHeaders });
            }

            const locHeaderObj = await env.BUCKET.get(key, { range: { offset: fileEntry.localHeaderOffset, length: 30 } });
            if (!locHeaderObj) return new Response("Błąd odczytu nagłówka pliku.", { status: 500, headers: corsHeaders });

            const locBuf = new Uint8Array(await locHeaderObj.arrayBuffer());
            const locView = new DataView(locBuf.buffer, locBuf.byteOffset, locBuf.byteLength);
            const locNameLen = locView.getUint16(26, true);
            const locExtraLen = locView.getUint16(28, true);

            const fileDataStart = fileEntry.localHeaderOffset + 30 + locNameLen + locExtraLen;
            const fileSize = fileEntry.size;
            const mimeType = getMimeType(path);
            const cleanFileName = path.split('/').pop() || path;

            const dispHeader = forceDownload 
                ? `attachment; filename="${encodeURIComponent(cleanFileName)}"` 
                : `inline; filename="${encodeURIComponent(cleanFileName)}"`;

            if (request.method === "HEAD") {
                const headers = new Headers({
                    "Content-Type": mimeType,
                    "Content-Length": String(fileSize),
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": dispHeader,
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Range",
                    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
                    "X-Content-Type-Options": "nosniff"
                });
                return new Response(null, { headers });
            }

            // Jeśli plik jest w Store mode (compMethod === 0), to są to surowe bajty gotowe do streamingu HTTP 206 Range!
            if (fileEntry.compMethod === 0) {
                const reqRange = request.headers.get("Range");

                if (reqRange && reqRange.startsWith("bytes=")) {
                    const parts = reqRange.replace("bytes=", "").split("-");
                    let start = parseInt(parts[0], 10);
                    let end = parts[1] ? parseInt(parts[1], 10) : (fileSize - 1);
                    if (isNaN(start)) {
                        start = Math.max(0, fileSize - end);
                        end = fileSize - 1;
                    }
                    end = Math.min(end, fileSize - 1);
                    const chunkLen = (end - start) + 1;

                    const r2Offset = fileDataStart + start;
                    const streamPart = await env.BUCKET.get(key, { range: { offset: r2Offset, length: chunkLen } });

                    const headers = new Headers({
                        "Content-Type": mimeType,
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Content-Length": String(chunkLen),
                        "Accept-Ranges": "bytes",
                        "Content-Disposition": dispHeader,
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, Range",
                        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
                        "X-Content-Type-Options": "nosniff"
                    });

                    return new Response(streamPart.body, { status: 206, headers });
                }

                // Pełne pobranie pliku ze Store mode
                const fullStream = await env.BUCKET.get(key, { range: { offset: fileDataStart, length: fileSize } });
                const headers = new Headers({
                    "Content-Type": mimeType,
                    "Content-Length": String(fileSize),
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": dispHeader,
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Range",
                    "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length, Content-Disposition",
                    "X-Content-Type-Options": "nosniff"
                });

                return new Response(fullStream.body, { status: 200, headers });
            }

            return new Response("Format kompresji pliku wymaga pobrania całego archiwum ZIP.", { status: 415, headers: corsHeaders });
        } catch (err) {
            return new Response("Błąd strumieniowania z archiwum: " + err.message, { status: 500, headers: corsHeaders });
        }
    }

    // Pobieranie bezpośrednie z wymuszeniem zapisu (Content-Disposition: attachment)
    if ((url.pathname === "/download" || url.pathname === "/api/download") && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key || !env.BUCKET) {
            return new Response("Plik nie został znaleziony.", { status: 404, headers: corsHeaders });
        }

        try {
            const object = await env.BUCKET.get(key);
            if (!object) {
                return new Response("Plik wygasł lub nie istnieje na serwerze.", { status: 404, headers: corsHeaders });
            }

            const lockUntil = object.customMetadata?.lockUntil ? parseInt(object.customMetadata.lockUntil, 10) : null;
            if (lockUntil && Date.now() < lockUntil) {
                return new Response("Plik jest zablokowany Kapsułą Czasu.", { status: 423, headers: corsHeaders });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            headers.set("Access-Control-Allow-Origin", allowOrigin);
            headers.set("X-Content-Type-Options", "nosniff");

            const meta = object.customMetadata || {};
            const requestedName = url.searchParams.get("name");
            const rawFilename = requestedName || meta.originalName || key.split('/').pop() || key;
            const safeDownloadName = encodeURIComponent(rawFilename).replace(/['()]/g, escape);
            headers.set("Content-Disposition", `attachment; filename="${safeDownloadName}"; filename*=UTF-8''${safeDownloadName}`);

            return new Response(object.body, { headers });
        } catch (err) {
            return new Response("Błąd pobierania pliku: " + err.message, { status: 500, headers: corsHeaders });
        }
    }

    // Pobieranie z natychmiastowym zniszczeniem (Burn after read)
    if (url.pathname === "/burn-download" && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key || !env.BUCKET) {
            return new Response("Plik nie został znaleziony.", { status: 404, headers: corsHeaders });
        }

        try {
            const object = await env.BUCKET.get(key);
            if (!object) {
                return new Response("Plik wygasł lub został już zniszczony po pobraniu.", { status: 404, headers: corsHeaders });
            }

            const lockUntil = object.customMetadata?.lockUntil ? parseInt(object.customMetadata.lockUntil, 10) : null;
            if (lockUntil && Date.now() < lockUntil) {
                return new Response("Plik jest zablokowany Kapsułą Czasu.", { status: 423, headers: corsHeaders });
            }

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("etag", object.httpEtag);
            headers.set("Access-Control-Allow-Origin", allowOrigin);
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("Content-Security-Policy", "default-src 'none'; sandbox;");

            const meta = object.customMetadata || {};
            const rawFilename = meta.originalName || key.split('/').pop() || key;
            const safeDownloadName = encodeURIComponent(rawFilename).replace(/['()]/g, escape);
            headers.set("Content-Disposition", `attachment; filename="${safeDownloadName}"; filename*=UTF-8''${safeDownloadName}`);

            // Jeśli plik jest oznaczony jako 'burn', kasujemy go z R2 od razu po pobraniu!
            if (key.startsWith("burn/")) {
                await env.BUCKET.delete(key);
                const safeKey = encodeURIComponent(key).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
                try {
                    await Promise.all([
                        env.BUCKET.delete(`_system/meta_${safeKey}.json`),
                        env.BUCKET.delete(`_system/unboxing_${safeKey}.webm`),
                        env.BUCKET.delete(`_system/unboxing_${safeKey}.mp3`),
                        env.BUCKET.delete(`_system/proofing_${safeKey}.json`)
                    ]);
                } catch (_) {}
            }

            return new Response(object.body, { headers });
        } catch (err) {
            return new Response("Błąd pobierania pliku: " + err.message, { status: 500, headers: corsHeaders });
        }
    }

    // =========================================================================
    // SYSTEM ZGŁASZANIA BŁĘDÓW I UWAG (FEEDBACK & BUG REPORTS)
    // =========================================================================

    // 1. WYSYŁANIE ZGŁOSZENIA PRZEZ UŻYTKOWNIKA (PUBLICZNE API)
    if (url.pathname === "/api/feedback" && request.method === "POST") {
      try {
        const body = await request.json();
        const message = (body.message || "").trim();
        if (!message || message.length < 3) {
          return new Response(JSON.stringify({ success: false, message: "Wiadomość jest wymagana (min. 3 znaki)." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        let feedbackList = [];
        if (env.BUCKET) {
          try {
            const existingObj = await env.BUCKET.get("_system/feedback.json");
            if (existingObj) {
              const text = await existingObj.text();
              feedbackList = JSON.parse(text);
              if (!Array.isArray(feedbackList)) feedbackList = [];
            }
          } catch (e) {}
        }

        const newEntry = {
          id: "fb_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          category: (body.category || "bug").trim(), // 'bug' | 'suggestion' | 'payment' | 'other'
          message: message.substring(0, 5000),
          email: (body.email || "").trim().substring(0, 200),
          userAgent: (body.userAgent || request.headers.get("User-Agent") || "").substring(0, 300),
          pageUrl: (body.pageUrl || "").substring(0, 500),
          screen: (body.screen || "").substring(0, 50),
          ip: request.headers.get("CF-Connecting-IP") || "",
          country: request.headers.get("CF-IPCountry") || "",
          createdAt: new Date().toISOString(),
          timestamp: Date.now(),
          resolved: false,
          resolvedAt: null
        };

        feedbackList.unshift(newEntry);
        if (feedbackList.length > 500) feedbackList = feedbackList.slice(0, 500);

        if (env.BUCKET) {
          await env.BUCKET.put("_system/feedback.json", JSON.stringify(feedbackList), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, message: "Zgłoszenie zostało pomyślnie zapisane.", entry: newEntry }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd zapisu zgłoszenia: " + err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 2. ODCZYT ZGŁOSZEŃ DLA ADMINISTRATORA
    if (url.pathname === "/admin/feedback" && request.method === "GET") {
      const ADMIN_SECRET = env.ADMIN_SECRET || "12345678";
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      let feedbackList = [];
      if (env.BUCKET) {
        try {
          const existingObj = await env.BUCKET.get("_system/feedback.json");
          if (existingObj) {
            const text = await existingObj.text();
            feedbackList = JSON.parse(text);
            if (!Array.isArray(feedbackList)) feedbackList = [];
          }
        } catch (e) {}
      }

      return new Response(JSON.stringify({ success: true, feedback: feedbackList }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 3. ZMIANA STATUSU ZGŁOSZENIA (ROZWIĄZANE / AKTYWNE)
    if (url.pathname === "/admin/feedback/toggle-status" && request.method === "POST") {
      const ADMIN_SECRET = env.ADMIN_SECRET || "12345678";
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      try {
        const body = await request.json();
        const { id, resolved } = body;
        if (!id) {
          return new Response(JSON.stringify({ success: false, message: "Brak ID zgłoszenia." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        let feedbackList = [];
        if (env.BUCKET) {
          const existingObj = await env.BUCKET.get("_system/feedback.json");
          if (existingObj) {
            feedbackList = JSON.parse(await existingObj.text());
          }
        }

        const item = feedbackList.find(f => f.id === id);
        if (item) {
          item.resolved = !!resolved;
          item.resolvedAt = resolved ? new Date().toISOString() : null;

          if (env.BUCKET) {
            await env.BUCKET.put("_system/feedback.json", JSON.stringify(feedbackList), {
              httpMetadata: { contentType: "application/json" }
            });
          }
          return new Response(JSON.stringify({ success: true, item }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: "Zgłoszenie nie zostało znalezione." }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 4. USUNIĘCIE ZGŁOSZENIA PRZEZ ADMINA
    if (url.pathname.startsWith("/admin/feedback/delete/") && request.method === "DELETE") {
      const ADMIN_SECRET = env.ADMIN_SECRET || "12345678";
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      try {
        const id = decodeURIComponent(url.pathname.split("/admin/feedback/delete/")[1]);
        let feedbackList = [];
        if (env.BUCKET) {
          const existingObj = await env.BUCKET.get("_system/feedback.json");
          if (existingObj) {
            feedbackList = JSON.parse(await existingObj.text());
          }
        }

        const initialLength = feedbackList.length;
        feedbackList = feedbackList.filter(f => f.id !== id);

        if (env.BUCKET && feedbackList.length !== initialLength) {
          await env.BUCKET.put("_system/feedback.json", JSON.stringify(feedbackList), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, deleted: feedbackList.length !== initialLength }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // =========================================================================
    // CLIENT PROOFING & REVISION PINS (MINI-FRAME.IO) API
    // =========================================================================

    // 1. POBIERANIE PINEZEK I UWAG DLA PLIKU
    if (url.pathname === "/api/proofing" && request.method === "GET") {
      const fileKey = url.searchParams.get("key");
      if (!fileKey) {
        return new Response(JSON.stringify({ success: false, message: "Brak klucza pliku" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
      let pins = [];
      if (env.BUCKET) {
        try {
          const obj = await env.BUCKET.get(`_system/proofing_${safeKey}.json`);
          if (obj) {
            pins = JSON.parse(await obj.text());
            if (!Array.isArray(pins)) pins = [];
          }
        } catch (e) {}
      }
      return new Response(JSON.stringify({ success: true, pins }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 2. DODAWANIE NOWEJ PINEZKI / UWAGI
    if (url.pathname === "/api/proofing" && request.method === "POST") {
      try {
        const body = await request.json();
        const fileKey = body.key;
        if (!fileKey || !body.pin) {
          return new Response(JSON.stringify({ success: false, message: "Nieprawidłowe dane" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
        let pins = [];
        if (env.BUCKET) {
          try {
            const obj = await env.BUCKET.get(`_system/proofing_${safeKey}.json`);
            if (obj) {
              pins = JSON.parse(await obj.text());
              if (!Array.isArray(pins)) pins = [];
            }
          } catch (e) {}
        }

        const newPin = {
          id: (body.pin.id && typeof body.pin.id === "string") ? body.pin.id.substring(0, 80) : ("pin_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7)),
          time: typeof body.pin.time === "number" ? body.pin.time : null,
          formattedTime: body.pin.formattedTime || null,
          xPct: typeof body.pin.xPct === "number" ? Math.max(0, Math.min(100, Math.round(body.pin.xPct * 10) / 10)) : 50,
          yPct: typeof body.pin.yPct === "number" ? Math.max(0, Math.min(100, Math.round(body.pin.yPct * 10) / 10)) : 50,
          author: (body.pin.author || "Użytkownik").trim().substring(0, 60),
          comment: (body.pin.comment || "").trim().substring(0, 2000),
          resolved: false,
          resolvedAt: null,
          createdAt: new Date().toISOString(),
          timestamp: Date.now()
        };

        pins.push(newPin);
        if (pins.length > 300) pins = pins.slice(-300);

        if (env.BUCKET) {
          await env.BUCKET.put(`_system/proofing_${safeKey}.json`, JSON.stringify(pins), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, pin: newPin, pins }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd serwera: " + err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 3. PRZEŁĄCZANIE STATUSU ROZWIĄZANIA PINEZKI (RESOLVED / PENDING)
    if (url.pathname === "/api/proofing/toggle" && request.method === "POST") {
      try {
        const body = await request.json();
        const fileKey = body.key;
        const pinId = body.pinId;
        if (!fileKey || !pinId) {
          return new Response(JSON.stringify({ success: false, message: "Brak klucza lub ID uwagi" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
        let pins = [];
        if (env.BUCKET) {
          try {
            const obj = await env.BUCKET.get(`_system/proofing_${safeKey}.json`);
            if (obj) {
              pins = JSON.parse(await obj.text());
              if (!Array.isArray(pins)) pins = [];
            }
          } catch (e) {}
        }

        let updatedResolved = false;
        pins = pins.map(p => {
          if (p.id === pinId) {
            const res = !p.resolved;
            updatedResolved = res;
            return { ...p, resolved: res, resolvedAt: res ? new Date().toISOString() : null };
          }
          return p;
        });

        if (env.BUCKET) {
          await env.BUCKET.put(`_system/proofing_${safeKey}.json`, JSON.stringify(pins), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, pinId, resolved: updatedResolved, pins }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd serwera: " + err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 4. USUWANIE PINEZKI
    if ((url.pathname === "/api/proofing/delete" || url.pathname === "/api/proofing") && (request.method === "POST" || request.method === "DELETE")) {
      try {
        const body = await request.json();
        const fileKey = body.key;
        const pinId = body.pinId;
        if (!fileKey || !pinId) {
          return new Response(JSON.stringify({ success: false, message: "Brak klucza lub ID uwagi" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
        let pins = [];
        if (env.BUCKET) {
          try {
            const obj = await env.BUCKET.get(`_system/proofing_${safeKey}.json`);
            if (obj) {
              pins = JSON.parse(await obj.text());
              if (!Array.isArray(pins)) pins = [];
            }
          } catch (e) {}
        }

        pins = pins.filter(p => p.id !== pinId);

        if (env.BUCKET) {
          await env.BUCKET.put(`_system/proofing_${safeKey}.json`, JSON.stringify(pins), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, pinId, pins }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd serwera: " + err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // =========================================================================
    // DIGITAL UNBOXING API (WIDEO / NOTATKA GŁOSOWA OD NADAWCY)
    // =========================================================================

    // 1. UPLOAD NAGRANIA POWITANIA (WIDEO LUB AUDIO)
    if (url.pathname === "/upload-unboxing" && request.method === "PUT") {
      try {
        const fileKey = url.searchParams.get("key");
        const type = (url.searchParams.get("type") || "video").toLowerCase();
        if (!fileKey) {
          return new Response(JSON.stringify({ success: false, message: "Brak klucza pliku." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
        const ext = type === "audio" ? "mp3" : "webm";
        const contentType = type === "audio" ? "audio/webm;codecs=opus" : "video/webm";

        if (env.BUCKET) {
          await env.BUCKET.put(`_system/unboxing_${safeKey}.${ext}`, request.body, {
            httpMetadata: { contentType: contentType },
            customMetadata: {
              type: type,
              uploaded: new Date().toISOString(),
              forFile: fileKey
            }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          message: "Nagranie powitania zapisane pomyślnie.",
          type: type,
          key: safeKey
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd zapisu nagrania: " + err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 2. STREAMING / POBIERANIE NAGRANIA POWITANIA
    if (url.pathname === "/unboxing" && request.method === "GET") {
      const fileKey = url.searchParams.get("key");
      if (!fileKey || !env.BUCKET) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }

      const safeKey = encodeURIComponent(fileKey).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
      let obj = await env.BUCKET.get(`_system/unboxing_${safeKey}.webm`);
      let contentType = "video/webm";
      if (!obj) {
        obj = await env.BUCKET.get(`_system/unboxing_${safeKey}.mp3`);
        contentType = "audio/webm";
      }

      if (!obj) {
        return new Response("Unboxing recording not found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      headers.set("Content-Type", obj.httpMetadata?.contentType || contentType);
      headers.set("Accept-Ranges", "bytes");
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

      return new Response(obj.body, { headers });
    }

    // =========================================================================
    // ZABEZPIECZENIE PANELU MODERACJI
    // =========================================================================
    const ADMIN_SECRET = env.ADMIN_SECRET || "12345678"; 
    
    // 2. LISTA PLIKÓW DLA ZALOGOWANEGO UŻYTKOWNIKA (MOJE PLIKI - TRWAŁA HISTORIA KONTA)
    if (url.pathname === "/my-files" && request.method === "GET") {
      const userEmail = (request.headers.get("X-User-Email") || "").toLowerCase().trim();
      if (!userEmail) {
         return new Response(JSON.stringify({ success: false, message: "Brak adresu email." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (!env.BUCKET) return new Response(JSON.stringify({ files: [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      
      const safeEmail = userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const historyKey = `_user_history/${safeEmail}.json`;

      let historyFiles = [];
      const historyObj = await env.BUCKET.get(historyKey);
      if (historyObj) {
        try {
          historyFiles = await historyObj.json();
        } catch (_) {}
      }
      if (!Array.isArray(historyFiles)) historyFiles = [];

      // Sprawdź także fizycznie obecne pliki w R2 (aby zaimportować pliki wrzucone dawniej)
      const list = await env.BUCKET.list({ include: ['customMetadata'], limit: 1000 });
      const activeKeys = new Set(list.objects.map(o => o.key));
      const historyKeySet = new Set(historyFiles.map(h => h.key));

      // Dołącz pliki z R2, których jeszcze nie było w trwałej historii
      const currentR2Files = list.objects
        .filter(obj => !obj.key.startsWith("_") && (obj.customMetadata?.uploaderEmail || "").toLowerCase().trim() === userEmail);
      
      currentR2Files.forEach(obj => {
        if (!historyKeySet.has(obj.key)) {
          const rawUploaded = obj.uploaded ? (typeof obj.uploaded.toISOString === 'function' ? obj.uploaded.toISOString() : obj.uploaded) : new Date().toISOString();
          historyFiles.push({
            name: obj.customMetadata?.originalName || obj.key,
            size: obj.size,
            uploaded: rawUploaded,
            key: obj.key,
            directUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${obj.key}`,
            duration: obj.key.startsWith('1d/') ? '1d' : (obj.key.startsWith('30d/') ? '30d' : (obj.key.startsWith('burn/') ? 'burn' : 'permanent'))
          });
          historyKeySet.add(obj.key);
        }
      });

      // Sprawdź stan każdego pliku w historii (czy wciąż leży na dysku R2, czy wygasł)
      const finalFiles = historyFiles.map(f => {
        const stillExists = activeKeys.has(f.key);
        return {
          ...f,
          existsOnDisk: stillExists,
          status: stillExists ? 'active' : 'expired'
        };
      });

      // Zapisz zaktualizowaną historię z powrotem do R2
      try {
        await env.BUCKET.put(historyKey, JSON.stringify(finalFiles.slice(0, 1000)), {
          httpMetadata: { contentType: "application/json" }
        });
      } catch (_) {}

      return new Response(JSON.stringify({ success: true, files: finalFiles }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Endpoint do bezpiecznego i redundantnego rejestrowania pliku na koncie użytkownika
    if (url.pathname === "/my-files/record" && request.method === "POST") {
      const userEmail = (request.headers.get("X-User-Email") || url.searchParams.get("userEmail") || "").toLowerCase().trim();
      if (!userEmail) {
        return new Response(JSON.stringify({ success: false, message: "Brak adresu email." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      try {
        const body = await request.json();
        const fileKey = body.key || body.fileKey;
        if (!fileKey) {
          return new Response(JSON.stringify({ success: false, message: "Brak klucza pliku (key)." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        let headObj = null;
        if (env.BUCKET) {
          try {
            headObj = await env.BUCKET.head(fileKey);
          } catch (_) {}
        }
        const record = {
          key: fileKey,
          name: body.name || headObj?.customMetadata?.originalName || fileKey.split('/').pop() || fileKey,
          size: body.size || headObj?.size || 0,
          uploaded: body.uploaded || (headObj?.uploaded || new Date()).toISOString(),
          duration: body.duration || (fileKey.startsWith('1d/') ? '1d' : (fileKey.startsWith('30d/') ? '30d' : (fileKey.startsWith('burn/') ? 'burn' : 'permanent'))),
          directUrl: body.directUrl || `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fileKey}`,
          pageUrl: body.pageUrl || `https://dropsite.pages.dev/?f=${encodeURIComponent(fileKey)}`,
          status: 'active',
          existsOnDisk: true
        };
        await recordFileToUserHistory(userEmail, record);
        return new Response(JSON.stringify({ success: true, file: record }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // =========================================================================
    // MODUŁ ALBUMÓW I KOLEKCJI (DROPSITE ALBUMS)
    // =========================================================================
    // A. Tworzenie nowego albumu
    if (url.pathname === "/api/albums/create" && request.method === "POST") {
      const userEmail = (request.headers.get("X-User-Email") || "").toLowerCase().trim();
      if (!userEmail) {
        return new Response(JSON.stringify({ success: false, message: "Musisz być zalogowany, aby tworzyć albumy." }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      try {
        const body = await request.json();
        const { title, description, fileKeys, theme, password } = body;
        if (!title || !Array.isArray(fileKeys) || fileKeys.length === 0) {
          return new Response(JSON.stringify({ success: false, message: "Podaj tytuł oraz wybierz co najmniej 1 plik do albumu." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        const albumId = `alb_${generateNanoId(8)}`;
        const albumData = {
          id: albumId,
          title: title.trim(),
          description: (description || "").trim(),
          ownerEmail: userEmail,
          created: new Date().toISOString(),
          fileKeys: fileKeys,
          theme: theme || 'gallery', // 'gallery' | 'cinematic' | 'list'
          hasPassword: Boolean(password && password.trim()),
          password: password ? password.trim() : ""
        };

        await env.BUCKET.put(`_albums/${albumId}.json`, JSON.stringify(albumData), {
          httpMetadata: { contentType: "application/json" }
        });

        // Dodaj do listy albumów użytkownika
        const safeEmail = userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const userAlbumsKey = `_user_albums/${safeEmail}.json`;
        let userAlbums = [];
        const existing = await env.BUCKET.get(userAlbumsKey);
        if (existing) {
          try { userAlbums = await existing.json(); } catch (_) {}
        }
        if (!Array.isArray(userAlbums)) userAlbums = [];
        userAlbums.unshift({
          id: albumId,
          title: albumData.title,
          description: albumData.description,
          created: albumData.created,
          itemCount: fileKeys.length,
          theme: albumData.theme,
          hasPassword: albumData.hasPassword
        });
        await env.BUCKET.put(userAlbumsKey, JSON.stringify(userAlbums.slice(0, 200)), {
          httpMetadata: { contentType: "application/json" }
        });

        return new Response(JSON.stringify({
          success: true,
          albumId: albumId,
          albumUrl: `https://dropsite.pages.dev/?album=${albumId}`
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "Błąd tworzenia albumu: " + err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // B. Pobieranie listy albumów użytkownika
    if (url.pathname === "/api/albums/my-albums" && request.method === "GET") {
      const userEmail = (request.headers.get("X-User-Email") || "").toLowerCase().trim();
      if (!userEmail) {
        return new Response(JSON.stringify({ success: false, albums: [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const safeEmail = userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const userAlbumsKey = `_user_albums/${safeEmail}.json`;
      const existing = await env.BUCKET.get(userAlbumsKey);
      let albums = [];
      if (existing) {
        try { albums = await existing.json(); } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, albums }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // C. Pobieranie publicznego albumu (dla widoku galerii / odbiorcy)
    if (url.pathname === "/api/albums/get" && (request.method === "GET" || request.method === "POST")) {
      let albumId = url.searchParams.get("id");
      let reqPassword = "";
      if (request.method === "POST") {
        try {
          const b = await request.json();
          if (b.id) albumId = b.id;
          if (b.password) reqPassword = b.password;
        } catch (_) {}
      }
      if (!albumId) {
        return new Response(JSON.stringify({ success: false, message: "Brak identyfikatora albumu." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const albumObj = await env.BUCKET.get(`_albums/${albumId}.json`);
      if (!albumObj) {
        return new Response(JSON.stringify({ success: false, message: "Album nie istnieje lub wygasł." }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const albumData = await albumObj.json();

      if (albumData.hasPassword && albumData.password && albumData.password !== reqPassword) {
        return new Response(JSON.stringify({
          success: false,
          locked: true,
          title: albumData.title,
          description: albumData.description,
          message: "Album jest zabezpieczony hasłem."
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const filesInfo = [];
      for (const key of (albumData.fileKeys || [])) {
        try {
          const fHead = await env.BUCKET.head(key);
          if (fHead) {
            const rawName = fHead.customMetadata?.originalName || key;
            const mime = fHead.httpMetadata?.contentType || getMimeType(rawName);
            filesInfo.push({
              key: key,
              name: rawName,
              size: fHead.size,
              mime: mime,
              directUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`,
              pageUrl: `https://dropsite.pages.dev/?f=${encodeURIComponent(key)}`
            });
          }
        } catch (_) {}
      }

      return new Response(JSON.stringify({
        success: true,
        album: {
          id: albumData.id,
          title: albumData.title,
          description: albumData.description,
          created: albumData.created,
          theme: albumData.theme,
          ownerEmail: maskEmail(albumData.ownerEmail),
          files: filesInfo
        }
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // D. Usuwanie albumu
    if (url.pathname === "/api/albums/delete" && request.method === "DELETE") {
      const userEmail = (request.headers.get("X-User-Email") || "").toLowerCase().trim();
      const isAdmin = request.headers.get("X-Admin-Secret") === ADMIN_SECRET;
      const albumId = url.searchParams.get("id");

      if (!albumId) {
        return new Response(JSON.stringify({ success: false, message: "Brak albumId" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      const albumObj = await env.BUCKET.get(`_albums/${albumId}.json`);
      if (albumObj) {
        const albumData = await albumObj.json();
        if (!isAdmin && albumData.ownerEmail && albumData.ownerEmail !== userEmail) {
          return new Response(JSON.stringify({ success: false, message: "Brak uprawnień do usunięcia tego albumu." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        await env.BUCKET.delete(`_albums/${albumId}.json`);
      }

      if (userEmail) {
        const safeEmail = userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const userAlbumsKey = `_user_albums/${safeEmail}.json`;
        const existing = await env.BUCKET.get(userAlbumsKey);
        if (existing) {
          try {
            let albums = await existing.json();
            albums = albums.filter(a => a.id !== albumId);
            await env.BUCKET.put(userAlbumsKey, JSON.stringify(albums), { httpMetadata: { contentType: "application/json" } });
          } catch (_) {}
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 2b. LISTA PLIKÓW DLA PANELU MODERACJI (Z INDEKSACJĄ AUTORÓW & METADANYCH)
    if (url.pathname === "/list" && request.method === "GET") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ files: [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      const list = await env.BUCKET.list({ include: ['customMetadata'], limit: 1000 });
      const files = list.objects
        .filter(obj => !obj.key.startsWith("_"))
        .map(obj => ({
          name: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          originalName: obj.customMetadata?.originalName || obj.key,
          uploaderEmail: (obj.customMetadata?.uploaderEmail && obj.customMetadata.uploaderEmail !== "anonymous") ? obj.customMetadata.uploaderEmail : null,
          uploaderRole: obj.customMetadata?.uploaderRole || (obj.customMetadata?.isPro === "true" ? "pro" : "guest"),
          isPro: obj.customMetadata?.isPro === "true",
          views: parseInt(obj.customMetadata?.views || "0", 10),
          downloads: parseInt(obj.customMetadata?.downloads || "0", 10)
        }));
      return new Response(JSON.stringify({ files }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 2b. HURTOWE USUWANIE WSZYSTKICH PLIKÓW DANEGO UŻYTKOWNIKA
    if (url.pathname === "/admin/user-files/delete-all" && request.method === "POST") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (!env.BUCKET) return new Response("Błąd: Brak podpiętego dysku", { status: 500, headers: corsHeaders });
      try {
        const body = await request.json();
        const targetEmail = (body.email || "").toLowerCase().trim();
        if (!targetEmail) {
          return new Response(JSON.stringify({ success: false, message: "Brak adresu email użytkownika" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        const list = await env.BUCKET.list({ include: ['customMetadata'], limit: 1000 });
        const userObjects = list.objects.filter(obj => (obj.customMetadata?.uploaderEmail || "").toLowerCase().trim() === targetEmail);
        let deletedCount = 0;
        for (const obj of userObjects) {
          await env.BUCKET.delete(obj.key);
          const safeKey = encodeURIComponent(obj.key).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
          try {
            await Promise.all([
              env.BUCKET.delete(`_system/meta_${safeKey}.json`),
              env.BUCKET.delete(`_system/unboxing_${safeKey}.webm`),
              env.BUCKET.delete(`_system/unboxing_${safeKey}.mp3`),
              env.BUCKET.delete(`_system/proofing_${safeKey}.json`)
            ]);
          } catch (_) {}
          deletedCount++;
        }
        return new Response(JSON.stringify({ success: true, deletedCount }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // 2c. NADAWANIE / COFANIE DOSTĘPU PRO PRZEZ ADMINISTRATORA (BEZPOŚREDNI ZAPIS W R2)
    if (url.pathname === "/admin/user-pro/toggle" && request.method === "POST") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      if (!env.BUCKET) return new Response("Błąd: Brak podpiętego dysku", { status: 500, headers: corsHeaders });

      try {
        const body = await request.json();
        const targetEmail = (body.email || "").toLowerCase().trim();
        const action = body.action || "grant"; // "grant" | "revoke"
        const durationDays = parseInt(body.days || "30", 10);

        if (!targetEmail) {
          return new Response(JSON.stringify({ success: false, message: "Brak adresu email." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const userEmailKey = `_user_licenses/${targetEmail.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;
        if (action === "grant") {
          let expiresAt = null;
          if (durationDays > 0 && durationDays < 9999) {
            const d = new Date();
            d.setDate(d.getDate() + durationDays);
            expiresAt = d.toISOString();
          }
          const adminGrantedKey = `DS-PRO-ADMIN-${Date.now()}`;
          const payload = JSON.stringify({
            key: adminGrantedKey,
            ownerEmail: targetEmail,
            activatedAt: new Date().toISOString(),
            expiresAt: expiresAt,
            grantedBy: "admin"
          });
          await env.BUCKET.put(userEmailKey, payload, {
            httpMetadata: { contentType: "application/json" }
          });
          return new Response(JSON.stringify({ success: true, message: `Nadano dostęp PRO w R2 dla ${targetEmail}`, expiresAt }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        } else {
          await env.BUCKET.delete(userEmailKey);
          return new Response(JSON.stringify({ success: true, message: `Cofnięto dostęp PRO w R2 dla ${targetEmail}` }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // 3. USUWANIE PLIKÓW Z PANELU MODERACJI I PANELU UŻYTKOWNIKA
    if (url.pathname.startsWith("/delete/") && request.method === "DELETE") {
      const isAdmin = request.headers.get("X-Admin-Secret") === ADMIN_SECRET;
      const userEmail = (request.headers.get("X-User-Email") || "").toLowerCase().trim();

      if (!isAdmin && !userEmail) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response("Błąd: Brak podpiętego dysku", { status: 500, headers: corsHeaders });
      const key = decodeURIComponent(url.pathname.split("/delete/")[1]);

      // Jeśli operację wykonuje zalogowany użytkownik (nie admin)
      if (!isAdmin && userEmail) {
        const safeEmail = userEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const historyKey = `_user_history/${safeEmail}.json`;
        const historyObj = await env.BUCKET.get(historyKey);
        if (historyObj) {
          try {
            let hist = await historyObj.json();
            hist = hist.filter(h => h.key !== key && h.name !== key);
            await env.BUCKET.put(historyKey, JSON.stringify(hist), {
              httpMetadata: { contentType: "application/json" }
            });
          } catch (_) {}
        }
      }

      // Usuń fizyczny plik z R2 i powiązane metadane systemowe
      await env.BUCKET.delete(key);
      const safeKey = encodeURIComponent(key).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
      try {
          await Promise.all([
              env.BUCKET.delete(`_system/meta_${safeKey}.json`),
              env.BUCKET.delete(`_system/unboxing_${safeKey}.webm`),
              env.BUCKET.delete(`_system/unboxing_${safeKey}.mp3`),
              env.BUCKET.delete(`_system/proofing_${safeKey}.json`)
          ]);
      } catch (_) {}
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 4. ZMIANA TERMINOWOŚCI PLIKU PRZEZ ADMINISTRATORA
    if (url.pathname === "/update-expiry" && request.method === "POST") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ success: false, message: "Błąd: Brak podpiętego dysku" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

      try {
          const body = await request.json();
          const { key, newExpiry } = body;

          if (!key || !newExpiry) {
              return new Response(JSON.stringify({ success: false, message: "Brak parametrów key lub newExpiry." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
          }

          let baseKey = key;
          if (baseKey.startsWith("1d/")) baseKey = baseKey.substring(3);
          else if (baseKey.startsWith("30d/")) baseKey = baseKey.substring(4);
          else if (baseKey.startsWith("burn/")) baseKey = baseKey.substring(5);

          let newKey = baseKey;
          if (newExpiry === "1d") newKey = `1d/${baseKey}`;
          else if (newExpiry === "30d") newKey = `30d/${baseKey}`;
          else if (newExpiry === "burn") newKey = `burn/${baseKey}`;
          else if (newExpiry === "permanent") newKey = baseKey;

          if (key === newKey) {
              return new Response(JSON.stringify({ success: true, oldKey: key, newKey: newKey }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
          }

          const object = await env.BUCKET.get(key);
          if (!object) {
              return new Response(JSON.stringify({ success: false, message: "Plik nie istnieje lub został już usunięty." }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
          }

          await env.BUCKET.put(newKey, object.body, {
              httpMetadata: object.httpMetadata,
              customMetadata: object.customMetadata
          });
          await env.BUCKET.delete(key);

          return new Response(JSON.stringify({
              success: true,
              oldKey: key,
              newKey: newKey,
              finalUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${newKey}`
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

      } catch (err) {
          return new Response(JSON.stringify({ success: false, message: "Błąd podczas zmiany terminu: " + err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // 5. STATYSTYKI DYSKU
    if (url.pathname === "/stats" && request.method === "GET") {
      if (!env.BUCKET) {
          return new Response(JSON.stringify({ error: "Brak podpiętego bucketu w Workerze" }), { status: 500, headers: corsHeaders });
      }

      let totalUsedBytes = 0;
      let categories = { images: 0, videos: 0, documents: 0, archives: 0, others: 0 };
      const MAX_BYTES = await getMaxStorageBytes();
      
      try {
          const list = await env.BUCKET.list();
          const validObjects = list.objects.filter(obj => !obj.key.startsWith('_system/'));

          validObjects.forEach(obj => {
              const size = obj.size;
              const name = obj.key.toLowerCase();
              totalUsedBytes += size;

              if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) {
                  categories.images += size;
              } else if (/\.(mp4|webm|avi|mov|mkv)$/.test(name)) {
                  categories.videos += size;
              } else if (/\.(pdf|doc|docx|txt|rtf)$/.test(name)) {
                  categories.documents += size;
              } else if (/\.(zip|rar|7z|tar|gz)$/.test(name)) {
                  categories.archives += size;
              } else {
                  categories.others += size;
              }
          });

          return new Response(JSON.stringify({
              totalBytes: MAX_BYTES,
              usedBytes: totalUsedBytes,
              categories: categories,
              fileCount: validObjects.length
          }), { 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
          });

      } catch (err) {
          return new Response(JSON.stringify({ error: "Błąd zliczania dysku", msg: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================================
    // ENDPOINTY: DZIENNIK SESJI I TELEMETRIA NA ŻYWO (LIVE VISITOR TRACKER)
    // =========================================================================
    function getCountryNameByCode(code) {
      const map = {
        'PL': 'Poland', 'DE': 'Germany', 'US': 'United States', 'GB': 'United Kingdom',
        'FR': 'France', 'UA': 'Ukraine', 'NL': 'Netherlands', 'IT': 'Italy',
        'ES': 'Spain', 'CZ': 'Czech Republic', 'SK': 'Slovakia', 'AT': 'Austria',
        'CH': 'Switzerland', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
        'FI': 'Finland', 'IE': 'Ireland', 'CA': 'Canada', 'AU': 'Australia',
        'BR': 'Brazil', 'JP': 'Japan', 'KR': 'South Korea', 'IN': 'India'
      };
      return map[(code || '').toUpperCase()] || code || 'Nieznany kraj';
    }

    if (url.pathname === "/api/telemetry/ping" && request.method === "POST") {
      try {
        let body = {};
        try {
          body = await request.json();
        } catch(e) {}

        const sessionId = (body.sessionId || "").trim();
        if (!sessionId) {
          return new Response(JSON.stringify({ success: false, message: "Brak sessionId" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-real-ip") || "127.0.0.1";
        const country = request.cf?.country || "PL";
        const city = request.cf?.city || "Radom";
        const region = request.cf?.region || "";
        const isp = request.cf?.asOrganization || request.cf?.asn || "Multimedia Polska Sp. z o.o.";

        const now = Date.now();
        const sessionRecord = {
          sessionId: sessionId,
          visitorId: body.visitorId || sessionId,
          ip: ip,
          country: country,
          countryName: getCountryNameByCode(country),
          city: city,
          region: region,
          isp: isp,
          os: body.os || "Windows PC",
          browser: body.browser || "Google Chrome",
          deviceType: body.deviceType || (/(mobile|android|iphone|ipad)/i.test(body.os || '') ? 'mobile' : 'pc'),
          gpu: body.gpu || "AMD Radeon RX 7700 XT",
          battery: body.battery || "100%",
          screen: body.screen || "3840x2160",
          viewport: body.viewport || "2560x1311",
          dpr: body.dpr || 1,
          colorDepth: body.colorDepth || 24,
          timezone: body.timezone || "Europe/Warsaw",
          language: body.language || "pl-PL",
          referrer: body.referrer || "Direct / Bookmark",
          utmSource: body.utmSource || "direct",
          currentPage: body.currentPage || "/",
          flow: Array.isArray(body.flow) ? body.flow : [{ path: body.currentPage || "/", duration: 1, current: true }],
          sessionStart: body.sessionStart || now,
          lastActive: now,
          userEmail: (body.userEmail || "").toLowerCase().trim() || null,
          isPro: body.isPro === true,
          role: body.role || (body.userEmail ? "free" : "guest")
        };

        if (env.BUCKET) {
          const indexKey = `_telemetry/active_index.json`;
          let sessions = [];
          try {
            const indexObj = await env.BUCKET.get(indexKey);
            if (indexObj) {
              sessions = await indexObj.json();
            }
          } catch(e) {}

          const existingIdx = sessions.findIndex(s => s.sessionId === sessionId);
          if (existingIdx !== -1) {
            sessions[existingIdx] = {
              ...sessions[existingIdx],
              ...sessionRecord,
              userEmail: sessionRecord.userEmail || sessions[existingIdx].userEmail || null
            };
          } else {
            sessions.unshift(sessionRecord);
          }

          sessions.sort((a, b) => b.lastActive - a.lastActive);
          if (sessions.length > 100) sessions = sessions.slice(0, 100);

          await env.BUCKET.put(indexKey, JSON.stringify(sessions), {
            httpMetadata: { contentType: "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    if (url.pathname === "/admin/telemetry" && request.method === "GET") {
      const ADMIN_SECRET = (env.ADMIN_SECRET || "12345678").trim().toUpperCase();
      const reqSecret = (request.headers.get("X-Admin-Secret") || url.searchParams.get("secret") || "").trim().toUpperCase();
      if (reqSecret !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      let sessions = [];
      if (env.BUCKET) {
        try {
          const indexObj = await env.BUCKET.get(`_telemetry/active_index.json`);
          if (indexObj) {
            sessions = await indexObj.json();
          }
        } catch(e) {}
      }

      const now = Date.now();
      let onlineCount = 0;
      sessions.forEach(s => {
        const isOnline = (now - s.lastActive) < 60000;
        s.online = isOnline;
        if (isOnline) onlineCount++;
        s.durationSec = Math.max(0, Math.round((s.lastActive - s.sessionStart) / 1000));
      });

      return new Response(JSON.stringify({
        success: true,
        total: sessions.length,
        onlineCount: onlineCount,
        sessions: sessions
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (url.pathname === "/admin/telemetry/clear" && request.method === "POST") {
      const ADMIN_SECRET = (env.ADMIN_SECRET || "12345678").trim().toUpperCase();
      const reqSecret = (request.headers.get("X-Admin-Secret") || "").trim().toUpperCase();
      if (reqSecret !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      if (env.BUCKET) {
        try {
          await env.BUCKET.put(`_telemetry/active_index.json`, JSON.stringify([]));
        } catch(e) {}
      }
      return new Response(JSON.stringify({ success: true, message: "Wyczyszczono telemetrię." }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 6. ANALITYKA I ZARZĄDZANIE DLA ADMIN SUPER-DASHBOARD
    if (url.pathname === "/admin/analytics" && request.method === "GET") {
      const ADMIN_SECRET = env.ADMIN_SECRET || "12345678";
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu administratora." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ error: "Brak bucketu" }), { status: 500, headers: corsHeaders });

      try {
          const list = await env.BUCKET.list();
          const validObjects = list.objects.filter(obj => !obj.key.startsWith('_system/'));
          let totalBytes = 0;
          let counts = { images: 0, videos: 0, documents: 0, archives: 0, others: 0 };
          let sizes = { images: 0, videos: 0, documents: 0, archives: 0, others: 0 };
          let retentionStats = { permanent: 0, '30d': 0, '1d': 0, burn: 0, root: 0 };
          let expiredCount = 0;
          const now = Date.now();

          validObjects.forEach(obj => {
              totalBytes += obj.size;
              const k = obj.key;
              const lower = k.toLowerCase();

              // Klasyfikacja typów
              if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(lower)) { counts.images++; sizes.images += obj.size; }
              else if (/\.(mp4|webm|avi|mov|mkv)$/.test(lower)) { counts.videos++; sizes.videos += obj.size; }
              else if (/\.(pdf|doc|docx|txt|rtf)$/.test(lower)) { counts.documents++; sizes.documents += obj.size; }
              else if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) { counts.archives++; sizes.archives += obj.size; }
              else { counts.others++; sizes.others += obj.size; }

              // Klasyfikacja retencji
              if (k.startsWith('1d/')) {
                  retentionStats['1d']++;
                  if (obj.uploaded && (now - new Date(obj.uploaded).getTime() > 24 * 3600 * 1000)) expiredCount++;
              } else if (k.startsWith('30d/')) {
                  retentionStats['30d']++;
                  if (obj.uploaded && (now - new Date(obj.uploaded).getTime() > 30 * 24 * 3600 * 1000)) expiredCount++;
              } else if (k.startsWith('burn/')) {
                  retentionStats.burn++;
              } else {
                  retentionStats.permanent++;
              }
          });

          const MAX_STORAGE = env.MAX_STORAGE_BYTES ? parseInt(env.MAX_STORAGE_BYTES, 10) : 1099511627776;
          // Koszt Cloudflare R2: $0.015 / GB powyżej 10 GB darmowych
          const usedGB = totalBytes / (1024 * 1024 * 1024);
          const billableGB = Math.max(0, usedGB - 10);
          const r2CostUSD = Math.round(billableGB * 0.015 * 100) / 100;
          const r2CostPLN = Math.round(r2CostUSD * 4.05 * 100) / 100;

          return new Response(JSON.stringify({
              success: true,
              totalFiles: validObjects.length,
              totalBytes: totalBytes,
              maxStorageBytes: MAX_STORAGE,
              usedGB: Math.round(usedGB * 100) / 100,
              r2CostUSD,
              r2CostPLN,
              counts,
              sizes,
              retentionStats,
              expiredCount
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 7. CZYSZCZENIE WYGASŁYCH PLIKÓW (GARBAGE COLLECTOR)
    if (url.pathname === "/admin/clean-expired" && request.method === "POST") {
      const ADMIN_SECRET = env.ADMIN_SECRET || "12345678";
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak uprawnień." }), { status: 403, headers: corsHeaders });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ error: "Brak bucketu" }), { status: 500, headers: corsHeaders });

      try {
          const list = await env.BUCKET.list();
          const validObjects = list.objects.filter(obj => !obj.key.startsWith('_system/'));
          const now = Date.now();
          const toDelete = [];

          validObjects.forEach(obj => {
              const k = obj.key;
              if (k.startsWith('1d/') && obj.uploaded) {
                  if (now - new Date(obj.uploaded).getTime() > 24 * 3600 * 1000) toDelete.push(k);
              } else if (k.startsWith('30d/') && obj.uploaded) {
                  if (now - new Date(obj.uploaded).getTime() > 30 * 24 * 3600 * 1000) toDelete.push(k);
              }
          });

          for (const key of toDelete) {
              await env.BUCKET.delete(key);
          }

          return new Response(JSON.stringify({
              success: true,
              deletedCount: toDelete.length,
              message: `Usunięto ${toDelete.length} wygasłych plików.`
          }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- ZARZĄDZANIE LIMITAMI POJEMNOŚCI DYSKU DLA ADMINISTRATORA ---
    if (url.pathname === "/admin/quota" && request.method === "GET") {
      const ADMIN_SECRET = (env.ADMIN_SECRET || "12345678").trim();
      if ((request.headers.get("X-Admin-Secret") || "").trim() !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      let quotaGb = 1000;
      if (env.BUCKET) {
        try {
          const qObj = await env.BUCKET.get("_system/quota.json");
          if (qObj) {
            const data = await qObj.json();
            if (data && data.quotaGb !== undefined) quotaGb = parseInt(data.quotaGb, 10);
          }
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true, quotaGb }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (url.pathname === "/admin/quota" && request.method === "POST") {
      const ADMIN_SECRET = (env.ADMIN_SECRET || "12345678").trim();
      if ((request.headers.get("X-Admin-Secret") || "").trim() !== ADMIN_SECRET) {
        return new Response(JSON.stringify({ success: false, message: "Brak uprawnień administratora." }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      try {
        const body = await request.json();
        const quotaGb = parseInt(body.quotaGb, 10);
        if (isNaN(quotaGb)) {
          return new Response(JSON.stringify({ success: false, message: "Nieprawidłowa wartość limitu." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        if (env.BUCKET) {
          await env.BUCKET.put("_system/quota.json", JSON.stringify({ quotaGb, updatedAt: new Date().toISOString() }), {
            httpMetadata: { contentType: "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, quotaGb, message: "Limit pomyślnie zaktualizowany." }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // =========================================================================
    // ENDPOINTY SYGNALIZACJI WEBRTC: DROPSITE BEAM (TRANSFER P2P)
    // =========================================================================
    if (url.pathname === "/api/beam/session" && request.method === "POST") {
      try {
        const body = await request.json();
        let pin = "";
        for (let i = 0; i < 6; i++) {
          pin += Math.floor(Math.random() * 10).toString();
        }
        const sessionKey = `_beam/${pin}.json`;
        const sessionData = {
          pin: pin,
          created: Date.now(),
          fileName: body.fileName || "plik",
          fileSize: body.fileSize || 0,
          fileType: body.fileType || "application/octet-stream",
          senderOffer: null,
          receiverAnswer: null,
          senderCandidates: [],
          receiverCandidates: [],
          status: "waiting"
        };
        if (env.BUCKET) {
          await env.BUCKET.put(sessionKey, JSON.stringify(sessionData), {
            httpMetadata: { contentType: "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: true, pin, session: sessionData }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    if (url.pathname === "/api/beam/session" && request.method === "GET") {
      const pin = (url.searchParams.get("pin") || "").trim();
      if (!pin || pin.length !== 6 || !env.BUCKET) {
        return new Response(JSON.stringify({ success: false, message: "Nieprawidłowy kod PIN sesji Beam." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      try {
        const sObj = await env.BUCKET.get(`_beam/${pin}.json`);
        if (!sObj) {
          return new Response(JSON.stringify({ success: false, message: "Sesja Beam nie istnieje lub wygasła." }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        const session = await sObj.json();
        return new Response(JSON.stringify({ success: true, session }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    if (url.pathname === "/api/beam/signal" && request.method === "POST") {
      try {
        const body = await request.json();
        const pin = (body.pin || "").trim();
        const role = body.role; // "sender" | "receiver"
        const type = body.type; // "offer" | "answer" | "candidate" | "poll"

        if (!pin || pin.length !== 6 || !env.BUCKET) {
          return new Response(JSON.stringify({ success: false, message: "Brak kodu PIN sesji." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const sessionKey = `_beam/${pin}.json`;
        const sObj = await env.BUCKET.get(sessionKey);
        if (!sObj) {
          return new Response(JSON.stringify({ success: false, message: "Sesja Beam nie istnieje." }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        let session = await sObj.json();

        if (type === "offer" && role === "sender") {
          session.senderOffer = body.data;
          session.status = "offered";
          if (Array.isArray(body.candidates)) {
            session.senderCandidates = body.candidates;
          }
        } else if (type === "answer" && role === "receiver") {
          session.receiverAnswer = body.data;
          session.status = "connected";
          if (Array.isArray(body.candidates)) {
            session.receiverCandidates = body.candidates;
          }
        } else if (type === "candidate") {
          if (role === "sender") {
            session.senderCandidates = session.senderCandidates || [];
            session.senderCandidates.push(body.data);
          } else if (role === "receiver") {
            session.receiverCandidates = session.receiverCandidates || [];
            session.receiverCandidates.push(body.data);
          }
        }

        await env.BUCKET.put(sessionKey, JSON.stringify(session), {
          httpMetadata: { contentType: "application/json" }
        });

        return new Response(JSON.stringify({
          success: true,
          status: session.status,
          senderOffer: session.senderOffer,
          receiverAnswer: session.receiverAnswer,
          peerCandidates: role === "sender" ? session.receiverCandidates : session.senderCandidates
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    if (url.pathname === "/api/beam/session" && request.method === "DELETE") {
      const pin = (url.searchParams.get("pin") || "").trim();
      if (pin && env.BUCKET) {
        try {
          await env.BUCKET.delete(`_beam/${pin}.json`);
        } catch (_) {}
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },

  // ===========================================================================
  // CRON TRIGGER: AUTOMATYCZNE CZYSZCZENIE PRZETERMINOWANYCH PLIKÓW
  // ===========================================================================
  async scheduled(event, env, ctx) {
    if (!env.BUCKET) return;

    try {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const thirtyDaysMs = 30 * oneDayMs;

        const list = await env.BUCKET.list();

        for (const obj of list.objects) {
            if (obj.key.startsWith("_system/")) continue;
            if (obj.key.startsWith("_beam/") && ageMs > 15 * 60 * 1000) {
                await env.BUCKET.delete(obj.key);
                continue;
            }
            const uploadTime = new Date(obj.uploaded).getTime();
            const ageMs = now - uploadTime;

            // Pliki 1-dniowe
            if (obj.key.startsWith("1d/") && ageMs > oneDayMs) {
                await env.BUCKET.delete(obj.key);
            }
            // Pliki 30-dniowe
            else if (obj.key.startsWith("30d/") && ageMs > thirtyDaysMs) {
                await env.BUCKET.delete(obj.key);
            }
        }
    } catch (e) {
        console.error("Błąd podczas automatycznego czyszczenia dysku:", e);
    }
  }
};

// ============================================================================
// FUNKCJE POMOCNICZE DO GENEROWANIA SZYFROWANEGO LINKU
// ============================================================================
async function createPresignedUrl(accountId, accessKey, secretKey, bucket, key) {
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const method = "PUT";
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const region = "auto";
    const service = "s3";

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const signedHeaders = "host";
    const algorithm = "AWS4-HMAC-SHA256";
    const expires = "3600";
    
    const canonicalQueryString = `X-Amz-Algorithm=${algorithm}&X-Amz-Credential=${encodeURIComponent(accessKey + '/' + credentialScope)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=${signedHeaders}`;
    const canonicalHeaders = `host:${host}\n`;
    const canonicalRequest = `${method}\n/${bucket}/${key}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    const hashedCanonicalRequest = await hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)));
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const kDate = await hmac(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, "aws4_request");
    const signature = await hex(await hmac(kSigning, stringToSign));

    return `https://${host}/${bucket}/${key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

async function hmac(key, string) {
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(string));
}

async function hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
