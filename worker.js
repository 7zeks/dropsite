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

    // 1. GENEROWANIE LINKU DO UPLOADU (Tradycyjny upload dla małych plików)
    if (url.pathname === "/get-upload-url" && request.method === "GET") {
      try {
        const filename = url.searchParams.get("file") || "plik";
        const expiry = url.searchParams.get("expiry") || "permanent"; 
        const fileSize = parseInt(url.searchParams.get("size") || "0", 10); 

        // --- ZABEZPIECZENIE BACKENDOWE ---
        if (env.BUCKET) {
            let totalUsedBytes = 0;
            const list = await env.BUCKET.list();
            list.objects.forEach(obj => { totalUsedBytes += obj.size; });
            
            const MAX_BYTES = 10737418240; // 10 GB
            
            if (totalUsedBytes + fileSize > MAX_BYTES) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    message: "Odmowa: Brak miejsca na dysku. Przekroczono limit 10 GB." 
                }), { 
                    status: 403, 
                    headers: { "Content-Type": "application/json", ...corsHeaders } 
                });
            }
        }
        // ----------------------------------

        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;

        let fileKey = uniqueFilename;
        if (expiry === '1d') {
            fileKey = `1d/${uniqueFilename}`;
        } else if (expiry === '30d') {
            fileKey = `30d/${uniqueFilename}`;
        }

        const signedUrl = await createPresignedUrl(
            env.ACCOUNT_ID,
            env.R2_ACCESS_KEY_ID,
            env.R2_SECRET_ACCESS_KEY,
            env.BUCKET_NAME,
            fileKey 
        );

        return new Response(JSON.stringify({
          success: true,
          uploadUrl: signedUrl,
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
    // MULTIPART UPLOAD (Dla dużych plików) - NOWE ENDPOINTY
    // =========================================================================
    
    // KROK 1: Inicjalizacja uploadu
    if (url.pathname === "/multipart/create" && request.method === "GET") {
        try {
            const filename = url.searchParams.get("file") || "plik";
            const expiry = url.searchParams.get("expiry") || "permanent"; 
            const fileSize = parseInt(url.searchParams.get("size") || "0", 10); 
            
            // Zabezpieczenie miejsca (tak samo jak wyżej)
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
            const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`;

            let fileKey = uniqueFilename;
            if (expiry === '1d') fileKey = `1d/${uniqueFilename}`;
            else if (expiry === '30d') fileKey = `30d/${uniqueFilename}`;

            const multipartUpload = await env.BUCKET.createMultipartUpload(fileKey);
            
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
            const parts = data.parts; // Tablica: [{partNumber: 1, etag: "..."}]

            const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);
            await multipartUpload.complete(parts);

            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
    }

    // KROK 4 (Opcjonalny): Anulowanie uploadu, jeśli coś poszło nie tak
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

    // =========================================================================
    // ZABEZPIECZENIE PANELU MODERACJI
    // =========================================================================
    // Haker mógłby wysłać bezpośrednie zapytanie z Postmana by usunąć pliki, 
    // dlatego wymagamy podania tajnego hasła, które musi zgadzać się z tym na dole:
    const ADMIN_SECRET = env.ADMIN_SECRET || "12345678"; // <--- Zmień to hasło na swoje własne trudne do odgadnięcia!
    
    // 2. LISTA PLIKÓW DLA PANELU MODERACJI
    if (url.pathname === "/list" && request.method === "GET") {
      if (request.headers.get("X-Admin-Secret") !== ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, message: "Brak dostępu. Złe hasło API." }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (!env.BUCKET) return new Response(JSON.stringify({ files: [] }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      const list = await env.BUCKET.list();
      const files = list.objects.map(obj => ({ name: obj.key, size: obj.size }));
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

    // 4. STATYSTYKI DYSKU (Dynamicznie zliczane)
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
              } else if (/\.(mp4|webm|avi|mov)$/.test(name)) {
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

    // Fallback dla nieobsługiwanych endpointów (np. 404)
    return new Response("Not found", { status: 404, headers: corsHeaders });
  } 
}

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
