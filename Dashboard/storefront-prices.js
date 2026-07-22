/**
 * storefront-prices.js
 * Fetches the dealer's saved referral prices for this customer's client type
 * and populates/patches the bundle dropdown on package pages.
 *
 * Must be the LAST <script> tag in the page (after storefront-inject.js).
 *
 * How it works:
 *   1. Reads ?provider= from URL — set by handlePackageCardClick in dashboard.js
 *      (e.g. "MTN", "MTN EXPRESS", "Telecel", "AT Ishare", "AT Bigtime", "MTN AFA")
 *   2. Reads store slug from ?store= (URL) or localStorage.storeSlug
 *   3. Reads client type from ?client= (URL) or localStorage.clientType
 *   4. Fetches matching prices from /api/storefront-prices
 *   5. Builds dropdown options from those prices
 *      — If the dropdown already has options, patches their data-price
 *      — If empty (just a placeholder), builds options from scratch
 *   6. Hides any bundle size that has no price set by the dealer
 */

(function () {

    const API = window.getYoungsterApiBase
        ? window.getYoungsterApiBase()
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5000/api'
            : 'https://youngster-backend-production.up.railway.app/api';

    // Validity labels per provider — shown in the bundle details panel
    const VALIDITY = {
        'mtn':         '90 days',
        'telecel':     '60 days',
        'at ishare':   '60 days',
        'at bigtime':  'Non Expiry',
        'mtn afa':     'Lifetime',
    };

    function getContext() {
        const p = new URLSearchParams(window.location.search);
        return {
            store:      p.get('store')    || localStorage.getItem('storeSlug')  || '',
            clientType: p.get('client')   || localStorage.getItem('clientType') || '',
            provider:   p.get('provider') || localStorage.getItem('providerName') || '',   // e.g. "MTN", "MTN EXPRESS"
        };
    }

    function getValidity(provider) {
        return VALIDITY[provider.toLowerCase()] || '—';
    }

    // Normalize provider name: trim, lowercase, and collapse multiple spaces
    function normalizeProviderName(name) {
        return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Build GB→price map from API response filtered to the requested provider
    function buildGbMap(allPrices, provider) {
        const providerNorm = normalizeProviderName(provider);
        
        // 1. Exact match (normalised) — fastest, most accurate
        let matching = allPrices.filter(p => 
            normalizeProviderName(p.provider) === providerNorm
        );

        // 2. Prefix match: DB entry is a shorter form of the requested provider.
        //    e.g. DB stores "AT" but the page requests "AT Bigtime"
        if (matching.length === 0) {
            matching = allPrices.filter(p => {
                const dbNorm = normalizeProviderName(p.provider);
                // "at bigtime".startsWith("at ") → true, but won't cross-match siblings
                return providerNorm.startsWith(dbNorm + ' ');
            });
        }

        // 3. Specific-keyword fallback: use the LONGEST word in the provider name.
        //    This prevents "at bigtime" from falling back to the generic keyword "at"
        //    and accidentally matching "at ishare" prices (and vice-versa).
        //    Only words longer than 2 chars are considered — short words like "at"
        //    are too ambiguous when multiple providers share the same prefix.
        if (matching.length === 0) {
            const words = providerNorm.split(' ').filter(w => w.length > 2);
            // Sort longest → shortest; pick the most distinctive word
            const specificWord = words.sort((a, b) => b.length - a.length)[0]
                              || providerNorm.split(' ')[0]; // last resort: first word
            matching = allPrices.filter(p => 
                normalizeProviderName(p.provider).includes(specificWord)
            );
        }

        const gbToPrice = {};
        for (const entry of matching) {
            // packageName is stored as e.g. "1 GB", "2 GB" — extract leading number
            const m = String(entry.packageName).match(/(\d+(?:\.\d+)?)/);
            if (m) gbToPrice[m[1]] = parseFloat(entry.price);
        }
        return gbToPrice;
    }

    // Patch existing options (dropdown pre-populated with hardcoded options)
    function patchExistingOptions(bundleSelect, gbToPrice, provider) {
        for (const opt of bundleSelect.options) {
            if (!opt.value) continue;
            const gb = opt.value; // "1", "2", "3" or possibly "1 GB"
            // Match by numeric prefix so "1 GB" and "1" both hit the same map entry
            const numKey = String(gb).match(/^(\d+(?:\.\d+)?)/)?.[1];
            const price  = gbToPrice[gb] !== undefined ? gbToPrice[gb]
                         : (numKey && gbToPrice[numKey] !== undefined ? gbToPrice[numKey] : undefined);
            if (price !== undefined) {
                const label = numKey ? `${numKey} GB` : gb; // normalise to "1 GB"
                opt.value    = label; // full label — picked up by submitOrder as bundle_size
                opt.setAttribute('data-price',    price.toFixed(2));
                opt.setAttribute('data-validity',  getValidity(provider));
                opt.setAttribute('data-network',   provider);
                opt.textContent  = `${label} - ${price.toFixed(2)} GHS`;
                opt.style.display = '';
                opt.disabled      = false;
            } else {
                opt.style.display = 'none';
                opt.disabled      = true;
            }
        }
    }

    // Build options from scratch (dropdown was empty — just placeholder)
    function buildOptionsFromScratch(bundleSelect, gbToPrice, provider) {
        // Remove all non-placeholder options first
        while (bundleSelect.options.length > 1) bundleSelect.remove(1);

        const sizes = Object.keys(gbToPrice).sort((a, b) => parseFloat(a) - parseFloat(b));

        if (sizes.length === 0) {
            const empty = document.createElement('option');
            empty.value    = '';
            empty.textContent = 'No bundles available';
            empty.disabled = true;
            bundleSelect.appendChild(empty);
            return;
        }

        sizes.forEach((gb, i) => {
            const price = gbToPrice[gb].toFixed(2);
            const label = `${gb} GB`; // full label e.g. "1 GB"
            const opt   = document.createElement('option');
            opt.value   = label;       // full label stored as value — used by submitOrder
            opt.setAttribute('data-price',    price);
            opt.setAttribute('data-validity',  getValidity(provider));
            opt.setAttribute('data-network',   provider);
            opt.textContent = `${label} - ${price} GHS`;
            bundleSelect.appendChild(opt);
        });
    }

    // Refresh the bundle details panel to show the currently selected option's price
    function refreshDetailsPanel(bundleSelect) {
        const priceEl    = document.getElementById('bundlePrice');
        const sizeEl     = document.getElementById('bundleSize');
        const validityEl = document.getElementById('bundleValidity');
        const networkEl  = document.getElementById('bundleNetwork');
        if (!priceEl) return;

        const sel = bundleSelect.options[bundleSelect.selectedIndex];
        if (sel && sel.value) {
            if (priceEl)    priceEl.textContent    = (sel.getAttribute('data-price')    || '—') + ' GHS';
            if (sizeEl)     sizeEl.textContent     = sel.value; // value is already full label e.g. '1 GB'
            if (validityEl) validityEl.textContent = sel.getAttribute('data-validity')  || '—';
            if (networkEl)  networkEl.textContent  = sel.getAttribute('data-network')   || '—';
        }
    }

    async function run() {
        const { store, clientType, provider } = getContext();

        // Nothing to do if no store context or no provider
        if (!store || !provider) {
            console.warn('[storefront-prices] Missing store or provider context', { store, provider });
            return;
        }

        // Read clientType from URL ?client= param first — set by the referral link.
        // This ensures sub-agents, agents etc. only see prices set for their type.
        // Fall back to localStorage then empty string (server returns nothing if no
        // prices set for that type, which is the correct behaviour).
        const resolvedClientType = clientType
            || localStorage.getItem('clientType')
            || '';

        const bundleSelect = document.getElementById('bundle');
        if (!bundleSelect) {
            console.warn('[storefront-prices] bundle dropdown not found');
            return;
        }

        // If no clientType is present the customer arrived without a typed referral
        // link — show no prices rather than leaking another type's pricing.
        if (!resolvedClientType) {
            console.warn('[storefront-prices] No clientType in URL or localStorage — showing no prices');
            const placeholder = bundleSelect.options[0];
            if (placeholder) {
                placeholder.textContent = 'No bundles available';
                placeholder.disabled = false;
            }
            while (bundleSelect.options.length > 1) bundleSelect.remove(1);
            return;
        }

        // Fetch all prices for this store + client type
        let allPrices = [];
        try {
            const res = await fetch(
                `${API}/storefront-prices` +
                `?store=${encodeURIComponent(store)}` +
                `&clientType=${encodeURIComponent(resolvedClientType)}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allPrices = await res.json();
        } catch (err) {
            console.warn('[storefront-prices] fetch failed:', err);
            return;
        }

        console.log('[storefront-prices] Loaded for store:', store, '| clientType:', resolvedClientType);
        console.log('[storefront-prices] Provider being matched:', provider);
        console.log('[storefront-prices] All available prices from API:', allPrices);
        console.log('[storefront-prices] Available providers in API response:', [...new Set(allPrices.map(p => p.provider))]);
        console.log(
            allPrices
                .filter(p => p.provider.toLowerCase().includes('at'))
                .map(p => ({
                provider: p.provider,
                packageName: p.packageName,
                price: p.price
            }))
        );
        // Always rebuild from scratch — wipe any options added by price-loader.js
        // or hardcoded in the HTML to prevent duplicates and inactive ghost entries.
        // Remove all non-placeholder options first, then build fresh from API prices.
        while (bundleSelect.options.length > 1) bundleSelect.remove(1);

        const gbToPrice = buildGbMap(allPrices, provider);
        console.log('[storefront-prices] Built price map:', gbToPrice);

        if (Object.keys(gbToPrice).length === 0) {
            console.warn('[storefront-prices] ⚠️ No prices found for provider:', provider);
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No prices available — contact seller';
            empty.disabled = true;
            bundleSelect.appendChild(empty);
            return;
        }

        buildOptionsFromScratch(bundleSelect, gbToPrice, provider);

        // Refresh details panel if something is already selected
        refreshDetailsPanel(bundleSelect);

        // Apply displayConfig customizations (page title, colours, labels etc.)
        // from the first price row that carries one — set by the admin display config modal.
        const config = allPrices.find(p => p.displayConfig && p.provider &&
            normalizeProviderName(p.provider) === normalizeProviderName(provider))?.displayConfig
            || allPrices.find(p => p.displayConfig)?.displayConfig;

        if (config) {
            // Header colour
            if (config.headerColor) {
                document.documentElement.style.setProperty('--accent-color', config.headerColor);
                document.documentElement.style.setProperty('--accent-gradient',
                    `linear-gradient(135deg, ${config.headerColor} 0%, #2575fc 100%)`);
                document.documentElement.style.setProperty('--header-bg',
                    `linear-gradient(135deg, ${config.headerColor} 0%, #2575fc 100%)`);
            }
            // Page title & subtitle
            const titleEl = document.getElementById('pageTitle');
            if (titleEl && config.pageTitle) {
                titleEl.textContent = config.pageTitle;
                document.title = config.pageTitle;
            }
            const subtitleEl = document.getElementById('pageSubtitle');
            if (subtitleEl && config.pageSubtitle) subtitleEl.textContent = config.pageSubtitle;

            // Note box
            const noteBox  = document.getElementById('noteBox');
            const noteText = document.getElementById('noteText');
            if (noteBox && noteText) {
                if (config.noteText) { noteText.textContent = config.noteText; noteBox.style.display = 'block'; }
                else noteBox.style.display = 'none';
            }
            // Ported checkbox visibility
            const portedContainer = document.getElementById('portedContainer');
            if (portedContainer) portedContainer.style.display = config.showPortedCheckbox === false ? 'none' : '';

            // Valid prefixes hint
            const prefixHint     = document.getElementById('prefixHint');
            const validPrefixesEl = document.getElementById('validPrefixes');
            if (prefixHint && validPrefixesEl) {
                if (config.showPrefixes !== false && config.validPrefixes) {
                    validPrefixesEl.textContent = config.validPrefixes;
                    prefixHint.style.display = 'block';
                } else {
                    prefixHint.style.display = 'none';
                }
            }
            // Label overrides
            const bundleLabelEl = document.getElementById('bundleLabel');
            if (bundleLabelEl && config.bundleLabel) bundleLabelEl.textContent = `Select ${config.bundleLabel}`;
            const purchaseBtnText = document.getElementById('purchaseBtnText');
            if (purchaseBtnText && config.purchaseLabel) purchaseBtnText.textContent = config.purchaseLabel;
            const deliveryTextEl = document.getElementById('deliveryText');
            if (deliveryTextEl && config.deliveryText) deliveryTextEl.textContent = config.deliveryText;

            // Update validity on all options
            if (config.validity) {
                Array.from(bundleSelect.options).forEach(opt => {
                    if (opt.value) opt.setAttribute('data-validity', config.validity);
                });
            }
        }

        // Keep details panel in sync on every change
        bundleSelect.addEventListener('change', () => refreshDetailsPanel(bundleSelect));
    }

    // Run after DOM is ready. Retry up to 10 times (every 300ms) so we wait
    // for storefront-inject.js to finish its async API fetch and set
    // localStorage.storeSlug / clientType before we try to load prices.
    let _runAttempts = 0;
    let _hasRun = false;

    async function runWithRetry() {
        _runAttempts++;
        const { store, clientType, provider } = getContext();

        if ((!store || !provider) && _runAttempts < 10) {
            console.log(`[storefront-prices] Context not ready (attempt ${_runAttempts}), retrying in 300ms...`, { store, provider, clientType });
            setTimeout(runWithRetry, 300);
            return;
        }

        _hasRun = true;
        await run();
    }

    // Run immediately when storefront-inject.js signals context is ready
    document.addEventListener('storefront-context-ready', () => {
        if (!_hasRun) {
            _runAttempts = 0;
            _hasRun = true;
            run();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runWithRetry, 100));
    } else {
        setTimeout(runWithRetry, 100);
    }

    // Re-run when generic-package.js requests a refresh (e.g. after visibilitychange)
    document.addEventListener('storefront-prices-refresh', () => {
        _runAttempts = 0;
        _hasRun = false;
        setTimeout(runWithRetry, 50);
    });

})();
