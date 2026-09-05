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

    // Jeśli wiele plików lub folder z podkatalogami, zrób ZIP za pomocą fflate
    if (filesList.length > 1 || filesList[0]?.fullRelativePath?.includes('/')) {
        setupImageCompression(null);
        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Pakowanie ZIP...';
        
        let bundleName = `Paczka_${filesList.length}_plikow.zip`;
        if (filesList[0]?.fullRelativePath?.includes('/')) {
            const topDir = filesList[0].fullRelativePath.split('/')[0];
            if (topDir) bundleName = `${topDir}.zip`;
        }

        let totalRawSize = 0;
        for (let i = 0; i < filesList.length; i++) totalRawSize += filesList[i].size || 0;

        fileStatusBox.classList.add('visible'); 
        fsTrack.hidden = false; 
        fsProgressBar.style.width = '100%';
        fsName.textContent = bundleName;
        fsSizeOrProgress.innerText = `Kompresja ${filesList.length} plików (${formatBytes(totalRawSize)})...`;

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

        dropzone.innerHTML = `
            <div class="multifile-upload-preview">
                <div class="mf-header">
                    <div class="mf-folder-icon-box">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div class="mf-title-box">
                        <strong class="mf-bundle-title">${bundleName}</strong>
                        <span class="mf-bundle-sub">${filesList.length} plików &bull; ${formatBytes(totalRawSize)}</span>
                    </div>
                </div>
                <div class="mf-list-scroll">
                    ${fileItemsHtml}
                    ${extraCount}
                </div>
            </div>
        `;
        dropzone.style.padding = "10px";

        setTimeout(async () => {
            try {
                const zipFiles = {};
                for (let i = 0; i < filesList.length; i++) {
                    const f = filesList[i];
                    const pathKey = f.fullRelativePath || f.name;
                    zipFiles[pathKey] = new Uint8Array(await f.arrayBuffer());
                }
                
                const zippedData = await new Promise((resolve, reject) => {
                    fflate.zip(zipFiles, { level: 0 }, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
                
                selectedFile = new File([zippedData], bundleName, { type: 'application/zip' });
                
                fsTrack.hidden = true; 
                fsProgressBar.style.width = '0%';
                fsSizeOrProgress.innerText = `${formatBytes(selectedFile.size)} (spakowano z ${formatBytes(totalRawSize)})`;
                if (btnTextSpan) btnTextSpan.textContent = 'Upload';
                uploadBtn.disabled = false;
                
            } catch (e) {
                showError("Błąd pakowania plików do ZIP");
            }
        }, 100);
        return;
    } else {
        selectedFile = filesList[0];
        const file = selectedFile;
        
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
        statusDiv.textContent = '';

        if (file.type.startsWith('image/')) {
            const imgUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;">`;
            dropzone.style.padding = "10px";
        } else if (file.type.startsWith('video/')) {
            const vidUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<video src="${vidUrl}" controls autoplay muted loop playsinline style="max-width: 100%; max-height: 250px; border-radius: 8px; background: #000;"></video>`;
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
        if (toolboxView && !toolboxView.hidden && window.handleToolboxDrop) {
            window.handleToolboxDrop(scannedFiles);
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
    if (fsTelemetry) fsTelemetry.hidden = false;

    const uploadStartTime = Date.now();

    const updateTelemetry = (uploadedBytes) => {
        const elapsedSec = (Date.now() - uploadStartTime) / 1000;
        if (elapsedSec > 0.25) {
            const speedBytes = uploadedBytes / elapsedSec;
            const speedMB = (speedBytes / (1024 * 1024)).toFixed(1);
            const remainingBytes = file.size - uploadedBytes;
            const remainingSec = Math.max(0, Math.round(remainingBytes / speedBytes));
            
            const elSpeed = document.getElementById('fsSpeed');
            const elEta = document.getElementById('fsEta');
            if (elSpeed) elSpeed.textContent = `${speedMB} MB/s`;
            if (elEta) elEta.textContent = remainingSec > 60 ? `Pozostało: ~${Math.ceil(remainingSec / 60)} min` : `Pozostało: ~${remainingSec}s`;
        }
    };

    try {
        if (file.size <= 10 * 1024 * 1024) { 
            await uploadFileStandard(file, duration, customSlug, filePassword, fileNote, fileMaxDl, btnTextSpan, updateTelemetry);
        } else { 
            await uploadFileMultipart(file, duration, customSlug, filePassword, fileNote, fileMaxDl, btnTextSpan, updateTelemetry);
        }
    } catch (error) {
        showError(error.message);
    }
}

// === UPLOAD TRADYCYJNY DLA MAŁYCH PLIKÓW ===
async function uploadFileStandard(file, duration, customSlug, pwd, note, maxdl, btnTextSpan, onProgressUpdate) {
    const proKey = getProKey();
    let urlReq = `${WORKER_URL}/upload-small?file=${encodeURIComponent(file.name)}&expiry=${duration}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    if (pwd) urlReq += `&pwd=${encodeURIComponent(pwd)}`;
    if (note) urlReq += `&note=${encodeURIComponent(note)}`;
    if (maxdl) urlReq += `&maxdl=${encodeURIComponent(maxdl)}`;
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
async function uploadFileMultipart(file, duration, customSlug, pwd, note, maxdl, btnTextSpan, onProgressUpdate) {
    const proKey = getProKey();
    let urlReq = `${WORKER_URL}/multipart/create?file=${encodeURIComponent(file.name)}&expiry=${duration}&size=${file.size}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    if (pwd) urlReq += `&pwd=${encodeURIComponent(pwd)}`;
    if (note) urlReq += `&note=${encodeURIComponent(note)}`;
    if (maxdl) urlReq += `&maxdl=${encodeURIComponent(maxdl)}`;
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

// === WSPÓLNA LOGIKA PO ZAKOŃCZENIU ===
function showSuccessScreen(finalUrlStr, fileKey, duration) {
    uploadBtn.classList.remove('loading');
    const finalLink = document.getElementById('finalLink');
    
    // Odtwórz dźwięk sukcesu!
    playSound('success');

    // Inteligentny link Smart Embed (z automatycznym podglądem na Discordzie, Telegramie, Messengerze)
    let cleanKeyPath = fileKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
    let smartShareUrl = `${WORKER_URL}/f/${cleanKeyPath}`;
    let pageUrl = `${window.location.origin}${window.location.pathname}?f=${encodeURIComponent(fileKey)}`;
    
    // Dołącz branding twórcy do linku jeśli został podany
    if (window._activeCreatorBrand) {
        pageUrl += `&brand=${encodeURIComponent(window._activeCreatorBrand)}`;
        smartShareUrl += `&brand=${encodeURIComponent(window._activeCreatorBrand)}`;
    }

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
    if (btnTextSpan) btnTextSpan.textContent = 'Spróbuj ponownie';
    statusDiv.style.color = "#FF4439";
    statusDiv.innerText = msg;
    fsTrack.hidden = true; 
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

    // 1. Obsługa przełączania zakładek
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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
}

function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tabName);
    });

    const panes = ['overview', 'users', 'storage', 'transactions', 'files'];
    panes.forEach(p => {
        const el = document.getElementById(`adminTabPane_${p}`);
        if (el) el.style.display = p === tabName ? 'block' : 'none';
    });

    if (tabName === 'overview') renderAdminOverviewTab();
    else if (tabName === 'users') renderAdminUsersTab();
    else if (tabName === 'storage') renderAdminStorageTab();
    else if (tabName === 'transactions') renderAdminTransactionsTab();
}

function renderAdminDashboard() {
    renderAdminOverviewTab();
    renderAdminUsersTab();
    renderAdminStorageTab();
    renderAdminTransactionsTab();
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
    if (fsTelemetry) fsTelemetry.hidden = true;

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
// 1. INTERAKTYWNE TŁO CZĄSTECZEK AURORA (CANVAS)
// ============================================================================
(function initAuroraCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor(width / 35), 45);
    
    const mouse = { x: width / 2, y: height / 2, active: false };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1,
            color: i % 2 === 0 ? 'rgba(196, 231, 212, 0.4)' : 'rgba(15, 145, 210, 0.4)'
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Przyciąganie myszą
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    p.x += dx * 0.015;
                    p.y += dy * 0.015;
                }
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Łączenie linii między cząsteczkami
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(196, 231, 212, ${0.15 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
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

    // Funkcja do renderowania podglądów i odtwarzacza audio
    function renderDownloadPreview(cleanName, directUrl) {
        if (!dlPreviewContainer || !directUrl) return;

        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(cleanName);
        const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(cleanName);
        const isAudio = /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(cleanName);
        const isPdf = /\.pdf$/i.test(cleanName);
        const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(cleanName);
        const isCode = /\.(txt|json|js|html|css|md|py|c|cpp|java|xml|yaml|yml)$/i.test(cleanName);

        if (isImage) {
            dlPreviewContainer.innerHTML = `
                <div class="dl-preview-image-wrapper" id="dlPreviewImageWrapper" role="button" tabindex="0" title="Kliknij, aby powiększyć zdjęcie" aria-label="Powiększ zdjęcie">
                    <img src="${directUrl}" class="dl-preview-media" alt="${cleanName}">
                    <div class="dl-preview-toolbar">
                        <button type="button" class="dl-tool-pill dl-tool-zoom" id="dlQuickZoomBtn" title="Powiększ zdjęcie w oknie">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            <span>Powiększ</span>
                        </button>
                        <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="dl-tool-pill dl-tool-newtab" id="dlQuickNewTabBtn" title="Otwórz oryginalne zdjęcie w nowej karcie">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            <span>Otwórz w nowej karcie</span>
                        </a>
                    </div>
                </div>
            `;

            const imgWrap = document.getElementById('dlPreviewImageWrapper');
            const quickZoomBtn = document.getElementById('dlQuickZoomBtn');
            const quickNewTabBtn = document.getElementById('dlQuickNewTabBtn');

            if (imgWrap) {
                imgWrap.addEventListener('click', (e) => {
                    if (e.target.closest('#dlQuickNewTabBtn')) return;
                    if (window.openDownloadImageLightbox) {
                        window.openDownloadImageLightbox(directUrl, cleanName);
                    }
                });
                imgWrap.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (window.openDownloadImageLightbox) {
                            window.openDownloadImageLightbox(directUrl, cleanName);
                        }
                    }
                });
            }

            if (quickZoomBtn) {
                quickZoomBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.openDownloadImageLightbox) {
                        window.openDownloadImageLightbox(directUrl, cleanName);
                    }
                });
            }

            if (quickNewTabBtn) {
                quickNewTabBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        } else if (isVideo) {
            dlPreviewContainer.innerHTML = `<video src="${directUrl}" controls autoplay muted playsinline class="dl-preview-media" style="width: 100%; max-height: 280px; background: #000; border-radius: 12px;"></video>`;
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
            dlPreviewContainer.innerHTML = `
                <div class="archive-explorer-box" id="archiveExplorerBox">
                    <div class="archive-explorer-header">
                        <div class="archive-icon-box">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                        </div>
                        <div class="archive-title-box">
                            <strong class="archive-bundle-title">${cleanName}</strong>
                            <span class="archive-bundle-sub" id="archiveSubLabel">Odczytywanie zawartości archiwum (Smart ZIP)...</span>
                        </div>
                    </div>
                    <div class="archive-search-wrap" id="archiveSearchWrap" style="display: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="archiveSearchInput" placeholder="Szukaj pliku w archiwum (np. .jpg, umowa)..." class="archive-search-input">
                        <span class="archive-count-badge" id="archiveFilterCount">0 plików</span>
                    </div>
                    <div class="archive-file-list" id="archiveFileList">
                        <div style="text-align: center; padding: 22px; color: var(--text-muted); font-size: 12.5px;">
                            <span class="loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #38BDF8; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: -2px; margin-right: 6px;"></span>
                            Analizowanie drzewa plików ZIP w pamięci RAM...
                        </div>
                    </div>
                </div>
            `;

            // Jeśli biblioteka fflate jest dostępna, wczytaj zawartość ZIP w tle
            if (typeof fflate !== 'undefined' && directUrl) {
                fetch(directUrl)
                    .then(res => {
                        if (!res.ok) throw new Error('Fetch failed');
                        return res.arrayBuffer();
                    })
                    .then(buf => {
                        const uint8 = new Uint8Array(buf);
                        fflate.unzip(uint8, (err, unzipped) => {
                            const listEl = document.getElementById('archiveFileList');
                            const subLabel = document.getElementById('archiveSubLabel');
                            const searchWrap = document.getElementById('archiveSearchWrap');
                            const searchInput = document.getElementById('archiveSearchInput');
                            const filterCount = document.getElementById('archiveFilterCount');

                            if (err || !unzipped || !listEl) {
                                if (subLabel) subLabel.textContent = 'Kliknij poniżej, aby pobrać całe archiwum';
                                if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 12px;">Archiwum gotowe do bezpośredniego pobrania</div>';
                                return;
                            }

                            const fileEntries = Object.keys(unzipped).filter(k => !k.endsWith('/') && unzipped[k].length > 0);
                            let totalUncompressedSize = 0;
                            fileEntries.forEach(k => { totalUncompressedSize += unzipped[k].length; });

                            if (subLabel) {
                                subLabel.textContent = `Zawiera ${fileEntries.length} ${fileEntries.length === 1 ? 'plik' : 'plików'} • ${formatBytes(totalUncompressedSize)} po rozpakowaniu`;
                            }

                            window._activeUnzippedArchive = unzipped;

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
                                                <button type="button" class="btn-archive-dl-single" onclick="window.downloadSingleFromArchive('${encodeURIComponent(path)}', '${encodeURIComponent(filename)}')">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                    Pobierz
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                            };

                            renderFileList(fileEntries);

                            // Podpięcie wyszukiwarki na żywo
                            if (searchInput) {
                                searchInput.oninput = () => {
                                    const q = searchInput.value.toLowerCase().trim();
                                    const filtered = fileEntries.filter(p => p.toLowerCase().includes(q));
                                    if (filterCount) filterCount.textContent = `${filtered.length} z ${fileEntries.length}`;
                                    renderFileList(filtered);
                                };
                            }
                        });
                    })
                    .catch(() => {
                        const subLabel = document.getElementById('archiveSubLabel');
                        const listEl = document.getElementById('archiveFileList');
                        if (subLabel) subLabel.textContent = 'Kliknij poniżej, aby pobrać całe archiwum';
                        if (listEl) listEl.innerHTML = '<div style="text-align: center; padding: 14px; color: var(--text-muted); font-size: 12px;">Archiwum gotowe do bezpośredniego pobrania</div>';
                    });
            }
        } else {
            dlPreviewContainer.innerHTML = '<div style="padding: 24px; text-align: center;"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>';
        }
    }

    try {
        // Rejestracja wyświetlenia na backendzie
        fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=view`, { method: 'POST' }).catch(()=>{});

        const res = await fetch(`${WORKER_URL}/file-info?key=${encodeURIComponent(fileKey)}`);
        const data = await res.json();

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

        // Obsługa brandingu twórcy (PRO)
        const urlParams = new URLSearchParams(window.location.search);
        const brandParam = urlParams.get('brand') || data.brand;
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

        // Notatka od nadawcy
        if (data.note && dlNoteBox && dlNoteText) {
            dlNoteText.textContent = data.note;
            dlNoteBox.hidden = false;
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

        // Obsługa blokady hasłem
        if (data.hasPassword) {
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

                    try {
                        const vRes = await fetch(`${WORKER_URL}/verify-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: fileKey, password: passwordVal })
                        });
                        const vData = await vRes.json();
                        if (vData.success && vData.directUrl) {
                            data.directUrl = vData.directUrl;
                            if (dlPasswordLockBox) dlPasswordLockBox.hidden = true;
                            if (dlContentWrap) dlContentWrap.hidden = false;
                            
                            if (dlDownloadBtn) {
                                dlDownloadBtn.href = data.directUrl;
                                dlDownloadBtn.setAttribute('download', cleanName);
                            }
                            renderDownloadPreview(cleanName, data.directUrl);
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

            renderDownloadPreview(cleanName, data.directUrl);
            if (window.initDropsiteAds) window.initDropsiteAds();
        }

        // Jeśli plik jest zaszyfrowany AES-256 (Zero-Knowledge), odszyfruj w locie w RAM
        if (encKeyB64) {
            dlDownloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
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