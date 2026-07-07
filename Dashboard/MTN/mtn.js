// Auto-detect theme from dashboard
function initializeTheme() {
    // Check for saved theme preference or default to light
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// Sidebar functionality
function initializeSidebar() {
    // Get DOM elements
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const ordersMenu = document.getElementById('ordersMenu');
    const ordersSubMenu = document.getElementById('ordersSubMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Check if elements exist
    if (!menuBtn || !sidebar) return;
    
    // Toggle sidebar
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.classList.add('sidebar-open');
    });
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    
    // Toggle orders sub-menu
    if (ordersMenu && ordersSubMenu) {
        ordersMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            ordersSubMenu.classList.toggle('open');
            
            // Rotate chevron icon
            const chevron = ordersMenu.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.style.transform = ordersSubMenu.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
            }
        });
    }
    
    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm('Are you sure you want to log out?')) {
                // Clear login state
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                
                // Show logout notification
                showLogoutNotification();
                
                // Redirect to login page after notification delay
                setTimeout(() => {
                }, 1500);
            }
        });
    }
    
    // Close sidebar when clicking on a menu item (except orders with submenu)
    document.querySelectorAll('.menu-item:not(#ordersMenu)').forEach(item => {
        item.addEventListener('click', () => {
            closeSidebar();
        });
    });

    // Dashboard link — navigate back to branded store dashboard with slug
    const dashboardLink = document.getElementById('dashboardMenuLink');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();
            const slug = localStorage.getItem('storeSlug');
            const base = '../../Dashboard/dashboard2.html';
            window.location.href = slug ? base + '?store=' + encodeURIComponent(slug) : base;
        });
    }
}

// Simple logout notification
function showLogoutNotification() {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.logout-notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            document.body.removeChild(notification);
        }
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'logout-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: notificationSlideIn 0.3s ease;
            font-size: 14px;
        ">
            <i class="fas fa-check-circle"></i> You have been logged out successfully!
        </div>
    `;
    
    // Add notification styles if not already added
    if (!document.querySelector('#logout-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-notification-styles';
        style.textContent = `
            @keyframes notificationSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes notificationSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Check authentication on page load


// Notification functionality
function initializeNotification() {
    const notification = document.getElementById('notification');
    const notificationClose = document.getElementById('notificationClose');
    
    if (!notification) return { showNotification: () => {}, hideNotification: () => {} };
    
    // Function to show notification
    function showNotification() {
        notification.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideNotification();
        }, 5000);
    }
    
    // Function to hide notification
    function hideNotification() {
        notification.classList.remove('show');
    }
    
    // Close notification when close button is clicked
    if (notificationClose) {
        notificationClose.addEventListener('click', hideNotification);
    }
    
    return { showNotification, hideNotification };
}

// Phone validation functions
function validateMTNPhoneNumber(phone, allowAllFormats = false) {
    // Remove any non-numeric characters
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Check if it's a 10-digit number
    if (cleanPhone.length !== 10) {
        return { isValid: false, message: 'Phone number must be 10 digits' };
    }
    
    // If ported number checkbox is checked, allow all formats
    if (allowAllFormats) {
        return { isValid: true, message: '' };
    }
    
    // Check if it starts with valid MTN prefixes
    const validPrefixes = ['024', '054', '055', '059', '025', '053'];
    const prefix = cleanPhone.substring(0, 3);
    
    if (!validPrefixes.includes(prefix)) {
        return { 
            isValid: false, 
            message: `Invalid MTN Number format. Must start with: ${validPrefixes.join(', ')} or if the number is ported then please tick the 'Ported' option.` 
        };
    }
    
    return { isValid: true, message: '' };
}

// Custom checkbox functionality
function initializeCustomCheckboxes() {
    // Main ported number checkbox
    const portedNumberContainer = document.getElementById('portedNumberContainer');
    const portedNumberCheckbox = document.getElementById('portedNumber');
    const portedNumberBox = document.getElementById('portedNumberBox');
    
    if (portedNumberContainer && portedNumberCheckbox && portedNumberBox) {
        portedNumberContainer.addEventListener('click', function(e) {
            e.preventDefault();
            portedNumberCheckbox.checked = !portedNumberCheckbox.checked;
            portedNumberBox.classList.toggle('checked', portedNumberCheckbox.checked);
            
            // Update the number type in bundle details
            updateNumberType();
        });
        
        // Initialize the box state
        portedNumberBox.classList.toggle('checked', portedNumberCheckbox.checked);
    }
}

// Function to update the number type in bundle details
function updateNumberType() {
    const portedNumberCheckbox = document.getElementById('portedNumber');
    const numberTypeElement = document.getElementById('numberType');
    
    if (portedNumberCheckbox && numberTypeElement) {
        if (portedNumberCheckbox.checked) {
            numberTypeElement.textContent = 'Ported';
        } else {
            numberTypeElement.textContent = 'Normal';
        }
    }
}

// Function to load and apply user's store branding
async function applyUserStoreBranding() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:5000/api/store-settings', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) return;
        
        const store = await response.json();

        // Cache slug so dashboard link navigates back with ?store= param
        if (store.storeSlug) localStorage.setItem('storeSlug', store.storeSlug);

        // Apply store branding to sidebar
        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle) sidebarTitle.textContent = store.storeName;

        const sidebarLogo = document.getElementById('sidebarLogo');
        if (sidebarLogo && store.storeLogo) {
            sidebarLogo.innerHTML = `<img src="${store.storeLogo}" alt="${store.storeName} Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
        } else if (sidebarLogo && store.storeName) {
            sidebarLogo.innerHTML = `<span style="font-size:18px;font-weight:700;color:#6a11cb;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${store.storeName.charAt(0).toUpperCase()}</span>`;
        }
    } catch (err) {
        console.warn('Could not load user store details:', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme, sidebar, and notification
    initializeTheme();
    initializeSidebar();
    applyUserStoreBranding(); // Load user's store branding
    
    // Set provider context for storefront-prices.js
    localStorage.setItem('providerName', 'MTN');
    
    const { showNotification } = initializeNotification();
    initializeCustomCheckboxes();
    
    // Bundle dropdown functionality
    const bundleSelect = document.getElementById('bundle');
    const bundleDetails = document.getElementById('bundleDetails');
    const bundleSize = document.getElementById('bundleSize');
    const bundlePrice = document.getElementById('bundlePrice');
    const bundleValidity = document.getElementById('bundleValidity');
    const bundleNetwork = document.getElementById('bundleNetwork');
    
    // Load prices dynamically
    async function loadAndPopulateBundles() {
        try {
            // Get provider from URL parameter or default to MTN
            const params = new URLSearchParams(window.location.search);
            const provider = params.get('provider') || 'MTN';
            console.log('Loading prices for provider:', provider);
            console.log('Current URL:', window.location.href);
            
            const prices = await loadPricesForProvider(provider);
            console.log('Loaded prices:', prices);
            
            // Update data-network attribute on the select element
            bundleSelect.setAttribute('data-network', provider);
            
            // Clear existing options
            while (bundleSelect.options.length > 1) {
                bundleSelect.remove(1);
            }
            
            if (prices.length === 0) {
                bundleSelect.innerHTML = '<option value="">No bundles available</option>';
                return;
            }
            
            // Sort by package size
            prices.sort((a, b) => {
                const aSize = parseInt(a.packageName) || 0;
                const bSize = parseInt(b.packageName) || 0;
                return aSize - bSize;
            });
            
            // Populate options from loaded prices
            prices.forEach((priceObj, index) => {
                const option = document.createElement('option');
                option.value = index + 1;
                option.setAttribute('data-price', priceObj.price.toFixed(2));
                option.setAttribute('data-validity', '90 days');
                option.setAttribute('data-network', provider);
                option.textContent = `${priceObj.packageName} - ${priceObj.price.toFixed(2)} GHS`;
                bundleSelect.appendChild(option);
            });
            
            bundleSelect.innerHTML = bundleSelect.innerHTML; // Trigger UI update
        } catch (err) {
            console.error('Failed to load bundles:', err);
            bundleSelect.innerHTML = '<option value="">Error loading bundles</option>';
        }
    }
    
    // Load bundles on page load
    loadAndPopulateBundles();
    
    if (bundleSelect && bundleDetails) {
        bundleSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            
            if (selectedOption.value && bundleSize && bundlePrice && bundleValidity && bundleNetwork) {
                bundleSize.textContent = selectedOption.text.split(' - ')[0]; // Extract package size from text
                bundlePrice.textContent = selectedOption.getAttribute('data-price') + ' GHS';
                bundleValidity.textContent = selectedOption.getAttribute('data-validity');
                bundleNetwork.textContent = selectedOption.getAttribute('data-network');
                bundleDetails.classList.add('active');
            } else {
                bundleDetails.classList.remove('active');
            }
        });
    }
    
    // Ported number checkbox
    const portedNumberCheckbox = document.getElementById('portedNumber');
    
    // Numeric-only input for phone number field
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Remove any non-numeric characters
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Validate phone number
            const validation = validateMTNPhoneNumber(this.value, portedNumberCheckbox ? portedNumberCheckbox.checked : false);
            if (!validation.isValid && this.value.length > 0) {
                // Show validation error
                console.log(validation.message);
            }
        });
    }
    
    // Form submission
    const orderBtn = document.getElementById('purchaseBundle');
    
    if (orderBtn && phoneInput && bundleSelect) {
        orderBtn.addEventListener('click', async function() {
            const phoneNumber = phoneInput.value.trim();
            const selectedBundle = bundleSelect.value;
            const selectedBundlePrice = bundleSelect.options[bundleSelect.selectedIndex]?.getAttribute('data-price');
            
            if (!phoneNumber) {
                alert('Please enter a phone number');
                phoneInput.focus();
                return;
            }
            
            // Validate phone number
            const validation = validateMTNPhoneNumber(phoneNumber, portedNumberCheckbox ? portedNumberCheckbox.checked : false);
            if (!validation.isValid) {
                alert(validation.message);
                phoneInput.focus();
                return;
            }
            
            if (!selectedBundle) {
                alert('Please select a bundle');
                bundleSelect.focus();
                return;
            }

            const selectedOption = bundleSelect.options[bundleSelect.selectedIndex];
            const bundleName = selectedOption ? selectedOption.text.split(' - ')[0].trim() : '';
            const amount = parseFloat(selectedOption?.getAttribute('data-price')) || parseFloat(selectedBundlePrice) || 0;
            const params = new URLSearchParams(window.location.search);
            const provider = params.get('provider') || 'MTN';

            // Initiate payment and redirect to OTP page
            const originalBtnHTML = orderBtn.innerHTML;
            orderBtn.disabled = true;
            orderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'http://localhost:5000/api' : `https://${window.location.hostname}/api`;
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const res = await fetch(`${API_BASE}/payment/initiate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        gatewayName:  'Moolre',
                        phoneNumber:  phoneNumber,
                        beneficiary:  phoneNumber,
                        amount:       amount,
                        provider:     'MTN',
                        paymentNetwork: 'MTN',
                        orderProvider: provider || 'MTN',
                        description:  `${provider} ${bundleName}`,
                        packageName:  bundleName,
                        bundle_size:  bundleName,
                        storeSlug:    new URLSearchParams(window.location.search).get('store') || localStorage.getItem('storeSlug') || '',
                        clientType:   localStorage.getItem('clientType') || 'Customers',
                    }),
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Payment initiation failed');
                }

                const transactionId = data.transactionId;

                // Store transaction context for OTP and payment processing pages
                localStorage.setItem('paymentTransactionId', transactionId);
                localStorage.setItem('pendingOrderData', JSON.stringify({
                    package:     provider,
                    bundle_size: bundleName,
                    amount:      amount,
                    beneficiary: phoneNumber,
                    phoneNumber: phoneNumber,
                    transactionId: transactionId,
                    storeSlug:   new URLSearchParams(window.location.search).get('store') || localStorage.getItem('storeSlug') || '',
                    clientType:  localStorage.getItem('clientType') || 'Customers'
                }));

                localStorage.setItem('otpTransactionId', transactionId);
                localStorage.setItem('otpPhoneNumber',   phoneNumber);
                const returnUrl = `/Dashboard/payment-processing.html?transactionId=${transactionId}`;
                localStorage.setItem('otpReturnUrl',     returnUrl);
                
                // Redirect to OTP verification page
                window.location.href = `../payment-otp.html?txid=${transactionId}&phone=${encodeURIComponent(phoneNumber)}&return=${encodeURIComponent(returnUrl)}`;

            } catch (err) {
                console.error('Payment initiation error:', err);
                alert(err.message || 'Could not initiate payment. Please try again.');
                orderBtn.disabled = false;
                orderBtn.innerHTML = originalBtnHTML;
            }
        });
    }
});
