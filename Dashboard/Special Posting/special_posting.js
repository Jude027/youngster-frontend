// ── Theme ────────────────────────────────────────────────────────────────────
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function initializeSidebar() {
    const menuBtn  = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('overlay');

    if (!menuBtn || !sidebar || !overlay) return;

    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.classList.add('sidebar-open');
    });

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }

    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    document.querySelectorAll('.menu-item:not(#ordersMenu)').forEach(item => {
        item.addEventListener('click', () => closeSidebar());
    });

    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug   = localStorage.getItem('storeSlug') || new URLSearchParams(window.location.search).get('store') || '';
            const client = localStorage.getItem('clientType') || new URLSearchParams(window.location.search).get('client') || '';
            let url = '../dashboard2.html';
            if (slug)   url += '?store='  + encodeURIComponent(slug);
            if (client) url += (slug ? '&' : '?') + 'client=' + encodeURIComponent(client);
            window.location.href = url;
        });
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function initializeLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            setTimeout(() => { window.location.href = '../index.html'; }, 1500);
        }
    });
}

// ── Store branding ────────────────────────────────────────────────────────────
async function applyUserStoreBranding() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('https://youngster-backend.vercel.app/api/store-settings', {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) return;
        const store = await res.json();
        if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);
        const titleEl = document.getElementById('sidebarTitle');
        if (titleEl) titleEl.textContent = store.storeName;
        const logoEl = document.getElementById('sidebarLogo');
        if (logoEl && store.storeLogo) {
            logoEl.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (logoEl && store.storeName) {
            logoEl.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${store.storeName.charAt(0).toUpperCase()}</span>`;
        }
    } catch (_) {}
}

// ── WhatsApp floating button ──────────────────────────────────────────────────
function initializeWhatsApp() {
    const btn     = document.getElementById('whatsappBtn');
    const options = document.getElementById('whatsappOptions');
    const closeWa = document.getElementById('whatsappClose');

    if (!btn || !options) return;

    btn.addEventListener('click', () => options.classList.toggle('open'));
    if (closeWa) closeWa.addEventListener('click', () => options.classList.remove('open'));

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        const float = document.getElementById('whatsappFloat');
        if (float && !float.contains(e.target)) options.classList.remove('open');
    });

    // Protect links from storefront-inject override — restore after inject runs
    // by using unique IDs (spWaGroupLink / spWaAdminLink) that inject doesn't touch.
    // Links are already hardcoded in HTML; nothing extra needed here.
}

// ── Dynamic price loading ─────────────────────────────────────────────────────
let postingPrice = 0; // set to 0 so the fee badge shows blank until loaded

async function loadPostingPrice() {
    const params     = new URLSearchParams(window.location.search);
    const store      = params.get('store')  || localStorage.getItem('storeSlug')  || '';
    const clientType = params.get('client') || localStorage.getItem('clientType') || 'Customers';

    if (!store) return;

    try {
        const res = await fetch(
            `https://youngster-backend.vercel.app/api/storefront-prices` +
            `?store=${encodeURIComponent(store)}&clientType=${encodeURIComponent(clientType)}`
        );
        if (!res.ok) return;
        const prices = await res.json();

        const entry = prices.find(p =>
            (p.provider || '').trim().toLowerCase() === 'special posting'
        );
        if (!entry) return;

        postingPrice = parseFloat(entry.price);
        const feeEl = document.getElementById('registrationFee');
        if (feeEl) feeEl.textContent = `Service Fee: GHS ${postingPrice.toFixed(2)}`;
    } catch (_) {}
}

// ── Field validation helpers ──────────────────────────────────────────────────
function showFieldError(id, msg) {
    const el = document.getElementById(id + '-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    const input = document.getElementById(id);
    if (input) input.style.borderColor = '#ef4444';
}
function clearFieldError(id) {
    const el = document.getElementById(id + '-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
    const input = document.getElementById(id);
    if (input) input.style.borderColor = '';
}
function clearAllFieldErrors() {
    ['fullname','phone','nssNumber','placeOfPosting','district','region'].forEach(clearFieldError);
}

function validateForm() {
    let valid = true;
    clearAllFieldErrors();

    const fullname = document.getElementById('fullname')?.value.trim();
    if (!fullname) { showFieldError('fullname', 'Full name is required'); valid = false; }

    const phone = document.getElementById('phone')?.value.trim();
    if (!phone || !/^0\d{9}$/.test(phone.replace(/\s/g, ''))) {
        showFieldError('phone', 'Enter a valid 10-digit Ghanaian phone number');
        valid = false;
    }

    const nss = document.getElementById('nssNumber')?.value.trim();
    if (!nss) { showFieldError('nssNumber', 'NSS Number is required'); valid = false; }

    const posting = document.getElementById('placeOfPosting')?.value.trim();
    if (!posting) { showFieldError('placeOfPosting', 'Place of posting is required'); valid = false; }

    const district = document.getElementById('district')?.value.trim();
    if (!district) { showFieldError('district', 'District is required'); valid = false; }

    const region = document.getElementById('region')?.value;
    if (!region) { showFieldError('region', 'Please select a region'); valid = false; }

    return valid;
}

// ── Payment modal (same 3-step MoMo flow as MTN AFA) ─────────────────────────
function showPaymentModal(orderDetails) {
    const existing = document.getElementById('moolrePayModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'moolrePayModal';
    modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);
            display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;">
            <div style="background:#fff;border-radius:16px;padding:28px 24px;
                max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;">

                <div style="text-align:center;margin-bottom:20px;">
                    <div style="width:56px;height:56px;background:linear-gradient(135deg,#f7971e,#ffd200);
                        border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <i class="fas fa-mobile-alt" style="color:#fff;font-size:22px;"></i>
                    </div>
                    <h2 style="margin:0;font-size:18px;color:#1a1a2e;">Mobile Money Payment</h2>
                    <p style="margin:6px 0 0;color:#666;font-size:13px;">Enter the MoMo number to charge</p>
                </div>

                <div style="background:#f8f9ff;border-radius:10px;padding:12px 16px;margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#666;font-size:13px;">Service</span>
                        <span style="font-weight:600;font-size:13px;">${orderDetails.bundle_size}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#666;font-size:13px;">Phone</span>
                        <span style="font-weight:600;font-size:13px;">${orderDetails.beneficiary}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:4px;">
                        <span style="color:#666;font-size:14px;font-weight:600;">Amount</span>
                        <span style="font-weight:700;font-size:16px;color:#f7971e;">GHS ${parseFloat(orderDetails.amount).toFixed(2)}</span>
                    </div>
                </div>

                <!-- Step 1: enter MoMo details -->
                <div id="payModalStep1">
                    <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px;">
                        Your MoMo Payment Network
                    </label>
                    <select id="momoNetwork" style="width:100%;box-sizing:border-box;padding:12px;
                        border:2px solid #e0e0e0;border-radius:8px;font-size:14px;background:#fff;margin-bottom:12px;">
                        <option value="MTN">MTN</option>
                        <option value="Telecel">Telecel</option>
                        <option value="AirtelTigo">AirtelTigo</option>
                    </select>
                    <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px;">
                        Your MoMo Phone Number
                    </label>
                    <input type="tel" id="momoPhone" placeholder="0XX XXX XXXX" inputmode="numeric" maxlength="10"
                        style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e0e0e0;
                        border-radius:8px;font-size:15px;outline:none;margin-bottom:16px;">
                    <button id="momoPayBtn" style="width:100%;padding:14px;
                        background:linear-gradient(135deg,#f7971e,#ffd200);
                        color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-paper-plane"></i> Send Payment Prompt
                    </button>
                    <button id="momoCancel" style="width:100%;padding:10px;background:transparent;color:#888;
                        border:none;font-size:13px;cursor:pointer;margin-top:8px;">Cancel</button>
                </div>

                <!-- Step 2: waiting -->
                <div id="payModalStep2" style="display:none;text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:36px;color:#f7971e;margin-bottom:16px;"></i>
                    <h3 style="margin:0 0 8px;color:#1a1a2e;">Waiting for payment…</h3>
                    <p id="payModalMsg" style="color:#666;font-size:13px;margin:0 0 16px;">
                        Check your phone and enter your MoMo PIN to approve.</p>
                    <button id="momoCancelWait" style="padding:10px 24px;background:transparent;color:#e74c3c;
                        border:1px solid #e74c3c;border-radius:8px;font-size:13px;cursor:pointer;">Cancel</button>
                </div>

                <!-- Step 3: result -->
                <div id="payModalStep3" style="display:none;text-align:center;">
                    <div id="payResultIcon" style="font-size:48px;margin-bottom:12px;"></div>
                    <h3 id="payResultTitle" style="margin:0 0 8px;"></h3>
                    <p id="payResultMsg" style="color:#666;font-size:13px;margin:0 0 20px;"></p>
                    <button id="payResultClose" style="padding:12px 32px;
                        background:linear-gradient(135deg,#f7971e,#ffd200);
                        color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Done</button>
                </div>

            </div>
        </div>`;

    document.body.appendChild(modal);

    const step1    = document.getElementById('payModalStep1');
    const step2    = document.getElementById('payModalStep2');
    const step3    = document.getElementById('payModalStep3');
    const momoPhone = document.getElementById('momoPhone');
    momoPhone.value = '';
    momoPhone.addEventListener('input', () => { momoPhone.value = momoPhone.value.replace(/[^0-9]/g, ''); });

    document.getElementById('momoCancel').addEventListener('click', () => modal.remove());
    document.getElementById('momoCancelWait').addEventListener('click', () => modal.remove());
    document.getElementById('payResultClose').addEventListener('click', () => modal.remove());

    document.getElementById('momoPayBtn').addEventListener('click', async () => {
        const phone   = momoPhone.value.trim();
        const network = document.getElementById('momoNetwork').value;

        if (!phone || phone.length !== 10) {
            momoPhone.style.border = '2px solid #e74c3c';
            momoPhone.focus();
            return;
        }
        momoPhone.style.border = '2px solid #e0e0e0';
        step1.style.display = 'none';
        step2.style.display = 'block';

        const API_BASE = 'https://youngster-backend.vercel.app/api';
        const token    = localStorage.getItem('token');
        const headers  = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE}/payment/initiate`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    gatewayName:     'Moolre',
                    phoneNumber:     phone,
                    beneficiary:     orderDetails.beneficiary,
                    amount:          orderDetails.amount,
                    provider:        network,
                    paymentNetwork:  network,
                    orderProvider:   'Special Posting',
                    packageProvider: 'Special Posting',
                    description:     'Special Posting',
                    packageName:     'Special Posting',
                    bundle_size:     'Special Posting',
                    storeSlug:       new URLSearchParams(window.location.search).get('store') || localStorage.getItem('storeSlug') || '',
                    clientType:      localStorage.getItem('clientType') || 'Customers',
                    referralToken: localStorage.getItem('referralToken') || new URLSearchParams(window.location.search).get('ref') || null,
                    guestSessionId:  localStorage.getItem('guestSessionId') || '',
                    extra:           orderDetails.extra || {},
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Payment initiation failed');

            const transactionId = data.transactionId;

            if (data.requiresOtp) {
                const returnUrl = window.location.pathname + window.location.search;
                localStorage.setItem('otpTransactionId', transactionId);
                localStorage.setItem('otpPhoneNumber',   phone);
                localStorage.setItem('otpReturnUrl',     returnUrl);
                modal.remove();
                window.location.href =
                    `../payment-otp.html?txid=${encodeURIComponent(transactionId)}` +
                    `&phone=${encodeURIComponent(phone)}` +
                    `&return=${encodeURIComponent(returnUrl)}`;
                return;
            }

            // Poll for payment status
            const deadline = Date.now() + 180000;
            const poll = async () => {
                try {
                    const r = await fetch(`${API_BASE}/payment/status/${transactionId}`, { headers });
                    const d = await r.json();
                    const status = (d.status || d.transaction?.status || 'pending').toLowerCase();

                    document.getElementById('payModalMsg').textContent =
                        status === 'pending'    ? 'Waiting for MoMo PIN approval…' :
                        status === 'processing' ? 'Processing your payment…'       : 'Checking…';

                    if (status === 'success') {
                        showResult(true,  '✅', 'Payment Successful!',  'Your Special Posting request has been submitted.');
                    } else if (status === 'failed' || status === 'cancelled') {
                        showResult(false, '❌', 'Payment Failed',        'Payment not completed. Please try again.');
                    } else if (Date.now() >= deadline) {
                        showResult(false, '⏱️', 'Timed Out',             'No response. Contact support if you approved the payment.');
                    } else {
                        setTimeout(poll, 10000);
                    }
                } catch { if (Date.now() < deadline) setTimeout(poll, 10000); }
            };
            setTimeout(poll, 15000);

        } catch (err) {
            step2.style.display = 'none';
            step1.style.display = 'block';
            alert(err.message || 'Could not initiate payment. Please try again.');
        }

        function showResult(success, icon, title, msg) {
            step2.style.display = 'none';
            step3.style.display = 'block';
            document.getElementById('payResultIcon').textContent  = icon;
            document.getElementById('payResultTitle').textContent = title;
            document.getElementById('payResultTitle').style.color = success ? '#27ae60' : '#e74c3c';
            document.getElementById('payResultMsg').textContent   = msg;
        }
    });
}

// ── Initialise ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    applyUserStoreBranding();
    initializeWhatsApp();

    localStorage.setItem('providerName', 'Special Posting');

    loadPostingPrice();

    // Notification close button
    const notifClose = document.getElementById('notificationClose');
    if (notifClose) notifClose.addEventListener('click', () => {
        document.getElementById('notification')?.classList.remove('show');
    });

    // Real-time field clearing on input
    ['fullname','phone','nssNumber','placeOfPosting','district'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearFieldError(id));
    });
    const regionEl = document.getElementById('region');
    if (regionEl) regionEl.addEventListener('change', () => clearFieldError('region'));

    // ── Form submission ────────────────────────────────────────────────────────
    const form = document.getElementById('registrationForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!validateForm()) return;

        const formData = {
            fullname:       document.getElementById('fullname').value.trim(),
            phone:          document.getElementById('phone').value.trim(),
            nssNumber:      document.getElementById('nssNumber').value.trim(),
            placeOfPosting: document.getElementById('placeOfPosting').value.trim(),
            district:       document.getElementById('district').value.trim(),
            region:         document.getElementById('region').value,
        };

        showPaymentModal({
            beneficiary: formData.phone,
            package:     'Special Posting',
            bundle_size: 'Special Posting',
            amount:      postingPrice,
            extra:       formData,
        });

        // Reset form immediately after opening modal
        form.reset();
        clearAllFieldErrors();
    });

    // Inject helper styles for field errors
    const style = document.createElement('style');
    style.textContent = `
        .field-error {
            color: #ef4444; font-size: 0.85rem;
            margin-top: 4px; display: none;
        }
        input.error, select.error { border-color: #ef4444 !important; }
    `;
    document.head.appendChild(style);
});
