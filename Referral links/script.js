// referral links page – connected to backend API
const API_BASE = 'https://youngster-backend.vercel.app';

// ─── Auth helpers ────────────────────────────────────────────────────────────
function authHeaders() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../Registration-form/login_and_signup.html';
        return false;
    }
    return true;
}

/**
 * Wrapper for fetch() that automatically detects 401 responses and logs out the user.
 * If the token has expired or is invalid, this will clear localStorage and redirect to login.
 */
async function authFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        // If we get a 401 (Unauthorized), the token is invalid/expired
        if (response.status === 401) {
            console.warn('[Auth] Received 401 - token expired. Logging out...');
            localStorage.clear();
            showNotification('Your session has expired. Please log in again.', 'error');
            setTimeout(() => {
                window.location.href = '../Registration-form/login_and_signup.html';
            }, 1500);
            return null;
        }
        
        return response;
    } catch (err) {
        console.error('[authFetch] Network error:', err);
        throw err;
    }
}

// ─── Theme ───────────────────────────────────────────────────────────────────
function initializeTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.checked = currentTheme === 'dark';
}

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const newTheme = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.checked = newTheme === 'dark';
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!menuBtn || !sidebar) return;
    const openSidebar  = () => { sidebar.classList.add('open');    overlay?.classList.add('open'); };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };
    menuBtn.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    document.querySelectorAll('.menu-item:not(#ordersMenu)').forEach(i => i.addEventListener('click', closeSidebar));
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.clear();
            showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '../Registration-form/login_and_signup.html';
            }, 1500);
        }
    });
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showNotification(message, type = 'success') {
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

// ─── Referral links + stats cache ─────────────────────────────────────────────
// Keys stored in localStorage so the page renders instantly on repeat visits.
const LINKS_CACHE_KEY   = 'referralLinksCache';    // { permittedTypes, storeSlug }
const METRICS_CACHE_KEY = 'referralMetricsCache';  // { totalReferrals, activeReferrals, … }
const BALANCE_CACHE_KEY = 'referralBalanceCache';  // "GHS 12.50"

function loadLinksFromCache() {
    try {
        const raw = localStorage.getItem(LINKS_CACHE_KEY);
        if (!raw) return false;
        const { permittedClientTypes, storeSlug } = JSON.parse(raw);
        if (!Array.isArray(permittedClientTypes)) return false;
        renderReferralLinkSections(permittedClientTypes, storeSlug);
        return true;
    } catch { return false; }
}

function saveLinksToCache(permittedClientTypes, storeSlug) {
    try { localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify({ permittedClientTypes, storeSlug })); } catch {}
}

function loadMetricsFromCache() {
    try {
        const raw = localStorage.getItem(METRICS_CACHE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        applyMetricsToDOM(data);
        return true;
    } catch { return false; }
}

function saveMetricsToCache(data) {
    try { localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(data)); } catch {}
}

function applyMetricsToDOM(data) {
    const totalEl    = document.getElementById('totalReferralsValue');
    const activeEl   = document.getElementById('activeReferralsValue');
    const inactiveEl = document.getElementById('inactiveReferralsValue');
    const countEl    = document.getElementById('referredUsersCount');
    const activeList   = document.getElementById('activeReferralsList');
    const inactiveList = document.getElementById('inactiveReferralsList');

    if (totalEl)    totalEl.textContent    = data.totalReferrals   ?? 0;
    if (activeEl)   activeEl.textContent   = data.activeReferrals  ?? 0;
    if (inactiveEl) inactiveEl.textContent = data.inactiveReferrals ?? 0;
    const total = (data.activeReferrals ?? 0) + (data.inactiveReferrals ?? 0);
    if (countEl) countEl.textContent = `(${total})`;

    if (activeList) {
        const list = data.activeReferralsList || [];
        activeList.innerHTML = list.length === 0
            ? '<li style="color:#9ca3af;font-size:0.9rem;">No active referrals yet.</li>'
            : list.map(r => `
                <li style="padding:8px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;">${r.label}</span>
                    <span style="background:#d1fae5;color:#065f46;border-radius:12px;padding:2px 10px;font-size:0.8rem;">
                        ${r.orderCount} order${r.orderCount !== 1 ? 's' : ''}
                    </span>
                </li>`).join('');
    }
    if (inactiveList) {
        const list = data.inactiveReferralsList || [];
        inactiveList.innerHTML = list.length === 0
            ? '<li style="color:#9ca3af;font-size:0.9rem;">No inactive referrals.</li>'
            : list.map(r => `
                <li style="padding:8px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:500;">${r.label}</span>
                    <span style="background:#fee2e2;color:#991b1b;border-radius:12px;padding:2px 10px;font-size:0.8rem;">
                        ${r.orderCount} order${r.orderCount !== 1 ? 's' : ''}
                    </span>
                </li>`).join('');
    }
}

// ─── Current user ─────────────────────────────────────────────────────────────
let currentUser = null;

// ─── IMPORTANT: set this to your actual production domain ─────────────────────
// Referral links use the /referral/<slug> route on the backend which redirects
// guests to the correct frontend storefront page with branding applied.
const BACKEND_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://youngster-backend.vercel.app';

const referralBaseUrl = BACKEND_BASE + '/referral/';

async function loadCurrentUser() {
    try {
        const res = await fetch(`${API_BASE}/me`, { headers: authHeaders(), cache: 'no-store' });
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('user', JSON.stringify(currentUser));
        }
    } catch (err) {
        console.error('Failed to load user:', err);
    }
}

async function loadReferralBalance() {
    const balanceEl = document.getElementById('commissionEarnedValue');
    if (!balanceEl) return;

    // Apply cached balance immediately — no flash of "loading"
    const cached = localStorage.getItem(BALANCE_CACHE_KEY);
    if (cached) balanceEl.textContent = cached;

    try {
        const res = await authFetch(`${API_BASE}/balance`, { headers: authHeaders(), cache: 'no-store' });
        if (!res || !res.ok) {
            if (!cached) balanceEl.textContent = 'GHS 0.00';
            return;
        }
        const data = await res.json();
        const text = `GHS ${Number(data.availableBalance || 0).toFixed(2)}`;
        balanceEl.textContent = text;
        localStorage.setItem(BALANCE_CACHE_KEY, text);
    } catch (err) {
        console.error('Failed to load referral balance:', err);
        if (!cached) balanceEl.textContent = 'GHS 0.00';
    }
}

/**
 * Build the referral link.
 * Uses the store slug when available (e.g. "jd-youngster-enterprise"),
 * falling back to the raw user ID only if no slug could be derived.
 */
function buildReferralLink(storeSlugOrId, clientType) {
    // e.g. https://youngster-backend-production.up.railway.app/referral/youngster-data-shop?client=Customers
    const base = referralBaseUrl + encodeURIComponent(storeSlugOrId || 'unknown');
    return clientType ? base + '?client=' + encodeURIComponent(clientType) : base;
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function copyReferralLink(linkTextEl, copyBtn) {
    // Display shows only the slug; the full URL is stored in data-copy-url
    const fullUrl = linkTextEl.dataset.copyUrl || linkTextEl.textContent;
    const success = await copyToClipboard(fullUrl);
    if (success) {
        showNotification('Referral link copied!', 'success');
        if (copyBtn) {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
        }
        linkTextEl.classList.add('copied');
        setTimeout(() => linkTextEl.classList.remove('copied'), 2000);
    } else {
        showNotification('Failed to copy', 'error');
    }
}

// ─── Copy button wiring (called after DOM is built) ───────────────────────────
function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const section  = btn.closest('.referral-section');
            const linkText = section?.querySelector('.link-text') || document.querySelector('.link-text');
            if (linkText) await copyReferralLink(linkText, btn);
        });
    });

    document.querySelectorAll('.link-text').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', async function () {
            const section = this.closest('.referral-section');
            const copyBtn = section?.querySelector('.copy-btn');
            await copyReferralLink(this, copyBtn);
        });
    });
}

// ─── Referral link sections ───────────────────────────────────────────────────
/**
 * Fetch the user's permittedClientTypes and storeSlug from the backend.
 * Returns { permittedClientTypes: string[], storeSlug: string }.
 * Includes retry logic for transient network failures.
 */
async function loadPermittedClientTypes(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`${API_BASE}/my-permitted-client-types`, { headers: authHeaders(), cache: 'no-store' });
            if (!res.ok) {
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    continue;
                }
                return { permittedClientTypes: [], storeSlug: '' };
            }
            const data = await res.json();
            return {
                permittedClientTypes: Array.isArray(data.permittedClientTypes) ? data.permittedClientTypes : [],
                storeSlug: data.storeSlug || ''
            };
        } catch (err) {
            console.error(`Attempt ${attempt}/${retries} - Failed to load permitted client types:`, err);
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }
    console.error('All retries failed for loadPermittedClientTypes');
    return { permittedClientTypes: [], storeSlug: '' };
}

/**
 * Descriptive captions per client type.
 * Add an entry here whenever a new client type is created in the admin panel
 * to give it a friendly subtitle on the referral links page.
 * If a type has no entry here, a generic caption is used — so new types work
 * automatically without requiring changes to this file.
 */
const CLIENT_TYPE_CAPTIONS = {
    'Super-Agents': 'Share with your super-agents. They sell — you earn!',
    'Agents':       'Share with your agents. They sell — you earn!',
    'Customers':    'Share your link. When someone buys through it, you earn commissions automatically.',
    'Retailers':    'Share with retailers. Every sale through your link earns you a commission.',
    'Resellers':    'Share with resellers. They grow your network — you earn on every order.',
    'Sub-Dealers':  'Share with your sub-dealers. The bigger their sales, the more you earn.',
};

function captionFor(clientType) {
    return CLIENT_TYPE_CAPTIONS[clientType]
        || `Share this link with your ${clientType}. Every purchase earns you a commission.`;
}

/**
 * Build and inject one `.referral-section` block per permitted client type.
 * Each section shows a TinyURL short link — fully clickable, domain hidden.
 * Clears any existing static sections in `#referralLinksContainer` first.
 *
 * HTML structure expected in dealers_referral_program.html:
 *   <div id="referralLinksContainer"></div>
 */
function renderReferralLinkSections(permittedTypes, storeSlug) {
    const container = document.getElementById('referralLinksContainer');
    if (!container) return;

    container.innerHTML = ''; // clear previous / static content

    if (!permittedTypes || permittedTypes.length === 0) {
        container.innerHTML = `
            <div class="no-links-notice" style="text-align:center;padding:32px 16px;background:#fef9c3;border:1px solid #fcd34d;border-radius:6px;color:#854d0e;">
                <i class="fas fa-info-circle" style="font-size:2rem;margin-bottom:8px;display:block;"></i>
                <p><strong>No referral link types available yet.</strong><br>
                Contact the administrator to enable referral types for your account, or <button onclick="document.getElementById('refreshLinksBtn')?.click()" style="padding:6px 12px;background:#854d0e;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:8px;margin-top:8px;display:inline-block;">try again</button></p>
            </div>`;
        return;
    }

    // Render one section per permitted client type
    // Each link gets its own &client= param so storefront-prices.js knows
    // which price column to load when the customer opens a bundle page.
    permittedTypes.forEach(clientType => {
        const fullLink = buildReferralLink(storeSlug, clientType);
        const section = document.createElement('div');
        section.className = 'referral-section';
        section.dataset.clientType = clientType;
        section.innerHTML = `
            <h3 class="referral-title">${escapeHtml(clientType)} Referral Link</h3>
            <div class="referral-link">
                <span class="link-text" data-copy-url="${escapeHtml(fullLink)}">
                    <a href="${escapeHtml(fullLink)}" target="_blank" rel="noopener noreferrer"
                        style="color:inherit;text-decoration:underline;word-break:break-all;"
                    >${escapeHtml(fullLink)}</a>
                </span>
                <button class="copy-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
            <p>${escapeHtml(captionFor(clientType))}</p>`;
        container.appendChild(section);
    });

    // Wire copy buttons now that the DOM is fully populated
    setupCopyButtons();
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
}

// ─── Main init ────────────────────────────────────────────────────────────────
async function loadReferralMetrics() {
    // Apply cached metrics instantly — stats appear before any network call
    loadMetricsFromCache();

    // Set stat elements to a loading indicator only if no cache exists
    const totalEl    = document.getElementById('totalReferralsValue');
    const activeEl   = document.getElementById('activeReferralsValue');
    const inactiveEl = document.getElementById('inactiveReferralsValue');
    if (!localStorage.getItem(METRICS_CACHE_KEY)) {
        if (totalEl)    totalEl.textContent    = '—';
        if (activeEl)   activeEl.textContent   = '—';
        if (inactiveEl) inactiveEl.textContent = '—';
    }

    try {
        const res = await authFetch(`${API_BASE}/referral-metrics`, {
            headers: authHeaders(),
            cache: 'no-store'
        });
        if (!res || !res.ok) return;
        const data = await res.json();
        applyMetricsToDOM(data);
        saveMetricsToCache(data);
    } catch (err) {
        console.error('Failed to load referral metrics:', err);
        if (!localStorage.getItem(METRICS_CACHE_KEY)) {
            if (totalEl)    totalEl.textContent    = '0';
            if (activeEl)   activeEl.textContent   = '0';
            if (inactiveEl) inactiveEl.textContent = '0';
        }
    }
}

async function initializeAndLoadLinks() {
    const container = document.getElementById('referralLinksContainer');

    // ── Step 1: render from cache instantly ─────────────────────────────────
    const hadLinksCache = loadLinksFromCache();
    if (!hadLinksCache && container) {
        container.innerHTML = '<div style="text-align:center;padding:24px;opacity:.5;"><i class="fas fa-spinner fa-spin"></i> Loading your referral links...</div>';
    }
    // Metrics and balance also render from cache in their own functions

    // ── Step 2: fetch fresh data in background ───────────────────────────────
    await loadCurrentUser();
    const { permittedClientTypes, storeSlug } = await loadPermittedClientTypes();

    await Promise.all([
        loadReferralBalance(),
        loadReferralMetrics(),
    ]);

    // ── Step 3: update links if data changed ─────────────────────────────────
    const newHash = JSON.stringify({ permittedClientTypes, storeSlug });
    const oldHash = localStorage.getItem(LINKS_CACHE_KEY);
    // Always re-render to ensure freshness (links are cheap DOM operations)
    renderReferralLinkSections(permittedClientTypes, storeSlug);
    saveLinksToCache(permittedClientTypes, storeSlug);
}

function addRefreshButton() {
    const container = document.getElementById('referralLinksContainer');
    if (!container) return;

    // Check if refresh button already exists
    if (document.getElementById('refreshLinksBtn')) return;

    const headerSection = document.querySelector('.description') || container.parentElement;
    if (!headerSection) return;

    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshLinksBtn';
    refreshBtn.className = 'refresh-button';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Links';
    refreshBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        margin: 12px 0;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.3s;
    `;

    refreshBtn.addEventListener('mouseenter', function() {
        this.style.background = '#2980b9';
    });
    refreshBtn.addEventListener('mouseleave', function() {
        this.style.background = '#3498db';
    });

    refreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        refreshBtn.disabled = true;
        const origText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

        await initializeAndLoadLinks();

        refreshBtn.innerHTML = origText;
        refreshBtn.disabled = false;
        showNotification('Links refreshed!', 'success');
    });

    // Insert button after description
    const description = document.querySelector('.description');
    if (description && description.nextSibling) {
        description.parentNode.insertBefore(refreshBtn, description.nextSibling);
    } else if (headerSection) {
        headerSection.appendChild(refreshBtn);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    initializeTheme();
    initializeSidebar();
    initializeLogout();

    // Theme toggle binding
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('change', toggleTheme);

    // Add refresh button
    addRefreshButton();

    // Load and display links
    await initializeAndLoadLinks();
});
