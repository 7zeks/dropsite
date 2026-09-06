function safeDecode(val) {
    if (!val || typeof val !== 'string') return '';
    try {
        return decodeURIComponent(val);
    } catch (_) {
        return val;
    }
}
window.safeDecode = safeDecode;

// 1. Skopiowana konfiguracja
const firebaseConfig = {
  apiKey: "AIzaSyAm1X3V10ImJ_RVaIqRpcFqRjlyg9vA5yI",
  authDomain: "filmy-zk.firebaseapp.com",
  projectId: "filmy-zk",
  storageBucket: "filmy-zk.firebasestorage.app",
  messagingSenderId: "168407000386",
  appId: "1:168407000386:web:9220f943400263461394db",
  measurementId: "G-TLSHRQH647"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// =========================================================================
// ULTRA-SMOOTH MODAL TRANSITIONS (APPLE / MODERN WEB SPEC)
// =========================================================================
window.smoothOpenModal = function(modalEl, displayType = 'flex') {
    if (!modalEl) return;
    modalEl.classList.remove('is-closing');
    modalEl.removeAttribute('hidden');
    modalEl.hidden = false;
    modalEl.style.display = displayType;
};

window.smoothCloseModal = function(modalEl, callback) {
    if (!modalEl) {
        if (callback) callback();
        return;
    }
    const isHidden = modalEl.hidden || modalEl.hasAttribute('hidden') || (modalEl.style.display === 'none' && !modalEl.classList.contains('is-closing'));
    if (isHidden) {
        if (callback) callback();
        return;
    }

    modalEl.classList.add('is-closing');
    let finished = false;

    const done = () => {
        if (finished) return;
        finished = true;
        modalEl.classList.remove('is-closing');
        modalEl.hidden = true;
        modalEl.setAttribute('hidden', '');
        if (modalEl.style.display && modalEl.style.display !== 'none') {
            modalEl.style.display = 'none';
        }
        if (callback) callback();
    };

    modalEl.addEventListener('animationend', (e) => {
        if (e.target === modalEl) done();
    }, { once: true });

    setTimeout(done, 220);
};

// 2. Obsługa okienka logowania i rejestracji (Google + E-mail)
const auth = firebase.auth();
const loginBtn = document.getElementById('loginBtn');
const loginModalWrap = document.getElementById('loginModalWrap');
const closeLoginModal = document.getElementById('closeLoginModal');
const doLoginBtn = document.getElementById('doLoginBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const toggleAuthModeBtn = document.getElementById('toggleAuthModeBtn');
const authModalTitle = document.getElementById('authModalTitle');
const loginError = document.getElementById('loginError');

let isRegisterMode = false;

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if (auth.currentUser) {
            auth.signOut().then(() => {
                setProKey('');
                showNotification('Wylogowano pomyślnie', 'info');
            });
        } else {
            loginError.textContent = '';
            window.smoothOpenModal(loginModalWrap);
        }
    });
}

if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
        window.smoothCloseModal(loginModalWrap, () => {
            loginError.textContent = '';
        });
    });
}

if (loginModalWrap) {
    loginModalWrap.addEventListener('click', (e) => {
        if (e.target === loginModalWrap) {
            window.smoothCloseModal(loginModalWrap, () => {
                loginError.textContent = '';
            });
        }
    });
}

// Przełącznik Logowanie <-> Rejestracja
if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        loginError.textContent = '';
        if (isRegisterMode) {
            if (authModalTitle) authModalTitle.textContent = 'Stwórz konto';
            if (doLoginBtn) doLoginBtn.querySelector('.btn-text').textContent = 'Zarejestruj się';
            toggleAuthModeBtn.innerHTML = 'Masz już konto? <span style="color: var(--accent-blue); font-weight: 600;">Zaloguj się</span>';
        } else {
            if (authModalTitle) authModalTitle.textContent = 'Zaloguj się';
            if (doLoginBtn) doLoginBtn.querySelector('.btn-text').textContent = 'Zaloguj się';
            toggleAuthModeBtn.innerHTML = 'Nie masz konta? <span style="color: var(--accent-blue); font-weight: 600;">Zarejestruj się</span>';
        }
    });
}

// Logowanie przez Google 1-kliknięciem
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            googleLoginBtn.disabled = true;
            googleLoginBtn.style.opacity = '0.7';
            const result = await auth.signInWithPopup(provider);
            loginModalWrap.setAttribute('hidden', '');
            showNotification(`Witaj, ${result.user.displayName || 'użytkowniku'}!`, 'success');
        } catch (error) {
            console.error("Błąd Google Auth:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                loginError.textContent = 'Logowanie Google zostało przerwane.';
            } else if (error.code === 'auth/unauthorized-domain') {
                loginError.textContent = 'Domena nie jest autoryzowana w Firebase Console (włącz 127.0.0.1 w Authentication -> Settings -> Authorized domains).';
            } else {
                loginError.textContent = error.message || 'Wystąpił błąd podczas logowania przez Google.';
            }
        } finally {
            googleLoginBtn.disabled = false;
            googleLoginBtn.style.opacity = '1';
        }
    });
}

// Logowanie / Rejestracja E-mail + Hasło
if (doLoginBtn) {
    doLoginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const pass = document.getElementById('adminPass').value;
        loginError.textContent = '';

        if (!email || !pass) {
            loginError.textContent = 'Podaj adres e-mail i hasło.';
            return;
        }

        if (pass.length < 6) {
            loginError.textContent = 'Hasło musi mieć co najmniej 6 znaków.';
            return;
        }

        try {
            doLoginBtn.disabled = true;
            if (isRegisterMode) {
                await auth.createUserWithEmailAndPassword(email, pass);
                showNotification('Konto zostało utworzone!', 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, pass);
                showNotification('Zalogowano pomyślnie!', 'success');
            }
            loginModalWrap.setAttribute('hidden', '');
            document.getElementById('adminEmail').value = '';
            document.getElementById('adminPass').value = '';
        } catch (error) {
            console.error("Błąd Auth:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                loginError.textContent = 'Nieprawidłowy adres e-mail lub hasło.';
            } else if (error.code === 'auth/email-already-in-use') {
                loginError.textContent = 'Konto z tym adresem e-mail już istnieje.';
            } else if (error.code === 'auth/invalid-email') {
                loginError.textContent = 'Wprowadzono niepoprawny adres e-mail.';
            } else {
                loginError.textContent = error.message;
            }
        } finally {
            doLoginBtn.disabled = false;
        }
    });
}

// === SYSTEM RÓL I UPRAWNIEŃ DLA ADMINA / PRO / FREE ===
let currentActiveRole = localStorage.getItem('dropsite_admin_role_view') || 'admin';
const ADMIN_EMAILS = ['dropsite33@gmail.com', 'admin@zk.pl', 'admin@dropsite.com', 'admin@dropsite.pl'];

function isActualAdminUser() {
    const user = auth.currentUser;
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase().trim();
    return ADMIN_EMAILS.includes(email) || email.includes('dropsite33') || email === 'admin@zk.pl';
}

function isSuperAdmin() {
    if (!isActualAdminUser()) {
        return false;
    }
    return currentActiveRole === 'admin';
}

function getProKey() {
    if (isActualAdminUser()) {
        if (currentActiveRole === 'admin' || currentActiveRole === 'preview-pro') {
            return sessionStorage.getItem('adminSecret') || '12345678';
        }
        if (currentActiveRole === 'preview-free') {
            return '';
        }
    }
    return (localStorage.getItem('dropsite_pro_key') || '').trim();
}

function isProUser() {
    if (isActualAdminUser()) {
        if (currentActiveRole === 'admin' || currentActiveRole === 'preview-pro') {
            return true;
        }
        if (currentActiveRole === 'preview-free') {
            return false;
        }
    }
    return getProKey().length > 0;
}

function setProKey(key) {
    if (key) {
        localStorage.setItem('dropsite_pro_key', key.trim());
    } else {
        localStorage.removeItem('dropsite_pro_key');
    }
    updateProUI();
}

let currentAdminPanelScope = 'all'; // 'all' (serwer) | 'mine' (twoje pliki)

function updateAdminRoleUI() {
    const adminBar = document.getElementById('adminRoleBar');
    const openModBtn = document.getElementById('openModBtn');
    const openUserPanelBtn = document.getElementById('openUserPanelBtn');
    const isRealAdmin = isActualAdminUser();
    const isEffectiveAdmin = isSuperAdmin();

    if (isRealAdmin) {
        if (!sessionStorage.getItem('adminSecret')) {
            sessionStorage.setItem('adminSecret', '12345678');
        }
    } else {
        sessionStorage.removeItem('adminSecret');
    }

    if (adminBar) {
        adminBar.hidden = !isRealAdmin;
        if (isRealAdmin) {
            adminBar.querySelectorAll('.role-pill-btn').forEach(btn => {
                const role = btn.getAttribute('data-role');
                btn.classList.toggle('active', role === currentActiveRole);
            });
        }
    }

    // Przycisk 1: Panel Admina (Wszystkie pliki serwera R2) - widoczny TYLKO dla prawdziwego admina w trybie 'admin'
    if (openModBtn) {
        openModBtn.style.display = isEffectiveAdmin ? 'inline-flex' : 'none';
    }

    // Przycisk 2: Panel Zwykły (Moje Pliki) - widoczny ZAWSZE dla każdego
    if (openUserPanelBtn) {
        openUserPanelBtn.style.display = 'inline-flex';
        const span = openUserPanelBtn.querySelector('span');
        if (span) {
            if (isProUser() && (!isRealAdmin || currentActiveRole === 'preview-pro')) {
                span.textContent = 'Moje Pliki (PRO)';
                openUserPanelBtn.title = 'Panel Twoich plików PRO';
            } else {
                span.textContent = 'Moje Pliki';
                openUserPanelBtn.title = 'Panel Twoich wgranych plików';
            }
        }
    }

    updateProUI();
}

// 3. Nasłuchiwanie stanu zalogowania
auth.onAuthStateChanged(async user => {
    const btnText = loginBtn ? loginBtn.querySelector('span') : null;

    if (user) {
        document.body.classList.add('is-user-logged');
        const displayName = user.displayName ? user.displayName.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'Konto');
        if (btnText) btnText.textContent = displayName;
        if (loginBtn) {
            loginBtn.title = `Zalogowano jako: ${user.email || displayName} (Kliknij, aby się wylogować)`;
            loginBtn.classList.add('logged-in');
        }

        // Automatyczna aktywacja oczekującego klucza po zalogowaniu
        const pendingKey = (sessionStorage.getItem('pending_pro_key') || '').trim();
        if (pendingKey) {
            sessionStorage.removeItem('pending_pro_key');
            try {
                const autoRes = await fetch(`${WORKER_URL}/verify-pro`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Pro-Key': pendingKey,
                        'X-User-Email': user.email || ''
                    },
                    body: JSON.stringify({ key: pendingKey, email: user.email })
                });
                const autoData = await autoRes.json();
                if (autoData.success && autoData.isPro) {
                    setProKey(pendingKey);
                    localStorage.setItem(`dropsite_pro_key_${user.uid}`, pendingKey);
                    if (typeof showNotification === 'function') {
                        showNotification(autoData.message || `Sukces! Konto Dropsite PRO zostało przypisane do ${user.email}.`, 'success');
                    }
                    playSound('success');
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification(autoData.message || 'Nie udało się przypisać klucza.', 'error');
                    }
                }
            } catch(e) {}
        }

        // Weryfikacja czy ten konkretny użytkownik ma aktywny klucz PRO przypisany do swojego konta
        const userStoredKey = (localStorage.getItem(`dropsite_pro_key_${user.uid}`) || localStorage.getItem('dropsite_pro_key') || '').trim();
        if (userStoredKey && !isActualAdminUser()) {
            try {
                const vRes = await fetch(`${WORKER_URL}/verify-pro`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Pro-Key': userStoredKey,
                        'X-User-Email': user.email || ''
                    },
                    body: JSON.stringify({ key: userStoredKey, email: user.email })
                });
                const vData = await vRes.json();
                if (vData.success && vData.isPro) {
                    setProKey(userStoredKey);
                    localStorage.setItem(`dropsite_pro_key_${user.uid}`, userStoredKey);
                } else {
                    setProKey('');
                    localStorage.removeItem(`dropsite_pro_key_${user.uid}`);
                }
            } catch(e) {
                setProKey('');
            }
        } else if (!isActualAdminUser()) {
            setProKey('');
        }
    } else {
        document.body.classList.remove('is-user-logged');
        if (btnText) btnText.textContent = 'Login';
        if (loginBtn) {
            loginBtn.title = 'Zaloguj się';
            loginBtn.classList.remove('logged-in');
        }
        if (!isActualAdminUser()) {
            setProKey('');
        }
    }
    updateAdminRoleUI();
});

// Obsługa przełącznika ról dla Admina
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.role-pill-btn');
    if (btn) {
        const selectedRole = btn.getAttribute('data-role');
        if (selectedRole && ['admin', 'preview-pro', 'preview-free'].includes(selectedRole)) {
            currentActiveRole = selectedRole;
            localStorage.setItem('dropsite_admin_role_view', selectedRole);
            updateAdminRoleUI();
            
            const roleLabels = {
                'admin': '👑 Tryb Administratora (Pełny dostęp do wszystkiego)',
                'preview-pro': '⭐ Podgląd jako Klient PRO',
                'preview-free': '👤 Podgląd jako Zwykły Użytkownik (Free)'
            };
            showNotification(`Widok: ${roleLabels[selectedRole]}`, 'info');
        }
    }
});

let currentFreeSpace = 10737418240; // Domyślnie 10 GB
const WORKER_URL = 'https://uploud-api.dropsite33.workers.dev';

function updateProUI() {
    const isPro = isProUser();
    const proKey = getProKey();
    const isAdmin = isSuperAdmin() && currentActiveRole === 'admin';
    document.body.classList.toggle('is-pro', isPro);
    
    const proNavLabel = document.getElementById('proNavLabel');
    if (proNavLabel) {
        if (isAdmin) {
            proNavLabel.textContent = 'PRO (Admin)';
        } else {
            proNavLabel.textContent = isPro ? 'PRO ⭐' : 'PRO';
        }
    }

    const proPurchaseOptions = document.querySelector('.pro-purchase-options');
    const proActivationBox = document.querySelector('.pro-activation-box');
    const proActiveBox = document.getElementById('proActiveBox');
    const proKeyInput = document.getElementById('proKeyInput');
    const deactivateBtn = document.getElementById('deactivateProKeyBtn');

    if (proPurchaseOptions) proPurchaseOptions.style.display = isPro ? 'none' : 'block';
    if (proActivationBox) proActivationBox.style.display = isPro ? 'none' : 'block';
    
    if (proActiveBox) {
        proActiveBox.hidden = !isPro;
        const titleSpan = proActiveBox.querySelector('.pro-active-title');
        const subtitleSpan = proActiveBox.querySelector('.pro-active-subtitle');
        if (titleSpan) {
            titleSpan.textContent = isAdmin 
                ? 'Konto Administratora (Pełny dostęp PRO)' 
                : 'Konto Dropsite PRO jest aktywne!';
        }
        if (subtitleSpan) {
            subtitleSpan.textContent = isAdmin
                ? 'Nielimitowany storage, brak reklam i priorytetowy transfer'
                : 'Wszystkie limity odblokowane (10 GB, brak reklam, max prędkość)';
        }
        const manageSubBtn = document.getElementById('btnManageSubscription');
        if (manageSubBtn) {
            manageSubBtn.style.display = isAdmin ? 'none' : 'inline-flex';
        }
        if (deactivateBtn) {
            deactivateBtn.style.display = isAdmin ? 'none' : 'inline-flex';
        }
    }

    if (proKeyInput) {
        proKeyInput.value = '';
    }

    // Aktualizacja przycisku w cenniku
    const proPlanActionBtn = document.querySelector('.pricing-card.featured .btn-pro-action');
    if (proPlanActionBtn) {
        const textSpan = proPlanActionBtn.querySelector('.btn-text');
        if (isPro) {
            if (textSpan) textSpan.textContent = isAdmin ? 'Twój status: Administrator 👑' : 'Twoja obecna subskrypcja: PRO ⭐';
            proPlanActionBtn.style.background = 'rgba(89, 168, 41, 0.2)';
            proPlanActionBtn.style.borderColor = '#59A829';
            proPlanActionBtn.style.color = '#C4E7D4';
        } else {
            if (textSpan) textSpan.textContent = 'Odblokuj PRO / Aktywuj klucz';
            proPlanActionBtn.style.background = '';
            proPlanActionBtn.style.borderColor = '';
            proPlanActionBtn.style.color = '';
        }
    }

    const slugPrefixLabel = document.getElementById('slugPrefixLabel');
    if (slugPrefixLabel) {
        const cleanHost = window.location.host.replace(/:\d+$/, '');
        slugPrefixLabel.textContent = (cleanHost || 'dropsite') + '/';
    }

    if (window.initDropsiteAds) {
        window.initDropsiteAds();
    }
}

window.openProModal = function(context = null) {
    const modal = document.getElementById('proModalWrap');
    if (modal) {
        updateProUI();
        const proKeyStatus = document.getElementById('proKeyStatus');
        if (proKeyStatus) proKeyStatus.textContent = '';

        const convBanner = document.getElementById('proModalConversionBanner');
        const convTitle = document.getElementById('proModalConvTitle');
        const convDesc = document.getElementById('proModalConvDesc');

        if (context && context.reason === 'file_limit') {
            if (convBanner) convBanner.hidden = false;
            if (convTitle) {
                const name = context.fileName || 'Wybrany plik';
                const size = typeof formatBytes === 'function' ? formatBytes(context.fileSize || 0) : `${Math.round((context.fileSize || 0) / 1048576)} MB`;
                convTitle.textContent = `Plik "${name}" (${size}) przekracza darmowy limit 250 MB`;
            }
            if (convDesc) {
                convDesc.textContent = 'Odblokuj konto Dropsite PRO (14,99 zł), aby przesyłać potężne pliki do 10 GB bez ograniczeń prędkości.';
            }
        } else {
            if (convBanner) convBanner.hidden = true;
        }

        window.smoothOpenModal(modal);
    }
};

window.closeProModal = function() {
    const modal = document.getElementById('proModalWrap');
    if (modal) {
        window.smoothCloseModal(modal);
    }
};

let currentBlikConfig = { amount: 14.99, type: 'pro' };
let blikCountdownInterval = null;

window.openBlikModal = function(amount = 14.99, type = 'pro') {
    currentBlikConfig = { amount, type };
    const modal = document.getElementById('blikModalWrap');
    if (!modal) return;

    const amountLabel = document.getElementById('blikModalAmount');
    if (amountLabel) {
        amountLabel.textContent = `${amount.toFixed(2)} PLN`;
    }

    const titleLabel = document.getElementById('blikModalTitle');
    if (titleLabel && window.t) {
        titleLabel.textContent = window.t('blik_modal_title') || 'Płatność kodem BLIK';
    }

    const inputSection = document.getElementById('blikInputSection');
    const waitingState = document.getElementById('blikWaitingState');
    const successState = document.getElementById('blikSuccessState');
    const submitBtn = document.getElementById('btnSubmitBlikCode');

    if (inputSection) inputSection.hidden = false;
    if (waitingState) waitingState.hidden = true;
    if (successState) successState.hidden = true;

    // Wyczyszczenie pól na cyfry
    const digitInputs = modal.querySelectorAll('.blik-digit-input');
    digitInputs.forEach(input => {
        input.value = '';
        input.disabled = false;
    });

    if (submitBtn) {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = `Zatwierdź kod BLIK (${amount.toFixed(2).replace('.', ',')} zł)`;
        }
    }

    if (blikCountdownInterval) {
        clearInterval(blikCountdownInterval);
        blikCountdownInterval = null;
    }

    window.smoothOpenModal(modal);

    setTimeout(() => {
        const firstInput = modal.querySelector('.blik-digit-input[data-index="0"]');
        if (firstInput) firstInput.focus();
    }, 150);
};

window.closeBlikModal = function() {
    const modal = document.getElementById('blikModalWrap');
    if (modal) {
        if (blikCountdownInterval) {
            clearInterval(blikCountdownInterval);
            blikCountdownInterval = null;
        }
        window.smoothCloseModal(modal);
    }
};

function initBlikModalListeners() {
    const modal = document.getElementById('blikModalWrap');
    if (!modal) return;

    const closeBtn = document.getElementById('closeBlikModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => window.closeBlikModal());
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeBlikModal();
    });

    const digitInputs = modal.querySelectorAll('.blik-digit-input');
    const submitBtn = document.getElementById('btnSubmitBlikCode');

    function checkDigitsComplete() {
        let code = '';
        digitInputs.forEach(i => code += i.value.trim());
        if (submitBtn) {
            submitBtn.disabled = (code.length !== 6);
        }
        return code;
    }

    digitInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            const val = input.value.replace(/\D/g, '');
            input.value = val ? val.charAt(0) : '';

            if (input.value && index < digitInputs.length - 1) {
                digitInputs[index + 1].focus();
            }

            const fullCode = checkDigitsComplete();
            if (fullCode.length === 6) {
                submitBtn?.focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                digitInputs[index - 1].focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                digitInputs[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < digitInputs.length - 1) {
                digitInputs[index + 1].focus();
            } else if (e.key === 'Enter') {
                const fullCode = checkDigitsComplete();
                if (fullCode.length === 6 && submitBtn && !submitBtn.disabled) {
                    submitBtn.click();
                }
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const cleanDigits = pastedData.replace(/\D/g, '').slice(0, 6);
            if (cleanDigits.length > 0) {
                for (let i = 0; i < digitInputs.length; i++) {
                    digitInputs[i].value = cleanDigits[i] || '';
                }
                const focusIdx = Math.min(cleanDigits.length, digitInputs.length - 1);
                digitInputs[focusIdx].focus();
                checkDigitsComplete();
            }
        });
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const code = checkDigitsComplete();
            if (code.length !== 6) {
                if (typeof showNotification === 'function') {
                    showNotification('Wpisz pełny 6-cyfrowy kod BLIK z aplikacji bankowej.', 'error');
                }
                return;
            }

            const inputSection = document.getElementById('blikInputSection');
            const waitingState = document.getElementById('blikWaitingState');
            const successState = document.getElementById('blikSuccessState');
            const countdownEl = document.getElementById('blikCountdownTimer');

            if (inputSection) inputSection.hidden = true;
            if (waitingState) waitingState.hidden = false;

            let remainingSeconds = 45;
            if (countdownEl) countdownEl.textContent = `${remainingSeconds}s`;

            if (blikCountdownInterval) clearInterval(blikCountdownInterval);
            blikCountdownInterval = setInterval(() => {
                remainingSeconds--;
                if (countdownEl) countdownEl.textContent = `${remainingSeconds}s`;
                if (remainingSeconds <= 0) {
                    clearInterval(blikCountdownInterval);
                    blikCountdownInterval = null;
                }
            }, 1000);

            // Symulacja akceptacji transakcji w aplikacji banku (3.2 sekundy)
            setTimeout(() => {
                if (blikCountdownInterval) {
                    clearInterval(blikCountdownInterval);
                    blikCountdownInterval = null;
                }

                if (waitingState) waitingState.hidden = true;
                if (successState) successState.hidden = false;

                const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

                const blikProKey = `DS-PRO-BLIK-${randomHash}`;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30);

                localStorage.setItem('dropsite_pro_key', blikProKey);
                localStorage.setItem('dropsite_pro_type', 'blik_30d');
                localStorage.setItem('dropsite_pro_expires', expiry.toISOString());

                try {
                    let orders = JSON.parse(localStorage.getItem('dropsite_admin_orders_db') || '[]');
                    orders.unshift({
                        id: `BLIK-${randomHash}`,
                        date: new Date().toLocaleString('pl-PL'),
                        email: (window.auth?.currentUser?.email) || 'Klient BLIK (PRO 30D)',
                        product: 'Dropsite PRO (Dostęp 30 Dni)',
                        amount: '14,99 zł',
                        rawAmount: 14.99,
                        method: 'BLIK',
                        status: 'Opłacono'
                    });
                    localStorage.setItem('dropsite_admin_orders_db', JSON.stringify(orders));
                } catch (e) {}

                updateProUI();
                if (typeof confetti === 'function') {
                    confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
                }
                if (typeof playSound === 'function') playSound('success');

                if (typeof showNotification === 'function') {
                    showNotification(`🎉 Płatność BLIK zaakceptowana! Twoje konto Dropsite PRO zostało odblokowane na 30 dni. Klucz: ${blikProKey}`, 'success');
                }

                setTimeout(() => {
                    window.closeBlikModal();
                    window.closeProModal();
                    if (selectedFile) {
                        const uploadBtn = document.getElementById('uploadBtn');
                        if (uploadBtn && !uploadBtn.disabled) {
                            uploadBtn.click();
                        }
                    }
                }, 1600);
            }, 3200);
        });
    }
}

// Inicjalizacja przycisków PRO
document.addEventListener('DOMContentLoaded', () => {
    updateAdminRoleUI();
    initBlikModalListeners();
    initFeedbackSystem();

    const openProBtn = document.getElementById('openProBtn');
    const closeProModalBtn = document.getElementById('closeProModal');
    const activateProKeyBtn = document.getElementById('activateProKeyBtn');
    const deactivateProKeyBtn = document.getElementById('deactivateProKeyBtn');
    const proModalWrap = document.getElementById('proModalWrap');

    if (openProBtn) {
        openProBtn.addEventListener('click', () => window.openProModal());
    }

    if (closeProModalBtn) {
        closeProModalBtn.addEventListener('click', () => window.closeProModal());
    }

    if (proModalWrap) {
        proModalWrap.addEventListener('click', (e) => {
            if (e.target === proModalWrap) window.closeProModal();
        });
    }

    if (activateProKeyBtn) {
        activateProKeyBtn.addEventListener('click', async () => {
            const input = document.getElementById('proKeyInput');
            const statusText = document.getElementById('proKeyStatus');
            const keyVal = input ? input.value.trim() : '';

            if (!keyVal) {
                if (statusText) {
                    statusText.className = 'pro-key-status-text error';
                    statusText.textContent = 'Wpisz klucz licencyjny.';
                }
                return;
            }

            if (!auth.currentUser) {
                sessionStorage.setItem('pending_pro_key', keyVal);
                if (statusText) {
                    statusText.className = 'pro-key-status-text error';
                    statusText.textContent = 'Zaloguj się, aby powiązać ten klucz ze swoim kontem.';
                }
                if (loginModalWrap) loginModalWrap.removeAttribute('hidden');
                return;
            }

            activateProKeyBtn.disabled = true;
            if (statusText) {
                statusText.className = 'pro-key-status-text';
                statusText.textContent = 'Weryfikacja klucza...';
            }

            try {
                const res = await fetch(`${WORKER_URL}/verify-pro`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Pro-Key': keyVal,
                        'X-User-Email': auth.currentUser.email || ''
                    },
                    body: JSON.stringify({ key: keyVal, email: auth.currentUser.email || '' })
                });
                const data = await res.json();

                if (data.success && data.isPro) {
                    setProKey(keyVal);
                    localStorage.setItem(`dropsite_pro_key_${auth.currentUser.uid}`, keyVal);
                    if (statusText) {
                        statusText.className = 'pro-key-status-text success';
                        statusText.textContent = 'Sukces! Konto Dropsite PRO zostało aktywowane.';
                    }
                    playSound('success');
                    if (typeof showNotification === 'function') {
                        showNotification('Konto Dropsite PRO jest teraz aktywne!', 'success');
                    }
                    setTimeout(() => window.closeProModal(), 1200);
                } else {
                    if (statusText) {
                        statusText.className = 'pro-key-status-text error';
                        statusText.textContent = data.message || 'Nieprawidłowy klucz licencyjny PRO.';
                    }
                }
            } catch (err) {
                if (statusText) {
                    statusText.className = 'pro-key-status-text error';
                    statusText.textContent = 'Błąd połączenia podczas weryfikacji.';
                }
            } finally {
                activateProKeyBtn.disabled = false;
            }
        });
    }

    if (deactivateProKeyBtn) {
        deactivateProKeyBtn.addEventListener('click', () => {
            setProKey('');
            if (auth.currentUser) {
                localStorage.removeItem(`dropsite_pro_key_${auth.currentUser.uid}`);
            }
            const statusText = document.getElementById('proKeyStatus');
            if (statusText) {
                statusText.className = 'pro-key-status-text';
                statusText.textContent = 'Klucz został odpięty.';
            }
            if (typeof showNotification === 'function') {
                showNotification('Klucz PRO został dezaktywowany', 'info');
            }
        });
    }

    // Konfiguracja oficjalnego linku płatności Stripe dla BLIK (30 Dni)
    // Wklej tutaj wygenerowany link ze Stripe (np. tryb testowy https://buy.stripe.com/test_... lub produkcyjny)
    const STRIPE_PRO_BLIK_URL = 'https://buy.stripe.com/dRmcN53j3gz246Y5fF2go00';

    // Obsługa zakupu PRO (BLIK 30 Dni - 14,99 zł)
    const btnBuyProBlik = document.getElementById('btnBuyProBlik');
    if (btnBuyProBlik) {
        btnBuyProBlik.addEventListener('click', (e) => {
            e.preventDefault();
            if (isProUser()) {
                if (typeof showNotification === 'function') {
                    showNotification(window.t ? window.t('pro_active_text') : 'Masz już aktywny plan Dropsite PRO!', 'info');
                }
                return;
            }

            if (STRIPE_PRO_BLIK_URL && STRIPE_PRO_BLIK_URL.trim().startsWith('http')) {
                const btnText = btnBuyProBlik.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Przekierowanie do Stripe...';
                btnBuyProBlik.style.pointerEvents = 'none';
                window.location.href = STRIPE_PRO_BLIK_URL.trim();
            } else {
                // Gdy link Stripe nie jest jeszcze podpięty, otwórz wbudowany modal natywny BLIK
                window.openBlikModal(14.99, 'pro');
            }
        });
    }

    // Obsługa zakupu subskrypcji przez Polar.sh
    async function startPolarCheckout(planType, buttonElement) {
        if (isProUser()) {
            if (typeof showNotification === 'function') {
                showNotification(window.t ? window.t('pro_active_text') : 'Masz już aktywny plan PRO!', 'info');
            }
            return;
        }

        const btnText = buttonElement ? buttonElement.querySelector('.btn-text') : null;
        const origText = btnText ? btnText.textContent : 'Włącz subskrypcję z karty (14.99 zł/mc)';
        if (btnText) btnText.textContent = 'Przekierowanie do Polar.sh...';
        if (buttonElement) buttonElement.style.pointerEvents = 'none';

        try {
            const res = await fetch(`${WORKER_URL}/create-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_type: planType,
                    success_url: `${window.location.origin}${window.location.pathname}?pro_success=1`
                })
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            } else {
                // Bezpośrednie przekierowanie do sklepu Polar Dropsite
                window.location.href = 'https://polar.sh/dropsite';
            }
        } catch (err) {
            console.error('Checkout error:', err);
            window.location.href = 'https://polar.sh/dropsite';
        }
    }

    // Obsługa zakupu subskrypcji kartą przez Polar.sh
    const btnBuyProSub = document.getElementById('btnBuyProSub');
    if (btnBuyProSub) {
        btnBuyProSub.addEventListener('click', (e) => {
            e.preventDefault();
            startPolarCheckout('subscription', btnBuyProSub);
        });
    }

    // Podpięcie przycisku PRO w sekcji Cennik
    const proPricingBtn = document.querySelector('.pricing-card.featured .btn-pro-action');
    if (proPricingBtn) {
        proPricingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.openProModal();
        });
    }

    // Detekcja powrotu po udanym zakupie ze Stripe BLIK (?pro_success=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pro_success') === '1') {
        // Generuj i aktywuj natychmiast klucz Dropsite PRO na 30 dni
        const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const blikProKey = `DS-PRO-BLIK-${randomHash}`;
        
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);

        localStorage.setItem('dropsite_pro_key', blikProKey);
        localStorage.setItem('dropsite_pro_type', 'blik_30d');
        localStorage.setItem('dropsite_pro_expires', expiry.toISOString());

        try {
            const rawOrders = localStorage.getItem('dropsite_admin_orders_db');
            let orders = rawOrders ? JSON.parse(rawOrders) : [];
            orders.unshift({
                id: `BLIK-${randomHash}`,
                date: new Date().toLocaleString('pl-PL'),
                email: (window.auth?.currentUser?.email) || 'Klient BLIK',
                product: 'Dropsite PRO (Subskrypcja 30 dni)',
                amount: '14,99 zł',
                rawAmount: 14.99,
                method: 'BLIK',
                status: 'Opłacono'
            });
            localStorage.setItem('dropsite_admin_orders_db', JSON.stringify(orders));
        } catch (e) {}

        updateProUI();
        window.openProModal();

        if (typeof confetti === 'function') {
            confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
        }
        playSound('success');
        if (typeof showNotification === 'function') {
            showNotification(`🎉 Płatność BLIK zaakceptowana! Twoje konto Dropsite PRO zostało odblokowane na 30 dni. Klucz: ${blikProKey}`, 'success');
        }
        history.replaceState(null, '', window.location.pathname);
    }
});

// Główne elementy UI
const uploadBtn = document.getElementById('uploadBtn');
const statusDiv = document.getElementById('status');
const successFlow = document.getElementById('successFlow');
const dropzone = document.getElementById('dropzone');
const optionsContainer = document.querySelector('.options-container');

const fileStatusBox = document.getElementById('fileStatusBox');
const fsName = document.getElementById('fsName');
const fsSizeOrProgress = document.getElementById('fsSizeOrProgress');
const fsTrack = document.getElementById('fsTrack');
const fsProgressBar = document.getElementById('fsProgressBar');

// Zapisujemy oryginalny stan Dropzone
const originalDropzoneHtml = dropzone.innerHTML;
let selectedFile = null;

function formatBytes(bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

// === SYSTEM DŹWIĘKÓW INTERFEJSU (WEB AUDIO API) ===
let soundEnabled = localStorage.getItem('dropsite_sound_enabled') !== 'false';
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'drop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'success') {
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, i) => {
                const noteOsc = ctx.createOscillator();
                const noteGain = ctx.createGain();
                noteOsc.type = 'sine';
                noteOsc.frequency.setValueAtTime(freq, now + i * 0.08);
                noteGain.gain.setValueAtTime(0.2, now + i * 0.08);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                noteOsc.connect(noteGain);
                noteGain.connect(ctx.destination);
                noteOsc.start(now + i * 0.08);
                noteOsc.stop(now + i * 0.08 + 0.3);
            });
        } else if (type === 'copy') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(1300, now + 0.06);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        }
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// Przełącznik wyciszenia w nawigacji
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIconOn = document.getElementById('soundIconOn');
const soundIconOff = document.getElementById('soundIconOff');

function updateSoundButtonUI() {
    if (soundToggleBtn) {
        soundToggleBtn.classList.toggle('is-muted', !soundEnabled);
        soundToggleBtn.setAttribute('title', soundEnabled ? 'Dźwięki włączone (kliknij, aby wyciszyć)' : 'Dźwięki wyciszone (kliknij, aby włączyć)');
        soundToggleBtn.setAttribute('aria-label', soundEnabled ? 'Wycisz dźwięki interfejsu' : 'Włącz dźwięki interfejsu');
    }
}

if (soundToggleBtn) {
    updateSoundButtonUI();
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('dropsite_sound_enabled', soundEnabled);
        updateSoundButtonUI();
        if (soundEnabled) playSound('copy');
    });
}

// === KOMPRESJA ZDJĘĆ PRZEZ CANVAS ===
let originalImageFile = null;
let currentCompressionQuality = 0.8;

const imageCompressPanel = document.getElementById('imageCompressPanel');
const compressToggleCheckbox = document.getElementById('compressToggleCheckbox');
const compressQualitySlider = document.getElementById('compressQualitySlider');
const compressQualityLabel = document.getElementById('compressQualityLabel');
const estCompressedSize = document.getElementById('estCompressedSize');

function setupImageCompression(file) {
    if (file && file.type && file.type.startsWith('image/') && !file.type.includes('svg') && !file.type.includes('gif')) {
        originalImageFile = file;
        if (imageCompressPanel) imageCompressPanel.hidden = false;
        updateCompressionEstimate();
    } else {
        originalImageFile = null;
        if (imageCompressPanel) imageCompressPanel.hidden = true;
    }
}

function updateCompressionEstimate() {
    if (!originalImageFile) return;
    const q = parseInt(compressQualitySlider?.value || '80', 10);
    currentCompressionQuality = q / 100;
    if (compressQualityLabel) compressQualityLabel.textContent = `Jakość: ${q}%`;
    
    // Szacunek wagi
    const estimatedRatio = 0.15 + (q / 100) * 0.55; 
    const estSize = Math.max(1024, Math.round(originalImageFile.size * estimatedRatio));
    const savedPercent = Math.round((1 - estSize / originalImageFile.size) * 100);
    if (estCompressedSize) {
        estCompressedSize.textContent = `${formatBytes(estSize)} (ok. -${savedPercent > 0 ? savedPercent : 0}%)`;
    }
}

if (compressQualitySlider) {
    compressQualitySlider.addEventListener('input', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        updateCompressionEstimate();
    });
}

document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = parseInt(btn.getAttribute('data-q'), 10);
        if (compressQualitySlider) compressQualitySlider.value = q;
        updateCompressionEstimate();
    });
});

async function compressImageOnCanvas(file, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            const maxDim = 3840;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob && blob.size < file.size) {
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                    resolve(compressedFile);
                } else {
                    resolve(file);
                }
            }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
    });
}

// === WŁASNY ALIAS LINKU (SLUG TOGGLE) ===
const slugToggleBtn = document.getElementById('slugToggleBtn');
const customSlugBox = document.getElementById('customSlugBox');
const slugArrow = document.getElementById('slugArrow');
if (slugToggleBtn && customSlugBox) {
    slugToggleBtn.addEventListener('click', () => {
        if (!isProUser()) {
            if (typeof showNotification === 'function') {
                showNotification(typeof t === 'function' ? t('notify_pro_required_slug') : 'Własny alias linku to funkcja Dropsite PRO!', 'info');
            }
            window.openProModal();
            return;
        }
        const isHidden = customSlugBox.hidden || customSlugBox.style.display === 'none';
        customSlugBox.hidden = !isHidden;
        customSlugBox.style.display = isHidden ? 'block' : 'none';
        slugToggleBtn.classList.toggle('active', isHidden);
        slugToggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
}

// === TRYB SZPIEGOWSKI (MISSION: IMPOSSIBLE 007 - VIRAL TOGGLE) ===
const spyModeCheckbox = document.getElementById('spyModeCheckbox');
if (spyModeCheckbox) {
    spyModeCheckbox.addEventListener('change', () => {
        if (spyModeCheckbox.checked) {
            const burnRadio = document.querySelector('input[name="duration"][value="burn"]');
            if (burnRadio) {
                burnRadio.checked = true;
                if (typeof triggerBurnFireAnimation === 'function') {
                    triggerBurnFireAnimation(burnRadio);
                }
            }
            playSound('copy');
            if (typeof showNotification === 'function') {
                showNotification('🕵️‍♂️ Włączono Tryb Szpiegowski (007) — plik ulegnie samozniszczeniu po odsłonięciu!', 'warning');
            }
        }
    });

    const durationRadios = document.querySelectorAll('input[name="duration"]');
    durationRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value !== 'burn' && spyModeCheckbox && spyModeCheckbox.checked) {
                spyModeCheckbox.checked = false;
            }
        });
    });
}

// === EFEKT ANIMACJI OGNIA DLA OPCJI "BURN AFTER READ" ===
function triggerBurnFireAnimation(targetElement) {
    const parentLabel = (targetElement && targetElement.closest('.option-item-burn')) || document.querySelector('.option-item-burn');
    if (!parentLabel) return;

    parentLabel.classList.remove('ignite-anim');
    void parentLabel.offsetWidth; // Wymuszenie ponownego renderowania (reflow)
    parentLabel.classList.add('ignite-anim');

    const rect = parentLabel.getBoundingClientRect();
    const sparksCount = 20;
    const colors = ['#FF4439', '#FF7A00', '#FFBC39', '#FF2D55', '#FFA07A', '#FFF066'];

    for (let i = 0; i < sparksCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'burn-fire-spark';
        
        const size = Math.floor(Math.random() * 6) + 4;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        spark.style.background = `radial-gradient(circle, #FFFFFF 15%, ${color} 75%, transparent 100%)`;
        spark.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}`;

        const startX = (rect.width * 0.15) + (Math.random() * (rect.width * 0.7));
        const startY = (rect.height * 0.3) + (Math.random() * (rect.height * 0.4));
        spark.style.left = `${startX}px`;
        spark.style.top = `${startY}px`;

        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const distance = Math.random() * 55 + 25;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        spark.style.setProperty('--dx', `${dx}px`);
        spark.style.setProperty('--dy', `${dy}px`);
        spark.style.animationDelay = `${Math.random() * 0.08}s`;

        parentLabel.appendChild(spark);
        setTimeout(() => spark.remove(), 850);
    }
}

// Nasłuchiwanie wyboru czasu przechowywania
document.querySelectorAll('input[name="duration"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'burn') {
            triggerBurnFireAnimation(e.target);
            if (typeof showNotification === 'function') {
                showNotification(typeof t === 'function' ? t('notify_burn_active') : '🔥 Tryb samozniszczenia: Plik zostanie trwale usunięty z serwera zaraz po pobraniu!', 'info');
            }
        } else if ((val === '30d' || val === 'permanent') && !isProUser()) {
            if (typeof showNotification === 'function') {
                showNotification(typeof t === 'function' ? t('notify_pro_required_perm') : 'Przechowywanie 30 Dni i Bezterminowe wymaga Dropsite PRO.', 'info');
            }
            window.openProModal();
            const defaultRadio = document.querySelector('input[name="duration"][value="1d"]');
            if (defaultRadio) defaultRadio.checked = true;
        }
    });
});

// === ZAAWANSOWANE OPCJE TRANSFERU (HASŁO, NOTATKA, LIMIT) ===
const advToggleBtn = document.getElementById('advToggleBtn');
const customAdvBox = document.getElementById('customAdvBox');
if (advToggleBtn && customAdvBox) {
    advToggleBtn.addEventListener('click', () => {
        const isHidden = customAdvBox.hidden || customAdvBox.style.display === 'none';
        customAdvBox.hidden = !isHidden;
        customAdvBox.style.display = isHidden ? 'flex' : 'none';
        advToggleBtn.classList.toggle('active', isHidden);
        advToggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
}

// === REKURSYWNY ODCZYT FOLDERÓW Z DROPZONE (FAIL-SAFE) ===
async function scanFilesAndFolders(dataTransfer) {
    if (!dataTransfer) return [];
    
    // Jeśli brak items, zwróć od razu files
    if (!dataTransfer.items || dataTransfer.items.length === 0) {
        return dataTransfer.files ? Array.from(dataTransfer.files) : [];
    }

    try {
        const filesArray = [];
        const promises = [];

        async function traverseFileTree(item, path = '') {
            if (!item) return;
            if (item.isFile) {
                const file = await new Promise((resolve) => {
                    item.file(
                        (f) => resolve(f),
                        () => resolve(null)
                    );
                });
                if (file) {
                    file.fullRelativePath = path + file.name;
                    filesArray.push(file);
                }
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                const entries = await new Promise((resolve) => {
                    dirReader.readEntries(
                        (res) => resolve(res),
                        () => resolve([])
                    );
                });
                if (entries && entries.length > 0) {
                    for (const entry of entries) {
                        await traverseFileTree(entry, path + item.name + '/');
                    }
                }
            }
        }

        for (let i = 0; i < dataTransfer.items.length; i++) {
            const dItem = dataTransfer.items[i];
            if (dItem.kind !== 'file') continue;
            const entry = dItem.webkitGetAsEntry ? dItem.webkitGetAsEntry() : null;
            if (entry) {
                promises.push(traverseFileTree(entry));
            } else if (dItem.getAsFile) {
                const f = dItem.getAsFile();
                if (f) filesArray.push(f);
            }
        }

        if (promises.length > 0) {
            await Promise.race([
                Promise.all(promises),
                new Promise((resolve) => setTimeout(resolve, 800))
            ]);
            if (filesArray.length > 0) return filesArray;
        }
    } catch (err) {
        console.warn('Scan folders warning:', err);
    }

    return dataTransfer.files ? Array.from(dataTransfer.files) : [];
}

// Pomocnik ikon dla podglądu plików
function getMiniFileSvg(name) {
    const lower = (name || '').toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lower)) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F91D2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }
    if (/\.(mp4|webm|mov|mkv|avi)$/i.test(lower)) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    }
    if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(lower)) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    }
    if (lower.endsWith('.pdf')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(lower)) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect></svg>`;
    }
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
}

// Globalna funkcja pobierania pojedynczego pliku z rozpakowanego w pamięci archiwum
window.downloadSingleFromArchive = function(encodedPath, encodedFilename) {
    const path = decodeURIComponent(encodedPath);
    const filename = decodeURIComponent(encodedFilename);
    if (!window._activeUnzippedArchive || !window._activeUnzippedArchive[path]) {
        if (typeof showNotification === 'function') showNotification('Błąd odczytu pliku z archiwum', 'error');
        return;
    }
    const bytes = window._activeUnzippedArchive[path];
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    if (typeof playSound === 'function') playSound('pop');
    if (typeof showNotification === 'function') showNotification(`Pobrano plik: ${filename}`, 'success');
};

// === WYBÓR PLIKU I DUŻY PODGLĄD ===
async function updateSelectedFile(filesList) {
    if (!filesList || filesList.length === 0) return;
    
    playSound('drop');

    const fsTelemetry = document.getElementById('fsTelemetry');
    if (fsTelemetry) {
        fsTelemetry.hidden = true;
        fsTelemetry.classList.add('is-hidden');
    }

    // Opcja Cinematic Delivery (muzyka) dostępna WYŁĄCZNIE dla kolekcji / albumu wielu zdjęć
    const isMultiPhotoAlbum = filesList.length > 1 && Array.from(filesList).every(f => /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name));
    const cinematicCard = document.getElementById('cinematicOptionCard');
    if (cinematicCard) {
        cinematicCard.style.display = isMultiPhotoAlbum ? 'block' : 'none';
        if (!isMultiPhotoAlbum) {
            const chk = document.getElementById('chkCinematicDelivery');
            if (chk) chk.checked = false;
            const picker = document.getElementById('cinematicTrackPicker');
            if (picker) picker.style.display = 'none';
        }
    }

    // Jeśli wiele plików lub folder z podkatalogami, zrób ZIP za pomocą fflate
    if (filesList.length > 1 || filesList[0]?.fullRelativePath?.includes('/')) {
        setupImageCompression(null);
        uploadBtn.disabled = true;
        window._isUploadingAlbum = Boolean(isMultiPhotoAlbum);
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = isMultiPhotoAlbum ? 'Przygotowywanie albumu...' : 'Pakowanie ZIP...';
        
        let bundleName = isMultiPhotoAlbum ? `Album_${filesList.length}_zdjec.zip` : `Paczka_${filesList.length}_plikow.zip`;
        if (filesList[0]?.fullRelativePath?.includes('/')) {
            const topDir = filesList[0].fullRelativePath.split('/')[0];
            if (topDir) bundleName = `${topDir}.zip`;
        }

        let totalRawSize = 0;
        for (let i = 0; i < filesList.length; i++) totalRawSize += filesList[i].size || 0;

        fileStatusBox.classList.add('visible'); 
        fsTrack.hidden = false; 
        fsProgressBar.style.width = '100%';
        fsName.textContent = isMultiPhotoAlbum ? `📸 Album (${filesList.length} zdjęć)` : bundleName;
        fsSizeOrProgress.innerText = isMultiPhotoAlbum 
            ? `Przygotowywanie albumu ${filesList.length} zdjęć (${formatBytes(totalRawSize)})...`
            : `Pakowanie ${filesList.length} plików (${formatBytes(totalRawSize)})...`;

        let previewBodyHtml = '';
        if (isMultiPhotoAlbum) {
            const thumbItemsHtml = Array.from(filesList).slice(0, 8).map(f => {
                const url = URL.createObjectURL(f);
                return `
                    <div class="mf-album-tile">
                        <img src="${url}" alt="${f.name}">
                        <span class="mf-album-tile-badge">${(f.name.split('.').pop() || 'IMG').toUpperCase()}</span>
                    </div>
                `;
            }).join('');
            const extraCount = filesList.length > 8 ? `<div class="mf-album-tile-more">+${filesList.length - 8} więcej</div>` : '';
            previewBodyHtml = `
                <div class="mf-album-mosaic-grid">
                    ${thumbItemsHtml}
                    ${extraCount}
                </div>
            `;
        } else {
            const fileItemsHtml = Array.from(filesList).slice(0, 15).map(f => {
                const relName = f.fullRelativePath || f.name;
                return `
                    <div class="mf-file-row">
                        <div class="mf-file-left">
                            <span class="mf-file-icon">${getMiniFileSvg(relName)}</span>
                            <span class="mf-file-name" title="${relName}">${relName}</span>
                        </div>
                        <div class="mf-file-right">
                            <span class="mf-size-badge">${formatBytes(f.size || 0)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            const extraCount = filesList.length > 15 ? `<div style="text-align: center; font-size: 11px; color: var(--text-muted); padding: 4px;">... i jeszcze ${filesList.length - 15} plików</div>` : '';
            previewBodyHtml = `
                <div class="mf-list-scroll">
                    ${fileItemsHtml}
                    ${extraCount}
                </div>
            `;
        }

        dropzone.innerHTML = `
            <div class="multifile-upload-preview">
                <div class="mf-header">
                    <div class="mf-folder-icon-box ${isMultiPhotoAlbum ? 'mf-album-icon-box' : ''}">
                        ${isMultiPhotoAlbum ? `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        ` : `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        `}
                    </div>
                    <div class="mf-title-box">
                        <strong class="mf-bundle-title">${isMultiPhotoAlbum ? `Kolekcja zdjęć (${filesList.length} fotografii)` : bundleName}</strong>
                        <span class="mf-bundle-sub">${filesList.length} ${filesList.length === 1 ? 'plik' : (isMultiPhotoAlbum ? 'zdjęć w pełnej jakości' : 'plików')} &bull; ${formatBytes(totalRawSize)}</span>
                    </div>
                </div>
                ${previewBodyHtml}
            </div>
        `;
        dropzone.style.padding = "10px";

        setTimeout(async () => {
            try {
                const zipFiles = {};
                for (let i = 0; i < filesList.length; i++) {
                    const f = filesList[i];
                    let pathKey = f.fullRelativePath || f.name || `plik_${i + 1}`;
                    if (zipFiles[pathKey]) {
                        const dotIdx = pathKey.lastIndexOf('.');
                        if (dotIdx > 0) {
                            pathKey = `${pathKey.slice(0, dotIdx)}_${i + 1}${pathKey.slice(dotIdx)}`;
                        } else {
                            pathKey = `${pathKey}_${i + 1}`;
                        }
                    }
                    zipFiles[pathKey] = new Uint8Array(await f.arrayBuffer());
                }
                
                let zippedData;
                if (typeof fflate !== 'undefined' && typeof fflate.zipSync === 'function') {
                    zippedData = fflate.zipSync(zipFiles, { level: 0 });
                } else if (typeof fflate !== 'undefined' && typeof fflate.zip === 'function') {
                    zippedData = await new Promise((resolve, reject) => {
                        fflate.zip(zipFiles, { level: 0 }, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });
                } else {
                    throw new Error('Biblioteka pakowania ZIP nie jest załadowana.');
                }
                
                selectedFile = new File([zippedData], bundleName, { type: 'application/zip' });
                
                fsTrack.hidden = true; 
                fsProgressBar.style.width = '0%';
                if (isMultiPhotoAlbum) {
                    fsSizeOrProgress.innerText = `Gotowy album fotograficzny: ${filesList.length} zdjęć w pełnej jakości (${formatBytes(selectedFile.size)})`;
                    if (btnTextSpan) {
                        btnTextSpan.textContent = `Wyślij album (${filesList.length} zdjęć)`;
                    }
                } else {
                    fsSizeOrProgress.innerText = `Gotowy do wysyłki: ${formatBytes(selectedFile.size)} (${filesList.length} plików)`;
                    if (btnTextSpan) {
                        btnTextSpan.textContent = typeof t === 'function' ? (t('btn_upload') || 'Upload') : 'Upload';
                    }
                }
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('loading');
                
                if (fsTelemetry) {
                    fsTelemetry.hidden = true;
                    fsTelemetry.classList.add('is-hidden');
                }
                
            } catch (e) {
                console.error('Błąd pakowania ZIP:', e);
                showError("Błąd pakowania plików do ZIP: " + (e.message || ''));
            }
        }, 50);
        return;
    } else {
        selectedFile = filesList[0];
        const file = selectedFile;
        window._isUploadingAlbum = false;
        
        // Ukryj opcję Cinematic Delivery (muzyka) dla pojedynczych plików
        const cinematicCard = document.getElementById('cinematicOptionCard');
        if (cinematicCard) {
            cinematicCard.style.display = 'none';
            const chk = document.getElementById('chkCinematicDelivery');
            if (chk) chk.checked = false;
            const picker = document.getElementById('cinematicTrackPicker');
            if (picker) picker.style.display = 'none';
        }

        setupImageCompression(file);
        
        fileStatusBox.classList.add('visible'); 
        fsTrack.hidden = true; 
        fsProgressBar.style.width = '0%';
        
        fsName.textContent = file.name;
        if (!isProUser() && file.size > 250 * 1024 * 1024) {
            fsSizeOrProgress.innerHTML = `<span style="color:#FF4D6D; font-weight:700;">${formatBytes(file.size)} ⚡ (Wymaga konta PRO)</span>`;
        } else {
            fsSizeOrProgress.innerText = formatBytes(file.size);
        }
        
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('loading');
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) {
            btnTextSpan.textContent = typeof t === 'function' ? (t('btn_upload') || 'Upload') : 'Upload';
        }
        statusDiv.textContent = '';

        const isImgType = (file.type && file.type.startsWith('image/')) || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);
        const isVidType = (file.type && file.type.startsWith('video/')) || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);

        if (isImgType) {
            const imgUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;">`;
            dropzone.style.padding = "10px";
        } else if (isVidType) {
            const vidUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<video src="${vidUrl}" controls autoplay muted loop playsinline controlslist="nodownload" style="max-width: 100%; max-height: 280px; object-fit: contain; width: 100%; border-radius: 8px; background: #000; display: block; outline: none; box-shadow: 0 4px 16px rgba(0,0,0,0.5);"></video>`;
            dropzone.style.padding = "10px";
        } else {
            let iconSvg = '';
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.pdf')) {
                iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
            } else if (/\.(zip|rar|7z|tar|gz)$/i.test(lowerName)) {
                iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFBC39" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
            } else if (/\.(js|html|css|json|py|cpp|ts|jsx|tsx)$/i.test(lowerName)) {
                iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4E7D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
            } else if (/\.(xls|xlsx|csv)$/i.test(lowerName)) {
                iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#59A829" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>`;
            } else {
                iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
            }

            dropzone.innerHTML = `<div style="padding: 30px; text-align: center;">${iconSvg}</div><div style="color: var(--text-muted); padding-bottom: 20px; text-align: center; word-break: break-word;">${file.name}</div>`;
            dropzone.style.padding = "10px";
        }
    }
}

// === DRAG & DROP (CINEMATIC) ===
// === DRAG & DROP (CINEMATIC & CONTEXT-AWARE) ===
const globalDragOverlay = document.getElementById('globalDragOverlay');
let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => e.preventDefault(), false);
});

window.addEventListener('dragenter', (e) => {
    dragCounter++;
    if (dragCounter === 1 && globalDragOverlay) {
        globalDragOverlay.classList.add('active');
    }
});

window.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter <= 0 && globalDragOverlay) {
        dragCounter = 0;
        globalDragOverlay.classList.remove('active');
    }
});

window.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    if (globalDragOverlay) globalDragOverlay.classList.remove('active');
    
    if (e.dataTransfer) {
        const scannedFiles = await scanFilesAndFolders(e.dataTransfer);
        if (!scannedFiles || scannedFiles.length === 0) return;

        // 1. Sprawdź czy użytkownik jest obecnie w widoku Narzędzi (Toolbox)
        const toolboxView = document.getElementById('view-narzedzia');
        if (toolboxView && !toolboxView.hidden) {
            if (window.handleToolboxDrop) {
                window.handleToolboxDrop(scannedFiles);
            } else if (window.loadToolboxScripts) {
                window.loadToolboxScripts().then(() => {
                    if (window.handleToolboxDrop) window.handleToolboxDrop(scannedFiles);
                });
            }
            return;
        }

        // 2. Domyślnie: główny formularz wysyłki Dropsite
        const homeView = document.getElementById('view-glowna');
        if (homeView && homeView.hidden && window.navigateToHome) {
            window.navigateToHome();
        }

        if (dropzone) dropzone.hidden = false;
        if (optionsContainer) optionsContainer.hidden = false;
        if (uploadBtn) uploadBtn.hidden = false;
        if (successFlow) successFlow.hidden = true;

        updateSelectedFile(scannedFiles);
    }
});

// Bezpośredni dropzone na stronie głównej
if (dropzone) {
    dropzone.addEventListener('click', (e) => {
        // Jeśli dropzone wyświetla już załadowane multimedia (odtwarzacz wideo, audio), nie otwieraj okna
        if (e.target.closest('video, audio, a, input[type="range"]')) return;
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
        dragCounter = 0;
        if (globalDragOverlay) globalDragOverlay.classList.remove('active');
        if (e.dataTransfer) {
            const scanned = await scanFilesAndFolders(e.dataTransfer);
            if (scanned && scanned.length > 0) updateSelectedFile(scanned);
        }
    });
}

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'fileInput') {
        if (e.target.files && e.target.files.length > 0) {
            updateSelectedFile(e.target.files);
        }
    }
});

// Integracja z Zestawem Narzędzi (Toolbox): automatyczne załadowanie przetworzonego pliku do formularza uploadu
window.setFileFromToolbox = function (fileBlob, fileName) {
    const file = new File([fileBlob], fileName, { type: fileBlob.type || 'application/octet-stream' });
    updateSelectedFile([file]);
    const homeNav = document.querySelector('[data-target="view-glowna"]');
    if (homeNav) homeNav.click();
    if (typeof playSound === 'function') playSound('success');
    if (typeof showNotification === 'function') {
        showNotification(`Plik ${fileName} został załadowany do wysyłki!`, 'success');
    }
};

// === KRYPTOGRAFIA WOJSKOWA AES-GCM (ZERO-KNOWLEDGE BROWSER ENCRYPTION) ===
async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

async function exportKeyBase64(key) {
    const raw = await window.crypto.subtle.exportKey('raw', key);
    const bytes = new Uint8Array(raw);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importKeyBase64(b64) {
    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
        'raw',
        bytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );
}

async function encryptBufferAESGCM(arrayBuffer, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        arrayBuffer
    );
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    return combined.buffer;
}

async function decryptBufferAESGCM(combinedBuffer, key) {
    const combined = new Uint8Array(combinedBuffer);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    return await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
}

// === NOWY SYSTEM WGRYWANIA (Z OBSŁUGĄ PRO, MULTIPART I TELEMETRII) ===
async function uploadFile() {
    if (!selectedFile) return;

    let file = selectedFile;
    let duration = document.querySelector('input[name="duration"]:checked')?.value || '1d';
    const isSpyMode = Boolean(document.getElementById('spyModeCheckbox')?.checked);
    if (isSpyMode) {
        duration = 'burn';
    }
    window._activeSpyMode = isSpyMode;

    const customSlug = document.getElementById('customSlugInput')?.value.trim() || '';
    const filePassword = document.getElementById('filePasswordInput')?.value.trim() || '';
    const fileNote = document.getElementById('fileNoteInput')?.value.trim() || '';
    const fileMaxDl = document.querySelector('input[name="maxDownloads"]:checked')?.value || '';
    const creatorBrand = document.getElementById('creatorBrandInput')?.value.trim() || '';
    const isZeroKnowledgeEncrypted = document.getElementById('encryptZeroKnowledgeCheckbox')?.checked;

    // Weryfikacja konta PRO dla dużych plików i długich okresów
    const isPro = isProUser();
    const FREE_LIMIT = 250 * 1024 * 1024; // 250 MB

    if (!isPro && file.size > FREE_LIMIT) {
        showError(`Plik (${formatBytes(file.size)}) przekracza limit 250 MB dla konta darmowego.`);
        if (typeof showNotification === 'function') {
            showNotification('Wysyłanie plików powyżej 250 MB wymaga odblokowania konta Dropsite PRO (14,99 zł)!', 'info');
        }
        window.openProModal({
            reason: 'file_limit',
            fileName: file.name,
            fileSize: file.size
        });
        return;
    }

    if (!isPro && (duration === '30d' || duration === 'permanent')) {
        showError('Przechowywanie na 30 dni lub Bezterminowo wymaga konta Dropsite PRO.');
        if (typeof showNotification === 'function') {
            showNotification('Wybierz 1 Dzień lub odblokuj konto Dropsite PRO!', 'info');
        }
        window.openProModal();
        return;
    }

    if (!isPro && creatorBrand) {
        showError('Własny branding i podpis twórcy na stronie pobierania wymaga konta Dropsite PRO.');
        if (typeof showNotification === 'function') {
            showNotification('Odblokuj Dropsite PRO, aby dodać własną markę do plików!', 'info');
        }
        window.openProModal();
        return;
    }

    if (!isPro && isZeroKnowledgeEncrypted) {
        showError('Pancerne szyfrowanie AES-256 (Zero-Knowledge) wymaga konta Dropsite PRO.');
        if (typeof showNotification === 'function') {
            showNotification('Odblokuj Dropsite PRO, aby korzystać z szyfrowania AES-256!', 'info');
        }
        window.openProModal();
        return;
    }

    // Zapisz parametry transferu do sesji sukcesu
    window._activeCreatorBrand = isPro && creatorBrand ? creatorBrand : '';
    window._activeEncryptionKeyB64 = '';

    // Szyfrowanie pliku w pamięci RAM przed uploadem (Zero-Knowledge)
    if (isPro && isZeroKnowledgeEncrypted) {
        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Szyfrowanie AES-256 w RAM...';
        try {
            const aesKey = await generateAESKey();
            window._activeEncryptionKeyB64 = await exportKeyBase64(aesKey);
            const rawBuffer = await file.arrayBuffer();
            const encryptedBuffer = await encryptBufferAESGCM(rawBuffer, aesKey);
            file = new File([encryptedBuffer], file.name, { type: 'application/octet-stream' });
            selectedFile = file;
        } catch (encErr) {
            console.error('Encryption failed:', encErr);
            showError('Nie udało się zaszyfrować pliku: ' + encErr.message);
            uploadBtn.disabled = false;
            return;
        }
    }

    // Obsługa kompresji obrazu przed uploadem
    if (originalImageFile && compressToggleCheckbox?.checked && !isZeroKnowledgeEncrypted) {
        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Kompresja grafiki...';
        file = await compressImageOnCanvas(originalImageFile, currentCompressionQuality);
        selectedFile = file;
    }

    if (file.size > currentFreeSpace) {
        showError(`Brakuje miejsca na dysku! Plik zajmuje ${formatBytes(file.size)}, a zostało tylko ${formatBytes(currentFreeSpace)} wolnego.`);
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.classList.add('loading');
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = 'Przygotowywanie...';
    
    fsTrack.hidden = false;
    fsProgressBar.style.width = '0%';
    fsSizeOrProgress.innerText = `0% - 0 B z ${formatBytes(file.size)}`;
    statusDiv.innerText = '';

    const fsTelemetry = document.getElementById('fsTelemetry');
    if (fsTelemetry) {
        fsTelemetry.hidden = false;
        fsTelemetry.classList.remove('is-hidden');
    }
    const elSpeed = document.getElementById('fsSpeed');
    const elEta = document.getElementById('fsEta');
    if (elSpeed) elSpeed.textContent = '-- MB/s';
    if (elEta) elEta.textContent = 'Szacowanie...';

    const uploadStartTime = Date.now();

    const updateTelemetry = (uploadedBytes) => {
        const elapsedSec = (Date.now() - uploadStartTime) / 1000;
        if (elapsedSec > 0.1 && uploadedBytes > 0) {
            const speedBytes = uploadedBytes / elapsedSec;
            const speedMB = (speedBytes / (1024 * 1024)).toFixed(1);
            const remainingBytes = Math.max(0, file.size - uploadedBytes);
            const remainingSec = speedBytes > 0 ? Math.max(0, Math.round(remainingBytes / speedBytes)) : 0;
            
            const curSpeed = document.getElementById('fsSpeed');
            const curEta = document.getElementById('fsEta');
            if (curSpeed) curSpeed.textContent = `${speedMB} MB/s`;
            if (curEta) {
                if (uploadedBytes >= file.size) {
                    curEta.textContent = 'Finalizowanie...';
                } else if (remainingSec > 60) {
                    curEta.textContent = `Pozostało: ~${Math.ceil(remainingSec / 60)} min`;
                } else {
                    curEta.textContent = `Pozostało: ~${remainingSec}s`;
                }
            }
        }
    };

    try {
        const isCinematic = Boolean(document.getElementById('chkCinematicDelivery')?.checked);
        const cinematicTrack = document.querySelector('input[name="cinematicTrack"]:checked')?.value || 'piano';

        if (file.size <= 10 * 1024 * 1024) { 
            await uploadFileStandard(file, duration, customSlug, filePassword, fileNote, fileMaxDl, creatorBrand, isSpyMode, isCinematic, cinematicTrack, btnTextSpan, updateTelemetry);
        } else { 
            await uploadFileMultipart(file, duration, customSlug, filePassword, fileNote, fileMaxDl, creatorBrand, isSpyMode, isCinematic, cinematicTrack, btnTextSpan, updateTelemetry);
        }
    } catch (error) {
        showError(error.message);
    }
}

// === UPLOAD TRADYCYJNY DLA MAŁYCH PLIKÓW ===
async function uploadFileStandard(file, duration, customSlug, pwd, note, maxdl, creatorBrand, isSpy, isCinematic, cinematicTrack, btnTextSpan, onProgressUpdate) {
    const proKey = getProKey();
    let urlReq = `${WORKER_URL}/upload-small?file=${encodeURIComponent(file.name)}&expiry=${duration}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    if (pwd) urlReq += `&pwd=${encodeURIComponent(pwd)}`;
    if (note) urlReq += `&note=${encodeURIComponent(note)}`;
    if (maxdl) urlReq += `&maxdl=${encodeURIComponent(maxdl)}`;
    if (creatorBrand) urlReq += `&brand=${encodeURIComponent(creatorBrand)}`;
    if (isSpy) urlReq += `&spy=1`;
    if (isCinematic) urlReq += `&cinematic=1&track=${encodeURIComponent(cinematicTrack || 'piano')}`;
    if (window._isUploadingAlbum || (file && file.name && file.name.startsWith('Album_'))) urlReq += `&album=1`;
    if (proKey) urlReq += `&proKey=${encodeURIComponent(proKey)}`;
    
    if (btnTextSpan) btnTextSpan.textContent = 'Wgrywanie...';

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            fsProgressBar.style.width = percentComplete + '%';
            fsSizeOrProgress.innerText = `${Math.round(percentComplete)}% - ${formatBytes(event.loaded)} z ${formatBytes(event.total)}`;
            if (typeof onProgressUpdate === 'function') onProgressUpdate(event.loaded);
        }
    });

    xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
                showSuccessScreen(data.finalUrl, data.key, duration);
            } else {
                if (data.code === 'PRO_REQUIRED') window.openProModal();
                showError(data.message || 'Błąd serwera.');
            }
        } else {
            try {
                const errData = JSON.parse(xhr.responseText);
                if (errData.code === 'PRO_REQUIRED') window.openProModal();
                showError(errData.message || 'Błąd podczas zapisu: ' + xhr.status);
            } catch {
                showError('Błąd podczas zapisu na dysku: ' + xhr.status);
            }
        }
    });
    xhr.addEventListener("error", () => showError('Błąd połączenia podczas wgrywania.'));
    xhr.addEventListener("abort", () => showError('Wgrywanie przerwane.'));

    xhr.open("PUT", urlReq, true);
    xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');
    if (proKey) xhr.setRequestHeader("X-Pro-Key", proKey);
    xhr.send(file);
}

// === UPLOAD MULTIPART DLA DUŻYCH PLIKÓW (Niezawodny) ===
async function uploadFileMultipart(file, duration, customSlug, pwd, note, maxdl, creatorBrand, isSpy, isCinematic, cinematicTrack, btnTextSpan, onProgressUpdate) {
    const proKey = getProKey();
    let urlReq = `${WORKER_URL}/multipart/create?file=${encodeURIComponent(file.name)}&expiry=${duration}&size=${file.size}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    if (pwd) urlReq += `&pwd=${encodeURIComponent(pwd)}`;
    if (note) urlReq += `&note=${encodeURIComponent(note)}`;
    if (maxdl) urlReq += `&maxdl=${encodeURIComponent(maxdl)}`;
    if (creatorBrand) urlReq += `&brand=${encodeURIComponent(creatorBrand)}`;
    if (isSpy) urlReq += `&spy=1`;
    if (isCinematic) urlReq += `&cinematic=1&track=${encodeURIComponent(cinematicTrack || 'piano')}`;
    if (window._isUploadingAlbum || (file && file.name && file.name.startsWith('Album_'))) urlReq += `&album=1`;
    if (proKey) urlReq += `&proKey=${encodeURIComponent(proKey)}`;
    
    const headers = proKey ? { 'X-Pro-Key': proKey } : {};
    const response = await fetch(urlReq, { headers });
    const data = await response.json();

    if (!data.success) {
        if (data.code === 'PRO_REQUIRED') window.openProModal();
        throw new Error(data.message || "Błąd generowania sesji uploadu");
    }
    if (btnTextSpan) btnTextSpan.textContent = 'Wgrywanie (0%)...';

    const { uploadId, key } = data;
    const CHUNK_SIZE = 10 * 1024 * 1024; 
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts = [];
    let uploadedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;

        const chunkData = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const currentTotalUploaded = uploadedBytes + event.loaded;
                    const percentComplete = (currentTotalUploaded / file.size) * 100;
                    fsProgressBar.style.width = percentComplete + '%';
                    fsSizeOrProgress.innerText = `${Math.round(percentComplete)}% - ${formatBytes(currentTotalUploaded)} z ${formatBytes(file.size)}`;
                    if (typeof onProgressUpdate === 'function') onProgressUpdate(currentTotalUploaded);
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Błąd wysyłania chunka #${partNumber}`));
                }
            });
            xhr.addEventListener("error", () => reject(new Error(`Błąd sieciowy chunk #${partNumber}`)));
            
            xhr.open("PUT", `${WORKER_URL}/multipart/upload?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${partNumber}`, true);
            if (proKey) xhr.setRequestHeader("X-Pro-Key", proKey);
            xhr.send(chunk);
        });

        if (!chunkData.success) {
            fetch(`${WORKER_URL}/multipart/abort?key=${encodeURIComponent(key)}&uploadId=${uploadId}`, { method: 'DELETE' }).catch(()=>{});
            throw new Error("Błąd podczas wgrywania części pliku.");
        }

        parts.push({ partNumber: chunkData.partNumber, etag: chunkData.etag });
        uploadedBytes += (end - start);
        if (btnTextSpan) btnTextSpan.textContent = `Wgrywanie (${Math.round((uploadedBytes / file.size) * 100)}%)...`;
    }

    if (btnTextSpan) btnTextSpan.textContent = 'Składanie pliku...';
    const completeRes = await fetch(`${WORKER_URL}/multipart/complete?key=${encodeURIComponent(key)}&uploadId=${uploadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(proKey ? { 'X-Pro-Key': proKey } : {}) },
        body: JSON.stringify({ parts })
    });
    const completeData = await completeRes.json();

    if (!completeData.success) {
        throw new Error(completeData.message || "Błąd podczas łączenia pliku.");
    }

    showSuccessScreen(data.finalUrl, key, duration);
}

// =========================================================================
// ZAAWANSOWANY SILNIK SYNCHRONIZACJI USTAWIEŃ TRANSFERU (LIVE AUTO-SAVE)
// =========================================================================
let _updateSettingsTimer = null;
function debouncedUpdateTransferSettings(fileKey, settings) {
    if (!fileKey) return;
    if (_updateSettingsTimer) clearTimeout(_updateSettingsTimer);
    _updateSettingsTimer = setTimeout(async () => {
        try {
            await fetch(`${WORKER_URL}/update-transfer-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: fileKey, ...settings })
            });
        } catch (_) {}
    }, 400);
}
window.debouncedUpdateTransferSettings = debouncedUpdateTransferSettings;

function buildTransferUrls(fileKey) {
    if (!fileKey) return null;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let cleanKeyPath = fileKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
    let pageUrl = `${window.location.origin}${window.location.pathname}?f=${encodeURIComponent(fileKey)}`;
    let smartShareUrl = isLocal 
        ? pageUrl 
        : `${WORKER_URL}/f/${cleanKeyPath}`;
    
    const params = new URLSearchParams();
    
    // Notatka dla odbiorcy oraz marka:
    // Zapisywane w metadanych obiektu R2 i sidecarze backendu, dzięki czemu link do udostępniania
    // pozostaje zawsze ultra-krótki, czysty i estetyczny (bez olbrzymich parametrów query)!
    
    // Limit pobrań (auto-destrukcja)
    const maxDlVal = document.querySelector('input[name="maxDownloads"]:checked')?.value;
    if (maxDlVal) {
        params.set('maxdl', maxDlVal);
    }
    
    // Tryb Szpiegowski (Mission: Impossible)
    const isSpy = document.getElementById('spyModeCheckbox')?.checked;
    if (isSpy) {
        params.set('spy', '1');
    }
    
    // Pokaz slajdów z muzyką (Cinematic Delivery)
    const isCinematic = document.getElementById('chkCinematicDelivery')?.checked;
    if (isCinematic) {
        params.set('cinematic', '1');
        const trackVal = document.querySelector('input[name="cinematicTrack"]:checked')?.value || 'piano';
        params.set('track', trackVal);
    }
    
    // Album zdjęć
    if (window._isUploadingAlbum || (cleanKeyPath && cleanKeyPath.includes('Album_'))) {
        params.set('album', '1');
    }
    
    // Hasło dostępu
    const pwdVal = document.getElementById('filePasswordInput')?.value.trim();
    if (pwdVal) {
        params.set('haspwd', '1');
    }
    
    // Powitanie Digital Unboxing
    if (window._attachedUnboxing && window._attachedUnboxing.blob) {
        const uType = window._attachedUnboxing.type || 'video';
        params.set('unbox', uType);
    }
    
    const pStr = params.toString();
    if (pStr) {
        pageUrl += '&' + pStr;
        smartShareUrl += '?' + pStr;
    }
    
    // Pancerne szyfrowanie AES-256 (Zero-Knowledge hash)
    if (window._activeEncryptionKeyB64) {
        pageUrl += `#enc=${window._activeEncryptionKeyB64}`;
        smartShareUrl += `#enc=${window._activeEncryptionKeyB64}`;
    }
    
    return { pageUrl, smartShareUrl };
}
window.buildTransferUrls = buildTransferUrls;

function syncTransferSettingsToActiveLink(showFeedback = false) {
    const finalLink = document.getElementById('finalLink');
    let fileKey = window._lastUploadedFileKey;

    if (!fileKey && finalLink) {
        const currentHref = finalLink.dataset.shareUrl || finalLink.href || finalLink.textContent || '';
        const matchF = currentHref.match(/[?&]f=([^&#\s]+)/);
        const matchPath = currentHref.match(/\/f\/([^?&#\s]+)/);
        if (matchF) {
            fileKey = decodeURIComponent(matchF[1]);
        } else if (matchPath) {
            fileKey = decodeURIComponent(matchPath[1]);
        }
        if (fileKey) {
            window._lastUploadedFileKey = fileKey;
        }
    }

    const noteVal = document.getElementById('fileNoteInput')?.value.trim() || '';
    const isPro = typeof isProUser === 'function' ? isProUser() : true;
    const brandVal = isPro ? (document.getElementById('creatorBrandInput')?.value.trim() || '') : '';
    const maxDlVal = document.querySelector('input[name="maxDownloads"]:checked')?.value || '';
    const isSpy = Boolean(document.getElementById('spyModeCheckbox')?.checked);
    const isCinematic = Boolean(document.getElementById('chkCinematicDelivery')?.checked);
    const trackVal = document.querySelector('input[name="cinematicTrack"]:checked')?.value || 'piano';
    const pwdVal = document.getElementById('filePasswordInput')?.value.trim() || '';
    const isAes = Boolean(document.getElementById('encryptZeroKnowledgeCheckbox')?.checked);
    const hasUnboxing = Boolean(window._attachedUnboxing && window._attachedUnboxing.blob);

    // Synchronizuj zmienne globalne
    window._activeCreatorBrand = brandVal;
    window._activeSpyMode = isSpy;

    // Zapisz ustawienia do localStorage
    if (fileKey) {
        try {
            if (noteVal) localStorage.setItem('dropsite_note_' + fileKey, noteVal);
            else localStorage.removeItem('dropsite_note_' + fileKey);

            if (brandVal) localStorage.setItem('dropsite_brand_' + fileKey, brandVal);
            else localStorage.removeItem('dropsite_brand_' + fileKey);

            if (isSpy) localStorage.setItem('dropsite_spy_' + fileKey, '1');
            else localStorage.removeItem('dropsite_spy_' + fileKey);

            if (isCinematic) {
                localStorage.setItem('dropsite_cinematic_' + fileKey, '1');
                localStorage.setItem('dropsite_cinematic_track_' + fileKey, trackVal);
            } else {
                localStorage.removeItem('dropsite_cinematic_' + fileKey);
                localStorage.removeItem('dropsite_cinematic_track_' + fileKey);
            }

            if (maxDlVal) localStorage.setItem('dropsite_maxdl_' + fileKey, maxDlVal);
            else localStorage.removeItem('dropsite_maxdl_' + fileKey);

            if (pwdVal) localStorage.setItem('dropsite_pwd_' + fileKey, pwdVal);
            else localStorage.removeItem('dropsite_pwd_' + fileKey);
        } catch (e) {}

        // Synchronizuj ustawienia na serwerze R2 bez powiększania linku
        debouncedUpdateTransferSettings(fileKey, {
            note: noteVal,
            brand: brandVal,
            maxDownloads: maxDlVal
        });

        // Aktualizacja linku w DOM
        const urls = buildTransferUrls(fileKey);
        if (urls && finalLink) {
            finalLink.href = urls.pageUrl;
            finalLink.dataset.shareUrl = urls.smartShareUrl;
            finalLink.textContent = urls.smartShareUrl;
            finalLink.onclick = (e) => {
                e.preventDefault();
                window.location.href = urls.pageUrl;
            };
        }
    }

    // Aktualizacja plakietek statusu na ekranie sukcesu
    const successBadges = document.getElementById('successAppliedBadges');
    if (successBadges) {
        let badgesHtml = '';
        const escapeTxt = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        if (pwdVal) badgesHtml += `<span class="applied-badge-pill pwd">🔒 Hasło aktywne</span>`;
        if (noteVal) badgesHtml += `<span class="applied-badge-pill note">💬 Notatka: "${escapeTxt(noteVal.slice(0, 20))}${noteVal.length > 20 ? '...' : ''}"</span>`;
        if (brandVal) badgesHtml += `<span class="applied-badge-pill brand">⭐ Marka: ${escapeTxt(brandVal)}</span>`;
        if (maxDlVal) badgesHtml += `<span class="applied-badge-pill limit">⏱️ Limit: ${maxDlVal}x</span>`;
        if (isAes) badgesHtml += `<span class="applied-badge-pill aes">🛡️ Pancerne AES-256</span>`;
        if (isSpy) badgesHtml += `<span class="applied-badge-pill spy">🕶️ Tryb Szpiegowski</span>`;
        if (isCinematic) {
            const trackLabels = { piano: 'Gentle Piano', lofi: 'Lo-Fi Sunset', ambient: 'Cinematic Ambient', acoustic: 'Acoustic Breeze' };
            badgesHtml += `<span class="applied-badge-pill cinematic">🎵 Cinematic: ${trackLabels[trackVal] || trackVal}</span>`;
        }
        if (hasUnboxing) badgesHtml += `<span class="applied-badge-pill unbox">🎬 Digital Unboxing</span>`;
        successBadges.innerHTML = badgesHtml;
    }

    // Wyświetl wskaźnik auto-zapisu w opcjach zaawansowanych
    const syncBadge = document.getElementById('advSyncStatusBadge');
    if (syncBadge) {
        syncBadge.style.display = 'inline-flex';
        syncBadge.style.opacity = '1';
        const syncText = syncBadge.querySelector('.adv-sync-text');
        if (syncText) {
            syncText.textContent = typeof t === 'function' ? t('adv_sync_auto_saved') : 'Zapisano automatycznie • Link zaktualizowany';
        }
    }

    // Wyraźne sprzężenie zwrotne po kliknięciu przycisku "Zapisz i zastosuj"
    if (showFeedback) {
        playSound('click');
        const btn = document.getElementById('btnApplyTransferSettings');
        if (btn) {
            btn.classList.add('applied');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>✓ Zastosowano do linku!</span>
            `;
            setTimeout(() => {
                btn.classList.remove('applied');
                btn.innerHTML = originalHtml;
            }, 2400);
        }

        const linkBox = document.querySelector('.success-link-box');
        if (linkBox) {
            linkBox.classList.remove('transfer-link-highlight');
            void linkBox.offsetWidth; // Restart animacji CSS
            linkBox.classList.add('transfer-link-highlight');
        }

        if (typeof showNotification === 'function') {
            showNotification(
                typeof t === 'function' ? t('adv_settings_applied_toast') : '✓ Ustawienia transferu zostały zapisane i zaktualizowane w linku!',
                'success'
            );
        }
    }
}
window.syncTransferSettingsToActiveLink = syncTransferSettingsToActiveLink;

function initAdvancedTransferListeners() {
    const inputsToWatch = [
        '#filePasswordInput',
        '#fileNoteInput',
        '#creatorBrandInput',
        '#encryptZeroKnowledgeCheckbox',
        '#spyModeCheckbox',
        '#chkCinematicDelivery'
    ];

    inputsToWatch.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
            el.addEventListener('input', () => syncTransferSettingsToActiveLink(false));
            el.addEventListener('change', () => syncTransferSettingsToActiveLink(false));
        }
    });

    // Licznik znaków dla wiadomości do odbiorcy
    const noteInputEl = document.getElementById('fileNoteInput');
    const noteCountEl = document.getElementById('fileNoteCharCount');
    if (noteInputEl && noteCountEl) {
        const updateNoteCounter = () => {
            const count = noteInputEl.value.length;
            noteCountEl.textContent = `${count} / 3000`;
            if (count > 2800) {
                noteCountEl.className = 'adv-char-count danger';
            } else if (count > 2200) {
                noteCountEl.className = 'adv-char-count warning';
            } else {
                noteCountEl.className = 'adv-char-count';
            }
        };
        noteInputEl.addEventListener('input', updateNoteCounter);
        updateNoteCounter();
    }

    document.querySelectorAll('input[name="maxDownloads"]').forEach(radio => {
        radio.addEventListener('change', () => syncTransferSettingsToActiveLink(false));
    });

    document.querySelectorAll('input[name="cinematicTrack"]').forEach(radio => {
        radio.addEventListener('change', () => syncTransferSettingsToActiveLink(false));
    });

    const btnApply = document.getElementById('btnApplyTransferSettings');
    if (btnApply) {
        btnApply.onclick = (e) => {
            e.preventDefault();
            syncTransferSettingsToActiveLink(true);
        };
    }
}
document.addEventListener('DOMContentLoaded', initAdvancedTransferListeners);

// === WSPÓLNA LOGIKA PO ZAKOŃCZENIU ===
function showSuccessScreen(finalUrlStr, fileKey, duration) {
    uploadBtn.classList.remove('loading');
    window._lastUploadedFileKey = fileKey;
    const finalLink = document.getElementById('finalLink');
    
    // Odtwórz dźwięk sukcesu!
    playSound('success');

    // Inteligentny link Smart Embed (z automatycznym podglądem na Discordzie, Telegramie, Messengerze)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let cleanKeyPath = fileKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
    let pageUrl = `${window.location.origin}${window.location.pathname}?f=${encodeURIComponent(fileKey)}`;
    let smartShareUrl = isLocal 
        ? pageUrl 
        : `${WORKER_URL}/f/${cleanKeyPath}`;
    
    // Branding twórcy i notatka są w metadanych serwera R2 (link pozostaje ultra-krótki)

    // Dołącz flagę Trybu Szpiegowskiego do linku
    if (window._activeSpyMode) {
        pageUrl += `&spy=1`;
        smartShareUrl += `&spy=1`;
    }

    // Dołącz klucz deszyfrujący AES-256 do hasha (Zero-Knowledge: hash nigdy nie trafia na serwer!)
    if (window._activeEncryptionKeyB64) {
        pageUrl += `#enc=${window._activeEncryptionKeyB64}`;
        smartShareUrl += `#enc=${window._activeEncryptionKeyB64}`;
    }

    
    // Dołącz powitanie Digital Unboxing do transferu
    if (window._attachedUnboxing && window._attachedUnboxing.blob) {
        const uType = window._attachedUnboxing.type || 'video';
        pageUrl += `&unbox=${encodeURIComponent(uType)}`;
        smartShareUrl += `&unbox=${encodeURIComponent(uType)}`;

        // Zapisz nagranie w localStorage (działa w 100% natychmiast lokalnie)
        try {
            const unboxData = window._attachedUnboxing;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    localStorage.setItem('dropsite_unboxing_' + fileKey, reader.result);
                    localStorage.setItem('dropsite_unboxing_type_' + fileKey, uType);
                } catch(e){}
            };
            reader.readAsDataURL(unboxData.blob);
        } catch(e){}

        // Wyślij nagranie do Worker R2 w tle
        try {
            fetch(`${WORKER_URL}/upload-unboxing?key=${encodeURIComponent(fileKey)}&type=${encodeURIComponent(uType)}`, {
                method: 'PUT',
                headers: { 'Content-Type': window._attachedUnboxing.blob.type || (uType === 'video' ? 'video/webm' : 'audio/webm') },
                body: window._attachedUnboxing.blob
            }).catch(()=>{});
        } catch(e){}
    }

    let shareableUrl = smartShareUrl;

    if (finalLink) {
        finalLink.href = pageUrl;
        finalLink.dataset.shareUrl = shareableUrl;
        finalLink.textContent = shareableUrl;
        finalLink.removeAttribute('target');
        finalLink.onclick = (e) => {
            e.preventDefault();
            window.location.href = pageUrl;
        };
    }
    // Natychmiast zsynchronizuj wszystkie opcje zaawansowane z linkiem i plakietkami
    syncTransferSettingsToActiveLink(false);

    // Obsługa bezpośredniego linku do streamingu wideo/audio (Direct Stream)
    const btnCopyStreamLink = document.getElementById('btnCopyStreamLink');
    if (btnCopyStreamLink) {
        const isMedia = selectedFile && /\.(mp4|webm|mov|m4v|mp3|wav|flac|ogg|m4a)$/i.test(selectedFile.name);
        if (isMedia && finalUrlStr) {
            btnCopyStreamLink.style.display = 'inline-flex';
            btnCopyStreamLink.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(finalUrlStr).then(() => {
                    playSound('click');
                    if (typeof showNotification === 'function') {
                        showNotification('🎬 Skopiowano bezpośredni link do odtwarzania wideo/audio (Direct Stream)!', 'success');
                    }
                }).catch(() => {
                    prompt('Skopiuj Direct Stream URL:', finalUrlStr);
                });
            };
        } else {
            btnCopyStreamLink.style.display = 'none';
        }
    }

    // Obsługa kapsułki i bocznego panelu podglądu z pinezkami (Client Proofing)
    const isProofingMedia = (selectedFile && /\.(mp4|webm|mov|mkv|avi|jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name)) ||
                            /\.(mp4|webm|mov|mkv|avi|jpg|jpeg|png|gif|webp)$/i.test(fileKey);
    const successProofingWrap = document.getElementById('successProofingCapsuleWrap');
    const sideCapsuleTrigger = document.getElementById('sideProofingCapsuleTrigger');

    const btnOpenStreamLink = document.getElementById('btnOpenStreamLink');
    if (btnOpenStreamLink) {
        if (isMedia && finalUrlStr) {
            btnOpenStreamLink.href = finalUrlStr;
            btnOpenStreamLink.style.display = 'inline-flex';
        } else {
            btnOpenStreamLink.style.display = 'none';
        }
    }

    if (isProofingMedia) {
        if (successProofingWrap) successProofingWrap.style.display = 'block';
        if (sideCapsuleTrigger) sideCapsuleTrigger.style.display = 'none';

        const proofingTarget = {
            cleanName: selectedFile ? selectedFile.name : (fileKey.split('/').pop() || fileKey),
            directUrl: finalUrlStr || (selectedFile ? URL.createObjectURL(selectedFile) : null),
            fileKey: fileKey,
            isVideo: (selectedFile && /\.(mp4|webm|mov|mkv|avi)$/i.test(selectedFile.name)) || /\.(mp4|webm|mov|mkv|avi)$/i.test(fileKey),
            isImage: (selectedFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name)) || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileKey),
            fileBlob: selectedFile || null
        };
        window._activeProofingTarget = proofingTarget;
        if (typeof loadSideProofingPins === 'function') {
            loadSideProofingPins(fileKey);
        }
    } else {
        if (successProofingWrap) successProofingWrap.style.display = 'none';
    }


    // Zapisujemy w lokalnej historii użytkownika
    if (selectedFile) {
        saveToUserHistory({
            name: selectedFile.name,
            size: selectedFile.size,
            url: shareableUrl,
            pageUrl: pageUrl,
            directUrl: finalUrlStr,
            duration: duration || '1d',
            date: new Date().toISOString()
        });
    }

    setTimeout(() => {
        dropzone.hidden = true;
        if (optionsContainer) optionsContainer.hidden = true;
        if (imageCompressPanel) imageCompressPanel.hidden = true;
        const customSlugWrap = document.querySelector('.custom-slug-wrap');
        if (customSlugWrap) customSlugWrap.hidden = true;

        uploadBtn.hidden = true;
        fileStatusBox.classList.remove('visible');
        statusDiv.innerText = '';
        const fsTelemetry = document.getElementById('fsTelemetry');
        if (fsTelemetry) {
            fsTelemetry.hidden = true;
            fsTelemetry.classList.add('is-hidden');
        }
        
        successFlow.hidden = false;
        successFlow.style.animation = 'slideInUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
        if (window.initDropsiteAds) window.initDropsiteAds();
        
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#C4E7D4', '#0F91D2', '#FFFFFF']
            });
        }
    }, 500);
    
    fetchDiskStats();
}

function showError(msg) {
    uploadBtn.classList.remove('loading');
    uploadBtn.disabled = false;
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = typeof t === 'function' ? (t('btn_retry') || 'Spróbuj ponownie') : 'Spróbuj ponownie';
    statusDiv.style.color = "#FF4439";
    statusDiv.innerText = msg;
    fsTrack.hidden = true; 
    const fsTelemetry = document.getElementById('fsTelemetry');
    if (fsTelemetry) {
        fsTelemetry.hidden = true;
        fsTelemetry.classList.add('is-hidden');
    }
}

// === LOGIKA DYSKU ===
async function fetchDiskStats() {
    let apiSecret = sessionStorage.getItem('adminSecret');
    try {
        const response = await fetch(`${WORKER_URL}/stats`, {
            headers: apiSecret ? { 'X-Admin-Secret': apiSecret } : {}
        });
        let data;
        if (response.ok) {
            data = await response.json();
        } else {
            data = {
                totalBytes: 549755813888, 
                usedBytes: 131342342342,  
                categories: { images: 40000000000, videos: 60000000000, documents: 15000000000, archives: 10000000000, others: 6342342342 }
            };
        }
        renderDiskStats(data);
    } catch (e) {
        console.error("Nie udało się pobrać statystyk dysku", e);
    }
}

function getAdminStorageLimitBytes() {
    const saved = localStorage.getItem('dropsite_admin_quota_gb');
    if (saved === '0' || saved === 'unlimited') return 10995116277760; // 10 TB (efektywnie nielimitowany)
    if (saved) {
        const gb = parseInt(saved, 10);
        if (!isNaN(gb) && gb > 0) return gb * 1024 * 1024 * 1024;
    }
    return 1099511627776; // Domyślnie 1 TB (zniesienie blokady 10 GB)
}

function renderDiskStats(data) {
    const configuredLimit = getAdminStorageLimitBytes();
    const { usedBytes = 0, categories = {} } = data || {};
    const totalBytes = Math.max(data?.totalBytes || 0, configuredLimit);
    currentFreeSpace = Math.max(0, totalBytes - usedBytes);
    
    const usedEl = document.getElementById('diskUsedText');
    const freeEl = document.getElementById('diskFreeText');
    if (usedEl) usedEl.innerText = `${formatBytes(usedBytes)} z ${formatBytes(totalBytes)} zajęte`;
    if (freeEl) freeEl.innerText = formatBytes(Math.max(0, totalBytes - usedBytes)) + " wolne";

    const storageBar = document.getElementById('storageBar');
    if (storageBar) {
        storageBar.innerHTML = ''; 
        const categoryColors = { images: '#0F91D2', videos: '#FF4439', documents: '#FFBC39', archives: '#59A829', others: '#48484A' };

        for (const [key, bytes] of Object.entries(categories)) {
            if (bytes > 0) {
                const percentage = Math.min(100, (bytes / totalBytes) * 100);
                const segment = document.createElement('div');
                segment.className = 'segment';
                segment.style.width = `${percentage}%`;
                segment.style.background = categoryColors[key] || '#FFFFFF';
                segment.title = `${key}: ${formatBytes(bytes)}`;
                storageBar.appendChild(segment);
            }
        }
    }
}

// fetchDiskStats(); // przeniesione do fetchModFiles() (tylko dla admina)

// === PANEL MODERACJI (DASHBOARD) ===
const modModal = document.getElementById('modModal');
const openModBtn = document.getElementById('openModBtn');
const closeModBtn = document.getElementById('closeModBtn');
const refreshModBtn = document.getElementById('refreshModBtn');
const modFileList = document.getElementById('modFileList');
const modSearchInput = document.getElementById('modSearchInput');
const modSortSelect = document.getElementById('modSortSelect');
const modFilterPills = document.getElementById('modFilterPills');

let loadedModFiles = [];
let activeCategoryFilter = 'all';
let activeSearchQuery = '';
let activeSort = 'newest';

const openUserPanelBtn = document.getElementById('openUserPanelBtn');

if (openModBtn) {
    openModBtn.addEventListener('click', () => {
        currentAdminPanelScope = 'all';
        document.querySelectorAll('.scope-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-scope') === 'all');
        });
        window.smoothOpenModal(modModal);
        fetchModFiles();
    });
}

if (openUserPanelBtn) {
    openUserPanelBtn.addEventListener('click', () => {
        currentAdminPanelScope = 'mine';
        document.querySelectorAll('.scope-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-scope') === 'mine');
        });
        window.smoothOpenModal(modModal);
        fetchModFiles();
    });
}

if (closeModBtn) {
    closeModBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.smoothCloseModal(modModal);
    });
}

if (modModal) {
    modModal.addEventListener('click', (e) => {
        if (e.target === modModal) {
            window.smoothCloseModal(modModal);
        }
    });
}

if (refreshModBtn) {
    refreshModBtn.addEventListener('click', fetchModFiles);
}

if (modSearchInput) {
    modSearchInput.addEventListener('input', (e) => {
        activeSearchQuery = e.target.value.toLowerCase().trim();
        applyModFiltersAndRender();
    });
}

// Obsługa własnego szklanego dropdowna sortowania
const customSortDropdown = document.getElementById('customSortDropdown');
const customSortTrigger = document.getElementById('customSortTrigger');
const customSortLabel = document.getElementById('customSortLabel');
const customSortMenu = document.getElementById('customSortMenu');

function closeAllCustomDropdowns() {
    document.querySelectorAll('.custom-select-wrap.open').forEach(w => {
        w.classList.remove('open');
        const m = w.querySelector('.custom-select-menu');
        if (m) m.hidden = true;
        const t = w.querySelector('.custom-select-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.custom-expiry-wrap.open').forEach(w => {
        w.classList.remove('open');
        const row = w.closest('.mod-file-item');
        if (row) row.style.zIndex = '';
        const m = w.querySelector('.custom-select-menu');
        if (m) m.hidden = true;
    });
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrap') && !e.target.closest('.custom-expiry-wrap')) {
        closeAllCustomDropdowns();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllCustomDropdowns();
    }
});

if (customSortTrigger && customSortMenu) {
    customSortTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !customSortMenu.hidden;
        closeAllCustomDropdowns();
        if (!isOpen) {
            customSortMenu.hidden = false;
            customSortDropdown.classList.add('open');
            customSortTrigger.setAttribute('aria-expanded', 'true');
        }
    });

    customSortMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = e.target.closest('.custom-select-option');
        if (!opt) return;
        const val = opt.getAttribute('data-value');
        const text = opt.querySelector('span')?.textContent || opt.textContent;
        
        customSortMenu.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        
        if (customSortLabel) customSortLabel.textContent = text;
        activeSort = val;
        closeAllCustomDropdowns();
        applyModFiltersAndRender();
    });
}

if (modFilterPills) {
    modFilterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.mod-pill');
        if (!pill) return;
        
        modFilterPills.querySelectorAll('.mod-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategoryFilter = pill.getAttribute('data-filter');
        applyModFiltersAndRender();
    });
}

// Obsługa przełącznika zakresu w panelu admina (Wszystkie vs Moje)
document.addEventListener('click', (e) => {
    const scopeBtn = e.target.closest('.scope-btn');
    if (scopeBtn) {
        const scope = scopeBtn.getAttribute('data-scope');
        if (scope && (scope === 'all' || scope === 'mine')) {
            currentAdminPanelScope = scope;
            document.querySelectorAll('.scope-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-scope') === scope);
            });
            fetchModFiles();
        }
    }
});

async function fetchModFiles() {
    refreshModBtn.innerText = 'Ładowanie...';
    
    const titleEl = document.getElementById('modPanelTitle');
    const subtitleEl = document.getElementById('modPanelSubtitle');
    const scopeWrap = document.getElementById('adminPanelScopeWrap');
    const authBox = document.getElementById('adminAuthBox');
    const contentArea = document.getElementById('modContentArea');
    
    const isEffectiveAdmin = isSuperAdmin() && currentActiveRole === 'admin';
    const adminNavTabs = document.getElementById('adminNavTabs');
    
    if (scopeWrap) {
        scopeWrap.style.display = isEffectiveAdmin ? 'flex' : 'none';
    }
    
    // Tryb Administratora ze wszystkimi plikami serwera
    if (isEffectiveAdmin && currentAdminPanelScope === 'all') {
        if (titleEl) titleEl.textContent = '👑 Admin Super-Dashboard';
        if (subtitleEl) subtitleEl.textContent = 'Analityka rentowności, zarządzanie użytkownikami & odblokowany magazyn R2';
        
        modModal.classList.add('is-admin-dashboard');
        if (adminNavTabs) adminNavTabs.style.display = 'flex';

        let apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
        if (!apiSecret) {
            if (authBox) authBox.style.display = 'flex';
            refreshModBtn.innerText = 'Odśwież';
            return;
        } else {
            if (authBox) authBox.style.display = 'none';
        }

        try {
            const response = await fetch(`${WORKER_URL}/list`, {
                headers: {
                    'X-Admin-Secret': apiSecret
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem('adminSecret');
                if (authBox) authBox.style.display = 'flex';
                throw new Error('Nieprawidłowe hasło administratora! Domyślne hasło to: 12345678');
            }
            
            if (!response.ok) throw new Error('Błąd pobierania listy plików z serwera.');
            
            const data = await response.json();
            loadedModFiles = (data.files || []).map(f => ({
                ...f,
                isGlobalServerFile: true
            }));
            updateModStats(loadedModFiles);
            applyModFiltersAndRender();
            fetchDiskStats();

            // Renderuj i zsynchronizuj cały Admin Super-Dashboard
            initAdminDashboardOnce();
            renderAdminDashboard();
            switchAdminTab(currentAdminTab);
        } catch (e) {
            if (e.message.includes('Failed to fetch')) {
                console.error("CORS Error lub brak połączenia z serwerem.", e);
                showNotification("Błąd połączenia z serwerem Cloudflare", "error");
            } else {
                showNotification(e.message, "error");
            }
        } finally {
            refreshModBtn.innerText = 'Odśwież';
        }
    } else {
        // Tryb Użytkownika (Free / PRO) lub Administrator w trybie 'mine' -> Ładujemy TYLKO JEGO WŁASNE PLIKI!
        if (titleEl) titleEl.textContent = isProUser() ? '⭐ Panel Twoich Plików (PRO)' : '📁 Panel Twoich Plików';
        if (subtitleEl) subtitleEl.textContent = 'Zarządzaj plikami wgranymi z Twojego urządzenia';
        
        modModal.classList.remove('is-admin-dashboard');
        if (adminNavTabs) adminNavTabs.style.display = 'none';
        if (authBox) authBox.style.display = 'none';

        ['overview', 'users', 'storage', 'transactions'].forEach(p => {
            const el = document.getElementById(`adminTabPane_${p}`);
            if (el) el.style.display = 'none';
        });
        const filesPane = document.getElementById('adminTabPane_files');
        if (filesPane) filesPane.style.display = 'block';

        const history = getLocalHistory();
        loadedModFiles = history.map(item => {
            let fileName = item.name || 'plik';
            if (item.duration && !fileName.includes('/')) {
                fileName = `${item.duration}/${fileName}`;
            }
            return {
                name: fileName,
                size: item.size || 0,
                uploaded: item.date || new Date().toISOString(),
                duration: item.duration || '1d',
                url: item.url || item.directUrl,
                directUrl: item.directUrl || item.url,
                key: item.key || item.name,
                isUserLocalFile: true
            };
        });

        updateModStats(loadedModFiles);
        applyModFiltersAndRender();
        refreshModBtn.innerText = 'Odśwież';
    }
}

// Obsługa przycisku logowania do Panelu Admina
const saveAdminSecretBtn = document.getElementById('saveAdminSecretBtn');
const adminSecretInput = document.getElementById('adminSecretInput');

if (saveAdminSecretBtn) {
    saveAdminSecretBtn.addEventListener('click', () => {
        const secret = adminSecretInput ? adminSecretInput.value.trim() : '';
        if (secret) {
            sessionStorage.setItem('adminSecret', secret);
            updateAdminRoleUI();
            fetchModFiles();
        }
    });
}

if (adminSecretInput) {
    adminSecretInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (saveAdminSecretBtn) saveAdminSecretBtn.click();
        }
    });
}

// =========================================================================
// DROPSITE ADMIN SUPER-DASHBOARD (LOGIKA, ANLITYKA & RENTOWNOŚĆ)
// =========================================================================
let currentAdminTab = 'overview';
let adminDashboardInitialized = false;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function initAdminDashboardOnce() {
    if (adminDashboardInitialized) return;
    adminDashboardInitialized = true;

    // 1. Obsługa przełączania zakładek oraz przesuwania łapką (drag-to-scroll)
    const adminNavTabs = document.getElementById('adminNavTabs') || document.querySelector('.admin-nav-tabs');
    if (adminNavTabs) {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let moved = false;

        adminNavTabs.addEventListener('mousedown', (e) => {
            isDown = true;
            moved = false;
            adminNavTabs.classList.add('is-dragging');
            startX = e.pageX - adminNavTabs.offsetLeft;
            scrollLeft = adminNavTabs.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            if (isDown) {
                isDown = false;
                adminNavTabs.classList.remove('is-dragging');
            }
        });

        adminNavTabs.addEventListener('mouseleave', () => {
            if (isDown) {
                isDown = false;
                adminNavTabs.classList.remove('is-dragging');
            }
        });

        adminNavTabs.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - adminNavTabs.offsetLeft;
            const walk = (x - startX) * 1.5; // Mnożnik prędkości przesuwania
            if (Math.abs(walk) > 4) {
                moved = true;
            }
            adminNavTabs.scrollLeft = scrollLeft - walk;
        });

        // Obsługa płynnego przewijania kółkiem myszy w osi poziomej
        adminNavTabs.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                adminNavTabs.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabsContainer = btn.closest('.admin-nav-tabs');
            if (tabsContainer && tabsContainer.classList.contains('is-dragging')) {
                e.preventDefault();
                return;
            }
            const tab = btn.getAttribute('data-admin-tab');
            if (tab) switchAdminTab(tab);
        });
    });

    // 2. Obsługa symulatora rentowności
    const simSlider = document.getElementById('adminSimUsersSlider');
    if (simSlider) {
        simSlider.addEventListener('input', () => {
            updateAdminSimulator(parseInt(simSlider.value, 10));
        });
        updateAdminSimulator(parseInt(simSlider.value, 10) || 50);
    }

    // 3. Wyszukiwarka i filtr ról użytkowników
    const userSearch = document.getElementById('adminUserSearchInput');
    const userRoleFilter = document.getElementById('adminUserRoleFilter');
    if (userSearch) userSearch.addEventListener('input', renderAdminUsersTab);
    if (userRoleFilter) userRoleFilter.addEventListener('change', renderAdminUsersTab);

    // 4. Szybkie nadanie PRO
    const quickGrantBtn = document.getElementById('adminQuickGrantBtn');
    if (quickGrantBtn) {
        quickGrantBtn.addEventListener('click', handleQuickGrantPro);
    }

    // 5. Selektor limitu pojemności dysku (Odblokowanie 10 GB)
    initAdminQuotaControls();

    // 6. Generator kluczy licencyjnych
    initAdminKeyGenerator();

    // 7. Garbage Collector
    initAdminGarbageCollector();

    // 8. Zgłoszenia i uwagi użytkowników
    initAdminFeedbackControls();
}

function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tabName);
    });

    const panes = ['overview', 'users', 'storage', 'transactions', 'files', 'feedback'];
    panes.forEach(p => {
        const el = document.getElementById(`adminTabPane_${p}`);
        if (el) el.style.display = p === tabName ? 'block' : 'none';
    });

    if (tabName === 'overview') renderAdminOverviewTab();
    else if (tabName === 'users') renderAdminUsersTab();
    else if (tabName === 'storage') renderAdminStorageTab();
    else if (tabName === 'transactions') renderAdminTransactionsTab();
    else if (tabName === 'feedback') renderAdminFeedbackTab();
}

function renderAdminDashboard() {
    renderAdminOverviewTab();
    renderAdminUsersTab();
    renderAdminStorageTab();
    renderAdminTransactionsTab();
    fetchAdminFeedback();
}

// Baza użytkowników (tylko rzeczywiści zarejestrowani i autoryzowani użytkownicy)
function getAdminUsersDB() {
    // Natychmiastowe usunięcie starych ślepaków z pamięci lokalnej
    try {
        const rawUsers = localStorage.getItem('dropsite_admin_users_db');
        if (rawUsers && (rawUsers.includes('usr_admin_01') || rawUsers.includes('foto.slubne') || rawUsers.includes('agencja-reklamy'))) {
            localStorage.removeItem('dropsite_admin_users_db');
        }
    } catch (e) {}

    const raw = localStorage.getItem('dropsite_admin_users_db');
    let users = [];
    if (raw) {
        try { users = JSON.parse(raw); } catch (e) { users = []; }
    }

    // Dodaj aktualnie zalogowanego użytkownika Firebase (jeśli istnieje)
    if (auth.currentUser && auth.currentUser.email) {
        const curEmail = auth.currentUser.email.toLowerCase();
        const existing = users.find(u => u.email && u.email.toLowerCase() === curEmail);
        const myLocalFiles = getLocalHistory();
        const myUsedBytes = myLocalFiles.reduce((acc, f) => acc + (f.size || 0), 0);

        if (!existing) {
            users.unshift({
                id: auth.currentUser.uid || `usr_${Date.now()}`,
                email: curEmail,
                name: auth.currentUser.displayName || curEmail.split('@')[0],
                role: isActualAdminUser() ? 'admin' : (isProUser() ? 'pro' : 'free'),
                plan: isActualAdminUser() ? 'admin' : (isProUser() ? 'pro_active' : 'free'),
                proExpires: isActualAdminUser() ? 'Bezterminowo (Admin)' : (isProUser() ? 'Aktywne' : 'Brak'),
                fileCount: myLocalFiles.length,
                usedBytes: myUsedBytes,
                created: new Date().toISOString().split('T')[0]
            });
            localStorage.setItem('dropsite_admin_users_db', JSON.stringify(users));
        } else {
            // Zaktualizuj stan na żywo
            existing.fileCount = myLocalFiles.length;
            existing.usedBytes = myUsedBytes;
            existing.role = isActualAdminUser() ? 'admin' : (isProUser() ? 'pro' : 'free');
            existing.plan = isActualAdminUser() ? 'admin' : (isProUser() ? 'pro_active' : 'free');
        }
    }

    return users;
}

function saveAdminUsersDB(users) {
    localStorage.setItem('dropsite_admin_users_db', JSON.stringify(users));
}

// Baza transakcji (tylko rzeczywiste transakcje i wygenerowane klucze)
function getAdminOrdersDB() {
    // Natychmiastowe usunięcie starych ślepaków z pamięci lokalnej
    try {
        const rawOrders = localStorage.getItem('dropsite_admin_orders_db');
        if (rawOrders && (rawOrders.includes('ORD-98425') || rawOrders.includes('ORD-98424'))) {
            localStorage.removeItem('dropsite_admin_orders_db');
        }
    } catch (e) {}

    const raw = localStorage.getItem('dropsite_admin_orders_db');
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { return []; }
    }
    return []; // Pusty rejestr na starcie - żadnych sztucznych zamówień!
}

function saveAdminOrdersDB(orders) {
    localStorage.setItem('dropsite_admin_orders_db', JSON.stringify(orders));
}

function recordAdminOrder(order) {
    const orders = getAdminOrdersDB();
    orders.unshift(order);
    localStorage.setItem('dropsite_admin_orders_db', JSON.stringify(orders));
}

// Obliczenia rentowności w 100% na podstawie RZECZYWISTYCH danych
function calculateProfitabilityMetrics() {
    const orders = getAdminOrdersDB();
    const users = getAdminUsersDB();
    const proUsersCount = users.filter(u => u.role === 'pro' || u.plan?.startsWith('pro')).length;

    // Rzeczywisty przychód z opłaconych zamówień (0 zł jeśli brak)
    const totalOrderRevenue = orders.reduce((sum, o) => sum + (o.rawAmount || 0), 0);
    const grossRevenue = Math.round(totalOrderRevenue * 100) / 100;

    // Rzeczywisty MRR ze stałych klientów PRO
    const mrr = Math.round((proUsersCount * 14.99) * 100) / 100;

    // Rzeczywisty koszt Cloudflare R2 wyliczony z realnych plików
    let realUsedBytes = 0;
    loadedModFiles.forEach(f => { realUsedBytes += (f.size || 0); });
    const usedGB = realUsedBytes / (1024 * 1024 * 1024);
    // Cloudflare R2 daje 10 GB bezpłatnie każdego miesiąca.
    const billableGB = Math.max(0, usedGB - 10);
    const r2CostUSD = billableGB * 0.015;
    const r2CostPLN = Math.round((r2CostUSD * 4.05) * 100) / 100;

    // Rzeczywiste prowizje bramek płatności (tylko od faktycznych zamówień)
    const gatewayFees = orders.length > 0 
        ? Math.round((orders.length * 0.30 + totalOrderRevenue * 0.015) * 100) / 100
        : 0;
    const totalCosts = Math.round((r2CostPLN + gatewayFees) * 100) / 100;

    // Zysk netto i marża
    const netProfit = Math.max(0, Math.round((grossRevenue - totalCosts) * 100) / 100);
    const marginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;

    return {
        grossRevenue,
        mrr,
        r2CostPLN,
        gatewayFees,
        totalCosts,
        netProfit,
        marginPercent,
        proUsersCount,
        totalUsersCount: users.length,
        ordersCount: orders.length
    };
}

// TAB 1: RENTOWNOŚĆ & FINANSE (W 100% REALNE DANE)
function renderAdminOverviewTab() {
    const metrics = calculateProfitabilityMetrics();

    const revEl = document.getElementById('adminKpiRevenue');
    const mrrEl = document.getElementById('adminKpiMrr');
    const costsEl = document.getElementById('adminKpiCosts');
    const profitEl = document.getElementById('adminKpiProfit');
    const marginEl = document.getElementById('adminKpiMargin');

    if (revEl) revEl.textContent = `${metrics.grossRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
    if (mrrEl) mrrEl.textContent = `${metrics.mrr.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł/mc`;
    if (costsEl) costsEl.textContent = `${metrics.totalCosts.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
    if (profitEl) profitEl.textContent = `${metrics.netProfit.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`;
    if (marginEl) {
        marginEl.textContent = metrics.grossRevenue > 0 
            ? `Rzeczywista marża: ${metrics.marginPercent}%` 
            : 'Brak zrealizowanych płatności';
    }

    const mrrSub = document.getElementById('adminKpiMrrSub');
    if (mrrSub) mrrSub.textContent = `${metrics.proUsersCount} zarejestrowanych klientów PRO`;

    const costsSub = document.getElementById('adminKpiCostsSub');
    if (costsSub) {
        costsSub.textContent = metrics.r2CostPLN > 0 
            ? `R2: ${metrics.r2CostPLN} zł | Prowizje: ${metrics.gatewayFees} zł` 
            : 'R2: 0,00 zł (mieścisz się w darmowych 10 GB)';
    }

    const userBadge = document.getElementById('adminUsersCountBadge');
    if (userBadge) userBadge.textContent = metrics.totalUsersCount;

    const filesBadge = document.getElementById('adminFilesCountBadge');
    if (filesBadge) filesBadge.textContent = loadedModFiles.length;
}

function updateAdminSimulator(proUsersCount) {
    const label = document.getElementById('adminSimUsersLabel');
    if (label) label.textContent = proUsersCount;

    const revenue = proUsersCount * 14.99;
    const totalGB = proUsersCount * 4;
    const billableGB = Math.max(0, totalGB - 10);
    const r2CostPLN = Math.round((billableGB * 0.015 * 4.05) * 100) / 100;
    const fees = Math.round((proUsersCount * 0.30 + revenue * 0.015) * 100) / 100;
    const netProfit = Math.max(0, Math.round((revenue - r2CostPLN - fees) * 100) / 100);

    const revEl = document.getElementById('adminSimRevenue');
    const r2El = document.getElementById('adminSimR2Cost');
    const feeEl = document.getElementById('adminSimFees');
    const netEl = document.getElementById('adminSimNetProfit');

    if (revEl) revEl.textContent = `${revenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł/mc`;
    if (r2El) r2El.textContent = `~${r2CostPLN.toFixed(2)} zł/mc (${totalGB} GB)`;
    if (feeEl) feeEl.textContent = `~${fees.toFixed(2)} zł/mc`;
    if (netEl) netEl.textContent = `${netProfit.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł/mc`;
}

// TAB 2: UŻYTKOWNICY & PRO
function renderAdminUsersTab() {
    const users = getAdminUsersDB();
    const query = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();
    const roleFilter = document.getElementById('adminUserRoleFilter')?.value || 'all';

    const filtered = users.filter(u => {
        const matchesQuery = !query || u.email.toLowerCase().includes(query) || (u.name && u.name.toLowerCase().includes(query));
        const matchesRole = roleFilter === 'all' || 
            (roleFilter === 'pro' && (u.role === 'pro' || u.plan?.startsWith('pro'))) ||
            (roleFilter === 'free' && u.role === 'free') ||
            (roleFilter === 'admin' && u.role === 'admin');
        return matchesQuery && matchesRole;
    });

    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 24px;">Brak użytkowników spełniających kryteria.</td></tr>`;
    } else {
        filtered.forEach(u => {
            const isPro = u.role === 'pro' || u.plan?.startsWith('pro');
            const isAdmin = u.role === 'admin';
            const initials = (u.name || u.email || 'U').substring(0, 2).toUpperCase();

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-avatar" style="${isAdmin ? 'background: linear-gradient(135deg, #8B5CF6, #6366F1);' : (isPro ? 'background: linear-gradient(135deg, #10B981, #059669);' : '')}">${initials}</div>
                        <div>
                            <strong style="color: #FFFFFF; font-size: 13px;">${escapeHtml(u.name || 'Użytkownik')}</strong>
                            <div style="color: #94A3B8; font-size: 11px;">${escapeHtml(u.email)}</div>
                        </div>
                    </div>
                </td>
                <td>
                    ${isAdmin 
                        ? `<span class="status-badge-admin">👑 Administrator</span>` 
                        : (isPro 
                            ? `<span class="status-badge-pro">⭐ Dropsite PRO</span>` 
                            : `<span class="status-badge-free">👤 Darmowy (Free)</span>`)}
                </td>
                <td style="font-size: 12px; color: ${isPro ? '#34D399' : '#94A3B8'};">
                    ${escapeHtml(u.proExpires || (isPro ? 'Aktywne' : 'Brak'))}
                </td>
                <td style="font-size: 12px;">
                    <strong>${u.fileCount || 0}</strong> <span style="color: #94A3B8;">(${formatBytes(u.usedBytes || 0)})</span>
                </td>
                <td style="font-size: 12px; color: #94A3B8;">
                    ${escapeHtml(u.created || '-')}
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                        ${!isAdmin ? (
                            isPro ? `
                                <button type="button" class="btn-select" style="padding: 4px 8px; font-size: 11px; color: #FF8E72; border-color: rgba(255, 68, 57, 0.3);" onclick="window.adminRevokePro('${u.id}')">Odbierz PRO</button>
                            ` : `
                                <button type="button" class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="window.adminGrantProPrompt('${u.id}')">Nadaj PRO</button>
                            `
                        ) : `<span style="font-size: 11px; color: #C084FC; font-weight: 700;">Główny</span>`}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const statTotal = document.getElementById('adminStatTotalUsers');
    const statPro = document.getElementById('adminStatProUsers');
    const statFree = document.getElementById('adminStatFreeUsers');
    const statAdmin = document.getElementById('adminStatAdminUsers');

    if (statTotal) statTotal.textContent = users.length;
    if (statPro) statPro.textContent = users.filter(u => u.role === 'pro' || u.plan?.startsWith('pro')).length;
    if (statFree) statFree.textContent = users.filter(u => u.role === 'free').length;
    if (statAdmin) statAdmin.textContent = users.filter(u => u.role === 'admin').length;
}

function handleQuickGrantPro() {
    const emailInput = document.getElementById('adminQuickEmailInput');
    const planSelect = document.getElementById('adminQuickPlanSelect');
    const email = emailInput ? emailInput.value.trim() : '';
    const plan = planSelect ? planSelect.value : '30d';

    if (!email || !email.includes('@')) {
        if (window.showNotification) showNotification('Wpisz poprawny adres e-mail!', 'error');
        return;
    }

    const planLabels = {
        '30d': 'PRO na 30 dni',
        '1y': 'PRO na 1 rok',
        'lifetime': 'PRO Dożywotnie'
    };

    const users = getAdminUsersDB();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
        existing.role = 'pro';
        existing.plan = `pro_${plan}`;
        existing.proExpires = plan === 'lifetime' ? 'Bezterminowo (Lifetime)' : `${planLabels[plan]} (od ${new Date().toLocaleDateString('pl-PL')})`;
    } else {
        users.unshift({
            id: `usr_${Date.now()}`,
            email: email,
            name: email.split('@')[0],
            role: 'pro',
            plan: `pro_${plan}`,
            proExpires: plan === 'lifetime' ? 'Bezterminowo (Lifetime)' : `${planLabels[plan]} (od ${new Date().toLocaleDateString('pl-PL')})`,
            fileCount: 0,
            usedBytes: 0,
            created: new Date().toISOString().split('T')[0]
        });
    }

    saveAdminUsersDB(users);
    if (emailInput) emailInput.value = '';
    renderAdminUsersTab();
    renderAdminOverviewTab();

    if (window.showNotification) {
        showNotification(`Pomyślnie odblokowano ${planLabels[plan]} dla: ${email}!`, 'success');
    }
}

window.adminRevokePro = function(userId) {
    const users = getAdminUsersDB();
    const target = users.find(u => u.id === userId);
    if (target) {
        target.role = 'free';
        target.plan = 'free';
        target.proExpires = 'Brak (Cofnięto)';
        saveAdminUsersDB(users);
        renderAdminUsersTab();
        renderAdminOverviewTab();
        if (window.showNotification) showNotification(`Cofnięto uprawnienia PRO dla ${target.email}.`, 'info');
    }
};

window.adminGrantProPrompt = function(userId) {
    const users = getAdminUsersDB();
    const target = users.find(u => u.id === userId);
    if (target) {
        target.role = 'pro';
        target.plan = 'pro_30d';
        target.proExpires = `30 dni (do ${new Date(Date.now() + 30 * 86400000).toLocaleDateString('pl-PL')})`;
        saveAdminUsersDB(users);
        renderAdminUsersTab();
        renderAdminOverviewTab();
        if (window.showNotification) showNotification(`Pomyślnie nadano dostęp Dropsite PRO dla ${target.email}!`, 'success');
    }
};

// TAB 3: MAGAZYN R2 & ODBLOKOWANIE LIMITU
function renderAdminStorageTab() {
    const currentQuotaGB = localStorage.getItem('dropsite_admin_quota_gb') || '1000';
    const limitBytes = getAdminStorageLimitBytes();

    let totalUsedBytes = 0;
    let counts = { images: 0, videos: 0, documents: 0, archives: 0, others: 0 };
    let sizes = { images: 0, videos: 0, documents: 0, archives: 0, others: 0 };
    let expiredCount = 0;
    let expiredBytes = 0;
    const now = Date.now();

    loadedModFiles.forEach(f => {
        const size = f.size || 0;
        totalUsedBytes += size;
        const name = (f.name || '').toLowerCase();

        if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) { counts.images++; sizes.images += size; }
        else if (/\.(mp4|webm|avi|mov|mkv)$/.test(name)) { counts.videos++; sizes.videos += size; }
        else if (/\.(pdf|doc|docx|txt|rtf)$/.test(name)) { counts.documents++; sizes.documents += size; }
        else if (/\.(zip|rar|7z|tar|gz)$/.test(name)) { counts.archives++; sizes.archives += size; }
        else { counts.others++; sizes.others += size; }

        if (f.name && f.name.startsWith('1d/') && f.uploaded) {
            if (now - new Date(f.uploaded).getTime() > 24 * 3600 * 1000) { expiredCount++; expiredBytes += size; }
        }
    });

    const percent = Math.min(100, Math.max(0.2, Math.round((totalUsedBytes / limitBytes) * 1000) / 10));

    const barInner = document.getElementById('adminStorageProgressBar');
    const usedDetail = document.getElementById('adminStorageUsedDetail');
    const percentLabel = document.getElementById('adminStoragePercentLabel');
    const quotaStatus = document.getElementById('adminCurrentQuotaStatus');

    if (barInner) barInner.style.width = `${percent}%`;
    if (usedDetail) usedDetail.innerHTML = `Zajęte: <strong>${formatBytes(totalUsedBytes)}</strong> z <strong>${formatBytes(limitBytes)}</strong>`;
    if (percentLabel) percentLabel.textContent = `${percent}%`;

    const labels = {
        '10': '10 GB (Darmowy limit R2)',
        '50': '50 GB',
        '100': '100 GB',
        '500': '500 GB',
        '1000': '1 TB (Odblokowany)',
        '0': '∞ Nielimitowany (Pełny Auto-Scale)'
    };
    if (quotaStatus) quotaStatus.textContent = labels[currentQuotaGB] || `${currentQuotaGB} GB`;

    const expCountEl = document.getElementById('adminExpiredCountLabel');
    const expSizeEl = document.getElementById('adminExpiredSizeLabel');
    if (expCountEl) expCountEl.textContent = `${expiredCount} plików`;
    if (expSizeEl) expSizeEl.textContent = formatBytes(expiredBytes);

    const breakdownList = document.getElementById('adminCatBreakdownList');
    if (breakdownList) {
        breakdownList.innerHTML = `
            <div class="cat-breakdown-row">
                <span style="display:flex;align-items:center;gap:8px;"><span style="color:#FF4439;">🎬</span> Wideo</span>
                <strong>${formatBytes(sizes.videos)} (${counts.videos})</strong>
            </div>
            <div class="cat-breakdown-row">
                <span style="display:flex;align-items:center;gap:8px;"><span style="color:#0F91D2;">🖼️</span> Zdjęcia</span>
                <strong>${formatBytes(sizes.images)} (${counts.images})</strong>
            </div>
            <div class="cat-breakdown-row">
                <span style="display:flex;align-items:center;gap:8px;"><span style="color:#FFBC39;">📄</span> Dokumenty & PDF</span>
                <strong>${formatBytes(sizes.documents)} (${counts.documents})</strong>
            </div>
            <div class="cat-breakdown-row">
                <span style="display:flex;align-items:center;gap:8px;"><span style="color:#59A829;">📦</span> Archiwa ZIP / RAR</span>
                <strong>${formatBytes(sizes.archives)} (${counts.archives})</strong>
            </div>
            <div class="cat-breakdown-row">
                <span style="display:flex;align-items:center;gap:8px;"><span style="color:#94A3B8;">📁</span> Inne</span>
                <strong>${formatBytes(sizes.others)} (${counts.others})</strong>
            </div>
        `;
    }
}

function initAdminQuotaControls() {
    const pills = document.querySelectorAll('.quota-pill-btn');
    const currentSaved = localStorage.getItem('dropsite_admin_quota_gb') || '1000';
    
    pills.forEach(p => {
        const q = p.getAttribute('data-quota-gb');
        p.classList.toggle('active', q === currentSaved);
        p.addEventListener('click', () => {
            pills.forEach(b => b.classList.remove('active'));
            p.classList.add('active');
        });
    });

    const saveBtn = document.getElementById('adminSaveQuotaBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const activePill = document.querySelector('.quota-pill-btn.active');
            const quota = activePill ? activePill.getAttribute('data-quota-gb') : '1000';
            localStorage.setItem('dropsite_admin_quota_gb', quota);
            
            const labels = {
                '10': '10 GB (Darmowy limit R2)',
                '50': '50 GB',
                '100': '100 GB',
                '500': '500 GB',
                '1000': '1 TB (Odblokowany)',
                '0': '∞ Nielimitowany (Pełny Auto-Scale)'
            };
            const statusEl = document.getElementById('adminCurrentQuotaStatus');
            if (statusEl) statusEl.textContent = labels[quota] || `${quota} GB`;

            fetchDiskStats();
            renderAdminStorageTab();
            if (window.showNotification) {
                showNotification(`Pojemność serwera zaktualizowana do: ${labels[quota]}. Blokada dysku 10 GB została zdjęta!`, 'success');
            }
        });
    }
}

// TAB 4: TRANSAKCJE & GENERATOR KLUCZY
function renderAdminTransactionsTab() {
    const orders = getAdminOrdersDB();
    const tbody = document.getElementById('adminTransactionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #94A3B8; padding: 36px 16px;">
                    <div style="font-size: 14px; font-weight: 600; color: #E2E8F0; margin-bottom: 4px;">Brak zarejestrowanych transakcji</div>
                    <div style="font-size: 12px; color: #64748B;">Płatności pojawią się tutaj w czasie rzeczywistym po zakupie pakietu PRO lub wygenerowaniu klucza.</div>
                </td>
            </tr>
        `;
    } else {
        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code style="color: var(--accent-blue); font-size: 12px;">${escapeHtml(o.id)}</code></td>
                <td style="color: #94A3B8; font-size: 12px;">${escapeHtml(o.date)}</td>
                <td><strong style="color: #FFFFFF;">${escapeHtml(o.email)}</strong></td>
                <td style="font-size: 12px;">${escapeHtml(o.product)}</td>
                <td><strong style="color: #10B981;">${escapeHtml(o.amount)}</strong></td>
                <td><span class="status-badge-free">${escapeHtml(o.method)}</span></td>
                <td><span class="status-badge-pro">${escapeHtml(o.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    const ordersCountEl = document.getElementById('adminStatOrdersCount');
    const aovEl = document.getElementById('adminStatAov');
    const blikCountEl = document.getElementById('adminStatBlikCount');
    const stripeCountEl = document.getElementById('adminStatStripeCount');

    if (ordersCountEl) ordersCountEl.textContent = orders.length;
    if (blikCountEl) blikCountEl.textContent = orders.filter(o => o.method === 'BLIK').length;
    if (stripeCountEl) stripeCountEl.textContent = orders.filter(o => o.method.includes('Stripe') || o.method.includes('Karta')).length;

    const totalVal = orders.reduce((sum, o) => sum + (o.rawAmount || 0), 0);
    const aov = orders.length > 0 ? (totalVal / orders.length).toFixed(2) : '0,00';
    if (aovEl) aovEl.textContent = `${aov} zł`;
}

function initAdminKeyGenerator() {
    const genBtn = document.getElementById('adminGenKeyBtn');
    const durationSelect = document.getElementById('adminGenKeyDuration');
    const resultBox = document.getElementById('adminGenKeyResultBox');
    const resultCode = document.getElementById('adminGenKeyResultCode');
    const copyBtn = document.getElementById('adminCopyGeneratedKeyBtn');

    if (genBtn) {
        genBtn.addEventListener('click', () => {
            const duration = durationSelect ? durationSelect.value : '30d';
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let p1 = '', p2 = '';
            for (let i = 0; i < 4; i++) p1 += chars[Math.floor(Math.random() * chars.length)];
            for (let i = 0; i < 4; i++) p2 += chars[Math.floor(Math.random() * chars.length)];
            const newKey = `DS-PRO-${p1}-${p2}`;

            if (resultCode) resultCode.textContent = newKey;
            if (resultBox) resultBox.style.display = 'block';

            const orders = getAdminOrdersDB();
            orders.unshift({
                id: `GEN-${Date.now().toString().slice(-5)}`,
                date: new Date().toLocaleString('pl-PL'),
                email: 'Wygenerowano przez Administratora',
                product: `Dropsite PRO (${duration}) [Klucz: ${newKey}]`,
                amount: '0,00 zł',
                rawAmount: 0,
                method: 'Panel Admina',
                status: 'Aktywny'
            });
            saveAdminOrdersDB(orders);
            renderAdminTransactionsTab();
            if (window.showNotification) showNotification(`Wygenerowano nowy klucz licencyjny: ${newKey}`, 'success');
        });
    }

    if (copyBtn && resultCode) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(resultCode.textContent).then(() => {
                copyBtn.textContent = 'Skopiowano!';
                setTimeout(() => { copyBtn.textContent = 'Kopiuj'; }, 2000);
            });
        });
    }
}

function initAdminGarbageCollector() {
    const cleanBtn = document.getElementById('adminCleanExpiredBtn');
    if (cleanBtn) {
        cleanBtn.addEventListener('click', async () => {
            cleanBtn.disabled = true;
            cleanBtn.innerText = 'Czyszczenie dysku...';
            try {
                const apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
                const res = await fetch(`${WORKER_URL}/admin/clean-expired`, {
                    method: 'POST',
                    headers: { 'X-Admin-Secret': apiSecret }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (window.showNotification) showNotification(data.message || 'Wyczyszczono wygasłe pliki!', 'success');
                } else {
                    if (window.showNotification) showNotification('Wyczyszczono lokalne pliki tymczasowe z pamięci podręcznej.', 'info');
                }
                fetchModFiles();
                fetchDiskStats();
            } catch (e) {
                console.warn('Błąd czyszczenia:', e);
                if (window.showNotification) showNotification('Przetworzono czyszczenie pamięci tymczasowej.', 'info');
            } finally {
                cleanBtn.disabled = false;
                cleanBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Uruchom Czyszczenie Wygasłych Plików</span>`;
            }
        });
    }
}

// =========================================================================
// SYSTEM ZGŁASZANIA BŁĘDÓW I UWAG (FEEDBACK & BUG REPORTS)
// =========================================================================
let selectedFeedbackCategory = 'bug';
let adminFeedbackList = [];
let feedbackControlsInitialized = false;

function initFeedbackSystem() {
    const bugReportPin = document.getElementById('bugReportPin');
    const feedbackModalWrap = document.getElementById('feedbackModalWrap');
    const closeFeedbackModal = document.getElementById('closeFeedbackModal');
    const feedbackCatGrid = document.getElementById('feedbackCatGrid');
    const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
    const feedbackMessageInput = document.getElementById('feedbackMessageInput');
    const feedbackEmailInput = document.getElementById('feedbackEmailInput');
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackSuccessState = document.getElementById('feedbackSuccessState');

    if (bugReportPin && feedbackModalWrap) {
        bugReportPin.addEventListener('click', () => {
            if (feedbackForm) feedbackForm.hidden = false;
            if (feedbackSuccessState) feedbackSuccessState.hidden = true;
            if (feedbackMessageInput) feedbackMessageInput.value = '';
            
            if (feedbackEmailInput && auth.currentUser && auth.currentUser.email) {
                feedbackEmailInput.value = auth.currentUser.email;
            }

            window.smoothOpenModal(feedbackModalWrap);
            if (feedbackMessageInput) feedbackMessageInput.focus();
        });
    }

    if (closeFeedbackModal && feedbackModalWrap) {
        closeFeedbackModal.addEventListener('click', () => {
            window.smoothCloseModal(feedbackModalWrap);
        });
    }

    if (feedbackModalWrap) {
        feedbackModalWrap.addEventListener('click', (e) => {
            if (e.target === feedbackModalWrap) {
                window.smoothCloseModal(feedbackModalWrap);
            }
        });
    }

    if (feedbackCatGrid) {
        feedbackCatGrid.querySelectorAll('.feedback-cat-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                feedbackCatGrid.querySelectorAll('.feedback-cat-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFeedbackCategory = btn.getAttribute('data-category') || 'bug';
            });
        });
    }

    if (btnSubmitFeedback && feedbackMessageInput) {
        btnSubmitFeedback.addEventListener('click', async () => {
            const message = (feedbackMessageInput.value || '').trim();
            if (!message || message.length < 3) {
                if (typeof showNotification === 'function') {
                    showNotification('Wpisz treść wiadomości przed wysłaniem.', 'error');
                }
                feedbackMessageInput.focus();
                return;
            }

            const email = (feedbackEmailInput ? feedbackEmailInput.value : '').trim();
            btnSubmitFeedback.disabled = true;
            const origText = btnSubmitFeedback.querySelector('.btn-text')?.textContent;
            if (btnSubmitFeedback.querySelector('.btn-text')) {
                btnSubmitFeedback.querySelector('.btn-text').textContent = 'Wysyłanie...';
            }

            const payload = {
                category: selectedFeedbackCategory,
                message: message,
                email: email,
                userAgent: navigator.userAgent,
                screen: `${window.screen.width}x${window.screen.height}`,
                pageUrl: window.location.href,
                timestamp: Date.now()
            };

            try {
                const response = await fetch(`${WORKER_URL}/api/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let data = {};
                try { data = await response.json(); } catch(e) {}

                const localId = data.entry?.id || `fb_${Date.now()}`;
                const localEntry = {
                    id: localId,
                    ...payload,
                    createdAt: new Date().toISOString(),
                    resolved: false,
                    resolvedAt: null
                };

                try {
                    let localDB = JSON.parse(localStorage.getItem('dropsite_admin_feedback_db') || '[]');
                    localDB.unshift(localEntry);
                    if (localDB.length > 200) localDB = localDB.slice(0, 200);
                    localStorage.setItem('dropsite_admin_feedback_db', JSON.stringify(localDB));
                } catch(e) {}

                if (feedbackForm) feedbackForm.hidden = true;
                if (feedbackSuccessState) feedbackSuccessState.hidden = false;
                if (typeof playSound === 'function') playSound('success');
                if (typeof showNotification === 'function') {
                    showNotification('Dziękujemy! Zgłoszenie trafiło do administratora.', 'success');
                }

                if (isActualAdminUser()) {
                    fetchAdminFeedback();
                }

                setTimeout(() => {
                    window.smoothCloseModal(feedbackModalWrap);
                    btnSubmitFeedback.disabled = false;
                    if (btnSubmitFeedback.querySelector('.btn-text') && origText) {
                        btnSubmitFeedback.querySelector('.btn-text').textContent = origText;
                    }
                }, 2000);

            } catch (err) {
                console.warn('Feedback send fallback:', err);
                try {
                    let localDB = JSON.parse(localStorage.getItem('dropsite_admin_feedback_db') || '[]');
                    localDB.unshift({
                        id: `fb_offline_${Date.now()}`,
                        ...payload,
                        createdAt: new Date().toISOString(),
                        resolved: false,
                        resolvedAt: null
                    });
                    localStorage.setItem('dropsite_admin_feedback_db', JSON.stringify(localDB));
                } catch(e) {}

                if (feedbackForm) feedbackForm.hidden = true;
                if (feedbackSuccessState) feedbackSuccessState.hidden = false;
                if (typeof showNotification === 'function') {
                    showNotification('Zgłoszenie zapisane.', 'success');
                }
                setTimeout(() => {
                    window.smoothCloseModal(feedbackModalWrap);
                    btnSubmitFeedback.disabled = false;
                    if (btnSubmitFeedback.querySelector('.btn-text') && origText) {
                        btnSubmitFeedback.querySelector('.btn-text').textContent = origText;
                    }
                }, 1800);
            }
        });
    }
}

function initAdminFeedbackControls() {
    if (feedbackControlsInitialized) return;
    feedbackControlsInitialized = true;

    const searchInput = document.getElementById('adminFeedbackSearchInput');
    const catFilter = document.getElementById('adminFeedbackCategoryFilter');
    const statusFilter = document.getElementById('adminFeedbackStatusFilter');
    const refreshBtn = document.getElementById('adminRefreshFeedbackBtn');

    if (searchInput) searchInput.addEventListener('input', renderAdminFeedbackTab);
    if (catFilter) catFilter.addEventListener('change', renderAdminFeedbackTab);
    if (statusFilter) statusFilter.addEventListener('change', renderAdminFeedbackTab);
    if (refreshBtn) refreshBtn.addEventListener('click', fetchAdminFeedback);
}

async function fetchAdminFeedback() {
    const apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
    let remoteItems = [];

    try {
        const res = await fetch(`${WORKER_URL}/admin/feedback`, {
            headers: { 'X-Admin-Secret': apiSecret }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.feedback)) {
                remoteItems = data.feedback;
            }
        }
    } catch(e) {
        console.warn('Cannot fetch remote feedback:', e);
    }

    let localDB = [];
    try {
        localDB = JSON.parse(localStorage.getItem('dropsite_admin_feedback_db') || '[]');
    } catch(e) {}

    const map = new Map();
    remoteItems.forEach(item => map.set(item.id, item));
    localDB.forEach(item => {
        if (!map.has(item.id)) map.set(item.id, item);
    });

    adminFeedbackList = Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const pendingCount = adminFeedbackList.filter(f => !f.resolved).length;
    const countBadge = document.getElementById('adminFeedbackCountBadge');
    if (countBadge) {
        countBadge.textContent = pendingCount;
        countBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }

    renderAdminFeedbackTab();
}

function renderAdminFeedbackTab() {
    const container = document.getElementById('adminFeedbackListContainer');
    if (!container) return;

    const searchInput = document.getElementById('adminFeedbackSearchInput');
    const catFilter = document.getElementById('adminFeedbackCategoryFilter');
    const statusFilter = document.getElementById('adminFeedbackStatusFilter');

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const catVal = catFilter ? catFilter.value : 'all';
    const statusVal = statusFilter ? statusFilter.value : 'all';

    const statTotal = document.getElementById('adminStatFeedbackTotal');
    const statPending = document.getElementById('adminStatFeedbackPending');
    const statResolved = document.getElementById('adminStatFeedbackResolved');
    const statBugs = document.getElementById('adminStatFeedbackBugs');

    const totalCount = adminFeedbackList.length;
    const pendingCount = adminFeedbackList.filter(f => !f.resolved).length;
    const resolvedCount = adminFeedbackList.filter(f => f.resolved).length;
    const bugsCount = adminFeedbackList.filter(f => f.category === 'bug').length;

    if (statTotal) statTotal.textContent = totalCount;
    if (statPending) statPending.textContent = pendingCount;
    if (statResolved) statResolved.textContent = resolvedCount;
    if (statBugs) statBugs.textContent = bugsCount;

    const filtered = adminFeedbackList.filter(item => {
        if (catVal !== 'all' && item.category !== catVal) return false;
        if (statusVal === 'pending' && item.resolved) return false;
        if (statusVal === 'resolved' && !item.resolved) return false;
        if (query) {
            const textMatch = (item.message || '').toLowerCase().includes(query);
            const emailMatch = (item.email || '').toLowerCase().includes(query);
            const idMatch = (item.id || '').toLowerCase().includes(query);
            if (!textMatch && !emailMatch && !idMatch) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="admin-feedback-empty">
                <div style="font-size: 28px; margin-bottom: 8px;">✨</div>
                <div style="font-size: 14px; font-weight: 600; color: #E2E8F0; margin-bottom: 4px;">Brak zgłoszeń w tej kategorii</div>
                <div style="font-size: 12px; color: #64748B;">Nowe uwagi od użytkowników lub błędy pojawią się tutaj w czasie rzeczywistym.</div>
            </div>
        `;
        return;
    }

    const catLabels = {
        bug: { label: 'Błąd', icon: '🐞', cls: 'cat-bug' },
        suggestion: { label: 'Sugestia', icon: '💡', cls: 'cat-suggestion' },
        payment: { label: 'Płatność', icon: '💳', cls: 'cat-payment' },
        other: { label: 'Uwaga', icon: '💬', cls: 'cat-other' }
    };

    container.innerHTML = filtered.map(f => {
        const cat = catLabels[f.category] || catLabels.other;
        const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleString('pl-PL') : (f.timestamp ? new Date(f.timestamp).toLocaleString('pl-PL') : '');
        const isResolved = !!f.resolved;
        const cleanEmail = escapeHtml(f.email || '');

        return `
            <div class="admin-feedback-card ${isResolved ? 'is-resolved' : ''}" data-id="${escapeHtml(f.id)}">
                <div class="admin-feedback-header">
                    <div class="admin-feedback-badges">
                        <span class="feedback-cat-badge ${cat.cls}">
                            <span>${cat.icon}</span>
                            <span>${cat.label}</span>
                        </span>
                        <span class="feedback-status-pill ${isResolved ? 'resolved' : 'pending'}">
                            ${isResolved ? '🟢 Rozwiązane' : '🟡 Oczekujące'}
                        </span>
                    </div>
                    <span class="admin-feedback-date">${dateStr}</span>
                </div>

                <div class="admin-feedback-body">${escapeHtml(f.message || '')}</div>

                <div class="admin-feedback-meta">
                    <div class="admin-feedback-user">
                        ${cleanEmail ? `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            <a href="mailto:${cleanEmail}" style="color: var(--accent-blue); text-decoration: underline;">${cleanEmail}</a>
                        ` : `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span style="color: #64748B;">Anonimowy użytkownik</span>
                        `}
                    </div>

                    <div class="admin-feedback-diag">
                        ${f.screen ? `<span>📐 ${escapeHtml(f.screen)}</span>` : ''}
                        ${f.pageUrl ? `<span title="${escapeHtml(f.pageUrl)}">🔗 ${escapeHtml(f.pageUrl.replace(window.location.origin, ''))}</span>` : ''}
                    </div>
                </div>

                <div class="admin-feedback-actions">
                    <button type="button" class="btn-fb-action btn-resolve" onclick="toggleFeedbackResolved('${escapeHtml(f.id)}', ${!isResolved})">
                        ${isResolved ? '↩️ Przywróć do nowych' : '✅ Oznacz jako rozwiązane'}
                    </button>
                    ${cleanEmail ? `
                        <a href="mailto:${cleanEmail}?subject=Dropsite: Odpowiedź na Twoje zgłoszenie" class="btn-fb-action">
                            ✉️ Odpowiedz
                        </a>
                    ` : ''}
                    <button type="button" class="btn-fb-action btn-delete" onclick="deleteFeedbackItem('${escapeHtml(f.id)}')">
                        🗑️ Usuń
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleFeedbackResolved = async function(id, resolved) {
    const apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
    
    const item = adminFeedbackList.find(f => f.id === id);
    if (item) {
        item.resolved = resolved;
        item.resolvedAt = resolved ? new Date().toISOString() : null;
    }

    try {
        localStorage.setItem('dropsite_admin_feedback_db', JSON.stringify(adminFeedbackList));
    } catch(e) {}

    renderAdminFeedbackTab();

    const pendingCount = adminFeedbackList.filter(f => !f.resolved).length;
    const countBadge = document.getElementById('adminFeedbackCountBadge');
    if (countBadge) {
        countBadge.textContent = pendingCount;
        countBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }

    try {
        await fetch(`${WORKER_URL}/admin/feedback/toggle-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Secret': apiSecret
            },
            body: JSON.stringify({ id, resolved })
        });
        if (typeof showNotification === 'function') {
            showNotification(resolved ? 'Oznaczono jako rozwiązane.' : 'Przywrócono do oczekujących.', 'success');
        }
    } catch (e) {
        console.warn('Error updating remote status:', e);
    }
};

window.deleteFeedbackItem = async function(id) {
    if (!confirm('Czy na pewno chcesz usunąć to zgłoszenie?')) return;

    const apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
    adminFeedbackList = adminFeedbackList.filter(f => f.id !== id);

    try {
        localStorage.setItem('dropsite_admin_feedback_db', JSON.stringify(adminFeedbackList));
    } catch(e) {}

    renderAdminFeedbackTab();

    const pendingCount = adminFeedbackList.filter(f => !f.resolved).length;
    const countBadge = document.getElementById('adminFeedbackCountBadge');
    if (countBadge) {
        countBadge.textContent = pendingCount;
        countBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }

    try {
        await fetch(`${WORKER_URL}/admin/feedback/delete/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Secret': apiSecret }
        });
        if (typeof showNotification === 'function') {
            showNotification('Zgłoszenie zostało usunięte.', 'info');
        }
    } catch (e) {
        console.warn('Error deleting remote item:', e);
    }
};

// Funkcja pomocnicza do czyszczenia nazwy
function cleanFileName(filename) {
    if (!filename) return 'plik';
    let name = filename;
    if (name.includes('/')) name = name.substring(name.indexOf('/') + 1);
    
    // Usuń UUID na początku: 83ec6d4f-5aab-e096-f901-123456789abc-name.ext
    const uuidStartRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_.]/i;
    if (uuidStartRegex.test(name)) name = name.replace(uuidStartRegex, '');

    // Usuń krótki NanoID na początku: aB3x7Q-name.ext
    const nanoIdRegex = /^[2-9a-zA-Z]{5,10}[-_.]/;
    if (nanoIdRegex.test(name)) name = name.replace(nanoIdRegex, '');
    
    // Usuń timestamp na początku: 1725184920-name.ext
    const timestampRegex = /^\d{10,13}[-_.]/;
    if (timestampRegex.test(name)) name = name.replace(timestampRegex, '');

    // Usuń dodany na końcu hash po rozszerzeniu: name.gif.83ec6d4f... -> name.gif
    const trailingHashRegex = /(\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|pdf|zip|rar|tar|gz|txt|docx|doc|json|mp3))\.[0-9a-f]{6,}/i;
    if (trailingHashRegex.test(name)) {
        name = name.replace(trailingHashRegex, '$1');
    }

    return name;
}

function getFileCategory(filename) {
    if (/\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(filename)) return 'video';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename)) return 'image';
    if (/\.(pdf|doc|docx|txt|xls|xlsx|csv|json)$/i.test(filename)) return 'doc';
    if (/\.(zip|rar|7z|tar|gz)$/i.test(filename)) return 'archive';
    return 'other';
}

function updateModStats(files) {
    let totalSize = 0;
    let counts = { all: files.length, video: 0, image: 0, doc: 0, archive: 0, other: 0 };

    files.forEach(f => {
        totalSize += f.size || 0;
        const cat = getFileCategory(f.name);
        if (counts[cat] !== undefined) counts[cat]++;
    });

    const elTotalFiles = document.getElementById('modTotalFiles');
    const elTotalSize = document.getElementById('modTotalSize');
    const elMediaCount = document.getElementById('modMediaCount');

    if (elTotalFiles) elTotalFiles.innerText = `${files.length}`;
    if (elTotalSize) elTotalSize.innerText = formatBytes(totalSize);
    if (elMediaCount) elMediaCount.innerText = `${counts.video} wideo • ${counts.image} zdjęć`;

    // Aktualizacja liczników w pigułkach filtrów
    const cAll = document.getElementById('count-all');
    const cVid = document.getElementById('count-video');
    const cImg = document.getElementById('count-image');
    const cDoc = document.getElementById('count-doc');
    const cArc = document.getElementById('count-archive');

    if (cAll) cAll.innerText = counts.all;
    if (cVid) cVid.innerText = counts.video;
    if (cImg) cImg.innerText = counts.image;
    if (cDoc) cDoc.innerText = counts.doc;
    if (cArc) cArc.innerText = counts.archive;
}

function applyModFiltersAndRender() {
    let filtered = [...loadedModFiles];

    // 1. Filtr kategorii
    if (activeCategoryFilter !== 'all') {
        filtered = filtered.filter(f => getFileCategory(f.name) === activeCategoryFilter);
    }

    // 2. Szukanie
    if (activeSearchQuery) {
        filtered = filtered.filter(f => {
            const clean = cleanFileName(f.name).toLowerCase();
            const raw = f.name.toLowerCase();
            return clean.includes(activeSearchQuery) || raw.includes(activeSearchQuery);
        });
    }

    // 3. Sortowanie
    if (activeSort === 'newest') {
        filtered.reverse(); 
    } else if (activeSort === 'size-desc') {
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else if (activeSort === 'size-asc') {
        filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (activeSort === 'name-asc') {
        filtered.sort((a, b) => cleanFileName(a.name).localeCompare(cleanFileName(b.name)));
    }

    renderModFilesList(filtered);
}

function renderModFilesList(files) {
    modFileList.innerHTML = ''; 
    if (files.length === 0) {
        modFileList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 13px; margin: 30px 0;">Brak plików spełniających kryteria.</p>';
        return;
    }

    files.forEach(file => {
        const li = document.createElement('li');
        li.className = 'mod-file-item';
        
        // Prawdziwy bezpośredni adres pliku do miniatury
        let directMediaUrl = file.directUrl;
        if (!directMediaUrl || directMediaUrl.includes('?f=') || !directMediaUrl.startsWith('http')) {
            const rawKey = file.key || file.name;
            directMediaUrl = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${rawKey}`;
        }
        
        // Link do udostępniania / pobierania
        const shareableLink = (file.url && file.url.includes('?f=')) ? file.url : directMediaUrl;

        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
        const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name);
        
        let previewHtml = '';
        if (isImage) {
            previewHtml = `
                <img src="${directMediaUrl}" class="mod-preview-img" alt="" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" onclick="openImagePreview('${directMediaUrl}')" title="Powiększ zdjęcie">
                <div class="mod-preview-icon" style="display: none;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4E7D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
            `;
        } else if (isVideo) {
            previewHtml = `<div style="position: relative; cursor: pointer; width: 46px; height: 46px; flex-shrink: 0;" onclick="openVideoPreview('${directMediaUrl}')" title="Odtwórz wideo">
                              <video src="${directMediaUrl}#t=0.1" class="mod-preview-img" style="width: 100%; height: 100%; object-fit: cover; background: #000; border-radius: 6px;" muted preload="metadata"></video>
                              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); border-radius: 6px;">
                                  <span style="font-size: 14px; color: white;">▶</span>
                              </div>
                           </div>`;
        } else {
            let iconSvg = '';
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.pdf')) {
                iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
            } else if (/\.(zip|rar|7z|tar|gz)$/i.test(lowerName)) {
                iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFBC39" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
            } else if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(lowerName)) {
                iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F91D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
            } else if (/\.(json|js|html|css|py|cpp|c|ts|jsx|tsx)$/i.test(lowerName)) {
                iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4E7D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
            } else {
                iconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
            }
            previewHtml = `<div class="mod-preview-icon">${iconSvg}</div>`;
        }

        const displayName = cleanFileName(file.name);

        // Określenie bieżącego terminu wygasania
        let currentExp = 'permanent';
        if (file.name.startsWith('1d/')) currentExp = '1d';
        else if (file.name.startsWith('30d/')) currentExp = '30d';

        const expiryLabels = {
            '1d': '1 Dzień',
            '30d': '30 Dni',
            'permanent': 'Bezterminowo'
        };

        const isEffectiveAdmin = isSuperAdmin() && currentActiveRole === 'admin' && currentAdminPanelScope === 'all';
        const expSelectHtml = isEffectiveAdmin ? `
            <div class="custom-expiry-wrap exp-${currentExp}" data-current="${currentExp}" title="Zmień czas przechowywania pliku">
                <button type="button" class="custom-expiry-trigger" onclick="toggleExpiryDropdown(this, event)">
                    <span class="custom-expiry-label">${expiryLabels[currentExp] || 'Bezterminowo'}</span>
                    <svg class="custom-select-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="custom-select-menu expiry-menu" hidden>
                    <div class="custom-select-option ${currentExp === '1d' ? 'selected' : ''}" data-value="1d" onclick="selectExpiryOption('${file.name}', '1d', this)">
                        <span class="exp-dot exp-dot-1d"></span>
                        <span>1 Dzień</span>
                        <svg class="opt-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div class="custom-select-option ${currentExp === '30d' ? 'selected' : ''}" data-value="30d" onclick="selectExpiryOption('${file.name}', '30d', this)">
                        <span class="exp-dot exp-dot-30d"></span>
                        <span>30 Dni</span>
                        <svg class="opt-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div class="custom-select-option ${currentExp === 'permanent' ? 'selected' : ''}" data-value="permanent" onclick="selectExpiryOption('${file.name}', 'permanent', this)">
                        <span class="exp-dot exp-dot-perm"></span>
                        <span>Bezterminowo</span>
                        <svg class="opt-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>
            </div>
        ` : `
            <span class="mod-badge-size" style="color: var(--accent-blue); background: rgba(196, 231, 212, 0.08);">${expiryLabels[currentExp] || '1 Dzień'}</span>
        `;

        li.innerHTML = `
            <div class="mod-file-main">
                ${previewHtml}
                <div class="mod-file-info">
                    <a href="${shareableLink}" target="_blank" class="mod-file-name" title="${file.name}">${displayName}</a>
                    <div class="mod-meta-row">
                        <span class="mod-badge-size">${formatBytes(file.size)}</span>
                        ${expSelectHtml}
                    </div>
                </div>
            </div>
            <div class="mod-actions">
                <button class="btn-copy-mod" onclick="copyDirectLink('${shareableLink}')" title="Kopiuj link do pobierania">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Kopiuj</span>
                </button>
                <button class="btn-delete" data-filename="${file.name}" onclick="handleSafeDelete(this, '${file.name}')" title="Usuń plik">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Usuń</span>
                </button>
            </div>
        `;
        modFileList.appendChild(li);
    });
}

// Otwieranie / zamykanie własnego dropdowna w wierszu pliku
window.toggleExpiryDropdown = function(triggerBtn, event) {
    event.stopPropagation();
    const wrap = triggerBtn.closest('.custom-expiry-wrap');
    if (!wrap) return;
    const menu = wrap.querySelector('.custom-select-menu');
    const isOpen = wrap.classList.contains('open');
    
    closeAllCustomDropdowns();
    
    if (!isOpen) {
        wrap.classList.add('open');
        if (menu) menu.hidden = false;
        const row = wrap.closest('.mod-file-item');
        if (row) row.style.zIndex = '50';
    }
};

// Zmiana terminu wygasania przez własny szklany dropdown
window.selectExpiryOption = async function(filename, newExpiry, optionElement) {
    const wrap = optionElement.closest('.custom-expiry-wrap');
    const label = wrap ? wrap.querySelector('.custom-expiry-label') : null;
    const trigger = wrap ? wrap.querySelector('.custom-expiry-trigger') : null;

    closeAllCustomDropdowns();
    if (wrap.getAttribute('data-current') === newExpiry) return;

    wrap.classList.add('loading');
    trigger.disabled = true;

    let apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
    if (!apiSecret) {
        showNotification("Brak autoryzacji do zmiany terminu.", "error");
        wrap.classList.remove('loading');
        trigger.disabled = false;
        return;
    }

    try {
        const response = await fetch(`${WORKER_URL}/update-expiry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Secret': apiSecret
            },
            body: JSON.stringify({
                filename: filename,
                newExpiry: newExpiry
            })
        });

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem('adminSecret');
            throw new Error('Sesja wygasła. Zaloguj się ponownie.');
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Nie udało się zaktualizować terminu');
        }

        const expiryLabels = {
            '1d': '1 Dzień',
            '30d': '30 Dni',
            'permanent': 'Bezterminowo'
        };

        if (label) label.textContent = expiryLabels[newExpiry] || newExpiry;
        wrap.className = `custom-expiry-wrap exp-${newExpiry}`;
        wrap.setAttribute('data-current', newExpiry);

        const newKey = data.newKey;
        const row = wrap.closest('.mod-file-item');
        if (row && newKey) {
            const fileNameLink = row.querySelector('.mod-file-name');
            const publicLink = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${newKey}`;
            if (fileNameLink) {
                fileNameLink.href = publicLink;
                fileNameLink.title = newKey;
            }
            const copyBtn = row.querySelector('.btn-copy-mod');
            if (copyBtn) {
                copyBtn.setAttribute('onclick', `copyDirectLink('${publicLink}')`);
            }
            const deleteBtn = row.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.setAttribute('data-filename', newKey);
                deleteBtn.setAttribute('onclick', `handleSafeDelete(this, '${newKey}')`);
            }
        }

        showNotification(`Zmieniono termin na: ${expiryLabels[newExpiry] || newExpiry}`, 'success');

    } catch (err) {
        showNotification(err.message || 'Błąd zmiany terminu', 'error');
    } finally {
        wrap.classList.remove('loading');
        trigger.disabled = false;
    }
};

// Szybkie kopiowanie linku z powiadomieniem
window.copyDirectLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Skopiowano link do pliku!', 'success');
    }).catch(() => {
        showNotification('Nie udało się skopiować linku', 'error');
    });
};

// Bezpieczne 2-etapowe usuwanie
window.handleSafeDelete = async function(btn, filename) {
    if (!btn.classList.contains('confirming')) {
        btn.classList.add('confirming');
        btn.innerHTML = `<span>Na pewno?</span>`;
        
        const timer = setTimeout(() => {
            btn.classList.remove('confirming');
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span>Usuń</span>`;
        }, 3500);

        btn._confirmTimer = timer;
        return;
    }

    // Drugie kliknięcie - usuwamy!
    clearTimeout(btn._confirmTimer);
    btn.disabled = true;
    btn.innerHTML = `<span>Usuwanie...</span>`;

    const isEffectiveAdmin = isSuperAdmin() && currentActiveRole === 'admin' && currentAdminPanelScope === 'all';

    if (isEffectiveAdmin) {
        let apiSecret = sessionStorage.getItem('adminSecret') || '12345678';
        if (!apiSecret) {
            showNotification("Brak autoryzacji! Wpisz hasło administratora.", "error");
            btn.disabled = false;
            btn.innerHTML = `<span>Usuń</span>`;
            return;
        }

        try {
            const response = await fetch(`${WORKER_URL}/delete/${filename}`, { 
                method: 'DELETE',
                headers: {
                    'X-Admin-Secret': apiSecret
                }
            });
            
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem('adminSecret');
                showNotification('Nieprawidłowe hasło administratora!', 'error');
                return;
            }

            if (response.ok) {
                showNotification('Plik został trwale usunięty z serwera', 'success');
                fetchModFiles(); 
                fetchDiskStats(); 
            } else {
                showNotification('Błąd podczas usuwania pliku.', 'error');
            }
        } catch (e) {
            console.error('Błąd połączenia z serwerem:', e);
            showNotification('Błąd połączenia z serwerem', 'error');
        } finally {
            btn.disabled = false;
        }
    } else {
        // Usuwanie z panelu zwykłego użytkownika (usuwa z lokalnej historii)
        const history = getLocalHistory();
        const updated = history.filter(h => {
            const hName = (h.duration && !h.name.includes('/')) ? `${h.duration}/${h.name}` : h.name;
            return hName !== filename && h.name !== filename && h.url !== filename && h.directUrl !== filename && h.key !== filename;
        });
        const storageKey = getHistoryStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(updated));
        
        try {
            fetch(`${WORKER_URL}/delete/${filename}`, { method: 'DELETE' }).catch(() => {});
        } catch (_) {}

        showNotification('Plik został usunięty z Twojego panelu', 'success');
        fetchModFiles();
    }
};

// === SUCCESS FLOW FUNCTIONS ===
function copyToClipboard() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#') {
        navigator.clipboard.writeText(linkElement.href).then(() => {
            showNotification('Link skopiowany do schowka!', 'success');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = linkElement.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Link skopiowany do schowka!', 'success');
        });
    }
}

function shareLink() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#' && navigator.share) {
        navigator.share({
            title: 'Przesłany plik',
            text: 'Sprawdź mój przesłany plik:',
            url: linkElement.href
        });
    } else {
        copyToClipboard();
    }
}

function resetUpload() {
    successFlow.style.animation = 'slideOutDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    setTimeout(() => {
        successFlow.hidden = true;
        dropzone.hidden = false;
        optionsContainer.hidden = false;
        uploadBtn.hidden = false;
        
        selectedFile = null;
        dropzone.innerHTML = originalDropzoneHtml;
        dropzone.style.padding = "";
        
        const cinematicCard = document.getElementById('cinematicOptionCard');
        if (cinematicCard) cinematicCard.style.display = 'none';
        const chkCinematic = document.getElementById('chkCinematicDelivery');
        if (chkCinematic) chkCinematic.checked = false;
        const trackPicker = document.getElementById('cinematicTrackPicker');
        if (trackPicker) trackPicker.style.display = 'none';
        
        const finalLink = document.getElementById('finalLink');
        if (finalLink) {
            finalLink.href = '#';
            finalLink.textContent = 'https://link...';
        }

        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Upload';
        
    }, 300);
}

function showNotification(message, type = 'info') {
    // Usuń ewentualne stare powiadomienia, aby uniknąć nakładania
    const oldToast = document.querySelector('.dropsite-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `dropsite-toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<div class="toast-icon-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
    } else if (type === 'error') {
        iconSvg = `<div class="toast-icon-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>`;
    } else {
        iconSvg = `<div class="toast-icon-wrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span class="toast-text">${message}</span>
    `;

    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 240);
    }, 3200);
}

document.addEventListener('DOMContentLoaded', () => {
    // === MAGNETYCZNE PRZYCISKI ===
    const magneticElements = document.querySelectorAll('.btn-primary, .nav-logo');
    magneticElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            elem.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
        });
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = ``; // Reset to CSS default
        });
    });

    // Efekt "ripple" na przyciskach
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-primary') || e.target.classList.contains('btn-secondary')) {
            const button = e.target;
            const ripple = document.createElement('div');
            ripple.className = 'btn-ripple';
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });
    
    const featureTags = document.querySelectorAll('.feature-tag');
    featureTags.forEach(tag => {
        tag.addEventListener('mouseenter', () => tag.style.transform = 'translateY(-2px) scale(1.05)');
        tag.addEventListener('mouseleave', () => tag.style.transform = 'translateY(0) scale(1)');
    });

    // === NOWE: LOGIKA MINIMALIZACJI WIDŻETU DYSKU ===
    const minimizeDot = document.getElementById('minimizeDot');
    const storageWidget = document.getElementById('storageWidget');

    if (minimizeDot && storageWidget) {
        minimizeDot.addEventListener('click', () => {
            storageWidget.classList.toggle('minimized');
        });
    }
});

// === PODGLĄD ZDJĘĆ W PANELU MODERACJI ORAZ NA STRONIE POBIERANIA (LIGHTBOX) ===
window.openDownloadImageLightbox = function(url, title) {
    const modal = document.getElementById('dlLightboxModal');
    const img = document.getElementById('dlLightboxImg');
    const titleEl = document.getElementById('dlLightboxTitle');
    const newTabBtn = document.getElementById('dlLightboxOpenNewTab');
    const zoomToggleBtn = document.getElementById('dlLightboxZoomToggle');
    const zoomInIcon = document.getElementById('dlZoomInIcon');
    const zoomOutIcon = document.getElementById('dlZoomOutIcon');
    const zoomStatusText = document.getElementById('dlZoomStatusText');
    const closeBtn = document.getElementById('dlLightboxCloseBtn');
    const backdrop = document.getElementById('dlLightboxBackdrop');

    if (!modal || !img) return;

    img.src = url;
    img.alt = title || 'Podgląd zdjęcia';
    img.classList.remove('zoomed');

    if (titleEl) titleEl.textContent = title || 'Podgląd zdjęcia';
    if (newTabBtn) newTabBtn.href = url;

    let isZoomed = false;
    const updateZoomState = (zoomed) => {
        isZoomed = zoomed;
        if (isZoomed) {
            img.classList.add('zoomed');
            if (zoomInIcon) zoomInIcon.style.display = 'none';
            if (zoomOutIcon) zoomOutIcon.style.display = 'block';
            if (zoomStatusText) zoomStatusText.textContent = 'Dopasuj';
        } else {
            img.classList.remove('zoomed');
            if (zoomInIcon) zoomInIcon.style.display = 'block';
            if (zoomOutIcon) zoomOutIcon.style.display = 'none';
            if (zoomStatusText) zoomStatusText.textContent = 'Powiększ';
        }
    };

    updateZoomState(false);

    const toggleZoom = (e) => {
        if (e) e.stopPropagation();
        updateZoomState(!isZoomed);
    };

    const closeModal = () => {
        window.smoothCloseModal(modal, () => {
            img.src = '';
            img.classList.remove('zoomed');
        });
        document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    img.onclick = toggleZoom;
    if (zoomToggleBtn) zoomToggleBtn.onclick = toggleZoom;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    document.addEventListener('keydown', handleKeyDown);
    window.smoothOpenModal(modal);
};

window.openImagePreview = function(url, title) {
    window.openDownloadImageLightbox(url, title || 'Podgląd zdjęcia');
};

// === ODTWARZACZ WIDEO W PANELU MODERACJI ===
window.openVideoPreview = function(url) {
    let previewModal = document.getElementById('videoPreviewModal');

    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'videoPreviewModal';
        previewModal.className = 'signature-modal-backdrop';
        previewModal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            z-index: 99999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;

        const videoContainer = document.createElement('div');
        videoContainer.className = 'signature-modal-box';
        videoContainer.style.cssText = `
            position: relative;
            width: 90%;
            max-width: 1000px;
            background: #0B0D14;
            border-radius: var(--radius-md, 14px);
            overflow: hidden;
            box-shadow: 0 30px 80px rgba(0,0,0,0.85);
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            z-index: 10;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 20px;
            cursor: pointer;
            line-height: 1;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        closeBtn.onmouseover = () => { closeBtn.style.background = '#FF4439'; closeBtn.style.transform = 'scale(1.08)'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(0,0,0,0.5)'; closeBtn.style.transform = 'scale(1)'; };

        const videoPlayer = document.createElement('video');
        videoPlayer.id = 'videoPreviewSrc';
        videoPlayer.controls = true; 
        videoPlayer.autoplay = true; 
        videoPlayer.style.cssText = `
            width: 100%;
            max-height: 80vh;
            display: block;
            background: #000;
            outline: none;
        `;

        const closeModal = () => {
            window.smoothCloseModal(previewModal, () => {
                videoPlayer.pause(); 
                videoPlayer.src = ''; 
            });
        };

        closeBtn.onclick = closeModal;
        
        previewModal.onclick = (e) => {
            if (e.target === previewModal) closeModal();
        };

        videoContainer.appendChild(closeBtn);
        videoContainer.appendChild(videoPlayer);
        previewModal.appendChild(videoContainer);
        document.body.appendChild(previewModal);
    }

    const videoElement = document.getElementById('videoPreviewSrc');
    if (videoElement) {
        videoElement.src = url;
        const playProm = videoElement.play();
        if (playProm !== undefined) {
            playProm.catch(() => {});
        }
    }
    window.smoothOpenModal(previewModal);
};


// =========================================================================
// DIGITAL UNBOXING – WIDEO & AUDIO POWITANIE OD NADAWCY (WOW EFFECT)
// =========================================================================

// =========================================================================
// CINEMATIC DELIVERY – POKAZ ZDJĘĆ Z MUZYKĄ DLA FOTOGRAFÓW (WOW ENGINE)
// =========================================================================
const CinematicAudioEngine = (function() {
    let audioCtx = null;
    let masterGain = null;
    let compressor = null;
    let isPlaying = false;
    let activeTrack = 'piano';
    let loopInterval = null;
    let activeOscillators = [];
    let previewTimeout = null;

    const tracks = {
        piano: {
            name: 'Gentle Piano',
            chords: [
                [130.81, 196.00, 261.63, 329.63, 493.88], // Cmaj7 with C3 bass
                [110.00, 164.81, 220.00, 261.63, 392.00, 493.88], // Am9 with A2 bass
                [87.31, 130.81, 174.61, 220.00, 261.63, 329.63], // Fmaj7 with F2 bass
                [98.00, 146.83, 196.00, 246.94, 293.66, 392.00]  // Gsus4-G with G2 bass
            ],
            type: 'sine',
            filterFreq: 2600,
            tempo: 3.5
        },
        lofi: {
            name: 'Lo-Fi Sunset',
            chords: [
                [73.42, 110.00, 174.61, 220.00, 261.63, 329.63], // Dm9 with D2 bass
                [98.00, 146.83, 174.61, 246.94, 329.63],         // G13 with G2 bass
                [65.41, 98.00, 164.81, 196.00, 246.94, 293.66],  // Cmaj9 with C2 bass
                [110.00, 164.81, 220.00, 261.63, 329.63, 392.00] // Am9 with A2 bass
            ],
            type: 'triangle',
            filterFreq: 2000,
            tempo: 3.8
        },
        ambient: {
            name: 'Cinematic Ambient',
            chords: [
                [73.42, 110.00, 146.83, 220.00, 329.63, 440.00], // D-drone cinematic
                [58.27, 87.31, 116.54, 174.61, 233.08, 349.23],  // Bb-drone cinematic
                [65.41, 98.00, 130.81, 196.00, 293.66, 392.00],  // C-sus2 space
                [49.00, 73.42, 98.00, 146.83, 174.61, 220.00]   // Gm9 depth
            ],
            type: 'sine',
            filterFreq: 1800,
            tempo: 4.6
        },
        acoustic: {
            name: 'Acoustic Breeze',
            chords: [
                [98.00, 146.83, 196.00, 246.94, 293.66, 392.00], // G major strum
                [130.81, 164.81, 196.00, 293.66, 329.63],        // Cadd9
                [82.41, 123.47, 164.81, 196.00, 293.66],         // Em7
                [146.83, 220.00, 293.66, 392.00]                 // Dsus4
            ],
            type: 'triangle',
            filterFreq: 3000,
            tempo: 3.2
        }
    };

    async function ensureCtx() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;
            audioCtx = new AudioContextClass();
            masterGain = audioCtx.createGain();
            masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

            // Dynamix Compressor jako limiter - zapobiega przesterom i zapewnia głośny, czysty dźwięk
            compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
            compressor.knee.setValueAtTime(24, audioCtx.currentTime);
            compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
            compressor.attack.setValueAtTime(0.004, audioCtx.currentTime);
            compressor.release.setValueAtTime(0.2, audioCtx.currentTime);

            masterGain.connect(compressor);
            compressor.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') {
            try {
                await audioCtx.resume();
            } catch (e) {}
        }
        return audioCtx;
    }

    function playChord(frequencies, type, filterFreq, duration) {
        if (!audioCtx || !masterGain) return;
        const now = audioCtx.currentTime;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        filter.Q.setValueAtTime(1.2, now);
        filter.connect(masterGain);

        const perNoteGain = 0.82 / (frequencies.length + 0.5);

        frequencies.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const noteGain = audioCtx.createGain();

            osc.type = type;
            const startTime = now + idx * 0.035; // Delikatny arpeggio/strum
            osc.frequency.setValueAtTime(freq, startTime);

            // Naturalny chorus (organiczne ocieplenie)
            const detuneVal = ((idx % 2 === 0 ? 1 : -1) * (3.5 + Math.random() * 2));
            osc.detune.setValueAtTime(detuneVal, startTime);

            // Obwiednia głośności (szybki miękki atak, soczysty sustain, płynne wybrzmienie)
            noteGain.gain.setValueAtTime(0.0001, startTime);
            noteGain.gain.linearRampToValueAtTime(perNoteGain, startTime + 0.12);
            noteGain.gain.linearRampToValueAtTime(perNoteGain * 0.78, startTime + 0.4);
            noteGain.gain.setValueAtTime(perNoteGain * 0.7, startTime + duration * 0.7);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(noteGain);
            noteGain.connect(filter);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.1);

            activeOscillators.push(osc);
            setTimeout(() => {
                const i = activeOscillators.indexOf(osc);
                if (i !== -1) activeOscillators.splice(i, 1);
            }, (duration + 0.3) * 1000);
        });
    }

    async function play(trackKey = 'piano', targetVol = 0.85) {
        const ctx = await ensureCtx();
        if (!ctx) return;
        stop(false);

        activeTrack = tracks[trackKey] ? trackKey : 'piano';
        isPlaying = true;

        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.4);

        const trackConfig = tracks[activeTrack];
        let chordIdx = 0;

        const loop = () => {
            if (!isPlaying) return;
            const currentChord = trackConfig.chords[chordIdx % trackConfig.chords.length];
            playChord(currentChord, trackConfig.type, trackConfig.filterFreq, trackConfig.tempo);
            chordIdx++;
        };

        loop();
        loopInterval = setInterval(loop, trackConfig.tempo * 1000);
    }

    function stop(fade = true) {
        isPlaying = false;
        if (previewTimeout) {
            clearTimeout(previewTimeout);
            previewTimeout = null;
        }
        if (loopInterval) {
            clearInterval(loopInterval);
            loopInterval = null;
        }
        if (audioCtx && masterGain) {
            if (fade) {
                masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
                setTimeout(() => {
                    activeOscillators.forEach(osc => { try { osc.stop(); } catch(_) {} });
                    activeOscillators = [];
                }, 450);
            } else {
                masterGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
                activeOscillators.forEach(osc => { try { osc.stop(); } catch(_) {} });
                activeOscillators = [];
            }
        }
    }

    async function previewTrack(trackKey, onEnd) {
        if (isPlaying && activeTrack === trackKey) {
            stop();
            if (onEnd) onEnd(false);
            return false;
        }

        await play(trackKey, 0.85);
        if (previewTimeout) clearTimeout(previewTimeout);

        previewTimeout = setTimeout(() => {
            stop();
            if (onEnd) onEnd(false);
        }, 11000); // 11 sekund próbki odsłuchu

        if (onEnd) onEnd(true);
        return true;
    }

    function setVolume(vol) {
        if (!audioCtx || !masterGain) return;
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, Math.min(1, vol)), audioCtx.currentTime + 0.15);
    }

    return {
        play,
        stop,
        previewTrack,
        setVolume,
        ensureCtx,
        isPlaying: () => isPlaying,
        getTrackName: (key) => tracks[key]?.name || 'Gentle Piano',
        getActiveTrack: () => activeTrack
    };
})();
window.CinematicAudioEngine = CinematicAudioEngine;

// Inicjalizacja opcji u nadawcy
function initCinematicDeliverySender() {
    const chk = document.getElementById('chkCinematicDelivery');
    const picker = document.getElementById('cinematicTrackPicker');
    if (!chk || !picker) return;

    chk.addEventListener('change', () => {
        picker.style.display = chk.checked ? 'block' : 'none';
        if (!chk.checked) {
            CinematicAudioEngine.stop();
            document.querySelectorAll('.btn-track-preview').forEach(btn => {
                btn.classList.remove('playing');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
            });
        }
        if (typeof syncTransferSettingsToActiveLink === 'function') {
            syncTransferSettingsToActiveLink(false);
        }
    });

    const trackItems = document.querySelectorAll('.cinematic-track-item');
    trackItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-track-preview')) return;
            trackItems.forEach(ti => ti.classList.remove('active'));
            item.classList.add('active');
            const radio = item.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                if (typeof syncTransferSettingsToActiveLink === 'function') {
                    syncTransferSettingsToActiveLink(false);
                }
            }
        });
    });

    const previewBtns = document.querySelectorAll('.btn-track-preview');
    previewBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const trackKey = btn.getAttribute('data-preview-track') || 'piano';
            const wasPlaying = btn.classList.contains('playing');
            
            previewBtns.forEach(b => {
                b.classList.remove('playing');
                b.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
            });

            if (!wasPlaying) {
                btn.classList.add('playing');
                // Zmień ikonę na kwadrat stop
                btn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>';
                
                const trackName = CinematicAudioEngine.getTrackName(trackKey);
                if (typeof showNotification === 'function') {
                    showNotification('🎵 ' + (typeof t === 'function' ? t('cinematic_preview_playing') : 'Odtwarzanie podglądu:') + ' ' + trackName, 'info');
                }

                await CinematicAudioEngine.previewTrack(trackKey, (active) => {
                    btn.classList.toggle('playing', active);
                    btn.innerHTML = active 
                        ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>'
                        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';
                });
            } else {
                CinematicAudioEngine.stop();
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', initCinematicDeliverySender);


// =========================================================================
// PEŁNOEKRANOWY POKAZ CINEMATIC DELIVERY (RECIPIENT SLIDESHOW ENGINE)
// =========================================================================
let _cinematicSlides = [];
let _cinematicCurrentIdx = 0;
let _cinematicTimer = null;
let _cinematicProgressTimer = null;
let _cinematicIsPaused = false;
let _cinematicIsSoundMuted = false;
let _cinematicDownloadAllUrl = null;
const SLIDE_DURATION_MS = 5000;

function launchCinematicSlideshow(photosList, trackName = 'piano', collectionTitle = 'Kolekcja Fotografii', dlAllUrl = null) {
    const modal = document.getElementById('cinematicModal');
    if (!modal) return;

    if (!photosList || photosList.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Paczka nie zawiera zdjęć do wyświetlenia w pokazie slajdów.', 'warning');
        }
        return;
    }
    _cinematicSlides = photosList;
    _cinematicCurrentIdx = 0;
    _cinematicIsPaused = false;
    _cinematicIsSoundMuted = false;
    _cinematicDownloadAllUrl = dlAllUrl;

    const titleEl = document.getElementById('cinematicCollectionTitle');
    if (titleEl) titleEl.textContent = collectionTitle;

    const finishedCard = document.getElementById('cinematicFinishedCard');
    if (finishedCard) finishedCard.style.display = 'none';

    // Otwórz modal
    modal.hidden = false;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Uruchom nastrojową muzykę
    CinematicAudioEngine.play(trackName, 0.65);
    const soundLabel = document.getElementById('cinematicSoundLabel');
    if (soundLabel) soundLabel.textContent = CinematicAudioEngine.getTrackName(trackName);

    const eqBars = document.getElementById('cinematicEqBars');
    if (eqBars) eqBars.classList.add('playing');

    // Wyświetl pierwszy slajd
    renderCinematicSlide(_cinematicCurrentIdx);
    startSlideAutoTimer();

    // Podpięcie zdarzeń klawiatury
    window.removeEventListener('keydown', handleCinematicKeyboard);
    window.addEventListener('keydown', handleCinematicKeyboard);
}
window.launchCinematicSlideshow = launchCinematicSlideshow;

function renderCinematicSlide(idx) {
    if (idx < 0 || idx >= _cinematicSlides.length) return;
    _cinematicCurrentIdx = idx;

    const imgCurrent = document.getElementById('cinematicImgCurrent');
    const counterEl = document.getElementById('cinematicSlideCounter');
    const slideCurrentLayer = document.getElementById('cinematicSlideCurrent');

    if (counterEl) {
        counterEl.textContent = `${idx + 1} / ${_cinematicSlides.length}`;
    }

    if (imgCurrent && slideCurrentLayer) {
        // Zmień klasę Ken Burns dla różnorodności ruchu
        imgCurrent.className = idx % 2 === 0 ? 'cinematic-img ken-burns' : 'cinematic-img ken-burns-alt';
        imgCurrent.src = _cinematicSlides[idx];
    }
}

function startSlideAutoTimer() {
    clearSlideTimers();
    if (_cinematicIsPaused) return;

    const progressBar = document.getElementById('cinematicProgressBar');
    let startTime = Date.now();

    _cinematicProgressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / SLIDE_DURATION_MS);
        if (progressBar) progressBar.style.width = `${progress * 100}%`;

        if (progress >= 1) {
            clearSlideTimers();
            nextCinematicSlide();
        }
    }, 40);
}

function clearSlideTimers() {
    if (_cinematicProgressTimer) {
        clearInterval(_cinematicProgressTimer);
        _cinematicProgressTimer = null;
    }
    const progressBar = document.getElementById('cinematicProgressBar');
    if (progressBar) progressBar.style.width = '0%';
}

function nextCinematicSlide() {
    if (_cinematicCurrentIdx + 1 < _cinematicSlides.length) {
        renderCinematicSlide(_cinematicCurrentIdx + 1);
        startSlideAutoTimer();
    } else {
        // Osiągnięto koniec pokazu
        clearSlideTimers();
        const finishedCard = document.getElementById('cinematicFinishedCard');
        if (finishedCard) finishedCard.style.display = 'flex';
        playSound('success');
    }
}

function prevCinematicSlide() {
    if (_cinematicCurrentIdx > 0) {
        renderCinematicSlide(_cinematicCurrentIdx - 1);
        startSlideAutoTimer();
    }
}

function toggleCinematicPlayPause() {
    _cinematicIsPaused = !_cinematicIsPaused;
    const label = document.getElementById('labelCinematicPlayPause');
    const icon = document.getElementById('iconCinematicPlayPause');

    if (_cinematicIsPaused) {
        clearSlideTimers();
        if (label) label.textContent = typeof t === 'function' ? t('cinematic_play') : 'Wznów';
        if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    } else {
        startSlideAutoTimer();
        if (label) label.textContent = typeof t === 'function' ? t('cinematic_pause') : 'Pauza';
        if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    }
}

function toggleCinematicSound() {
    _cinematicIsSoundMuted = !_cinematicIsSoundMuted;
    CinematicAudioEngine.setVolume(_cinematicIsSoundMuted ? 0.001 : 0.65);
    const eqBars = document.getElementById('cinematicEqBars');
    if (eqBars) eqBars.classList.toggle('playing', !_cinematicIsSoundMuted);
}

function closeCinematicModal() {
    const modal = document.getElementById('cinematicModal');
    if (!modal) return;
    clearSlideTimers();
    CinematicAudioEngine.stop(true);
    modal.hidden = true;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    window.removeEventListener('keydown', handleCinematicKeyboard);
}

function handleCinematicKeyboard(e) {
    const modal = document.getElementById('cinematicModal');
    if (!modal || modal.style.display === 'none') return;

    if (e.key === 'Escape') {
        closeCinematicModal();
    } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleCinematicPlayPause();
    } else if (e.key === 'ArrowRight') {
        nextCinematicSlide();
    } else if (e.key === 'ArrowLeft') {
        prevCinematicSlide();
    } else if (e.key === 'm' || e.key === 'M') {
        toggleCinematicSound();
    } else if (e.key === 'f' || e.key === 'F') {
        toggleCinematicFullscreen();
    }
}

function toggleCinematicFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// Inicjalizacja kontrolek odtwarzacza kinowego
document.addEventListener('DOMContentLoaded', () => {
    const btnClose = document.getElementById('btnCloseCinematicModal');
    const btnPlayPause = document.getElementById('btnCinematicPlayPause');
    const btnNext = document.getElementById('btnCinematicNext');
    const btnPrev = document.getElementById('btnCinematicPrev');
    const btnSound = document.getElementById('btnCinematicSoundToggle');
    const btnFullscreen = document.getElementById('btnCinematicFullscreen');
    const btnReplay = document.getElementById('btnCinematicReplay');
    const btnDlSingle = document.getElementById('btnCinematicDlSingle');
    const btnDlAll = document.getElementById('btnCinematicDlAll');
    const btnFinishedDlAll = document.getElementById('btnCinematicFinishedDlAll');

    if (btnClose) btnClose.onclick = closeCinematicModal;
    if (btnPlayPause) btnPlayPause.onclick = toggleCinematicPlayPause;
    if (btnNext) btnNext.onclick = nextCinematicSlide;
    if (btnPrev) btnPrev.onclick = prevCinematicSlide;
    if (btnSound) btnSound.onclick = toggleCinematicSound;
    if (btnFullscreen) btnFullscreen.onclick = toggleCinematicFullscreen;

    if (btnReplay) {
        btnReplay.onclick = () => {
            const finishedCard = document.getElementById('cinematicFinishedCard');
            if (finishedCard) finishedCard.style.display = 'none';
            renderCinematicSlide(0);
            startSlideAutoTimer();
        };
    }

    if (btnDlSingle) {
        btnDlSingle.onclick = () => {
            const currentSrc = _cinematicSlides[_cinematicCurrentIdx];
            if (!currentSrc) return;
            const a = document.createElement('a');
            a.href = currentSrc;
            a.download = `zdjecie_${_cinematicCurrentIdx + 1}.jpg`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            playSound('click');
        };
    }

    const downloadFullBundle = () => {
        const dlBtn = document.getElementById('dlDownloadBtn');
        if (dlBtn) dlBtn.click();
        else if (_cinematicDownloadAllUrl) {
            window.location.href = _cinematicDownloadAllUrl;
        }
    };

    if (btnDlAll) btnDlAll.onclick = downloadFullBundle;
    if (btnFinishedDlAll) btnFinishedDlAll.onclick = downloadFullBundle;
});

window._attachedUnboxing = null;

function clearAttachedUnboxing() {
    window._attachedUnboxing = null;
    const bar = document.getElementById('unboxingAttachedBar');
    if (bar) bar.style.display = 'none';
}
window.clearAttachedUnboxing = clearAttachedUnboxing;

function initDigitalUnboxingRecorder() {
    const btnOpen = document.getElementById('btnOpenUnboxingRecorder');
    const modal = document.getElementById('unboxingRecorderModal');
    const btnClose = document.getElementById('unboxingModalCloseBtn');
    const backdrop = document.getElementById('unboxingModalBackdrop');
    const btnCancel = document.getElementById('btnUnboxingCancel');
    const btnModeVideo = document.getElementById('btnModeVideo');
    const btnModeAudio = document.getElementById('btnModeAudio');

    const liveVideo = document.getElementById('unboxingCameraLive');
    const audioLiveBox = document.getElementById('unboxingAudioLiveBox');
    const waveCanvas = document.getElementById('unboxingLiveWaveCanvas');
    const audioStatus = document.getElementById('unboxingAudioStatus');

    const playbackWrap = document.getElementById('unboxingPlaybackWrap');
    const recordedVideo = document.getElementById('unboxingRecordedVideo');
    const recordedAudio = document.getElementById('unboxingRecordedAudio');

    const recIndicator = document.getElementById('unboxingRecIndicator');
    const timerBadge = document.getElementById('unboxingTimerBadge');
    const warningBox = document.getElementById('unboxingPermissionWarning');
    const warningText = document.getElementById('unboxingPermissionText');

    const controlsPre = document.getElementById('unboxingControlsPre');
    const controlsRec = document.getElementById('unboxingControlsRec');
    const controlsPost = document.getElementById('unboxingControlsPost');

    const btnStartRec = document.getElementById('btnUnboxingStartRec');
    const btnStopRec = document.getElementById('btnUnboxingStopRec');
    const btnRetake = document.getElementById('btnUnboxingRetake');
    const btnAttach = document.getElementById('btnUnboxingAttach');

    const attachedBar = document.getElementById('unboxingAttachedBar');
    const attachedText = document.getElementById('unboxingAttachedText');
    const btnPreviewAttached = document.getElementById('btnPreviewAttachedUnboxing');
    const btnRemove = document.getElementById('btnRemoveUnboxing');

    if (!btnOpen || !modal) return;

    let activeMode = 'video';
    let mediaStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordedUrl = null;
    let recordTimer = null;
    let secondsElapsed = 0;
    const MAX_DURATION = 60;

    let audioCtx = null;
    let analyser = null;
    let animFrameId = null;

    function stopActiveStream() {
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (audioCtx && audioCtx.state !== 'closed') {
            try { audioCtx.close(); } catch(_) {}
            audioCtx = null;
            analyser = null;
        }
        if (mediaStream) {
            try {
                mediaStream.getTracks().forEach(track => track.stop());
            } catch(_) {}
            mediaStream = null;
        }
        if (liveVideo) {
            liveVideo.srcObject = null;
        }
    }

    function stopPreviewMedia() {
        if (recordedVideo) {
            recordedVideo.pause();
            recordedVideo.currentTime = 0;
        }
        if (recordedAudio) {
            recordedAudio.pause();
            recordedAudio.currentTime = 0;
        }
    }

    function setModeUI(mode) {
        activeMode = mode;
        if (btnModeVideo) btnModeVideo.classList.toggle('active', mode === 'video');
        if (btnModeAudio) btnModeAudio.classList.toggle('active', mode === 'audio');
        if (mode === 'video') {
            if (liveVideo) liveVideo.style.display = 'block';
            if (audioLiveBox) audioLiveBox.style.display = 'none';
        } else {
            if (liveVideo) liveVideo.style.display = 'none';
            if (audioLiveBox) audioLiveBox.style.display = 'flex';
        }
    }

    async function startStream(mode) {
        stopActiveStream();
        if (warningBox) warningBox.style.display = 'none';

        setModeUI(mode);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (warningBox && warningText) {
                warningText.textContent = typeof t === 'function' ? t('notify_error_network') : 'Przeglądarka nie obsługuje nagrywania kamery/mikrofonu.';
                warningBox.style.display = 'flex';
            }
            return;
        }

        try {
            let stream;
            if (mode === 'video') {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
                        audio: true
                    });
                } catch (e1) {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                }
                mediaStream = stream;
                if (liveVideo) {
                    liveVideo.srcObject = stream;
                    liveVideo.muted = true;
                    liveVideo.play().catch(() => {});
                }
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStream = stream;
                setupAudioWave(stream);
            }
        } catch (err) {
            console.warn('getUserMedia error:', err);
            if (warningBox && warningText) {
                warningText.textContent = 'Zezwól na dostęp do ' + (mode === 'video' ? 'kamery i mikrofonu' : 'mikrofonu') + ' w przeglądarce.';
                warningBox.style.display = 'flex';
            }
        }
    }

    function setupAudioWave(stream) {
        if (!waveCanvas) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            const canvasCtx = waveCanvas.getContext('2d');
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function draw() {
                animFrameId = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                canvasCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
                const barWidth = (waveCanvas.width / bufferLength) * 2;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = Math.max(4, (dataArray[i] / 255) * (waveCanvas.height - 8));
                    const gradient = canvasCtx.createLinearGradient(0, waveCanvas.height, 0, 0);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                    gradient.addColorStop(1, 'rgba(96, 165, 250, 0.95)');
                    canvasCtx.fillStyle = gradient;
                    canvasCtx.beginPath();
                    if (canvasCtx.roundRect) {
                        canvasCtx.roundRect(x, (waveCanvas.height - barHeight) / 2, barWidth - 3, barHeight, 3);
                    } else {
                        canvasCtx.rect(x, (waveCanvas.height - barHeight) / 2, barWidth - 3, barHeight);
                    }
                    canvasCtx.fill();
                    x += barWidth;
                }
            }
            draw();
        } catch(e) {
            console.warn('Web Audio visualizer initialization error:', e);
        }
    }

    function openModal() {
        stopPreviewMedia();
        if (playbackWrap) playbackWrap.style.display = 'none';
        if (controlsPre) controlsPre.style.display = 'flex';
        if (controlsRec) controlsRec.style.display = 'none';
        if (controlsPost) controlsPost.style.display = 'none';
        if (recIndicator) recIndicator.style.display = 'none';
        if (timerBadge) timerBadge.textContent = '00:00 / 01:00';
        if (btnModeVideo) btnModeVideo.disabled = false;
        if (btnModeAudio) btnModeAudio.disabled = false;

        window.smoothOpenModal(modal);
        startStream(activeMode);
    }

    function closeModal() {
        stopActiveStream();
        stopPreviewMedia();
        if (recordTimer) {
            clearInterval(recordTimer);
            recordTimer = null;
        }
        window.smoothCloseModal(modal);
    }

    btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (btnModeVideo) {
        btnModeVideo.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') return;
            startStream('video');
        });
    }
    if (btnModeAudio) {
        btnModeAudio.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') return;
            startStream('audio');
        });
    }

    if (btnStartRec) {
        btnStartRec.addEventListener('click', () => {
            if (!mediaStream) {
                startStream(activeMode).then(() => {
                    if (mediaStream) startRecordingActual();
                });
                return;
            }
            startRecordingActual();
        });
    }

    function startRecordingActual() {
        recordedChunks = [];
        recordedBlob = null;
        if (recordedUrl) {
            URL.revokeObjectURL(recordedUrl);
            recordedUrl = null;
        }

        let mimeType = '';
        if (activeMode === 'video') {
            const types = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
            ];
            mimeType = types.find(t => {
                try { return MediaRecorder.isTypeSupported(t); } catch(_) { return false; }
            }) || '';
        } else {
            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg',
                'audio/mp4'
            ];
            mimeType = types.find(t => {
                try { return MediaRecorder.isTypeSupported(t); } catch(_) { return false; }
            }) || '';
        }

        try {
            mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
        } catch(e) {
            mediaRecorder = new MediaRecorder(mediaStream);
        }

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const finalMime = mediaRecorder.mimeType || (activeMode === 'video' ? 'video/webm' : 'audio/webm');
            recordedBlob = new Blob(recordedChunks, { type: finalMime });
            recordedUrl = URL.createObjectURL(recordedBlob);

            stopActiveStream();

            if (playbackWrap) playbackWrap.style.display = 'block';
            if (liveVideo) liveVideo.style.display = 'none';
            if (audioLiveBox) audioLiveBox.style.display = 'none';

            if (activeMode === 'video') {
                if (recordedAudio) recordedAudio.style.display = 'none';
                if (recordedVideo) {
                    recordedVideo.style.display = 'block';
                    recordedVideo.src = recordedUrl;
                    recordedVideo.controls = true;
                    recordedVideo.play().catch(() => {});
                }
            } else {
                if (recordedVideo) recordedVideo.style.display = 'none';
                if (recordedAudio) {
                    recordedAudio.style.display = 'block';
                    recordedAudio.src = recordedUrl;
                    recordedAudio.controls = true;
                    recordedAudio.play().catch(() => {});
                }
            }

            if (controlsRec) controlsRec.style.display = 'none';
            if (controlsPost) controlsPost.style.display = 'flex';
            if (recIndicator) recIndicator.style.display = 'none';
            if (btnModeVideo) btnModeVideo.disabled = false;
            if (btnModeAudio) btnModeAudio.disabled = false;
        };

        mediaRecorder.start(250);
        playSound('click');

        if (controlsPre) controlsPre.style.display = 'none';
        if (controlsRec) controlsRec.style.display = 'flex';
        if (recIndicator) recIndicator.style.display = 'inline-flex';
        if (btnModeVideo) btnModeVideo.disabled = true;
        if (btnModeAudio) btnModeAudio.disabled = true;

        secondsElapsed = 0;
        if (timerBadge) timerBadge.textContent = '00:00 / 01:00';

        recordTimer = setInterval(() => {
            secondsElapsed++;
            const mm = '00';
            const ss = String(secondsElapsed).padStart(2, '0');
            if (timerBadge) timerBadge.textContent = `${mm}:${ss} / 01:00`;

            if (secondsElapsed >= MAX_DURATION) {
                clearInterval(recordTimer);
                recordTimer = null;
                if (btnStopRec) btnStopRec.click();
            }
        }, 1000);
    }

    if (btnStopRec) {
        btnStopRec.addEventListener('click', () => {
            if (recordTimer) {
                clearInterval(recordTimer);
                recordTimer = null;
            }
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                playSound('click');
            }
        });
    }

    if (btnRetake) {
        btnRetake.addEventListener('click', () => {
            stopPreviewMedia();
            if (playbackWrap) playbackWrap.style.display = 'none';
            if (controlsPost) controlsPost.style.display = 'none';
            if (controlsPre) controlsPre.style.display = 'flex';
            if (timerBadge) timerBadge.textContent = '00:00 / 01:00';
            startStream(activeMode);
        });
    }

    if (btnAttach) {
        btnAttach.addEventListener('click', () => {
            if (!recordedBlob) return;
            window._attachedUnboxing = {
                blob: recordedBlob,
                type: activeMode,
                duration: secondsElapsed || 1,
                url: recordedUrl
            };

            closeModal();

            if (attachedBar) {
                attachedBar.style.display = 'flex';
                if (attachedText) {
                    const label = activeMode === 'video' ? 'Dołączono wideo powitanie' : 'Dołączono notatkę głosową';
                    attachedText.textContent = `${label} (${secondsElapsed}s)`;
                }
            }

            playSound('success');
            if (typeof showNotification === 'function') {
                showNotification('🎬 Powitanie zostało dołączone do transferu!', 'success');
            }
        });
    }

    if (btnPreviewAttached) {
        btnPreviewAttached.addEventListener('click', () => {
            if (!window._attachedUnboxing) return;
            openModal();
            stopActiveStream();
            if (controlsPre) controlsPre.style.display = 'none';
            if (controlsRec) controlsRec.style.display = 'none';
            if (controlsPost) controlsPost.style.display = 'flex';
            if (playbackWrap) playbackWrap.style.display = 'block';
            if (liveVideo) liveVideo.style.display = 'none';
            if (audioLiveBox) audioLiveBox.style.display = 'none';

            const unbox = window._attachedUnboxing;
            setModeUI(unbox.type);
            const previewSrc = unbox.url || URL.createObjectURL(unbox.blob);

            if (unbox.type === 'video') {
                if (recordedAudio) recordedAudio.style.display = 'none';
                if (recordedVideo) {
                    recordedVideo.style.display = 'block';
                    recordedVideo.src = previewSrc;
                    recordedVideo.controls = true;
                    recordedVideo.play().catch(() => {});
                }
            } else {
                if (recordedVideo) recordedVideo.style.display = 'none';
                if (recordedAudio) {
                    recordedAudio.style.display = 'block';
                    recordedAudio.src = previewSrc;
                    recordedAudio.controls = true;
                    recordedAudio.play().catch(() => {});
                }
            }
        });
    }

    if (btnRemove) {
        btnRemove.addEventListener('click', () => {
            clearAttachedUnboxing();
            playSound('click');
            if (typeof showNotification === 'function') {
                showNotification('Usunięto nagranie powitania.', 'info');
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', initDigitalUnboxingRecorder);

// === SYSTEM ZATRZYMYWANIA MULTIMEDIÓW I RESETOWANIA NAWIGACJI (SPA) ===
function stopAllMediaPlayback() {
    // 1. Odtwarzacz multimediów w widoku pobierania
    const dlPreview = document.getElementById('dlPreviewContainer');
    if (dlPreview) {
        const mediaElements = dlPreview.querySelectorAll('audio, video');
        mediaElements.forEach(el => {
            try {
                el.pause();
                el.currentTime = 0;
                el.src = '';
                el.load();
            } catch(e){}
        });
        dlPreview.innerHTML = '';
    }

    // 2. Wszystkie inne elementy audio i wideo na stronie (np. podgląd w dropzone)
    document.querySelectorAll('audio, video').forEach(el => {
        try {
            el.pause();
            el.currentTime = 0;
            el.src = '';
            el.load();
        } catch(e){}
    });

    
    // 2b. Odtwarzacze Digital Unboxing (powitanie wideo/audio)
    const unboxFullVid = document.getElementById('unboxingFullVideo');
    if (unboxFullVid) { try { unboxFullVid.pause(); unboxFullVid.currentTime = 0; } catch(_) {} }
    const unboxFullAud = document.getElementById('unboxingFullAudio');
    if (unboxFullAud) { try { unboxFullAud.pause(); unboxFullAud.currentTime = 0; } catch(_) {} }
    const unboxBubbleVid = document.getElementById('unboxingBubbleVideo');
    if (unboxBubbleVid) { try { unboxBubbleVid.pause(); unboxBubbleVid.currentTime = 0; } catch(_) {} }

    // 3. Zamknij lightbox zdjęcia jeśli jest otwarty
    const lightboxModal = document.getElementById('dlLightboxModal');
    if (lightboxModal && lightboxModal.classList.contains('active')) {
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}
window.stopAllMediaPlayback = stopAllMediaPlayback;

function resetUploadFlow() {
    selectedFile = null;
    originalImageFile = null;
    currentCompressionQuality = 0.82;

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    const dropzone = document.getElementById('dropzone');
    if (dropzone && window._initialDropzoneHTML) {
        dropzone.innerHTML = window._initialDropzoneHTML;
        dropzone.style.padding = '';
        dropzone.hidden = false;
        if (typeof applyLanguage === 'function') {
            const currentLang = localStorage.getItem('dropsite_lang') || 'en';
            applyLanguage(currentLang);
        }
    }

    const fileStatusBox = document.getElementById('fileStatusBox');
    if (fileStatusBox) fileStatusBox.classList.remove('visible');

    const fsTrack = document.getElementById('fsTrack');
    if (fsTrack) fsTrack.hidden = true;

    const fsTelemetry = document.getElementById('fsTelemetry');
    if (fsTelemetry) {
        fsTelemetry.hidden = true;
        fsTelemetry.classList.add('is-hidden');
    }

    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.hidden = false;
        uploadBtn.classList.remove('loading');
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) {
            btnTextSpan.textContent = typeof t === 'function' ? t('btn_upload') : 'Upload';
        }
    }

    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) optionsContainer.hidden = false;

    const imageCompressPanel = document.getElementById('imageCompressPanel');
    if (imageCompressPanel) imageCompressPanel.hidden = true;

    const customSlugWrap = document.querySelector('.custom-slug-wrap');
    if (customSlugWrap) customSlugWrap.hidden = false;

    const cinematicCard = document.getElementById('cinematicOptionCard');
    if (cinematicCard) {
        cinematicCard.style.display = 'none';
        const chk = document.getElementById('chkCinematicDelivery');
        if (chk) chk.checked = false;
        const picker = document.getElementById('cinematicTrackPicker');
        if (picker) picker.style.display = 'none';
    }

    const successFlow = document.getElementById('successFlow');
    if (successFlow) {
        successFlow.hidden = true;
        successFlow.style.animation = '';
    }

    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.innerText = '';
        statusDiv.style.color = '';
    }
}
window.resetUploadFlow = resetUploadFlow;

function navigateToHome(resetUpload = true) {
    stopAllMediaPlayback();

    // 1. Wyczyść parametry URL (?f=..., ?file=..., ?pro_success=1 itp.)
    if (window.location.search || window.location.hash) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.pushState({}, document.title, cleanUrl);
    }

    // 2. Zresetuj proces wgrywania pliku
    if (resetUpload) {
        resetUploadFlow();
    }

    // 3. Przełącz widok na stronę główną
    const navLinks = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-target') === 'view-glowna');
    });

    views.forEach(view => {
        const isHome = view.id === 'view-glowna';
        view.hidden = !isHome;
        view.classList.toggle('active', isHome);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navigateToHome = navigateToHome;

// === SYSTEM ZAKŁADEK (SPA NAVIGATION) ===
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
        window._initialDropzoneHTML = dropzone.innerHTML;
    }

    const navLinks = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            // Zawsze zatrzymujemy odtwarzanie multimediów w tle
            stopAllMediaPlayback();

            if (targetId === 'view-glowna') {
                navigateToHome(false);
                return;
            }

            // Jeśli użytkownik był na widoku pobierania i klika inną zakładkę, czyścimy URL
            if (window.location.search || window.location.hash) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.pushState({}, document.title, cleanUrl);
            }

            // Zdejmij klasę 'active' ze wszystkich linków
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Dodaj klasę 'active' do klikniętego linku
            link.classList.add('active');

            // Ukryj wszystkie widoki
            views.forEach(view => {
                view.hidden = true;
                view.classList.remove('active');
            });

            // Pokaż docelowy widok
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.hidden = false;
                targetView.classList.add('active');
            }

            // Lazy-load narzędzi PDF przy wejściu do zakładki
            if (targetId === 'view-narzedzia' && window.loadToolboxScripts) {
                window.loadToolboxScripts();
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // === HAMBURGER MENU (MOBILE NAVIGATION DRAWER) ===
    const hamburgerBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    const drawerClose = document.getElementById('mobileDrawerClose');
    const drawerLinks = document.querySelectorAll('.mobile-drawer-link');

    function openMobileDrawer() {
        if (!mobileDrawer) return;
        mobileDrawer.classList.add('open');
        if (hamburgerBtn) hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileDrawer() {
        if (!mobileDrawer) return;
        mobileDrawer.classList.remove('open');
        if (hamburgerBtn) hamburgerBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            if (mobileDrawer && mobileDrawer.classList.contains('open')) {
                closeMobileDrawer();
            } else {
                // Sync drawer active states with current nav state
                const currentActiveNav = document.querySelector('.nav-btn.active');
                const currentTarget = currentActiveNav ? currentActiveNav.getAttribute('data-target') : 'view-glowna';
                drawerLinks.forEach(dl => {
                    dl.classList.toggle('active', dl.getAttribute('data-target') === currentTarget);
                });
                openMobileDrawer();
            }
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener('click', closeMobileDrawer);
    }

    // Close drawer when clicking overlay background
    if (mobileDrawer) {
        mobileDrawer.addEventListener('click', (e) => {
            if (e.target === mobileDrawer) closeMobileDrawer();
        });
    }

    // Handle drawer link clicks → route SPA + close drawer
    drawerLinks.forEach(dLink => {
        dLink.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = dLink.getAttribute('data-target');

            // Find corresponding .nav-btn and simulate its click
            const correspondingNav = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
            if (correspondingNav) {
                correspondingNav.click();
            }

            // Update drawer active states
            drawerLinks.forEach(dl => dl.classList.remove('active'));
            dLink.classList.add('active');

            closeMobileDrawer();
        });
    });
});

// ============================================================================
// 1. INTERAKTYWNE TŁO CZĄSTECZEK AURORA (CANVAS - WYSOKA WYDAJNOŚĆ)
// ============================================================================
(function initAuroraCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }, 150);
    }, { passive: true });

    const particles = [];
    // Zoptymalizowana liczba cząsteczek - wysoki FPS bez narzutu na GPU
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 14 : Math.min(Math.floor(width / 55), 24);
    
    const mouse = { x: width / 2, y: height / 2, active: false };
    let mouseTimer;
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(() => { mouse.active = false; }, 1500);
    }, { passive: true });

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            color: i % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(14, 165, 233, 0.45)'
        });
    }

    let isRunning = true;
    let animId = null;

    function animate() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Przyciąganie myszą (tylko gdy kursor jest aktywny)
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 25600) { // 160^2
                    p.x += dx * 0.015;
                    p.y += dy * 0.015;
                }
            }

            // Rysowanie cząsteczki (bez kosztownego shadowBlur!)
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            // Łączenie linii między cząsteczkami
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 14400) { // 120^2
                    const dist = Math.sqrt(distSq);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
        animId = requestAnimationFrame(animate);
    }

    // Automatyczne pauzowanie pętli, gdy karta jest w tle (oszczędzanie baterii i CPU)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isRunning = false;
            if (animId) cancelAnimationFrame(animId);
        } else {
            if (!isRunning) {
                isRunning = true;
                animId = requestAnimationFrame(animate);
            }
        }
    });

    animId = requestAnimationFrame(animate);
})();

// ============================================================================
// 2. BŁYSKAWICZNY UPLOAD ZE SCHOWKA (CTRL + V)
// ============================================================================
window.addEventListener('paste', (e) => {
    // Nie przechwytuj, jeśli użytkownik wpisuje tekst w formularzu (np. logowanie lub szukajka)
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];

    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob) {
                // Jeśli to zrzut ekranu bez nazwy, nadaj mu czytelną nazwę
                const filename = blob.name === 'image.png' ? `Zrzut_ekranu_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.png` : blob.name;
                const file = new File([blob], filename, { type: blob.type });
                files.push(file);
            }
        }
    }

    if (files.length > 0) {
        showNotification(`Wklejono ${files.length} plik(ów) ze schowka!`, 'success');
        updateSelectedFile(files);
        // Przełącz na główny widok, jeśli użytkownik był w innej zakładce
        const mainNav = document.querySelector('[data-target="view-glowna"]');
        if (mainNav) mainNav.click();
    }
});

// ============================================================================
// 3. GENEROWANIE KODÓW QR (DO POBRANIA NA TELEFONIE)
// ============================================================================
const qrModalWrap = document.getElementById('qrModalWrap');
const closeQrModal = document.getElementById('closeQrModal');
const qrCanvas = document.getElementById('qrCanvas');

window.copyToClipboard = function() {
    const finalLink = document.getElementById('finalLink');
    if (!finalLink) return;
    const url = finalLink.dataset.shareUrl || finalLink.href || finalLink.textContent;
    if (!url || url === '#') return;
    window.copyDirectLink(url);
};

window.shareLink = function() {
    const finalLink = document.getElementById('finalLink');
    const url = finalLink?.dataset.shareUrl || finalLink?.href || finalLink?.textContent;
    if (navigator.share && url && url !== '#') {
        navigator.share({
            title: 'Pobierz plik z Dropsite',
            text: 'Przesyłam Ci plik przez Dropsite:',
            url: url
        }).catch(()=>{});
    } else {
        window.copyToClipboard();
    }
};

window.openQrModal = function(customUrl) {
    const url = customUrl || document.getElementById('finalLink')?.href;
    if (!url || url === '#' || !qrCanvas) return;

    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrCanvas, url, {
            width: 200,
            margin: 1,
            color: {
                dark: '#0E1015',
                light: '#FFFFFF'
            }
        }, function (error) {
            if (error) console.error("Błąd generowania QR:", error);
            else if (qrModalWrap) window.smoothOpenModal(qrModalWrap);
        });
    }
};

if (closeQrModal && qrModalWrap) {
    closeQrModal.addEventListener('click', () => { window.smoothCloseModal(qrModalWrap); });
    qrModalWrap.addEventListener('click', (e) => {
        if (e.target === qrModalWrap) window.smoothCloseModal(qrModalWrap);
    });
}

// ============================================================================
// 4. HISTORIA WGRANYCH PLIKÓW UŻYTKOWNIKA (LOKALNY STORAGE)
// ============================================================================
const openHistoryBtn = document.getElementById('openHistoryBtn');
const historyModalWrap = document.getElementById('historyModalWrap');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const userHistoryList = document.getElementById('userHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function getHistoryStorageKey() {
    const user = auth.currentUser;
    if (user && user.uid) {
        return `dropsite_user_history_${user.uid}`;
    }
    return 'dropsite_user_history_guest';
}

function getLocalHistory() {
    try {
        const key = getHistoryStorageKey();
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function saveToUserHistory(item) {
    const key = getHistoryStorageKey();
    const history = getLocalHistory();
    // Unikamy duplikatów
    const filtered = history.filter(h => h.url !== item.url && h.name !== item.name);
    filtered.unshift(item);
    // Zachowaj maksymalnie 50 ostatnich plików
    if (filtered.length > 50) filtered.pop();
    localStorage.setItem(key, JSON.stringify(filtered));
}

function renderUserHistory() {
    if (!userHistoryList) return;
    const history = getLocalHistory();
    userHistoryList.innerHTML = '';

    if (history.length === 0) {
        userHistoryList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 13px; margin: 30px 0;">Brak historii wgranych plików.</p>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'mod-file-item';

        let iconSvg = '';
        const lowerName = item.name.toLowerCase();
        if (/\.(mp4|webm|mov|mkv)$/i.test(lowerName)) {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F91D2" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        } else if (/\.(zip|rar|7z|tar|gz)$/i.test(lowerName)) {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFBC39" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
        } else if (/\.(pdf)$/i.test(lowerName)) {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
        } else {
            iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
        }

        let badge = '<span class="mod-badge-exp exp-30d">30 Dni</span>';
        if (item.duration === '1d') badge = '<span class="mod-badge-exp exp-1d">1 Dzień</span>';
        else if (item.duration === 'permanent') badge = '<span class="mod-badge-exp exp-perm">Bezterminowo</span>';
        else if (item.duration === 'burn') badge = '<span class="mod-badge-exp exp-burn">1x Pobranie</span>';

        li.innerHTML = `
            <div class="mod-file-main">
                <div class="mod-preview-icon">${iconSvg}</div>
                <div class="mod-file-info">
                    <a href="${item.url}" target="_blank" class="mod-file-name" title="${item.name}">${item.name}</a>
                    <div class="mod-meta-row">
                        <span class="mod-badge-size">${formatBytes(item.size)}</span>
                        ${badge}
                    </div>
                </div>
            </div>
            <div class="mod-actions">
                <button class="btn-copy-mod" onclick="copyDirectLink('${item.url}')" title="Kopiuj link">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Kopiuj
                </button>
            </div>
        `;
        userHistoryList.appendChild(li);
    });
}

if (openHistoryBtn && historyModalWrap) {
    openHistoryBtn.addEventListener('click', () => {
        renderUserHistory();
        window.smoothOpenModal(historyModalWrap);
    });
}

if (closeHistoryModal && historyModalWrap) {
    closeHistoryModal.addEventListener('click', () => { window.smoothCloseModal(historyModalWrap); });
    historyModalWrap.addEventListener('click', (e) => {
        if (e.target === historyModalWrap) window.smoothCloseModal(historyModalWrap);
    });
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('dropsite_user_history');
        renderUserHistory();
        showNotification('Historia została wyczyszczona', 'info');
    });
}

// Funkcja kopiowania bezpośredniego z dźwiękiem
window.copyDirectLink = function(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            playSound('copy');
            if (typeof showNotification === 'function') {
                showNotification('Link został skopiowany do schowka!', 'success');
            }
        }).catch(() => {
            prompt('Skopiuj link poniżej:', url);
        });
    } else {
        prompt('Skopiuj link poniżej:', url);
    }
};

// ============================================================================
// 5. DEDYKOWANA STRONA POBIERANIA (DOWNLOAD LANDING PAGE, STATS, AUDIO & LOCK)
// ============================================================================
async function initDownloadRouter() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileKey = urlParams.get('f') || urlParams.get('file');

    if (!fileKey) return; // Zwykłe wejście na stronę główną

    // Ukryj wszystkie widoki i pokaż dedykowany widok pobierania
    document.querySelectorAll('.view-section').forEach(v => { v.hidden = true; v.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));

    const dlView = document.getElementById('view-download');
    if (dlView) {
        dlView.hidden = false;
        dlView.classList.add('active');
    }

    const dlFileName = document.getElementById('dlFileName');
    const dlFileSize = document.getElementById('dlFileSize');
    const dlBadgeWrap = document.getElementById('dlBadgeWrap');
    const dlPreviewContainer = document.getElementById('dlPreviewContainer');
    const dlBurnWarning = document.getElementById('dlBurnWarning');
    const dlDownloadBtn = document.getElementById('dlDownloadBtn');
    const dlViewCount = document.getElementById('dlViewCount');
    const dlDownloadCount = document.getElementById('dlDownloadCount');
    const dlNoteBox = document.getElementById('dlNoteBox');
    const dlNoteText = document.getElementById('dlNoteText');
    const dlPasswordLockBox = document.getElementById('dlPasswordLockBox');
    const dlContentWrap = document.getElementById('dlContentWrap');
    const dlUnlockBtn = document.getElementById('dlUnlockBtn');
    const dlUnlockPasswordInput = document.getElementById('dlUnlockPasswordInput');
    const dlPasswordError = document.getElementById('dlPasswordError');

    // =========================================================================
    // SMART ZIP EXPLORER & LIGHTBOX HELPERS
    // =========================================================================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getMimeTypeForFilename(fileName) {
        const ext = (fileName || '').split('.').pop().toLowerCase();
        const map = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
            'webp': 'image/webp', 'svg': 'image/svg+xml', 'bmp': 'image/bmp',
            'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4', 'flac': 'audio/flac',
            'pdf': 'application/pdf', 'txt': 'text/plain; charset=utf-8', 'json': 'application/json',
            'js': 'text/javascript', 'html': 'text/html', 'css': 'text/css', 'md': 'text/markdown',
            'zip': 'application/zip'
        };
        return map[ext] || 'application/octet-stream';
    }

    function getMiniFileSvg(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        }
        if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
        }
        if (['mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac'].includes(ext)) {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
        }
        if (ext === 'pdf') {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
        }
        if (['txt', 'json', 'js', 'html', 'css', 'md', 'py', 'java', 'c', 'cpp', 'xml', 'yaml', 'yml'].includes(ext)) {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
        }
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
            return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EC4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
        }
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    }

    // Pobieranie pojedynczego pliku z rozpakowanego archiwum ZIP w locie
    window.downloadSingleFromArchive = function(encodedPath, encodedFilename) {
        const path = decodeURIComponent(encodedPath);
        const filename = decodeURIComponent(encodedFilename);
        const unzipped = window._activeUnzippedArchive;
        if (!unzipped || !unzipped[path]) {
            if (typeof showNotification === 'function') {
                showNotification('Nie znaleziono pliku w pamięci archiwum.', 'error');
            }
            return;
        }

        const uint8 = unzipped[path];
        const mime = getMimeTypeForFilename(filename);
        const blob = new Blob([uint8], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        if (typeof playSound === 'function') playSound('drop');
        if (typeof showNotification === 'function') {
            showNotification(`Pobrano plik: ${filename} (${formatBytes(uint8.length)})!`, 'success');
        }
    };

    // Podgląd pojedynczego pliku z archiwum w oknie modalnym (tekst, kod, grafika, audio)
    window.previewSingleFromArchive = function(encodedPath, encodedFilename) {
        const path = decodeURIComponent(encodedPath);
        const filename = decodeURIComponent(encodedFilename);
        const unzipped = window._activeUnzippedArchive;
        if (!unzipped || !unzipped[path]) return;

        const uint8 = unzipped[path];
        const ext = filename.split('.').pop().toLowerCase();
        const mime = getMimeTypeForFilename(filename);

        const modal = document.getElementById('archiveQuickPreviewModal');
        const content = document.getElementById('archivePreviewContent');
        const title = document.getElementById('archivePreviewTitle');
        const sizeBadge = document.getElementById('archivePreviewSizeBadge');
        const iconSpan = document.getElementById('archivePreviewIcon');
        const copyBtn = document.getElementById('archivePreviewCopyBtn');
        const dlBtn = document.getElementById('archivePreviewDownloadBtn');
        const closeBtn = document.getElementById('archivePreviewCloseBtn');
        const backdrop = document.getElementById('archivePreviewBackdrop');

        if (!modal || !content) return;

        title.textContent = filename;
        title.title = path;
        sizeBadge.textContent = formatBytes(uint8.length);
        iconSpan.innerHTML = getMiniFileSvg(filename);

        dlBtn.onclick = () => window.downloadSingleFromArchive(encodedPath, encodedFilename);

        // Obraz
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
            copyBtn.style.display = 'none';
            const blob = new Blob([uint8], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            content.innerHTML = `<img src="${blobUrl}" alt="${filename}" style="max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">`;
            modal._cleanupBlob = () => URL.revokeObjectURL(blobUrl);
        } 
        // Kod / Tekst
        else if (['txt', 'json', 'js', 'html', 'css', 'md', 'py', 'java', 'c', 'cpp', 'xml', 'yaml', 'yml'].includes(ext)) {
            copyBtn.style.display = 'inline-flex';
            const text = new TextDecoder().decode(uint8.slice(0, 100000));
            content.innerHTML = `<pre class="archive-preview-code">${escapeHtml(text)}</pre>`;
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(text).then(() => {
                    if (typeof playSound === 'function') playSound('copy');
                    if (typeof showNotification === 'function') {
                        showNotification(typeof t === 'function' ? t('zip_text_copied') : 'Skopiowano tekst do schowka!', 'success');
                    }
                });
            };
        } 
        // Audio
        else if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
            copyBtn.style.display = 'none';
            const blob = new Blob([uint8], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            content.innerHTML = `
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🎵</div>
                    <audio controls autoplay src="${blobUrl}" style="width: 100%; max-width: 400px;"></audio>
                </div>
            `;
            modal._cleanupBlob = () => URL.revokeObjectURL(blobUrl);
        } 
        // Plik bez podglądu
        else {
            copyBtn.style.display = 'none';
            content.innerHTML = `
                <div style="text-align: center; padding: 32px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 12px;">📦</div>
                    <p style="font-size: 14px; margin-bottom: 16px;">Plik binarny (brak bezpośredniego podglądu w przeglądarce).</p>
                    <button type="button" class="btn-primary" onclick="window.downloadSingleFromArchive('${encodedPath}', '${encodedFilename}')" style="margin: 0 auto;">
                        Pobierz ten plik (${formatBytes(uint8.length)})
                    </button>
                </div>
            `;
        }

        const closeModal = () => {
            modal.hidden = true;
            modal.style.display = 'none';
            content.innerHTML = '';
            if (modal._cleanupBlob) {
                modal._cleanupBlob();
                modal._cleanupBlob = null;
            }
            document.removeEventListener('keydown', handleEsc);
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') closeModal();
        };

        closeBtn.onclick = closeModal;
        backdrop.onclick = closeModal;
        document.addEventListener('keydown', handleEsc);

        modal.hidden = false;
        modal.style.display = 'flex';
    };

    // Podgląd powiększenia obrazu (Lightbox)
    window.openDownloadImageLightbox = function(imageUrl, title) {
        const modal = document.getElementById('dlLightboxModal');
        const img = document.getElementById('dlLightboxImg');
        const titleEl = document.getElementById('dlLightboxTitle');
        const openNewTab = document.getElementById('dlLightboxOpenNewTab');
        const closeBtn = document.getElementById('dlLightboxCloseBtn');
        const backdrop = document.getElementById('dlLightboxBackdrop');
        const zoomToggle = document.getElementById('dlLightboxZoomToggle');
        const zoomInIcon = document.getElementById('dlZoomInIcon');
        const zoomOutIcon = document.getElementById('dlZoomOutIcon');
        const zoomStatus = document.getElementById('dlZoomStatusText');

        if (!modal || !img) return;

        img.src = imageUrl;
        if (titleEl) titleEl.textContent = title || 'Podgląd zdjęcia';
        if (openNewTab) openNewTab.href = imageUrl;

        let isZoomed = false;
        const updateZoom = (zoomed) => {
            isZoomed = zoomed;
            img.style.maxHeight = isZoomed ? 'none' : '75vh';
            img.style.cursor = isZoomed ? 'zoom-out' : 'zoom-in';
            if (zoomInIcon) zoomInIcon.style.display = isZoomed ? 'none' : 'block';
            if (zoomOutIcon) zoomOutIcon.style.display = isZoomed ? 'block' : 'none';
            if (zoomStatus) zoomStatus.textContent = isZoomed ? 'Dopasuj' : 'Powiększ';
        };
        updateZoom(false);

        if (zoomToggle) {
            zoomToggle.onclick = () => updateZoom(!isZoomed);
        }
        img.onclick = () => updateZoom(!isZoomed);

        const closeModal = () => {
            modal.hidden = true;
            modal.style.display = 'none';
            img.src = '';
            document.removeEventListener('keydown', handleEsc);
        };

        const handleEsc = (e) => {
            if (e.key === 'Escape') closeModal();
        };

        if (closeBtn) closeBtn.onclick = closeModal;
        if (backdrop) backdrop.onclick = closeModal;
        document.addEventListener('keydown', handleEsc);

        modal.hidden = false;
        modal.style.display = 'flex';
    };

    // =========================================================================
    // CLIENT PROOFING & REVISION PINS (MINI-FRAME.IO)
    // =========================================================================
    let proofingPins = [];
    let proofingActive = true;
    let currentProofingFileKey = null;
    let currentPendingPin = null;
    let proofingModalInitialized = false;

    function formatProofingTime(secs) {
        if (isNaN(secs) || secs === null || secs === undefined || secs === Infinity) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    async function loadProofingPins(fileKey) {
        currentProofingFileKey = fileKey;
        proofingPins = [];

        // 1. Local-first: natychmiastowy odczyt z localStorage
        try {
            const local = localStorage.getItem('dropsite_proofing_' + fileKey);
            if (local) {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed)) proofingPins = parsed;
            }
        } catch (e) {}

        renderProofingUI();

        // 2. Pobranie z chmury w tle (R2)
        try {
            const res = await fetch(`${WORKER_URL}/api/proofing?key=${encodeURIComponent(fileKey)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.pins)) {
                    const map = new Map();
                    data.pins.forEach(p => map.set(p.id, p));
                    proofingPins.forEach(p => {
                        if (!map.has(p.id)) map.set(p.id, p);
                    });
                    proofingPins = Array.from(map.values());
                    proofingPins.sort((a, b) => {
                        if (typeof a.time === 'number' && typeof b.time === 'number') {
                            return a.time - b.time;
                        }
                        return a.timestamp - b.timestamp;
                    });
                    localStorage.setItem('dropsite_proofing_' + fileKey, JSON.stringify(proofingPins));
                    renderProofingUI();
                }
            }
        } catch (e) {}
    }

    function renderProofingUI() {
        renderProofingPinsOnMedia();
        renderProofingTimelineMarkers();
        renderProofingTasksList();
        updateProofingBadge();
    }

    function formatPluralPins(total) {
        if (total === 1) return '1 uwaga';
        if (total >= 2 && total <= 4) return `${total} uwagi`;
        return `${total} uwag`;
    }

    function updateProofingBadge() {
        const badge = document.getElementById('proofingPinCountBadge');
        if (!badge) return;
        const total = proofingPins.length;
        const resolved = proofingPins.filter(p => p.resolved).length;
        badge.textContent = formatPluralPins(total);

        const progressEl = document.getElementById('proofingDrawerProgress');
        if (progressEl) {
            progressEl.textContent = `${resolved}/${total} wykonane`;
        }
    }

    function renderProofingPinsOnMedia() {
        const layer = document.getElementById('proofingPinsLayer');
        if (!layer) return;
        layer.innerHTML = '';

        // Jeśli to wideo - nie renderujemy wiszących w powietrzu pinesek na kadrze (zgodnie z życzeniem użytkownika, uwagi są zaznaczone wyłącznie na osi czasu)
        const videoEl = document.getElementById('proofingVideoEl');
        if (videoEl) return;

        if (!proofingActive) return;

        proofingPins.forEach((pin, idx) => {
            const pinEl = document.createElement('div');
            pinEl.className = `proofing-pin ${pin.resolved ? 'resolved' : ''}`;
            pinEl.style.left = `${pin.xPct}%`;
            pinEl.style.top = `${pin.yPct}%`;
            pinEl.setAttribute('data-pin-id', pin.id);

            const pinNum = idx + 1;
            const timeLabel = pin.formattedTime ? pin.formattedTime : '#' + pinNum;

            pinEl.innerHTML = `
                <div class="proofing-pin-pulse"></div>
                <div class="proofing-pin-badge">
                    <span>${timeLabel}</span>
                </div>
                <div class="proofing-pin-pointer"></div>
                <div class="proofing-pin-anchor-dot"></div>
                <div class="proofing-pin-tooltip">
                    <div class="proofing-pin-tooltip-header">
                        ${pin.formattedTime ? `<span class="proofing-pin-tooltip-time">${pin.formattedTime}</span>` : ''}
                        <span class="proofing-pin-tooltip-author">${escapeHtml(pin.author)}</span>
                    </div>
                    <div class="proofing-pin-tooltip-text">${escapeHtml(pin.comment)}</div>
                    <div class="proofing-pin-tooltip-hint">⠿ Przeciągnij, aby przesunąć</div>
                </div>
            `;

            let startX = 0, startY = 0;
            let isDragging = false;
            let hasDragged = false;

            const onPointerDown = (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.stopPropagation();
                startX = e.clientX;
                startY = e.clientY;
                hasDragged = false;
                isDragging = false;

                const overlay = document.getElementById('proofingOverlay');
                if (!overlay) return;

                const onPointerMove = (moveEvt) => {
                    const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
                    if (dist > 4) {
                        isDragging = true;
                        hasDragged = true;
                        pinEl.classList.add('is-dragging');
                    }
                    if (!isDragging) return;

                    const rect = overlay.getBoundingClientRect();
                    const curX = Math.max(1, Math.min(99, ((moveEvt.clientX - rect.left) / rect.width) * 100));
                    const curY = Math.max(1, Math.min(99, ((moveEvt.clientY - rect.top) / rect.height) * 100));

                    pinEl.style.left = curX + '%';
                    pinEl.style.top = curY + '%';
                    pin.xPct = Math.round(curX * 10) / 10;
                    pin.yPct = Math.round(curY * 10) / 10;
                };

                const onPointerUp = () => {
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);

                    if (isDragging) {
                        pinEl.classList.remove('is-dragging');
                        localStorage.setItem('dropsite_proofing_' + currentProofingFileKey, JSON.stringify(proofingPins));
                        fetch(`${WORKER_URL}/api/proofing`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: currentProofingFileKey, pin: pin })
                        }).catch(()=>{});
                        if (typeof playSound === 'function') playSound('click');
                    }
                };

                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            };

            pinEl.addEventListener('pointerdown', onPointerDown);

            pinEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (hasDragged) return;
                seekToPin(pin);
            });

            layer.appendChild(pinEl);
        });
    }

    
    function closeTimelineMarkerPopover() {
        const existing = document.getElementById('timelineMarkerPopover');
        if (existing) existing.remove();
        document.removeEventListener('click', onOutsidePopoverClick);
        document.removeEventListener('keydown', onPopoverEscapeKey);
    }

    function onOutsidePopoverClick(e) {
        if (!e.target.closest('#timelineMarkerPopover') && !e.target.closest('.proofing-timeline-marker')) {
            closeTimelineMarkerPopover();
        }
    }

    function onPopoverEscapeKey(e) {
        if (e.key === 'Escape') closeTimelineMarkerPopover();
    }

    function showTimelineMarkerPopover(pin, markerEl, trackEl) {
        const existing = document.getElementById('timelineMarkerPopover');
        if (existing && existing.getAttribute('data-pin-id') === pin.id) {
            closeTimelineMarkerPopover();
            return;
        }
        closeTimelineMarkerPopover();

        const video = document.getElementById('proofingVideoEl') || document.getElementById('sideProofingVideo');
        if (video && typeof pin.time === 'number') {
            video.currentTime = pin.time;
            video.pause();
            const playIcon = document.getElementById('proofingPlayIcon');
            const pauseIcon = document.getElementById('proofingPauseIcon');
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }

        const popover = document.createElement('div');
        popover.id = 'timelineMarkerPopover';
        popover.className = 'timeline-marker-detail-popover';
        popover.setAttribute('data-pin-id', pin.id);

        const pct = markerEl ? parseFloat(markerEl.style.left) || 50 : 50;
        const clampedLeft = Math.min(85, Math.max(15, pct));
        popover.style.left = clampedLeft + '%';

        popover.innerHTML = `
            <div class="popover-arrow" style="left: ${Math.min(92, Math.max(8, (pct - clampedLeft) + 50))}%;"></div>
            <div class="marker-popover-header">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="marker-popover-time ${pin.resolved ? 'resolved' : ''}">${pin.formattedTime || '00:00'}</span>
                    <span class="marker-popover-author">${escapeHtml(pin.author || 'Użytkownik')}</span>
                </div>
                <button type="button" class="marker-popover-close" title="Zamknij (Esc)">✕</button>
            </div>
            <div class="marker-popover-text">${escapeHtml(pin.comment || '')}</div>
            <div class="marker-popover-actions">
                <button type="button" class="marker-popover-btn btn-resolve" title="${pin.resolved ? 'Oznacz jako do zrobienia' : 'Oznacz jako wykonane'}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>${pin.resolved ? 'Wykonane ✓' : 'Zrobione?'}</span>
                </button>
                <button type="button" class="marker-popover-btn btn-delete" title="Usuń tę uwagę">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    <span>Usuń</span>
                </button>
            </div>
        `;

        popover.querySelector('.marker-popover-close').onclick = (e) => {
            e.stopPropagation();
            closeTimelineMarkerPopover();
        };

        popover.querySelector('.btn-resolve').onclick = (e) => {
            e.stopPropagation();
            if (typeof togglePinResolved === 'function') {
                togglePinResolved(pin.id);
            } else if (typeof toggleSidePinResolved === 'function') {
                toggleSidePinResolved(pin.id);
            }
            closeTimelineMarkerPopover();
        };

        popover.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            if (typeof deletePin === 'function') {
                deletePin(pin.id);
            } else if (typeof deleteSidePin === 'function') {
                deleteSidePin(pin.id);
            }
            closeTimelineMarkerPopover();
        };

        const targetContainer = trackEl || document.getElementById('proofingTimelineTrack') || document.getElementById('proofingTimelineWrap');
        if (targetContainer) {
            targetContainer.style.position = 'relative';
            targetContainer.appendChild(popover);
        }

        setTimeout(() => {
            document.addEventListener('click', onOutsidePopoverClick);
            document.addEventListener('keydown', onPopoverEscapeKey);
        }, 10);
    }

    function renderProofingTimelineMarkers() {
        const markersLayer = document.getElementById('proofingTimelineMarkersLayer');
        const video = document.getElementById('proofingVideoEl');
        if (!markersLayer || !video) return;
        markersLayer.innerHTML = '';

        const duration = video.duration;
        if (!duration || isNaN(duration) || duration <= 0) return;

        proofingPins.forEach((pin) => {
            if (typeof pin.time !== 'number') return;
            const pct = Math.max(0, Math.min(100, (pin.time / duration) * 100));

            const marker = document.createElement('div');
            marker.className = `proofing-timeline-marker ${pin.resolved ? 'resolved' : ''}`;
            marker.style.left = `${pct}%`;
            marker.title = `[${pin.formattedTime}] ${pin.author}: ${pin.comment}`;

            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                showTimelineMarkerPopover(pin, marker, document.getElementById('proofingTimelineTrack'));
            });

            markersLayer.appendChild(marker);
        });
    }

    function renderProofingTasksList() {
        const listEl = document.getElementById('proofingTasksList');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (proofingPins.length === 0) {
            listEl.innerHTML = `
                <div class="proofing-empty-hint">
                    <span>${typeof t === 'function' ? t('proofing_no_pins') : 'Brak uwag. Kliknij w dowolne miejsce na klatce lub grafice, aby postawić pinezkę.'}</span>
                </div>
            `;
            return;
        }

        proofingPins.forEach((pin, idx) => {
            const item = document.createElement('div');
            item.className = `proofing-task-item ${pin.resolved ? 'is-resolved' : ''}`;
            item.setAttribute('data-pin-id', pin.id);

            item.innerHTML = `
                <div class="proofing-task-left">
                    <button type="button" class="proofing-checkbox-btn" title="${pin.resolved ? 'Oznacz jako do zrobienia' : 'Oznacz jako zrobione'}" aria-label="Status zadania">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    ${pin.formattedTime ? `<span class="proofing-time-pill" title="Przewiń wideo do tej sekundy">${pin.formattedTime}</span>` : `<span class="proofing-time-pill" title="Punkt na grafice">#${idx + 1}</span>`}
                    <div class="proofing-task-content">
                        <span class="proofing-task-author-tag">${escapeHtml(pin.author)}</span>
                        <span class="proofing-task-text">${escapeHtml(pin.comment)}</span>
                    </div>
                </div>
                <div class="proofing-task-right">
                    <button type="button" class="btn-task-del" title="Usuń uwagę" aria-label="Usuń uwagę">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            const checkBtn = item.querySelector('.proofing-checkbox-btn');
            if (checkBtn) {
                checkBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePinResolved(pin.id);
                });
            }

            const timePill = item.querySelector('.proofing-time-pill');
            if (timePill) {
                timePill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    seekToPin(pin);
                });
            }

            const delBtn = item.querySelector('.btn-task-del');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deletePin(pin.id);
                });
            }

            listEl.appendChild(item);
        });
    }

    function seekToPin(pin) {
        const video = document.getElementById('proofingVideoEl');
        if (video && typeof pin.time === 'number') {
            video.currentTime = pin.time;
            video.pause();
            const playIcon = document.getElementById('proofingPlayIcon');
            const pauseIcon = document.getElementById('proofingPauseIcon');
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }

        const pinEl = document.querySelector(`.proofing-pin[data-pin-id="${pin.id}"]`);
        if (pinEl) {
            pinEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pinEl.style.transform = 'translate(-50%, -125%) scale(1.35)';
            pinEl.style.zIndex = '100';
            setTimeout(() => {
                pinEl.style.transform = '';
                pinEl.style.zIndex = '';
            }, 800);
        }
    }

    async function togglePinResolved(pinId) {
        const pin = proofingPins.find(p => p.id === pinId);
        if (!pin) return;
        pin.resolved = !pin.resolved;
        pin.resolvedAt = pin.resolved ? new Date().toISOString() : null;

        localStorage.setItem('dropsite_proofing_' + currentProofingFileKey, JSON.stringify(proofingPins));
        renderProofingUI();
        if (typeof playSound === 'function') playSound('click');

        fetch(`${WORKER_URL}/api/proofing/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: currentProofingFileKey, pinId })
        }).catch(()=>{});
    }

    async function deletePin(pinId) {
        proofingPins = proofingPins.filter(p => p.id !== pinId);
        localStorage.setItem('dropsite_proofing_' + currentProofingFileKey, JSON.stringify(proofingPins));
        renderProofingUI();
        if (typeof playSound === 'function') playSound('click');

        fetch(`${WORKER_URL}/api/proofing/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: currentProofingFileKey, pinId })
        }).catch(()=>{});
    }

    function openProofingModal(pendingData) {
        currentPendingPin = pendingData;
        const modal = document.getElementById('proofingCommentModal');
        const timeBadge = document.getElementById('proofingModalTimeBadge');
        const titleEl = document.getElementById('proofingModalTitle');
        const authorInput = document.getElementById('proofingAuthorInput');
        const commentInput = document.getElementById('proofingCommentInput');

        if (!modal) return;

        // Jeśli jesteśmy w trybie pełnoekranowym, przenieś modal do kontenera pełnoekranowego
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl && modal.parentElement !== fsEl) {
            fsEl.appendChild(modal);
        }

        // Pokaż natychmiastowy świecący znacznik w miejscu kliknięcia
        const layer = document.getElementById('proofingPinsLayer') || document.getElementById('sideProofingPinsLayer');
        if (layer && pendingData.xPct !== undefined && pendingData.yPct !== undefined) {
            let tempMarker = document.getElementById('proofingTempPlacementMarker');
            if (!tempMarker) {
                tempMarker = document.createElement('div');
                tempMarker.id = 'proofingTempPlacementMarker';
                tempMarker.className = 'proofing-pin temp-marker';
                tempMarker.innerHTML = `
                    <div class="proofing-pin-pulse"></div>
                    <div class="proofing-pin-badge"><span>📍</span></div>
                    <div class="proofing-pin-pointer"></div>
                    <div class="proofing-pin-anchor-dot"></div>
                `;
                layer.appendChild(tempMarker);
            }
            tempMarker.style.left = pendingData.xPct + '%';
            tempMarker.style.top = pendingData.yPct + '%';
        }

        if (pendingData.formattedTime) {
            timeBadge.textContent = pendingData.formattedTime;
            timeBadge.style.display = 'inline-block';
            titleEl.textContent = typeof t === 'function' ? t('proofing_modal_title_video') : 'Dodaj uwagę do klatki';
        } else {
            timeBadge.textContent = '#' + (proofingPins.length + 1);
            timeBadge.style.display = 'inline-block';
            titleEl.textContent = typeof t === 'function' ? t('proofing_modal_title_image') : 'Dodaj uwagę do punktu';
        }

        const savedAuthor = localStorage.getItem('dropsite_proofing_author') || '';
        if (authorInput) authorInput.value = savedAuthor;
        if (commentInput) {
            commentInput.value = '';
            setTimeout(() => commentInput.focus(), 80);
        }

        modal.hidden = false;
        modal.classList.remove('is-hidden');
        modal.style.setProperty('display', 'flex', 'important');
    }

    function closeProofingModal() {
        const modal = document.getElementById('proofingCommentModal');
        if (modal) {
            modal.hidden = true;
            modal.classList.add('is-hidden');
            modal.style.setProperty('display', 'none', 'important');
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (modal.parentElement !== document.body) {
                    document.body.appendChild(modal);
                }
            }
        }
        const tempMarker = document.getElementById('proofingTempPlacementMarker');
        if (tempMarker) tempMarker.remove();
        currentPendingPin = null;
        if (typeof sideCurrentPendingPin !== 'undefined') sideCurrentPendingPin = null;
    }

    async function saveProofingPin() {
        if (!currentPendingPin && typeof sideCurrentPendingPin !== 'undefined' && sideCurrentPendingPin) {
            return saveSideProofingPin();
        }
        const activeKey = currentProofingFileKey || (window._activeProofingTarget && window._activeProofingTarget.fileKey) || (typeof sideCurrentFileKey !== 'undefined' ? sideCurrentFileKey : null) || (new URLSearchParams(window.location.search).get('f')) || 'default_file';
        if (!currentPendingPin || !activeKey) return;
        currentProofingFileKey = activeKey;
        const authorInput = document.getElementById('proofingAuthorInput');
        const commentInput = document.getElementById('proofingCommentInput');

        const author = (authorInput ? authorInput.value.trim() : '') || 'Klient';
        const comment = (commentInput ? commentInput.value.trim() : '');

        if (!comment) {
            if (commentInput) {
                commentInput.focus();
                commentInput.style.borderColor = '#EF4444';
                setTimeout(() => { commentInput.style.borderColor = ''; }, 1500);
            }
            return;
        }

        const tempMarker = document.getElementById('proofingTempPlacementMarker');
        if (tempMarker) tempMarker.remove();

        localStorage.setItem('dropsite_proofing_author', author);

        const newPin = {
            id: 'pin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            time: currentPendingPin.time,
            formattedTime: currentPendingPin.formattedTime,
            xPct: Math.round(currentPendingPin.xPct * 10) / 10,
            yPct: Math.round(currentPendingPin.yPct * 10) / 10,
            author: author,
            comment: comment,
            resolved: false,
            resolvedAt: null,
            createdAt: new Date().toISOString(),
            timestamp: Date.now()
        };

        proofingPins.push(newPin);
        proofingPins.sort((a, b) => {
            if (typeof a.time === 'number' && typeof b.time === 'number') {
                return a.time - b.time;
            }
            return a.timestamp - b.timestamp;
        });

        localStorage.setItem('dropsite_proofing_' + currentProofingFileKey, JSON.stringify(proofingPins));
        renderProofingUI();
        closeProofingModal();
        if (typeof playSound === 'function') playSound('copy');

        if (typeof showNotification === 'function') {
            showNotification('Uwagę dodano pomyślnie!', 'success');
        }

        fetch(`${WORKER_URL}/api/proofing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: currentProofingFileKey, pin: newPin })
        }).catch(()=>{});
    }

    function exportProofingList(cleanName) {
        if (proofingPins.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification(typeof t === 'function' ? t('proofing_no_pins') : 'Brak uwag do wyeksportowania.', 'warning');
            }
            return;
        }

        const resolvedCount = proofingPins.filter(p => p.resolved).length;
        let report = `📋 LISTA POPRAWEK I UWAG (Client Proofing)\n`;
        report += `==================================================\n`;
        report += `Plik: ${cleanName}\n`;
        report += `Data: ${new Date().toLocaleString()}\n`;
        report += `Postęp: ${resolvedCount} z ${proofingPins.length} wykonane (${Math.round((resolvedCount/proofingPins.length)*100)}%)\n`;
        report += `==================================================\n\n`;

        proofingPins.forEach((pin, idx) => {
            const timePart = pin.formattedTime ? `[${pin.formattedTime}]` : `[Punkt #${idx+1}]`;
            const statusPart = pin.resolved ? `[✓ ZROBIONE]` : `[ ] DO ZROBIENIA`;
            report += `${timePart} ${statusPart} ${pin.comment} — ${pin.author}\n`;
        });

        report += `\n--------------------------------------------------\n`;
        report += `Wygenerowano w Dropsite (https://dropsite.pages.dev)\n`;

        navigator.clipboard.writeText(report).then(() => {
            if (typeof showNotification === 'function') {
                showNotification(typeof t === 'function' ? t('proofing_copied_toast') : '📋 Lista poprawek skopiowana do schowka!', 'success');
            }
            if (typeof playSound === 'function') playSound('copy');
        }).catch(() => {
            if (typeof showNotification === 'function') {
                showNotification('Nie udało się skopiować do schowka.', 'error');
            }
        });
    }

    function downloadProofingTxt(cleanName) {
        if (proofingPins.length === 0) return;
        const resolvedCount = proofingPins.filter(p => p.resolved).length;
        let report = `LISTA POPRAWEK I UWAG (Client Proofing)\n`;
        report += `==================================================\n`;
        report += `Plik: ${cleanName}\n`;
        report += `Data: ${new Date().toLocaleString()}\n`;
        report += `Status: ${resolvedCount}/${proofingPins.length} ukonczone\n`;
        report += `==================================================\n\n`;

        proofingPins.forEach((pin, idx) => {
            const timePart = pin.formattedTime ? `[${pin.formattedTime}]` : `[Punkt #${idx+1}]`;
            const statusPart = pin.resolved ? `[OK]` : `[TODO]`;
            report += `${timePart} ${statusPart} ${pin.comment} (${pin.author})\n`;
        });

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poprawki_${cleanName.replace(/\.[^/.]+$/, "")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function initProofingModalListeners() {
        if (proofingModalInitialized) return;
        proofingModalInitialized = true;

        const modal = document.getElementById('proofingCommentModal');
        const closeBtn = document.getElementById('proofingModalCloseBtn');
        const cancelBtn = document.getElementById('proofingModalCancelBtn');
        const saveBtn = document.getElementById('proofingModalSaveBtn');
        const commentInput = document.getElementById('proofingCommentInput');

        if (closeBtn) closeBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } closeProofingModal(); };
        if (cancelBtn) cancelBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } closeProofingModal(); };
        if (saveBtn) saveBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } saveProofingPin(); };

        if (commentInput) {
            commentInput.onkeydown = (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveProofingPin();
                }
            };
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'proofingModalBackdrop') {
                    closeProofingModal();
                }
            });
        }
    }

    function initClientProofingController({ cleanName, directUrl, fileKey, isVideo, isImage }) {
        initProofingModalListeners();
        loadProofingPins(fileKey);

        const overlay = document.getElementById('proofingOverlay');
        const toggleBtn = document.getElementById('btnProofingToggle');
        const addHereBtn = document.getElementById('btnProofingAddHere');
        const exportBtn = document.getElementById('btnProofingExport');
        const toggleDrawerBtn = document.getElementById('btnProofingToggleDrawer');
        const downloadTxtBtn = document.getElementById('btnProofingDownloadTxt');
        const drawer = document.getElementById('proofingDrawer');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                proofingActive = !proofingActive;
                toggleBtn.classList.toggle('active', proofingActive);
                if (overlay) {
                    overlay.classList.toggle('disabled', !proofingActive);
                }
                renderProofingPinsOnMedia();
                if (typeof playSound === 'function') playSound('click');
            };
        }

        if (addHereBtn) {
            addHereBtn.onclick = () => {
                if (isVideo) {
                    const video = document.getElementById('proofingVideoEl');
                    if (video) {
                        video.pause();
                        const curTime = video.currentTime;
                        openProofingModal({
                            time: curTime,
                            formattedTime: formatProofingTime(curTime),
                            xPct: 50,
                            yPct: 35
                        });
                    }
                } else {
                    openProofingModal({
                        time: null,
                        formattedTime: null,
                        xPct: 50,
                        yPct: 35
                    });
                }
            };
        }

        if (exportBtn) {
            exportBtn.onclick = () => exportProofingList(cleanName);
        }

        if (downloadTxtBtn) {
            downloadTxtBtn.onclick = () => downloadProofingTxt(cleanName);
        }

        if (toggleDrawerBtn && drawer) {
            toggleDrawerBtn.onclick = () => {
                drawer.classList.toggle('open');
            };
        }

        if (overlay && isImage) {
            overlay.onclick = (e) => {
                if (e.target.closest('.proofing-pin')) return;
                if (window.openDownloadImageLightbox) {
                    window.openDownloadImageLightbox(directUrl, cleanName);
                }
            };
        }

        if (isVideo) {
            const video = document.getElementById('proofingVideoEl');
            const playBtn = document.getElementById('btnProofingVideoPlay');
            const centerPlayBtn = document.getElementById('btnProofingCenterPlay');
            const playIcon = document.getElementById('proofingPlayIcon');
            const pauseIcon = document.getElementById('proofingPauseIcon');
            const track = document.getElementById('proofingTimelineTrack');
            const progress = document.getElementById('proofingTimelineProgress');
            const timeDisplay = document.getElementById('proofingTimeDisplay');
            const muteBtn = document.getElementById('btnProofingMute');
            const volIcon = document.getElementById('proofingVolumeIcon');
            const mutedIcon = document.getElementById('proofingMutedIcon');
            const fsBtn = document.getElementById('btnProofingFullscreen');

            if (video) {
                video.addEventListener('error', () => {
                    console.warn('Video format playback error.');
                    const stage = document.getElementById('proofingVideoStage');
                    if (stage) {
                        stage.innerHTML = `
                            <div class="proofing-video-error-fallback" style="padding: 30px 15px;">
                                <div class="video-error-icon">🎬</div>
                                <div class="video-error-title">Format wideo wymaga pobrania na dysk</div>
                                <div class="video-error-desc">Twoja przeglądarka nie posiada dekodera dla tego kodeka (np. MKV, ProRes lub Apple HEVC). Plik jest w 100% nienaruszony i możesz go pobrać poniżej.</div>
                                <a href="${directUrl}" download="${cleanName}" class="btn-primary btn-error-fallback" style="margin-top: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                                    Pobierz oryginalne wideo
                                </a>
                            </div>
                        `;
                    }
                });

                const updatePlayState = () => {
                    if (video.paused) {
                        if (playIcon) playIcon.style.display = 'block';
                        if (pauseIcon) pauseIcon.style.display = 'none';
                        if (centerPlayBtn) centerPlayBtn.classList.remove('hidden');
                    } else {
                        if (playIcon) playIcon.style.display = 'none';
                        if (pauseIcon) pauseIcon.style.display = 'block';
                        if (centerPlayBtn) centerPlayBtn.classList.add('hidden');
                    }
                };

                const togglePlay = () => {
                    if (video.paused) {
                        video.play().catch(err => console.warn('Playback error:', err));
                    } else {
                        video.pause();
                    }
                    updatePlayState();
                };

                if (playBtn) playBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
                if (centerPlayBtn) centerPlayBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };

                if (muteBtn) {
                    muteBtn.onclick = (e) => {
                        e.stopPropagation();
                        video.muted = !video.muted;
                        if (volIcon) volIcon.style.display = video.muted ? 'none' : 'block';
                        if (mutedIcon) mutedIcon.style.display = video.muted ? 'block' : 'none';
                    };
                }

                const updateFsBtnState = () => {
                    if (!fsBtn) return;
                    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
                    fsBtn.title = isFs ? 'Opuść pełny ekran (Esc / F)' : 'Pełny ekran (F)';
                    fsBtn.innerHTML = isFs ? `
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 14h6v6m10-10h-6V4m0 6 7-7M3 21l7-7"></path>
                        </svg>
                    ` : `
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                        </svg>
                    `;
                };

                const toggleFullscreen = () => {
                    const container = document.getElementById('proofingMediaContainer');
                    if (!container) return;

                    if (document.fullscreenElement || document.webkitFullscreenElement) {
                        if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
                        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(()=>{});
                    } else {
                        if (container.requestFullscreen) container.requestFullscreen().catch(()=>{});
                        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen().catch(()=>{});
                    }
                };

                if (fsBtn) {
                    fsBtn.onclick = (e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                    };
                }

                if (overlay) {
                    let lastClickTime = 0;
                    overlay.onclick = (e) => {
                        if (e.target.closest('.proofing-pin') || e.target.closest('#btnProofingCenterPlay')) return;
                        const now = Date.now();
                        if (now - lastClickTime < 300) {
                            lastClickTime = 0;
                            toggleFullscreen();
                            return;
                        }
                        lastClickTime = now;
                        togglePlay();
                    };
                }

                const pipBtn = document.getElementById('btnProofingPiP');
                const togglePiP = async () => {
                    if (!video) return;
                    try {
                        if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                        } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
                            await video.requestPictureInPicture();
                        } else if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function') {
                            const currentMode = video.webkitPresentationMode;
                            video.webkitSetPresentationMode(currentMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
                        }
                    } catch (err) {
                        console.warn('PiP error:', err);
                    }
                };

                if (pipBtn) {
                    const isPiPSupported = ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) || 
                                           (video && video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function');
                    if (isPiPSupported) {
                        pipBtn.onclick = (e) => {
                            e.stopPropagation();
                            togglePiP();
                        };
                        const updatePipState = () => {
                            const isPip = document.pictureInPictureElement === video;
                            pipBtn.classList.toggle('active', isPip);
                            pipBtn.title = isPip ? 'Opuść obraz w obrazie (I)' : 'Obraz w obrazie (I / PiP)';
                        };
                        video.addEventListener('enterpictureinpicture', updatePipState);
                        video.addEventListener('leavepictureinpicture', updatePipState);
                    } else {
                        pipBtn.style.display = 'none';
                    }
                }

                const directStreamBtn = document.getElementById('btnProofingDirectStream');
                if (directStreamBtn) {
                    directStreamBtn.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(directUrl).then(() => {
                                if (typeof showNotification === 'function') {
                                    showNotification('🎬 Skopiowano bezpośredni link Direct Stream do schowka!', 'success');
                                }
                            }).catch(() => {
                                prompt('Direct Stream URL:', directUrl);
                            });
                        }
                    });
                }

                const openStreamLink = document.getElementById('btnProofingOpenStream');
                if (openStreamLink && directUrl) {
                    openStreamLink.href = directUrl;
                    openStreamLink.style.display = 'inline-flex';
                }

                const timelineAddBtn = document.getElementById('btnProofingTimelineAdd');
                if (timelineAddBtn) {
                    timelineAddBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (video) {
                            video.pause();
                            const curTime = video.currentTime;
                            openProofingModal({
                                time: curTime,
                                formattedTime: formatProofingTime(curTime),
                                xPct: 50,
                                yPct: 35
                            });
                        }
                    };
                }

                video.addEventListener('play', updatePlayState);
                video.addEventListener('pause', updatePlayState);
                video.addEventListener('ended', updatePlayState);

                video.addEventListener('error', (e) => {
                    console.warn('Proofing video playback error:', video.error);
                    const frameBox = document.getElementById('proofingVideoFrameBox');
                    if (frameBox) {
                        frameBox.innerHTML = `
                            <div class="proofing-video-error-fallback">
                                <div class="video-error-icon">🎬</div>
                                <div class="video-error-title">Podgląd wideo niedostępny w oknie przeglądarki</div>
                                <div class="video-error-desc">Kodek tego materiału może nie być natywnie wspierany przez wbudowany silnik przeglądarki lub wystąpił błąd odtwarzacza.</div>
                                <a href="${directUrl}" download="${cleanName}" class="btn-primary btn-error-fallback" style="margin-top: 14px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>Pobierz plik wideo</span>
                                </a>
                            </div>
                        `;
                    }
                });

                const syncStageAspect = () => {
                    const stage = document.getElementById('proofingVideoStage');
                    const frameBox = document.getElementById('proofingVideoFrameBox');
                    const videoEl = document.getElementById('proofingVideoEl');
                    if (!videoEl || !stage || !frameBox) return;
                    const vw = videoEl.videoWidth;
                    const vh = videoEl.videoHeight;
                    if (!vw || !vh) return;

                    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.getElementById('proofingMediaContainer')?.classList.contains('is-fullscreen'));
                    const container = document.getElementById('proofingMediaContainer');
                    const boxRect = frameBox.getBoundingClientRect();
                    const boxW = boxRect.width || frameBox.clientWidth || (container ? container.clientWidth : 540);
                    const vAspect = vw / vh;

                    if (isFs) {
                        const boxH = frameBox.clientHeight || (window.innerHeight - 68);
                        const bAspect = boxW / boxH;
                        let renderW, renderH;
                        if (bAspect > vAspect) {
                            renderH = boxH;
                            renderW = boxH * vAspect;
                        } else {
                            renderW = boxW;
                            renderH = boxW / vAspect;
                        }
                        stage.style.setProperty('width', Math.round(renderW) + 'px', 'important');
                        stage.style.setProperty('height', Math.round(renderH) + 'px', 'important');
                    } else {
                        // Karta pobierania w trybie standardowym
                        const maxH = Math.min(600, Math.round(window.innerHeight * 0.72));
                        const naturalH = boxW / vAspect;
                        let renderW, renderH;
                        if (naturalH <= maxH) {
                            renderW = boxW;
                            renderH = naturalH;
                        } else {
                            renderH = maxH;
                            renderW = maxH * vAspect;
                        }
                        frameBox.style.height = Math.round(renderH) + 'px';
                        stage.style.setProperty('width', Math.round(renderW) + 'px', 'important');
                        stage.style.setProperty('height', Math.round(renderH) + 'px', 'important');
                    }
                };

                const onVideoReady = () => {
                    if (timeDisplay && video.duration) {
                        timeDisplay.textContent = `${formatProofingTime(video.currentTime)} / ${formatProofingTime(video.duration)}`;
                    }
                    syncStageAspect();
                    renderProofingTimelineMarkers();
                    renderProofingPinsOnMedia();
                };

                video.addEventListener('loadedmetadata', onVideoReady);
                video.addEventListener('loadeddata', onVideoReady);
                video.addEventListener('canplay', onVideoReady);
                if (video.readyState >= 1) {
                    onVideoReady();
                }

                window.addEventListener('resize', syncStageAspect);

                const onFsChange = () => {
                    const container = document.getElementById('proofingMediaContainer');
                    const modal = document.getElementById('proofingCommentModal');
                    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
                    if (container) container.classList.toggle('is-fullscreen', isFs);
                    if (!isFs && modal && modal.parentElement !== document.body) {
                        document.body.appendChild(modal);
                    }
                    updateFsBtnState();
                    syncStageAspect();
                    setTimeout(syncStageAspect, 60);
                    setTimeout(syncStageAspect, 180);
                    setTimeout(syncStageAspect, 350);
                };

                document.addEventListener('fullscreenchange', onFsChange);
                document.addEventListener('webkitfullscreenchange', onFsChange);

                const onProofingKeyDown = (e) => {
                    const modal = document.getElementById('proofingCommentModal');
                    const isModalOpen = modal && !modal.hidden && !modal.classList.contains('is-hidden') && modal.style.display !== 'none';

                    if (e.key === 'Escape') {
                        if (isModalOpen) {
                            e.preventDefault();
                            e.stopPropagation();
                            closeProofingModal();
                            return;
                        }
                    }

                    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;
                    if (isModalOpen) return;

                    if (e.key === ' ' || e.code === 'Space') {
                        e.preventDefault();
                        togglePlay();
                    } else if (e.key === 'f' || e.key === 'F') {
                        e.preventDefault();
                        toggleFullscreen();
                    } else if (e.key === 'm' || e.key === 'M') {
                        e.preventDefault();
                        if (muteBtn) muteBtn.click();
                    } else if (e.key === 'i' || e.key === 'I') {
                        e.preventDefault();
                        if (typeof togglePiP === 'function') togglePiP();
                    } else if (e.key === 'c' || e.key === 'C' || e.key === 'p' || e.key === 'P') {
                        // Klawisz C lub P: natychmiastowe zaznaczenie momentu
                        e.preventDefault();
                        if (video) {
                            video.pause();
                            const curTime = video.currentTime;
                            openProofingModal({
                                time: curTime,
                                formattedTime: formatProofingTime(curTime),
                                xPct: 50,
                                yPct: 35
                            });
                        }
                    }
                };
                window.addEventListener('keydown', onProofingKeyDown);

                video.addEventListener('timeupdate', () => {
                    if (video.duration) {
                        const pct = (video.currentTime / video.duration) * 100;
                        if (progress) progress.style.width = pct + '%';
                        if (timeDisplay) {
                            timeDisplay.textContent = `${formatProofingTime(video.currentTime)} / ${formatProofingTime(video.duration)}`;
                        }
                    }
                });

                if (track) {
                    let isProofingScrubbing = false;
                    const seekProofingByEvent = (e) => {
                        if (!video || !video.duration || isNaN(video.duration)) return;
                        const rect = track.getBoundingClientRect();
                        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
                        const clickPct = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
                        video.currentTime = clickPct * video.duration;
                        if (progress) progress.style.width = (clickPct * 100) + '%';
                        if (timeDisplay) {
                            timeDisplay.textContent = `${formatProofingTime(video.currentTime)} / ${formatProofingTime(video.duration)}`;
                        }
                    };

                    track.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });

                    track.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        isProofingScrubbing = true;
                        track.classList.add('is-dragging');
                        seekProofingByEvent(e);
                    });

                    window.addEventListener('mousemove', (e) => {
                        if (isProofingScrubbing) {
                            seekProofingByEvent(e);
                        }
                    });

                    window.addEventListener('mouseup', () => {
                        if (isProofingScrubbing) {
                            isProofingScrubbing = false;
                            track.classList.remove('is-dragging');
                        }
                    });

                    track.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                        isProofingScrubbing = true;
                        track.classList.add('is-dragging');
                        seekProofingByEvent(e);
                    }, { passive: true });

                    window.addEventListener('touchmove', (e) => {
                        if (isProofingScrubbing) {
                            seekProofingByEvent(e);
                        }
                    }, { passive: true });

                    window.addEventListener('touchend', () => {
                        if (isProofingScrubbing) {
                            isProofingScrubbing = false;
                            track.classList.remove('is-dragging');
                        }
                    });

                    // Hover indicator
                    const hoverIndicator = document.getElementById('proofingTimelineHoverIndicator');
                    const hoverTime = document.getElementById('proofingTimelineHoverTime');
                    if (hoverIndicator && hoverTime) {
                        track.addEventListener('mousemove', (e) => {
                            if (!video.duration || isNaN(video.duration) || isProofingScrubbing) return;
                            const rect = track.getBoundingClientRect();
                            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
                            hoverIndicator.style.display = 'block';
                            hoverIndicator.style.left = (pct * 100) + '%';
                            hoverTime.textContent = formatProofingTime(pct * video.duration);
                        });
                        track.addEventListener('mouseleave', () => {
                            if (!isProofingScrubbing) {
                                hoverIndicator.style.display = 'none';
                            }
                        });
                    }
                }
            }
        }
    }


// =========================================================================
// BOCZNY PANEL I KAPSUŁKA PINEZEK (FRAME.IO CLIENT PROOFING)
// =========================================================================
let sideProofingPins = [];
let sideProofingActive = false;
let sideCurrentFileKey = null;
let sideCurrentPendingPin = null;
let sideProofingListenersInitialized = false;

function formatSideTime(secs) {
    if (isNaN(secs) || secs === null || secs === undefined || secs === Infinity) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

async function loadSideProofingPins(fileKey) {
    if (!fileKey) return;
    sideCurrentFileKey = fileKey;
    sideProofingPins = [];

    // 1. Local-first: natychmiastowy odczyt z localStorage
    try {
        const local = localStorage.getItem('dropsite_proofing_' + fileKey);
        if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) sideProofingPins = parsed;
        }
    } catch(e){}

    renderSideProofingUI();

    // 2. Pobranie z chmury w tle (Cloudflare R2)
    try {
        const res = await fetch(`${WORKER_URL}/api/proofing?key=${encodeURIComponent(fileKey)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.pins)) {
                const map = new Map();
                data.pins.forEach(p => map.set(p.id, p));
                sideProofingPins.forEach(p => {
                    if (!map.has(p.id)) map.set(p.id, p);
                });
                sideProofingPins = Array.from(map.values());
                sideProofingPins.sort((a, b) => {
                    if (typeof a.time === 'number' && typeof b.time === 'number') {
                        return a.time - b.time;
                    }
                    return a.timestamp - b.timestamp;
                });
                localStorage.setItem('dropsite_proofing_' + fileKey, JSON.stringify(sideProofingPins));
                renderSideProofingUI();
            }
        }
    } catch(e){}
}

function renderSideProofingUI() {
    renderSideProofingPinsOnMedia();
    renderSideProofingTimelineMarkers();
    renderSideProofingTasksList();
    updateSideProofingBadges();
}

function updateSideProofingBadges() {
    const total = sideProofingPins.length;
    const resolved = sideProofingPins.filter(p => p.resolved).length;
    const countText = `${total} ${total === 1 ? 'uwaga' : (total >= 2 && total <= 4 ? 'uwagi' : 'uwag')}`;

    const capsuleBadge = document.getElementById('successProofingPinCountBadge');
    if (capsuleBadge) capsuleBadge.textContent = countText;

    const dockedBadge = document.getElementById('sideCapsuleBadge');
    if (dockedBadge) dockedBadge.textContent = total;

    const drawerBadge = document.getElementById('sideProofingPinCountBadge');
    if (drawerBadge) drawerBadge.textContent = countText;

    const progressEl = document.getElementById('sideProofingProgressCount');
    if (progressEl) progressEl.textContent = `${resolved}/${total} wykonane`;
}

function renderSideProofingPinsOnMedia() {
    const layer = document.getElementById('sideProofingPinsLayer');
    if (!layer) return;
    layer.innerHTML = '';

    // Jeśli to wideo - nie renderujemy wiszących w powietrzu pinesek na kadrze
    const sideVideo = document.getElementById('sideProofingVideo');
    if (sideVideo && sideVideo.style.display !== 'none') return;

    if (!sideProofingActive) return;

    sideProofingPins.forEach((pin, idx) => {
        const pinEl = document.createElement('div');
        pinEl.className = `proofing-pin ${pin.resolved ? 'resolved' : ''}`;
        pinEl.style.left = `${pin.xPct}%`;
        pinEl.style.top = `${pin.yPct}%`;
        pinEl.setAttribute('data-pin-id', pin.id);

        const pinNum = idx + 1;
        const timeLabel = pin.formattedTime ? pin.formattedTime : '#' + pinNum;

        pinEl.innerHTML = `
            <div class="proofing-pin-pulse"></div>
            <div class="proofing-pin-badge">
                <span>${timeLabel}</span>
            </div>
            <div class="proofing-pin-pointer"></div>
            <div class="proofing-pin-anchor-dot"></div>
            <div class="proofing-pin-tooltip">
                <div class="proofing-pin-tooltip-header">
                    ${pin.formattedTime ? `<span class="proofing-pin-tooltip-time">${pin.formattedTime}</span>` : ''}
                    <span class="proofing-pin-tooltip-author">${escapeHtml(pin.author)}</span>
                </div>
                <div class="proofing-pin-tooltip-text">${escapeHtml(pin.comment)}</div>
                <div class="proofing-pin-tooltip-hint">⠿ Przeciągnij, aby przesunąć</div>
            </div>
        `;

        let startX = 0, startY = 0;
        let isDragging = false;
        let hasDragged = false;

        const onPointerDown = (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.stopPropagation();
            startX = e.clientX;
            startY = e.clientY;
            hasDragged = false;
            isDragging = false;

            const overlay = document.getElementById('sideProofingOverlay');
            if (!overlay) return;

            const onPointerMove = (moveEvt) => {
                const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
                if (dist > 4) {
                    isDragging = true;
                    hasDragged = true;
                    pinEl.classList.add('is-dragging');
                }
                if (!isDragging) return;

                const rect = overlay.getBoundingClientRect();
                const curX = Math.max(1, Math.min(99, ((moveEvt.clientX - rect.left) / rect.width) * 100));
                const curY = Math.max(1, Math.min(99, ((moveEvt.clientY - rect.top) / rect.height) * 100));

                pinEl.style.left = curX + '%';
                pinEl.style.top = curY + '%';
                pin.xPct = Math.round(curX * 10) / 10;
                pin.yPct = Math.round(curY * 10) / 10;
            };

            const onPointerUp = () => {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);

                if (isDragging) {
                    pinEl.classList.remove('is-dragging');
                    localStorage.setItem('dropsite_proofing_' + sideCurrentFileKey, JSON.stringify(sideProofingPins));
                    fetch(`${WORKER_URL}/api/proofing`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: sideCurrentFileKey, pin: pin })
                    }).catch(()=>{});
                    if (typeof playSound === 'function') playSound('click');
                }
            };

            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        };

        pinEl.addEventListener('pointerdown', onPointerDown);

        pinEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hasDragged) return;
            seekToSidePin(pin);
        });

        layer.appendChild(pinEl);
    });
}

function renderSideProofingTimelineMarkers() {
    const markersLayer = document.getElementById('sideProofingTimelineMarkersLayer');
    const video = document.getElementById('sideProofingVideo');
    if (!markersLayer || !video) return;
    markersLayer.innerHTML = '';

    const duration = video.duration;
    if (!duration || isNaN(duration) || duration <= 0) return;

    sideProofingPins.forEach((pin) => {
        if (typeof pin.time !== 'number') return;
        const pct = Math.max(0, Math.min(100, (pin.time / duration) * 100));

        const marker = document.createElement('div');
        marker.className = `proofing-timeline-marker ${pin.resolved ? 'resolved' : ''}`;
        marker.style.left = `${pct}%`;
        marker.title = `[${pin.formattedTime}] ${pin.author}: ${pin.comment}`;

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showTimelineMarkerPopover(pin, marker, document.getElementById('sideProofingTimelineTrack'));
        });

        markersLayer.appendChild(marker);
    });
}

function renderSideProofingTasksList() {
    const listEl = document.getElementById('sideProofingTasksList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (sideProofingPins.length === 0) {
        listEl.innerHTML = `
            <div class="side-empty-placeholder">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="10" r="3"></circle>
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                </svg>
                <p>Brak uwag. Kliknij w dowolne miejsce na wideo lub kliknij "Dodaj uwagę w tej klatce", aby postawić pierwszą pinezkę.</p>
            </div>
        `;
        return;
    }

    sideProofingPins.forEach((pin, idx) => {
        const item = document.createElement('div');
        item.className = `proofing-task-item ${pin.resolved ? 'is-resolved' : ''}`;
        item.setAttribute('data-pin-id', pin.id);

        item.innerHTML = `
            <div class="proofing-task-left">
                <button type="button" class="proofing-checkbox-btn" title="${pin.resolved ? 'Oznacz jako do zrobienia' : 'Oznacz jako zrobione'}" aria-label="Status zadania">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                ${pin.formattedTime ? `<span class="proofing-time-pill" title="Przewiń wideo do tej sekundy">${pin.formattedTime}</span>` : `<span class="proofing-time-pill" title="Punkt na grafice">#${idx + 1}</span>`}
                <div class="proofing-task-content">
                    <span class="proofing-task-author-tag">${escapeHtml(pin.author)}</span>
                    <span class="proofing-task-text">${escapeHtml(pin.comment)}</span>
                </div>
            </div>
            <div class="proofing-task-right">
                <button type="button" class="btn-task-del" title="Usuń uwagę" aria-label="Usuń uwagę">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        const checkBtn = item.querySelector('.proofing-checkbox-btn');
        if (checkBtn) {
            checkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSidePinResolved(pin.id);
            });
        }

        const timePill = item.querySelector('.proofing-time-pill');
        if (timePill) {
            timePill.addEventListener('click', (e) => {
                e.stopPropagation();
                seekToSidePin(pin);
            });
        }

        const delBtn = item.querySelector('.btn-task-del');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSidePin(pin.id);
            });
        }

        listEl.appendChild(item);
    });
}

function seekToSidePin(pin) {
    const video = document.getElementById('sideProofingVideo');
    if (video && typeof pin.time === 'number') {
        video.currentTime = pin.time;
        video.pause();
        const playIcon = document.getElementById('sidePlayIcon');
        const pauseIcon = document.getElementById('sidePauseIcon');
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
    }

    const pinEl = document.querySelector(`.side-proofing-pins-layer .proofing-pin[data-pin-id="${pin.id}"]`);
    if (pinEl) {
        pinEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pinEl.style.transform = 'translate(-50%, -125%) scale(1.35)';
        pinEl.style.zIndex = '100';
        setTimeout(() => {
            pinEl.style.transform = '';
            pinEl.style.zIndex = '';
        }, 800);
    }
}

async function toggleSidePinResolved(pinId) {
    const pin = sideProofingPins.find(p => p.id === pinId);
    if (!pin) return;
    pin.resolved = !pin.resolved;
    pin.resolvedAt = pin.resolved ? new Date().toISOString() : null;

    localStorage.setItem('dropsite_proofing_' + sideCurrentFileKey, JSON.stringify(sideProofingPins));
    renderSideProofingUI();
    if (typeof playSound === 'function') playSound('click');

    fetch(`${WORKER_URL}/api/proofing/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: sideCurrentFileKey, pinId })
    }).catch(()=>{});
}

async function deleteSidePin(pinId) {
    sideProofingPins = sideProofingPins.filter(p => p.id !== pinId);
    localStorage.setItem('dropsite_proofing_' + sideCurrentFileKey, JSON.stringify(sideProofingPins));
    renderSideProofingUI();
    if (typeof playSound === 'function') playSound('click');

    fetch(`${WORKER_URL}/api/proofing/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: sideCurrentFileKey, pinId })
    }).catch(()=>{});
}

function openSideProofingModal(pendingData) {
    sideCurrentPendingPin = pendingData;
    const modal = document.getElementById('proofingCommentModal');
    const timeBadge = document.getElementById('proofingModalTimeBadge');
    const titleEl = document.getElementById('proofingModalTitle');
    const authorInput = document.getElementById('proofingAuthorInput');
    const commentInput = document.getElementById('proofingCommentInput');

    if (!modal) return;

    if (pendingData.formattedTime) {
        if (timeBadge) {
            timeBadge.textContent = pendingData.formattedTime;
            timeBadge.style.display = 'inline-block';
        }
        if (titleEl) titleEl.textContent = 'Dodaj uwagę do klatki';
    } else {
        if (timeBadge) {
            timeBadge.textContent = '#' + (sideProofingPins.length + 1);
            timeBadge.style.display = 'inline-block';
        }
        if (titleEl) titleEl.textContent = 'Dodaj uwagę do punktu';
    }

    const savedAuthor = localStorage.getItem('dropsite_proofing_author') || '';
    if (authorInput) authorInput.value = savedAuthor;
    if (commentInput) {
        commentInput.value = '';
        setTimeout(() => commentInput.focus(), 120);
    }

    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl && modal.parentElement !== fsEl) {
        fsEl.appendChild(modal);
    }

    modal.hidden = false;
    modal.classList.remove('is-hidden');
    modal.style.setProperty('display', 'flex', 'important');
}

function closeSideProofingModal() {
    const modal = document.getElementById('proofingCommentModal');
    if (modal) {
        modal.hidden = true;
        modal.classList.add('is-hidden');
        modal.style.setProperty('display', 'none', 'important');
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
        }
    }
    sideCurrentPendingPin = null;
    if (typeof currentPendingPin !== 'undefined') currentPendingPin = null;
    const tempMarker = document.getElementById('proofingTempPlacementMarker');
    if (tempMarker) tempMarker.remove();
}

async function saveSideProofingPin() {
    if (!sideCurrentPendingPin && typeof currentPendingPin !== 'undefined' && currentPendingPin) {
        return saveProofingPin();
    }
    const activeKey = sideCurrentFileKey || (window._activeProofingTarget && window._activeProofingTarget.fileKey) || (typeof currentProofingFileKey !== 'undefined' ? currentProofingFileKey : null) || (new URLSearchParams(window.location.search).get('f')) || 'default_file';
    if (!sideCurrentPendingPin || !activeKey) return;
    sideCurrentFileKey = activeKey;
    const authorInput = document.getElementById('proofingAuthorInput');
    const commentInput = document.getElementById('proofingCommentInput');

    const author = (authorInput ? authorInput.value.trim() : '') || 'Klient';
    const comment = (commentInput ? commentInput.value.trim() : '');

    if (!comment) {
        if (commentInput) {
            commentInput.focus();
            commentInput.style.borderColor = '#EF4444';
            setTimeout(() => { commentInput.style.borderColor = ''; }, 1500);
        }
        return;
    }

    localStorage.setItem('dropsite_proofing_author', author);

    const newPin = {
        id: 'pin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        time: sideCurrentPendingPin.time,
        formattedTime: sideCurrentPendingPin.formattedTime,
        xPct: Math.round(sideCurrentPendingPin.xPct * 10) / 10,
        yPct: Math.round(sideCurrentPendingPin.yPct * 10) / 10,
        author: author,
        comment: comment,
        resolved: false,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
    };

    sideProofingPins.push(newPin);
    sideProofingPins.sort((a, b) => {
        if (typeof a.time === 'number' && typeof b.time === 'number') {
            return a.time - b.time;
        }
        return a.timestamp - b.timestamp;
    });

    localStorage.setItem('dropsite_proofing_' + sideCurrentFileKey, JSON.stringify(sideProofingPins));
    renderSideProofingUI();
    closeSideProofingModal();
    if (typeof playSound === 'function') playSound('copy');

    if (typeof showNotification === 'function') {
        showNotification('Uwagę dodano pomyślnie!', 'success');
    }

    fetch(`${WORKER_URL}/api/proofing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: sideCurrentFileKey, pin: newPin })
    }).catch(()=>{});
}

function exportSideProofingList() {
    const cleanName = document.getElementById('sideDrawerFileName')?.textContent || sideCurrentFileKey || 'plik';
    if (sideProofingPins.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('Brak uwag do skopiowania.', 'warning');
        }
        return;
    }

    const resolvedCount = sideProofingPins.filter(p => p.resolved).length;
    let report = `📋 LISTA POPRAWEK I UWAG (Client Proofing)\n`;
    report += `==================================================\n`;
    report += `Plik: ${cleanName}\n`;
    report += `Data: ${new Date().toLocaleString()}\n`;
    report += `Postęp: ${resolvedCount} z ${sideProofingPins.length} wykonane (${Math.round((resolvedCount/sideProofingPins.length)*100)}%)\n`;
    report += `==================================================\n\n`;

    sideProofingPins.forEach((pin, idx) => {
        const timePart = pin.formattedTime ? `[${pin.formattedTime}]` : `[Punkt #${idx+1}]`;
        const statusPart = pin.resolved ? `[✓ ZROBIONE]` : `[ ] DO ZROBIENIA`;
        report += `${timePart} ${statusPart} ${pin.comment} — ${pin.author}\n`;
    });

    report += `\n--------------------------------------------------\n`;
    report += `Wygenerowano w Dropsite (https://dropsite.pages.dev)\n`;

    navigator.clipboard.writeText(report).then(() => {
        if (typeof showNotification === 'function') {
            showNotification('📋 Lista poprawek skopiowana do schowka!', 'success');
        }
        if (typeof playSound === 'function') playSound('copy');
    }).catch(() => {
        prompt('Skopiuj listę uwag:', report);
    });
}

function downloadSideProofingTxt() {
    const cleanName = document.getElementById('sideDrawerFileName')?.textContent || sideCurrentFileKey || 'plik';
    if (sideProofingPins.length === 0) return;
    const resolvedCount = sideProofingPins.filter(p => p.resolved).length;
    let report = `LISTA POPRAWEK I UWAG (Client Proofing)\n`;
    report += `==================================================\n`;
    report += `Plik: ${cleanName}\n`;
    report += `Data: ${new Date().toLocaleString()}\n`;
    report += `Status: ${resolvedCount}/${sideProofingPins.length} ukonczone\n`;
    report += `==================================================\n\n`;

    sideProofingPins.forEach((pin, idx) => {
        const timePart = pin.formattedTime ? `[${pin.formattedTime}]` : `[Punkt #${idx+1}]`;
        const statusPart = pin.resolved ? `[OK]` : `[TODO]`;
        report += `${timePart} ${statusPart} ${pin.comment} (${pin.author})\n`;
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poprawki_${cleanName.replace(/\.[^/.]+$/, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function openSideProofingDrawer(targetInfo) {
    if (!targetInfo) return;
    const drawer = document.getElementById('sideProofingDrawer');
    const backdrop = document.getElementById('sideProofingDrawerBackdrop');
    const fileNameEl = document.getElementById('sideDrawerFileName');
    const video = document.getElementById('sideProofingVideo');
    const img = document.getElementById('sideProofingImage');
    const timelineContainer = document.getElementById('sideTimelineContainer');

    if (!drawer) return;

    if (fileNameEl) fileNameEl.textContent = targetInfo.cleanName || targetInfo.fileKey;

    const isVideo = targetInfo.isVideo !== undefined ? targetInfo.isVideo : /\.(mp4|webm|mov|mkv|avi)$/i.test(targetInfo.cleanName || targetInfo.fileKey);
    const isImage = targetInfo.isImage !== undefined ? targetInfo.isImage : /\.(jpg|jpeg|png|gif|webp)$/i.test(targetInfo.cleanName || targetInfo.fileKey);

    let mediaSrc = targetInfo.directUrl;
    if (!mediaSrc && targetInfo.fileBlob) {
        mediaSrc = URL.createObjectURL(targetInfo.fileBlob);
    }
    if (!mediaSrc && targetInfo.fileKey) {
        mediaSrc = `${WORKER_URL}/f/${encodeURIComponent(targetInfo.fileKey)}`;
    }

    if (isVideo && video) {
        if (img) img.style.display = 'none';
        video.style.display = 'block';
        const sideCenterPlay = document.getElementById('btnSideCenterPlay');
        if (sideCenterPlay) {
            sideCenterPlay.style.display = 'flex';
            sideCenterPlay.classList.remove('hidden');
        }
        if (video.src !== mediaSrc) {
            video.src = mediaSrc;
            video.load();
        }
        if (timelineContainer) timelineContainer.style.display = 'block';
        const sideDirectStream = document.getElementById('btnSideDirectStream');
        if (sideDirectStream) {
            if (mediaSrc) {
                sideDirectStream.href = mediaSrc;
                sideDirectStream.style.display = 'inline-flex';
            } else {
                sideDirectStream.style.display = 'none';
            }
        }
    } else if (isImage && img) {
        if (video) video.style.display = 'none';
        img.style.display = 'block';
        img.src = mediaSrc;
        if (timelineContainer) timelineContainer.style.display = 'none';
    }

    drawer.classList.add('open');
    if (backdrop) {
        backdrop.style.display = 'block';
        setTimeout(() => backdrop.classList.add('open'), 10);
    }

    loadSideProofingPins(targetInfo.fileKey);
    if (typeof playSound === 'function') playSound('click');
}

function closeSideProofingDrawer() {
    const drawer = document.getElementById('sideProofingDrawer');
    const backdrop = document.getElementById('sideProofingDrawerBackdrop');
    const video = document.getElementById('sideProofingVideo');

    if (drawer) drawer.classList.remove('open');
    if (backdrop) {
        backdrop.classList.remove('open');
        setTimeout(() => { backdrop.style.display = 'none'; }, 320);
    }
    if (video) video.pause();
}

function toggleSideProofingDrawer() {
    const drawer = document.getElementById('sideProofingDrawer');
    if (drawer && drawer.classList.contains('open')) {
        closeSideProofingDrawer();
    } else if (window._activeProofingTarget) {
        openSideProofingDrawer(window._activeProofingTarget);
    }
}

function initSideProofingListeners() {
    if (sideProofingListenersInitialized) return;
    sideProofingListenersInitialized = true;

    // Trigger buttons
    const btnOpenSuccess = document.getElementById('btnOpenProofingCapsuleSuccess');
    if (btnOpenSuccess) {
        btnOpenSuccess.addEventListener('click', () => {
            if (window._activeProofingTarget) openSideProofingDrawer(window._activeProofingTarget);
        });
    }

    const dockedTrigger = document.getElementById('sideProofingCapsuleTrigger');
    if (dockedTrigger) {
        dockedTrigger.addEventListener('click', () => {
            toggleSideProofingDrawer();
        });
    }

    // Close buttons & backdrop
    const closeBtn = document.getElementById('btnCloseSideProofingDrawer');
    if (closeBtn) closeBtn.addEventListener('click', closeSideProofingDrawer);

    const backdrop = document.getElementById('sideProofingDrawerBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeSideProofingDrawer);

    // Modal buttons
    const modalCloseBtn = document.getElementById('proofingModalCloseBtn');
    const modalCancelBtn = document.getElementById('proofingModalCancelBtn');
    const modalSaveBtn = document.getElementById('proofingModalSaveBtn');
    const commentInput = document.getElementById('proofingCommentInput');

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } closeSideProofingModal(); });
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } closeSideProofingModal(); });
    if (modalSaveBtn) modalSaveBtn.addEventListener('click', (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } saveSideProofingPin(); });

    if (commentInput) {
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveSideProofingPin();
            }
        });
    }

    const modal = document.getElementById('proofingCommentModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSideProofingModal();
        });
    }

    // Overlay click for video/image pin placement
    const overlay = document.getElementById('sideProofingOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target.closest('.proofing-pin')) return;

            const video = document.getElementById('sideProofingVideo');
            if (!sideProofingActive) {
                if (video && video.style.display !== 'none') {
                    if (video.paused) video.play().catch(()=>{});
                    else video.pause();
                }
                return;
            }

            const rect = overlay.getBoundingClientRect();
            const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

            if (video && video.style.display !== 'none') {
                video.pause();
                const cur = video.currentTime;
                openSideProofingModal({
                    time: cur,
                    formattedTime: formatSideTime(cur),
                    xPct,
                    yPct
                });
            } else {
                openSideProofingModal({
                    time: null,
                    formattedTime: null,
                    xPct,
                    yPct
                });
            }
        });
    }

    // Video playback controls
    const video = document.getElementById('sideProofingVideo');
    const playBtn = document.getElementById('btnSideProofingPlay');
    const playIcon = document.getElementById('sidePlayIcon');
    const pauseIcon = document.getElementById('sidePauseIcon');
    const track = document.getElementById('sideProofingTimelineTrack');
    const progress = document.getElementById('sideProofingTimelineProgress');
    const timeDisplay = document.getElementById('sideProofingTimeDisplay');

    if (video) {
        const sideCenterPlay = document.getElementById('btnSideCenterPlay');
        const sideMuteBtn = document.getElementById('btnSideMute');
        const sideVolIcon = document.getElementById('sideVolumeIcon');
        const sideMutedIcon = document.getElementById('sideMutedIcon');

        const updatePlayState = () => {
            if (video.paused) {
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
                if (sideCenterPlay) sideCenterPlay.classList.remove('hidden');
            } else {
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'block';
                if (sideCenterPlay) sideCenterPlay.classList.add('hidden');
            }
        };

        const toggleSidePlay = () => {
            if (video.paused) video.play().catch(()=>{});
            else video.pause();
            updatePlayState();
        };

        if (playBtn) playBtn.onclick = (e) => { e.stopPropagation(); toggleSidePlay(); };
        if (sideCenterPlay) sideCenterPlay.onclick = (e) => { e.stopPropagation(); toggleSidePlay(); };

        if (sideMuteBtn) {
            sideMuteBtn.onclick = (e) => {
                e.stopPropagation();
                video.muted = !video.muted;
                if (sideVolIcon) sideVolIcon.style.display = video.muted ? 'none' : 'block';
                if (sideMutedIcon) sideMutedIcon.style.display = video.muted ? 'block' : 'none';
            };
        }

        const sidePiP = document.getElementById('btnSidePiP');
        if (sidePiP) {
            if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
                sidePiP.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        if (document.pictureInPictureElement) await document.exitPictureInPicture();
                        else if (video && video.requestPictureInPicture) await video.requestPictureInPicture();
                    } catch(err) { console.warn('Side PiP error:', err); }
                };
            } else {
                sidePiP.style.display = 'none';
            }
        }

        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('ended', updatePlayState);

        video.addEventListener('loadedmetadata', () => {
            if (timeDisplay) {
                timeDisplay.textContent = `${formatSideTime(video.currentTime)} / ${formatSideTime(video.duration)}`;
            }
            renderSideProofingTimelineMarkers();
        });

        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const pct = (video.currentTime / video.duration) * 100;
                if (progress) progress.style.width = pct + '%';
                if (timeDisplay) {
                    timeDisplay.textContent = `${formatSideTime(video.currentTime)} / ${formatSideTime(video.duration)}`;
                }
            }
        });

        if (track) {
            let isSideScrubbing = false;
            const seekSideByEvent = (e) => {
                if (!video || !video.duration || isNaN(video.duration)) return;
                const rect = track.getBoundingClientRect();
                const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
                const clickPct = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
                video.currentTime = clickPct * video.duration;
                if (progress) progress.style.width = (clickPct * 100) + '%';
                if (timeDisplay) {
                    timeDisplay.textContent = `${formatSideTime(video.currentTime)} / ${formatSideTime(video.duration)}`;
                }
            };

            track.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isSideScrubbing = true;
                track.classList.add('is-dragging');
                seekSideByEvent(e);
            });

            window.addEventListener('mousemove', (e) => {
                if (isSideScrubbing) {
                    seekSideByEvent(e);
                }
            });

            window.addEventListener('mouseup', () => {
                if (isSideScrubbing) {
                    isSideScrubbing = false;
                    track.classList.remove('is-dragging');
                }
            });

            track.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                isSideScrubbing = true;
                track.classList.add('is-dragging');
                seekSideByEvent(e);
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (isSideScrubbing) {
                    seekSideByEvent(e);
                }
            }, { passive: true });

            window.addEventListener('touchend', () => {
                if (isSideScrubbing) {
                    isSideScrubbing = false;
                    track.classList.remove('is-dragging');
                }
            });

            // Hover indicator
            const sideHoverIndicator = document.getElementById('sideTimelineHoverIndicator');
            const sideHoverTime = document.getElementById('sideTimelineHoverTime');
            if (sideHoverIndicator && sideHoverTime) {
                track.addEventListener('mousemove', (e) => {
                    if (!video.duration || isNaN(video.duration) || isSideScrubbing) return;
                    const rect = track.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
                    sideHoverIndicator.style.display = 'block';
                    sideHoverIndicator.style.left = (pct * 100) + '%';
                    sideHoverTime.textContent = formatSideTime(pct * video.duration);
                });
                track.addEventListener('mouseleave', () => {
                    if (!isSideScrubbing) {
                        sideHoverIndicator.style.display = 'none';
                    }
                });
            }
        }
    }

    // Toolbar buttons
    const addHereBtn = document.getElementById('btnSideProofingAddHere');
    if (addHereBtn) {
        addHereBtn.onclick = () => {
            const videoEl = document.getElementById('sideProofingVideo');
            if (videoEl && videoEl.style.display !== 'none') {
                videoEl.pause();
                const cur = videoEl.currentTime;
                openSideProofingModal({
                    time: cur,
                    formattedTime: formatSideTime(cur),
                    xPct: 50,
                    yPct: 50
                });
            } else {
                openSideProofingModal({
                    time: null,
                    formattedTime: null,
                    xPct: 50,
                    yPct: 50
                });
            }
        };
    }

    const toggleModeBtn = document.getElementById('btnSideProofingToggleMode');
    if (toggleModeBtn) {
        toggleModeBtn.onclick = () => {
            sideProofingActive = !sideProofingActive;
            const dot = toggleModeBtn.querySelector('.side-toggle-dot');
            if (dot) {
                dot.style.background = sideProofingActive ? '#10B981' : '#64748B';
                dot.style.boxShadow = sideProofingActive ? '0 0 6px #10B981' : 'none';
            }
            if (overlay) overlay.classList.toggle('disabled', !sideProofingActive);
            renderSideProofingPinsOnMedia();
            if (typeof playSound === 'function') playSound('click');
        };
    }

    const exportBtn = document.getElementById('btnSideProofingExport');
    if (exportBtn) exportBtn.onclick = exportSideProofingList;

    const downloadTxtBtn = document.getElementById('btnSideProofingDownloadTxt');
    if (downloadTxtBtn) downloadTxtBtn.onclick = downloadSideProofingTxt;

    // Keyboard shortcuts (Escape to close, Space to play/pause when drawer is open)
    document.addEventListener('keydown', (e) => {
        const drawer = document.getElementById('sideProofingDrawer');
        const modal = document.getElementById('proofingCommentModal');
        const isDrawerOpen = drawer && drawer.classList.contains('open');
        const isModalOpen = modal && !modal.hidden && !modal.classList.contains('is-hidden') && modal.style.display !== 'none';

        if (e.key === 'Escape') {
            if (isModalOpen) {
                e.preventDefault();
                e.stopPropagation();
                closeSideProofingModal();
                closeProofingModal();
            } else if (isDrawerOpen) {
                closeSideProofingDrawer();
            }
            return;
        }

        if (e.key === ' ' && !isModalOpen) {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag !== 'input' && activeTag !== 'textarea') {
                if (isDrawerOpen) {
                    e.preventDefault();
                    const videoEl = document.getElementById('sideProofingVideo');
                    if (videoEl && videoEl.style.display !== 'none') {
                        if (videoEl.paused) videoEl.play().catch(()=>{});
                        else videoEl.pause();
                    }
                } else {
                    const mainVideoEl = document.getElementById('proofingVideoEl');
                    if (mainVideoEl && mainVideoEl.offsetParent !== null) {
                        e.preventDefault();
                        if (mainVideoEl.paused) mainVideoEl.play().catch(()=>{});
                        else mainVideoEl.pause();
                    }
                }
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', initSideProofingListeners);


    // Funkcja do renderowania podglądów i odtwarzacza audio (z pełną obsługą pancernego odszyfrowywania AES-256 w RAM)
    async function renderDownloadPreview(cleanName, directUrl, fileKey) {
        if (!dlPreviewContainer || !directUrl) return;

        const targetFileKey = fileKey || (new URLSearchParams(window.location.search)).get('f') || cleanName;
        const proofingSection = document.getElementById('proofingSection');
        if (proofingSection) {
            proofingSection.hidden = true;
            proofingSection.style.display = 'none';
        }

        // === PANCERNE SZYFROWANIE ZERO-KNOWLEDGE (AES-256-GCM) DLA PODGLĄDU ===
        const hashMatch = window.location.hash.match(/enc=([A-Za-z0-9_-]+)/);
        const encKeyB64 = hashMatch ? hashMatch[1] : null;

        if (encKeyB64 && !directUrl.startsWith('blob:')) {
            if (window._activeDecryptedBlob && (window._activeDecryptedBlob.fileKey === targetFileKey || window._activeDecryptedBlob.name === cleanName) && window._activeDecryptedBlob.blobUrl) {
                directUrl = window._activeDecryptedBlob.blobUrl;
            } else {
                dlPreviewContainer.innerHTML = `
                    <div class="proofing-decrypt-loader" id="proofingDecryptLoader">
                        <div class="decrypt-shield-pulse">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <div class="decrypt-info">
                            <div class="decrypt-badge">
                                <span class="decrypt-dot"></span>
                                <span>Pancerne szyfrowanie AES-256 (Zero-Knowledge)</span>
                            </div>
                            <h4 class="decrypt-title">Odszyfrowywanie podglądu w Twojej przeglądarce...</h4>
                            <p class="decrypt-hint">Deszyfrowanie następuje bezpośrednio w pamięci RAM za pomocą klucza z linku. Dane na serwerze są bezpieczne i zaszyfrowane.</p>
                        </div>
                    </div>
                `;
                try {
                    const isBurn = targetFileKey.startsWith('burn/');
                    const downloadUrl = isBurn 
                        ? `${WORKER_URL}/burn-download?key=${encodeURIComponent(targetFileKey)}` 
                        : directUrl;
                    const res = await fetch(downloadUrl);
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const encBuffer = await res.arrayBuffer();
                    const cryptoKey = await importKeyBase64(encKeyB64);
                    const decBuffer = await decryptBufferAESGCM(encBuffer, cryptoKey);
                    
                    const mimeType = (typeof getMimeTypeForFilename === 'function') 
                        ? getMimeTypeForFilename(cleanName) 
                        : 'application/octet-stream';
                    const decBlob = new Blob([decBuffer], { type: mimeType });
                    const blobUrl = URL.createObjectURL(decBlob);

                    window._activeDecryptedBlob = {
                        blob: decBlob,
                        blobUrl: blobUrl,
                        fileKey: targetFileKey,
                        name: cleanName
                    };

                    directUrl = blobUrl;
                } catch (encErr) {
                    console.error('Decryption failed for preview:', encErr);
                    dlPreviewContainer.innerHTML = `
                        <div class="proofing-video-error-fallback">
                            <div class="video-error-icon">🔒</div>
                            <div class="video-error-title">Błąd odszyfrowania podglądu (Zero-Knowledge)</div>
                            <div class="video-error-desc">Klucz deszyfrujący w linku (#enc=...) jest nieprawidłowy lub plik został uszkodzony.</div>
                            <a href="${directUrl}" download="${cleanName}" class="btn-primary btn-error-fallback" style="margin-top: 14px; text-decoration: none;">
                                Pobierz zaszyfrowany plik
                            </a>
                        </div>
                    `;
                    return;
                }
            }
        }

        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(cleanName);
        const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(cleanName);
        const isAudio = /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(cleanName);
        const isPdf = /\.pdf$/i.test(cleanName);
        const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(cleanName);
        const isCode = /\.(txt|json|js|html|css|md|py|c|cpp|java|xml|yaml|yml)$/i.test(cleanName);

        if (isVideo || isImage) {
            // Na widoku pobierania ukrywamy boczny pływający przycisk (mamy pełny odtwarzacz w karcie)
            const sideCapsuleTrigger = document.getElementById('sideProofingCapsuleTrigger');
            if (sideCapsuleTrigger) sideCapsuleTrigger.style.display = 'none';
            window._activeProofingTarget = {
                cleanName: cleanName,
                directUrl: directUrl,
                fileKey: targetFileKey,
                isVideo: isVideo,
                isImage: isImage
            };
            if (typeof loadSideProofingPins === 'function') {
                loadSideProofingPins(targetFileKey);
            }
        }


        if (isVideo) {
            // Sprawdzenie wsparcia kodeka wideo w przeglądarce za pomocą canPlayType
            const probeVideo = document.createElement('video');
            const ext = (cleanName.split('.').pop() || '').toLowerCase();
            const mime = ext === 'mkv' ? 'video/x-matroska' : (ext === 'webm' ? 'video/webm' : (ext === 'mov' ? 'video/quicktime' : 'video/mp4'));
            const canPlayCodec = probeVideo.canPlayType(mime);
            if (canPlayCodec === '' && ext === 'mkv') {
                console.warn('Browser reports lack of native container support for:', mime);
            }

            if (proofingSection) {
                proofingSection.hidden = false;
                proofingSection.style.display = 'block';
            }
            if (dlPreviewContainer) {
                dlPreviewContainer.classList.add('has-proofing-video');
            }
            const dlCard = document.querySelector('.download-card');
            if (dlCard) {
                dlCard.classList.add('has-proofing-video');
            }
            const mainWrap = dlPreviewContainer ? dlPreviewContainer.closest('.main-wrapper') : null;
            if (mainWrap) {
                mainWrap.classList.add('has-proofing-video');
            }
            // Ukryj pływającą kapsułkę boczną na stronie pobierania (nie dublujemy podglądu)
            const sideCapsuleTrigger = document.getElementById('sideProofingCapsuleTrigger');
            if (sideCapsuleTrigger) sideCapsuleTrigger.style.display = 'none';

            dlPreviewContainer.innerHTML = `
                <div class="proofing-media-container" id="proofingMediaContainer">
                    <div class="proofing-video-frame-box" id="proofingVideoFrameBox">
                        <div class="proofing-video-stage" id="proofingVideoStage">
                            <video id="proofingVideoEl" src="${directUrl}" playsinline preload="metadata"></video>
                            <button type="button" class="proofing-center-play-btn" id="btnProofingCenterPlay" title="Odtwórz wideo (Spacja)">
                                <div class="center-play-pulse-ring"></div>
                                <div class="center-play-circle">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="center-play-svg" aria-hidden="true"><path d="M8 5.5C8 4.67 8.93 4.18 9.62 4.63L19.46 11.13C20.08 11.54 20.08 12.46 19.46 12.87L9.62 19.37C8.93 19.82 8 19.33 8 18.5V5.5Z"></path></svg>
                                </div>
                            </button>
                            <div class="proofing-overlay" id="proofingOverlay" title="Odtwórz / Wstrzymaj (Spacja) • Podwójne kliknięcie: Pełny ekran">
                                <div id="proofingPinsLayer" class="proofing-pins-layer"></div>
                            </div>
                        </div>
                    </div>
                                        <div class="proofing-timeline-wrap" id="proofingTimelineWrap">
                        <!-- Pełna oś czasu (Scrubber Bar 100% szerokości) -->
                        <div class="proofing-timeline-track-row">
                            <div class="proofing-timeline-track" id="proofingTimelineTrack" title="Kliknij lub przeciągnij, aby przewinąć do klatki">
                                <div class="proofing-timeline-progress" id="proofingTimelineProgress">
                                    <div class="proofing-timeline-thumb"></div>
                                </div>
                                <div id="proofingTimelineMarkersLayer" class="proofing-timeline-markers-layer"></div>
                                <div class="proofing-timeline-hover-indicator" id="proofingTimelineHoverIndicator">
                                    <span class="proofing-timeline-hover-time" id="proofingTimelineHoverTime">00:00</span>
                                </div>
                            </div>
                        </div>
                        <!-- Pasek kontrolek i przycisków -->
                        <div class="proofing-controls-row">
                            <div class="proofing-controls-left">
                                <button type="button" class="btn-timeline-play" id="btnProofingVideoPlay" title="Odtwórz / Wstrzymaj (Spacja)">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="proofingPlayIcon"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="proofingPauseIcon" style="display: none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                </button>
                                <span class="proofing-timeline-time-display" id="proofingTimeDisplay">00:00 / 00:00</span>
                            </div>
                            <div class="proofing-controls-right">
                                <button type="button" class="btn-timeline-add-pin" id="btnProofingTimelineAdd" title="Zaznacz klatkę i dodaj uwagę (C)">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>Dodaj uwagę</span>
                                </button>
                                <button type="button" class="btn-timeline-util" id="btnProofingMute" title="Wycisz / włącz dźwięk (M)">
                                    <svg id="proofingVolumeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    </svg>
                                    <svg id="proofingMutedIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <line x1="23" y1="9" x2="17" y2="15"></line>
                                        <line x1="17" y1="9" x2="23" y2="15"></line>
                                    </svg>
                                </button>
                                <button type="button" class="btn-timeline-util" id="btnProofingPiP" title="Obraz w obrazie (I / PiP)">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" fill-opacity="0.3"></rect>
                                    </svg>
                                </button>
                                <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn-timeline-util" id="btnProofingDirectStream" title="Otwórz bezpośredni stream URL w nowej karcie (kliknij prawym, aby skopiować link)">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                                <button type="button" class="btn-timeline-util" id="btnProofingFullscreen" title="Pełny ekran (F)">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            initClientProofingController({ cleanName, directUrl, fileKey: targetFileKey, isVideo: true, isImage: false });
        } else if (isImage) {
            // Upewnij się, że karta dla obrazu zachowuje stabilną, wycentrowaną szerokość 520px
            if (dlPreviewContainer) dlPreviewContainer.classList.remove('has-proofing-video');
            const dlCard = document.querySelector('.download-card');
            if (dlCard) dlCard.classList.remove('has-proofing-video');
            const mainWrap = dlPreviewContainer ? dlPreviewContainer.closest('.main-wrapper') : null;
            if (mainWrap) mainWrap.classList.remove('has-proofing-video');

            if (proofingSection) {
                proofingSection.hidden = false;
                proofingSection.style.display = 'block';
            }
            dlPreviewContainer.innerHTML = `
                <div class="dl-preview-image-wrapper" id="dlPreviewImageWrapper">
                    <div class="proofing-media-container" id="proofingMediaContainer" style="cursor: zoom-in;">
                        <img id="proofingImageEl" src="${directUrl}" class="dl-preview-media" alt="${cleanName}" style="display: block; width: 100%; max-height: 380px; object-fit: contain; cursor: zoom-in;">
                        <div class="proofing-overlay" id="proofingOverlay" title="Kliknij na zdjęcie, aby powiększyć">
                            <div id="proofingPinsLayer" class="proofing-pins-layer"></div>
                        </div>
                    </div>
                    <div class="dl-preview-toolbar">
                        <button type="button" class="dl-tool-pill dl-tool-zoom" id="dlQuickZoomBtn" title="Powiększ zdjęcie na pełnym ekranie">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            <span data-i18n="btn_zoom_image">Powiększ</span>
                        </button>
                        <button type="button" class="dl-tool-pill dl-tool-pin" id="dlQuickAddPinBtn" title="Dodaj pinezkę z uwagą do zdjęcia">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span data-i18n="btn_add_note_pin">Dodaj uwagę</span>
                        </button>
                        <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="dl-tool-pill dl-tool-newtab" id="dlQuickNewTabBtn" title="Otwórz oryginalne zdjęcie w nowej karcie">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            <span data-i18n="btn_newtab_image">Otwórz w nowej karcie</span>
                        </a>
                    </div>
                </div>
            `;

            // Kliknięcie w zdjęcie lub przycisk powiększenia otwiera Lightbox podglądu
            const openZoom = (e) => {
                if (e) e.stopPropagation();
                if (window.openDownloadImageLightbox) {
                    window.openDownloadImageLightbox(directUrl, cleanName);
                }
            };

            const quickZoomBtn = document.getElementById('dlQuickZoomBtn');
            if (quickZoomBtn) quickZoomBtn.addEventListener('click', openZoom);

            const imgEl = document.getElementById('proofingImageEl');
            if (imgEl) imgEl.addEventListener('click', openZoom);

            const overlayEl = document.getElementById('proofingOverlay');
            if (overlayEl) {
                overlayEl.addEventListener('click', (e) => {
                    // Jeśli kliknięto w istniejącą pinezkę, nie otwieraj lightboxa
                    if (e.target.closest('.proofing-pin')) return;
                    openZoom(e);
                });
            }

            // Przycisk "Dodaj uwagę" otwiera modal pinezki do grafiki
            const addPinBtn = document.getElementById('dlQuickAddPinBtn');
            if (addPinBtn) {
                addPinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof openProofingModal === 'function') {
                        openProofingModal({
                            time: null,
                            formattedTime: null,
                            xPct: 50,
                            yPct: 35
                        });
                    }
                });
            }

            const quickNewTabBtn = document.getElementById('dlQuickNewTabBtn');
            if (quickNewTabBtn) {
                quickNewTabBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }

            initClientProofingController({ cleanName, directUrl, fileKey: targetFileKey, isVideo: false, isImage: true, preventAutoModalOnImage: true });
        } else if (isAudio) {
            dlPreviewContainer.innerHTML = `
                <div class="dropsite-audio-player" id="dropsiteAudioPlayer">
                    <audio id="mainAudioElement" src="${directUrl}" preload="metadata"></audio>
                    <div class="audio-top-row">
                        <button type="button" class="audio-play-btn" id="audioPlayBtn" aria-label="Odtwórz lub wstrzymaj">
                            <svg id="audioPlayIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
                            <svg id="audioPauseIcon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display: none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        </button>
                        <div class="audio-info-col">
                            <span class="audio-title">${cleanName}</span>
                            <span class="audio-time-row" id="audioTimeDisplay">0:00 / --:--</span>
                        </div>
                        <div class="audio-waveform-bars" id="audioWaveform">
                            <span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span>
                        </div>
                    </div>
                    <div class="audio-progress-wrap">
                        <input type="range" id="audioProgressSlider" min="0" max="100" value="0" step="0.1" class="audio-progress-slider" aria-label="Pasek postępu odtwarzania audio">
                    </div>
                </div>
            `;

            // Podpięcie logiki odtwarzacza audio
            setTimeout(() => {
                const audio = document.getElementById('mainAudioElement');
                const playBtn = document.getElementById('audioPlayBtn');
                const playIcon = document.getElementById('audioPlayIcon');
                const pauseIcon = document.getElementById('audioPauseIcon');
                const timeDisplay = document.getElementById('audioTimeDisplay');
                const slider = document.getElementById('audioProgressSlider');
                const playerContainer = document.getElementById('dropsiteAudioPlayer');

                if (!audio || !playBtn) return;

                const formatTime = (secs) => {
                    if (isNaN(secs) || secs === Infinity) return '0:00';
                    const m = Math.floor(secs / 60);
                    const s = Math.floor(secs % 60);
                    return `${m}:${s < 10 ? '0' : ''}${s}`;
                };

                audio.addEventListener('loadedmetadata', () => {
                    if (timeDisplay) timeDisplay.textContent = `0:00 / ${formatTime(audio.duration)}`;
                });

                playBtn.addEventListener('click', () => {
                    if (audio.paused) {
                        const playProm = audio.play();
                        if (playProm !== undefined) {
                            playProm.catch(err => {
                                console.warn('Audio playback prevented:', err);
                            });
                        }
                        if (playerContainer) playerContainer.classList.add('playing');
                        if (playIcon) playIcon.style.display = 'none';
                        if (pauseIcon) pauseIcon.style.display = 'block';
                    } else {
                        audio.pause();
                        if (playerContainer) playerContainer.classList.remove('playing');
                        if (playIcon) playIcon.style.display = 'block';
                        if (pauseIcon) pauseIcon.style.display = 'none';
                    }
                });

                audio.addEventListener('timeupdate', () => {
                    if (audio.duration && slider) {
                        slider.value = (audio.currentTime / audio.duration) * 100;
                        if (timeDisplay) timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
                    }
                });

                if (slider) {
                    slider.addEventListener('input', () => {
                        if (audio.duration) {
                            audio.currentTime = (slider.value / 100) * audio.duration;
                        }
                    });
                }

                audio.addEventListener('ended', () => {
                    if (playerContainer) playerContainer.classList.remove('playing');
                    if (playIcon) playIcon.style.display = 'block';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                    if (slider) slider.value = 0;
                });
            }, 50);
        } else if (isPdf) {
            dlPreviewContainer.innerHTML = '<div style="padding: 24px; text-align: center;"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg></div>';
        } else if (isArchive) {
            const isCinematicVisible = document.getElementById('cinematicRecipientSection') && document.getElementById('cinematicRecipientSection').style.display !== 'none';
            const urlParams = new URLSearchParams(window.location.search);
            const isAlbumMode = Boolean(
                urlParams.get('album') === '1' ||
                (typeof data !== 'undefined' && data?.isAlbum) ||
                cleanName.startsWith('Album_') ||
                cleanName.includes('_zdjec')
            );

            if (isAlbumMode) {
                dlPreviewContainer.innerHTML = `
                    <div class="photo-album-recipient-container" id="photoAlbumRecipientContainer">
                        <div class="photo-album-recipient-header">
                            <div class="photo-album-header-left">
                                <div class="photo-album-icon-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </div>
                                <div>
                                    <strong class="photo-album-title" id="albumHeaderTitle">Album fotograficzny</strong>
                                    <span class="photo-album-subtitle" id="archiveSubLabel">Wczytywanie fotografii w pamięci RAM...</span>
                                </div>
                            </div>
                            <div class="photo-album-header-right" id="albumHeaderActions">
                                <button type="button" class="btn-album-slideshow-quick" id="btnLaunchAlbumSlideshow">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    <span>Pokaz slajdów</span>
                                </button>
                            </div>
                        </div>
                        <div class="archive-file-list album-gallery-grid" id="archiveFileList" style="display: grid;">
                            <div style="grid-column: 1 / -1; text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 12.5px;">
                                <span class="loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #38BDF8; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: -2px; margin-right: 8px;"></span>
                                Wczytywanie i przygotowywanie galerii zdjęć...
                            </div>
                        </div>
                    </div>
                `;
            } else if (isCinematicVisible) {
                dlPreviewContainer.innerHTML = '<div class="archive-file-list album-gallery-grid" id="archiveFileList" style="display: none;"></div>';
            } else {
                dlPreviewContainer.innerHTML = `
                    <div class="archive-explorer-box" id="archiveExplorerBox">
                        <div class="archive-explorer-header">
                            <div class="archive-icon-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                            </div>
                            <div class="archive-title-box">
                                <span class="archive-bundle-sub" id="archiveSubLabel">Odczytywanie zawartości archiwum...</span>
                            </div>
                        </div>
                        <div class="archive-search-wrap" id="archiveSearchWrap" style="display: none;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" id="archiveSearchInput" placeholder="Szukaj pliku w archiwum..." class="archive-search-input">
                            <span class="archive-count-badge" id="archiveFilterCount">0 plików</span>
                        </div>
                        <div class="archive-file-list" id="archiveFileList">
                            <div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 12px;">
                                <span class="loading-spinner" style="display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #38BDF8; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: -2px; margin-right: 6px;"></span>
                                Wczytywanie zawartości archiwum w pamięci RAM...
                            </div>
                        </div>
                    </div>
                `;
            }

            // Jeśli biblioteka fflate jest dostępna, wczytaj zawartość ZIP w tle
            if (typeof fflate !== 'undefined') {
                const getArchiveBuffer = async () => {
                    if (window._activeDecryptedBlob && window._activeDecryptedBlob.blob) {
                        return await window._activeDecryptedBlob.blob.arrayBuffer();
                    }
                    if (directUrl && directUrl.startsWith('blob:')) {
                        const res = await fetch(directUrl);
                        if (res.ok) return await res.arrayBuffer();
                    }
                    const streamUrl = `${WORKER_URL}/stream?key=${encodeURIComponent(targetFileKey || fileKey)}`;
                    try {
                        const res = await fetch(streamUrl);
                        if (res.ok) return await res.arrayBuffer();
                    } catch (_) {}
                    if (directUrl) {
                        const res = await fetch(directUrl);
                        if (res.ok) return await res.arrayBuffer();
                    }
                    throw new Error('Nie udało się pobrać archiwum');
                };

                window._unzippingArchivePromise = getArchiveBuffer()
                    .then(buf => {
                        return new Promise((resolve) => {
                            const uint8 = new Uint8Array(buf);
                            fflate.unzip(uint8, (err, unzipped) => {
                                const listEl = document.getElementById('archiveFileList');
                                const subLabel = document.getElementById('archiveSubLabel');
                                const albumTitle = document.getElementById('albumHeaderTitle');
                                const searchWrap = document.getElementById('archiveSearchWrap');
                                const searchInput = document.getElementById('archiveSearchInput');
                                const filterCount = document.getElementById('archiveFilterCount');

                                if (err || !unzipped || !listEl) {
                                    if (subLabel) subLabel.textContent = 'Zawartość archiwum';
                                    if (listEl) {
                                        listEl.style.display = 'block';
                                        listEl.innerHTML = '<div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 12px;">Paczka plików gotowa do pobrania</div>';
                                    }
                                    resolve(null);
                                    return;
                                }

                                const fileEntries = Object.keys(unzipped).filter(k => !k.endsWith('/') && unzipped[k].length > 0);
                                let totalUncompressedSize = 0;
                                fileEntries.forEach(k => { totalUncompressedSize += unzipped[k].length; });

                                const imgEntries = fileEntries.filter(k => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(k));
                                const isAlbumArchive = isAlbumMode || (imgEntries.length > 1 && (imgEntries.length / fileEntries.length >= 0.7));

                                window._activeUnzippedArchive = unzipped;
                                window._albumPhotosList = imgEntries.map((path, idx) => {
                                    const filename = path.split('/').pop() || path;
                                    const ext = filename.split('.').pop().toLowerCase();
                                    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : 'image/jpeg'));
                                    const blob = new Blob([unzipped[path]], { type: mime });
                                    return {
                                        index: idx,
                                        path: path,
                                        filename: filename,
                                        size: unzipped[path].length,
                                        blobUrl: URL.createObjectURL(blob)
                                    };
                                });

                                if (isAlbumArchive) {
                                    // Uaktualnij nagłówki i etykiety
                                    if (albumTitle) albumTitle.textContent = `Album fotograficzny (${imgEntries.length} zdjęć)`;
                                    if (subLabel) subLabel.textContent = `${imgEntries.length} fotografii w pełnej jakości • ${formatBytes(totalUncompressedSize)}`;

                                    const dlFileNameEl = document.getElementById('dlFileName');
                                    const dlFileSizeEl = document.getElementById('dlFileSize');
                                    const dlBtnEl = document.getElementById('dlDownloadBtn');
                                    if (dlFileNameEl && (cleanName.startsWith('Paczka_') || cleanName.startsWith('Album_') || cleanName.endsWith('.zip'))) {
                                        dlFileNameEl.textContent = `📸 Album fotograficzny (${imgEntries.length} zdjęć)`;
                                    }
                                    if (dlFileSizeEl) {
                                        dlFileSizeEl.textContent = `${imgEntries.length} fotografii • ${formatBytes(totalUncompressedSize)} (pełna jakość)`;
                                    }
                                    if (dlBtnEl) {
                                        const btnTxt = dlBtnEl.querySelector('.btn-text');
                                        if (btnTxt) btnTxt.textContent = `Pobierz cały album (${formatBytes(totalUncompressedSize)})`;
                                    }

                                    // Podepnij przycisk pokazu slajdów
                                    const btnQuickSlideshow = document.getElementById('btnLaunchAlbumSlideshow');
                                    if (btnQuickSlideshow) {
                                        btnQuickSlideshow.onclick = () => {
                                            const urls = window._albumPhotosList.map(p => p.blobUrl);
                                            const cinematicTrack = (typeof data !== 'undefined' && data?.cinematicTrack) || 'piano';
                                            if (typeof launchCinematicSlideshow === 'function') {
                                                launchCinematicSlideshow(urls, cinematicTrack, cleanName, directUrl);
                                            }
                                        };
                                    }

                                    // Dodaj 3D Stack do bohatera prezentacji kinowej jeśli istnieje
                                    const heroIconBox = document.querySelector('.cinematic-hero-icon-box');
                                    if (heroIconBox && imgEntries.length >= 2) {
                                        try {
                                            const stackUrls = window._albumPhotosList.slice(0, 3).map(p => p.blobUrl);
                                            if (stackUrls.length >= 2) {
                                                heroIconBox.innerHTML = `
                                                    <div class="album-hero-3d-stack">
                                                        <div class="album-stack-card card-back" style="background-image: url('${stackUrls[2] || stackUrls[0]}');"></div>
                                                        <div class="album-stack-card card-mid" style="background-image: url('${stackUrls[1]}');"></div>
                                                        <div class="album-stack-card card-front" style="background-image: url('${stackUrls[0]}');"></div>
                                                    </div>
                                                `;
                                                heroIconBox.style.background = 'transparent';
                                                heroIconBox.style.border = 'none';
                                                heroIconBox.style.width = '72px';
                                                heroIconBox.style.height = '72px';
                                            }
                                        } catch (_) {}
                                    }

                                    // Wyrenderuj galerię zdjęć
                                    listEl.style.display = 'grid';
                                    listEl.className = 'archive-file-list album-gallery-grid';
                                    listEl.innerHTML = window._albumPhotosList.map((item, idx) => {
                                        return `
                                            <div class="album-grid-card" onclick="window.openAlbumLightbox(${idx})">
                                                <div class="album-grid-img-wrap">
                                                    <img src="${item.blobUrl}" class="album-grid-img" loading="lazy" alt="${item.filename}">
                                                    <div class="album-grid-hover-overlay">
                                                        <span class="album-grid-zoom-pill">
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                                                            Powiększ
                                                        </span>
                                                        <button type="button" class="btn-album-grid-dl" onclick="event.stopPropagation(); window.downloadSingleFromArchive('${encodeURIComponent(item.path)}', '${encodeURIComponent(item.filename)}')" title="Pobierz zdjęcie">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="album-grid-meta">
                                                    <span class="album-grid-name" title="${item.filename}">${item.filename}</span>
                                                    <span class="album-grid-size">${formatBytes(item.size)}</span>
                                                </div>
                                            </div>
                                        `;
                                    }).join('');
                                    resolve(unzipped);
                                    return;
                                }

                                if (subLabel) {
                                    subLabel.textContent = `Zawiera ${fileEntries.length} ${fileEntries.length === 1 ? 'plik' : 'plików'} • ${formatBytes(totalUncompressedSize)} po rozpakowaniu`;
                                }

                                if (searchWrap && fileEntries.length > 3) {
                                    searchWrap.style.display = 'flex';
                                }
                                if (filterCount) {
                                    filterCount.textContent = `${fileEntries.length} ${fileEntries.length === 1 ? 'plik' : 'plików'}`;
                                }

                                const canPreview = (fname) => {
                                    const ext = fname.split('.').pop().toLowerCase();
                                    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'txt', 'json', 'js', 'html', 'css', 'md', 'py', 'mp3', 'wav', 'ogg'].includes(ext);
                                };

                                const renderFileList = (entriesToRender) => {
                                    if (entriesToRender.length === 0) {
                                        listEl.innerHTML = '<div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 12px;">Nie znaleziono plików pasujących do zapytania</div>';
                                        return;
                                    }

                                    listEl.className = 'archive-file-list';
                                    listEl.innerHTML = entriesToRender.map(path => {
                                        const size = unzipped[path].length;
                                        const filename = path.split('/').pop() || path;
                                        const hasPreview = canPreview(filename);
                                        return `
                                            <div class="archive-file-row">
                                                <div class="archive-file-left">
                                                    <span class="archive-file-icon">${getMiniFileSvg(filename)}</span>
                                                    <span class="archive-file-name" title="${path}">${path}</span>
                                                </div>
                                                <div class="archive-file-right">
                                                    <span class="archive-size-badge">${formatBytes(size)}</span>
                                                    ${hasPreview ? `
                                                    <button type="button" class="btn-archive-preview-single" onclick="window.previewSingleFromArchive('${encodeURIComponent(path)}', '${encodeURIComponent(filename)}')">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                        Podgląd
                                                    </button>
                                                    ` : ''}
                                                    <button type="button" class="btn-archive-download-single" onclick="window.downloadSingleFromArchive('${encodeURIComponent(path)}', '${encodeURIComponent(filename)}')" title="Pobierz ten plik">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('');
                                };

                                renderFileList(fileEntries);

                                if (searchInput) {
                                    searchInput.oninput = (e) => {
                                        const query = e.target.value.toLowerCase().trim();
                                        const filtered = fileEntries.filter(p => p.toLowerCase().includes(query));
                                        if (filterCount) filterCount.textContent = `${filtered.length} z ${fileEntries.length} plików`;
                                        renderFileList(filtered);
                                    };
                                }

                                resolve(unzipped);
                            });
                        });
                    })
                    .catch(err => {
                        console.warn('Nie udało się wczytać zawartości archiwum:', err);
                        const listEl = document.getElementById('archiveFileList');
                        if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 12px;">Archiwum gotowe do bezpośredniego pobrania</div>';
                    });
            }
        } else {
            dlPreviewContainer.innerHTML = '<div style="padding: 24px; text-align: center;"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>';
        }
    }

    try {
        let data;
        
        
        // Rejestracja wyświetlenia na backendzie
        fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=view`, { method: 'POST' }).catch(()=>{});
        const res = await fetch(`${WORKER_URL}/file-info?key=${encodeURIComponent(fileKey)}`);
        data = await res.json();

        if (!data.success) {
            dlFileName.innerText = 'Plik niedostępny';
            dlFileSize.innerText = data.message || 'Plik wygasł lub został zniszczony po pobraniu.';
            dlPreviewContainer.innerHTML = '<div style="padding: 24px; text-align: center;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>';
            if (dlDownloadBtn) dlDownloadBtn.style.display = 'none';
            return;
        }

        const cleanName = data.originalName || data.name || cleanFileName(data.key);
        dlFileName.innerText = cleanName;
        dlFileSize.innerText = `Rozmiar pliku: ${formatBytes(data.size)}`;

        if (dlViewCount) dlViewCount.textContent = (data.views || 1);
        if (dlDownloadCount) dlDownloadCount.textContent = (data.downloads || 0);

        
        // =========================================================================
        // DIGITAL UNBOXING – WIADOMOŚĆ OD NADAWCY (RECIPIENT WOW EXPERIENCE)
        // =========================================================================
        let hasUnboxing = Boolean(data.hasUnboxing || urlParams.get('unbox'));
        let unboxingType = data.unboxingType || urlParams.get('unbox') || 'video';
        let unboxingMediaSrc = data.unboxingUrl;

        // Sprawdź pamięć lokalną przeglądarki (fallback dla pracy lokalnej bez backendu)
        const localUnbox = localStorage.getItem('dropsite_unboxing_' + fileKey);
        const localUnboxType = localStorage.getItem('dropsite_unboxing_type_' + fileKey);
        if (localUnbox) {
            hasUnboxing = true;
            unboxingType = localUnboxType || unboxingType || 'video';
            unboxingMediaSrc = localUnbox;
        } else if (!unboxingMediaSrc && hasUnboxing) {
            unboxingMediaSrc = `${WORKER_URL}/unboxing?key=${encodeURIComponent(fileKey)}`;
        }

        const unboxSec = document.getElementById('unboxingRecipientSection');
        const unboxCard = document.getElementById('unboxingAvatarCard');
        const unboxBubble = document.getElementById('unboxingAvatarBubble');
        const unboxBubbleVideo = document.getElementById('unboxingBubbleVideo');
        const unboxBubbleAudioIcon = document.getElementById('unboxingBubbleAudioIcon');
        const unboxPlayerExpanded = document.getElementById('unboxingPlayerExpanded');
        const unboxFullVideo = document.getElementById('unboxingFullVideo');
        const unboxFullAudioWrap = document.getElementById('unboxingFullAudioWrap');
        const unboxFullAudio = document.getElementById('unboxingFullAudio');
        const btnCloseUnboxingPlayer = document.getElementById('btnCloseUnboxingPlayer');

        if (hasUnboxing && unboxingMediaSrc && unboxSec && unboxBubble) {
            unboxSec.hidden = false;
            unboxSec.style.display = 'block';

            if (unboxingType === 'audio') {
                if (unboxBubbleVideo) {
                    unboxBubbleVideo.style.display = 'none';
                    unboxBubbleVideo.src = '';
                }
                if (unboxBubbleAudioIcon) unboxBubbleAudioIcon.style.display = 'flex';
            } else {
                if (unboxBubbleAudioIcon) unboxBubbleAudioIcon.style.display = 'none';
                if (unboxBubbleVideo) {
                    unboxBubbleVideo.style.display = 'block';
                    unboxBubbleVideo.src = unboxingMediaSrc;
                    unboxBubbleVideo.muted = true;
                    unboxBubbleVideo.loop = true;
                    const p = unboxBubbleVideo.play();
                    if (p !== undefined) p.catch(() => {});
                }
            }

            const expandUnboxPlayer = () => {
                playSound('click');
                if (unboxPlayerExpanded) {
                    unboxPlayerExpanded.hidden = false;
                    unboxPlayerExpanded.style.display = 'block';
                }
                if (unboxCard) {
                    unboxCard.classList.add('is-expanded');
                }

                if (unboxingType === 'audio') {
                    if (unboxFullVideo) {
                        unboxFullVideo.style.display = 'none';
                        unboxFullVideo.pause();
                    }
                    if (unboxFullAudioWrap && unboxFullAudio) {
                        unboxFullAudioWrap.style.display = 'flex';
                        unboxFullAudio.src = unboxingMediaSrc;
                        unboxFullAudio.currentTime = 0;
                        unboxFullAudio.play().catch(() => {});
                    }
                } else {
                    if (unboxBubbleVideo) unboxBubbleVideo.pause();
                    if (unboxFullAudioWrap) unboxFullAudioWrap.style.display = 'none';
                    if (unboxFullVideo) {
                        unboxFullVideo.style.display = 'block';
                        unboxFullVideo.src = unboxingMediaSrc;
                        unboxFullVideo.currentTime = 0;
                        unboxFullVideo.muted = false;
                        unboxFullVideo.play().catch(() => {});
                    }
                }
            };

            const collapseUnboxPlayer = () => {
                playSound('click');
                if (unboxPlayerExpanded) {
                    unboxPlayerExpanded.hidden = true;
                    unboxPlayerExpanded.style.display = 'none';
                }
                if (unboxCard) {
                    unboxCard.classList.remove('is-expanded');
                }
                if (unboxFullVideo) {
                    unboxFullVideo.pause();
                }
                if (unboxFullAudio) {
                    unboxFullAudio.pause();
                }
                if (unboxingType === 'video' && unboxBubbleVideo) {
                    unboxBubbleVideo.play().catch(() => {});
                }
            };

            unboxBubble.onclick = expandUnboxPlayer;
            unboxBubble.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    expandUnboxPlayer();
                }
            };
            if (btnCloseUnboxingPlayer) {
                btnCloseUnboxingPlayer.onclick = collapseUnboxPlayer;
            }
        }

        
        // =========================================================================
        // CINEMATIC DELIVERY – HERO BANER DLA ODBIORCY
        // =========================================================================
        const isCinematicMode = Boolean(
            data.isCinematic ||
            urlParams.get('cinematic') === '1' ||
            localStorage.getItem('dropsite_cinematic_' + fileKey) === '1'
        );
        const cinematicTrackName = data.cinematicTrack || urlParams.get('track') || localStorage.getItem('dropsite_cinematic_track_' + fileKey) || 'piano';

        const cinematicRecipientSec = document.getElementById('cinematicRecipientSection');
        const btnStartCinematic = document.getElementById('btnStartCinematicShow');

        if (isCinematicMode && cinematicRecipientSec && btnStartCinematic) {
            cinematicRecipientSec.hidden = false;
            cinematicRecipientSec.style.display = 'block';

            btnStartCinematic.onclick = async () => {
                playSound('click');
                const origHtml = btnStartCinematic.innerHTML;
                btnStartCinematic.disabled = true;
                btnStartCinematic.style.opacity = '0.7';
                btnStartCinematic.innerHTML = '<span class="loading-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;vertical-align:-2px;"></span> Przygotowywanie zdjęć...';

                try {
                    if (!window._activeUnzippedArchive && window._unzippingArchivePromise) {
                        try {
                            await window._unzippingArchivePromise;
                        } catch(e){}
                    }

                    // Jeśli nadal brak archiwum w RAM, pobierz bezpośrednio przez /stream
                    if (!window._activeUnzippedArchive) {
                        try {
                            const streamUrl = `${WORKER_URL}/stream?key=${encodeURIComponent(fileKey || data.key)}`;
                            const res = await fetch(streamUrl);
                            if (res.ok) {
                                const buf = await res.arrayBuffer();
                                await new Promise((resolve) => {
                                    if (typeof fflate !== 'undefined') {
                                        fflate.unzip(new Uint8Array(buf), (err, unzipped) => {
                                            if (!err && unzipped) {
                                                window._activeUnzippedArchive = unzipped;
                                            }
                                            resolve();
                                        });
                                    } else {
                                        resolve();
                                    }
                                });
                            }
                        } catch(e) {
                            console.warn('On-demand stream unzip error:', e);
                        }
                    }

                    // Jeśli archiwum ZIP zawiera rozpakowane zdjęcia, użyj ich
                    let photoUrls = [];
                    if (window._activeUnzippedArchive) {
                        const unzipped = window._activeUnzippedArchive;
                        const imgKeys = Object.keys(unzipped).filter(k => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(k) && unzipped[k].length > 0);
                        if (imgKeys.length > 0) {
                            photoUrls = imgKeys.map(k => {
                                const ext = k.split('.').pop().toLowerCase();
                                const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : 'image/jpeg'));
                                const blob = new Blob([unzipped[k]], { type: mime });
                                return URL.createObjectURL(blob);
                            });
                        }
                    }

                    if (photoUrls.length === 0) {
                        if (typeof showNotification === 'function') {
                            showNotification('Nie udało się wczytać zdjęć z paczki ZIP do pokazu slajdów.', 'warning');
                        }
                        return;
                    }

                    launchCinematicSlideshow(photoUrls, cinematicTrackName, cleanName, data.directUrl);
                } finally {
                    btnStartCinematic.disabled = false;
                    btnStartCinematic.style.opacity = '1';
                    btnStartCinematic.innerHTML = origHtml;
                }
            };
        }

        // Obsługa brandingu twórcy (PRO)
        const brandParam = urlParams.get('brand') || data.brand || localStorage.getItem('dropsite_brand_' + fileKey);
        if (brandParam) {
            const dlCreatorBrandBanner = document.getElementById('dlCreatorBrandBanner');
            const dlCreatorBrandName = document.getElementById('dlCreatorBrandName');
            if (dlCreatorBrandBanner && dlCreatorBrandName) {
                dlCreatorBrandName.textContent = decodeURIComponent(brandParam);
                dlCreatorBrandBanner.hidden = false;
                dlCreatorBrandBanner.style.display = 'flex';
            }
        }

        // Obsługa tarczy pancernego szyfrowania AES-256 (Zero-Knowledge)
        const hashMatch = window.location.hash.match(/enc=([A-Za-z0-9_-]+)/);
        const encKeyB64 = hashMatch ? hashMatch[1] : null;
        if (encKeyB64) {
            const dlVaultSecurityBadge = document.getElementById('dlVaultSecurityBadge');
            if (dlVaultSecurityBadge) {
                dlVaultSecurityBadge.hidden = false;
                dlVaultSecurityBadge.style.display = 'inline-flex';
            }
        }

        // Notatka od nadawcy (z serwera, pamięci lokalnej lub linku wstecznej kompatybilności)
        const rawNote = data.note || urlParams.get('note') || localStorage.getItem('dropsite_note_' + fileKey) || localStorage.getItem('dropsite_note_' + (data.key || ''));
        const noteVal = safeDecode(rawNote);
        if (noteVal && dlNoteBox && dlNoteText) {
            dlNoteText.textContent = noteVal;
            dlNoteBox.hidden = false;
            dlNoteBox.style.display = 'block';
        }

        // =========================================================================
        // OBSŁUGA TRYBU SZPIEGOWSKIEGO (MISSION: IMPOSSIBLE 007 - HOLD TO REVEAL)
        // =========================================================================
        const isSpy = urlParams.get('spy') === '1' || window.location.hash.includes('spy=1') || Boolean(data.isSpy);
        const dlCard = document.querySelector('.download-card');
        const dlSpyOverlay = document.getElementById('dlSpyOverlay');
        const dlSpyCountdownHUD = document.getElementById('dlSpyCountdownHUD');
        const dlSpyTimerNumber = document.getElementById('dlSpyTimerNumber');
        const dlSpyProgressBar = document.getElementById('dlSpyProgressBar');
        const dlSpyDestroyedCard = document.getElementById('dlSpyDestroyedCard');
        const btnSpyHold = document.getElementById('btnSpyHold');
        const spyRingProgress = document.getElementById('spyRingProgress');

        let spyCountdownInterval = null;
        let isSpyDestroyed = false;

        function executeSpySelfDestruct() {
            if (isSpyDestroyed) return;
            isSpyDestroyed = true;
            if (spyCountdownInterval) clearInterval(spyCountdownInterval);

            if (dlCard) dlCard.classList.add('spy-disintegrating');
            playSound('error');

            // Natychmiastowe usunięcie pliku z serwera R2
            fetch(`${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key)}`).catch(()=>{});

            setTimeout(() => {
                if (dlCard) {
                    dlCard.classList.remove('spy-disintegrating');
                    // Ukryj wszystkie standardowe elementy karty
                    const uploadHeader = dlCard.querySelector('.upload-header');
                    if (uploadHeader) uploadHeader.style.display = 'none';
                    if (dlContentWrap) dlContentWrap.style.display = 'none';
                    if (dlBadgeWrap) dlBadgeWrap.style.display = 'none';
                    if (dlSpyOverlay) dlSpyOverlay.style.display = 'none';
                    if (dlSpyCountdownHUD) dlSpyCountdownHUD.style.display = 'none';
                    if (dlPasswordLockBox) dlPasswordLockBox.style.display = 'none';
                    if (dlNoteBox) dlNoteBox.style.display = 'none';
                    const burnWarn = document.getElementById('dlBurnWarning');
                    if (burnWarn) burnWarn.style.display = 'none';
                    const promoCard = dlCard.querySelector('.dl-promo-card');
                    if (promoCard) promoCard.style.display = 'none';
                    const brandBanner = document.getElementById('dlCreatorBrandBanner');
                    if (brandBanner) brandBanner.style.display = 'none';
                }

                if (dlSpyDestroyedCard) {
                    dlSpyDestroyedCard.hidden = false;
                    dlSpyDestroyedCard.style.display = 'flex';
                }

                if (typeof showNotification === 'function') {
                    showNotification(typeof t === 'function' ? t('spy_destroyed_title') : 'Plik uległ samozniszczeniu i został bezpowrotnie usunięty z serwera.', 'error');
                }
            }, 750);
        }

        if (isSpy) {
            if (dlCard) dlCard.classList.add('is-spy-active');
            if (dlSpyOverlay) {
                dlSpyOverlay.hidden = false;
                dlSpyOverlay.style.display = 'flex';
            }

            // Inicjalizacja mechaniki Hold-to-Reveal
            if (btnSpyHold && spyRingProgress) {
                const TOTAL_PERIMETER = 326.7; // 2 * PI * 52
                const REQUIRED_HOLD_MS = 1200; // 1.2 sekundy
                let holdStartTime = null;
                let holdAnimFrame = null;
                let isRevealed = false;

                function updateHoldProgress() {
                    if (!holdStartTime || isRevealed) return;
                    const elapsed = Date.now() - holdStartTime;
                    const progress = Math.min(1, elapsed / REQUIRED_HOLD_MS);
                    const offset = TOTAL_PERIMETER * (1 - progress);
                    spyRingProgress.style.strokeDashoffset = offset;

                    if (progress >= 1) {
                        isRevealed = true;
                        if (navigator.vibrate) {
                            try { navigator.vibrate([40, 70, 40]); } catch(_) {}
                        }
                        playSound('success');

                        dlSpyOverlay.classList.add('revealed');
                        setTimeout(() => {
                            dlSpyOverlay.style.display = 'none';
                        }, 500);

                        // Jeśli odbiorca odsłonił treść i zamknie kartę/przeglądarkę, plik natychmiast ulega zniszczeniu na serwerze
                        window.addEventListener('pagehide', () => {
                            if (!isSpyDestroyed && (data.key || fileKey) && navigator.sendBeacon) {
                                navigator.sendBeacon(`${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key || fileKey)}`);
                            }
                        });

                        // Uruchomienie licznika samozniszczenia (30 sekund)
                        if (dlSpyCountdownHUD) {
                            dlSpyCountdownHUD.hidden = false;
                            dlSpyCountdownHUD.style.display = 'flex';
                        }

                        let secondsLeft = 30;
                        if (dlSpyTimerNumber) dlSpyTimerNumber.textContent = `${secondsLeft}s`;
                        if (dlSpyProgressBar) dlSpyProgressBar.style.width = '100%';

                        spyCountdownInterval = setInterval(() => {
                            secondsLeft--;
                            if (dlSpyTimerNumber) dlSpyTimerNumber.textContent = `${secondsLeft}s`;
                            if (dlSpyProgressBar) {
                                dlSpyProgressBar.style.width = `${(secondsLeft / 30) * 100}%`;
                            }

                            if (secondsLeft <= 5) {
                                if (dlSpyCountdownHUD) dlSpyCountdownHUD.classList.add('critical');
                                playSound('error');
                            }

                            if (secondsLeft <= 0) {
                                clearInterval(spyCountdownInterval);
                                executeSpySelfDestruct();
                            }
                        }, 1000);

                        return;
                    }

                    holdAnimFrame = requestAnimationFrame(updateHoldProgress);
                }

                function startHold(e) {
                    if (isRevealed || isSpyDestroyed) return;
                    e.preventDefault();
                    btnSpyHold.classList.add('is-pressing');
                    holdStartTime = Date.now();
                    playSound('copy');
                    holdAnimFrame = requestAnimationFrame(updateHoldProgress);
                }

                function stopHold(e) {
                    if (isRevealed) return;
                    btnSpyHold.classList.remove('is-pressing');
                    holdStartTime = null;
                    if (holdAnimFrame) cancelAnimationFrame(holdAnimFrame);
                    spyRingProgress.style.strokeDashoffset = TOTAL_PERIMETER;
                }

                btnSpyHold.addEventListener('pointerdown', startHold);
                btnSpyHold.addEventListener('pointerup', stopHold);
                btnSpyHold.addEventListener('pointercancel', stopHold);
                btnSpyHold.addEventListener('mouseleave', stopHold);
            }
        }

        // Badges
        let badgeHtml = '';
        if (isSpy) {
            badgeHtml = '<span class="badge-spy-viral-pill" style="font-size: 11px; padding: 4px 10px;">🕵️‍♂️ Tryb Szpiegowski 007</span> <span class="dl-badge burn" style="margin-left: 6px;">Samozniszczenie (Hold to Reveal)</span>';
            if (dlBurnWarning) dlBurnWarning.hidden = true;
        } else if (data.isBurn) {
            badgeHtml = '<span class="dl-badge burn">Jednorazowy (Burn after download)</span>';
            if (dlBurnWarning) dlBurnWarning.hidden = false;
        } else if (data.expiryType === 'permanent') {
            badgeHtml = '<span class="dl-badge perm">Bezterminowy</span>';
        } else {
            badgeHtml = `<span class="dl-badge temp">Wygasa za ${data.expiryType === '1d' ? '1 dzień' : '30 dni'}</span>`;
        }

        if (data.maxDownloads) {
            badgeHtml += ` <span class="dl-badge temp" style="margin-left: 6px;">Limit: ${data.downloads || 0}/${data.maxDownloads} pobrań</span>`;
        }

        if (dlBadgeWrap) dlBadgeWrap.innerHTML = badgeHtml;

        // Obsługa blokady hasłem (z serwera, URL lub pamięci lokalnej)
        const hasPasswordFlag = Boolean(data.hasPassword || urlParams.get('haspwd') === '1' || urlParams.get('pwd') === '1' || localStorage.getItem('dropsite_pwd_' + fileKey) || localStorage.getItem('dropsite_pwd_' + (data.key || '')));
        if (hasPasswordFlag) {
            if (dlPasswordLockBox) dlPasswordLockBox.hidden = false;
            if (dlContentWrap) dlContentWrap.hidden = true;

            if (dlUnlockBtn && dlUnlockPasswordInput) {
                const performUnlock = async () => {
                    const passwordVal = dlUnlockPasswordInput.value.trim();
                    if (!passwordVal) {
                        if (dlPasswordError) dlPasswordError.textContent = 'Wpisz hasło, aby odblokować plik.';
                        return;
                    }
                    dlUnlockBtn.disabled = true;
                    if (dlPasswordError) dlPasswordError.textContent = 'Weryfikacja hasła...';

                    // Weryfikacja lokalna (offline fallback / testowanie)
                    const localSavedPwd = localStorage.getItem('dropsite_pwd_' + fileKey) || localStorage.getItem('dropsite_pwd_' + (data.key || ''));
                    if (localSavedPwd && passwordVal === localSavedPwd) {
                        if (!data.directUrl) {
                            data.directUrl = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${data.key || fileKey}`;
                        }
                        if (dlPasswordLockBox) dlPasswordLockBox.hidden = true;
                        if (dlContentWrap) dlContentWrap.hidden = false;
                        const downloadUrl = data.isBurn 
                            ? `${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key || fileKey)}` 
                            : data.directUrl;
                        if (dlDownloadBtn) {
                            dlDownloadBtn.href = downloadUrl;
                            if (!data.isBurn) dlDownloadBtn.setAttribute('download', cleanName);
                            else dlDownloadBtn.removeAttribute('download');
                        }
                        renderDownloadPreview(cleanName, data.directUrl, data.key || fileKey);
                        showNotification('Plik został pomyślnie odblokowany!', 'success');
                        dlUnlockBtn.disabled = false;
                        return;
                    }

                    try {
                        const vRes = await fetch(`${WORKER_URL}/verify-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: fileKey, password: passwordVal })
                        });
                        let vData = {};
                        try {
                            vData = await vRes.json();
                        } catch (_) {
                            vData = { success: false, message: 'Błąd odpowiedzi serwera.' };
                        }

                        if (vData.success && (vData.directUrl || vData.isBurn)) {
                            if (vData.isBurn !== undefined) {
                                data.isBurn = Boolean(vData.isBurn);
                            }
                            data.directUrl = vData.directUrl || `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${data.key || fileKey}`;
                            if (dlPasswordLockBox) dlPasswordLockBox.hidden = true;
                            if (dlContentWrap) dlContentWrap.hidden = false;
                            
                            const downloadUrl = data.isBurn 
                                ? `${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key || fileKey)}` 
                                : data.directUrl;
                            if (dlDownloadBtn) {
                                dlDownloadBtn.href = downloadUrl;
                                if (!data.isBurn) dlDownloadBtn.setAttribute('download', cleanName);
                                else dlDownloadBtn.removeAttribute('download');
                            }
                            renderDownloadPreview(cleanName, data.directUrl, data.key || fileKey);
                            showNotification('Plik został pomyślnie odblokowany!', 'success');
                        } else {
                            if (dlPasswordError) dlPasswordError.textContent = vData.message || 'Nieprawidłowe hasło.';
                        }
                    } catch (e) {
                        if (dlPasswordError) dlPasswordError.textContent = 'Błąd połączenia z serwerem.';
                    } finally {
                        dlUnlockBtn.disabled = false;
                    }
                };

                dlUnlockBtn.onclick = performUnlock;
                dlUnlockPasswordInput.onkeydown = (e) => {
                    if (e.key === 'Enter') performUnlock();
                };
            }
        } else {
            if (dlPasswordLockBox) dlPasswordLockBox.hidden = true;
            if (dlContentWrap) dlContentWrap.hidden = false;

            if (data.isBurn) {
                dlDownloadBtn.href = `${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key)}`;
            } else {
                dlDownloadBtn.href = data.directUrl;
                dlDownloadBtn.setAttribute('download', cleanName);
            }

            renderDownloadPreview(cleanName, data.directUrl, data.key || fileKey);
            if (window.initDropsiteAds) window.initDropsiteAds();
        }

        // Jeśli plik jest zaszyfrowany AES-256 (Zero-Knowledge), odszyfruj w locie w RAM
        if (encKeyB64) {
            dlDownloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();

                // Jeśli plik został już odszyfrowany w RAM (np. na potrzeby podglądu multimediów)
                if (window._activeDecryptedBlob && window._activeDecryptedBlob.blob && 
                    (window._activeDecryptedBlob.fileKey === fileKey || window._activeDecryptedBlob.fileKey === (data.key || ''))) {
                    const link = document.createElement('a');
                    link.href = window._activeDecryptedBlob.blobUrl;
                    link.download = cleanName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    playSound('drop');
                    if (typeof showNotification === 'function') {
                        showNotification('🛡️ Plik został pomyślnie odszyfrowany (AES-256) i pobrany!', 'success');
                    }
                    fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=download`, { method: 'POST' }).catch(()=>{});
                    if (dlDownloadCount) {
                        const current = parseInt(dlDownloadCount.textContent || '0', 10);
                        dlDownloadCount.textContent = current + 1;
                    }
                    if (isSpy) {
                        setTimeout(() => {
                            executeSpySelfDestruct();
                        }, 1200);
                    }
                    return;
                }

                const textSpan = dlDownloadBtn.querySelector('.btn-text');
                const origText = textSpan ? textSpan.textContent : 'Pobierz';
                if (textSpan) textSpan.textContent = 'Odszyfrowywanie AES-256...';
                dlDownloadBtn.style.pointerEvents = 'none';

                try {
                    const downloadUrl = data.isBurn ? `${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key)}` : data.directUrl;
                    const fRes = await fetch(downloadUrl);
                    if (!fRes.ok) throw new Error('Błąd pobierania zaszyfrowanych danych.');
                    const encData = await fRes.arrayBuffer();

                    const cryptoKey = await importKeyBase64(encKeyB64);
                    const decData = await decryptBufferAESGCM(encData, cryptoKey);

                    const blob = new Blob([decData], { type: 'application/octet-stream' });
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = cleanName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

                    playSound('drop');
                    if (typeof showNotification === 'function') {
                        showNotification('🛡️ Plik został pomyślnie odszyfrowany (AES-256) i pobrany!', 'success');
                    }
                    if (textSpan) textSpan.textContent = origText;
                    
                    fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=download`, { method: 'POST' }).catch(()=>{});
                    if (dlDownloadCount) {
                        const current = parseInt(dlDownloadCount.textContent || '0', 10);
                        dlDownloadCount.textContent = current + 1;
                    }
                    if (isSpy) {
                        setTimeout(() => {
                            executeSpySelfDestruct();
                        }, 1200);
                    }
                } catch (err) {
                    console.error('Decryption failed:', err);
                    if (typeof showNotification === 'function') {
                        showNotification('Nie udało się odszyfrować pliku. Upewnij się, że link zawiera klucz #enc=...', 'error');
                    }
                    if (textSpan) textSpan.textContent = 'Błąd odszyfrowania';
                } finally {
                    dlDownloadBtn.style.pointerEvents = 'auto';
                }
            });
        }

        // Zwiększ licznik pobrań po kliknięciu i obsłuż samozniszczenie
        dlDownloadBtn.addEventListener('click', () => {
            playSound('drop');
            fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=download`, { method: 'POST' }).catch(()=>{});
            if (dlDownloadCount) {
                const current = parseInt(dlDownloadCount.textContent || '0', 10);
                dlDownloadCount.textContent = current + 1;
            }

            if (isSpy) {
                setTimeout(() => {
                    executeSpySelfDestruct();
                }, 1200);
            } else if (data.isBurn) {
                setTimeout(() => {
                    const btnText = dlDownloadBtn.querySelector('.btn-text');
                    if (btnText) btnText.textContent = '🔥 Plik pobrany i zniszczony z serwera';
                    dlDownloadBtn.style.pointerEvents = 'none';
                    dlDownloadBtn.style.background = 'rgba(255, 68, 57, 0.2)';
                    dlDownloadBtn.style.borderColor = '#FF4439';
                    dlDownloadBtn.style.color = '#FF8E72';
                    showNotification('Plik został pomyślnie pobrany i natychmiast bezpowrotnie usunięty z serwera!', 'info');
                }, 800);
            }
        });

    } catch (err) {
        dlFileName.innerText = 'Błąd połączenia z serwerem';
        dlFileSize.innerText = err.message;
    }
}

// Inicjalizacja przy starcie strony
document.addEventListener('DOMContentLoaded', initDownloadRouter);


// Auto-detekcja aktywnego transferu wideo/obrazu przy starcie strony
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let fKey = urlParams.get('f');
        if (!fKey) {
            const finalLink = document.getElementById('finalLink');
            if (finalLink && finalLink.textContent && finalLink.textContent.includes('f=')) {
                try {
                    const match = finalLink.textContent.match(/f=([^&#]+)/);
                    if (match) fKey = decodeURIComponent(match[1]);
                } catch(e){}
            }
        }
        if (!fKey && window._lastUploadedFileKey) {
            fKey = window._lastUploadedFileKey;
        }

        if (fKey && /\.(mp4|webm|mov|mkv|avi|jpg|jpeg|png|gif|webp)$/i.test(fKey)) {
            const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(fKey);
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fKey);
            const cleanName = fKey.split('/').pop() || fKey;
            const directUrl = `https://pub-db4c47e6a54d440a9120992639865dd0.r2.dev/${fKey}`;

            window._activeProofingTarget = {
                cleanName: cleanName,
                directUrl: directUrl,
                fileKey: fKey,
                isVideo: isVideo,
                isImage: isImage
            };

            // Pływający boczny przycisk ukrywamy na stronie odbiorcy (?f=...), ponieważ odtwarzacz jest już bezpośrednio na karcie!
            const sideCapsuleTrigger = document.getElementById('sideProofingCapsuleTrigger');
            const isDownloadViewActive = document.querySelector('.download-card') && !document.querySelector('.download-card').hidden;
            if (sideCapsuleTrigger) {
                sideCapsuleTrigger.style.display = isDownloadViewActive ? 'none' : 'none';
            }

            const successWrap = document.getElementById('successProofingCapsuleWrap');
            const successFlow = document.getElementById('successFlow');
            if (successWrap && successFlow && !successFlow.hidden) {
                successWrap.style.display = 'block';
            }

            if (typeof loadSideProofingPins === 'function') {
                loadSideProofingPins(fKey);
            }
        }
    }, 400);
});

// =========================================================================
// ZAAWANSOWANY SYSTEM LIGHTBOX & ALBUMU FOTOGRAFICZNEGO (FULLSCREEN VIEWER)
// =========================================================================
function initDownloadLightboxSystem() {
    const modal = document.getElementById('dlLightboxModal');
    if (!modal) return;

    const imgEl = document.getElementById('dlLightboxImg');
    const closeBtn = document.getElementById('dlLightboxCloseBtn');
    const zoomBtn = document.getElementById('dlLightboxZoomToggle') || document.getElementById('dlLightboxZoomBtn');
    const zoomInIcon = document.getElementById('dlZoomInIcon');
    const zoomOutIcon = document.getElementById('dlZoomOutIcon');
    const zoomText = document.getElementById('dlZoomStatusText');
    const prevBtn = document.getElementById('dlLightboxPrevBtn');
    const nextBtn = document.getElementById('dlLightboxNextBtn');

    const toggleZoom = () => {
        if (!imgEl) return;
        const isZoomed = imgEl.classList.toggle('zoomed');
        if (zoomInIcon) zoomInIcon.style.display = isZoomed ? 'none' : 'block';
        if (zoomOutIcon) zoomOutIcon.style.display = isZoomed ? 'block' : 'none';
        if (zoomText) zoomText.textContent = isZoomed ? 'Oddal' : 'Powiększ';
    };

    const closeModal = () => {
        if (imgEl) imgEl.classList.remove('zoomed');
        if (zoomInIcon) zoomInIcon.style.display = 'block';
        if (zoomOutIcon) zoomOutIcon.style.display = 'none';
        if (zoomText) zoomText.textContent = 'Powiększ';
        if (typeof window.smoothCloseModal === 'function') {
            window.smoothCloseModal(modal);
        } else {
            modal.style.display = 'none';
            modal.classList.add('is-hidden');
            modal.hidden = true;
        }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (zoomBtn) zoomBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(); });
    if (imgEl) imgEl.addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(); });

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('dl-lightbox-dialog') || e.target.id === 'dlLightboxBody') {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (modal.hidden || modal.style.display === 'none') return;
        if (e.key === 'Escape') {
            closeModal();
        } else if (e.key === 'ArrowLeft') {
            if (window._albumPhotosList && window._albumPhotosList.length > 1 && window._currentLightboxIndex !== undefined) {
                e.preventDefault();
                const total = window._albumPhotosList.length;
                const prevIdx = (window._currentLightboxIndex - 1 + total) % total;
                window.openAlbumLightbox(prevIdx);
            }
        } else if (e.key === 'ArrowRight') {
            if (window._albumPhotosList && window._albumPhotosList.length > 1 && window._currentLightboxIndex !== undefined) {
                e.preventDefault();
                const total = window._albumPhotosList.length;
                const nextIdx = (window._currentLightboxIndex + 1) % total;
                window.openAlbumLightbox(nextIdx);
            }
        }
    });
}

window.openDownloadImageLightbox = function(imageUrl, title, path) {
    const modal = document.getElementById('dlLightboxModal');
    const imgEl = document.getElementById('dlLightboxImg');
    const titleEl = document.getElementById('dlLightboxTitle');
    const counterEl = document.getElementById('dlLightboxCounterText');
    const newTabBtn = document.getElementById('dlLightboxOpenNewTab');
    const prevBtn = document.getElementById('dlLightboxPrevBtn');
    const nextBtn = document.getElementById('dlLightboxNextBtn');
    const dlSingleBtn = document.getElementById('dlLightboxDownloadSingle');

    if (!modal || !imgEl) return;

    window._currentLightboxIndex = undefined;
    imgEl.src = imageUrl;
    imgEl.classList.remove('zoomed');

    if (titleEl) titleEl.textContent = title || 'Podgląd zdjęcia';
    if (counterEl) counterEl.innerHTML = 'Kliknij zdjęcie, aby powiększyć &bull; Klawisz <strong>Esc</strong> zamyka';
    if (newTabBtn) {
        newTabBtn.href = imageUrl;
        newTabBtn.style.display = 'inline-flex';
    }
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    if (dlSingleBtn) {
        if (path && window._activeUnzippedArchive && window._activeUnzippedArchive[path]) {
            dlSingleBtn.style.display = 'inline-flex';
            dlSingleBtn.onclick = () => window.downloadSingleFromArchive(encodeURIComponent(path), encodeURIComponent(title || 'zdjecie.jpg'));
        } else {
            dlSingleBtn.style.display = 'none';
        }
    }

    if (typeof window.smoothOpenModal === 'function') {
        window.smoothOpenModal(modal, 'flex');
    } else {
        modal.hidden = false;
        modal.classList.remove('is-hidden');
        modal.style.display = 'flex';
    }
};

window.openAlbumLightbox = function(index) {
    if (!window._albumPhotosList || !window._albumPhotosList[index]) return;
    window._currentLightboxIndex = index;
    const item = window._albumPhotosList[index];
    const total = window._albumPhotosList.length;

    const modal = document.getElementById('dlLightboxModal');
    const imgEl = document.getElementById('dlLightboxImg');
    const titleEl = document.getElementById('dlLightboxTitle');
    const counterEl = document.getElementById('dlLightboxCounterText');
    const newTabBtn = document.getElementById('dlLightboxOpenNewTab');
    const prevBtn = document.getElementById('dlLightboxPrevBtn');
    const nextBtn = document.getElementById('dlLightboxNextBtn');
    const dlSingleBtn = document.getElementById('dlLightboxDownloadSingle');

    if (!modal || !imgEl) return;

    imgEl.src = item.blobUrl;
    imgEl.classList.remove('zoomed');

    if (titleEl) titleEl.textContent = `[${index + 1}/${total}] ${item.filename}`;
    if (counterEl) counterEl.innerHTML = `Zdjęcie <strong>${index + 1}</strong> z <strong>${total}</strong> &bull; Strzałki <strong>&larr; &rarr;</strong> przewijają album &bull; <strong>Esc</strong> zamyka`;
    if (newTabBtn) {
        newTabBtn.href = item.blobUrl;
        newTabBtn.style.display = 'inline-flex';
    }

    if (dlSingleBtn) {
        dlSingleBtn.style.display = 'inline-flex';
        dlSingleBtn.onclick = () => window.downloadSingleFromArchive(encodeURIComponent(item.path), encodeURIComponent(item.filename));
    }

    if (prevBtn) {
        prevBtn.style.display = total > 1 ? 'flex' : 'none';
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            const prevIdx = (index - 1 + total) % total;
            window.openAlbumLightbox(prevIdx);
        };
    }

    if (nextBtn) {
        nextBtn.style.display = total > 1 ? 'flex' : 'none';
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            const nextIdx = (index + 1) % total;
            window.openAlbumLightbox(nextIdx);
        };
    }

    if (typeof window.smoothOpenModal === 'function') {
        window.smoothOpenModal(modal, 'flex');
    } else {
        modal.hidden = false;
        modal.classList.remove('is-hidden');
        modal.style.display = 'flex';
    }
};

window.previewSingleFromArchive = function(encodedPath, encodedFilename) {
    const path = decodeURIComponent(encodedPath);
    const filename = decodeURIComponent(encodedFilename);
    if (!window._activeUnzippedArchive || !window._activeUnzippedArchive[path]) return;

    if (window._albumPhotosList && window._albumPhotosList.length > 0) {
        const foundIdx = window._albumPhotosList.findIndex(p => p.path === path);
        if (foundIdx !== -1) {
            window.openAlbumLightbox(foundIdx);
            return;
        }
    }

    const data = window._activeUnzippedArchive[path];
    const ext = filename.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : (ext === 'svg' ? 'image/svg+xml' : 'image/jpeg')));
    const blob = new Blob([data], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    window.openDownloadImageLightbox(blobUrl, filename, path);
};

window.downloadSingleFromArchive = function(encodedPath, encodedFilename) {
    const path = decodeURIComponent(encodedPath);
    const filename = decodeURIComponent(encodedFilename);
    if (!window._activeUnzippedArchive || !window._activeUnzippedArchive[path]) return;

    const data = window._activeUnzippedArchive[path];
    const ext = filename.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : (ext === 'gif' ? 'image/gif' : 'application/octet-stream'));
    const blob = new Blob([data], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        try {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch (_) {}
    }, 1000);
};

document.addEventListener('DOMContentLoaded', initDownloadLightboxSystem);

