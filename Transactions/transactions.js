// transactions.js – Wallet Top-Up orders
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

function isGuestVisitor() {
    return !localStorage.getItem('token') && !!localStorage.getItem('guestSessionId');
}

let allTransactions = [];

function getTransactionNumber(txn) {
    return txn.paymentPhoneNumber || txn.payment_phone || txn.phoneNumber || txn.beneficiary_phone || '-';
}

function getStatusDisplay(status = '') {
    const normalized = String(status).trim().toLowerCase();
    if (normalized === 'complete' || normalized === 'completed') return { text: 'Completed', className: 'status-completed' };
    if (normalized === 'failed')     return { text: 'Failed',     className: 'status-failed' };
    if (normalized === 'processing') return { text: 'Processing', className: 'status-processing' };
    if (normalized === 'pending')    return { text: 'Pending',    className: 'status-pending' };
    const text = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'Pending';
    return { text, className: 'status-pending' };
}

function isOrderTransaction(txn) {
    return Boolean(txn.orderId) || /bundle purchase/i.test(txn.description || '');
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
// Shows animated placeholder rows immediately so the table is never blank
// while waiting for the API response.
const TXN_SKELETON_ROW = `
    <tr class="skeleton-row">
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell"></span></td>
        <td><span class="skeleton-cell" style="width:70px;"></span></td>
        <td><span class="skeleton-cell" style="width:60px;"></span></td>
        <td><span class="skeleton-cell" style="width:120px;"></span></td>
        <td><span class="skeleton-cell" style="width:80px;border-radius:20px;"></span></td>
        <td><span class="skeleton-cell" style="width:70px;border-radius:6px;"></span></td>
    </tr>`;

function showSkeletonRows() {
    const tbody = document.querySelector('.orders-table tbody');
    if (tbody) tbody.innerHTML = Array(6).fill(TXN_SKELETON_ROW).join('');
    const mobile = document.querySelector('.mobile-cards');
    if (mobile) mobile.innerHTML = '';
}

// ── Branding cache ─────────────────────────────────────────────────────────────
// Reads storeBrandName / storeBrandLogo from localStorage and applies them
// synchronously — zero network delay, eliminates the default-name flash.
// Keys are written by applyStoreBranding() after every successful API fetch.
function applyBrandingFromCache() {
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
            l.innerHTML = `<img src="${logo}" alt="${name || ''} Logo"
                style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (name) {
            l.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;
                width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                ${name.charAt(0).toUpperCase()}</span>`;
        }
    }
}

// ── Data fetch ─────────────────────────────────────────────────────────────────
async function fetchTransactions() {
    showSkeletonRows(); // instant feedback before network call
    try {
        let transactions;

        if (isGuestVisitor()) {
            const guestSessionId = localStorage.getItem('guestSessionId');
            const storeSlug      = localStorage.getItem('storeSlug');
            if (!guestSessionId || !storeSlug) { renderTransactions([]); return; }
            const res = await fetch(
                `${API_BASE}/guest/transactions?guestSessionId=${encodeURIComponent(guestSessionId)}&store=${encodeURIComponent(storeSlug)}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (!res.ok) throw new Error('Failed to load transactions');
            transactions = await res.json();
        } else {
            const res = await fetch(`${API_BASE}/transactions`, { headers: authHeaders() });
            if (!res.ok) throw new Error();
            transactions = await res.json();
        }

        allTransactions = transactions.filter(isOrderTransaction);
        renderTransactions(allTransactions);
    } catch (err) {
        console.error(err);
        renderTransactions([]);
    }
}

// ── Render ─────────────────────────────────────────────────────────────────────
function renderTransactions(transactions) {
    const tbody = document.querySelector('.orders-table tbody');
    const mobileContainer = document.querySelector('.mobile-cards');
    if (!tbody) return;

    if (!transactions.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No transactions found.</div></td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = `<div class="order-card empty-card">No transactions found.</div>`;
        return;
    }

    let html = '';
    transactions.forEach(txn => {
        const status = getStatusDisplay(txn.status);
        const num    = getTransactionNumber(txn);
        const date   = txn.created ? new Date(txn.created).toLocaleString() : '-';
        html += `<tr>
            <td>${num}</td>
            <td>${txn.description || 'Bundle Purchase'}</td>
            <td>GHS ${parseFloat(txn.amount || 0).toFixed(2)}</td>
            <td>${txn.method || '-'}</td>
            <td>${date}</td>
            <td><span class="status-badge ${status.className}">${status.text}</span></td>
            <td><a href="#" class="action-btn refresh-txn" data-id="${txn._id}">
                <i class="fa-solid fa-rotate"></i> Refresh
            </a></td>
        </tr>`;
    });
    tbody.innerHTML = html;

    if (mobileContainer) {
        let cards = '';
        transactions.forEach(txn => {
            const status = getStatusDisplay(txn.status);
            const num    = getTransactionNumber(txn);
            const date   = txn.created ? new Date(txn.created).toLocaleString() : '-';
            cards += `<div class="order-card">
                <div class="card-row"><span class="card-label">NUMBER:</span><span class="card-value">${num}</span></div>
                <div class="card-row"><span class="card-label">DESCRIPTION:</span><span class="card-value">${txn.description || 'Bundle Purchase'}</span></div>
                <div class="card-row"><span class="card-label">AMOUNT:</span><span class="card-value">GHS ${parseFloat(txn.amount || 0).toFixed(2)}</span></div>
                <div class="card-row"><span class="card-label">METHOD:</span><span class="card-value">${txn.method || '-'}</span></div>
                <div class="card-row"><span class="card-label">DATE:</span><span class="card-value">${date}</span></div>
                <div class="card-row"><span class="card-label">STATUS:</span><span class="card-value">
                    <span class="status-badge ${status.className}">${status.text}</span>
                </span></div>
                <div class="card-row"><span class="card-label">ACTIONS:</span><span class="card-value">
                    <a href="#" class="action-btn refresh-txn" data-id="${txn._id}">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </a>
                </span></div>
            </div>`;
        });
        mobileContainer.innerHTML = cards;
    }

    document.querySelectorAll('.refresh-txn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); fetchTransactions(); });
    });
}

function filterTransactions(searchTerm) {
    const filtered = allTransactions.filter(t =>
        getTransactionNumber(t).toLowerCase().includes(searchTerm) ||
        (t.description || '').toLowerCase().includes(searchTerm)
    );
    renderTransactions(filtered);
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
}

function initializeSidebar() {
    const menuBtn  = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('overlay');
    if (!menuBtn || !sidebar) return;

    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay?.classList.add('open');
        document.body.classList.add('sidebar-open');
    });

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay?.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    };

    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    document.querySelectorAll('.menu-item:not(#dashboardMenuLink)').forEach(item =>
        item.addEventListener('click', closeSidebar)
    );

    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug = localStorage.getItem('storeSlug');
            const base = '../Dashboard/dashboard2.html';
            window.location.href = slug ? `${base}?store=${encodeURIComponent(slug)}` : base;
        });
    }
}

function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        if (confirm('Log out?')) {
            localStorage.clear();
            window.location.href = '../Registration form/login_and_signup.html';
        }
    });
}

function initializeSearch() {
    const searchBtn   = document.getElementById('searchBtn');
    const searchBar   = document.getElementById('searchBar');
    const searchInput = document.querySelector('.search-input');
    if (searchBtn && searchBar) {
        searchBtn.addEventListener('click', () => {
            searchBar.classList.toggle('open');
            if (searchBar.classList.contains('open')) searchInput?.focus();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterTransactions(e.target.value.toLowerCase()));
    }
}

function initializeRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => fetchTransactions());
}

// ── Branding fetch (runs in background, writes cache for next visit) ───────────
async function applyStoreBranding() {
    try {
        const token     = localStorage.getItem('token');
        const storeSlug = localStorage.getItem('storeSlug');
        let store;

        if (token) {
            const res = await fetch(`${API_BASE}/store-settings`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                cache: 'no-store'
            });
            if (!res.ok) return;
            store = await res.json();
            if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);
        } else if (storeSlug) {
            const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(storeSlug)}`);
            if (!res.ok) return;
            store = await res.json();
        } else {
            return;
        }

        // Persist for instant display on next page load
        if (store.storeName) localStorage.setItem('storeBrandName', store.storeName);
        if (store.storeLogo)  localStorage.setItem('storeBrandLogo', store.storeLogo);
        else                  localStorage.removeItem('storeBrandLogo');
        if (store.whatsappNumber) localStorage.setItem('storeWhatsapp', store.whatsappNumber);

        if (store.storeName) {
            document.title = store.storeName + ' — Transactions';
            const t = document.getElementById('sidebarTitle');
            if (t) t.textContent = store.storeName;
        }
        const l = document.getElementById('sidebarLogo');
        if (l) {
            if (store.storeLogo) {
                l.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName || ''} Logo"
                    style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
            } else if (store.storeName) {
                l.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;
                    width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    ${store.storeName.charAt(0).toUpperCase()}</span>`;
            }
        }
    } catch (err) {
        console.warn('Could not load store branding:', err);
    }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token') && !localStorage.getItem('guestSessionId')) {
        window.location.href = '../Registration form/login_and_signup.html';
        return;
    }
    // 1. Apply cached branding instantly — no network needed, no flash
    applyBrandingFromCache();
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    // 2. Fetch branding + data in parallel in the background
    applyStoreBranding();
    initializeSearch();
    initializeRefresh();
    fetchTransactions();
});
