# 🚀 Dropsite — Plan Rozwoju i Rozszerzenia Narzędzi PDF (Client-Side)

> **Główna przewaga Dropsite nad iLovePDF / SmallPDF / Adobe:**
> 100% Client-Side Processing (WebAssembly / PDF-Lib / PDF.js / Tesseract.js / Web Workers).  
> Pliki użytkownika **nigdy nie opuszczają przeglądarki ani pamięci RAM** — zero uploadu na zewnętrzne serwery, natychmiastowe przetwarzanie, pełne bezpieczeństwo danych RODO/NDA i brak limitów transferu.

---

## 🧭 Matryca Nowych Narzędzi PDF do Wdrożenia

### 1. 🛡️ Bezpieczeństwo i Ochrona Danych (Security & Privacy)
* **Zabezpiecz Hasłem (Protect / Encrypt PDF)**:
  * Szyfrowanie PDF (AES-128 / AES-256) za pomocą `pdf-lib` / `node-qpdf` WebAssembly.
  * Ustalanie haseł otwarcia (User password) oraz haseł uprawnień (Owner password — blokada druku, kopiowania tekstu).
* **Usuń Hasło (Unlock / Decrypt PDF)**:
  * Trwałe usuwanie zabezpieczenia po podaniu hasła właściciela w przeglądarce.
* **Anonimizacja & Redagowanie (Redact / Sanitize PDF)**:
  * Zaczernianie wrażliwych danych (PESEL, numery kart, dane teleadresowe) i fizyczne usuwanie wektorowego tekstu pod spodem z pliku (nie tylko wizualna nakładka).
* **Trwałe usuwanie metadanych (Metadata Stripper)**:
  * Czyszczenie ukrytych danych: nazwisko autora, data utworzenia, nazwa programu, koordynaty GPS skanera.

---

### 2. 📑 Zaawansowane Przetwarzanie i Organizacja (Advanced Page Operations)
* **Numeracja Stron (Page Numbers & Headers/Footers)**:
  * Wstawianie numerów stron (formaty: `Strona X`, `X / Y`, `[X]`), wybór fontu, koloru, marginesów, pozycji (dolny róg, środek) i zakresu (np. pomiń stronę tytułową).
* **Kadrowanie Stron (Crop PDF)**:
  * Wizualny kadr na podglądzie (canvas overlay) do ucinania białych marginesów lub przygotowania pliku do druku/etykiet kurierskich.
* **Porównywarka Dokumentów (PDF Diff / Visual Comparator)**:
  * Porównywanie dwóch wersji dokumentu PDF strona po stronie (nakładka wizualna "onion-skin" lub podział side-by-side z wykrywaniem różnic w tekście).
* **Naprawa i Odzyskiwanie (Repair PDF)**:
  * Rekonstrukcja uszkodzonych tabel XREF i strumieni PDF w przeglądarce.

---

### 3. 🔄 Konwersje i Ekstrakcja Danych (Conversion & Extraction)
* **OCR w Przeglądarce (Scanned PDF to Searchable PDF)**:
  * Silnik `tesseract.js` (WebAssembly/Worker) — rozpoznawanie tekstu ze skanów i tworzenie przeszukiwalnej warstwy tekstowej bez wysyłania skanów na serwer.
* **PDF do Czystego Tekstu / Markdown (PDF to Markdown / TXT)**:
  * Idealne pod generatywne AI (ChatGPT, Claude) — szybka ekstrakcja sformatowanego tekstu z PDF do Markdowna lub JSON.
* **HTML / Strona WWW do PDF (HTML/URL to PDF)**:
  * Konwersja wklejonego kodu HTML lub sformatowanego tekstu do wektorowego dokumentu PDF.

---

### 4. ✍️ Podpisywanie i Formularze (Sign & Forms)
* **Wypełnianie Formularzy AcroForms (Form Filler)**:
  * Edycja i zapis pól formularzy interaktywnych bezpośrednio w PDF.
* **Kreator Podpisu Odręcznego / Faksymile (Draw & Stamp Signature)**:
  * Rysowanie podpisu myszką/palcem lub wgranie zdjęcia podpisu z automatycznym usuwaniem białego tła i wklejeniem na wybrane strony.

---

## 🛠️ Architektura i Pakiety Technologiczne
* `pdf-lib`: Modyfikacje struktury, łączenie, dzielenie, numeracja, metadane, szyfrowanie podstawowe.
* `pdfjs-dist`: Renderowanie stron do Canvas o wysokiej gęstości pikseli (HiDPI preview) oraz ekstrakcja warstwy tekstowej.
* `tesseract.js`: Client-side OCR dla języków PL, EN, DE, FR, ES.
* `docx` / `exceljs` / `jspdf`: Generowanie dokumentów biurowych i arkuszy.

---
*Status: Zapisano do wdrożenia w kolejnych etapach.*
