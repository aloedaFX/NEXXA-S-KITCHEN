/* ===========================================
   NEXXA KITCHEN — Customer Frontend Logic
   Modular | LocalStorage MVP | EmailJS ready
   =========================================== */

// ===========================
// CONFIG & CONSTANTS
// ===========================
const CONFIG = {
    restaurantName: 'NEXXA KITCHEN',
    restaurantPhone: '+2348000000000', // WhatsApp number (no + sign for wa.me)
    restaurantEmail: 'orders@nexxakitchen.com',
    bank: {
        name: 'NEXXA KITCHEN LTD',
        number: '0123456789',
        bank: 'GTBank',
    },
    currency: '₦',
    // EmailJS — replace with your keys when going live
    emailjs: {
        serviceID: 'YOUR_SERVICE_ID',
        templateID: 'YOUR_TEMPLATE_ID',
        publicKey: 'YOUR_PUBLIC_KEY',
    },
    // Status flow for orders
    ORDER_STATUS: [
        'Pending',
        'Paid',
        'Preparing',
        'Rider Assigned',
        'Out for Delivery',
        'Delivered',
    ],
};

const STORAGE_KEYS = {
    CART: 'nexxa_cart',
    ORDERS: 'nexxa_orders',
    ADMIN: 'nexxa_admin',
};

// ===========================
// MENU DATA
// ===========================
const MENU = [
    { id: 'f1', name: 'Jollof Rice & Chicken', desc: 'Smoky party-style jollof served with grilled chicken.', price: 2500, category: 'rice', tag: 'Popular', image: 'Jollof Rice & Chicken.jpg' },
    { id: 'f2', name: 'Fried Rice with Shrimp', desc: 'Wok-tossed rice with shrimp, veggies and aromatic spices.', price: 2800, category: 'rice', tag: 'New', image: 'Fried Rice with Shrimp.jpg' },
    { id: 'f3', name: 'Egusi Soup & Pounded Yam', desc: 'Rich melon seed soup with assorted vegetables and protein.', price: 3000, category: 'soup', tag: 'Chef Special', image: 'Egusi miscelati - Etsy Italia.jpg' },
    { id: 'f4', name: 'Amala & Ewedu', desc: 'Soft yam swallow served with ewedu and gbegiri.', price: 2200, category: 'soup', tag: '', image: 'Amala, Ewedu, Gbegiri, Obe ata ati eran _ aka Abula.jpg' },
    { id: 'f5', name: 'Beef Suya', desc: 'Spicy grilled beef skewers dusted with yaji spice.', price: 1800, category: 'protein', tag: 'Hot', image: 'Beef Suya.jpg' },
    { id: 'f6', name: 'Pepper Soup (Goat)', desc: 'Light, fiery and aromatic goat meat pepper soup.', price: 2700, category: 'soup', tag: '', image: 'Goat Meat Peppersoup.jpg' },
    { id: 'f7', name: 'Grilled Tilapia', desc: 'Whole spiced tilapia grilled to golden perfection.', price: 3500, category: 'protein', tag: 'Premium', image: 'Grilled Tilapia.jpg' },
    { id: 'f8', name: 'Chapman Cocktail', desc: 'Refreshing fruit cocktail with citrus and bitters.', price: 1200, category: 'drinks', tag: '', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80' },
    { id: 'f9', name: 'Zobo Drink', desc: 'Chilled hibiscus punch with ginger and pineapple.', price: 800, category: 'drinks', tag: '', image: 'ZOBO.jpg' },
    { id: 'f10', name: 'Ofada Rice & Sauce', desc: 'Local brown rice with spicy ofada sauce and assorted meat.', price: 2900, category: 'rice', tag: 'Local', image: 'Ofada Rice & Sauce.jpg' },
    { id: 'f11', name: 'Chicken Suya Wrap', desc: 'Tender chicken strips tossed in yaji, wrapped in flatbread.', price: 1600, category: 'protein', tag: '', image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&q=80' },
    { id: 'f12', name: 'Moi Moi (Steamed)', desc: 'Steamed bean pudding with egg, fish and shrimp.', price: 900, category: 'soup', tag: '', image: 'Moi Moi (Steamed).jpg' },
];

// ===========================
// STORAGE HELPERS
// ===========================
const Storage = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch (e) { console.error('Storage error', e); }
    },
    remove(key) { localStorage.removeItem(key); },
};

// ===========================
// CART MODULE
// ===========================
const Cart = {
    items: Storage.get(STORAGE_KEYS.CART, []),

    save() { Storage.set(STORAGE_KEYS.CART, this.items); },

    add(item) {
        const existing = this.items.find(i => i.id === item.id);
        if (existing) existing.qty += 1;
        else this.items.push({ ...item, qty: 1 });
        this.save();
        this.render();
        Toast.show(`Added ${item.name} to cart`, 'success');
    },

    increase(id) {
        const item = this.items.find(i => i.id === id);
        if (item) { item.qty += 1; this.save(); this.render(); }
    },

    decrease(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        if (item.qty > 1) item.qty -= 1;
        else this.remove(id);
        this.save(); this.render();
    },

    remove(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save(); this.render();
        Toast.show('Item removed', 'success');
    },

    clear() { this.items = []; this.save(); this.render(); },

    total() {
        return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    },

    count() {
        return this.items.reduce((sum, i) => sum + i.qty, 0);
    },

    render() {
        // Update counts
        const count = this.count();
        const c1 = document.getElementById('cartCount');
        const c2 = document.getElementById('mobCartCount');
        if (c1) c1.textContent = count;
        if (c2) c2.textContent = count;

        // Render items
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Your cart is empty</p>
                    <small>Add some delicious meals to get started</small>
                </div>`;
        } else {
            container.innerHTML = this.items.map(i => `
                <div class="cart-item">
                    <img src="${i.image}" alt="${i.name}" />
                    <div class="cart-item-info">
                        <div class="cart-item-name">${i.name}</div>
                        <div class="cart-item-price">${CONFIG.currency}${(i.price * i.qty).toLocaleString()}</div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="Cart.decrease('${i.id}')"><i class="fas fa-minus"></i></button>
                            <span class="qty-num">${i.qty}</span>
                            <button class="qty-btn" onclick="Cart.increase('${i.id}')"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <button class="cart-remove" onclick="Cart.remove('${i.id}')" aria-label="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        const totalEl = document.getElementById('cartTotal');
        if (totalEl) totalEl.textContent = `${CONFIG.currency}${this.total().toLocaleString()}`;
    },
};

// ===========================
// MENU MODULE
// ===========================
const Menu = {
    currentCategory: 'all',

    render() {
        const grid = document.getElementById('menuGrid');
        if (!grid) return;
        const filtered = this.currentCategory === 'all'
            ? MENU
            : MENU.filter(f => f.category === this.currentCategory);

        grid.innerHTML = filtered.map((f, i) => `
            <div class="food-card" style="animation-delay: ${i * 60}ms">
                <div class="food-image">
                    <img src="${f.image}" alt="${f.name}" loading="lazy" />
                    ${f.tag ? `<span class="food-tag">${f.tag}</span>` : ''}
                </div>
                <div class="food-body">
                    <h3 class="food-name">${f.name}</h3>
                    <p class="food-desc">${f.desc}</p>
                    <div class="food-footer">
                        <span class="food-price">${CONFIG.currency}${f.price.toLocaleString()}</span>
                        <button class="add-cart-btn" onclick="Menu.addToCart('${f.id}')" aria-label="Add to cart">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    addToCart(id) {
        const item = MENU.find(f => f.id === id);
        if (item) Cart.add(item);
    },

    filter(category) {
        this.currentCategory = category;
        document.querySelectorAll('.category-card').forEach(c => {
            c.classList.toggle('active', c.dataset.category === category);
        });
        this.render();
    },
};

// ===========================
// ORDERS MODULE
// ===========================
const Orders = {
    list: Storage.get(STORAGE_KEYS.ORDERS, []),

    save() { Storage.set(STORAGE_KEYS.ORDERS, this.list); },

    create(data) {
        const order = {
            id: this.generateId(),
            ...data,
            paymentStatus: data.paymentMethod === 'transfer' ? 'Pending' : 'Pending',
            orderStatus: 'Pending',
            rider: null,
            createdAt: new Date().toISOString(),
        };
        this.list.unshift(order);
        this.save();
        return order;
    },

    update(id, patch) {
        const order = this.list.find(o => o.id === id);
        if (order) {
            Object.assign(order, patch);
            this.save();
        }
        return order;
    },

    get(id) { return this.list.find(o => o.id === id); },

    generateId() {
        return 'NK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100);
    },
};

// ===========================
// EMAIL MODULE (EmailJS-ready)
// ===========================
const Email = {
    /**
     * Send email via EmailJS. Falls back to console.log in MVP.
     * To enable: include EmailJS SDK, replace creds in CONFIG.emailjs.
     */
    send(templateParams) {
        // Production: uncomment when EmailJS is configured
        // if (window.emailjs && CONFIG.emailjs.publicKey !== 'YOUR_PUBLIC_KEY') {
        //     emailjs.init(CONFIG.emailjs.publicKey);
        //     return emailjs.send(
        //         CONFIG.emailjs.serviceID,
        //         CONFIG.emailjs.templateID,
        //         templateParams
        //     );
        // }

        // MVP fallback
        console.log('[Email] Would send:', templateParams);
        return Promise.resolve({ status: 200 });
    },

    sendNewOrder(order) {
        return this.send({
            type: 'NEW_ORDER',
            to_email: CONFIG.restaurantEmail,
            order_id: order.id,
            customer_name: order.name,
            customer_phone: order.phone,
            customer_address: order.address,
            order_items: order.items.map(i => `${i.name} x${i.qty}`).join(', '),
            total: `${CONFIG.currency}${order.total.toLocaleString()}`,
            payment_method: order.paymentMethod,
        });
    },

    sendPaymentConfirmation(order) {
        return this.send({
            type: 'PAYMENT_CONFIRMED',
            to_email: CONFIG.restaurantEmail,
            order_id: order.id,
            customer_name: order.name,
            amount: `${CONFIG.currency}${order.total.toLocaleString()}`,
            payment_method: order.paymentMethod,
        });
    },
};

// ===========================
// TRACKING MODULE
// ===========================
const Tracking = {
    STATUS_KEYS: ['Pending', 'Paid', 'Preparing', 'Rider', 'Out', 'Delivered'],
    STATUS_LABELS: ['Order Placed', 'Payment Confirmed', 'Preparing', 'Rider Assigned', 'Out for Delivery', 'Delivered'],

    search(query) {
        const order = Orders.list.find(o =>
            o.id.toLowerCase() === query.trim().toLowerCase() ||
            o.phone.replace(/\s/g, '').includes(query.replace(/\s/g, ''))
        );
        return order;
    },

    render(order) {
        const result = document.getElementById('trackResult');
        if (!result) return;

        const idx = this.statusIndex(order.orderStatus);
        const eta = this.estimateEta(idx);

        result.innerHTML = `
            <div class="order-status">
                <div class="status-header">
                    <div>
                        <small>Order ID</small>
                        <h3>${order.id}</h3>
                    </div>
                    <span class="status-pill ${order.orderStatus.replace(/\s/g, '')}">${order.orderStatus}</span>
                </div>

                <div class="status-tracker">
                    ${this.STATUS_KEYS.map((key, i) => `
                        <div class="tracker-step ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}">
                            <div class="tracker-circle">${i < idx ? '<i class="fas fa-check"></i>' : i + 1}</div>
                            <span class="tracker-label">${this.STATUS_LABELS[i]}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="map-section">
                    ${idx >= 3 ? `
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.7286!2d3.3792!3d6.5244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMzEnMjcuOCJOIDPCsDIyJzQ1LjEiRQ!5e0!3m2!1sen!2sng!4v1700000000000"
                            loading="lazy"></iframe>
                    ` : `
                        <div style="text-align:center;color:#999;">
                            <i class="fas fa-map-marked-alt" style="font-size:60px;margin-bottom:12px;color:#ff4d4d;"></i>
                            <p>Map will activate once your rider is on the way</p>
                        </div>
                    `}
                    ${idx > 0 && idx < 5 ? `<div class="eta-badge"><i class="fas fa-clock"></i> ETA: ${eta}</div>` : ''}
                </div>

                ${order.rider && idx >= 3 ? `
                    <div class="rider-info">
                        <div class="rider-avatar"><i class="fas fa-motorcycle"></i></div>
                        <div style="flex:1">
                            <strong>${order.rider.name}</strong>
                            <div style="font-size:13px;color:#666;">Your delivery rider</div>
                        </div>
                        <a href="tel:${order.rider.phone}" class="btn btn-primary" style="padding:8px 16px;">
                            <i class="fas fa-phone"></i> Call
                        </a>
                    </div>
                ` : ''}

                <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">
                    <h4 style="margin-bottom:12px;font-size:15px;">Order Items</h4>
                    ${order.items.map(i => `
                        <div class="summary-item">
                            <span>${i.name} x${i.qty}</span>
                            <span>${CONFIG.currency}${(i.price * i.qty).toLocaleString()}</span>
                        </div>
                    `).join('')}
                    <div class="summary-total">
                        <span>Total</span>
                        <strong>${CONFIG.currency}${order.total.toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        `;
        result.classList.add('show');
    },

    statusIndex(status) {
        const map = {
            'Pending': 0,
            'Paid': 1,
            'Preparing': 2,
            'Rider Assigned': 3,
            'Out for Delivery': 4,
            'Delivered': 5,
        };
        return map[status] ?? 0;
    },

    estimateEta(idx) {
        const etas = ['--', '30 min', '25 min', '20 min', '12 min', 'Delivered'];
        return etas[idx] ?? '--';
    },
};

// ===========================
// TOAST MODULE
// ===========================
const Toast = {
    show(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i><div class="toast-msg">${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
};

// ===========================
// UI HELPERS
// ===========================
const UI = {
    openCart() {
        document.getElementById('cartDrawer')?.classList.add('open');
        document.getElementById('overlay')?.classList.add('show');
    },
    closeCart() {
        document.getElementById('cartDrawer')?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('show');
    },
    openModal(id) {
        document.getElementById(id)?.classList.add('show');
        document.getElementById('overlay')?.classList.add('show');
    },
    closeModal(id) {
        document.getElementById(id)?.classList.remove('show');
        document.getElementById('overlay')?.classList.remove('show');
    },
    closeAll() {
        document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
        document.getElementById('cartDrawer')?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('show');
    },
    copyText(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => Toast.show('Copied to clipboard', 'success'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); Toast.show('Copied to clipboard', 'success'); }
            catch (e) { Toast.show('Copy failed', 'error'); }
            ta.remove();
        }
    },
    buildWhatsappMessage(cart, customer) {
        let msg = `*🍽️ NEW ORDER — ${CONFIG.restaurantName}*%0A%0A`;
        if (customer) {
            msg += `*Customer:* ${customer.name}%0A`;
            msg += `*Phone:* ${customer.phone}%0A`;
            msg += `*Address:* ${customer.address}%0A%0A`;
        }
        msg += `*Order:*%0A`;
        cart.items.forEach(i => {
            msg += `• ${i.name} x${i.qty} — ${CONFIG.currency}${(i.price * i.qty).toLocaleString()}%0A`;
        });
        msg += `%0A*Total:* ${CONFIG.currency}${cart.total().toLocaleString()}`;
        return msg;
    },
};

// ===========================
// EVENT HANDLERS / WIRING
// ===========================
function wireEvents() {
    // Loading screen
    window.addEventListener('load', () => {
        setTimeout(() => document.getElementById('loadingOverlay')?.classList.add('hidden'), 600);
    });

    // Sticky nav
    window.addEventListener('scroll', () => {
        document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 30);
    });

    // Mobile menu
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('navMenu')?.classList.toggle('open');
    });
    document.querySelectorAll('.nav-link').forEach(l => {
        l.addEventListener('click', () => document.getElementById('navMenu')?.classList.remove('open'));
    });

    // Cart
    document.getElementById('cartBtn')?.addEventListener('click', UI.openCart);
    document.getElementById('mobCartBtn')?.addEventListener('click', UI.openCart);
    document.getElementById('cartClose')?.addEventListener('click', UI.closeCart);
    document.getElementById('overlay')?.addEventListener('click', UI.closeAll);

    // Categories
    document.querySelectorAll('.category-card').forEach(c => {
        c.addEventListener('click', () => Menu.filter(c.dataset.category));
    });

    // Checkout
    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
        if (Cart.items.length === 0) return Toast.show('Your cart is empty', 'error');
        UI.closeCart();
        renderOrderSummary();
        UI.openModal('checkoutModal');
    });
    document.getElementById('checkoutClose')?.addEventListener('click', () => UI.closeModal('checkoutModal'));
    document.getElementById('paymentModalClose')?.addEventListener('click', () => UI.closeModal('paymentModal'));

    document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckout);

    document.getElementById('paidBtn')?.addEventListener('click', handlePaymentConfirmation);
    document.getElementById('trackFromModal')?.addEventListener('click', () => {
        const id = document.getElementById('orderIdDisplay').textContent;
        UI.closeAll();
        document.getElementById('trackInput').value = id;
        const order = Tracking.search(id);
        if (order) Tracking.render(order);
        document.getElementById('track').scrollIntoView({ behavior: 'smooth' });
    });

    // Tracking
    document.getElementById('trackBtn')?.addEventListener('click', () => {
        const q = document.getElementById('trackInput').value;
        if (!q.trim()) return Toast.show('Enter an order ID', 'error');
        const order = Tracking.search(q);
        if (!order) return Toast.show('Order not found', 'error');
        Tracking.render(order);
    });
    document.getElementById('trackInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('trackBtn').click();
    });

    // Bank
    document.getElementById('copyBank')?.addEventListener('click', () => {
        const txt = `Account Name: ${CONFIG.bank.name}\nAccount Number: ${CONFIG.bank.number}\nBank: ${CONFIG.bank.bank}`;
        UI.copyText(txt);
    });

    // WhatsApp
    document.getElementById('whatsappOrder')?.addEventListener('click', () => {
        if (Cart.items.length === 0) return Toast.show('Cart is empty', 'error');
        const msg = UI.buildWhatsappMessage(Cart, null);
        window.open(`https://wa.me/${CONFIG.restaurantPhone}?text=${msg}`, '_blank');
    });
    document.getElementById('whatsappFloat')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (Cart.items.length === 0) {
            Toast.show('Add items to cart first', 'error');
            return;
        }
        const msg = UI.buildWhatsappMessage(Cart, null);
        window.open(`https://wa.me/${CONFIG.restaurantPhone}?text=${msg}`, '_blank');
    });
}

function renderOrderSummary() {
    const c = document.getElementById('orderSummary');
    if (!c) return;
    c.innerHTML = Cart.items.map(i => `
        <div class="summary-item">
            <span>${i.name} x${i.qty}</span>
            <span>${CONFIG.currency}${(i.price * i.qty).toLocaleString()}</span>
        </div>
    `).join('') + `
        <div class="summary-total">
            <span>Total</span>
            <strong>${CONFIG.currency}${Cart.total().toLocaleString()}</strong>
        </div>
    `;
}

async function handleCheckout(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('custName').value.trim(),
        phone: document.getElementById('custPhone').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        address: document.getElementById('custAddress').value.trim(),
        items: Cart.items.map(i => ({ ...i })),
        total: Cart.total(),
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
    };

    if (!data.name || !data.phone || !data.address) {
        return Toast.show('Please fill all required fields', 'error');
    }

    const order = Orders.create(data);
    await Email.sendNewOrder(order);

    // Update UI
    Cart.clear();
    UI.closeModal('checkoutModal');
    document.getElementById('orderIdDisplay').textContent = order.id;
    document.getElementById('orderInfoCard').innerHTML = `
        <div class="summary-item"><span>Customer</span><span>${order.name}</span></div>
        <div class="summary-item"><span>Phone</span><span>${order.phone}</span></div>
        <div class="summary-item"><span>Address</span><span>${order.address}</span></div>
        <div class="summary-item"><span>Payment</span><span>${order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Pay on Delivery'}</span></div>
        <div class="summary-total"><span>Total</span><strong>${CONFIG.currency}${order.total.toLocaleString()}</strong></div>
    `;
    UI.openModal('paymentModal');
    Toast.show('Order placed successfully!', 'success');
}

async function handlePaymentConfirmation() {
    const id = document.getElementById('orderIdDisplay').textContent;
    const order = Orders.get(id);
    if (!order) return;
    Orders.update(id, { paymentStatus: 'Paid', orderStatus: 'Paid' });
    await Email.sendPaymentConfirmation(order);
    Toast.show('Payment confirmed! Restaurant notified.', 'success');
    document.getElementById('paidBtn').innerHTML = '<i class="fas fa-check"></i> Payment Confirmed';
    document.getElementById('paidBtn').disabled = true;
    document.getElementById('paidBtn').style.opacity = '0.6';
}

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    Menu.render();
    Cart.render();
    wireEvents();
});

// Expose modules to window for inline handlers
window.Cart = Cart;
window.Menu = Menu;
window.Orders = Orders;
window.Tracking = Tracking;
window.Toast = Toast;
window.UI = UI;
