# POLITYKA PRYWATNOŚCI I PLIKÓW COOKIES (RODO)
## Serwis internetowy Dropsite (https://dropsite.pages.dev)
*Wersja obowiązująca od dnia 1 września 2026 r.*

---

### § 1. INFORMACJE OGÓLNE I ADMINISTRATOR DANYCH
1. Niniejsza Polityka Prywatności określa zasady przetwarzania danych osobowych oraz wykorzystywania plików cookies i pamięci lokalnej (Local Storage) w serwisie **Dropsite** (`https://dropsite.pages.dev`).
2. Administratorem danych osobowych Użytkowników Serwisu jest Usługodawca projektu Dropsite, kontakt e-mail: **`dropsite33@gmail.com`**.
3. Dbamy o Twoją prywatność. Serwis Dropsite został zaprojektowany w oparciu o zasadę **Privacy by Design** (prywatność w fazie projektowania) oraz minimalizację zbieranych danych.

---

### § 2. JAKIE DANE ZBIERAMY I W JAKIM CELU?

1. **Użytkownicy Niezalogowani (Darmowy Transfer):**
   * Nie wymagamy podawania imienia, nazwiska, adresu e-mail ani numeru telefonu do przesłania pliku.
   * **Pliki i ich metadane:** Podczas wysyłki zapisujemy plik na serwerach Cloudflare R2 wraz z parametrami technicznymi: nazwą pliku, rozmiarem, typem MIME, datą wysyłki, opcjonalnym hasłem (haszowanym) oraz ustawionym czasem retencji (1 dzień lub tryb Burn). Plik jest usuwany automatycznie po upływie wybranego czasu.
   * **Logi serwerowe i bezpieczeństwo:** Przetwarzamy adres IP oraz nagłówek User-Agent w celach technicznych (ochrona przed atakami DDoS, zapobieganie nadużyciom i spamowi, rate-limiting) na podstawie prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f RODO).

2. **Użytkownicy Zarejestrowani i Posiadacze Dropsite PRO:**
   * **Uwierzytelnianie (Google / E-mail):** Za pośrednictwem usługi Google Firebase Auth przetwarzamy Twój adres e-mail, unikalny identyfikator użytkownika (UID) oraz podstawowe dane profilowe (jeśli logujesz się przez Google) w celu utrzymania sesji i autoryzacji konta (art. 6 ust. 1 lit. b RODO).
   * **Licencje i Klucze PRO:** W celu powiązania zakupionej licencji z Twoim kontem i uniemożliwienia jej nieautoryzowanego użycia przez osoby trzecie, przypisujemy wygenerowany klucz licencyjny do Twojego adresu e-mail w bazie licencji.

3. **Płatności (Zakup subskrypcji PRO):**
   * Dane dotyczące płatności (dane karty płatniczej, adres rozliczeniowy) są przetwarzane bezpośrednio przez certyfikowanego operatora płatności **Polar Software Inc.** (Merchant of Record). Serwis Dropsite nie gromadzi ani nie przechowuje numerów kart płatniczych Użytkowników.

---

### § 3. ODBIORCY DANYCH (PODMIOTY PRZETWARZAJĄCE)
Dane Użytkowników mogą być przekazywane zaufanym podwykonawcom technologicznym w zakresie niezbędnym do funkcjonowania Serwisu:
* **Cloudflare, Inc. (USA / UE):** Dostawca infrastruktury brzegowej, sieci CDN, magazynu plików (Cloudflare R2) oraz funkcji bezserwerowych (Cloudflare Workers).
* **Google Ireland Limited / Google LLC:** Dostawca usługi Firebase Authentication do logowania Użytkowników oraz usługi analityki / reklam (Google AdSense, o ile aktywne).
* **Polar Software Inc. (Szwecja / USA):** Operator płatności i zarządzania licencjami subskrypcyjnymi.

Wszystkie podmioty spoza Europejskiego Obszaru Gospodarczego (EOG) stosują odpowiednie zabezpieczenia zgodne z RODO (np. Standardowe Klauzule Umowne UE - SCC lub certyfikację Data Privacy Framework).

---

### § 4. OKRES PRZECHOWYWANIA DANYCH
1. **Pliki Użytkowników:**
   * Pliki 24h: usuwane automatycznie po 24 godzinach od momentu wgrania.
   * Pliki Burn-after-read: usuwane automatycznie natychmiast po pierwszym pobraniu.
   * Pliki PRO (30 dni / Permanent): przechowywane przez okres 30 dni lub do momentu ręcznego usunięcia przez Użytkownika albo wygaśnięcia subskrypcji PRO.
2. **Konta Użytkowników:** Dane konta Firebase przechowywane są do momentu żądania usunięcia konta przez Użytkownika.

---

### § 5. PLIKI COOKIES I PAMIĘĆ PRZEGLĄDARKI (LOCAL STORAGE)
1. Serwis Dropsite wykorzystuje pamięć przeglądarki (`localStorage` oraz `sessionStorage`) do zapewnienia prawidłowego działania aplikacji jednostronicowej (SPA):
   * Zapamiętanie preferencji językowych (`dropsite_lang`).
   * Zapamiętanie ustawień dźwięków interfejsu (`dropsite_sound_enabled`).
   * Przechowywanie tokena sesji i klucza licencyjnego przypisanego do zalogowanego konta (`dropsite_pro_key_[UID]`).
   * Lokalna historia wgranych plików (widoczna wyłącznie na urządzeniu Użytkownika).
2. Serwis może wykorzystywać zewnętrzne ciasteczka analityczne lub reklamowe (np. Google AdSense) w przypadku Użytkowników darmowych. Użytkownik ma możliwość zarządzania plikami cookies w ustawieniach swojej przeglądarki internetowej.

---

### § 6. PRAWA UŻYTKOWNIKA W ŚWIETLE RODO
Każdemu Użytkownikowi przysługują następujące prawa:
* Prawo dostępu do swoich danych osobowych oraz otrzymania ich kopii.
* Prawo do sprostowania (poprawienia) swoich danych.
* Prawo do usunięcia danych („prawo do bycia zapomnianym”).
* Prawo do ograniczenia przetwarzania danych.
* Prawo do wniesienia sprzeciwu wobec przetwarzania.
* Prawo do wniesienia skargi do organu nadzorczego (w Polsce: Prezes Urzędu Ochrony Danych Osobowych - PUODO, ul. Stawki 2, 00-193 Warszawa).

W celu realizacji powyższych praw wystarczy wysłać wiadomość na adres: **`dropsite33@gmail.com`**.
