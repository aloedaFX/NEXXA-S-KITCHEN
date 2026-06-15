/* ===========================================
   NEXXA KITCHEN — Admin Dashboard Logic
   =========================================== */

// ===========================
// EXPOSE GLOBALS EARLY
// onclick="" attributes on dynamically-rendered order rows resolve at
// click time, so the handler functions must be on window before the
// first render. Register them at module-parse time (top of file) rather
// than at the bottom so this works even if init throws.
// ===========================
window.viewOrder = function (id) { return _viewOrder(id); };
window.markPaid = function (id) { return _markPaid(id); };
window.advanceStatus = function (id) { return _advanceStatus(id); };
window.deleteOrder = function (id) { return _deleteOrder(id); };
window.cancelOrder = function (id) { return _cancelOrder(id); };
window.openRiderModal = function (id) { return _openRiderModal(id); };
window.closeDetailModal = function () { return _closeDetailModal(); };
window.closeRiderModal = function () { return _closeRiderModal(); };
window.refresh = function () { return _refresh(); };
window.switchSection = function (name) { return _switchSection(name); };
window.seedIfEmpty = function () { return _seedIfEmpty(); };

// ===========================
// CONFIG (mirrors customer side)
// ===========================
const STORAGE_KEYS = {
    CART: 'nexxa_cart',
    ORDERS: 'nexxa_orders',
    SETTINGS: 'nexxa_settings',
};

const DEFAULT_SETTINGS = {
    bank: {
        name: 'NEXXA KITCHEN LTD',
        number: '0123456789',
        bank: 'GTBank',
    },
    emailjs: {
        serviceID: 'YOUR_SERVICE_ID',
        templateID: 'YOUR_TEMPLATE_ID',
        publicKey: 'YOUR_PUBLIC_KEY',
    },
};

const STATUS_FLOW = [
    'Pending',
    'Paid',
    'Preparing',
    'Rider Assigned',
    'Out for Delivery',
    'Delivered',
];

// ===========================
// STORAGE
// ===========================
const Storage = {
    get(key, fallback = null) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch (e) { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch (e) { console.error(e); }
    },
};

// ===========================
// STATE
// ===========================
let state = {
    orders: Storage.get(STORAGE_KEYS.ORDERS, []),
    settings: { ...DEFAULT_SETTINGS, ...(Storage.get(STORAGE_KEYS.SETTINGS, {}) || {}) },
    filter: 'all',
    activeOrderId: null,
};

// ===========================
// UTIL
// ===========================
const fmt = n => '₦' + Number(n).toLocaleString();
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const Toast = {
    show(msg, type = 'success') {
        const c = document.getElementById('toastContainer');
        if (!c) return;
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        t.innerHTML = `<i class="fas ${icon}"></i><div class="toast-msg">${msg}</div>`;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    },
};

// ===========================
// ORDERS MODULE
// ===========================
const AdminOrders = {
    save() { Storage.set(STORAGE_KEYS.ORDERS, state.orders); },

    update(id, patch) {
        const o = state.orders.find(x => x.id === id);
        if (o) { Object.assign(o, patch); this.save(); }
        return o;
    },

    remove(id) {
        state.orders = state.orders.filter(x => x.id !== id);
        this.save();
    },

    nextStatus(current) {
        const i = STATUS_FLOW.indexOf(current);
        return STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
    },
};

// ===========================
// RENDER: ANALYTICS
// ===========================
function renderAnalytics() {
    const total = state.orders.length;
    const revenue = state.orders
        .filter(o => o.orderStatus !== 'Pending' || o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + o.total, 0);
    const pending = state.orders.filter(o => o.orderStatus === 'Pending').length;
    const delivered = state.orders.filter(o => o.orderStatus === 'Delivered').length;

    animateNumber('statTotalOrders', total);
    animateNumber('statPending', pending);
    animateNumber('statDelivered', delivered);
    document.getElementById('statRevenue').textContent = fmt(revenue);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    const dur = 800;
    const t0 = performance.now();
    function step(t) {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.floor(start + (target - start) * p);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ===========================
// RENDER: TABLES
// ===========================
function renderRecentOrders() {
    const c = document.getElementById('recentOrders');
    if (!c) return;
    const recent = state.orders.slice(0, 5);
    if (recent.length === 0) {
        c.innerHTML = `<div class="orders-table"><div class="empty-state"><i class="fas fa-inbox"></i><h3>No orders yet</h3><p>Orders will appear here as they come in</p></div></div>`;
        return;
    }
    c.innerHTML = `
        <div class="orders-table">
            <table>
                <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    ${recent.map(o => orderRow(o)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderOrdersTable() {
    const c = document.getElementById('ordersTable');
    if (!c) return;
    const list = state.filter === 'all'
        ? state.orders
        : state.orders.filter(o => o.orderStatus === state.filter);

    if (list.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No orders</h3><p>Nothing to show in this view</p></div>`;
        return;
    }
    c.innerHTML = `
        <table>
            <thead><tr>
                <th>ID</th><th>Customer</th><th>Phone</th><th>Total</th>
                <th>Payment</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>${list.map(o => orderRow(o, true)).join('')}</tbody>
        </table>
    `;
}

function orderRow(o, full = false) {
    const statusKey = o.orderStatus.replace(/\s/g, '');
    const paymentBadge = o.paymentStatus === 'Paid'
        ? '<span class="status-badge Paid">Paid</span>'
        : '<span class="status-badge Pending">Unpaid</span>';

    return `
        <tr>
            <td class="id-cell">${o.id}</td>
            <td>
                <strong>${escapeHtml(o.name)}</strong><br>
                <small style="color:var(--text-light);">${new Date(o.createdAt).toLocaleString()}</small>
            </td>
            ${full ? `<td>${escapeHtml(o.phone)}</td>` : ''}
            <td><strong>${fmt(o.total)}</strong></td>
            ${full ? `<td>${paymentBadge}</td>` : ''}
            <td><span class="status-badge ${statusKey}">${o.orderStatus}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" style="background:#fff0e0;color:#d35400;" onclick="viewOrder('${o.id}')"><i class="fas fa-eye"></i></button>
                    ${o.paymentStatus !== 'Paid' ? `<button class="action-btn pay" onclick="markPaid('${o.id}')"><i class="fas fa-check"></i></button>` : ''}
                    ${!o.rider && o.orderStatus !== 'Cancelled' ? `<button class="action-btn rider" onclick="openRiderModal('${o.id}')"><i class="fas fa-motorcycle"></i></button>` : ''}
                    ${o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled' ? `<button class="action-btn deliver" onclick="advanceStatus('${o.id}')"><i class="fas fa-arrow-right"></i></button>` : ''}
                    ${o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled' ? `<button class="action-btn delete" onclick="cancelOrder('${o.id}')" style="background:#ffe0d5;color:#e74c3c;"><i class="fas fa-ban"></i></button>` : ''}
                    <button class="action-btn delete" onclick="deleteOrder('${o.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `;
}

// ===========================
// RENDER: RIDERS
// ===========================
function renderRiders() {
    const c = document.getElementById('ridersList');
    if (!c) return;
    const active = state.orders.filter(o => o.rider && o.orderStatus !== 'Delivered');
    if (active.length === 0) {
        c.innerHTML = `<div class="orders-table"><div class="empty-state"><i class="fas fa-motorcycle"></i><h3>No active deliveries</h3><p>Active rider assignments will appear here</p></div></div>`;
        return;
    }
    c.innerHTML = active.map(o => `
        <div class="menu-manage-card" style="align-items:flex-start;">
            <div class="rider-avatar" style="width:60px;height:60px;background:var(--gradient);color:white;border-radius:50%;display:grid;place-items:center;font-size:24px;">
                <i class="fas fa-motorcycle"></i>
            </div>
            <div class="menu-manage-info">
                <h4>${escapeHtml(o.rider.name)}</h4>
                <small>${escapeHtml(o.rider.phone)}</small><br>
                <small>Order: <strong>${o.id}</strong> — ${escapeHtml(o.name)}</small>
                <div style="margin-top:6px;">
                    <span class="status-badge ${o.orderStatus.replace(/\s/g,'')}">${o.orderStatus}</span>
                </div>
            </div>
            <div>
                <a href="tel:${o.rider.phone}" class="action-btn rider"><i class="fas fa-phone"></i> Call</a>
            </div>
        </div>
    `).join('');
}

// ===========================
// RENDER: MENU
// ===========================
function renderMenu() {
    const c = document.getElementById('menuList');
    if (!c) return;
    // Pull menu from script (use a global) — fallback to placeholder list
    const menu = window.MENU || [];
    if (menu.length === 0) {
        c.innerHTML = `<div class="orders-table"><div class="empty-state"><i class="fas fa-utensils"></i><h3>Menu preview</h3><p>The full menu lives in script.js — edits there are reflected on the site.</p></div></div>`;
        return;
    }
    c.innerHTML = menu.map(f => `
        <div class="menu-manage-card">
            <img src="${f.image}" alt="${escapeHtml(f.name)}" />
            <div class="menu-manage-info">
                <h4>${escapeHtml(f.name)}</h4>
                <small>${escapeHtml(f.desc)}</small><br>
                <span class="price">${fmt(f.price)}</span>
            </div>
            <span class="status-badge ${f.category === 'soup' ? 'Preparing' : f.category === 'drinks' ? 'Paid' : 'Pending'}">${f.category}</span>
        </div>
    `).join('');
}

// ===========================
// ORDER ACTIONS
// ===========================
function _markPaid(id) {
    AdminOrders.update(id, { paymentStatus: 'Paid', orderStatus: 'Paid' });
    Toast.show('Order marked as paid');
    _refresh();
}

function _advanceStatus(id) {
    const o = state.orders.find(x => x.id === id);
    if (!o) return;
    const next = AdminOrders.nextStatus(o.orderStatus);
    if (next === o.orderStatus) return;
    AdminOrders.update(id, { orderStatus: next });
    Toast.show(`Order advanced to ${next}`);
    _refresh();
}

function _deleteOrder(id) {
    if (!confirm('Delete this order permanently?')) return;
    AdminOrders.remove(id);
    Toast.show('Order deleted', 'error');
    _refresh();
}

function _cancelOrder(id) {
    if (!confirm('Cancel this order? The customer will be notified.')) return;
    AdminOrders.update(id, { orderStatus: 'Cancelled', paymentStatus: 'Cancelled' });
    Toast.show('Order cancelled successfully', 'error');
    _refresh();
}

function _viewOrder(id) {
    const o = state.orders.find(x => x.id === id);
    if (!o) return;
    const content = document.getElementById('orderDetailContent');
    content.innerHTML = `
        <h2><i class="fas fa-receipt"></i> Order ${o.id}</h2>
        <div class="detail-grid">
            <div class="detail-block">
                <h4>Customer</h4>
                <p><strong>${escapeHtml(o.name)}</strong></p>
                <p>${escapeHtml(o.phone)}</p>
                <p>${escapeHtml(o.email || 'No email')}</p>
            </div>
            <div class="detail-block">
                <h4>Delivery Address</h4>
                <p>${escapeHtml(o.address)}</p>
            </div>
            <div class="detail-block">
                <h4>Payment</h4>
                <p><strong>${o.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Pay on Delivery'}</strong></p>
                <p>Status: <span class="status-badge ${o.paymentStatus === 'Paid' ? 'Paid' : 'Pending'}">${o.paymentStatus}</span></p>
            </div>
            <div class="detail-block">
                <h4>Order Status</h4>
                <p><span class="status-badge ${o.orderStatus.replace(/\s/g,'')}">${o.orderStatus}</span></p>
                ${o.rider ? `<p style="margin-top:8px;">Rider: <strong>${escapeHtml(o.rider.name)}</strong> (${escapeHtml(o.rider.phone)})</p>` : ''}
            </div>
        </div>

        <h3 style="margin:24px 0 12px;">Items</h3>
        <div class="detail-block">
            ${o.items.map(i => `
                <div class="summary-item">
                    <span>${escapeHtml(i.name)} x${i.qty}</span>
                    <span>${fmt(i.price * i.qty)}</span>
                </div>
            `).join('')}
            <div class="summary-total">
                <span>Total</span>
                <strong>${fmt(o.total)}</strong>
            </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:24px;flex-wrap:wrap;">
            ${o.paymentStatus !== 'Paid' ? `<button class="btn btn-primary" onclick="markPaid('${o.id}');closeDetailModal();"><i class="fas fa-check"></i> Mark Paid</button>` : ''}
            ${!o.rider && o.orderStatus !== 'Cancelled' ? `<button class="btn btn-secondary" onclick="closeDetailModal();openRiderModal('${o.id}');"><i class="fas fa-motorcycle"></i> Assign Rider</button>` : ''}
            ${o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled' ? `<button class="btn btn-secondary" onclick="advanceStatus('${o.id}');closeDetailModal();viewOrder('${o.id}');"><i class="fas fa-arrow-right"></i> Advance Status</button>` : ''}
            ${o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled' ? `<button class="btn" style="background:#f8d7da;color:#721c24;" onclick="cancelOrder('${o.id}');closeDetailModal();"><i class="fas fa-ban"></i> Cancel Order</button>` : ''}
        </div>
    `;
    document.getElementById('orderDetailModal').classList.add('show');
    document.getElementById('overlay')?.classList.add('show');
}

function closeDetailModal() {
    document.getElementById('orderDetailModal').classList.remove('show');
    document.getElementById('overlay')?.classList.remove('show');
}

// ===========================
// RIDER MODAL
// ===========================
function openRiderModal(id) {
    state.activeOrderId = id;
    document.getElementById('riderModalOrderId').textContent = `Order ID: ${id}`;
    document.getElementById('riderName').value = '';
    document.getElementById('riderPhone').value = '';
    document.getElementById('riderModal').classList.add('show');
    document.getElementById('overlay')?.classList.add('show');
}

function closeRiderModal() {
    document.getElementById('riderModal').classList.remove('show');
    document.getElementById('overlay')?.classList.remove('show');
    state.activeOrderId = null;
}

function handleRiderSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('riderName').value.trim();
    const phone = document.getElementById('riderPhone').value.trim();
    if (!name || !phone) return;
    AdminOrders.update(state.activeOrderId, {
        rider: { name, phone },
        orderStatus: 'Rider Assigned',
    });
    Toast.show(`Rider ${name} assigned`);
    closeRiderModal();
    refresh();
}

// ===========================
// SETTINGS
// ===========================
function renderSettings() {
    document.getElementById('setBankName').value = state.settings.bank.name;
    document.getElementById('setBankNumber').value = state.settings.bank.number;
    document.getElementById('setBankBank').value = state.settings.bank.bank;
    document.getElementById('setServiceId').value = state.settings.emailjs.serviceID;
    document.getElementById('setTemplateId').value = state.settings.emailjs.templateID;
    document.getElementById('setPublicKey').value = state.settings.emailjs.publicKey;
}

function saveSettings() {
    state.settings.bank = {
        name: document.getElementById('setBankName').value.trim(),
        number: document.getElementById('setBankNumber').value.trim(),
        bank: document.getElementById('setBankBank').value.trim(),
    };
    Storage.set(STORAGE_KEYS.SETTINGS, state.settings);
    Toast.show('Settings saved');
}

function saveEmailConfig() {
    state.settings.emailjs = {
        serviceID: document.getElementById('setServiceId').value.trim(),
        templateID: document.getElementById('setTemplateId').value.trim(),
        publicKey: document.getElementById('setPublicKey').value.trim(),
    };
    Storage.set(STORAGE_KEYS.SETTINGS, state.settings);
    Toast.show('Email config saved');
}

// ===========================
// SECTION NAV
// ===========================
function switchSection(name) {
    document.querySelectorAll('.admin-nav button').forEach(b => b.classList.toggle('active', b.dataset.section === name));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'section-' + name));
    const titles = { dashboard: 'Dashboard', orders: 'Orders', riders: 'Riders', menu: 'Menu Management', settings: 'Settings' };
    document.getElementById('sectionTitle').textContent = titles[name] || 'Dashboard';
    if (name === 'riders') renderRiders();
    if (name === 'menu') renderMenu();
    if (name === 'settings') renderSettings();
    if (window.innerWidth <= 900) document.getElementById('adminSidebar')?.classList.remove('open');
}

// ===========================
// REFRESH ALL
// ===========================
function refresh() {
    state.orders = Storage.get(STORAGE_KEYS.ORDERS, []);
    renderAnalytics();
    renderRecentOrders();
    renderOrdersTable();
    renderRiders();
}

// ===========================
// SEED DEMO DATA (only if empty)
// ===========================
function seedIfEmpty() {
    if (state.orders.length > 0) return;
    const sample = [
        {
            id: 'NK00112233',
            name: 'Adaeze Okoro',
            phone: '+234 803 555 1234',
            email: 'ada@example.com',
            address: '15 Admiralty Way, Lekki Phase 1, Lagos',
            items: [
                { id: 'f1', name: 'Jollof Rice & Chicken', price: 2500, qty: 2, image: '' },
                { id: 'f8', name: 'Chapman Cocktail', price: 1200, qty: 1, image: '' },
            ],
            total: 6200,
            paymentMethod: 'transfer',
            paymentStatus: 'Paid',
            orderStatus: 'Preparing',
            rider: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        },
        {
            id: 'NK00112234',
            name: 'Tunde Bakare',
            phone: '+234 705 999 8888',
            email: 'tunde@example.com',
            address: 'Plot 4B, Victoria Island, Lagos',
            items: [
                { id: 'f3', name: 'Egusi Soup & Pounded Yam', price: 3000, qty: 1, image: '' },
                { id: 'f5', name: 'Beef Suya', price: 1800, qty: 2, image: '' },
            ],
            total: 6600,
            paymentMethod: 'delivery',
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            rider: null,
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
            id: 'NK00112235',
            name: 'Chioma Eze',
            phone: '+234 810 222 7788',
            email: 'chioma@example.com',
            address: '32 Awolowo Road, Ikoyi, Lagos',
            items: [
                { id: 'f7', name: 'Grilled Tilapia', price: 3500, qty: 1, image: '' },
                { id: 'f2', name: 'Fried Rice with Shrimp', price: 2800, qty: 1, image: '' },
            ],
            total: 6300,
            paymentMethod: 'transfer',
            paymentStatus: 'Paid',
            orderStatus: 'Out for Delivery',
            rider: { name: 'Ibrahim Musa', phone: '+234 802 444 5566' },
            createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        },
    ];
    state.orders = sample;
    Storage.set(STORAGE_KEYS.ORDERS, state.orders);
}

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    // Initial load of orders from localStorage
    state.orders = Storage.get(STORAGE_KEYS.ORDERS, []);
    seedIfEmpty();
    refresh();

    // Sidebar nav
    document.querySelectorAll('.admin-nav button').forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            state.filter = b.dataset.filter;
            renderOrdersTable();
        });
    });

    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        refresh();
        Toast.show('Refreshed');
    });

    // Rider modal
    document.getElementById('riderForm')?.addEventListener('submit', handleRiderSubmit);
    document.getElementById('riderModalClose')?.addEventListener('click', closeRiderModal);
    document.getElementById('orderDetailClose')?.addEventListener('click', closeDetailModal);
    document.getElementById('overlay')?.addEventListener('click', () => {
        closeRiderModal();
        closeDetailModal();
    });

    // Settings
    document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
    document.getElementById('saveEmailConfig')?.addEventListener('click', saveEmailConfig);

    // Mobile sidebar toggle
    document.getElementById('topbarToggle')?.addEventListener('click', () => {
        document.getElementById('adminSidebar').classList.toggle('open');
    });

    // Listen for storage changes (e.g., from customer page in another tab)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.ORDERS) {
            state.orders = Storage.get(STORAGE_KEYS.ORDERS, []);
            refresh();
        }
    });

    // Aggressive refresh - check every 3 seconds for new orders
    setInterval(() => {
        const updated = Storage.get(STORAGE_KEYS.ORDERS, []);
        if (JSON.stringify(updated) !== JSON.stringify(state.orders)) {
            state.orders = updated;
            refresh();
        }
    }, 3000);
});

// Expose globals EARLY (before DOMContentLoaded) so onclick="" attributes
// rendered by orderRow() can resolve them.
window.viewOrder = viewOrder;
window.markPaid = markPaid;
window.advanceStatus = advanceStatus;
window.deleteOrder = deleteOrder;
window.openRiderModal = openRiderModal;
window.closeDetailModal = closeDetailModal;
window.closeRiderModal = closeRiderModal;
window.refresh = refresh;
window.switchSection = switchSection;
