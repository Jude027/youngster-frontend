/**
 * storefront-prices.js
 * Fetches the dealer's saved referral prices for this customer's client type
 * and patches the bundle dropdown on mtn.html / telecel.html / at_ishare.html /
 * at_bigtime.html / mtn_afa.html.
 *
 * Must be the LAST <script> tag in the page (after storefront-inject.js).
 */

(function () {

    const API = 'https://youngster-backend-production.up.railway.app/api';

    // ── Helpers ───────────────────────────────────────────────────────────────

    function getContext() {
        // URL params take priority over localStorage (freshest value wins)
        const p          = new URLSearchParams(window.location.search);
        const store      = p.get('store')  || localStorage.getItem('storeSlug')  || '';
        const clientType = p.get('client') || localStorage.getItem('clientType') || '';
        return { store, clientType };
    }

    function detectProvider(bundleSelect) {
        // Read data-network from the first real option in the dropdown
        for (const opt of bundleSelect.options) {
            const net = opt.getAttribute('data-network');
            if (net) return net.trim();
        }
        return null;
    }

    function patchDropdown(bundleSelect, gbToPrice) {
        for (const opt of bundleSelect.options) {
            if (!opt.value) continue;           // skip the placeholder option

            const gb = opt.value;               // "1", "2", "3" …
            if (Object.prototype.hasOwnProperty.call(gbToPrice, gb)) {
                const price = gbToPrice[gb].toFixed(2);
                opt.setAttribute('data-price', price);
                opt.textContent = `${gb} GB - ${price} GHS`;
                opt.style.display = '';
                opt.disabled     = false;
            } else {
                // Dealer didn't set a price for this size — hide it
                opt.style.display = 'none';
                opt.disabled      = true;
            }
        }
    }

    function refreshDetailsPanel(bundleSelect) {
        const priceEl = document.getElementById('bundlePrice');
        if (!priceEl) return;
        const sel = bundleSelect.options[bundleSelect.selectedIndex];
        if (sel && sel.value) {
            priceEl.textContent = (sel.getAttribute('data-price') || '—') + ' GHS';
        }
    }

    // ── Main logic (runs after DOM is ready) ──────────────────────────────────

    async function run() {
        const { store, clientType } = getContext();

        // Not a storefront visit — nothing to do
        if (!store || !clientType) return;

        const bundleSelect = document.getElementById('bundle');
        if (!bundleSelect) return;

        const pageProvider = detectProvider(bundleSelect);
        if (!pageProvider) return;

        // ── Fetch prices ──────────────────────────────────────────────────────
        let allPrices = [];
        try {
            const res = await fetch(
                `${API}/storefront-prices` +
                `?store=${encodeURIComponent(store)}` +
                `&clientType=${encodeURIComponent(clientType)}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allPrices = await res.json();
        } catch (err) {
            console.warn('[storefront-prices] fetch failed:', err);
            return;
        }

        // Log what came back so we can debug mismatches easily
        console.log('[storefront-prices] received:', allPrices);
        console.log('[storefront-prices] page provider:', pageProvider);

        // ── Filter to this page's provider ───────────────────────────────────
        // Normalise both sides to lowercase for a safe comparison
        const providerPrices = allPrices.filter(
            p => p.provider.trim().toLowerCase() === pageProvider.toLowerCase()
        );

        if (!providerPrices.length) {
            console.warn('[storefront-prices] No prices found for provider:', pageProvider);
            return;
        }

        // Build  GB-count → price  map
        // packageName in DB is e.g. "1 GB", "2 GB" — extract the leading number
        const gbToPrice = {};
        for (const entry of providerPrices) {
            const m = String(entry.packageName).match(/^(\d+(?:\.\d+)?)/);
            if (m) gbToPrice[m[1]] = parseFloat(entry.price);
        }

        console.log('[storefront-prices] gbToPrice map:', gbToPrice);

        // ── Patch the dropdown ────────────────────────────────────────────────
        patchDropdown(bundleSelect, gbToPrice);

        // If a bundle is already selected, refresh the details panel price
        refreshDetailsPanel(bundleSelect);

        // ── Keep the details panel in sync whenever the user changes bundle ──
        // Remove any old listener first to avoid doubles
        const freshSelect = document.getElementById('bundle');
        freshSelect.addEventListener('change', () => {
            refreshDetailsPanel(freshSelect);
        });
    }

    // Wait for DOM *and* give storefront-inject.js time to finish its own
    // async fetch (which sets localStorage.storeSlug / clientType).
    // We use DOMContentLoaded + a small defer so inject.js runs first.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(run, 0));
    } else {
        // DOM already ready (script loaded async / deferred)
        setTimeout(run, 0);
    }

})();
