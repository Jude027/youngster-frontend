// transactions.js – Dealer platform (My Store)
// Sidebar branding is hardcoded in the HTML — no dynamic overrides here.
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

// ── Data fetch ─────────────────────────────────────────────────────────────────
async function fetchTransactions() {
    showSkeletonRows();
    try {
        const res = await fetch(`${API_BASE}/transactions`, { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            window.location.href = '../Registration form/login_and_signup.html';
            return;
        }
        if (!res.ok) throw new Error();
        const all = await res.json();
        allTransactions = all.filter(isOrderTransaction);
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
    document.querySelectorAll('.menu-item').forEach(item =>
        item.addEventListener('click', closeSidebar)
    );
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

// ── Bootstrap ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('token')) {
        window.location.href = '../Registration form/login_and_signup.html';
        return;
    }
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    initializeSearch();
    initializeRefresh();
    fetchTransactions();
});
