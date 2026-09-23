# 🧭 DROPSITE — MIKRO-PLAN ROZBUDOWY EKOSYSTEMU & ARCHITEKTURA PROSTEGO UX
> **Dokument Strategiczny i Granularny Plan Realizacji**  
> *Zasada nadrzędna: Zero regresji, modularna architektura (osobne pliki JS/CSS), ochrona użytkownika przed przebodźcowaniem, darmowy Asystent Algorytmiczny oraz bezkompromisowa jakość klasy Apple / Linear.*

---

## 📑 SPIS TREŚCI
1. [Filozofia Realizacji: Dlaczego mikro-etapy chronią nas przed błędami?](#1-filozofia-realizacji-dlaczego-mikro-etapy-chronią-nas-przed-błędami)
2. [Nowe Pomysły „Killer-Features” włączone do Planu](#2-nowe-pomysły-killer-features-włączone-do-planu)
3. [Architektura Kodu: Standard Izolacji Modułów](#3-architektura-kodu-standard-izolacji-modułów)
4. [Szczegółowy Podział na Mikro-Etapy (Sprint po Sprincie)](#4-szczegółowy-podział-na-mikro-etapy-sprint-po-sprincie)
   - [SPRINT 1: Asystent Algorytmiczny & Nawigacja Bez Zagubienia](#sprint-1-asystent-algorytmiczny--nawigacja-bez-zagubienia-priorytet-ux)
   - [SPRINT 2: Elitarna Rozbudowa PDF (Visual Matryca & Certyfikat Podpisu)](#sprint-2-elitarna-rozbudowa-pdf-visual-matryca--certyfikat-podpisu)
   - [SPRINT 3: Nowa Generacja Transferu Plików (Drop Request & Audio/Code Inspector)](#sprint-3-nowa-generacja-transferu-plików-drop-request--audio-code-inspector)
   - [SPRINT 4: Nowe Studia Narzędziowe (Samospalanie, Wideo, QR Studio)](#sprint-4-nowe-studia-narzędziowe-samospalanie-wideo-qr-studio)
   - [SPRINT 5: Szlif Mistrzowski, Command Palette & PWA Offline](#sprint-5-szlif-mistrzowski-command-palette--pwa-offline)
5. [Procedura Bezpieczeństwa QA dla każdego Mikro-Kroku](#5-procedura-bezpieczeństwa-qa-dla-każdego-mikro-kroku)

---

## 1. FILOZOFIA REALIZACJI: DLACZEGO MIKRO-ETAPY CHRONIĄ NAS PRZED BŁĘDAMI?

W projekcie o skali Dropsite (`index.html` liczy ponad 6000 linii, `app.js` ponad 700 KB, zaawansowane skrypty `toolbox.js` i `ram-engine.js`) wprowadzanie gigantycznych zmian naraz jest prostą drogą do konfliktów w kodzie, zawieszeń i błędów w konsoli.

### ⚠️ Stan faktyczny kodu (Co już jest na stronie i czego NIE dublujemy):
Przed przystąpieniem do prac przeprowadzono dokładny audyt kodu:
* ✅ **Wklejanie ze schowka (`Ctrl + V`):** Już działa globalnie w `app.js` (linia 8750) i automatycznie przechwytuje grafiki.
* ✅ **Kody QR dla plików:** Moduł QR jest już wdrożony (`qrious.min.js` + modal w `app.js`).
* ✅ **Odtwarzacz streamingowy i albumy:** Wideo MP4, audio MP3 i galerie zdjęć z muzyką działają na stronie pobierania.
* ✅ **Frame.io proofing:** Znaczniki czasu, komentarze na wideo i pinezki są w pełni wdrożone w chmurze R2.
* ✅ **Czyszczenie EXIF:** Funkcja `sanitizeImageExif` w `js/ram-engine.js` czyści metadane GPS.
* ✅ **Podstawowe narzędzia PDF:** Łączenie, dzielenie, edytor z podpisem odręcznym i manualną cenzurą RODO są w `js/toolbox.js`.

### Zasady bezpiecznej pracy:
1. **Zasada Izolacji (Zero Monolitu):** Każda nowa funkcja powstaje w osobnym, dedykowanym pliku w `js/` (np. `js/concierge.js`, `js/pdf-matrix.js`) oraz `css/` (np. `css/concierge.css`). Nie dopisujemy setek linii do `app.js` ani `index.html`.
2. **Niezależne Testy Jednostkowe:** Zanim moduł zostanie podpięty pod kliknięcia w HTML, jego logika jest weryfikowana w Node (`node --check`) i testowana na sucho.
3. **Brak Zależności od Zewnętrznych CDN:** Każda biblioteka pomocnicza musi znajdować się lokalnie w folderze `js/` (jak zrobiliśmy z `fflate.min.js`). Żaden ad-blocker nie może zepsuć działania strony.
4. **Zasada Nienaruszalności Core:** Funkcja podstawowa (szybki upload do R2 i odbiór plików) musi działać perfekcyjnie w 100% czasu – żaden nowy moduł nie ma prawa spowolnić ani wpłynąć na stabilność transferu głównego.
5. **Żelazna Zasada Czystości Kapsułki (Zero Capsule Bloat):** Główna kapsułka uploadu (`#uploadBox`) pozostaje nienaruszona, kompaktowa i stabilna wysokościowo. Wszelkie inteligentne sugestie, skróty akcji, narzędzia kontekstowe i opcje pomocnicze pojawiają się WYŁĄCZNIE w eleganckich, bocznych dymkach (floating flyout bubbles z grotem) lub wysuwanych od dołu panelach (native bottom-sheets na mobile). Kapsułka nigdy nie puchnie w dół ani nie wymusza przewijania strony.

---

## 2. NOWE POMYSŁY „KILLER-FEATURES” WŁĄCZONE DO PLANU

*Oto 5 innowacji, które idealnie wpisują się w archetyp „Szwajcarskiego Sejfu” i dadzą użytkownikom efekt natychmiastowego zachwytu:*

### 💡 1. Oficjalny Certyfikat Podpisu PDF (Audit Trail / Karta Podpisu)
* **Co to jest:** Po podpisaniu dokumentu PDF użytkownik może jednym kliknięciem wygenerować dołączaną na końcu stronę: *„Karta Autentyczności Podpisu Dropsite”*.
* **Co zawiera:** Znacznik czasu UTC, sumę kontrolną SHA-256 pliku przed i po podpisaniu, identyfikator sesji oraz deklarację poufności w RAM.
* **Dlaczego to top:** Zwykły darmowy podpis wygląda jak rysunek. Z certyfikatem Dropsite nabiera wagi oficjalnego dokumentu prawnego (jak w DocuSign czy Autenti za setki złotych abonamentu).

### 💡 2. Globalny Smart Paste (`Ctrl + V` ze Schowka w dowolnym miejscu)
* Robisz zrzut ekranu narzędziem wycinania (`Win + Shift + S`), wchodzisz na Dropsite i po prostu wciskasz `Ctrl + V`.
* Dropsite w ułamku sekundy przechwytuje obraz ze schowka, nadaje mu nazwę `Zrzut_ekranu_2026.png`, pokazuje elegancki podgląd i pyta: *„Wyślij w świat”*, *„Podpisz w PDF”* czy *„Usuń tło”*? Zero zapisywania śmieci na pulpicie.

### 💡 3. Smart Local QR Beam (Przesyłanie Laptop ➔ Smartfon w 2 sekundy)
* Chcesz szybko przenieść plik z komputera na telefon bez kabla, bez logowania do Google Drive i bez pisania linku w przeglądarce telefonu.
* Klikasz na pliku: *„Prześlij na telefon”* ➔ pojawia się luksusowy kod QR. Skanujesz go aparatem w iPhone/Androidzie i plik natychmiast ląduje na Twoim telefonie przez sieć lokalną/P2P.

### 💡 4. Sejf Podręczny (Floating Dock / Tray)
* Zamiast natychmiastowego wysyłania jednego pliku, użytkownik może „zrzucić” kilka plików do bocznego, zminimalizowanego doku.
* Następnie decyduje jednym kliknięciem: *„Spakuj wszystko do ZIP”*, *„Połącz w jeden PDF”* lub *„Wyślij jako wspólną paczkę”*.

### 💡 5. Tarcza Bezpieczeństwa Odbiorcy (Trust Badge & Integrity Check)
* Na stronie pobierania odbiorca widzi certyfikat bezpieczeństwa: *„Zweryfikowano w pamięci RAM: 0 wirusów, usunięto metadane telemetryczne, szyfrowanie AES-256”*. Budzi to natychmiastowe zaufanie u klientów i kontrahentów.

---

## 3. ARCHITEKTURA KODU: STANDARD IZOLACJI MODUŁÓW

```
dropsite/
├── css/
│   ├── concierge.css       <-- [NOWY] Style Asystenta Algorytmicznego
│   ├── pdf-matrix.css      <-- [NOWY] Style Wizualnej Matrycy Stron PDF
│   ├── drop-request.css    <-- [NOWY] Style Skrzynki Wrzutowej
│   ├── studios.css         <-- [NOWY] Style Multimediów i Narzędzi Sejfu
│   └── (istniejące css: upload, success, widgets, layout, vars)
├── js/
│   ├── concierge.js        <-- [NOWY] Mózg Asystenta (Słownik + Levenshtein + Intent)
│   ├── pdf-matrix.js       <-- [NOWY] Silnik Wizualnego Sortowania i Obracania PDF
│   ├── dead-drop.js        <-- [NOWY] Silnik Samospalających się Notatek AES-GCM
│   ├── qr-studio.js        <-- [NOWY] Generator Wektorowych Kodów QR z Logo
│   └── (istniejące js: app, toolbox, ram-engine, beam, fflate)
```

---

## 4. SZCZEGÓŁOWY PODZIAŁ NA MIKRO-ETAPY (SPRINT PO SPRINCIE)

---

### SPRINT 1: Asystent Algorytmiczny & Nawigacja Bez Zagubienia (Priorytet UX) ✅ UKOŃCZONY 100%
*Cel: Sprawić, by nikt wchodzący na Dropsite nie poczuł się zagubiony. Asystent kosztuje 0 zł, odpowiada w 0 ms i prowadzi za rękę.*

* [x] **Mikro-Krok 1.1: Silnik Reguł i Słownik Intencji (`js/concierge.js`)**
  * Zbudowano czysty moduł w JS zawierający bazę synonimów dla języka polskiego i angielskiego.
  * Zaimplementowano algorytm Levenshteina (odporność na literówki, błędy ortograficzne i odmiany słów).
  * Zdefiniowano mapowanie intencji na konkretne widoki i narzędzia serwisu.
  * *Weryfikacja:* Testy w Node zakończone 100% sukcesem.

* [x] **Mikro-Krok 1.2: UI Szklanego Widgetu Asystenta (`css/concierge.css` & `index.html`)**
  * Zintegrowany bezpośrednio w lewym dolnym doku systemowym (`#bottomActionDock`) jako natywny element akcji `✦ Zapytaj asystenta` z pulsującą neonową kropką.
  * Szklany modal obsidian glass z wyszukiwaniem semantycznym i kafelkami szybkich pytań.
  * Dodatkowe wsparcie dla urządzeń mobilnych w bocznym menu nawigacyjnym (`mobile-drawer-actions`).
  * *Weryfikacja:* Pełna unifikacja wizualna z dolną listwą macOS-dock w lewym dolnym rogu.

* [x] **Mikro-Krok 1.3: Inteligentne Akcje Przekierowań (1-Click Action Hub)**
  * Kliknięcie w podpowiedź asystenta natychmiast przełącza widok i otwiera dokładnie to narzędzie, o które pytał użytkownik.
  * Wyeliminowano wszelkie irytujące przewijanie w dół (`scrollIntoView`) — widoki otwierają się stabilnie na samej górze (`top: 0`).

* [x] **Mikro-Krok 1.4: Omni-Dropzone Context Dialog (`js/omni-dropzone.js` & `css/omni-dropzone.css`)**
  * Rozbudowa głównego pola wgrywania plików: po upuszczeniu lub wybraniu pliku pojawia się szklany, elegancki banner z inteligentnymi akcjami dopasowanymi do formatu:
    * Dla PDF: *„✍️ Podpisz / Edytuj”*, *„📑 Scal z innym”*, *„📉 Zmniejsz rozmiar”*.
    * Dla Wideo: *„⚡ Przełącz na Beam P2P (bez limitu)”*.
    * Dla Grafiki: *„🛡️ Wyczyść GPS / EXIF”* (natychmiastowa aktywacja z powiadomieniem), *„📑 Konwertuj do PDF”*.
    * Dla Archiwów/Kodu: *„🔑 Ustaw hasło”*, *„🔥 Zniszcz po pobraniu”*.

---

### SPRINT 2: Elitarna Rozbudowa PDF (Visual Matryca & Certyfikat Podpisu)
*Cel: Zapewnienie użytkownikowi doświadczenia lepszego niż w Adobe Acrobat i iLovePDF.*

* [x] **Mikro-Krok 2.1: Wizualna Matryca Stron PDF (`js/pdf-matrix.js` & `css/pdf-matrix.css`)**
  * Renderowanie miniatur wszystkich stron wczytanego dokumentu PDF za pomocą lokalnego `pdf.js` do kafelków canvas w RAM.
  * Nowa zakładka w Toolboxie: *„Układ stron & Obrót”* (`#toolPanel_organize`).
  * Wyświetlenie siatki z numerami stron, podglądem i wskaźnikami obrotu.

* [x] **Mikro-Krok 2.2: Interaktywne Sortowanie, Obrót i Usuwanie Stron**
  * Płynne przeciąganie kafelków (HTML5 Drag & Drop) w celu natychmiastowej zmiany kolejności stron w dokumencie.
  * Przyciski na każdym kafelku: obrót o 90° w prawo (`↻`), duplikacja (`+`), wykluczenie/usunięcie strony do kosza (`✕`).
  * Masowe akcje: obrót wszystkich stron, reset układu, wymiana pliku.
  * Bezpośredni eksport gotowego, zreorganizowanego dokumentu za pomocą `pdf-lib` z zachowaniem oryginalnej jakości.
  * Integracja z Asystentem Algorytmicznym oraz Omni-Dropzone (1-kliknięcie z głównej strony).

* [x] **Mikro-Krok 2.3: Generator Certyfikatu Podpisu (Audit Trail Sheet)**
  * Elegancki przełącznik z neonowym akcentem w module edycji/podpisu PDF: *„Dołącz oficjalną Kartę Autentyczności Podpisu (Audit Trail)”* ([index.html](file:///d:/projekty/sps/dropsite/index.html) & [css/widgets.css](file:///d:/projekty/sps/dropsite/css/widgets.css)).
  * Automatyczne włączanie i akcentowanie opcji po naniesieniu podpisu na dokument ([js/toolbox.js](file:///d:/projekty/sps/dropsite/js/toolbox.js)).
  * Silnik kryptograficzny wyliczający sumę SHA-256 pliku źródłowego za pomocą natywnego `crypto.subtle.digest('SHA-256', ...)`.
  * Generowanie w 100% w pamięci RAM profesjonalnej szwajcarskiej Karty Audytu A4 (1240 x 1754 px) z:
    * Nagłówkiem Dropsite Secure Audit Trail i sygnaturą eIDAS / Swiss Privacy Standard,
    * Metadanymi dokumentu źródłowego (nazwa, rozmiar, liczba stron, unikalny Audit ID),
    * Podzieloną na czytelne bloki kryptograficzną sumą SHA-256,
    * Chronologicznym dziennikiem zdarzeń (Audit Event Trail) z precyzyjnymi stemplami czasowymi UTC i lokalnymi,
    * Podglądem miniatury złożonego podpisu w ramce certyfikacyjnej,
    * Oficjalną pieczęcią bezpieczeństwa Dropsite (*Verified in RAM • 100% Client-Side*),
    * Klauzulą prawną eIDAS (art. 25 ust. 1) i gwarancją poufności zero-knowledge.
  * *Weryfikacja:* Pełna walidacja składniowa w Node.js, brak błędów.

* [x] **Mikro-Krok 2.4: Studio Znaków Wodnych (`js/watermark-studio.js` & `css/watermark-studio.css`)**
  * Dedykowana zakładka w Toolboxie: *„Znak Wodny”* (`#toolPanel_watermark`).
  * Podgląd strony po stronie na żywo w RAM z dynamicznym overlayem.
  * Presety treści: POUFNE, KOPIA, DRAFT, WZÓR, DO WGLĄDU oraz własny tekst.
  * Pełna kontrola parametrów: przezroczystość (5%–80%), kąt obrotu (-90° do 90°), wielkość fontu (18–110 pt), paleta 6 kolorów.
  * Dwa tryby rozmieszczenia: centralny stempel lub powtarzalna siatka ochronna.
  * Elastyczny zakres stron: wszystkie strony, ominięcie strony tytułowej (od strony 2) lub tylko 1. strona.
  * 100% wektorowy eksport za pomocą `pdf-lib` z zachowaniem jakości tekstu i struktury PDF.
  * Pełna integracja z Asystentem Algorytmicznym (Concierge), Omni-Dropzone oraz i18n (6 języków).

* [x] **Mikro-Krok 2.5: Automatyczna Detekcja Danych Wrażliwych RODO (`js/rodo-guard.js` & `css/rodo-guard.css`)**
  * Skanowanie tekstu całego dokumentu PDF 100% w pamięci RAM za pomocą `page.getTextContent()`.
  * Algorytmiczna weryfikacja i detekcja:
    * **PESEL**: 11 cyfr wraz z weryfikacją sumy kontrolnej wag `[1, 3, 7, 9, 1, 3, 7, 9, 1, 3]`.
    * **NIP**: 10 cyfr (ze spacjami/myślnikami) z weryfikacją sumy kontrolnej wag `[6, 5, 7, 2, 3, 4, 5, 6, 7]`.
    * **Numery Dowodów Osobistych**: seria 3 liter + 6 cyfr.
    * **Adresy E-mail**: standard RFC-5322.
    * **Rachunki Bankowe (IBAN / NRB)**: polski standard 26 cyfr.
    * **Kwoty i Waluty transakcyjne**: PLN, EUR, USD itp.
  * Szklany modal Obsidian Glass (`#rodoGuardModal`) z podglądem radarowym, filtrami kategorii, maskowaniem podglądu wartości (`••••`) i selekcją masową.
  * 1-kliknięcie aplikacji: automatyczne generowanie nieprzezroczystych prostokątów cenzury (`type: 'censor'`) na odpowiednich współrzędnych i stronach z obsługą historii Undo/Redo (`Ctrl+Z`).
  * Integracja z paskiem narzędzia cenzury w PDF Studio oraz Asystentem Algorytmicznym (Concierge).

---

### SPRINT 3: Nowa Generacja Transferu Plików (Drop Request & Audio/Code Inspector)
*Cel: Przekształcenie uploadera w profesjonalne narzędzie wymiany materiałów B2B.*

* [x] **Mikro-Krok 3.1: Skrzynka Wrzutowa Dropsite „Drop Request” (`/drop/nazwa` & `js/drop-request.js` & `css/drop-request.css`)**
  * Użytkownik może wygenerować dedykowany link do odbioru plików od swoich klientów.
  * Szklany modal kreatora z tytułem, notatką, terminem ważności i hasłem.
  * Strona skrzynki jest uproszczona do maksimum: klient wchodzi, widzi notatkę od zamawiającego, upuszcza pliki bez logowania i klika wyślij.
  * Zapis odebranych materiałów w panelu historii transferów.
  * Integracja z przyciskiem w głównym kokpicie, Omni-Dropzone oraz Asystentem Algorytmicznym.

* [x] **Mikro-Krok 3.2: Odtwarzacz Audio z Falą Dźwiękową (Audio Waveform w `js/audio-waveform.js` & `css/audio-waveform.css`)**
  * Integracja lekkiego, 100% klonowanego w RAM silnika wizualizacji fal dźwiękowych dla plików `.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`, `.m4a` opartego na Web Audio API i Canvas.
  * Odbiorca może posłuchać utworu, zobaczyć dynamikę nagrania, przeskakiwać po osi czasu (scrubber) i zapętlać przed pobraniem pliku na dysk.

* [x] **Mikro-Krok 3.3: Podgląd Plików Kodu i Tekstu (Code Viewer w `js/code-viewer.js` & `css/code-viewer.css`)**
  * Bezpieczny (XSS-safe) podgląd plików `.js`, `.ts`, `.py`, `.json`, `.css`, `.html`, `.md`, `.sql`, `.sh`, `.yml`, `.txt` z eleganckim podświetlaniem składni w oknie odbioru.
  * Numeracja linii, statystyki rozmiaru, przycisk natychmiastowego kopiowania do schowka.

* [x] **Mikro-Krok 3.4: Globalny Smart Paste (`Ctrl + V`) w `app.js`**
  * Przechwytywanie zdarzenia `paste` na oknie przeglądarki (z wykluczeniem aktywnych pól formularza).
  * Automatyczne przekształcenie zrzutu ekranu lub pliku graficznego w gotowy plik w strefie uploadu z natychmiastowym feedbackiem dźwiękowym i powiadomieniem toast.

---

### SPRINT 4: Nowe Studia Narzędziowe (Samospalanie, Wideo, QR Studio)
*Cel: Wdrożenie uniwersalnych narzędzi, po które użytkownicy wracają codziennie.*

* [x] **Mikro-Krok 4.1: Samospalające się Notatki (Dead Drop / Burn Note w `js/dead-drop.js` & `css/dead-drop.css`)**
  * Generator jednorazowych, szyfrowanych notatek tekstowych (hasła do bazy, tokeny API, kody PIN, dane logowania).
  * Tekst szyfrowany lokalnie w RAM kluczem AES-256-GCM.
  * Klucz wyłącznie w hashu URL (`#key`) – serwer nigdy nie ma dostępu do treści (Zero-Knowledge).
  * Ochronny widok ostrzeżenia przed przypadkowym odczytaniem z natychmiastowym wykasowaniem rekordu po odsłonięciu.

* [x] **Mikro-Krok 4.2: Studio Luksusowych Kodów QR 4K (`js/qr-studio.js` & `css/qr-studio.css`)**
  * Generowanie wektorowych kodów QR w SVG i PNG Ultra HD 4K (2048 x 2048 px) do druku.
  * Obsługa linków URL, sieci Wi-Fi (automatyczne łączenie), wizytówek vCard oraz zwykłego tekstu.
  * Palety barwne (Cyber Mint, Electric Cyan, Royal Gold, Obsidian), opcja osadzenia sygnetu Dropsite lub własnego logo.

* [x] **Mikro-Krok 4.3: Lokalny Kompresor Wideo pod limit 25 MB (`js/video-compress.js` & `css/video-compress.css`)**
  * Narzędzie oparte na MediaRecorder API i Canvas: kompresja wideo MP4, MOV, WebM w 100% na procesorze/karcie użytkownika w RAM, bez przesyłania materiału na serwer.
  * Presety: Limit E-mail & Discord (25 MB), Oszczędność ~70% (720p HD), Szybki Podgląd (540p).
  * Podgląd postępu kompresji na żywo oraz natychmiastowe pobranie skompresowanego pliku.

---

### SPRINT 5: Szlif Mistrzowski, Command Palette & PWA Offline
*Cel: Wrażenie produktu za milion dolarów – poziom Linear, Raycast i Apple.*

* [x] **Mikro-Krok 5.1: Globalna Konsola Skrótów Command Palette (`Ctrl + K` & `js/command-palette.js` & `css/command-palette.css`)**
  * Naciśnięcie `Ctrl + K` (lub `Cmd + K` na Macu / przycisk ⌘K w nagłówku) wywołuje szklany HUD typu Spotlight / Raycast / Linear.
  * Błyskawiczne filtrowanie i uruchamianie wszystkich 14+ narzędzi i widoków z pełną obsługą nawigacji strzałkami i klawiszem Enter.

* [x] **Mikro-Krok 5.2: Service Worker & PWA Offline Engine (`sw.js` & `manifest.json`)**
  * Rejestracja Service Workera cachującego wszystkie lokalne silniki (`pdf-lib`, `pdf.js`, `fflate`, moduły kompresji, style CSS i skrypty).
  * Aplikacja zyskuje wsparcie PWA, ikonę instalacji na pulpicie i działa w 100% sprawnie w trybie offline bez internetu.

* [x] **Mikro-Krok 5.3: Końcowy Audyt Wydajności i Bezpieczeństwa (100% PASS)**
  * 0 błędów składniowych w 25 plikach JS, 100% zbalansowane reguły w 18 plikach CSS, 0 duplikatów ID, pełna obsługa RWD na smartfonach.

---

## 5. PROCEDURA BEZPIECZEŃSTWA QA DLA KAŻDEGO MIKRO-KROKU

Przed uznaniem jakiegokolwiek mikro-kroku za ukończony, obowiązkowo przeprowadzana jest 4-etapowa weryfikacja:

1. **Weryfikacja Składni i Spójności:**
   * Uruchomienie `node --check` na każdym nowym i modyfikowanym pliku JS.
2. **Test Niezależności (Zero Regresji):**
   * Sprawdzenie, czy podstawowe wgrywanie plików (Cloudflare R2) oraz Beam P2P działają bez zakłóceń.
3. **Audyt Konsoli Przeglądarki:**
   * `0` błędów (zero czerwonych komunikatów `Uncaught Error` / `TypeError`).
4. **Weryfikacja Zgodności z `BRAND_GUIDELINES.md`:**
   * Czy zachowano paletę Cyber Mint & Obsidian Glass?
   * Czy nie pojawiły się „ciężkie, ciemne pigułki” ani przesunięcia pod kursorem?
   * Czy widok na telefonie zachowuje ergonomię kciuka?
