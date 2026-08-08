// storefront-inject.js
// Runs after dashboard.js on dashboard2.html.
// When the page is visited via a referral link (/referral/<slug>),
// fetches the dealer's StoreSettings from the public API and
// injects their branding — store name, description, logo, WhatsApp links —
// into the existing dashboard IDs.
// When visited normally (no slug), does nothing — defaults remain.

const STOREFRONT_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://youngster-backend-production.up.railway.app/api';

// ─── Detect slug ──────────────────────────────────────────────────────────────
// Supports:
//   /referral/kwame-data-hub          (Express serves dashboard2.html here)
//   /dashboard2.html?store=kwame-data-hub  (fallback for static hosting)
function detectStoreSlug() {
    // 1. Query string: ?store=<slug> (works on all sub-pages)
    const params = new URLSearchParams(window.location.search);
    if (params.get('store')) return params.get('store');
    // 2. Path: /referral/<slug>
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts[parts.length - 2] === 'referral') return parts[parts.length - 1];
    if (parts[0] === 'referral' && parts.length >= 2) return parts[1];
    return null;
}

// ─── Capture referral context ─────────────────────────────────────────────────
// When a customer arrives via a referral link like:
//   dashboard2.html?store=youngster-data-shop&client=Customers
// we immediately persist both values to localStorage so every bundle page
// (mtn.html, telecel.html, etc.) can read clientType without it ever
// appearing in their URLs.
(function captureReferralContext() {
    const params     = new URLSearchParams(window.location.search);
    const store      = params.get('store') || detectStoreSlug();
    const clientType = params.get('client');
    if (store)      localStorage.setItem('storeSlug',  store);
    if (clientType) localStorage.setItem('clientType', clientType);

    // Generate a unique guest session ID on first visit and persist it.
    // This lets each customer see only their own orders on the guest orders page.
    // A different customer on a different device gets a completely different ID,
    // even if they arrived via the same referral link.
    if (!localStorage.getItem('guestSessionId')) {
        const id = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('guestSessionId', id);
    }
})();

// ─── Apply branding ───────────────────────────────────────────────────────────
function applyStoreBranding(store) {
    const {
        storeName         = '',
        storeDescription  = '',
        storeLogo         = '',
        whatsappGroupLink = '',
        whatsappNumber    = ''
    } = store;

    if (storeName) {
        document.title = storeName;
        const el = document.getElementById('headerStoreName');
        if (el) el.textContent = storeName;
        const sb = document.getElementById('sidebarTitle');
        if (sb) sb.textContent = storeName;
        const ft = document.getElementById('footerStoreName');
        if (ft) ft.textContent = storeName;
    }

    if (storeDescription) {
        const el = document.getElementById('headerStoreDesc');
        if (el) el.textContent = storeDescription;
    }

    // Sidebar logo — image if available, else coloured initial
    const logoEl = document.getElementById('sidebarLogo');
    if (logoEl) {
        if (storeLogo) {
            logoEl.innerHTML = `<img src="${storeLogo}" alt="${storeName} Logo"
                style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (storeName) {
            logoEl.innerHTML = `<span style="
                font-size:18px;font-weight:700;color:#6a11cb;
                width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                ${storeName.charAt(0).toUpperCase()}
            </span>`;
        }
    }

    // WhatsApp group link
    const waGroup = document.getElementById('waGroupLink');
    if (waGroup) {
        if (whatsappGroupLink) {
            waGroup.href = whatsappGroupLink;
            waGroup.style.display = '';   // ensure visible
        } else if (waGroup.href && waGroup.href !== window.location.href) {
            // Keep the hardcoded href from the HTML — just make sure it's visible
            waGroup.style.display = '';
        } else {
            waGroup.style.display = 'none';
        }
    }

    // WhatsApp admin / reseller number
    const waNumber = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : null;
    const waAdmin = document.getElementById('waAdminLink');
    if (waAdmin) {
        if (waNumber) {
            waAdmin.href = waNumber;
            waAdmin.style.display = '';   // ensure visible
        } else {
            waAdmin.style.display = 'none';
        }
    }
    const resellerLink = document.getElementById('resellerLink');
    if (resellerLink && waNumber) resellerLink.href = waNumber;

    // Update dashboard menu link to preserve store slug across sub-pages.
    // Skip if we're already ON the dashboard — the link should stay as href="#"
    const dashboardLink = document.getElementById('dashboardMenuLink');
    const onDashboard = window.location.pathname.includes('dashboard2') ||
                        window.location.pathname.startsWith('/referral/');
    if (dashboardLink && !onDashboard) {
        const slugToUse = store.storeSlug || '';
        if (slugToUse) {
            const isStatic = window.location.pathname.endsWith('.html') || window.location.port === '8000';
            dashboardLink.href = isStatic
                ? `/Dashboard/dashboard2.html?store=${encodeURIComponent(slugToUse)}`
                : `/referral/${encodeURIComponent(slugToUse)}`;
        }

    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const slug = detectStoreSlug();

    // Apply cached branding immediately — before the network fetch — so the
    // dashboard never shows default content while waiting for the API.
    // Apply cached branding immediately ONLY if it belongs to the current store slug.
    // This prevents showing a previously visited dealer's branding.
    const cachedSlug = localStorage.getItem('storeBrandSlug');
    if (slug && cachedSlug && cachedSlug.toLowerCase() === slug.toLowerCase()) {
        const cachedName = localStorage.getItem('storeBrandName');
        const cachedLogo = localStorage.getItem('storeBrandLogo');
        if (cachedName || cachedLogo) {
            applyStoreBranding({
                storeName:        cachedName || '',
                storeLogo:        cachedLogo || '',
                whatsappGroupLink: localStorage.getItem('storeWhatsappGroup') || '',
                whatsappNumber:   localStorage.getItem('storeWhatsapp') || '',
            });
        }
    }

    if (!slug) {
        return;
    }

    try {
        const apiUrl = `${STOREFRONT_API}/storefront/${encodeURIComponent(slug)}?t=${Date.now()}`;

        const res = await fetch(apiUrl);

        if (!res.ok) {
            // Clear branding cache if store settings don't exist
            localStorage.removeItem('storeBrandName');
            localStorage.removeItem('storeBrandLogo');
            localStorage.removeItem('storeWhatsappGroup');
            localStorage.removeItem('storeWhatsapp');
            localStorage.removeItem('storeBrandSlug');
            return;
        }
        const store = await res.json();
        
        const resolvedSlug = store.storeSlug || slug;
        if (resolvedSlug) localStorage.setItem('storeBrandSlug', resolvedSlug);
        if (store.storeName) localStorage.setItem('storeBrandName', store.storeName);
        if (store.storeLogo)  localStorage.setItem('storeBrandLogo', store.storeLogo);
        else                  localStorage.removeItem('storeBrandLogo');
        if (store.whatsappNumber)    localStorage.setItem('storeWhatsapp', store.whatsappNumber);
        if (store.whatsappGroupLink) localStorage.setItem('storeWhatsappGroup', store.whatsappGroupLink);
        else                         localStorage.removeItem('storeWhatsappGroup');

        if (store.storeSlug && store.storeSlug !== slug) {
            if (window.location.pathname.includes('/referral/')) {
                window.location.replace(`/referral/${store.storeSlug}${window.location.search}`);
                return;
            }
        }
        
        applyStoreBranding(store);

        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.includes('.html') && !href.startsWith('http') && !href.includes('?store=')) {
                const sep = href.includes('?') ? '&' : '?';
                a.setAttribute('href', href + sep + 'store=' + encodeURIComponent(resolvedSlug));
            }
        });

        // Signal other scripts (storefront-prices.js) that context is ready
        document.dispatchEvent(new CustomEvent('storefront-context-ready', {
            detail: { storeSlug: resolvedSlug, clientType: localStorage.getItem('clientType') || '' }
        }));

    } catch (err) {
        // silent — branding is best-effort, cached values remain
    }
});
