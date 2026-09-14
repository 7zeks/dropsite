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

### 3.2. Paleta Barw i Światła
* **Głębokie tło kosmiczne**: `#0B0F19` z domieszką `#070A11` – czyste, nieodpychające, z subtelnymi gwiazdami w tle.
* **Akcenty Główne (Sygnatura Dropsite)**:
  - **Mięta / Szmaragd**: `#34D399` / `#10B981` (symbol bezpieczeństwa, życia, aktywnego łącza, sukcesu).
  - **Cyjan / Sky Blue**: `#38BDF8` / `#00F0FF` (symbol prędkości, transferu w chmurze, lekkości).
  - **Luksusowy fiolet / lawenda**: `#C4B5FD` (akcent uzupełniający w gradientach tekstu).
  - **Złoto PRO**: `#FBBF24` / `#FFBC39` (zarezerwowane wyłącznie dla funkcji i statusu PRO).
* **Typografia**:
  - Teksty główne i nagłówki: śnieżnobiałe `#FFFFFF` lub ożywione płynącym gradientem światła (`animation: shine 6s linear infinite`).
  - Teksty pomocnicze i opisy: elegancki slate `#CBD5E1` oraz `#94A3B8` (nigdy brudna szarość).

### 3.3. Ruch, Animacje i Interakcje (Micro-Motion)
* **ZŁOTA ZASADA: Zero skakania i uciekania elementów pod kursorem**:
  - **NIGDY** nie dodajemy fizycznych przesunięć (`translate`), szarpania ani podążania za myszką na elementach nawigacji czy logo.
  - Użytkownik musi czuć, że klikany element jest pewny, solidny i stabilny jak skała.
* **Ruch ma być organiczny i świetlny**:
  - Pulsująca aura w tle (`navAuraBreath`) – delikatny oddech światła.
  - Płynąca fala światła na literach – hipnotyzujący, luksusowy shimmer bez ruszania tekstu z miejsca.
  - Strumień uploadu w strzałce sygnetu (`uploadStreamLoop`) – ruch odbywa się wewnątrz piktogramu, a nie całym logotypem.

---

## 4. STANDARDY TWORZENIA NOWYCH WIDOKÓW I KOMPONENTÓW

Każdy nowy komponent (modal, przycisk, karta, formularz, powiadomienie) musi spełniać poniższe kryteria:

1. **Modale i okna dialogowe**:
   - Zawsze wyśrodkowane w bieżącym oknie widoku (`position: fixed; inset: 0; align-items: center; justify-content: center; z-index: 9999`).
   - Tło: luksusowe ciemne szkło (`rgba(15, 23, 42, 0.88)` z `backdrop-filter: blur(20px)`), z delikatnym neonowym borderem `rgba(52, 211, 153, 0.25)`.
   - Zamykanie: po kliknięciu w tło (backdrop), klawiszem `ESC` lub dedykowanym przyciskiem `✕`.
2. **Przyciski Akcji (CTA)**:
   - Główny przycisk: Soczysty gradient szmaragdowo-miętowy (`#10B981` → `#34D399`), z miękkim neonowym cieniem.
   - Drugorzędny przycisk: Szklany ghost (`rgba(255, 255, 255, 0.05)` z obwódką).
   - Każdy kliknięty przycisk daje natychmiastowy feedback dźwiękowy i wizualny.
3. **Pola formularzy i przełączniki**:
   - Płynne, aksamitne focus-ringi w kolorze mięty (`box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2)`).
   - Mikro-tagi informacyjne z wyraźnym kontrastem (np. zielone dla RAM, niebieskie dla P2P, złote dla PRO).

---

## 5. CHECKLISTA PRZED WDROŻENIEM JAKIEJKOLWIEK ZMIANY

Zanim zatwierdzisz jakąkolwiek zmianę w kodzie, zweryfikuj:
- [ ] Czy strona nie stała się ciemna, ponura lub klaustrofobiczna?
- [ ] Czy elementy na monitorze 2K / 27" nie rozjeżdżają się na boki i czy u dołu nie wystają niepotrzebnie sekcje z drugiego ekranu?
- [ ] Czy żaden element pod kursorem myszy nie „ucieka”, nie trzęsie się i nie podąża w denerwujący sposób?
- [ ] Czy zachowano pełną przezroczystość i przestrzeń tła (brak sztucznych, ciemnych belek)?
- [ ] Czy kolorystyka ściśle trzyma się palety: miętowy szmaragd, cyjan, głęboki granat/czerń kosmiczna i biel?
- [ ] Czy komunikat dla klienta jest prosty, uspokajający i budzi zaufanie?
