# PRIVACY POLICY & COOKIES POLICY (GDPR / RODO)
## Dropsite Online Service (https://dropsite.pages.dev)
*Effective as of September 1, 2026*

---

### 1. GENERAL INFORMATION & DATA CONTROLLER
1. This Privacy Policy sets out how personal data, cookies, and local browser storage are handled within the **Dropsite** web application (`https://dropsite.pages.dev`).
2. The Data Controller is the Dropsite Project Operator, reachable via email: **`dropsite33@gmail.com`**.
3. We operate strictly on a **Privacy by Design** principle: we only collect minimal data strictly necessary for providing fast and secure temporary file transfers.

---

### 2. DATA COLLECTED AND PURPOSES OF PROCESSING

1. **Guest / Unregistered Users (Free Transfer):**
   * No registration, email, or name required.
   * **File Data & Metadata:** We store uploaded files on Cloudflare R2 along with technical metadata (filename, size, MIME type, upload timestamp, hash, retention period). Files are permanently purged when their expiration timer elapses.
   * **Security Logs:** IP addresses and User-Agent headers may be processed in server logs for DDoS defense, rate-limiting, and abuse prevention based on legitimate interest (Art. 6(1)(f) GDPR).

2. **Registered Accounts & Dropsite PRO Users:**
   * **Authentication (Google / Email):** Managed through Google Firebase Authentication (email, user UID, profile metadata) to authenticate your sessions and license ownership (Art. 6(1)(b) GDPR).
   * **License Verification:** Your license key is mapped to your verified email address to prevent unauthorized license sharing.

3. **Payment Transactions:**
   * Handled externally and directly by **Polar Software Inc.** (Merchant of Record). Dropsite never accesses or stores credit card numbers or banking credentials.

---

### 3. THIRD-PARTY SERVICE PROVIDERS (DATA PROCESSORS)
* **Cloudflare, Inc. (USA / EU):** Edge CDN, serverless functions (Cloudflare Workers), and object storage (Cloudflare R2).
* **Google Ireland Limited / Google LLC:** Authentication infrastructure (Firebase Auth) and optional advertising (Google AdSense).
* **Polar Software Inc. (Sweden / USA):** Payment gateway and license checkout portal.

All international transfers adhere to Standard Contractual Clauses (SCC) or applicable Data Privacy Framework adequacy decisions.

---

### 4. DATA RETENTION
* 24h Files: Deleted automatically after 24 hours.
* Burn-after-read Files: Instantly destroyed upon the first successful download.
* PRO Files: Retained for 30 days or indefinitely until manual removal or subscription termination.
* Accounts: Retained until the user requests account deletion.

---

### 5. COOKIES & LOCAL STORAGE
We utilize browser storage (`localStorage` & `sessionStorage`) solely for core application features:
* `dropsite_lang`: Language preference.
* `dropsite_sound_enabled`: Sound effects toggle.
* `dropsite_pro_key_[UID]`: Per-account license key binding.
* Local file upload history (stored on your client device only).

---

### 6. YOUR RIGHTS (GDPR / RODO)
You have the right to access, rectify, restrict, or request erasure ("Right to be Forgotten") of your personal data.
To exercise your rights, contact us at: **`dropsite33@gmail.com`**.
