# DROPSITE — BRAND, UI/UX DESIGN SYSTEM & PSYCHOLOGIA KLIENTA
> **Nadrzędny dokument referencyjny projektu Dropsite**.
> Każda modyfikacja kodu, designu, copywritingu oraz architektury interfejsu MUSI być bezwzględnie zgodna z zasadami zawartymi w tym dokumencie.

---

## 1. ARCHETYP I FILOZOFIA MARKI

### Kim jest Dropsite?
Dropsite to **„Szwajcarski sejf cyfrowy o prędkości światłowodu”**.
To narzędzie dla nowoczesnych profesjonalistów, twórców, agencji i wymagających użytkowników, którzy cenią prywatność, prędkość oraz bezkompromisową estetykę.

### Podstawowe filary tożsamości:
1. **Niezawodność i Dyskrecja (Zero-Knowledge)**: Klient wie, że jego pliki nie są indeksowane, analizowane pod reklamy ani podglądane. Szyfrowanie w RAM i natychmiastowe usuwanie to fundament.
2. **Instant Gratification (Natychmiastowa ulga)**: Żadnych zbędnych kroków, żadnych formularzy, zero captchy, zero spamu. Upuszczasz plik – transfer startuje z maksymalną prędkością łącza.
3. **Pozytywny, Hipnotyzujący Vibe**: Strona nie może być ponura, depresyjna ani technicznie surowa jak stary serwer FTP. Interfejs ma dawać przyjemność, budzić skojarzenie z najnowocześniejszymi aplikacjami (Linear, Apple, Raycast, Stripe).
4. **Prestiż bez arogancji (Płatności PRO)**: Wersja darmowa jest w pełni użyteczna i szanuje użytkownika. Opcja PRO (`✦ PRO`) jest naturalnym, pożądanym rozszerzeniem dla profesjonalistów (dłuższy czas, brak limitów, własny branding), a nie chamską blokadą („paywall”).

---

## 2. PSYCHOLOGIA KLIENTA (BEHAVIORAL UX)

### Z jakim stanem emocjonalnym przychodzi użytkownik?
* **Stres i presja czasu**: *„Muszę szybko przesłać ten plik klientowi/znajomemu, zanim minie deadline”*.
* **Niepewność**: *„Czy to bezpieczne? Czy to nie jest jakiś scam? Czy plik nie utknie na 99%?”*.
* **Zmęczenie agresywnym internetem**: Użytkownik ma dość platform oblepionych migającymi banerami, odliczaniem 30 sekund i fałszywymi przyciskami „POBIERZ”.

### Odpowiedź psychologiczna Dropsite:
* **Poczucie kontroli**: Użytkownik na każdym kroku widzi dokładnie, co się dzieje (przejrzysty pasek postępu, wskaźnik MB/s, estymacja czasu).
* **Szacunek dla skupienia**: Główny ekran koncentruje 100% uwagi na jednym zadaniu: **napisz co robimy → upuść plik → gotowe**.
* **Mikro-nagrody dopaminowe**:
  - Dźwięki interfejsu (lekkie, przestrzenne kliknięcia i akordy sukcesu w stylu macOS/iOS).
  - Subtelne confetti po pomyślnym wgraniu.
  - Płynące gradienty światła na tekście i elementach, które dają poczucie obcowania z produktem najwyższej klasy.

---

## 3. DESIGN SYSTEM & ESTETYKA WIZUALNA

### 3.1. Przestrzeń i Kompozycja (Space & Flow)
* **ZAKAZ sztucznych, ciemnych belek na pełną szerokość**: Nigdy nie dodajemy ciężkich nagłówków ani obramowań przecinających ekran w poprzek. Tło gwiazd i gradientów musi swobodnie oddychać.
* **Naturalny rozstaw narożny**: Logo w lewym górnym rogu, menu w prawym. Nie zwężamy nawigacji do sztucznej małej ramki na środku monitora.
* **Smart Auto-Hide na scrollu**:
  - Gdy użytkownik scrolluje w dół: nawigacja gładko wysuwa się w górę (`translateY(-130%)`), odsłaniając pełną treść i zapobiegając nachodzeniu napisów na elementy stałe.
  - Gdy użytkownik delikatnie przewinie w górę: nawigacja natychmiast płynnie zjeżdża z powrotem.
* **Optymalizacja pod ekrany 27" 2K (2560×1440) i laptopy**:
  - Szerokość kapsuły uploadu oraz siatki PDF Bento nie przekracza `~640–680px`.
  - Dzięki temu na dużych monitorach użytkownik nie musi skanować wzrokiem 2000 pikseli pustki, a na laptopach nic się nie rozjeżdża.
  - Całość sekcji Hero musi idealnie mieścić się w pionie w jednym oknie (1 viewport), bez obcinania dołu kapsuły.

### 3.1. Zasada Czystości: Zero Nadmiaru Kapsułek (Anti-Pill Overload & Clean Look)
* **ZAKAZ oblepiania interfejsu rzędami ciężkich pigułek**:
  - Nie zamykamy każdego słowa, etykiety czy parametru w osobnej ciemnej ramce/kapsułce.
  - Zamiast 4–5 poziomów ciemnych boksów stosujemy: **czystą typografię, przestrzeń (whitespace), subtelne kropki separatora `•` oraz delikatne linie podziału**.
* **Akcje pomocnicze jako Ghost Actions / Czysty Tekst z Ikoną**:
  - Przyciski pomocnicze (np. *Udostępnij*, *Nowy plik*, *Powiększ*, *Direct link*) mają postać lekkich, szklanych akcji bez ciężkich teł, które elegancko rozświetlają się dopiero przy najechaniu lub dotknięciu.
* **Estetyka klasy Awwwards**:
  - Interfejs ma sprawiać wrażenie lewitującego, krystalicznie czystego kokpitu – przestronny, minimalistyczny, z idealnym balansem światła i cienia.

### 3.2. Paleta Barw – Żywa, Pozytywna Mięta i Świeży Kosmos
* **Głębokie tło Obsidian Glass**:
  - `#090E17` do `#131D2E` – głęboka, aksamitna czerń z nutą nocy, wzbogacona o wielowarstwowe rozmycie `backdrop-filter: blur(20px)`.
* **Główny Bohater – Cyber Mint & Fresh Emerald**:
  - `#34D399` / `#10B981` / `#C4E7D4` / `#6EE7B7` – wiodący, promienny kolor marki dający poczucie świeżości, ultraszybkiego transferu, bezpieczeństwa i sukcesu.
* **Towarzysz – Neon Cyan & Electric Sky**:
  - `#38BDF8` / `#00D2FF` / `#06B6D4` – błękit transferu chmurowego, kompresji grafiki i harmonijnych miętowo-lazurowych gradientów.
* **Świeże Akcenty Wzbogacające Vibe**:
  - **Solar Gold** (`#FFBC39` / `#FBBF24`): prestiżowy akcent PRO, nielimitowanych transferów i funkcji premium.
  - **Electric Violet** (`#A855F7` / `#C084FC`): Kapsuła Czasu (TimeLock) i szyfrowanie Zero-Knowledge.
  - **Neon Coral Flame** (`#FF4439` / `#F43F5E`): Tryb Szpiegowski (Burn after read) oraz alerty.
* **Typografia**:
  - Teksty główne i nagłówki: śnieżnobiałe `#FFFFFF` lub ożywione płynącym gradientem światła (`animation: shine 6s linear infinite`).
  - Teksty pomocnicze: elegancki slate `#CBD5E1` oraz `#94A3B8` (nigdy ponura, brudna szarość).

### 3.3. Ruch, Animacje i Interakcje (Micro-Motion & Tactile Light)
* **ZŁOTA ZASADA: Zero skakania i uciekania elementów pod kursorem**:
  - **NIGDY** nie dodajemy fizycznych przesunięć (`translate`), szarpania ani uciekania pod myszką na elementach nawigacji czy logo.
  - Użytkownik musi czuć, że klikany element jest pewny, solidny i stabilny jak skała.
* **Subtelny, Aksamitny Błysk Kliknięcia (Delicate Tactile Glow & Micro-Sheen)**:
  - **ZAKAZ agresywnych, jaskrawych plam i wielkich fal (Zero ciężkich ripple effects)**: Animacja nie może rozlewać się po przycisku jak nieestetyczna plama ani przesłaniać tekstu.
  - Efekt dotknięcia/kliknięcia jest **ultra-delikatny, dyskretny i aksamitny**:
    - Miękkie rozświetlenie krawędzi lub mikro-poświata o niskim kryciu (`opacity: 0.15–0.25`, rozmyte miękkie światło).
    - Sprężyste, mikro-taktilne wciśnięcie (`transform: scale(0.985)`) z natychmiastowym, płynnym powrotem (`transition: transform 0.15s ease`).
    - Daje to eleganckie, dotykowe poczucie precyzyjnego mechanizmu klasy Apple / Linear / macOS.
* **Organiczny oddech światła**:
  - Pulsująca aura w tle (`navAuraBreath`) – delikatny oddech światła.
  - Płynąca fala światła na literach nagłówków – hipnotyzujący, luksusowy shimmer bez ruszania tekstu z miejsca.
  - Strumień uploadu w strzałce sygnetu (`uploadStreamLoop`) – ruch odbywa się wewnątrz piktogramu.

### 3.4. Ergonomia Mobile (Thumb-Zone & Native Sheets)
* **Wszystko pod kciukiem**:
  - Główne akcje, przycisk uploadu oraz dedykowany neonowy **Quick-Home FAB** znajdują się w dolnej strefie ekranu (`bottom: calc(22px + safe-area); right: 20px;`), aby powrót nie wymagał sięgania na samą górę monitora telefonu.
* **Natywne panele Bottom-Sheet Drawer**:
  - Złożone panele (Kompresja, Zaawansowane Opcje Transferu) wysuwają się od dołu z pełną przestrzenią (do `86vh`) i uchwytem pull-bar, zamiast zamykać się w ciasnych kapsułkach wewnątrz formularza.
* **Swipe to Dismiss na powiadomieniach**:
  - Powiadomienia można zamknąć czystą ikonką `✕` (bez tła) lub swobodnie wyrzucić gestem przesunięcia palcem w bok lub do góry.

---

## 4. STANDARDY TWORZENIA NOWYCH WIDOKÓW I KOMPONENTÓW

Każdy nowy komponent (modal, przycisk, karta, formularz, powiadomienie) musi spełniać poniższe kryteria:

1. **Modale i okna dialogowe**:
   - Zawsze wyśrodkowane w bieżącym oknie widoku na desktopie, a na mobile wysuwane jako elegancki Bottom-Sheet od dołu.
   - Tło: luksusowe ciemne szkło (`rgba(15, 23, 42, 0.92)` z `backdrop-filter: blur(20px)`), z delikatnym neonowym borderem `rgba(52, 211, 153, 0.25)`.
   - Zamykanie: po kliknięciu w tło (backdrop), klawiszem `ESC` lub dedykowanym przyciskiem `✕`.
2. **Przyciski Akcji (CTA)**:
   - Główny przycisk: Soczysty gradient szmaragdowo-miętowy (`#10B981` → `#34D399`), z miękkim neonowym cieniem oraz wewnętrzną falą świetlną na kliknięcie.
   - Drugorzędny przycisk: Szklany ghost (`rgba(255, 255, 255, 0.05)` z obwódką).
   - Każdy kliknięty przycisk daje natychmiastowy feedback dźwiękowy i wizualny.
3. **Pola formularzy i przełączniki**:
   - Płynne, aksamitne focus-ringi w kolorze mięty (`box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2)`).
   - Mikro-tagi informacyjne z wyraźnym kontrastem (np. zielone dla RAM, niebieskie dla P2P, złote dla PRO).

---

## 5. CHECKLISTA PRZED WDROŻENIEM JAKIEJKOLWIEK ZMIANY

Zanim zatwierdzisz jakąkolwiek zmianę w kodzie, zweryfikuj:
- [ ] **Czy interfejs nie jest przeładowany kapsułkami/pigułkami?** (Zastosuj czysty tekst, spacje i separatory `•`).
- [ ] Czy strona zachowuje żywy, promienny i bezpieczny klimat (Cyber Mint + Neon Cyan + Obsidian Glass)?
- [ ] Czy przycisk po kliknięciu wypełnia się miękkim światłem bez mechanicznego szarpania?
- [ ] Czy na telefonie elementy są łatwo dostępne pod kciukiem (Bottom-Sheet, Quick-Home FAB)?
- [ ] Czy elementy na monitorze 2K / 27" nie rozjeżdżają się na boki i mieszczą się w jednym oknie (1 viewport)?
- [ ] Czy żaden element pod kursorem myszy nie „ucieka”, nie trzęsie się i nie podąża w denerwujący sposób?
- [ ] Czy komunikat dla klienta jest prosty, uspokajający i budzi bezwzględne zaufanie?
