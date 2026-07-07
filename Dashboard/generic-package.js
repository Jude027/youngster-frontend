// Generic Package Page - Works for any provider
const API = (() => {
    const h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://youngster-backend-production.up.railway.app/api';
})();

let providerName = '';

function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!menuBtn || !sidebar || !overlay) return;
    menuBtn.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('sidebar-open'); });
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); document.body.classList.remove('sidebar-open'); }
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault(); closeSidebar();
            const slug = localStorage.getItem('storeSlug');
            const base = 'dashboard2.html';
            window.location.href = slug ? base + '?store=' + encodeURIComponent(slug) : base;
        });
    }
}

function checkAuthentication() {
    const isReferralVisit = window.location.pathname.includes('/referral/') || new URLSearchParams(window.location.search).get('store');
    if (isReferralVisit) return true;
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    if (isLoggedIn !== 'true' || !username) { setTimeout(() => { window.location.href = 'index.html'; }, 100); return false; }
    return true;
}

function loadProviderInfo() {
    const params = new URLSearchParams(window.location.search);
    providerName = params.get('provider') || 'Provider';
    const logoUrl = params.get('logo') || '';
    document.getElementById('pageTitle').textContent = `Purchase ${providerName} Bundle`;
    document.getElementById('pageSubtitle').textContent = `Get your ${providerName} data bundle now`;
    document.title = `Purchase ${providerName} Bundle`;
    const logoDiv = document.getElementById('providerLogoDiv');
    if (logoUrl) {
        logoDiv.innerHTML = `<img src="${logoUrl}" alt="${providerName} Logo" style="width:60px;height:60px;object-fit:contain;">`;
    } else {
        logoDiv.innerHTML = `<div style="width:60px;height:60px;background:var(--accent-gradient);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;margin:0 auto;">${providerName.charAt(0).toUpperCase()}</div>`;
    }
}

async function applyUserStoreBranding() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch(`${API}/store-settings`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) return;
        const store = await response.json();
        if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);
        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle) sidebarTitle.textContent = store.storeName;
        const sidebarLogo = document.getElementById('sidebarLogo');
        if (sidebarLogo) {
            if (store.storeLogo) {
                sidebarLogo.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
            } else if (store.storeName) {
                sidebarLogo.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${store.storeName.charAt(0).toUpperCase()}</span>`;
            }
        }
    } catch (err) { console.warn('Could not load store branding:', err); }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuthentication()) return;
    initializeTheme();
    initializeSidebar();
    loadProviderInfo();
    applyUserStoreBranding();

    const bundleSelect = document.getElementById('bundle');
    const bundleDetails = document.getElementById('bundleDetails');
    const phoneInput = document.getElementById('phone');
    const purchaseBtn = document.getElementById('purchaseBundle');
    const portedCheckbox = document.getElementById('portedNetwork');

    async function loadBundles() {
        try {
            const prices = await loadPricesForProvider(providerName);
            bundleSelect.setAttribute('data-network', providerName);
            while (bundleSelect.options.length > 1) bundleSelect.remove(1);
            if (!prices.length) { bundleSelect.innerHTML = '<option value="">No bundles available</option>'; return; }
            prices.sort((a, b) => (parseInt(a.packageName) || 0) - (parseInt(b.packageName) || 0));
            prices.forEach((priceObj, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.setAttribute('data-price', priceObj.price.toFixed(2));
                option.setAttribute('data-validity', '90 days');
                option.setAttribute('data-network', providerName);
                option.textContent = `${priceObj.packageName} - ${priceObj.price.toFixed(2)} GHS`;
                bundleSelect.appendChild(option);
            });
        } catch (err) { console.error('Failed to load bundles:', err); bundleSelect.innerHTML = '<option value="">Error loading bundles</option>'; }
    }
    loadBundles();

    if (bundleSelect && bundleDetails) {
        bundleSelect.addEventListener('change', function() {
            if (!this.value) { bundleDetails.style.display = 'none'; return; }
            const opt = this.options[this.selectedIndex];
            document.getElementById('bundleSize').textContent = opt.textContent.split(' - ')[0];
            document.getElementById('bundlePrice').textContent = `${opt.getAttribute('data-price')} GHS`;
            document.getElementById('bundleValidity').textContent = opt.getAttribute('data-validity');
            document.getElementById('bundleNetwork').textContent = opt.getAttribute('data-network');
            document.getElementById('numberType').textContent = portedCheckbox?.checked ? 'Ported' : 'Normal';
            bundleDetails.style.display = 'block';
        });
    }

    if (portedCheckbox) {
        portedCheckbox.addEventListener('change', function() {
            if (bundleSelect.value) document.getElementById('numberType').textContent = this.checked ? 'Ported' : 'Normal';
        });
    }

    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', async function() {
            const phone = phoneInput?.value.trim();
            const selectedOpt = bundleSelect.options[bundleSelect.selectedIndex];
            const price = parseFloat(selectedOpt?.getAttribute('data-price') || '0');
            const bundleName = selectedOpt?.textContent.split(' - ')[0] || '';

            if (!phone) { alert('Please enter a phone number'); phoneInput?.focus(); return; }
            if (!bundleSelect.value) { alert('Please select a bundle'); bundleSelect.focus(); return; }

            const originalHTML = purchaseBtn.innerHTML;
            purchaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            purchaseBtn.disabled = true;

            try {
                const storeSlug = localStorage.getItem('storeSlug') || '';
                const clientType = localStorage.getItem('clientType') || 'Customers';

                await fetch(`${API}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ beneficiary: phone, package: providerName, packageName: bundleName, bundleSize: bundleName, bundle_size: bundleName, amount: price, status: 'pending', storeSlug, clientType, created: new Date().toISOString() })
                });

                const payRes = await fetch(`${API}/payment/initiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gatewayName: 'Moolre', phoneNumber: phone, amount: price, provider: providerName, packageName: bundleName, bundle_size: bundleName, description: `${providerName} ${bundleName}`, storeSlug, clientType })
                });

                const payData = payRes.ok ? await payRes.json() : null;
                const transactionId = payData?.transactionId;
                if (!payData?.success || !transactionId) throw new Error(payData?.message || 'Could not initiate payment.');

                localStorage.setItem('paymentTransactionId', transactionId);
                purchaseBtn.innerHTML = '<i class="fas fa-key"></i> Redirecting...';
                setTimeout(() => {
                    window.location.href = `./payment-otp.html?txid=${transactionId}&phone=${encodeURIComponent(phone)}`;
                }, 400);
            } catch (err) {
                console.error('Payment error:', err);
                alert(err.message || 'Could not initiate payment. Please try again.');
                purchaseBtn.innerHTML = originalHTML;
                purchaseBtn.disabled = false;
            }
        });
    }
});
