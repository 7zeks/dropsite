# REGULAMIN ŚWIADCZENIA USŁUG DROGĄ ELEKTRONICZNĄ
## Serwis internetowy Dropsite (https://dropsite.pages.dev)
*Wersja obowiązująca od dnia 1 września 2026 r.*

---

### § 1. POSTANOWIENIA OGÓLNE
1. Niniejszy Regulamin określa zasady i warunki techniczne korzystania z serwisu internetowego **Dropsite**, dostępnego pod adresem internetowym `https://dropsite.pages.dev` oraz powiązanymi domenami (zwanego dalej „Serwisem”).
2. Właścicielem i operatorem Serwisu jest twórca projektu Dropsite, prowadzący działalność w ramach działalności nierejestrowanej (zgodnie z przepisami prawa Rzeczypospolitej Polskiej), kontakt: `dropsite33@gmail.com` (zwany dalej „Usługodawcą”).
3. Sprzedaż płatnych planów i subskrypcji cyfrowych (Dropsite PRO) prowadzona jest w modelu **Merchant of Record (MoR)** za pośrednictwem platformy **Polar.sh** (Polar Software Inc., z siedzibą w Sztokholmie, Szwecja / Delaware, USA). Podmiot ten jest formalnym sprzedawcą usługi dla Użytkownika końcowego i odpowiada za pobieranie oraz rozliczanie podatków (w tym podatku od towarów i usług VAT).
4. Korzystanie z Serwisu wymaga akceptacji niniejszego Regulaminu oraz Polityki Prywatności. Rozpoczęcie korzystania z Serwisu (w tym wgranie lub pobranie pliku) jest równoznaczne z zapoznaniem się i zaakceptowaniem treści niniejszych dokumentów.

---

### § 2. DEFINICJE
* **Użytkownik** – każda osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z Serwisu.
* **Użytkownik Zarejestrowany** – Użytkownik posiadający aktywne konto utworzone w Serwisie za pośrednictwem mechanizmu Firebase Authentication (np. logowanie Google / e-mail).
* **Dropsite PRO** – odpłatna wersja rozszerzona Serwisu oferująca dodatkowe funkcjonalności (większy limit pojedynczego pliku do 10 GB, opcje dłuższego przechowywania, brak reklam, personalizowane linki).
* **Plik** – dane cyfrowe przesłane przez Użytkownika na serwery pamięci masowej (Cloudflare R2) za pośrednictwem interfejsu Serwisu.
* **Czas Retencji (Wygaśnięcia)** – określony przy wgrywaniu czas, po upływie którego Plik jest bezpowrotnie i automatycznie usuwany z serwerów.

---

### § 3. CHARAKTER I RODZAJE USŁUG
1. Serwis świadczy usługi tymczasowego przesyłania, hostowania i udostępniania plików w sieci Internet.
2. W ramach Serwisu dostępne są następujące warianty usługi:
   * **Konto Podstawowe (Free / Gość):**
     * Maksymalna waga pojedynczego pliku: **250 MB**.
     * Dostępne okresy retencji: **24 godziny** lub tryb **Burn after read** (samozniszczenie natychmiast po pierwszym pobraniu).
     * Brak konieczności zakładania konta.
     * Strona pobierania może zawierać nienachalne materiały reklamowe.
   * **Konto Dropsite PRO (Płatne):**
     * Maksymalna waga pojedynczego pliku: **do 10 GB**.
     * Opcje retencji: **30 dni** lub **Bezterminowo (Permanent)** przez cały okres trwania aktywnej subskrypcji.
     * Możliwość definiowania własnych aliasów linków (Custom Slug / URL).
     * Całkowity brak reklam na stronach pobierania.
     * Priorytetowy transfer w globalnej sieci brzegowej Cloudflare.

---

### § 4. ZASADY KORZYSTANIA I TREŚCI ZABRONIONE
1. Użytkownik zobowiązuje się do korzystania z Serwisu w sposób zgodny z prawem, dobrymi obyczajami oraz niniejszym Regulaminem.
2. **Kategorycznie zabrania się przesyłania, przechowywania i rozpowszechniania za pośrednictwem Serwisu plików zawierających:**
   * Treści naruszające prawa autorskie lub prawa własności intelektualnej osób trzecich (piractwo, nieautoryzowane oprogramowanie).
   * Złośliwe oprogramowanie (wirusy, trojany, ransomware, keyloggery, skrypty phishingowe).
   * Treści pornograficzne z udziałem małoletnich (CSAM) lub materiały przedstawiające przemoc i nawoływanie do nienawiści / terroryzmu.
   * Nielegalne bazy danych zawierające dane osobowe lub poufne dane uwierzytelniające pochodzące z wycieków.
   * Treści służące do popełniania oszustw finansowych lub phishingu.
3. Usługodawca nie prowadzi prewencyjnej cenzury ani stałego monitoringu zawartości przesyłanych plików, działając jako dostawca usług hostingu w myśl przepisów o świadczeniu usług drogą elektroniczną oraz aktu o usługach cyfrowych (Digital Services Act - DSA).
4. Usługodawca zastrzega sobie prawo do natychmiastowego usunięcia dowolnego pliku oraz zablokowania dostępu Użytkownikowi, jeśli poweźmie wiarygodną wiadomość o bezprawnym charakterze danych (procedura *Notice and Take Down*).

---

### § 5. PŁATNOŚCI, SUBSKRYPCJE I ZWROTY (DROPSITE PRO)
1. Dostęp do planu Dropsite PRO realizowany jest na zasadzie subskrypcji miesięcznej lub zakupu licencji okresowej.
2. Ceny podane w Serwisie są cenami brutto lub netto (zależnie od lokalizacji Użytkownika) i są ostatecznie kalkulowane w formularzu zamówienia Polar.sh.
3. Płatności obsługiwane są za pośrednictwem zintegrowanych metod płatności (karty płatnicze, BLIK, Apple Pay, Google Pay).
4. Użytkownik może w każdej chwili anulować subskrypcję za pośrednictwem Portalu Klienta (`https://polar.sh/dropsite/portal`) lub przycisku w panelu konta. Anulowanie skutkuje zachowaniem uprawnień PRO do końca opłaconego okresu rozliczeniowego.
5. **Prawo odstąpienia od umowy:** Z uwagi na charakter świadczenia (natychmiastowe dostarczenie treści cyfrowych nieutrwalonych na nośniku materialnym), Użytkownik wyrażając zgodę na natychmiastowe odblokowanie funkcjonalności PRO przed upływem 14-dniowego okresu na odstąpienie od umowy, przyjmuje do wiadomości utratę prawa do odstąpienia od umowy, zgodnie z art. 38 ust. 1 pkt 13 Ustawy o prawach konsumenta. Nie wyłącza to prawa do składania reklamacji.

---

### § 6. ODPOWIEDZIALNOŚĆ I GWARANCJA
1. Usługa świadczona jest w stanie takim, w jakim się znajduje (**"AS IS"**). Usługodawca dokłada należytej staranności, aby Serwis działał w sposób ciągły, stabilny i bezpieczny.
2. Serwis Dropsite służy do **transferu i tymczasowej wymiany plików**, a nie do trwałego archiwizowania kopii zapasowych (backup). Usługodawca nie ponosi odpowiedzialności za utratę plików wynikającą z:
   * Upływu wybranego Czasu Retencji i planowego skasowania danych.
   * Użycia trybu "Burn after read" przez odbiorcę.
   * Działań siły wyższej, awarii globalnej infrastruktury dostawców chmurowych (Cloudflare, Firebase) lub błędów leżących po stronie Użytkownika (np. utrata hasła do zaszyfrowanego pliku).

---

### § 7. ZGŁASZANIE NARUSZEŃ (NOTICE & TAKE DOWN)
1. Każda osoba, której prawa zostały naruszone przez plik umieszczony w Serwisie, lub która wykryła plik o charakterze bezprawnym, ma prawo zgłosić ten fakt Usługodawcy.
2. Zgłoszenia należy kierować na adres e-mail: **`dropsite33@gmail.com`**, podając:
   * Dokładny adres URL pliku (np. `https://dropsite.pages.dev/?f=...` lub klucz R2).
   * Opis naruszenia (wraz z ewentualnym wykazaniem praw autorskich).
3. Usługodawca podejmuje działania uniemożliwiające dostęp do spornego pliku niezwłocznie po otrzymaniu wiarygodnego zgłoszenia (zazwyczaj w ciągu 24 godzin).

---

### § 8. POSTANOWIENIA KOŃCOWE
1. Usługodawca zastrzega sobie prawo do zmiany niniejszego Regulaminu z ważnych przyczyn technicznych, prawnych lub organizacyjnych.
2. W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają odpowiednie przepisy prawa polskiego oraz Unii Europejskiej.
3. Wszelkie pytania i reklamacje dotyczące działania Serwisu należy kierować na adres: `dropsite33@gmail.com`.
