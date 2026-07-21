// Generic Package Page - Works for any provider
// Loads provider name and logo from URL parameters

let providerName = '';

// Auto-detect theme from dashboard
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// Sidebar functionality
function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (!menuBtn || !sidebar || !overlay) {
        console.warn('Sidebar elements not found');
        return;
    }
    
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
    
    // Dashboard link — navigate back to dashboard
    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug = localStorage.getItem('storeSlug');
            const base = 'dashboard2.html';
            window.location.href = slug ? base + '?store=' + encodeURIComponent(slug) : base;
        });
    }
}

// Check authentication on page load
function checkAuthentication() {
    const isReferralVisit = window.location.pathname.includes('/referral/') ||
                        new URLSearchParams(window.location.search).get('store');
    if (isReferralVisit) return true;

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    
    if (isLoggedIn !== 'true' || !username) {
        console.log('No active session found. Redirecting to login...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
        return false;
    }
    
    return true;
}

// Load provider logo and set page title
function loadProviderInfo() {
    const params = new URLSearchParams(window.location.search);
    providerName = params.get('provider') || 'Provider';
    let logoUrl = params.get('logo') || '';
    if (!logoUrl) {
        try {
            logoUrl = localStorage.getItem(`logo_${providerName}`) || '';
        } catch (_) {}
    }
    
    // Set page title and subtitle
    document.getElementById('pageTitle').textContent = `Purchase ${providerName} Bundle`;
    document.getElementById('pageSubtitle').textContent = `Get your ${providerName} data bundle now`;
    document.title = `Purchase ${providerName} Bundle`;
    
    // Set provider logo
    const logoDiv = document.getElementById('providerLogoDiv');
    if (logoUrl) {
        logoDiv.innerHTML = `<img src="${logoUrl}" alt="${providerName} Logo" style="width: 60px; height: 60px; object-fit: contain;">`;
    } else {
        // Default logo placeholder
        logoDiv.innerHTML = `<div style="width: 60px; height: 60px; background: var(--accent-gradient); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin: 0 auto;">${providerName.charAt(0).toUpperCase()}</div>`;
    }
}

// Function to load user's store branding
async function applyUserStoreBranding() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${window.getYoungsterApiBase ? window.getYoungsterApiBase() : 'http://localhost:5000/api'}/store-settings`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) return;
        
        const store = await response.json();

        // Cache slug so dashboard link navigates back with ?store= param
        if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);

        // Apply store branding to sidebar
        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle) sidebarTitle.textContent = store.storeName;

        const sidebarLogo = document.getElementById('sidebarLogo');
        if (sidebarLogo && store.storeLogo) {
            sidebarLogo.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (sidebarLogo && store.storeName) {
            sidebarLogo.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${store.storeName.charAt(0).toUpperCase()}</span>`;
        }
    } catch (err) {
        console.warn('Could not load user store details:', err);
    }
}

// ── Moolre Payment Modal ───────────────────────────────────────────────────────
// Same modal used by mtn (6).js — works for all networks.
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
                    <div style="width:56px;height:56px;background:linear-gradient(135deg,#6a11cb,#2575fc);
                        border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <i class="fas fa-mobile-alt" style="color:#fff;font-size:22px;"></i>
                    </div>
                    <h2 style="margin:0;font-size:18px;color:#1a1a2e;">Mobile Money Payment</h2>
                    <p style="margin:6px 0 0;color:#666;font-size:13px;">Enter the MoMo number to charge</p>
                </div>

                <div style="background:#f8f9ff;border-radius:10px;padding:12px 16px;margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#666;font-size:13px;">Bundle</span>
                        <span style="font-weight:600;font-size:13px;">${orderDetails.bundle_size}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#666;font-size:13px;">Recipient</span>
                        <span style="font-weight:600;font-size:13px;">${orderDetails.beneficiary}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-top:1px solid #e0e0e0;padding-top:8px;margin-top:4px;">
                        <span style="color:#666;font-size:14px;font-weight:600;">Amount</span>
                        <span style="font-weight:700;font-size:16px;color:#6a11cb;">GHS ${parseFloat(orderDetails.amount).toFixed(2)}</span>
                    </div>
                </div>

                <div id="payModalStep1">
                    <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px;">MoMo Phone Number</label>
                    <input type="tel" id="momoPhone" placeholder="0XX XXX XXXX" inputmode="numeric" maxlength="10"
                        style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e0e0e0;
                        border-radius:8px;font-size:15px;outline:none;margin-bottom:12px;">
                    <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px;">Network</label>
                    <select id="momoNetwork" style="width:100%;box-sizing:border-box;padding:12px;
                        border:2px solid #e0e0e0;border-radius:8px;font-size:14px;background:#fff;margin-bottom:6px;">
                        <option value="MTN">MTN</option>
                        <option value="Telecel">Telecel</option>
                        <option value="AirtelTigo">AirtelTigo</option>
                    </select>
                    <p style="font-size:12px;color:#888;margin:0 0 16px;">A payment prompt will be sent to this number.</p>
                    <button id="momoPayBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#6a11cb,#2575fc);
                        color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-paper-plane"></i> Send Payment Prompt
                    </button>
                    <button id="momoCancel" style="width:100%;padding:10px;background:transparent;color:#888;
                        border:none;font-size:13px;cursor:pointer;margin-top:8px;">Cancel</button>
                </div>

                <div id="payModalStep2" style="display:none;text-align:center;">
                    <i class="fas fa-spinner fa-spin" style="font-size:36px;color:#6a11cb;margin-bottom:16px;"></i>
                    <h3 style="margin:0 0 8px;color:#1a1a2e;">Waiting for payment...</h3>
                    <p id="payModalMsg" style="color:#666;font-size:13px;margin:0 0 16px;">
                        Check your phone and enter your MoMo PIN to approve.</p>
                    <button id="momoCancelWait" style="padding:10px 24px;background:transparent;color:#e74c3c;
                        border:1px solid #e74c3c;border-radius:8px;font-size:13px;cursor:pointer;">Cancel</button>
                </div>

                <div id="payModalStep3" style="display:none;text-align:center;">
                    <div id="payResultIcon" style="font-size:48px;margin-bottom:12px;"></div>
                    <h3 id="payResultTitle" style="margin:0 0 8px;"></h3>
                    <p id="payResultMsg" style="color:#666;font-size:13px;margin:0 0 20px;"></p>
                    <button id="payResultClose" style="padding:12px 32px;background:linear-gradient(135deg,#6a11cb,#2575fc);
                        color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Done</button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modal);

    const step1 = document.getElementById('payModalStep1');
    const step2 = document.getElementById('payModalStep2');
    const step3 = document.getElementById('payModalStep3');
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

        const API_BASE = 'https://youngster-backend-production.up.railway.app/api';
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let transactionId = null;

        function showResult(success, icon, title, message) {
            step2.style.display = 'none';
            step3.style.display = 'block';
            document.getElementById('payResultIcon').textContent = icon;
            document.getElementById('payResultTitle').textContent = title;
            document.getElementById('payResultTitle').style.color = success ? '#27ae60' : '#e74c3c';
            document.getElementById('payResultMsg').textContent = message;
        }

        try {
            const res = await fetch(`${API_BASE}/payment/initiate`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    gatewayName:    'Moolre',
                    phoneNumber:    phone,
                    beneficiary:    orderDetails.beneficiary,
                    amount:         orderDetails.amount,
                    provider:       network,
                    orderProvider:  orderDetails.package,
                    packageProvider: orderDetails.package,
                    description:    `${orderDetails.package} ${orderDetails.bundle_size}`,
                    packageName:    orderDetails.bundle_size,
                    bundle_size:    orderDetails.bundle_size,
                    storeSlug:      new URLSearchParams(window.location.search).get('store') || localStorage.getItem('storeSlug') || '',
                    clientType:     localStorage.getItem('clientType') || 'Customers',
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Payment initiation failed');

            transactionId = data.transactionId;

            if (data.requiresOtp) {
                const returnUrl = window.location.pathname + window.location.search;
                localStorage.setItem('otpTransactionId', transactionId);
                localStorage.setItem('otpPhoneNumber', phone);
                localStorage.setItem('otpReturnUrl', returnUrl);
                modal.remove();
                window.location.href = `./payment-otp.html?txid=${encodeURIComponent(transactionId)}&phone=${encodeURIComponent(phone)}&return=${encodeURIComponent(returnUrl)}`;
                return;
            }

            const deadline = Date.now() + 180000;
            const poll = async () => {
                try {
                    const r = await fetch(`${API_BASE}/payment/status/${transactionId}`, { headers });
                    const d = await r.json();
                    const status = (d.status || d.transaction?.status || 'pending').toLowerCase();
                    document.getElementById('payModalMsg').textContent =
                        status === 'pending' ? 'A USSD prompt has been sent. Enter your MoMo PIN to approve.' :
                        status === 'processing' ? 'Processing your payment…' : 'Checking payment…';
                    if (status === 'success') {
                        showResult(true, '✅', 'Payment Successful!', `Your ${orderDetails.bundle_size} bundle for ${orderDetails.beneficiary} is being processed.`);
                    } else if (status === 'failed' || status === 'cancelled') {
                        showResult(false, '❌', 'Payment Failed', 'The payment was not completed. Please try again.');
                    } else if (Date.now() >= deadline) {
                        showResult(false, '⏱️', 'Payment Timed Out', 'No response received. If you approved, please contact support.');
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
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    
    // Check authentication first
    const isLoggedIn = checkAuthentication();
    if (!isLoggedIn) {
        return; // Stop initialization if not logged in
    }
    
    console.log('Authentication passed, initializing components...');
    
    initializeTheme();
    initializeSidebar();
    loadProviderInfo();
    applyUserStoreBranding();
    
    const bundleSelect = document.getElementById('bundle');
    const bundleDetails = document.getElementById('bundleDetails');
    const phoneInput = document.getElementById('phone');
    const purchaseBtn = document.getElementById('purchaseBundle');
    const portedCheckbox = document.getElementById('portedNetwork');
    const notificationMessage = document.getElementById('notificationMessage');
    
    // Load bundles for the provider
    async function loadBundles() {
        try {
            const prices = await loadPricesForProvider(providerName);
            
            bundleSelect.setAttribute('data-network', providerName);
            
            // Clear existing options except the first placeholder
            while (bundleSelect.options.length > 1) {
                bundleSelect.remove(1);
            }
            
            if (!prices || prices.length === 0) {
                bundleSelect.options[0].textContent = 'No bundles available for this store';
                bundleDetails.style.display = 'none';
                return;
            }

            // Reset placeholder
            bundleSelect.options[0].textContent = 'Select a bundle';
            bundleSelect.options[0].value = '';

            // Apply Display Settings if available
            const config = prices.find(p => p.displayConfig)?.displayConfig;
            if (config) {
                if (config.headerColor) {
                    document.documentElement.style.setProperty('--accent-color', config.headerColor);
                    document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${config.headerColor} 0%, #2575fc 100%)`);
                    document.documentElement.style.setProperty('--header-bg', `linear-gradient(135deg, ${config.headerColor} 0%, #2575fc 100%)`);
                }
                if (config.pageTitle) {
                    document.getElementById('pageTitle').textContent = config.pageTitle;
                    document.title = config.pageTitle;
                }
                if (config.pageSubtitle) {
                    document.getElementById('pageSubtitle').textContent = config.pageSubtitle;
                }
                const noteBox = document.getElementById('noteBox');
                const noteText = document.getElementById('noteText');
                if (noteBox && noteText) {
                    if (config.noteText) {
                        noteText.textContent = config.noteText;
                        noteBox.style.display = 'block';
                    } else {
                        noteBox.style.display = 'none';
                    }
                }
                const portedContainer = document.getElementById('portedContainer');
                if (portedContainer) {
                    portedContainer.style.display = config.showPortedCheckbox === false ? 'none' : '';
                }
                const prefixHint = document.getElementById('prefixHint');
                const validPrefixesEl = document.getElementById('validPrefixes');
                if (prefixHint && validPrefixesEl) {
                    if (config.showPrefixes !== false && config.validPrefixes) {
                        validPrefixesEl.textContent = config.validPrefixes;
                        prefixHint.style.display = 'block';
                    } else {
                        prefixHint.style.display = 'none';
                    }
                }
                const bundleLabelEl = document.getElementById('bundleLabel');
                if (bundleLabelEl && config.bundleLabel) bundleLabelEl.textContent = `Select ${config.bundleLabel}`;
                const purchaseBtnText = document.getElementById('purchaseBtnText');
                if (purchaseBtnText && config.purchaseLabel) purchaseBtnText.textContent = config.purchaseLabel;
                const deliveryTextEl = document.getElementById('deliveryText');
                if (deliveryTextEl && config.deliveryText) deliveryTextEl.textContent = config.deliveryText;
            }
            
            // Sort by numeric package size
            prices.sort((a, b) => (parseInt(a.packageName) || 0) - (parseInt(b.packageName) || 0));
            
            const validityVal = config?.validity || '90 days';
            prices.forEach((priceObj, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.setAttribute('data-price', priceObj.price.toFixed(2));
                option.setAttribute('data-validity', validityVal);
                option.setAttribute('data-network', providerName);
                option.textContent = `${priceObj.packageName} - GHS ${priceObj.price.toFixed(2)}`;
                bundleSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Failed to load bundles:', err);
            if (bundleSelect.options.length <= 1) {
                bundleSelect.options[0].textContent = 'Could not load bundles — tap to retry';
            }
        }
    }
    
    // Load bundles on page load
    // NOTE: storefront-prices.js (loaded after this script) handles populating
    // the bundle dropdown AND applying displayConfig. We only need to set up
    // the change/purchase handlers here.
    
    // Refresh prices when page becomes visible again (e.g. after admin edits)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Clear dropdown and let storefront-prices.js re-run
            if (bundleSelect) {
                while (bundleSelect.options.length > 1) bundleSelect.remove(1);
                if (bundleSelect.options[0]) bundleSelect.options[0].textContent = 'Loading bundles…';
            }
            // Re-trigger storefront-prices run() by dispatching a custom event
            document.dispatchEvent(new Event('storefront-prices-refresh'));
        }
    });
    
    // Update bundle details when selection changes
    if (bundleSelect && bundleDetails) {
        bundleSelect.addEventListener('change', function() {
            if (this.value === '') {
                bundleDetails.style.display = 'none';
                return;
            }
            
            const selectedOption = this.options[this.selectedIndex];
            const price = selectedOption.getAttribute('data-price');
            const validity = selectedOption.getAttribute('data-validity');
            const bundleName = selectedOption.textContent.split(' - ')[0];
            const network = selectedOption.getAttribute('data-network');
            
            document.getElementById('bundleSize').textContent = bundleName;
            document.getElementById('bundlePrice').textContent = `${price} GHS`;
            document.getElementById('bundleValidity').textContent = validity;
            document.getElementById('bundleNetwork').textContent = network;
            document.getElementById('numberType').textContent = portedCheckbox?.checked ? 'Ported' : 'Normal';
            
            bundleDetails.style.display = 'block';
        });
    }
    
    // Update number type when ported checkbox changes
    if (portedCheckbox) {
        portedCheckbox.addEventListener('change', function() {
            if (bundleSelect.value !== '') {
                document.getElementById('numberType').textContent = this.checked ? 'Ported' : 'Normal';
            }
        });
    }
    
    // Handle purchase — use the same Moolre payment modal as the MTN page
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async function() {
            const phone       = phoneInput?.value.trim();
            const bundleValue = bundleSelect.value;
            const selectedOpt = bundleSelect.options[bundleSelect.selectedIndex];
            const price       = parseFloat(selectedOpt?.getAttribute('data-price') || '0');
            const bundleName  = selectedOpt?.value || selectedOpt?.textContent?.split(' - ')[0] || bundleValue;

            if (!phone) {
                alert('Please enter a phone number');
                phoneInput?.focus();
                return;
            }
            if (!bundleValue) {
                alert('Please select a bundle');
                bundleSelect.focus();
                return;
            }
            if (!price || price <= 0) {
                alert('Invalid bundle price. Please refresh and try again.');
                return;
            }

            showPaymentModal({
                beneficiary: phone,
                package:     providerName,
                bundle_size: bundleName,
                amount:      price,
            });
        });
    }
});
