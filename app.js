// ==================== FIREBASE CONFIG ====================
// Compatibilidade com Firebase v10.7.1 (compat version)
const firebaseConfig = {
    apiKey: "AIzaSyAyl18uDe0TPyTsMrqz_HOEqPNEDDWnrR0",
    authDomain: "lojadr.firebaseapp.com",
    projectId: "lojadr",
    storageBucket: "lojadr.firebasestorage.app",
    messagingSenderId: "674067127684",
    appId: "1:674067127684:web:4a660a87399277f32f91d1"
};

// Inicialização do Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.log('Firebase já inicializado ou erro na inicialização:', error);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ==================== CONFIG ====================
const CONFIG = {
    adminEmail: "admin@lojadr.com",
    imgbbApiKey: "60429ab3baaf6fcc97ca514ff92979f6",
    whatsappNumber: "5511963290107",
    whatsappMessage: "Olá! Estou interessado no produto: {produto}. Ainda está disponível?",
    whatsappCartMessage: "Olá! Tenho interesse nos seguintes produtos:\n\n{carrinho}\n\nTotal: {total}\n\nAinda estão disponíveis?"
};

// ==================== STATE ====================
let isAdmin = false;
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentImageIndex = 0;
let settings = {};
let appearance = {};
let notifications = [];
let editingProductId = null;
let maintenanceMode = false;

// ==================== SEGURANÇA MODO MANUTENÇÃO ====================
function checkMaintenanceMode() {
    try {
        const maintenance = localStorage.getItem('maintenanceMode');
        const emergencyAccess = localStorage.getItem('emergencyAccess');
        
        // Se modo manutenção ativo e sem acesso de emergência, mostrar overlay
        if (maintenance === 'true' && !emergencyAccess) {
            showMaintenanceOverlay();
            return true;
        }
        
        // Se tem acesso de emergência, esconder overlay
        if (emergencyAccess) {
            hideMaintenanceOverlay();
        }
        
        return false;
    } catch (error) {
        console.error('Erro ao verificar modo manutenção:', error);
        return false;
    }
}

function showMaintenanceOverlay() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideMaintenanceOverlay() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function grantEmergencyAccess() {
    localStorage.setItem('emergencyAccess', 'true');
    hideMaintenanceOverlay();
    showToast('Acesso de emergência concedido!', { icon: '🚨' });
}

// ==================== SAFE ELEMENT SELECTOR ====================
function $(id) {
    return document.getElementById(id);
}

function $$(sel) {
    return document.querySelectorAll(sel);
}

// Safe text content setter
function setText(id, text) {
    try {
        const el = $(id);
        if (el) el.textContent = text;
    } catch (error) {
        console.error('Erro ao definir texto:', error);
    }
}

// Safe innerHTML setter
function setHTML(id, html) {
    try {
        const el = $(id);
        if (el) el.innerHTML = html;
    } catch (error) {
        console.error('Erro ao definir HTML:', error);
    }
}

// Safe value setter
function setValue(id, value) {
    try {
        const el = $(id);
        if (el) el.value = value;
    } catch (error) {
        console.error('Erro ao definir valor:', error);
    }
}

// Safe value getter
function getValue(id) {
    try {
        const el = $(id);
        return el ? el.value : '';
    } catch (error) {
        console.error('Erro ao obter valor:', error);
        return '';
    }
}

// Safe checked setter
function setChecked(id, checked) {
    try {
        const el = $(id);
        if (el) el.checked = checked;
    } catch (error) {
        console.error('Erro ao definir checked:', error);
    }
}

// Safe checked getter
function getChecked(id) {
    try {
        const el = $(id);
        return el ? el.checked : false;
    } catch (error) {
        console.error('Erro ao obter checked:', error);
        return false;
    }
}

// Safe style setter
function setStyle(id, prop, value) {
    try {
        const el = $(id);
        if (el) el.style[prop] = value;
    } catch (error) {
        console.error('Erro ao definir estilo:', error);
    }
}

// Safe class methods
function addClass(id, className) {
    try {
        const el = $(id);
        if (el) el.classList.add(className);
    } catch (error) {
        console.error('Erro ao adicionar classe:', error);
    }
}

function removeClass(id, className) {
    try {
        const el = $(id);
        if (el) el.classList.remove(className);
    } catch (error) {
        console.error('Erro ao remover classe:', error);
    }
}

// ==================== TOAST SYSTEM ====================
function showToast(message, options = {}) {
    try {
        const { bgColor = '#00ff99', textColor = '#000', duration = 4000, icon = '✓' } = options;
        const container = $('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.background = bgColor;
        toast.style.color = textColor;
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
            <button class="close-toast">&times;</button>
        `;
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.close-toast');
        if (closeBtn) {
            closeBtn.onclick = () => removeToast(toast);
        }
        
        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }
    } catch (error) {
        console.error('Erro ao mostrar toast:', error);
    }
}

function removeToast(toast) {
    try {
        if (!toast) return;
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    } catch (error) {
        console.error('Erro ao remover toast:', error);
    }
}

// ==================== AUTH ====================
firebase.auth().onAuthStateChanged(async (user) => {
    try {
        console.log('Auth state changed:', user?.email);
        
        if (user && user.email && user.email.toLowerCase() === CONFIG.adminEmail.toLowerCase()) {
            isAdmin = true;
            setStyle('adminPanel', 'display', 'block');
            setStyle('adminBtn', 'display', 'none');
            setStyle('logoutBtn', 'display', 'block');
            showToast('Bem-vindo, Admin!', { icon: '👑' });
            await loadAllData();
        } else {
            isAdmin = false;
            setStyle('adminPanel', 'display', 'none');
            setStyle('adminBtn', 'display', 'flex');
            setStyle('logoutBtn', 'display', 'none');
        }
        
        await loadProducts();
    } catch (error) {
        console.error('Erro no auth state change:', error);
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Verificar modo manutenção primeiro
        if (checkMaintenanceMode()) {
            return;
        }
        
        // Inicializar botões e eventos
        const adminBtn = $('adminBtn');
        if (adminBtn) {
            adminBtn.onclick = () => addClass('loginModal', 'show');
        }

        const loginForm = $('loginForm');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = getValue('loginEmail');
                const password = getValue('loginPassword');
                
                try {
                    await firebase.auth().signInWithEmailAndPassword(email, password);
                    removeClass('loginModal', 'show');
                    loginForm.reset();
                } catch (error) {
                    console.error('Login error:', error);
                    showToast('Email ou senha incorretos', { bgColor: '#ff4757', icon: '✕' });
                }
            };
        }

        const logoutBtn = $('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                await firebase.auth().signOut();
                showToast('Logout realizado!', { icon: '👋' });
            };
        }

        // Botão de acesso de emergência
        const emergencyBtn = $('emergencyAccess');
        if (emergencyBtn) {
            emergencyBtn.onclick = grantEmergencyAccess;
        }

        // Inicializar outros event listeners
        initEventListeners();
        
        // Carregar produtos iniciais
        loadProducts();
        
        console.log('🚀 Loja DR inicializada com segurança');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao carregar a página', { bgColor: '#ff4757', icon: '✕' });
    }
});

// ==================== LOAD ALL DATA ====================
async function loadAllData() {
    try {
        await Promise.all([
            loadAppearance(),
            loadSettings(),
            loadNotifications(),
            loadAdminProducts()
        ]);
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ==================== PRODUCTS ====================
async function loadProducts() {
    try {
        setStyle('loadingState', 'display', 'block');
        setHTML('productsGrid', '');
        setStyle('emptyState', 'display', 'none');
        
        const q = firebase.firestore().collection("produtos").orderBy("dataDeCriacao", "desc");
        const snapshot = await q.get();
        
        products = [];
        snapshot.forEach(docSnap => {
            products.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        setStyle('loadingState', 'display', 'none');
        
        if (products.length === 0) {
            setStyle('emptyState', 'display', 'block');
            return;
        }
        
        renderProducts(products);
        updateCategories();
        
        if (isAdmin) {
            updateStats();
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        setStyle('loadingState', 'display', 'none');
        showToast('Erro ao carregar produtos', { bgColor: '#ff4757', icon: '✕' });
    }
}

function renderProducts(productList) {
    try {
        const grid = $('productsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const activeProducts = productList.filter(product => {
            if (!isAdmin && product.ativo === false) return false;
            return true;
        });
        
        if (activeProducts.length === 0) {
            setStyle('emptyState', 'display', 'block');
            return;
        }
        
        setStyle('emptyState', 'display', 'none');
        
        activeProducts.forEach((product, index) => {
            const hasPromo = product.precoPromocional && product.precoPromocional < product.precoOriginal;
            const finalPrice = hasPromo ? product.precoPromocional : product.precoOriginal;
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="badges">
                    ${hasPromo ? '<span class="badge promo">PROMOÇÃO</span>' : ''}
                    ${product.destaque ? '<span class="badge featured">⭐ DESTAQUE</span>' : ''}
                </div>
                <div class="image-container" data-index="${index}">
                    <img src="${product.fotoURL || 'https://via.placeholder.com/300x280?text=Sem+Imagem'}" alt="${product.nome}" onerror="this.src='https://via.placeholder.com/300x280?text=Sem+Imagem'">
                    <div class="zoom-icon">🔍</div>
                </div>
                <div class="content">
                    ${product.categoria ? `<div class="category">${product.categoria}</div>` : ''}
                    <h3>${product.nome || 'Sem nome'}</h3>
                    <p class="description">${product.descricao || ''}</p>
                    ${product.tamanhos ? `<p class="sizes">📏 Tamanhos: ${product.tamanhos}</p>` : ''}
                    ${product.cores ? `<p class="colors">🎨 Cores: ${product.cores}</p>` : ''}
                    <div class="prices">
                        ${hasPromo ? `<span class="price-original">R$ ${formatPrice(product.precoOriginal)}</span>` : ''}
                        <span class="price-promo">R$ ${formatPrice(finalPrice)}</span>
                    </div>
                    <div class="actions">
                        <button class="btn-add-cart" data-id="${product.id}">
                            🛒 Adicionar ao Carrinho
                        </button>
                        <button class="btn-whatsapp btn-buy-now" data-id="${product.id}">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            Comprar no WhatsApp
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        
        // Add to cart buttons
        $$('.btn-add-cart').forEach(btn => {
            btn.onclick = () => addToCart(btn.dataset.id);
        });
        
        // Buy now buttons
        $$('.btn-buy-now').forEach(btn => {
            btn.onclick = () => buyNow(btn.dataset.id);
        });
        
        // Image click for zoom
        $$('.image-container').forEach(container => {
            container.onclick = () => {
                const index = parseInt(container.dataset.index);
                openImageModal(index);
            };
        });
    } catch (error) {
        console.error('Erro ao renderizar produtos:', error);
    }
}

// ==================== IMAGE MODAL ====================
function openImageModal(index) {
    try {
        if (index < 0 || index >= products.length) return;
        
        currentImageIndex = index;
        const product = products[index];
        if (!product) return;
        
        const hasPromo = product.precoPromocional && product.precoPromocional < product.precoOriginal;
        const finalPrice = hasPromo ? product.precoPromocional : product.precoOriginal;
        
        const modalImage = $('modalImage');
        const modalTitle = $('modalTitle');
        const modalPrice = $('modalPrice');
        
        if (modalImage) modalImage.src = product.fotoURL || '';
        if (modalTitle) modalTitle.textContent = product.nome || '';
        if (modalPrice) modalPrice.textContent = `R$ ${formatPrice(finalPrice)}`;
        
        addClass('imageModal', 'show');
    } catch (error) {
        console.error('Erro ao abrir modal de imagem:', error);
    }
}

function closeImageModal() {
    removeClass('imageModal', 'show');
}

// ==================== CART ====================
function addToCart(productId) {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: productId,
                nome: product.nome,
                fotoURL: product.fotoURL,
                preco: product.precoPromocional || product.precoOriginal,
                quantity: 1
            });
        }
        
        saveCart();
        updateCartUI();
        showToast('Produto adicionado ao carrinho!', { icon: '🛒' });
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
    }
}

function removeFromCart(productId) {
    try {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        updateCartUI();
    } catch (error) {
        console.error('Erro ao remover do carrinho:', error);
    }
}

function updateCartQuantity(productId, delta) {
    try {
        const item = cart.find(i => i.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                removeFromCart(productId);
            } else {
                saveCart();
                updateCartUI();
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar quantidade:', error);
    }
}

function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Erro ao salvar carrinho:', error);
    }
}

function updateCartUI() {
    try {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        setText('cartCount', count.toString());
        
        const cartItems = $('cartItems');
        if (!cartItems) return;
        
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.fotoURL || 'https://via.placeholder.com/70'}" alt="${item.nome}">
                    <div class="info">
                        <h4>${item.nome}</h4>
                        <p class="price">R$ ${formatPrice(item.preco)}</p>
                        <div class="quantity">
                            <button class="qty-btn" data-id="${item.id}" data-action="decrease">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" data-id="${item.id}" data-action="increase">+</button>
                        </div>
                    </div>
                    <button class="remove" data-id="${item.id}">&times;</button>
                </div>
            `).join('');
            
            // Add event listeners for quantity buttons
            cartItems.querySelectorAll('.qty-btn').forEach(btn => {
                btn.onclick = () => {
                    const id = btn.dataset.id;
                    const action = btn.dataset.action;
                    updateCartQuantity(id, action === 'increase' ? 1 : -1);
                };
            });
            
            // Add event listeners for remove buttons
            cartItems.querySelectorAll('.remove').forEach(btn => {
                btn.onclick = () => removeFromCart(btn.dataset.id);
            });
        }
        
        const total = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
        setText('cartTotal', `R$ ${formatPrice(total)}`);
    } catch (error) {
        console.error('Erro ao atualizar UI do carrinho:', error);
    }
}

function buyNow(productId) {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const message = CONFIG.whatsappMessage.replace('{produto}', product.nome);
        const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Erro ao comprar via WhatsApp:', error);
    }
}

// ==================== CATEGORIES ====================
function updateCategories() {
    try {
        const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
        const container = $('categoriesContainer');
        if (!container) return;
        
        container.innerHTML = '<button class="cat-btn active" data-category="all">Todos</button>';
        categories.forEach(cat => {
            container.innerHTML += `<button class="cat-btn" data-category="${cat}">${cat}</button>`;
        });
        
        container.querySelectorAll('.cat-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterProducts();
            };
        });
    } catch (error) {
        console.error('Erro ao atualizar categorias:', error);
    }
}

function filterProducts() {
    try {
        const activeBtn = document.querySelector('.cat-btn.active');
        const category = activeBtn ? activeBtn.dataset.category : 'all';
        const searchInput = $('searchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        
        let filtered = [...products];
        
        if (category !== 'all') {
            filtered = filtered.filter(p => p.categoria === category);
        }
        
        if (search) {
            filtered = filtered.filter(p => 
                (p.nome && p.nome.toLowerCase().includes(search)) ||
                (p.descricao && p.descricao.toLowerCase().includes(search))
            );
        }
        
        renderProducts(filtered);
    } catch (error) {
        console.error('Erro ao filtrar produtos:', error);
    }
}

// ==================== ADMIN: PRODUCTS ====================
async function loadAdminProducts() {
    try {
        const list = $('adminProductList');
        if (!list) return;
        
        list.innerHTML = '<div class="spinner"></div>';
        
        const q = firebase.firestore().collection("produtos").orderBy("dataDeCriacao", "desc");
        const snapshot = await q.get();
        
        let html = '';
        let count = 0;
        
        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            const price = p.precoPromocional || p.precoOriginal;
            const hasPromo = p.precoPromocional && p.precoPromocional < p.precoOriginal;
            
            html += `
                <div class="admin-product-item">
                    <img src="${p.fotoURL || 'https://via.placeholder.com/60'}" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/60?text=?'">
                    <div class="info">
                        <h4>${p.nome || 'Sem nome'}</h4>
                        <p>R$ ${formatPrice(price)}</p>
                        <div class="badges">
                            ${p.destaque ? '<span class="badge featured">Destaque</span>' : ''}
                            ${hasPromo ? '<span class="badge promo">Promoção</span>' : ''}
                            ${p.categoria ? `<span class="badge">${p.categoria}</span>` : ''}
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn-edit admin-edit-btn" data-id="${docSnap.id}">✏️</button>
                        <button class="btn-danger admin-delete-btn" data-id="${docSnap.id}">🗑️</button>
                    </div>
                </div>
            `;
            count++;
        });
        
        list.innerHTML = html || '<p style="text-align:center;color:#666;">Nenhum produto cadastrado</p>';
        setText('totalProducts', count.toString());
        
        // Add event listeners
        list.querySelectorAll('.admin-edit-btn').forEach(btn => {
            btn.onclick = () => editProduct(btn.dataset.id);
        });
        
        list.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.onclick = () => deleteProduct(btn.dataset.id);
        });
        
    } catch (error) {
        console.error('Error loading admin products:', error);
        list.innerHTML = '<p style="color:#ff4757;">Erro ao carregar produtos</p>';
    }
}

// ==================== IMAGE UPLOAD SYSTEM ====================
// Upload to ImgBB
async function uploadToImgBB(file) {
    try {
        showToast('Fazendo upload da imagem...', { icon: '⏳', duration: 3000 });
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.imgbbApiKey}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Imagem enviada com sucesso!', { icon: '✅' });
            return data.data.url;
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Erro no upload da imagem:', error);
        showToast('Erro ao enviar imagem: ' + error.message, { bgColor: '#ff4757', icon: '✕' });
        throw error;
    }
}

// Handle image file selection
function handleImageFile(file) {
    try {
        const imagePreview = $('imagePreview');
        const uploadPlaceholder = $('uploadPlaceholder');
        const imageUrl = $('imageUrl');
        
        if (!file || !file.type.startsWith('image/')) {
            showToast('Por favor, selecione um arquivo de imagem válido', { bgColor: '#ff4757', icon: '✕' });
            return;
        }
        
        // Verificar tamanho do arquivo (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('A imagem é muito grande. Máximo 10MB permitido.', { bgColor: '#ff4757', icon: '✕' });
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (imagePreview) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            if (uploadPlaceholder) {
                uploadPlaceholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
        
        // Fazer upload automático para ImgBB
        uploadToImgBB(file).then(imageUrlValue => {
            if (imageUrl && imageUrlValue) {
                imageUrl.value = imageUrlValue;
                showToast('URL da imagem atualizada automaticamente!', { icon: '🔗' });
            }
        }).catch(error => {
            console.error('Upload automático falhou:', error);
            // O usuário ainda pode usar a imagem local ou inserir URL manualmente
        });
        
    } catch (error) {
        console.error('Erro ao processar imagem:', error);
        showToast('Erro ao processar imagem', { bgColor: '#ff4757', icon: '✕' });
    }
}

// Edit product
function editProduct(id) {
    try {
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        editingProductId = id;
        
        setValue('imageUrl', product.fotoURL || '');
        
        const imagePreview = $('imagePreview');
        const uploadPlaceholder = $('uploadPlaceholder');
        
        if (imagePreview && product.fotoURL) {
            imagePreview.src = product.fotoURL;
            imagePreview.style.display = 'block';
        }
        if (uploadPlaceholder) {
            uploadPlaceholder.style.display = 'none';
        }
        
        setValue('productName', product.nome || '');
        setValue('productDesc', product.descricao || '');
        setValue('productPrice', product.precoOriginal || '');
        setValue('productPromoPrice', product.precoPromocional || '');
        setValue('productCategory', product.categoria || '');
        setValue('productSizes', product.tamanhos || '');
        setValue('productColors', product.cores || '');
        setChecked('productFeatured', product.destaque || false);
        setChecked('productActive', product.ativo !== false);
        
        setText('btnProductText', 'Atualizar Produto');
        setStyle('cancelEdit', 'display', 'block');
        
        // Scroll to form
        const tabProducts = $('tab-products');
        if (tabProducts) {
            tabProducts.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Erro ao editar produto:', error);
    }
}

// Delete product
async function deleteProduct(id) {
    try {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        
        await firebase.firestore().collection("produtos").doc(id).delete();
        showToast('Produto excluído!', { icon: '🗑️' });
        await loadProducts();
        await loadAdminProducts();
        updateStats();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Erro ao excluir produto', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== APPEARANCE ====================
async function loadAppearance() {
    try {
        const docRef = firebase.firestore().collection("config").doc("appearance");
        const docSnap = await docRef.get();
        
        if (docSnap.exists()) {
            appearance = docSnap.data();
            applyAppearance(appearance);
            populateAppearanceForm(appearance);
        }
    } catch (error) {
        console.error('Error loading appearance:', error);
    }
}

function applyAppearance(config) {
    try {
        if (!config) return;
        
        const root = document.documentElement;
        
        if (config.colorPrimary) root.style.setProperty('--color-primary', config.colorPrimary);
        if (config.colorBackground) root.style.setProperty('--color-background', config.colorBackground);
        if (config.colorCards) root.style.setProperty('--color-cards', config.colorCards);
        if (config.colorHeader) root.style.setProperty('--color-header', config.colorHeader);
        if (config.colorText) root.style.setProperty('--color-text', config.colorText);
        if (config.colorTextSecondary) root.style.setProperty('--color-text-secondary', config.colorTextSecondary);
        if (config.colorBtnPrimary) root.style.setProperty('--color-btn-primary', config.colorBtnPrimary);
        if (config.colorBtnText) root.style.setProperty('--color-btn-text', config.colorBtnText);
        if (config.colorWhatsapp) root.style.setProperty('--color-whatsapp', config.colorWhatsapp);
        if (config.colorCart) root.style.setProperty('--color-cart', config.colorCart);
        if (config.colorPromo) root.style.setProperty('--color-promo', config.colorPromo);
        if (config.colorOriginal) root.style.setProperty('--color-original', config.colorOriginal);
        if (config.borderRadius) root.style.setProperty('--border-radius', config.borderRadius + 'px');
        if (config.fontFamily) root.style.setProperty('--font-family', config.fontFamily);
        if (config.productsPerRow) root.style.setProperty('--products-per-row', config.productsPerRow);
        
        if (config.storeName) {
            setText('storeName', config.storeName);
            setText('footerStoreName', config.storeName);
            document.title = config.storeName;
        }
        if (config.storeSlogan) setText('storeSlogan', config.storeSlogan);
        
        const heroTitle = $('heroTitle');
        if (heroTitle && config.heroTitle) {
            heroTitle.innerHTML = config.heroTitle.replace(/(\S+)$/, '<span>$1</span>');
        }
        
        if (config.heroSubtitle) setText('heroSubtitle', config.heroSubtitle);
        
        if (config.showHero === false) setStyle('heroSection', 'display', 'none');
        else setStyle('heroSection', 'display', 'block');
        
        if (config.showCategories === false) setStyle('categoriesContainer', 'display', 'none');
        else setStyle('categoriesContainer', 'display', 'flex');
        
        if (config.showSearch === false) setStyle('searchContainer', 'display', 'none');
        else setStyle('searchContainer', 'display', 'flex');
        
        if (config.showFooter === false) setStyle('footer', 'display', 'none');
        else setStyle('footer', 'display', 'block');
        
        if (config.showCart === false) setStyle('cartBtn', 'display', 'none');
        else setStyle('cartBtn', 'display', 'flex');
    } catch (error) {
        console.error('Erro ao aplicar aparência:', error);
    }
}

function populateAppearanceForm(config) {
    try {
        if (!config) return;
        
        const setColorInput = (id, value) => {
            if (!value) return;
            const colorEl = $(id);
            const textEl = $(`${id}Text`);
            if (colorEl) colorEl.value = value;
            if (textEl) textEl.value = value;
        };
        
        setColorInput('colorPrimary', config.colorPrimary);
        setColorInput('colorBackground', config.colorBackground);
        setColorInput('colorCards', config.colorCards);
        setColorInput('colorHeader', config.colorHeader);
        setColorInput('colorText', config.colorText);
        setColorInput('colorTextSecondary', config.colorTextSecondary);
        setColorInput('colorBtnPrimary', config.colorBtnPrimary);
        setColorInput('colorBtnText', config.colorBtnText);
        setColorInput('colorWhatsapp', config.colorWhatsapp);
        setColorInput('colorCart', config.colorCart);
        setColorInput('colorPromo', config.colorPromo);
        setColorInput('colorOriginal', config.colorOriginal);
        
        if (config.borderRadius !== undefined) {
            setValue('borderRadius', config.borderRadius);
            setText('borderRadiusValue', config.borderRadius + 'px');
        }
        if (config.fontFamily) setValue('fontFamily', config.fontFamily);
        if (config.productsPerRow) setValue('productsPerRow', config.productsPerRow);
        if (config.storeName) setValue('inputStoreName', config.storeName);
        if (config.storeSlogan) setValue('inputStoreSlogan', config.storeSlogan);
        if (config.heroTitle) setValue('inputHeroTitle', config.heroTitle);
        if (config.heroSubtitle) setValue('inputHeroSubtitle', config.heroSubtitle);
        
        setChecked('showHero', config.showHero !== false);
        setChecked('showCategories', config.showCategories !== false);
        setChecked('showSearch', config.showSearch !== false);
        setChecked('showFooter', config.showFooter !== false);
        setChecked('showCart', config.showCart !== false);
    } catch (error) {
        console.error('Erro ao popular formulário de aparência:', error);
    }
}

async function saveAppearance() {
    const btn = $('saveAppearance');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Salvando...';
    }
    
    try {
        const config = {
            colorPrimary: getValue('colorPrimary') || '#00ff99',
            colorBackground: getValue('colorBackground') || '#000000',
            colorCards: getValue('colorCards') || '#111111',
            colorHeader: getValue('colorHeader') || '#000000',
            colorText: getValue('colorText') || '#ffffff',
            colorTextSecondary: getValue('colorTextSecondary') || '#888888',
            colorBtnPrimary: getValue('colorBtnPrimary') || '#00ff99',
            colorBtnText: getValue('colorBtnText') || '#000000',
            colorWhatsapp: getValue('colorWhatsapp') || '#25D366',
            colorCart: getValue('colorCart') || '#ff6b6b',
            colorPromo: getValue('colorPromo') || '#00ff99',
            colorOriginal: getValue('colorOriginal') || '#666666',
            borderRadius: parseInt(getValue('borderRadius')) || 12,
            fontFamily: getValue('fontFamily') || 'Poppins',
            productsPerRow: parseInt(getValue('productsPerRow')) || 4,
            storeName: getValue('inputStoreName') || 'Loja DR',
            storeSlogan: getValue('inputStoreSlogan') || 'Moda & Estilo',
            heroTitle: getValue('inputHeroTitle') || 'Descubra seu Estilo',
            heroSubtitle: getValue('inputHeroSubtitle') || 'Peças exclusivas selecionadas para você',
            showHero: getChecked('showHero'),
            showCategories: getChecked('showCategories'),
            showSearch: getChecked('showSearch'),
            showFooter: getChecked('showFooter'),
            showCart: getChecked('showCart'),
            updatedAt: new Date().toISOString()
        };
        
        await firebase.firestore().collection("config").doc("appearance").set(config);
        
        appearance = config;
        applyAppearance(config);
        showToast('Aparência salva com sucesso!', { icon: '🎨' });
        
    } catch (error) {
        console.error('Error saving appearance:', error);
        showToast('Erro ao salvar aparência: ' + error.message, { bgColor: '#ff4757', icon: '✕' });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💾 Salvar Aparência';
        }
    }
}

function resetAppearance() {
    try {
        const defaults = {
            colorPrimary: '#00ff99',
            colorBackground: '#000000',
            colorCards: '#111111',
            colorHeader: '#000000',
            colorText: '#ffffff',
            colorTextSecondary: '#888888',
            colorBtnPrimary: '#00ff99',
            colorBtnText: '#000000',
            colorWhatsapp: '#25D366',
            colorCart: '#ff6b6b',
            colorPromo: '#00ff99',
            colorOriginal: '#666666',
            borderRadius: 12,
            fontFamily: 'Poppins',
            productsPerRow: 4,
            storeName: 'Loja DR',
            storeSlogan: 'Moda & Estilo',
            heroTitle: 'Descubra seu Estilo',
            heroSubtitle: 'Peças exclusivas selecionadas para você',
            showHero: true,
            showCategories: true,
            showSearch: true,
            showFooter: true,
            showCart: true
        };
        
        populateAppearanceForm(defaults);
        applyAppearance(defaults);
        showToast('Aparência resetada para o padrão!', { icon: '🔄' });
    } catch (error) {
        console.error('Erro ao resetar aparência:', error);
    }
}

// ==================== SETTINGS ====================
async function loadSettings() {
    try {
        const docRef = firebase.firestore().collection("config").doc("settings");
        const docSnap = await docRef.get();
        
        if (docSnap.exists()) {
            settings = docSnap.data();
            populateSettingsForm(settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function populateSettingsForm(config) {
    try {
        if (!config) return;
        
        if (config.whatsappNumber) {
            setValue('whatsappNumber', config.whatsappNumber);
            CONFIG.whatsappNumber = config.whatsappNumber;
        }
        if (config.whatsappMessage) {
            setValue('whatsappMessage', config.whatsappMessage);
            CONFIG.whatsappMessage = config.whatsappMessage;
        }
        if (config.whatsappCartMessage) {
            setValue('whatsappCartMessage', config.whatsappCartMessage);
            CONFIG.whatsappCartMessage = config.whatsappCartMessage;
        }
        if (config.cartBtnText) setValue('cartBtnText', config.cartBtnText);
        if (config.buyBtnText) setValue('buyBtnText', config.buyBtnText);
        if (config.currency) setValue('currency', config.currency);
        if (config.seoTitle) setValue('seoTitle', config.seoTitle);
        if (config.seoDescription) setValue('seoDescription', config.seoDescription);
        if (config.gaId) setValue('gaId', config.gaId);
        if (config.fbPixel) setValue('fbPixel', config.fbPixel);
        
        setChecked('cartEnabled', config.cartEnabled !== false);
        setChecked('cartQuantity', config.cartQuantity !== false);
        setChecked('maintenanceMode', config.maintenanceMode === true);
        setChecked('showPrices', config.showPrices !== false);
        setChecked('showStock', config.showStock !== false);
    } catch (error) {
        console.error('Erro ao popular configurações:', error);
    }
}

async function saveSettings() {
    const btn = $('saveSettings');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Salvando...';
    }
    
    try {
        const config = {
            whatsappNumber: getValue('whatsappNumber') || '5511963290107',
            whatsappMessage: getValue('whatsappMessage') || CONFIG.whatsappMessage,
            whatsappCartMessage: getValue('whatsappCartMessage') || CONFIG.whatsappCartMessage,
            cartEnabled: getChecked('cartEnabled'),
            cartQuantity: getChecked('cartQuantity'),
            cartBtnText: getValue('cartBtnText') || 'Adicionar ao Carrinho',
            buyBtnText: getValue('buyBtnText') || 'Comprar no WhatsApp',
            maintenanceMode: getChecked('maintenanceMode'),
            showPrices: getChecked('showPrices'),
            showStock: getChecked('showStock'),
            currency: getValue('currency') || 'BRL',
            seoTitle: getValue('seoTitle') || 'Loja DR',
            seoDescription: getValue('seoDescription') || '',
            gaId: getValue('gaId') || '',
            fbPixel: getValue('fbPixel') || '',
            updatedAt: new Date().toISOString()
        };
        
        await firebase.firestore().collection("config").doc("settings").set(config);
        
        CONFIG.whatsappNumber = config.whatsappNumber;
        CONFIG.whatsappMessage = config.whatsappMessage;
        CONFIG.whatsappCartMessage = config.whatsappCartMessage;
        
        const footerWhatsapp = $('footerWhatsapp');
        if (footerWhatsapp) {
            footerWhatsapp.href = `https://wa.me/${config.whatsappNumber}`;
        }
        
        showToast('Configurações salvas com sucesso!', { icon: '⚙️' });
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Erro ao salvar configurações: ' + error.message, { bgColor: '#ff4757', icon: '✕' });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💾 Salvar Configurações';
        }
    }
}

function exportData() {
    try {
        const data = {
            products,
            appearance,
            settings,
            notifications,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lojadr-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Dados exportados com sucesso!', { icon: '📥' });
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        showToast('Erro ao exportar dados', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
    try {
        const snapshot = await firebase.firestore().collection("notifications").get();
        notifications = [];
        
        snapshot.forEach(docSnap => {
            notifications.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        renderNotificationList();
        
        // Show active notification to visitors
        const activeNotif = notifications.find(n => n.active);
        if (activeNotif && !isAdmin) {
            showNotification(activeNotif);
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotificationList() {
    try {
        const list = $('notificationList');
        if (!list) return;
        
        if (notifications.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#666;">Nenhuma notificação cadastrada</p>';
            return;
        }
        
        list.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <div class="preview" style="background:${n.bgColor || '#00ff99'};color:${n.textColor || '#000'}">
                    ${n.icon || '📢'}
                </div>
                <div class="info">
                    <h4>${n.message || 'Sem mensagem'}</h4>
                    <p>${n.type || 'banner'} • ${n.active ? '🟢 Ativo' : '⚪ Inativo'}</p>
                </div>
                <div class="actions">
                    <button class="btn-edit btn-sm notif-toggle" data-id="${n.id}" data-active="${!n.active}">
                        ${n.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-danger btn-sm notif-delete" data-id="${n.id}">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        list.querySelectorAll('.notif-toggle').forEach(btn => {
            btn.onclick = () => toggleNotification(btn.dataset.id, btn.dataset.active === 'true');
        });
        
        list.querySelectorAll('.notif-delete').forEach(btn => {
            btn.onclick = () => deleteNotification(btn.dataset.id);
        });
    } catch (error) {
        console.error('Erro ao renderizar notificações:', error);
    }
}

function showNotification(notif) {
    try {
        if (!notif) return;
        
        if (notif.type === 'banner') {
            const banner = $('notificationBanner');
            if (!banner) return;
            
            banner.style.background = notif.bgColor || '#00ff99';
            banner.style.color = notif.textColor || '#000';
            banner.innerHTML = `
                ${notif.icon || ''} ${notif.message || ''}
                <button class="close-banner">&times;</button>
            `;
            banner.classList.add('show');
            
            const closeBtn = banner.querySelector('.close-banner');
            if (closeBtn) {
                closeBtn.onclick = () => banner.classList.remove('show');
            }
            
            if (notif.duration > 0) {
                setTimeout(() => banner.classList.remove('show'), notif.duration * 1000);
            }
        } else if (notif.type === 'toast') {
            showToast(`${notif.icon || ''} ${notif.message || ''}`, {
                bgColor: notif.bgColor || '#00ff99',
                textColor: notif.textColor || '#000',
                duration: notif.duration > 0 ? notif.duration * 1000 : 0
            });
        } else if (notif.type === 'popup') {
            const modal = $('popupModal');
            const popupBody = $('popupBody');
            if (!modal || !popupBody) return;
            
            const content = modal.querySelector('.popup-content');
            if (content) {
                content.style.background = notif.bgColor || '#00ff99';
                content.style.color = notif.textColor || '#000';
            }
            
            popupBody.innerHTML = `
                <div style="font-size:48px;margin-bottom:20px;">${notif.icon || '📢'}</div>
                <p style="font-size:18px;">${notif.message || ''}</p>
                ${notif.link ? `<a href="${notif.link}" target="_blank" class="btn-primary" style="margin-top:20px;">Ver mais</a>` : ''}
            `;
            modal.classList.add('show');
            
            const closeBtn = modal.querySelector('.popup-close');
            if (closeBtn) {
                closeBtn.onclick = () => modal.classList.remove('show');
            }
            
            if (notif.duration > 0) {
                setTimeout(() => modal.classList.remove('show'), notif.duration * 1000);
            }
        }
    } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
    }
}

async function toggleNotification(id, active) {
    try {
        if (active) {
            // Deactivate all others first
            for (const n of notifications) {
                if (n.id !== id && n.active) {
                    await firebase.firestore().collection("notifications").doc(n.id).update({ active: false });
                }
            }
        }
        await firebase.firestore().collection("notifications").doc(id).update({ active });
        await loadNotifications();
        showToast(active ? 'Notificação ativada!' : 'Notificação desativada!', { icon: '🔔' });
    } catch (error) {
        console.error('Error toggling notification:', error);
        showToast('Erro ao atualizar notificação', { bgColor: '#ff4757', icon: '✕' });
    }
}

async function deleteNotification(id) {
    try {
        if (!confirm('Excluir esta notificação?')) return;
        
        await firebase.firestore().collection("notifications").doc(id).delete();
        await loadNotifications();
        showToast('Notificação excluída!', { icon: '🗑️' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Erro ao excluir notificação', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== STATS ====================
function updateStats() {
    try {
        if (!products || products.length === 0) {
            setText('statProducts', '0');
            setText('statFeatured', '0');
            setText('statPromo', '0');
            setText('statCategories', '0');
            setHTML('categoryChart', '<p style="color:#666;text-align:center;">Nenhum produto cadastrado</p>');
            setHTML('priceStats', '<p style="color:#666;text-align:center;">Nenhum produto cadastrado</p>');
            return;
        }
        
        const total = products.length;
        const featured = products.filter(p => p.destaque).length;
        const promo = products.filter(p => p.precoPromocional && p.precoPromocional < p.precoOriginal).length;
        const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
        
        setText('statProducts', total.toString());
        setText('statFeatured', featured.toString());
        setText('statPromo', promo.toString());
        setText('statCategories', categories.length.toString());
        
        // Category chart
        const catCounts = {};
        products.forEach(p => {
            if (p.categoria) {
                catCounts[p.categoria] = (catCounts[p.categoria] || 0) + 1;
            }
        });
        
        const categoryChart = $('categoryChart');
        if (categoryChart) {
            if (Object.keys(catCounts).length === 0) {
                categoryChart.innerHTML = '<p style="color:#666;text-align:center;">Nenhuma categoria definida</p>';
            } else {
                const maxCount = Math.max(...Object.values(catCounts));
                categoryChart.innerHTML = Object.entries(catCounts).map(([cat, count]) => `
                    <div class="chart-bar">
                        <span class="label">${cat}</span>
                        <div class="bar-container">
                            <div class="bar" style="width: ${(count / maxCount) * 100}%">${count}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Price stats
        const prices = products.map(p => p.precoPromocional || p.precoOriginal).filter(p => p && p > 0);
        const priceStats = $('priceStats');
        
        if (priceStats) {
            if (prices.length === 0) {
                priceStats.innerHTML = '<p style="color:#666;text-align:center;">Nenhum preço definido</p>';
            } else {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                
                priceStats.innerHTML = `
                    <div class="price-stat">
                        <div class="value">R$ ${formatPrice(min)}</div>
                        <div class="label">Menor Preço</div>
                    </div>
                    <div class="price-stat">
                        <div class="value">R$ ${formatPrice(max)}</div>
                        <div class="label">Maior Preço</div>
                    </div>
                    <div class="price-stat">
                        <div class="value">R$ ${formatPrice(avg)}</div>
                        <div class="label">Preço Médio</div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

// ==================== UTILS ====================
function formatPrice(value) {
    try {
        const num = parseFloat(value) || 0;
        return num.toFixed(2).replace('.', ',');
    } catch (error) {
        return '0,00';
    }
}

// ==================== EVENT LISTENERS ====================
function initEventListeners() {
    try {
        // Image modal close
        const imageModal = $('imageModal');
        if (imageModal) {
            const closeBtn = imageModal.querySelector('.image-modal-close');
            if (closeBtn) {
                closeBtn.onclick = closeImageModal;
            }
            
            imageModal.onclick = (e) => {
                if (e.target === imageModal) {
                    closeImageModal();
                }
            };
        }
        
        // Image modal navigation
        const prevImage = $('prevImage');
        const nextImage = $('nextImage');
        
        if (prevImage) {
            prevImage.onclick = () => {
                if (products.length === 0) return;
                currentImageIndex = (currentImageIndex - 1 + products.length) % products.length;
                openImageModal(currentImageIndex);
            };
        }
        
        if (nextImage) {
            nextImage.onclick = () => {
                if (products.length === 0) return;
                currentImageIndex = (currentImageIndex + 1) % products.length;
                openImageModal(currentImageIndex);
            };
        }
        
        // Cart sidebar
        const cartBtn = $('cartBtn');
        const closeCart = $('closeCart');
        const cartOverlay = $('cartOverlay');
        const clearCart = $('clearCart');
        const checkoutBtn = $('checkoutBtn');
        
        if (cartBtn) {
            cartBtn.onclick = () => {
                addClass('cartSidebar', 'show');
                addClass('cartOverlay', 'show');
            };
        }
        
        if (closeCart) {
            closeCart.onclick = () => {
                removeClass('cartSidebar', 'show');
                removeClass('cartOverlay', 'show');
            };
        }
        
        if (cartOverlay) {
            cartOverlay.onclick = () => {
                removeClass('cartSidebar', 'show');
                removeClass('cartOverlay', 'show');
            };
        }
        
        if (clearCart) {
            clearCart.onclick = () => {
                cart = [];
                saveCart();
                updateCartUI();
                showToast('Carrinho limpo!', { icon: '🗑️' });
            };
        }
        
        if (checkoutBtn) {
            checkoutBtn.onclick = () => {
                if (cart.length === 0) {
                    showToast('Seu carrinho está vazio!', { bgColor: '#ff4757', icon: '✕' });
                    return;
                }
                
                const cartList = cart.map(item => `• ${item.nome} (${item.quantity}x) - R$ ${formatPrice(item.preco * item.quantity)}`).join('\n');
                const total = cart.reduce((sum, item) => sum + (item.preco * item.quantity), 0);
                
                const message = CONFIG.whatsappCartMessage
                    .replace('{carrinho}', cartList)
                    .replace('{total}', `R$ ${formatPrice(total)}`);
                
                const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            };
        }
        
        // Search input
        const searchInput = $('searchInput');
        if (searchInput) {
            searchInput.oninput = filterProducts;
        }
        
        // Admin search
        const searchAdmin = $('searchAdmin');
        if (searchAdmin) {
            searchAdmin.oninput = (e) => {
                const search = e.target.value.toLowerCase();
                $$('.admin-product-item').forEach(item => {
                    const nameEl = item.querySelector('h4');
                    const name = nameEl ? nameEl.textContent.toLowerCase() : '';
                    item.style.display = name.includes(search) ? 'flex' : 'none';
                });
            };
        }
        
        // Admin tabs
        $$('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                $$('.tab-btn').forEach(b => b.classList.remove('active'));
                $$('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabId = `tab-${btn.dataset.tab}`;
                const tab = $(tabId);
                if (tab) tab.classList.add('active');
            };
        });
        
        // Image upload area - AGORA COM UPLOAD AUTOMÁTICO
        const uploadArea = $('uploadArea');
        const imageFile = $('imageFile');
        const imagePreview = $('imagePreview');
        const uploadPlaceholder = $('uploadPlaceholder');
        const imageUrl = $('imageUrl');
        
        if (uploadArea && imageFile) {
            uploadArea.onclick = () => imageFile.click();
            
            uploadArea.ondragover = (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            };
            
            uploadArea.ondragleave = () => uploadArea.classList.remove('dragover');
            
            uploadArea.ondrop = (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    handleImageFile(file);
                }
            };
            
            imageFile.onchange = (e) => {
                const file = e.target.files[0];
                if (file) handleImageFile(file);
            };
        }
        
        if (imageUrl && imagePreview && uploadPlaceholder) {
            imageUrl.oninput = (e) => {
                const url = e.target.value;
                if (url) {
                    imagePreview.src = url;
                    imagePreview.style.display = 'block';
                    uploadPlaceholder.style.display = 'none';
                } else {
                    imagePreview.style.display = 'none';
                    uploadPlaceholder.style.display = 'block';
                }
            };
        }
        
        // Product form
        const productForm = $('productForm');
        if (productForm) {
            productForm.onsubmit = handleProductSubmit;
        }
        
        // Cancel edit button
        const cancelEdit = $('cancelEdit');
        if (cancelEdit) {
            cancelEdit.onclick = () => {
                editingProductId = null;
                productForm.reset();
                if (imagePreview) imagePreview.style.display = 'none';
                if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
                setText('btnProductText', 'Adicionar Produto');
                setStyle('cancelEdit', 'display', 'none');
            };
        }
        
        // Appearance buttons
        const saveAppearanceBtn = $('saveAppearance');
        const resetAppearanceBtn = $('resetAppearance');
        
        if (saveAppearanceBtn) {
            saveAppearanceBtn.onclick = saveAppearance;
        }
        
        if (resetAppearanceBtn) {
            resetAppearanceBtn.onclick = resetAppearance;
        }
        
        // Sync color inputs
        $$('.color-input-wrapper').forEach(wrapper => {
            const colorInput = wrapper.querySelector('input[type="color"]');
            const textInput = wrapper.querySelector('input[type="text"]');
            
            if (colorInput && textInput) {
                colorInput.oninput = () => textInput.value = colorInput.value;
                textInput.oninput = () => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                        colorInput.value = textInput.value;
                    }
                };
            }
        });
        
        // Border radius slider
        const borderRadius = $('borderRadius');
        if (borderRadius) {
            borderRadius.oninput = () => {
                setText('borderRadiusValue', borderRadius.value + 'px');
            };
        }
        
        // Settings buttons
        const saveSettingsBtn = $('saveSettings');
        const exportDataBtn = $('exportData');
        
        if (saveSettingsBtn) {
            saveSettingsBtn.onclick = saveSettings;
        }
        
        if (exportDataBtn) {
            exportDataBtn.onclick = exportData;
        }
        
        // Notification form
        const notificationForm = $('notificationForm');
        if (notificationForm) {
            notificationForm.onsubmit = handleNotificationSubmit;
        }
        
        // Preview notification
        const previewNotif = $('previewNotif');
        if (previewNotif) {
            previewNotif.onclick = () => {
                const notif = {
                    message: getValue('notifMessage') || 'Mensagem de exemplo',
                    type: getValue('notifType') || 'toast',
                    bgColor: getValue('notifBgColor') || '#00ff99',
                    textColor: getValue('notifTextColor') || '#000000',
                    duration: parseInt(getValue('notifDuration')) || 5,
                    icon: getValue('notifIcon') || '🔥',
                    link: getValue('notifLink') || ''
                };
                showNotification(notif);
            };
        }
        
        // Modal close buttons
        $$('.modal-close').forEach(btn => {
            btn.onclick = () => {
                const modal = btn.closest('.modal');
                if (modal) modal.classList.remove('show');
            };
        });
        
        // Close modal on backdrop click
        $$('.modal').forEach(modal => {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            };
        });
        
        // Edit form
        const editForm = $('editForm');
        const editImageUrl = $('editImageUrl');
        const editImagePreview = $('editImagePreview');
        
        if (editForm) {
            editForm.onsubmit = handleEditSubmit;
        }
        
        if (editImageUrl && editImagePreview) {
            editImageUrl.oninput = () => {
                editImagePreview.src = editImageUrl.value;
            };
        }
        
        // Footer WhatsApp
        const footerWhatsapp = $('footerWhatsapp');
        if (footerWhatsapp) {
            footerWhatsapp.href = `https://wa.me/${CONFIG.whatsappNumber}`;
        }
        
        // Initialize cart UI
        updateCartUI();
    } catch (error) {
        console.error('Erro ao inicializar event listeners:', error);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Salvando...';
    }
    
    try {
        let imageUrlValue = getValue('imageUrl');
        const imageFile = $('imageFile');
        
        // Upload image if file selected
        if (imageFile && imageFile.files && imageFile.files[0]) {
            showToast('Fazendo upload da imagem...', { icon: '⏳', duration: 2000 });
            imageUrlValue = await uploadToImgBB(imageFile.files[0]);
        }
        
        if (!imageUrlValue) {
            throw new Error('Adicione uma imagem');
        }
        
        const productData = {
            fotoURL: imageUrlValue,
            nome: getValue('productName'),
            descricao: getValue('productDesc'),
            precoOriginal: parseFloat(getValue('productPrice')) || 0,
            precoPromocional: getValue('productPromoPrice') ? parseFloat(getValue('productPromoPrice')) : null,
            categoria: getValue('productCategory'),
            tamanhos: getValue('productSizes'),
            cores: getValue('productColors'),
            destaque: getChecked('productFeatured'),
            ativo: getChecked('productActive'),
            dataDeCriacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (editingProductId) {
            await firebase.firestore().collection("produtos").doc(editingProductId).update(productData);
            showToast('Produto atualizado com sucesso!', { icon: '✅' });
            editingProductId = null;
        } else {
            await firebase.firestore().collection("produtos").add(productData);
            showToast('Produto adicionado com sucesso!', { icon: '✅' });
        }
        
        // Reset form
        e.target.reset();
        const imagePreview = $('imagePreview');
        const uploadPlaceholder = $('uploadPlaceholder');
        if (imagePreview) imagePreview.style.display = 'none';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        setText('btnProductText', 'Adicionar Produto');
        setStyle('cancelEdit', 'display', 'none');
        
        // Reload
        await loadProducts();
        await loadAdminProducts();
        updateStats();
        
    } catch (error) {
        console.error('Error saving product:', error);
        showToast(error.message || 'Erro ao salvar produto', { bgColor: '#ff4757', icon: '✕' });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span id="btnProductText">Adicionar Produto</span>';
        }
    }
}

async function handleNotificationSubmit(e) {
    e.preventDefault();
    
    try {
        const notifData = {
            message: getValue('notifMessage'),
            type: getValue('notifType') || 'banner',
            bgColor: getValue('notifBgColor') || '#00ff99',
            textColor: getValue('notifTextColor') || '#000000',
            duration: parseInt(getValue('notifDuration')) || 0,
            icon: getValue('notifIcon') || '🔥',
            link: getValue('notifLink') || '',
            active: getChecked('notifActive'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Deactivate others if this is active
        if (notifData.active) {
            for (const n of notifications) {
                if (n.active) {
                    await firebase.firestore().collection("notifications").doc(n.id).update({ active: false });
                }
            }
        }
        
        await firebase.firestore().collection("notifications").add(notifData);
        
        showToast('Notificação salva com sucesso!', { icon: '🔔' });
        e.target.reset();
        await loadNotifications();
        
    } catch (error) {
        console.error('Error saving notification:', error);
        showToast('Erro ao salvar notificação', { bgColor: '#ff4757', icon: '✕' });
    }
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = getValue('editId');
    if (!id) return;
    
    try {
        await firebase.firestore().collection("produtos").doc(id).update({
            fotoURL: getValue('editImageUrl'),
            nome: getValue('editName'),
            descricao: getValue('editDesc'),
            precoOriginal: parseFloat(getValue('editPrice')) || 0,
            precoPromocional: getValue('editPromoPrice') ? parseFloat(getValue('editPromoPrice')) : null,
            categoria: getValue('editCategory'),
            tamanhos: getValue('editSizes'),
            cores: getValue('editColors'),
            destaque: getChecked('editFeatured'),
            ativo: getChecked('editActive')
        });
        
        removeClass('editModal', 'show');
        showToast('Produto atualizado com sucesso!', { icon: '✅' });
        
        await loadProducts();
        await loadAdminProducts();
        updateStats();
        
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Erro ao atualizar produto', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== INIT ====================
console.log('🚀 Loja DR initialized');

// Garantir que funções essenciais estejam disponíveis globalmente
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;