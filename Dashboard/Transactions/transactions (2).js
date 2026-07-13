// transactions.js – Guest platform (My Store)
const API_BASE = (() => {
    const h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://youngster-backend-production.up.railway.app/api';
})();

function authHeaders() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
}

let allTransactions = [];

function getTransactionNumber(txn) {
    return txn.paymentPhoneNumber || txn.payment_phone || txn.phoneNumber || txn.beneficiary_phone || '-';
}

function getStatusDisplay(status = '') {
    const normalized = String(status).trim().toLowerCase();
    if (normalized === 'complete' || normalized === 'completed') {
        return { text: 'Completed', className: 'status-completed' };
    }
    if (normalized === 'failed') {
        return { text: 'Failed', className: 'status-failed' };
    }
    if (normalized === 'processing') {
        return { text: 'Processing', className: 'status-processing' };
    }
    if (normalized === 'pending') {
        return { text: 'Pending', className: 'status-pending' };
    }

    const text = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'Pending';
    return { text, className: 'status-pending' };
}

function isOrderTransaction(txn) {
    return Boolean(txn.orderId) || /bundle purchase/i.test(txn.description || '');
}

async function fetchTransactions() {
    try {
        const token = localStorage.getItem('token');
        const guestSessionId = localStorage.getItem('guestSessionId');
        const storeSlug = localStorage.getItem('storeSlug') ||
            new URLSearchParams(window.location.search).get('store') || '';

        let url;
        if (token && token !== 'null') {
            // Logged-in dealer — use auth endpoint
            url = `${API_BASE}/transactions`;
        } else if (guestSessionId && storeSlug) {
            // Guest — use public guest endpoint
            url = `${API_BASE}/guest/transactions?guestSessionId=${encodeURIComponent(guestSessionId)}&store=${encodeURIComponent(storeSlug)}`;
        } else {
            renderTransactions([]);
            return;
        }

        const headers = (token && token !== 'null') ? authHeaders() : {};
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error();
        allTransactions = (await res.json()).filter(isOrderTransaction);
        renderTransactions(allTransactions);
    } catch (err) {
        console.error(err);
        renderTransactions([]);
    }
}

function renderTransactions(transactions) {
    const tbody = document.querySelector('.orders-table tbody');
    const mobileContainer = document.querySelector('.mobile-cards');
    if (!tbody) return;
    if (!transactions.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">No transactions</div></td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = `<div class="order-card empty-card">No transactions</div>`;
        return;
    }
    // Desktop table
    let html = '';
    transactions.forEach(txn => {
        const status = getStatusDisplay(txn.status);
        const transactionNumber = getTransactionNumber(txn);
        const date = new Date(txn.created).toLocaleString();
        html += `<tr>
            <td>${transactionNumber}</td>
            <td>${txn.description || 'Wallet Topup'}</td>
            <td>GHC ${txn.amount}</td>
            <td>${txn.method || '-'}</td>
            <td>${date}</td>
            <td><span class="status-badge ${status.className}">${status.text}</span></td>
            <td><a href="#" class="action-btn refresh-txn" data-id="${txn._id}"><i class="fa-solid fa-rotate"></i> Refresh</a></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    // Mobile cards
    if (mobileContainer) {
        let cards = '';
        transactions.forEach(txn => {
            const status = getStatusDisplay(txn.status);
            const transactionNumber = getTransactionNumber(txn);
            cards += `<div class="order-card">
                <div class="card-row"><span class="card-label">NUMBER:</span><span class="card-value">${transactionNumber}</span></div>
                <div class="card-row"><span class="card-label">DESCRIPTION:</span><span class="card-value">${txn.description || 'Wallet Topup'}</span></div>
                <div class="card-row"><span class="card-label">AMOUNT:</span><span class="card-value">GHC ${txn.amount}</span></div>
                <div class="card-row"><span class="card-label">METHOD:</span><span class="card-value">${txn.method || '-'}</span></div>
                <div class="card-row"><span class="card-label">DATE:</span><span class="card-value">${new Date(txn.created).toLocaleString()}</span></div>
                <div class="card-row"><span class="card-label">STATUS:</span><span class="card-value"><span class="status-badge ${status.className}">${status.text}</span></span></div>
                <div class="card-row"><span class="card-label">ACTIONS:</span><span class="card-value"><a href="#" class="action-btn refresh-txn" data-id="${txn._id}"><i class="fa-solid fa-rotate"></i> Refresh</a></span></div>
            </div>`;
        });
        mobileContainer.innerHTML = cards;
    }
    // Attach refresh action
    document.querySelectorAll('.refresh-txn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Re-verify functionality would call: POST /api/transactions/reverify/' + btn.dataset.id);
            // Optional: you can implement a separate endpoint
        });
    });
}

function filterTransactions(searchTerm) {
    const filtered = allTransactions.filter(t => 
        (getTransactionNumber(t).toLowerCase().includes(searchTerm) ||
         t.description?.toLowerCase().includes(searchTerm))
    );
    renderTransactions(filtered);
}

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
}

// Initialize sidebar with branded dashboard link
function initializeSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!menuBtn || !sidebar) return;
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay?.classList.add('open');
    });
    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay?.classList.remove('open');
    };
    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    // Exclude dashboardMenuLink — it handles its own navigation + close
    document.querySelectorAll('.menu-item:not(#dashboardMenuLink)').forEach(item => item.addEventListener('click', closeSidebar));

    // Dashboard link — navigate back to branded store dashboard with slug
    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug = localStorage.getItem('storeSlug') || new URLSearchParams(window.location.search).get('store');
            const base = '../dashboard2.html';
            window.location.href = slug ? `${base}?store=${encodeURIComponent(slug)}` : base;
        });
    }
}

// Initialize logout
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        if (confirm('Log out?')) {
            localStorage.clear();
            window.location.href = '../Registration%20form/login_and_signup.html';
        }
    });
}


function initializeSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.querySelector('.search-input');

    // Toggle search bar open/closed when the search icon is clicked
    if (searchBtn && searchBar) {
        searchBtn.addEventListener('click', () => {
            searchBar.classList.toggle('open');
            if (searchBar.classList.contains('open')) {
                searchInput?.focus();
            }
        });
    }

    // Filter transactions as user types
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterTransactions(e.target.value.toLowerCase()));
    }
}
function initializeRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => fetchTransactions());
}

// ─── Store Branding ───────────────────────────────────────────────────────────
// Apply cached branding instantly — only if the slug matches, so we never
// show a different dealer's name/logo on this page.
function applyBrandingFromCache() {
    const storeSlug = localStorage.getItem('storeSlug') || new URLSearchParams(window.location.search).get('store');
    const cachedSlug = localStorage.getItem('storeBrandSlug');
    if (!storeSlug || !cachedSlug || storeSlug.toLowerCase() !== cachedSlug.toLowerCase()) return;

    const name = localStorage.getItem('storeBrandName');
    const logo = localStorage.getItem('storeBrandLogo');
    if (!name && !logo) return;

    if (name) {
        document.title = name + ' — Transactions';
        const t = document.getElementById('sidebarTitle');
        if (t) t.textContent = name;
    }
    const l = document.getElementById('sidebarLogo');
    if (l) {
        if (logo) {
            l.innerHTML = `<img src="${logo}" alt="${name || ''} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (name) {
            l.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${name.charAt(0).toUpperCase()}</span>`;
        }
    }
}

// Fetch and apply full store branding from the API (supports both dealer token and guest slug).
async function applyUserStoreBranding() {
    try {
        const token     = localStorage.getItem('token');
        const storeSlug = localStorage.getItem('storeSlug') || new URLSearchParams(window.location.search).get('store');
        let store;

        if (token && token !== 'null') {
            const res = await fetch(`${API_BASE}/store-settings`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                cache: 'no-store'
            });
            if (!res.ok) return;
            store = await res.json();
            if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);
        } else if (storeSlug) {
            const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(storeSlug)}`);
            if (!res.ok) {
                localStorage.removeItem('storeBrandName');
                localStorage.removeItem('storeBrandLogo');
                localStorage.removeItem('storeWhatsapp');
                localStorage.removeItem('storeBrandSlug');
                return;
            }
            store = await res.json();
        } else {
            return;
        }

        // Persist branding into localStorage cache (keyed to this slug)
        const resolvedSlug = store.storeSlug || storeSlug;
        if (resolvedSlug) localStorage.setItem('storeBrandSlug', resolvedSlug);
        if (store.storeName) localStorage.setItem('storeBrandName', store.storeName);
        if (store.storeLogo)  localStorage.setItem('storeBrandLogo', store.storeLogo);
        else                  localStorage.removeItem('storeBrandLogo');
        if (store.whatsappNumber) localStorage.setItem('storeWhatsapp', store.whatsappNumber);

        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle && store.storeName) sidebarTitle.textContent = store.storeName;

        const sidebarLogo = document.getElementById('sidebarLogo');
        if (sidebarLogo) {
            if (store.storeLogo) {
                sidebarLogo.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName || ''} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
            } else if (store.storeName) {
                sidebarLogo.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${store.storeName.charAt(0).toUpperCase()}</span>`;
            }
        }
    } catch (err) {
        console.warn('Could not load store branding:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Guest platform — no login required for viewing transactions
    // Guests identify via guestSessionId stored in localStorage
    applyBrandingFromCache(); // instant — no network flash
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    initializeSearch();
    initializeRefresh();
    fetchTransactions();
    applyUserStoreBranding(); // update from API in background
});

