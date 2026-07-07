// orders.js – All Orders page
const API_BASE = 'https://youngster-backend-production.up.railway.app/api';
let allOrders = []; // Global collection array holding all state elements

function authHeaders() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Theme initialization helper
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
}

// Sidebar Navigation controller
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
    // Exclude dashboardMenuLink — it handles its own navigation
    document.querySelectorAll('.menu-item:not(#dashboardMenuLink)').forEach(item =>
        item.addEventListener('click', closeSidebar)
    );

    // Dashboard link — navigate back to branded store dashboard with slug
    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug = localStorage.getItem('storeSlug');
            const base = '../dashboard2.html';
            window.location.href = slug ? `${base}?store=${encodeURIComponent(slug)}` : base;
        });
    }
}

// Logout controller
function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.clear();
            window.location.href = '../Registration form/login_and_signup.html';
        }
    });
}

// Async API pull for orders data records
async function fetchOrders() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/orders`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to capture orders from API data backend');
        allOrders = await res.json();
        renderOrders(allOrders);
    } catch (err) {
        console.error('API Error, falling back to embedded client data mockup records:', err);
        // Fallback to static scripts template embed element if connection fails
        const embeddedDataElement = document.getElementById('orders-data');
        if (embeddedDataElement) {
            try {
                allOrders = JSON.parse(embeddedDataElement.textContent);
                renderOrders(allOrders);
            } catch (parseErr) {
                console.error('Error parsing fallback local object maps:', parseErr);
            }
        }
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// Dom Builder Engine
function renderOrders(ordersList) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!ordersList || ordersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center !important; padding: 40px 20px; white-space:normal;"><div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-secondary);"><i class="fas fa-box-open" style="font-size: 2rem;"></i><p>No matching orders found.</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = ordersList.map(order => {
        const createdDate = order.created ? new Date(order.created).toLocaleDateString() : '-';
        const completedDate = order.completed ? new Date(order.completed).toLocaleDateString() : '-';
        const statusClass = (order.status || 'pending').toLowerCase();

        return `
            <tr>
                <td data-label="BENEFICIARY">${order.beneficiary || '-'}</td>
                <td data-label="PACKAGE">${order.package || '-'}</td>
                <td data-label="AMOUNT">${parseFloat(order.amount || 0).toFixed(2)} GHS</td>
                <td data-label="BUNDLE SIZE">${order.bundle_size || '-'}</td>
                <td data-label="CREATED">${createdDate}</td>
                <td data-label="COMPLETED">${completedDate}</td>
                <td data-label="STATUS"><span class="status-badge status-${statusClass}">${order.status || 'Pending'}</span></td>
                <td data-label="REPORT">
                    <button class="action-btn" onclick="alert('Viewing report for order of ${order.beneficiary}')">
                        <i class="fas fa-file-alt"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filters implementation core hook layout
function initializeFilters() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    if (!applyBtn) return;

    applyBtn.addEventListener('click', () => {
        const statusVal = document.getElementById('statusFilter')?.value || '';
        const packageVal = document.getElementById('packageFilter')?.value || '';
        const sortVal = document.getElementById('sortFilter')?.value || 'newest';
        const dateFromVal = document.getElementById('dateFrom')?.value || '';
        const dateToVal = document.getElementById('dateTo')?.value || '';

        let filtered = [...allOrders];

        if (statusVal) {
            filtered = filtered.filter(o => (o.status || '').toLowerCase() === statusVal.toLowerCase());
        }
        if (packageVal) {
            filtered = filtered.filter(o => (o.package || '').toLowerCase().includes(packageVal.toLowerCase()));
        }
        if (dateFromVal) {
            filtered = filtered.filter(o => o.created && new Date(o.created) >= new Date(dateFromVal));
        }
        if (dateToVal) {
            filtered = filtered.filter(o => o.created && new Date(o.created) <= new Date(dateToVal));
        }

        // Sorting evaluation logic handlers
        if (sortVal === 'newest') {
            filtered.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
        } else if (sortVal === 'oldest') {
            filtered.sort((a, b) => new Date(a.created || 0) - new Date(b.created || 0));
        } else if (sortVal === 'amount-high') {
            filtered.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
        } else if (sortVal === 'amount-low') {
            filtered.sort((a, b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0));
        }

        renderOrders(filtered);
    });
    
    // Reset filters button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('statusFilter').value = '';
            document.getElementById('packageFilter').value = '';
            document.getElementById('sortFilter').value = 'newest';
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            renderOrders(allOrders);
        });
    }
    
    // Clear filters button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('statusFilter').value = '';
            document.getElementById('packageFilter').value = '';
            document.getElementById('sortFilter').value = 'newest';
            document.getElementById('dateFrom').value = '';
            document.getElementById('dateTo').value = '';
            renderOrders(allOrders);
        });
    }
}

// Search utility with toggle functionality
function initializeSearch() {
    // Handle mobile search bar toggle
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.querySelector('#searchBar .search-input');
    
    // Toggle search bar on mobile
    if (searchBtn && searchBar) {
        searchBtn.addEventListener('click', () => {
            searchBar.classList.toggle('open');
            if (searchBar.classList.contains('open')) {
                searchInput?.focus();
            }
        });
    }
    
    // Handle desktop search
    const searchBtnDesktop = document.getElementById('searchBtnDesktop');
    const searchBarDesktop = document.getElementById('searchBarDesktop');
    const searchInputDesktop = document.querySelector('#searchBarDesktop .search-input');
    
    if (searchBtnDesktop && searchBarDesktop) {
        searchBtnDesktop.addEventListener('click', () => {
            searchBarDesktop.classList.toggle('open');
            if (searchBarDesktop.classList.contains('open')) {
                searchInputDesktop?.focus();
            }
        });
    }

    // Search input listeners for both mobile and desktop
    const allSearchInputs = document.querySelectorAll('.search-input');
    allSearchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) {
                renderOrders(allOrders);
                return;
            }

            const filtered = allOrders.filter(o => 
                (o.beneficiary || '').toLowerCase().includes(term) || 
                (o.package || '').toLowerCase().includes(term) ||
                (o.status || '').toLowerCase().includes(term)
            );
            renderOrders(filtered);
        });
    });
}

function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchOrders();
        });
    }
}

// Load and apply the logged-in user's store branding to the sidebar
async function applyUserStoreBranding() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch(`${API_BASE}/store-settings`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            cache: 'no-store'
        });
        if (!response.ok) return;
        const store = await response.json();

        // Cache slug so dashboard link navigates back with ?store= param
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
    } catch (err) {
        console.warn('Could not load store branding:', err);
    }
}

// Bootstrapper listener setup execution
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeSidebar();
    initializeLogout();
    initializeSearch();
    initializeFilters();
    initializeRefreshButton();
    applyUserStoreBranding();
    fetchOrders();
});
