---
description: "Dropsite Brand, UI/UX Design System and Customer Psychology Rules"
globs: ["**/*"]
alwaysApply: true
---

# Dropsite — Reguły Stylu, UI/UX i Psychologii Klienta

Podczas tworzenia, edycji lub refaktoryzacji kodu projektu Dropsite, ZAWSZE przestrzegaj poniższych wytycznych:

## 1. Wygląd i Vibe Platformy
- **Pozytywny, luksusowy i lekki vibe**: Strona nie może być ponura, smutna ani przeładowana. Używamy głębokiego kosmicznego tła z czystymi gwiazdami i organicznymi, miękkimi neonowymi poświatami (`#34D399` mięta/szmaragd, `#38BDF8` cyjan, `#C4B5FD` fiolet w gradientach).
- **ZAKAZ sztucznych belek na pełną szerokość**: Nigdy nie dodawaj ciemnych, ciężkich pasków nawigacji ani obramowań przecinających ekran w poprzek. Tło ma płynnie oddychać.
- **Nawigacja narożna**: Logo w lewym górnym rogu (`top: 32-35px; left: 40px`), menu po prawej stronie. Nie wolno zwężać nawigacji do małego centrowanego pudełka na środku ekranu.
- **Smart Auto-Hide**: Elementy stałe nawigacji przy scrollu w dół płynnie wysuwają się poza ekran (`translateY(-130%)`), zapobiegając kolizjom z treścią. Przy scrollu w górę natychmiast wracają.

## 2. Stabilność Ruchu i Interakcje (Zero Skakania)
- **NIGDY nie wprowadzaj podążania za kursorem (efektu magnetycznego), trzęsienia ani uciekania elementów**: Użytkownik najeżdżający myszką na logo, przyciski czy linki musi czuć stabilność (żadnego `translate(...)` pod kursorem na logotypie).
- Ruch ma być subtelny i organiczny: płynąca fala światła po tekście (`shine`), pulsowanie aury w tle, wewnętrzny strumień uploadu w strzałce sygnetu.

## 3. Kompatybilność Ekranowa (27" 2K vs Laptopy)
- **Szerokość elementów roboczych**: Kapsuła uploadu oraz sekcje narzędziowe mają zachowywać szerokość ~`630–680px`. Nigdy nie rozciągaj kart roboczych na pełne 1400–2000px na monitorach 2K.
- **Sekcja Hero w jednym oknie (1 Viewport)**: Całość sekcji Hero (napisy + kapsuła) musi mieścić się w pionie w jednym oknie bez ucinania kapsuły u dołu i bez wpychania pod nią kolejnych sekcji.

## 4. Psychologia Klienta (Szwajcarski Sejf o Prędkości Światłowodu)
- **Zero-Friction**: Żadnych wymuszonych formularzy, rejestracji ani paywalli przed wgraniem pliku.
- **Zaufanie i prywatność**: Eksponuj bezpieczeństwo (szyfrowanie w RAM, natychmiastowe usuwanie, hasło, limit pobrań).
- **Pozycjonowanie PRO**: Wersja PRO to prestiżowy upgrade dla wymagających (`✦ PRO`), a nie agresywna blokada darmowych użytkowników.
- Szczegółowe zasady i paletę barw znajdziesz w pliku `BRAND_GUIDELINES.md`.
