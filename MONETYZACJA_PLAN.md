# 🚀 DROPSITE: MASTER PLAN OPERACYJNY & MONETYZACJA
**Projekt:** Dropsite — Prywatny, Błyskawiczny Transfer Plików & PDF Toolbox (Micro-SaaS)  
**Infrastruktura:** Cloudflare Pages (Frontend) + Cloudflare Workers (API) + Cloudflare R2 (Storage)  
**Ostatnia aktualizacja:** 13 września 2026 (Audyt kodu źródłowego & aktualizacja statusów)  

---

## 📑 SPIS TREŚCI
1. [Audyt Wdrożonych Funkcji (Stan Faktyczny: Co jest gotowe w 100%)](#-1-audyt-wdrożonych-funkcji-stan-faktyczny-gotowe-w-100)
2. [Analiza Braków i Priorytetyzacja (Od Najłatwiejszych do Najtrudniejszych)](#-2-analiza-braków-i-priorytetyzacja-od-najłatwiejszych)
3. [Krok 1: Błyskawiczne SEO i Routing Narzędzi PDF (~15 min)](#-krok-1-błyskawiczne-seo-i-routing-narzędzi-pdf-15-min)
4. [Krok 2: Aktywacja WAF w Cloudflare Dashboard (~5 min)](#-krok-2-aktywacja-waf-w-cloudflare-dashboard-5-min)
5. [Krok 3: Luksusowe Motywy Tła Strony Pobierania PRO (~30 min)](#-krok-3-luksusowe-motywy-tła-strony-pobierania-pro-30-min)
6. [Krok 4: Procedura Testów QA na Żywej Produkcji (~20 min)](#-krok-4-procedura-testów-qa-na-żywej-produkcji-20-min)
7. [Krok 5: Innowacja WOW — Kapsuła Czasu (Time-Locked Delivery) (~1.5 h)](#-krok-5-innowacja-wow--kapsuła-czasu-time-locked-delivery-15-h)
8. [Krok 6: Innowacja WOW — Dropsite Beam P2P / WebRTC (~2-3 h)](#-krok-6-innowacja-wow--dropsite-beam-p2p--webrtc-2-3-h)
9. [Krok 7: Własna Domena & Kampania Społecznościowa](#-krok-7-własna-domena--kampania-społecznościowa)

---

## ✅ 1. AUDYT WDROŻONYCH FUNKCJI (STAN FAKTYCZNY: GOTOWE W 100%)

Po wnikliwym audycie kodu źródłowego (`index.html`, `app.js`, `worker.js`, `js/ram-engine.js`, `js/toolbox.js`) potwierdzono pełne wdrożenie poniższych komponentów:

| Kategoria | Element | Status | Szczegóły techniczne w kodzie |
| :--- | :--- | :---: | :--- |
| **Infrastruktura** | Cloudflare Pages, Workers & R2 | ✅ 100% | Frontend na `dropsite.pages.dev`, produkcyjny backend na `uploud-api.dropsite33.workers.dev`, magazyn w R2 z 0 zł kosztów egressu. |
| **Płatności** | Stripe BLIK & Polar.sh | ✅ 100% | Podpięta obsługa powrotu `?pro_success=1`, weryfikacja licencji w `worker.js` (`/verify-pro`) oraz portal klienta Polar. |
| **Tarcza Kosztowa** | R2 Quota Guard | ✅ 100% | Zabezpieczenie `MAX_STORAGE_BYTES` w `worker.js` chroniące przed niekontrolowanym wzrostem kosztów. |
| **Silnik Transferu** | Upload & Download R2 | ✅ 100% | Limit darmowy 250 MB, limit PRO 10 GB, natychmiastowe pakowanie ZIP (`fflate.zipSync`), kody QR (`qrious.min.js`). |
| **Branding & UI** | Obsydianowy Glassmorphism + Favicon | ✅ 100% | Oficjalny transparentny neonowy favicon (mięta/cyjan) w formatach `favicon.ico`, `favicon.png` (512x512) i `favicon.svg`. |
| **Prywatność RAM** | Szyfrowanie Zero-Knowledge | ✅ 100% | Kryptografia AES-256-GCM bezpośrednio w przeglądarce przed wysłaniem bajtów do R2. |
| **Prywatność RAM** | Czyszczenie EXIF & GPS | ✅ 100% | Funkcja `window.DropsiteRAM.sanitizeImageExif` w `js/ram-engine.js`, przełącznik `#stripExifCheckbox` w opcjach PRO. |
| **Narzędzia PDF** | Wbudowany Toolbox RAM | ✅ 100% | Podpis cyfrowy, scalanie, rozdzielanie, kompresja oraz konwersja obrazów w `js/toolbox.js`. |
| **Prywatność PDF** | Cenzura RODO w 1 kliknięcie | ✅ 100% | Narzędzie Blackout / Cenzura w edytorze PDF trwale zamazujące dane wrażliwe (PESEL, adresy) w RAM. |
| **Multimedialność** | Streaming Player & Albumy | ✅ 100% | Odtwarzanie MP4/WEBM/MP3, kinowe albumy zdjęć z podkładem muzycznym bez konieczności pobierania na dysk. |
| **Frame.io Proofing** | Pinezki Rewizji na Wideo & Audio | ✅ 100% | Boczny panel uwag, znaczniki czasu na osi, kliknięcia w kadrze, synchronizacja w chmurze R2 (`/api/proofing`) i localStorage. |
| **Bezpieczeństwo** | Blokada Plików Niebezpiecznych | ✅ 100% | `dangerousExtensions` w `app.js` i `worker.js` blokujące `.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.js`, `.scr`, `.msi`, `.ps1`. |
| **Bezpieczeństwo** | Nagłówki Anti-XSS | ✅ 100% | `Content-Disposition: attachment` i `X-Content-Type-Options: nosniff` w `worker.js`. |
| **Pętla Wirusowa** | Szklany Baner dla Odbiorców | ✅ 100% | Baner na stronie pobierania (`.viral-loop-inner`) z wezwaniem do darmowej wysyłki w 5 sekund. |
| **Belka Zaufania** | 6 Kart Magnesów Dropsite | ✅ 100% | Wdrożona pod uploaderem w `index.html` (Kinowy odtwarzacz, EXIF, Zero-Knowledge, 10 GB/BLIK, Toolbox PDF, Burn-after-read). |
| **Zwijane FAQ** | 4 Pytania z Akordeonami | ✅ 100% | Sekcja `#faq` z animowanymi kartami, podświetleniami i obsługą i18n. |
| **Wielojęzyczność** | i18n (6 języków) | ✅ 100% | Pełna obsługa: PL, EN, DE, ES, FR, UK w `js/i18n.js`. |
| **Prawne** | Regulamin & Polityka Prywatności | ✅ 100% | Widoki `#view-regulamin` i `#view-polityka` dostosowane pod RODO/UE. |

---

## 🎯 2. ANALIZA BRAKÓW I PRIORYTETYZACJA (OD NAJŁATWIEJSZYCH)

Poniższa tabela porządkuje wszystkie pozostałe zadania według **trudności i wymaganego czasu**, abyśmy mogli natychmiast osiągnąć rezultaty przy minimalnym nakładzie pracy:

| Priorytet | Zadanie | Czas | Trudność | Zysk / ROI | Status |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **1** | **Błyskawiczne SEO i Routing Narzędzi PDF** | ~15 min | Bardzo łatwe | Przejęcie darmowego ruchu z Google na frazy PDF | ✅ 100% Wdrożone |
| **2** | **Zarządzanie Limiterem & Tarcza Pojemności R2** | ~10 min | Bardzo łatwe | Pełna kontrola pojemności dysku z panelu admina | ✅ 100% Wdrożone & Live |
| **—** | ~~Luksusowe Motywy Tła Strony Pobierania PRO~~ | ~30 min | Łatwe | Wzrost konwersji na pakiet PRO | 🚫 Odpuszczone |
| **3** | **Kapsuła Czasu (Time-Locked Delivery)** | ~1.5 h | Średnie | Efekt WOW i wirusowy marketing (embarga, urodziny) | ✅ 100% Wdrożone & Live |
| **4** | **Dropsite Beam (Nielimitowany Transfer P2P WebRTC)** | ~2 h | Zaawansowane | 0 zł kosztów serwera dla plików 50 GB / 100 GB | ✅ 100% Wdrożone & Live |
| **5** | **Oficjalna Procedura Testów QA na Produkcji** | ~20 min | Łatwe | 100% pewności działania przed promocją | ⏳ Gotowe do testów |
| **6** | **Własna Domena `dropsite.pl`** | ~10 min | Zewnętrzne | Budowa profesjonalnej polskiej marki | ⏳ Opcjonalnie |
| **7** | **Premiera Społecznościowa (Wykop, FB, Reddit)** | ~1 h | Marketing | Pierwsi płacący użytkownicy i wirusowy rozgłos | ⏳ Po QA |

---

## ✅ KROK 1: BŁYSKAWICZNE SEO I ROUTING NARZĘDZI PDF (WDROŻONE 100%)
*Zadanie zrealizowane: dedykowany routing SPA, plik `_redirects`, dynamiczne tagi meta/title oraz aktualizacja sitemap.xml.*

### Co zostało wdrożone:
1. **Dedykowany routing wirtualny w `app.js` (`handleSeoAndDeepLinking`):**
   - Obsługa adresów:
     - `/podpisz-pdf` lub `/#podpisz-pdf` ➔ automatycznie przełącza na widok Narzędzi i aktywuje moduł podpisu elektronicznego.
     - `/polacz-pdf` lub `/#polacz-pdf` ➔ otwiera moduł scalania PDF.
     - `/kompresor-pdf` lub `/#kompresor-pdf` ➔ otwiera moduł kompresji PDF.
     - `/cenzura-pdf` lub `/#cenzura-pdf` ➔ otwiera narzędzie cenzury RODO.
     - `/konwertuj-pdf` lub `/#konwertuj-pdf` ➔ otwiera konwerter PDF.
     - `/cennik`, `/funkcje`, `/faq`, `/kontakt`, `/regulamin`, `/polityka-prywatnosci`.
   - Dynamiczna zmiana `document.title` i `meta[name="description"]` dopasowana do szukanej frazy (np. *"Podpisz PDF Online za Darmo — Bezpiecznie w Pamięci RAM \| Dropsite"*).
2. **Plik `_redirects` dla Cloudflare Pages:**
   - Dodano reguły rewrites (kod 200) na `/index.html` dla czystych adresów SEO.
3. **Aktualizacja `sitemap.xml`:**
   - Dodano wpisy URL dla dedykowanych narzędzi z priorytetem `0.9` oraz sekcji serwisu.
4. **Uzupełnienie brakującego klucza i18n:**
   - Dodano brakujący klucz `hero_scroll_more` w słownikach `de`, `es`, `fr`, `uk` w `js/i18n.js`.

---

## ✅ KROK 2: ZARZĄDZANIE LIMITEREM & TARCZA POJEMNOŚCI R2 (WDROŻONE 100% & LIVE)
*Zadanie zrealizowane i zweryfikowane na żywym serwerze Cloudflare Workers + R2.*

### Jak to działa w kodzie i panelu admina:
1. **Panel Administratora (Zakładka Magazyn R2):**
   - Przyciski wyboru pojemności (10 GB, 50 GB, 100 GB, 500 GB, 1 TB, ∞ Nielimitowany) oraz przycisk „Zapisz i Zastosuj Limit”.
   - Po kliknięciu panel natychmiast synchronizuje stan z chmurą przez dedykowany endpoint `POST /admin/quota`.
   - Przy wejściu do panelu aktualny limit pobierany jest w tle z chmury przez `GET /admin/quota`.
2. **Backend API (`worker.js` w chmurze Cloudflare):**
   - Helper `getMaxStorageBytes()` odczytuje rzeczywisty limit zapisany w R2 (`_system/quota.json`).
   - Weryfikacja tarczy w endpointach `/upload-small` i `/multipart/upload`:
     - Użytkownicy darmowi są blokowani po osiągnięciu wybranego limitu (z zachowaniem ochrony portfela).
     - Użytkownicy PRO mają transfer nielimitowany pojemnością darmową.
     - Limit pojedynczego pliku wynosi 250 MB dla kont darmowych i 10 GB dla kont PRO.
3. **Testy na żywym serwerze produkcyjnym:**
   - Wykonano testy `GET /admin/quota` (status 200) oraz `POST /admin/quota` (status 200) potwierdzające 100% sprawności.
   - Nowa wersja została wdrożona na produkcję (`uploud-api.dropsite33.workers.dev`).

---

## 🚫 KROK 3: LUKSUSOWE MOTYWY TŁA (ODPUSZCZONE ZGODNIE Z DECYZJĄ)
*Krok pominięty na wniosek użytkownika w celu skupienia się na kluczowych funkcjach.*

---

## 🧪 KROK 4: PROCEDURA TESTÓW QA NA ŻYWEJ PRODUKCJI (~20 MIN)
*Uruchomienie procedury weryfikacyjnej na domenie produkcyjnej `dropsite.pages.dev`:*

- [ ] **Test 1: Darmowy transfer (< 250 MB)**
  - Wgraj plik testowy 5 MB jako gość.
  - Sprawdź generowanie linku, działanie kodu QR i pobranie pliku.
- [ ] **Test 2: Blokada darmowego limitu (> 250 MB)**
  - Upuść plik > 250 MB jako gość.
  - Sprawdź, czy pojawia się elegancki modal z propozycją pakietu PRO / BLIK.
- [ ] **Test 3: Płatność i Aktywacja PRO**
  - Sprawdź przekierowanie do Stripe BLIK i Polar.
  - Zweryfikuj aktywację statusu PRO po powrocie (`?pro_success=1`).
- [ ] **Test 4: Streaming wideo/audio i pinezki Frame.io**
  - Odtwórz wideo `.mp4` na stronie pobierania.
  - Kliknij na osi czasu, dodaj pinezkę z komentarzem, sprawdź czy zapisuje się w chmurze i odświeża.
- [ ] **Test 5: Tryb Samozniszczenia (Burn-After-Read)**
  - Prześlij plik z zaznaczoną opcją „Zniszcz po pobraniu”.
  - Pobierz plik raz — sprawdź, czy drugi refresh zwraca 404.
- [ ] **Test 6: Test mobilny (iOS / Android)**
  - Otwórz stronę na telefonie, przetestuj upload zdjęcia z rolki aparatu i responsywność.

---

## ✅ KROK 5: INNOWACJA WOW — KAPSUŁA CZASU (TIME-LOCKED DELIVERY) (WDROŻONE 100% & LIVE)
*Unikalna funkcja na rynku — fizyczna blokada pliku na serwerze do wyznaczonej daty i godziny z kinowym odliczaniem u odbiorcy.*

### Co zostało wdrożone i przetestowane:
1. **Frontend Nadawcy (`index.html`, `css/widgets.css`, `app.js`):**
   - W sekcji opcji zaawansowanych (`#advOptionsCard`) dodano przełącznik `#timeLockCheckbox` (fioletowa plakietka *„Blokada do daty”*).
   - Rozwijany szklany panel `#timeLockSettingsBox` z polem `#timeLockDatetime` (`datetime-local` z minimalną datą `teraz + 5 min`) oraz polem opcjonalnej wiadomości `#timeLockHintInput`.
   - Automatyczna walidacja daty i przekazywanie parametrów `&timelock=` oraz `&timehint=` w `uploadFileStandard` i `uploadFileMultipart`.
   - Plakietka statusu `⏳ Kapsuła Czasu` na ekranie sukcesu i w podsumowaniu transferu.
2. **Backend w chmurze (`worker.js` w Cloudflare Workers & R2):**
   - Obsługa `timelock` i `timehint` w `/upload-small` i `/multipart/create`.
   - Zapis `lockUntil` i `lockHint` w metadanych obiektu R2 oraz pliku pobocznym `_system/meta_${safeKey}.json`.
   - Endpoint `/file-info`: dopóki `Date.now() < lockUntil`, serwer zwraca `isTimeLocked: true`, `lockUntil`, `lockHint`, a bezpośrednie adresy `directUrl` i `streamUrl` pozostają `null`.
   - Twarda serwerowa blokada: endpointy `/stream` i `/burn-download` zwracają status HTTP `423 Locked`, fizycznie uniemożliwiając pobranie pliku przed czasem.
3. **Frontend Odbiorcy (`index.html`, `css/widgets.css`, `app.js`):**
   - Szklany, kinowy monolit `#dlTimeLockOverlay` z fioletowo-złotą aureolą światła i pulsującym klejnotem.
   - Odczyt i wyświetlenie wskazówki od nadawcy (`#dlTimeLockHintBox`).
   - 4 szklane kasetony zegara z neonowymi cyframi: `[ DNI ] : [ GODZ ] : [ MIN ] : [ SEK ]` odliczające sekundy w czasie rzeczywistym.
   - **Auto-Unlock:** Po wybiciu zera następuje odtworzenie dźwięku odryglowania, rozbłysk monolitu i automatyczne ponowne pobranie danych pliku bez przeładowania strony.
4. **Weryfikacja E2E (100% PASS):**
   - Zbudowano skrypt automatyczny `scratch/test_timelock_flow.js` testujący wgranie, blokadę 423 Locked, odczekanie do wybicia godziny zero i natychmiastowe pobranie 200 OK.
   - Nowy worker wdrożony na produkcję (`uploud-api.dropsite33.workers.dev`).

---

## ✅ KROK 6: INNOWACJA WOW — DROPSITE BEAM P2P / WEBRTC (WDROŻONE 100% & LIVE)
*Lokalny i globalny transfer bezpośredni (10 GB, 50 GB, 100 GB+) bez pośrednictwa serwera i z zerowym kosztem dysku R2.*

### Co zostało wdrożone i przetestowane:
1. **Silnik P2P WebRTC (`js/beam.js`):**
   - Klasa `DropsiteBeamEngine` wykorzystująca `RTCPeerConnection` oraz stabilne serwery Google STUN.
   - Dwustronny `RTCDataChannel` z binarnym przesyłem w pakietach 64 KB (`65536` bajtów).
   - Inteligentna kontrola bufora (backpressure / `bufferedAmountLowThreshold`) chroniąca przed zapychaniem RAM przy łączach gigabitowych.
   - Dynamiczny pomiar prędkości transferu w czasie rzeczywistym (MB/s) oraz estymacja czasu (ETA).
2. **Bezstanowa sygnalizacja w Cloudflare Workers & R2 (`worker.js`):**
   - Endpointy: `POST /api/beam/session` (generowanie 6-cyfrowego PIN-u), `POST /api/beam/signal` (wymiana SDP Offer, Answer i kandydatów ICE), `GET /api/beam/session` (odczyt sesji) oraz `DELETE /api/beam/session` (sprzątanie).
   - Automatyczne czyszczenie porzuconych sesji starszych niż 15 minut w cronie.
   - Wdrożenie na żywo przez `npx wrangler deploy` (`Current Version ID: 7fc12859-5afb-4179-94a4-03ccb02a41e2`).
3. **Nowoczesny interfejs użytkownika (`index.html` & `css/widgets.css`):**
   - Dodano odnośnik `Beam P2P` z neonową plakietką `⚡ 0 zł` w menu głównym i szufladzie mobilnej.
   - Dedykowany widok `#view-beam` w obsydianowym szkle z neonową poświatą cyjanowo-szmaragdową (`#06B6D4` / `#10B981`).
   - Tryb Nadawcy: dropzone na dowolny rozmiar pliku, 6 szklanych kasetonów PIN, generowany w locie kod QR (QRious), radar skanujący w oczekiwaniu na odbiorcę.
   - Tryb Odbiorcy: szybkie pole wprowadzania PIN-u, automatyczne łączenie z parametru URL `?beam=123456`, wskaźnik prędkości pobierania i automatyczny zapis pliku.
4. **Wielojęzyczność i Routing (`js/i18n.js` & `app.js`):**
   - Przetłumaczono 22 klucze językowe we wszystkich 6 językach: **PL, EN, DE, ES, FR, UK**.
   - Dodano czyste trasy SPA `/beam` w `_redirects` i `sitemap.xml`.
5. **Weryfikacja E2E (100% PASS):**
   - Zautomatyzowany skrypt `scratch/test_live_beam_signaling.js` przetestował pełny cykl handshake na żywym serwerze Cloudflare Workers.


---

## 📢 KROK 7: WŁASNA DOMENA & KAMPANIA SPOŁECZNOŚCIOWA

### 1. Własna Domena `dropsite.pl` (Opcjonalnie)
* Zakup domeny `dropsite.pl` (~12–15 zł w OVH / Seohost).
* Podpięcie w Cloudflare Pages w zakładce *Custom Domains* (automatyczny certyfikat SSL i routing DNS).

### 2. Dystrybucja Społecznościowa (Gotowe formatki postów):
* **Wykop.pl (Technologia / Wykopalisko):**
  > *„Cześć! Zbudowałem Dropsite — prywatną alternatywę dla WeTransfer bez reklam i bez logowania. Pliki do 250 MB za darmo, czyszczenie EXIF w RAM, odtwarzacz wideo w przeglądarce i zestaw narzędzi PDF. Działa na serwerach Cloudflare w Warszawie z obsługą BLIK. Będę wdzięczny za feedback!”*
* **Grupy Facebook (Montażyści wideo Premiere / DaVinci, Fotografowie):**
  > *„Jeśli szukacie alternatywy dla Frame.io i WeTransfer do wysyłania surówek klientom z możliwością stawiania pinezek z komentarzami na osi czasu wideo — przetestujcie Dropsite.”*
* **Reddit (`r/InternetIsBeautiful`, `r/selfhosted`):**
  > *„I built a privacy-focused, zero-knowledge file transfer & PDF toolbox with browser-based video streaming and RAM metadata stripping.”*
