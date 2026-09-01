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
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret, X-Pro-Key",
      "Access-Control-Max-Age": "86400",
    };

    // Obsługa preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =========================================================================
    // HELPER: WYKRYWANIE TYPU MIME DLA MULTIMEDIÓW I DYSKU R2
    // =========================================================================
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

    // =========================================================================
    // HELPER: WERYFIKACJA AUTORYZACJI PRO (POLAR.SH & STATIC KEYS)
    // =========================================================================
    async function checkProKeyValidity(rawKey) {
      if (!rawKey) return { valid: false, message: "Brak klucza licencyjnego." };
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

      // 3. Walidacja klucza w oficjalnym API Polar.sh
      if (env.POLAR_ACCESS_TOKEN) {
        try {
          const orgId = env.POLAR_ORG_ID || "a8ff89f6-b98c-4a21-bb7e-f231e79cf7d6";
          const polarRes = await fetch("https://api.polar.sh/v1/customer-portal/license-keys/validate", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.POLAR_ACCESS_TOKEN}`,
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
            if (data.status === "granted" || data.key) {
              return { 
                valid: true, 
                type: "polar", 
                expires_at: data.expires_at || null,
                benefit_id: data.benefit_id || null,
                message: "Klucz licencyjny z Polar.sh został pomyślnie zweryfikowany!" 
              };
            }
          }
        } catch (err) {
          console.error("Polar API validation error:", err);
        }
      }

      return { valid: false, message: "Nieprawidłowy lub nieaktywny klucz licencyjny." };
    }

    function isProAuthorized(req) {
      const proKey = req.headers.get("X-Pro-Key") || req.headers.get("X-Admin-Secret") || url.searchParams.get("proKey") || "";
      if (!proKey) return false;

      const trimmed = proKey.trim().toUpperCase();
      const adminSecret = (env.ADMIN_SECRET || "12345678").trim().toUpperCase();

      if (trimmed === adminSecret) return true;

      if (env.PRO_KEYS) {
        const keyList = env.PRO_KEYS.split(",").map(k => k.trim().toUpperCase());
        if (keyList.includes(trimmed)) return true;
      }

      if (trimmed === "PRO-VIP-2026" || trimmed === "PRO-LIFETIME" || trimmed === "PRO-COMMUNITY") {
        return true;
      }

      if (/^DS-[A-Z0-9]{4,}/i.test(proKey) || /^PRO-[A-Z0-9]{4,}/i.test(proKey)) {
        return true;
      }

      return false;
    }

    // =========================================================================
    // ENDPOINT: TWORZENIE SESJI CHECKOUT W POLAR.SH (KUP PRO)
    // =========================================================================
    if (url.pathname === "/create-checkout" && (request.method === "POST" || request.method === "GET")) {
      try {
        let successUrl = url.searchParams.get("success_url") || "";
        if (!successUrl && request.method === "POST") {
          try {
            const body = await request.json();
            successUrl = body.success_url || "";
          } catch(e){}
        }
        if (!successUrl) {
          const origin = request.headers.get("origin") || request.headers.get("referer") || "https://dropsite-umber.vercel.app";
          successUrl = `${origin.replace(/\/+$/, '')}/?pro_success=1`;
        }

        const priceId = env.POLAR_PRODUCT_PRICE_ID || "778c4c13-f652-4dcf-8699-9895a04742c6";
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
        if (!key) {
          try {
            const body = await request.json();
            key = body.key || "";
          } catch(e){}
        }
        const check = await checkProKeyValidity(key);
        return new Response(JSON.stringify({
          success: check.valid,
          isPro: check.valid,
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
        const fileSize = parseInt(request.headers.get("content-length") || "0", 10); 
        
        const isPro = isProAuthorized(request);

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
        if (env.BUCKET) {
            let totalUsedBytes = 0;
            const list = await env.BUCKET.list({ limit: 1000 });
            list.objects.forEach(obj => { totalUsedBytes += obj.size; });
            const MAX_BYTES = 10737418240; // 10 GB
            if (totalUsedBytes + fileSize > MAX_BYTES) {
                return new Response(JSON.stringify({ success: false, message: "Odmowa: Chwilowy brak miejsca na serwerze. Spróbuj ponownie później." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        }

        const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
        let uniqueFilename = `${generateNanoId(6)}${ext}`;

        // Jeśli podano własny alias (slug)
        if (customSlug) {
            const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
            uniqueFilename = `${cleanSlug}${ext}`;
        }

        let fileKey = uniqueFilename;
        if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
        else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
        else if (expiry === 'burn') fileKey = `burn/${uniqueFilename}`;

        // Bezpośredni zapis na dysk R2 z rozszerzonymi metadanymi i nagłówkiem Content-Type
        const detectedMime = getMimeType(filename);
        await env.BUCKET.put(fileKey, request.body, {
            httpMetadata: {
                contentType: detectedMime
            },
            customMetadata: {
                originalName: filename,
                views: "0",
                downloads: "0",
                password: pwd,
                maxDownloads: maxdl,
                note: note,
                isPro: isPro ? "true" : "false"
            }
        });

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
            const fileSize = parseInt(url.searchParams.get("size") || "0", 10); 
            
            const isPro = isProAuthorized(request);

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

            if (env.BUCKET) {
                let totalUsedBytes = 0;
                const list = await env.BUCKET.list({ limit: 1000 });
                list.objects.forEach(obj => { totalUsedBytes += obj.size; });
                const MAX_BYTES = 10737418240; 
                if (totalUsedBytes + fileSize > MAX_BYTES) {
                    return new Response(JSON.stringify({ success: false, message: "Odmowa: Brak miejsca na dysku serwera." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
                }
            }

            const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
            let uniqueFilename = `${generateNanoId(6)}${ext}`;

            if (customSlug) {
                const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
                uniqueFilename = `${cleanSlug}${ext}`;
            }

            let fileKey = uniqueFilename;
            if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
            else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
            else if (expiry === 'burn') fileKey = `burn/${uniqueFilename}`;

            const detectedMime = getMimeType(filename);
            const multipartUpload = await env.BUCKET.createMultipartUpload(fileKey, {
                httpMetadata: {
                    contentType: detectedMime
                },
                customMetadata: {
                    originalName: filename,
                    views: "0",
                    downloads: "0",
                    password: pwd,
                    maxDownloads: maxdl,
                    note: note,
                    isPro: isPro ? "true" : "false"
                }
            });
            
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

            const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
            await multipartUpload.complete(parts);

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
            const correctPassword = meta.password || "";

            if (!correctPassword || correctPassword === password) {
                return new Response(JSON.stringify({
                    success: true,
                    directUrl: `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`
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

            const meta = object.customMetadata || {};
            const originalName = meta.originalName || key.split('/').pop();
            const hasPassword = Boolean(meta.password && meta.password.trim().length > 0);
            const maxDownloads = meta.maxDownloads ? parseInt(meta.maxDownloads, 10) : null;
            const note = meta.note ? decodeURIComponent(meta.note) : "";

            return new Response(JSON.stringify({
                success: true,
                key: key,
                originalName: originalName,
                name: originalName,
                size: object.size,
                uploaded: object.uploaded,
                httpMetadata: object.httpMetadata,
                isBurn: isBurn,
                expiryType: expiryType,
                hasPassword: hasPassword,
                maxDownloads: maxDownloads,
                note: note,
                views: parseInt(meta.views || "1", 10),
                downloads: parseInt(meta.downloads || "0", 10),
                directUrl: hasPassword ? null : `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${key}`
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
            }

            return new Response(object.body, { headers });
        } catch (err) {
            return new Response("Błąd pobierania pliku: " + err.message, { status: 500, headers: corsHeaders });
        }
    }

    // =========================================================================
    // ZABEZPIECZENIE PANELU MODERACJI
    // =========================================================================
    const ADMIN_SECRET = env.ADMIN_SECRET || "12345678"; 
    
    // 2. LISTA PLIKÓW DLA PANELU MODERACJI
    if (url.pathname === "/list" && request.method === "GET") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ files: [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      const list = await env.BUCKET.list();
      const files = list.objects.map(obj => ({ name: obj.key, size: obj.size, uploaded: obj.uploaded }));
      return new Response(JSON.stringify({ files }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // 3. USUWANIE PLIKÓW Z PANELU MODERACJI
    if (url.pathname.startsWith("/delete/") && request.method === "DELETE") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response("Błąd: Brak podpiętego dysku", { status: 500, headers: corsHeaders });
      const key = decodeURIComponent(url.pathname.split("/delete/")[1]);
      await env.BUCKET.delete(key);
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
      const MAX_BYTES = 10737418240; 
      
      try {
          const list = await env.BUCKET.list();

          list.objects.forEach(obj => {
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
              categories: categories
          }), { 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
          });

      } catch (err) {
          return new Response(JSON.stringify({ error: "Błąd zliczania dysku", msg: err.message }), { status: 500, headers: corsHeaders });
      }
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
