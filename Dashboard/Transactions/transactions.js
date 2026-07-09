// transactions.js – Wallet Top‑Up orders
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

async function fetchTransactions() {
    try {
        const guestSessionId = localStorage.getItem('guestSessionId');
        const storeSlug      = localStorage.getItem('storeSlug');
        const token          = localStorage.getItem('token');

        let url, headers;

        if (token) {
            url     = `${API_BASE}/transactions`;
            headers = authHeaders();
        } else {
            if (!guestSessionId || !storeSlug) {
                renderTransactions([]);
                return;
            }
            url     = `${API_BASE}/guest/transactions?guestSessionId=${encodeURIComponent(guestSessionId)}&store=${encodeURIComponent(storeSlug)}`;
            headers = { 'Content-Type': 'application/json' };
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error();
        allTransactions = await res.json();
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
        let statusClass = 'status-pending';
        let displayStatus = txn.status || '';
        const s = displayStatus.toLowerCase();
        if (s === 'complete' || s === 'completed') {
            statusClass = 'status-complete';
            displayStatus = 'Completed';
        } else if (s === 'failed') {
            statusClass = 'status-failed';
            displayStatus = 'Failed';
        } else if (s === 'processing') {
            statusClass = 'status-processing';
            displayStatus = 'Processing';
        } else if (s === 'pending') {
            statusClass = 'status-pending';
            displayStatus = 'Pending';
        } else {
            displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
        }
        const date = new Date(txn.created).toLocaleString();
        html += `<tr>
            <td>${txn.beneficiary_phone || '-'}</td>
            <td>${txn.description || 'Wallet Topup'}</td>
            <td>GHS ${parseFloat(txn.amount || 0).toFixed(2)}</td>
            <td>${txn.method || '-'}</td>
            <td>${date}</td>
            <td><span class="status-badge ${statusClass}">${displayStatus}</span></td>
            <td><a href="#" class="action-btn refresh-txn" data-id="${txn._id}"><i class="fa-solid fa-rotate"></i> Refresh</a></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    // Mobile cards
    if (mobileContainer) {
        let cards = '';
        transactions.forEach(txn => {
            let mobileStatusClass = 'status-pending';
            let displayStatus = txn.status || '';
            const ms = displayStatus.toLowerCase();
            if (ms === 'complete' || ms === 'completed') {
                mobileStatusClass = 'status-complete';
                displayStatus = 'Completed';
            } else if (ms === 'failed') {
                mobileStatusClass = 'status-failed';
                displayStatus = 'Failed';
            } else if (ms === 'processing') {
                mobileStatusClass = 'status-processing';
                displayStatus = 'Processing';
            } else if (ms === 'pending') {
                mobileStatusClass = 'status-pending';
                displayStatus = 'Pending';
            } else {
                displayStatus = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
            }
            cards += `<div class="order-card">
                <div class="card-row"><span class="card-label">NUMBER:</span><span class="card-value">${txn.beneficiary_phone || '-'}</span></div>
                <div class="card-row"><span class="card-label">DESCRIPTION:</span><span class="card-value">${txn.description || 'Wallet Topup'}</span></div>
                <div class="card-row"><span class="card-label">AMOUNT:</span><span class="card-value">GHC ${txn.amount}</span></div>
                <div class="card-row"><span class="card-label">METHOD:</span><span class="card-value">${txn.method || '-'}</span></div>
                <div class="card-row"><span class="card-label">DATE:</span><span class="card-value">${new Date(txn.created).toLocaleString()}</span></div>
                <div class="card-row"><span class="card-label">STATUS:</span><span class="card-value"><span class="status-badge ${mobileStatusClass}">${displayStatus}</span></span></div>
                <div class="card-row"><span class="card-label">ACTIONS:</span><span class="card-value"><a href="#" class="action-btn refresh-txn" data-id="${txn._id}"><i class="fa-solid fa-rotate"></i> Refresh</a></span></div>
            </div>`;
        });
        mobileContainer.innerHTML = cards;
    }
    // Attach refresh action
    document.querySelectorAll('.refresh-txn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            fetchTransactions();

            // Optional: you can implement a separate endpoint
        });
    });
}

function filterTransactions(searchTerm) {
    const filtered = allTransactions.filter(t => 
        (t.beneficiary_phone?.toLowerCase().includes(searchTerm) ||
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
            const slug = localStorage.getItem('storeSlug');
            const base = '../dashboard2.html';
            window.location.href = slug ? base + '?store=' + encodeURIComponent(slug) : base;
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

// Apply store branding — works for both guests (storeSlug) and dealers (token)
async function applyUserStoreBranding() {
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

        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle && store.storeName) sidebarTitle.textContent = store.storeName;

        const sidebarLogo = document.getElementById('sidebarLogo');
        if (sidebarLogo) {
            if (store.storeLogo) {
                sidebarLogo.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName || ''} Logo"
                    style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
            } else if (store.storeName) {
                sidebarLogo.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;
                    width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    ${store.storeName.charAt(0).toUpperCase()}</span>`;
            }
        }
    } catch (err) {
        console.warn('Could not load store branding:', err);
    }
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

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    applyUserStoreBranding();
    initializeSearch();
    initializeRefresh();
    fetchTransactions();
});
