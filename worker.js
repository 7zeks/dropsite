export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    const allowedOrigins = [
      "https://7zeks.github.io",
      "https://dropsite-umber.vercel.app",
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ];

    const isVercel = origin && origin.endsWith(".vercel.app");
    const allowOrigin = allowedOrigins.includes(origin) || isVercel ? origin : "https://7zeks.github.io";

    // Nagłówki CORS dla Twojego API
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Secret",
    };

    // Obsługa preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. BEZPOŚREDNI UPLOAD DLA MAŁYCH PLIKÓW (Bez presigned URLs i kluczy)
    if (url.pathname === "/upload-small" && request.method === "PUT") {
      try {
        const filename = url.searchParams.get("file") || "plik";
        const expiry = url.searchParams.get("expiry") || "permanent";
        const customSlug = url.searchParams.get("slug");
        const pwd = url.searchParams.get("pwd") || "";
        const maxdl = url.searchParams.get("maxdl") || "";
        const note = url.searchParams.get("note") || "";
        const fileSize = parseInt(request.headers.get("content-length") || "0", 10); 
        
        // --- ZABEZPIECZENIE BACKENDOWE ---
        if (env.BUCKET) {
            let totalUsedBytes = 0;
            const list = await env.BUCKET.list();
            list.objects.forEach(obj => { totalUsedBytes += obj.size; });
            const MAX_BYTES = 10737418240; // 10 GB
            if (totalUsedBytes + fileSize > MAX_BYTES) {
                return new Response(JSON.stringify({ success: false, message: "Odmowa: Brak miejsca na dysku." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        }

        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        let uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;

        // Jeśli podano własny alias (slug)
        if (customSlug) {
            const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
            const ext = safeFilename.includes('.') ? safeFilename.substring(safeFilename.lastIndexOf('.')) : '';
            uniqueFilename = `${cleanSlug}${ext}`;
        }

        let fileKey = uniqueFilename;
        if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
        else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
        else if (expiry === 'burn') fileKey = `burn/${uniqueFilename}`;

        // Bezpośredni zapis na dysk R2 z rozszerzonymi metadanymi
        await env.BUCKET.put(fileKey, request.body, {
            customMetadata: {
                views: "0",
                downloads: "0",
                password: pwd,
                maxDownloads: maxdl,
                note: note
            }
        });

        return new Response(JSON.stringify({
          success: true,
          key: fileKey,
          finalUrl: `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${fileKey}` 
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
            const expiry = url.searchParams.get("expiry") || "permanent"; 
            const customSlug = url.searchParams.get("slug");
            const pwd = url.searchParams.get("pwd") || "";
            const maxdl = url.searchParams.get("maxdl") || "";
            const note = url.searchParams.get("note") || "";
            const fileSize = parseInt(url.searchParams.get("size") || "0", 10); 
            
            if (env.BUCKET) {
                let totalUsedBytes = 0;
                const list = await env.BUCKET.list();
                list.objects.forEach(obj => { totalUsedBytes += obj.size; });
                const MAX_BYTES = 10737418240; 
                if (totalUsedBytes + fileSize > MAX_BYTES) {
                    return new Response(JSON.stringify({ success: false, message: "Odmowa: Brak miejsca na dysku." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
                }
            }

            const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            let uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;

            if (customSlug) {
                const cleanSlug = customSlug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
                const ext = safeFilename.includes('.') ? safeFilename.substring(safeFilename.lastIndexOf('.')) : '';
                uniqueFilename = `${cleanSlug}${ext}`;
            }

            let fileKey = uniqueFilename;
            if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
            else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;
            else if (expiry === 'burn') fileKey = `burn/${uniqueFilename}`;

            const multipartUpload = await env.BUCKET.createMultipartUpload(fileKey, {
                customMetadata: {
                    views: "0",
                    downloads: "0",
                    password: pwd,
                    maxDownloads: maxdl,
                    note: note
                }
            });
            
            return new Response(JSON.stringify({
                success: true,
                uploadId: multipartUpload.uploadId,
                key: multipartUpload.key,
                finalUrl: `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${multipartUpload.key}`
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
                    directUrl: `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${key}`
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
            const hasPassword = Boolean(meta.password && meta.password.trim().length > 0);
            const maxDownloads = meta.maxDownloads ? parseInt(meta.maxDownloads, 10) : null;
            const note = meta.note ? decodeURIComponent(meta.note) : "";

            return new Response(JSON.stringify({
                success: true,
                key: key,
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
                directUrl: hasPassword ? null : `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${key}`
            }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

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
            headers.set("Content-Disposition", `attachment; filename="${key.split('-').slice(1).join('-') || key}"`);

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
              finalUrl: `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${newKey}`
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
