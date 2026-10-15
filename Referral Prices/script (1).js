// Referral Prices page – original prices are now role-specific (from BasePrice via /api/my-original-prices)
const API_BASE = 'https://youngster-backend.vercel.app/api';

function authHeaders() {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function checkAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = '../Registration-form/login_and_signup.html';
        return false;
    }
    return true;
}

// ========== Theme & Sidebar ==========
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.removeEventListener('click', themeToggleHandler);
        themeToggle.addEventListener('click', themeToggleHandler);
    }
}
function themeToggleHandler() {
    const cur = document.documentElement.getAttribute('data-theme');
    const newTheme = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    if (!menuBtn || !sidebar) return;
    const openSidebar = () => { sidebar.classList.add('open'); overlay?.classList.add('open'); };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };
    menuBtn.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Log out?')) { localStorage.clear(); window.location.href = '../Registration-form/login_and_signup.html'; }
        });
    }
    document.querySelectorAll('.menu-item').forEach(i => i.addEventListener('click', closeSidebar));
}

function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification-global');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `notification-global notification-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${message}</span>`;
    Object.assign(toast.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
        borderRadius: '8px', background: type === 'success' ? '#4CAF50' : '#2196F3',
        color: 'white', zIndex: '10000', animation: 'fadeIn 0.3s'
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== Skeleton loader ==========
// Injected once so the tables show animated placeholders while data loads.
(function injectSkeletonCSS() {
    if (document.getElementById('skeleton-style')) return;
    const s = document.createElement('style');
    s.id = 'skeleton-style';
    s.textContent = `
        @keyframes skeleton-shimmer {
            0%   { background-position: -400px 0; }
            100% { background-position:  400px 0; }
        }
        .skeleton-row td { padding: 12px 8px; }
        .skeleton-cell {
            display: inline-block;
            width: 100%;
            height: 13px;
            border-radius: 4px;
            background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
            background-size: 400px 100%;
            animation: skeleton-shimmer 1.4s ease infinite;
        }
        [data-theme="dark"] .skeleton-cell {
            background: linear-gradient(90deg, #2d3748 25%, #3a4a60 50%, #2d3748 75%);
            background-size: 400px 100%;
        }
    `;
    document.head.appendChild(s);
})();

function showTableSkeleton(container, cols = 5, rows = 4) {
    const cell = () => `<td><span class="skeleton-cell"></span></td>`;
    const row  = () => `<tr class="skeleton-row">${Array(cols).fill(cell()).join('')}</tr>`;
    container.innerHTML = `<table class="pricing-table" style="width:100%;">
        <tbody>${Array(rows).fill(row()).join('')}</tbody>
    </table>`;
}

// ========== Data Models ==========
let allProviders = [];
let allClientTypes = [];
let originalPrices = [];   // role-specific: [{ provider, packageName, originalPrice }]
let referralPrices = [];
let permittedClientTypes = [];

async function loadUserData() {
    try {
        const res = await fetch(`${API_BASE}/me`, { headers: authHeaders() });
        const user = await res.json();
        permittedClientTypes = user.permittedClientTypes || [];
    } catch (err) { console.error(err); }
}

async function loadClientTypes() {
    try {
        const res = await fetch(`${API_BASE}/client-types`, { headers: authHeaders() });
        let types = await res.json();
        if (!types || types.length === 0) {
            types = ['Dealers', 'Super-agents', 'Agents', 'Sub-agents', 'Customers'];
        }
        allClientTypes = types;
    } catch (err) {
        allClientTypes = ['Dealers', 'Super-agents', 'Agents', 'Sub-agents', 'Customers'];
    }
}

async function loadProviders() {
    try {
        const res = await fetch(`${API_BASE}/providers`, { headers: authHeaders() });
        if (res.ok) {
            const data = await res.json();
            allProviders = data.map(p => ({ name: p.name, logoUrl: p.logoUrl || '' }));
        } else {
            throw new Error('API not ready');
        }
    } catch (err) {
        // Derive providers from originalPrices as fallback
        if (originalPrices.length) {
            const unique = [...new Set(originalPrices.map(op => op.provider))];
            allProviders = unique.map(name => ({ name, logoUrl: '' }));
        }
    }
}

// KEY CHANGE: load the role-specific original prices instead of master prices.
// The server looks up this user's role, finds the admin-configured BasePrice column,
// and returns [{ provider, packageName, originalPrice }].
async function loadOriginalPrices() {
    try {
        // Prevent browser/CDN caches from keeping an old Base Price snapshot.
        const res = await fetch(`${API_BASE}/my-original-prices?_=${Date.now()}`, {
            headers: authHeaders(),
            cache: 'no-store'
        });
        if (res.ok) {
            originalPrices = await res.json();
        } else {
            originalPrices = [];
        }
    } catch (err) {
        console.error('Could not load original prices:', err);
        originalPrices = [];
    }
}

async function loadReferralPrices() {
    try {
        const res = await fetch(`${API_BASE}/referral-prices`, { headers: authHeaders() });
        referralPrices = await res.json();
    } catch (err) { console.error(err); }
}

// ========== Price table caching ==========
// Builds a simple hash string from the data arrays to detect changes.
// If nothing changed since last visit, the cached DOM is shown immediately
// and no rebuild happens. Only rebuilds when data actually differs.
const PRICE_CACHE_KEY = 'referralPriceTablesCache';
const PRICE_HASH_KEY  = 'referralPriceTablesHash';

function hashData(providers, clientTypes, originalPrices, referralPrices) {
    // Lightweight deterministic string — not crypto, just change detection
    return JSON.stringify({ providers, clientTypes, originalPrices, referralPrices });
}

function renderFromCache() {
    const container = document.getElementById('dynamicTablesContainer');
    if (!container) return false;
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (!cached) return false;
    container.innerHTML = cached;

    // Re-attach click handlers for collapsible headers
    container.querySelectorAll('[data-collapsible]').forEach(headerDiv => {
        const tableDiv = headerDiv.nextElementSibling;
        if (!tableDiv) return;
        headerDiv.addEventListener('click', () => {
            const isVisible = tableDiv.style.display !== 'none';
            tableDiv.style.display = isVisible ? 'none' : 'block';
            const icon = headerDiv.querySelector('.fa-chevron-down');
            if (icon) icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    });
    return true;
}

function saveToCache(hash) {
    const container = document.getElementById('dynamicTablesContainer');
    if (!container) return;
    localStorage.setItem(PRICE_CACHE_KEY, container.innerHTML);
    localStorage.setItem(PRICE_HASH_KEY, hash);
}

// ========== Build Tables ==========
function buildTables() {
    const container = document.getElementById('dynamicTablesContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!allProviders.length) {
        container.innerHTML = '<div class="alert">No providers found. Contact admin.</div>';
        return;
    }
    if (!allClientTypes.length) {
        container.innerHTML = '<div class="alert">No client types defined. Contact admin.</div>';
        return;
    }

    for (let prov of allProviders) {
        const providerName = prov.name;
        // Use originalPrices (role-specific) to determine the package list
        const packages = [...new Set(originalPrices.filter(op => op.provider === providerName).map(op => op.packageName))];
        if (!packages.length) continue;

        const section = document.createElement('div');
        section.className = 'provider-section';

        let headerClass = 'provider-header';
        if (providerName.includes('MTN')) headerClass = 'mtn-header';
        else if (providerName.includes('Telecel')) headerClass = 'telecel-header';

        const headerDiv = document.createElement('div');
        headerDiv.className = headerClass;
        headerDiv.setAttribute('data-collapsible', 'true');
        headerDiv.style.cssText = 'display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:12px 20px;';
        const logoUrl = prov.logoUrl || '';
        headerDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <img src="${logoUrl}" style="width:40px; height:40px; object-fit:contain; border-radius:50%; background:#fff; padding:2px;" onerror="this.style.display='none'">
                <span style="font-weight:600;">${providerName}</span>
            </div>
            <i class="fas fa-chevron-down" style="transition:transform 0.3s;"></i>
        `;

        const tableDiv = document.createElement('div');
        tableDiv.className = 'dynamic-table-container';
        tableDiv.style.display = 'none';

        let tableHtml = `<table class="pricing-table"><thead><tr><th>Package</th><th>Original Price</th>`;
        for (let ct of allClientTypes) {
            tableHtml += `<th style="min-width:90px;"><div class="column-header"><div class="column-main">Set Prices (GHS)</div><div class="column-sub">(${ct})</div></div></th>`;
        }
        tableHtml += `</thead><tbody>`;

        for (let pkg of packages) {
            // Look up this package's original price for the current user's role
            const origEntry = originalPrices.find(op => op.provider === providerName && op.packageName === pkg);
            const originalPrice = origEntry ? origEntry.originalPrice.toFixed(2) : '—';

            tableHtml += `<tr>
                <td><div class="package-name">${pkg}</div></td>
                <td class="original-price">GHS ${originalPrice}</td>`;

            for (let ct of allClientTypes) {
                const saved = referralPrices.find(rp => rp.provider === providerName && rp.packageName === pkg && rp.clientType === ct);
                const priceValue = saved ? saved.price : '';
                tableHtml += `<td style="min-width:90px;"><div class="price-input-container"><input type="text" class="set-price-input" data-provider="${providerName}" data-package="${pkg}" data-client="${ct}" data-original="${origEntry ? origEntry.originalPrice : 0}" value="${priceValue}" placeholder="Enter price" style="width:100%;min-width:80px;box-sizing:border-box;"></div></td>`;
            }
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table>`;
        tableDiv.innerHTML = tableHtml;
        section.appendChild(headerDiv);
        section.appendChild(tableDiv);
        container.appendChild(section);

        headerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = tableDiv.style.display !== 'none';
            requestAnimationFrame(() => {
                tableDiv.style.display = isVisible ? 'none' : 'block';
                const icon = headerDiv.querySelector('.fa-chevron-down');
                if (icon) icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        });
    }
    // Cache is saved by refreshAll() after hash comparison — not here directly
}

// ========== Column Visibility ==========
function applyColumnVisibility() {
    const visibleTypes = permittedClientTypes.length > 0 ? permittedClientTypes : allClientTypes;
    document.querySelectorAll('.pricing-table').forEach(table => {
        const headers = table.querySelectorAll('thead th');
        for (let i = 2; i < headers.length; i++) {
            const sub = headers[i].querySelector('.column-sub');
            if (!sub) continue;
            const clientType = sub.innerText.replace(/[()]/g, '').trim();
            const shouldHide = !visibleTypes.includes(clientType);
            if (shouldHide) {
                headers[i].classList.add('hidden-col');
                table.querySelectorAll('tbody tr').forEach(row => {
                    if (row.cells[i]) row.cells[i].classList.add('hidden-col');
                });
            } else {
                headers[i].classList.remove('hidden-col');
                table.querySelectorAll('tbody tr').forEach(row => {
                    if (row.cells[i]) row.cells[i].classList.remove('hidden-col');
                });
            }
        }
    });
}

async function refreshAll() {
    const container = document.getElementById('dynamicTablesContainer');

    // ── Step 1: render from cache instantly if available ────────────────────
    // This makes the page feel static — tables appear before any network call.
    const hadCache = renderFromCache();
    if (!hadCache && container) showTableSkeleton(container, 5, 5);

    // ── Step 2: fetch all data in the background ─────────────────────────────
    await loadUserData();
    await loadClientTypes();
    await loadOriginalPrices();
    await loadReferralPrices();
    await loadProviders();

    // ── Step 3: only rebuild DOM if data actually changed ───────────────────
    const newHash = hashData(allProviders, allClientTypes, originalPrices, referralPrices);
    const oldHash = localStorage.getItem(PRICE_HASH_KEY);

    if (newHash !== oldHash) {
        buildTables();
        applyColumnVisibility();
        saveToCache(newHash);
    } else {
        // Data unchanged — re-apply column visibility on the cached DOM only
        applyColumnVisibility();
    }
}

// ========== Saving Referral Prices ==========
async function saveAllPrices() {
    let hasError = false;
    document.querySelectorAll('.set-price-input').forEach(inp => {
        if (inp.closest('td')?.classList.contains('hidden-col')) return;
        const val = parseFloat(inp.value);
        const orig = parseFloat(inp.getAttribute('data-original'));
        if (inp.value && !isNaN(val) && orig > 0 && val <= orig) {
            inp.classList.add('error');
            hasError = true;
        } else inp.classList.remove('error');
    });
    if (hasError) {
        showNotification('Prices must be greater than the original price', 'error');
        return false;
    }

    const priceArray = [];
    document.querySelectorAll('.set-price-input').forEach(inp => {
        if (inp.closest('td')?.classList.contains('hidden-col')) return;
        const price = parseFloat(inp.value);
        const orig = parseFloat(inp.getAttribute('data-original'));
        if (!isNaN(price) && price > 0 && (orig === 0 || price > orig)) {
            priceArray.push({
                provider: inp.dataset.provider,
                packageName: inp.dataset.package,
                clientType: inp.dataset.client,
                price,
                originalPrice: orig
            });
        }
    });

    try {
        const res = await fetch(`${API_BASE}/referral-prices/bulk`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ prices: priceArray })
        });
        if (res.ok) {
            showNotification('Prices saved successfully!', 'success');
            // Invalidate cache so next page load reflects the new prices
            localStorage.removeItem(PRICE_CACHE_KEY);
            localStorage.removeItem(PRICE_HASH_KEY);
            return true;
        } else {
            showNotification('Failed to save', 'error');
        }
    } catch (err) {
        showNotification('Network error', 'error');
    }
    return false;
}

// ========== Store Settings & Live Preview ==========
async function loadSellerData() {
    try {
        const res = await fetch(`${API_BASE}/store-settings`, { headers: authHeaders() });
        const settings = await res.json();
        document.getElementById('business-name').value = settings.storeName || '';
        document.getElementById('seller-description').value = settings.storeDescription || '';
        document.getElementById('whatsapp-group-link').value = settings.whatsappGroupLink || '';
        document.getElementById('whatsapp-number').value = settings.whatsappNumber || '';
        const logoPreview = document.getElementById('logo-preview-img');
        if (settings.storeLogo && settings.storeLogo !== 'default-logo.png') {
            logoPreview.src = settings.storeLogo;
            document.getElementById('remove-logo-btn').style.display = 'inline-flex';
        } else {
            const sidebarLogo = document.querySelector('.brand-logo img')?.src;
            logoPreview.src = sidebarLogo || 'default-logo.png';
        }
        updatePreviewBadge();
    } catch (err) { console.error(err); }
}

// ========== Store Slug Refresh ==========
// Fetches the latest storeSlug from the server and updates localStorage.
// If the slug has changed (due to store name update), redirects to the new URL.
// Call this after any successful store settings save.
async function refreshUserStoreSlug() {
    try {
        const res = await fetch(`${API_BASE}/my-permitted-client-types`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.storeSlug) {
            // Get the old slug from localStorage
            const stored = localStorage.getItem('user');
            const user = stored ? JSON.parse(stored) : {};
            const oldSlug = user.storeSlug;
            
            // Update with new slug and store name
            user.storeSlug = data.storeSlug;
            user.storeName = data.storeName || user.storeName;
            localStorage.setItem('user', JSON.stringify(user));
            
            // If slug changed, check if we're on a referral page and redirect
            if (oldSlug && oldSlug !== data.storeSlug) {
                const isReferralPage = window.location.pathname.includes('/referral/') ||
                                     new URLSearchParams(window.location.search).get('store');
                if (isReferralPage) {
                    // Redirect to new slug URL
                    window.location.href = `/referral/${encodeURIComponent(data.storeSlug)}`;
                }
            }
        }
    } catch (err) {
        console.warn('refreshUserStoreSlug failed:', err);
    }
}

async function saveSellerData() {
    const storeName = document.getElementById('business-name').value;
    const storeDescription = document.getElementById('seller-description').value;
    const storeLogo = document.getElementById('logo-preview-img').src;
    const whatsappGroupLink = document.getElementById('whatsapp-group-link').value;
    const whatsappNumber = document.getElementById('whatsapp-number').value;
    if (!storeName) { showNotification('Store name required', 'warning'); return false; }
    if (!whatsappNumber) { showNotification('WhatsApp number required', 'warning'); return false; }
    try {
        const res = await fetch(`${API_BASE}/store-settings`, {
            method: 'PUT', headers: authHeaders(),
            body: JSON.stringify({ storeName, storeDescription, storeLogo, whatsappGroupLink, whatsappNumber })
        });
        if (res.ok) {
            showNotification('Store details saved', 'success');
            // Sync slug in DB to match new store name, then refresh localStorage
            await fetch(`${API_BASE}/sync-my-slug`, { headers: authHeaders() });
            await refreshUserStoreSlug();
            return true;
        }
    } catch (err) { console.error(err); }
    return false;
}

function createPreviewSection() {
    const formBody = document.querySelector('.form-body');
    if (!formBody) return;
    if (document.getElementById('seller-preview-section')) return;
    const previewSection = document.createElement('div');
    previewSection.id = 'seller-preview-section';
    previewSection.className = 'seller-badge-preview';
    previewSection.innerHTML = `
        <h4><i class="fas fa-eye"></i> Live Preview – Your Store (Customer View)</h4>
        <div class="customer-preview-wrapper">
            <!-- Desktop sidebar (hidden on mobile via CSS) -->
            <div class="preview-sidebar">
                <div class="preview-sidebar-header">
                    <div class="preview-sidebar-logo"><img src="default-logo.png" alt="Logo" id="preview-sidebar-logo"></div>
                    <div class="preview-sidebar-title" id="preview-sidebar-name">Youngster Data Shop</div>
                </div>
                <ul class="preview-sidebar-menu">
                    <div class="preview-sidebar-item active"><i class="fas fa-tachometer-alt"></i> Dashboard</div>
                    <div class="preview-sidebar-item"><i class="fas fa-shopping-cart"></i> Orders</div>
                    <div class="preview-sidebar-item"><i class="fas fa-exchange-alt"></i> Transactions</div>
                </ul>
            </div>

            <div class="customer-preview-container">
                <!-- Mobile-only: floating overlay sidebar + button -->
                <button class="preview-mobile-menu-btn" id="previewMobileMenuBtn" aria-label="Open menu">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="preview-mobile-overlay" id="previewMobileOverlay"></div>
                <div class="preview-mobile-sidebar" id="previewMobileSidebar">
                    <div class="preview-mobile-sidebar-header">
                        <div class="preview-mobile-sidebar-logo"><img src="default-logo.png" alt="Logo" id="preview-mobile-logo"></div>
                        <span class="preview-mobile-sidebar-title" id="preview-mobile-name">Youngster Data Shop</span>
                        <button class="preview-mobile-close" id="previewMobileClose"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="preview-mobile-menu-item active"><i class="fas fa-tachometer-alt"></i> Dashboard</div>
                    <div class="preview-mobile-menu-item"><i class="fas fa-shopping-cart"></i> Orders</div>
                    <div class="preview-mobile-menu-item"><i class="fas fa-exchange-alt"></i> Transactions</div>
                </div>

                <div class="preview-header">
                    <h1 class="preview-store-name" id="preview-business-name">Youngster Data Shop</h1>
                    <p class="preview-store-desc" id="preview-store-desc">Your trusted partner for data services</p>
                </div>
                <div class="preview-content">
                    <h2 class="preview-section-title"><i class="fas fa-wifi"></i> Buy Data Bundles</h2>
                    <div class="preview-network-cards">
                        <div class="preview-network-card"><div class="preview-network-logo"><img src="mtn-logo (1).png"></div><div class="preview-network-info"><div class="preview-network-name">MTNUP2U</div><div class="preview-network-tagline">Normal Delivery</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><img src="telecel.jpg"></div><div class="preview-network-info"><div class="preview-network-name">Telecel Data</div><div class="preview-network-tagline">Swift Delivery</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><img src="at.webp"></div><div class="preview-network-info"><div class="preview-network-name">AT Ishare</div><div class="preview-network-tagline">Instant Delivery</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><img src="at.webp"></div><div class="preview-network-info"><div class="preview-network-name">AT Bigtime</div><div class="preview-network-tagline">Normal Delivery</div></div><i class="fas fa-chevron-right"></i></div>
                    </div>
                    <h2 class="preview-section-title"><i class="fas fa-gift"></i> Special Offers</h2>
                    <div class="preview-special-offers">
                        <div class="preview-network-card"><div class="preview-network-logo"><img src="mtn-pr-15 (1).png"></div><div class="preview-network-info"><div class="preview-network-name">MTN AFA</div><div class="preview-network-tagline">Registration within 24 hours</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><i class="fas fa-exchange-alt"></i></div><div class="preview-network-info"><div class="preview-network-name">EVD/Airtime Transfer</div><div class="preview-network-tagline">Earn 1% commission on each transaction</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><i class="fas fa-bolt"></i></div><div class="preview-network-info"><div class="preview-network-name">MTN Instant Bundles</div><div class="preview-network-tagline">Order and receive instantly</div></div><i class="fas fa-chevron-right"></i></div>
                        <div class="preview-network-card"><div class="preview-network-logo"><i class="fas fa-store"></i></div><div class="preview-network-info"><div class="preview-network-name">Shop</div><div class="preview-network-tagline">Add your products and sell</div></div><i class="fas fa-chevron-right"></i></div>
                    </div>
                </div>
                <div class="preview-whatsapp-float">
                    <div class="preview-whatsapp-main-btn"><i class="fab fa-whatsapp"></i></div>
                    <div class="preview-whatsapp-options">
                        <a href="#" class="preview-wa-option join-group" id="preview-group-btn" target="_blank"><i class="fas fa-users"></i> Join Group</a>
                        <a href="#" class="preview-wa-option chat-admin" id="preview-chat-btn" target="_blank"><i class="fas fa-headset"></i> Chat Admin</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    formBody.appendChild(previewSection);

    // Wire up mobile sidebar toggle inside the preview
    const mobileMenuBtn  = document.getElementById('previewMobileMenuBtn');
    const mobileOverlay  = document.getElementById('previewMobileOverlay');
    const mobileSidebar  = document.getElementById('previewMobileSidebar');
    const mobileClose    = document.getElementById('previewMobileClose');
    const openMobile  = () => { mobileSidebar?.classList.add('open');  mobileOverlay?.classList.add('open'); };
    const closeMobile = () => { mobileSidebar?.classList.remove('open'); mobileOverlay?.classList.remove('open'); };
    mobileMenuBtn?.addEventListener('click', openMobile);
    mobileClose?.addEventListener('click', closeMobile);
    mobileOverlay?.addEventListener('click', closeMobile);
}

function updatePreviewBadge() {
    const logoPreview = document.getElementById('logo-preview-img');
    const businessName = document.getElementById('business-name');
    const description = document.getElementById('seller-description');
    const groupLink = document.getElementById('whatsapp-group-link');
    const whatsappNumber = document.getElementById('whatsapp-number');

    const previewName = document.getElementById('preview-business-name');
    if (previewName && businessName) previewName.textContent = businessName.value.trim() || 'Youngster Data Shop';
    const previewDesc = document.getElementById('preview-store-desc');
    if (previewDesc && description) previewDesc.textContent = description.value.trim() || 'Your trusted partner for data services';
    const previewSidebarName = document.getElementById('preview-sidebar-name');
    if (previewSidebarName && businessName) previewSidebarName.textContent = businessName.value.trim() || 'Youngster Data Shop';
    // Keep mobile sidebar name in sync too
    const mobilePreviewName = document.getElementById('preview-mobile-name');
    if (mobilePreviewName && businessName) mobilePreviewName.textContent = businessName.value.trim() || 'Youngster Data Shop';
    const previewSidebarLogo = document.getElementById('preview-sidebar-logo');
    if (previewSidebarLogo && logoPreview && logoPreview.src && !logoPreview.src.includes('default-logo.png')) {
        previewSidebarLogo.src = logoPreview.src;
    } else if (previewSidebarLogo) {
        const sidebarLogo = document.querySelector('.brand-logo img')?.src;
        previewSidebarLogo.src = sidebarLogo || 'default-logo.png';
    }
    // Keep mobile logo in sync too
    const mobilePreviewLogo = document.getElementById('preview-mobile-logo');
    if (mobilePreviewLogo) {
        mobilePreviewLogo.src = previewSidebarLogo?.src || 'default-logo.png';
    }
    const previewGroupBtn = document.getElementById('preview-group-btn');
    if (previewGroupBtn && groupLink) {
        const link = groupLink.value.trim();
        previewGroupBtn.href = link && link !== 'https://chat.whatsapp.com/...' ? link : '#';
        previewGroupBtn.style.opacity = link ? '1' : '0.6';
        previewGroupBtn.style.pointerEvents = link ? 'auto' : 'none';
    }
    const previewChatBtn = document.getElementById('preview-chat-btn');
    if (previewChatBtn && whatsappNumber) {
        let number = whatsappNumber.value.trim();
        if (number) {
            let clean = number.replace(/\D/g, '');
            if (!clean.startsWith('233')) clean = '233' + clean;
            previewChatBtn.href = `https://wa.me/${clean}`;
            previewChatBtn.style.opacity = '1';
            previewChatBtn.style.pointerEvents = 'auto';
        } else {
            previewChatBtn.href = '#';
            previewChatBtn.style.opacity = '0.6';
            previewChatBtn.style.pointerEvents = 'none';
        }
    }
}

function initializeSellerForm() {
    const uploadBtn = document.getElementById('upload-logo-btn');
    const logoInput = document.getElementById('seller-logo');
    const logoPreview = document.getElementById('logo-preview-img');
    const removeBtn = document.getElementById('remove-logo-btn');
    const nameInput = document.getElementById('business-name');
    const descInput = document.getElementById('seller-description');
    const groupInput = document.getElementById('whatsapp-group-link');
    const numberInput = document.getElementById('whatsapp-number');
    if (uploadBtn && logoInput) {
        uploadBtn.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    logoPreview.src = ev.target.result;
                    if (removeBtn) removeBtn.style.display = 'inline-flex';
                    updatePreviewBadge();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    if (removeBtn) removeBtn.addEventListener('click', () => {
        logoInput.value = '';
        logoPreview.src = 'default-logo.png';
        removeBtn.style.display = 'none';
        updatePreviewBadge();
    });
    if (nameInput) nameInput.addEventListener('input', updatePreviewBadge);
    if (descInput) descInput.addEventListener('input', updatePreviewBadge);
    if (groupInput) groupInput.addEventListener('input', updatePreviewBadge);
    if (numberInput) numberInput.addEventListener('input', updatePreviewBadge);
    createPreviewSection();
    updatePreviewBadge();
}

function updateSaveButtonHandler() {
    const saveButton = document.getElementById('savePrices');
    if (!saveButton) return;
    const newBtn = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newBtn, saveButton);
    newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (await saveSellerData()) await saveAllPrices();
    });
}

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    initializeTheme();
    initializeSidebar();
    // Sync slug on every page load to ensure DB is always up to date
    await fetch(`${API_BASE}/sync-my-slug`, { headers: authHeaders() }).catch(() => {});
    await refreshAll();
    await loadSellerData();
    initializeSellerForm();
    updateSaveButtonHandler();
});
