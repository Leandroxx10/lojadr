// ==================== ADMIN PRODUCT MANAGEMENT ====================

// Função para popular formulário de edição
function populateEditForm(product) {
    setValue('imageUrl', product.fotoURL || '');
    setValue('productName', product.nome || '');
    setValue('productDesc', product.descricao || '');
    setValue('productPrice', product.precoOriginal || '');
    setValue('productPromoPrice', product.precoPromocional || '');
    setValue('productCategory', product.categoria || '');
    
    // Preencher tamanhos
    if (product.tamanhos && Array.isArray(product.tamanhos)) {
        document.querySelectorAll('input[name="tamanhos"]').forEach(checkbox => {
            checkbox.checked = product.tamanhos.includes(checkbox.value);
        });
    }
    
    // Preencher cores
    if (product.cores && Array.isArray(product.cores)) {
        document.querySelectorAll('input[name="cores"]').forEach(checkbox => {
            checkbox.checked = product.cores.includes(checkbox.value);
        });
    }
    
    setChecked('productFeatured', product.destaque || false);
    setChecked('productActive', product.ativo !== false);
    
    // Atualizar preview da imagem
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    if (imagePreview && product.fotoURL) {
        imagePreview.src = product.fotoURL;
        imagePreview.style.display = 'block';
        if (uploadPlaceholder) {
            uploadPlaceholder.style.display = 'none';
        }
    }
}

// Função para obter dados do formulário de produto
function getProductFormData() {
    const tamanhosSelecionados = [];
    document.querySelectorAll('input[name="tamanhos"]:checked').forEach(checkbox => {
        tamanhosSelecionados.push(checkbox.value);
    });
    
    const coresSelecionadas = [];
    document.querySelectorAll('input[name="cores"]:checked').forEach(checkbox => {
        coresSelecionadas.push(checkbox.value);
    });
    
    return {
        fotoURL: getValue('imageUrl'),
        nome: getValue('productName'),
        descricao: getValue('productDesc'),
        precoOriginal: parseFloat(getValue('productPrice')) || 0,
        precoPromocional: getValue('productPromoPrice') ? parseFloat(getValue('productPromoPrice')) : null,
        categoria: getValue('productCategory'),
        tamanhos: tamanhosSelecionados,
        cores: coresSelecionadas,
        destaque: getChecked('productFeatured'),
        ativo: getChecked('productActive')
    };
}

// ==================== BULK OPERATIONS ====================

function selectAllProducts() {
    document.querySelectorAll('.product-select').forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllProducts() {
    document.querySelectorAll('.product-select').forEach(checkbox => {
        checkbox.checked = false;
    });
}

async function bulkDeleteProducts() {
    const selectedProducts = [];
    document.querySelectorAll('.product-select:checked').forEach(checkbox => {
        selectedProducts.push(checkbox.dataset.id);
    });
    
    if (selectedProducts.length === 0) {
        showToast('Selecione pelo menos um produto para excluir', { bgColor: '#ff4757', icon: '✕' });
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedProducts.length} produto(s)?`)) {
        return;
    }
    
    try {
        const deletePromises = selectedProducts.map(id => 
            firebase.firestore().collection("produtos").doc(id).delete()
        );
        
        await Promise.all(deletePromises);
        showToast(`${selectedProducts.length} produto(s) excluído(s) com sucesso!`, { icon: '🗑️' });
        
        await loadProducts();
        await loadAdminProducts();
        updateStats();
        
    } catch (error) {
        console.error('Error in bulk delete:', error);
        showToast('Erro ao excluir produtos', { bgColor: '#ff4757', icon: '✕' });
    }
}

async function bulkToggleFeatured() {
    const selectedProducts = [];
    document.querySelectorAll('.product-select:checked').forEach(checkbox => {
        selectedProducts.push(checkbox.dataset.id);
    });
    
    if (selectedProducts.length === 0) {
        showToast('Selecione pelo menos um produto', { bgColor: '#ff4757', icon: '✕' });
        return;
    }
    
    try {
        const updatePromises = selectedProducts.map(id => 
            firebase.firestore().collection("produtos").doc(id).update({
                destaque: true
            })
        );
        
        await Promise.all(updatePromises);
        showToast(`${selectedProducts.length} produto(s) destacado(s)!`, { icon: '⭐' });
        
        await loadProducts();
        await loadAdminProducts();
        updateStats();
        
    } catch (error) {
        console.error('Error in bulk featured:', error);
        showToast('Erro ao destacar produtos', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== PRODUCT IMPORT/EXPORT ====================

function exportProducts() {
    try {
        const exportData = {
            products: products.map(p => ({
                nome: p.nome,
                descricao: p.descricao,
                precoOriginal: p.precoOriginal,
                precoPromocional: p.precoPromocional,
                categoria: p.categoria,
                tamanhos: p.tamanhos,
                cores: p.cores,
                destaque: p.destaque,
                ativo: p.ativo,
                fotoURL: p.fotoURL
            })),
            exportedAt: new Date().toISOString(),
            totalProducts: products.length
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produtos-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Produtos exportados com sucesso!', { icon: '📤' });
    } catch (error) {
        console.error('Error exporting products:', error);
        showToast('Erro ao exportar produtos', { bgColor: '#ff4757', icon: '✕' });
    }
}

async function importProducts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.products || !Array.isArray(importData.products)) {
                    throw new Error('Formato de arquivo inválido');
                }
                
                showToast(`Importando ${importData.products.length} produtos...`, { icon: '⏳', duration: 3000 });
                
                const importPromises = importData.products.map(product => 
                    firebase.firestore().collection("produtos").add({
                        ...product,
                        dataDeCriacao: firebase.firestore.FieldValue.serverTimestamp()
                    })
                );
                
                await Promise.all(importPromises);
                showToast(`${importData.products.length} produtos importados com sucesso!`, { icon: '📥' });
                
                await loadProducts();
                await loadAdminProducts();
                updateStats();
                
            } catch (error) {
                console.error('Error parsing import file:', error);
                showToast('Erro ao importar produtos: ' + error.message, { bgColor: '#ff4757', icon: '✕' });
            }
        };
        reader.readAsText(file);
        
    } catch (error) {
        console.error('Error importing products:', error);
        showToast('Erro ao importar produtos', { bgColor: '#ff4757', icon: '✕' });
    }
}

// ==================== ADVANCED SEARCH ====================

function initAdvancedSearch() {
    const searchInput = document.getElementById('searchAdmin');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performAdvancedSearch(e.target.value);
        }, 300);
    });
}

function performAdvancedSearch(query) {
    if (!query.trim()) {
        // Mostrar todos os produtos se a busca estiver vazia
        document.querySelectorAll('.admin-product-item').forEach(item => {
            item.style.display = 'flex';
        });
        return;
    }
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    document.querySelectorAll('.admin-product-item').forEach(item => {
        const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
        const category = item.querySelector('.badge:not(.featured):not(.promo)')?.textContent.toLowerCase() || '';
        const price = item.querySelector('p')?.textContent.toLowerCase() || '';
        
        const matches = searchTerms.some(term => 
            name.includes(term) || 
            category.includes(term) || 
            price.includes(term)
        );
        
        item.style.display = matches ? 'flex' : 'none';
    });
}

// ==================== QUICK ACTIONS ====================

function initQuickActions() {
    // Adicionar botões de ação rápida se não existirem
    if (!document.getElementById('quickActions')) {
        const adminProductList = document.getElementById('adminProductList');
        if (adminProductList) {
            const quickActions = document.createElement('div');
            quickActions.id = 'quickActions';
            quickActions.className = 'quick-actions';
            quickActions.innerHTML = `
                <div class="quick-actions-header">
                    <h4>Ações Rápidas</h4>
                </div>
                <div class="quick-actions-buttons">
                    <button class="btn-secondary btn-sm" onclick="selectAllProducts()">📋 Selecionar Todos</button>
                    <button class="btn-secondary btn-sm" onclick="deselectAllProducts()">📋 Desmarcar Todos</button>
                    <button class="btn-danger btn-sm" onclick="bulkDeleteProducts()">🗑️ Excluir Selecionados</button>
                    <button class="btn-edit btn-sm" onclick="bulkToggleFeatured()">⭐ Destacar Selecionados</button>
                    <button class="btn-primary btn-sm" onclick="exportProducts()">📤 Exportar Produtos</button>
                    <label class="btn-secondary btn-sm file-upload-label">
                        📥 Importar Produtos
                        <input type="file" id="importFile" accept=".json" style="display:none" onchange="importProducts(event)">
                    </label>
                </div>
            `;
            adminProductList.parentNode.insertBefore(quickActions, adminProductList);
        }
    }
}

// ==================== PRODUCT STATISTICS ====================

function generateProductStats() {
    if (!products || products.length === 0) {
        return {
            total: 0,
            active: 0,
            featured: 0,
            withPromo: 0,
            categories: 0,
            averagePrice: 0,
            priceRange: { min: 0, max: 0 }
        };
    }
    
    const activeProducts = products.filter(p => p.ativo !== false);
    const featuredProducts = products.filter(p => p.destaque);
    const promoProducts = products.filter(p => p.precoPromocional && p.precoPromocional < p.precoOriginal);
    const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
    
    const prices = products.map(p => p.precoPromocional || p.precoOriginal).filter(p => p && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    
    return {
        total: products.length,
        active: activeProducts.length,
        featured: featuredProducts.length,
        withPromo: promoProducts.length,
        categories: categories.length,
        averagePrice: avgPrice,
        priceRange: { min: minPrice, max: maxPrice }
    };
}

// ==================== DRAFT SYSTEM ====================

function saveDraft() {
    try {
        const draftData = {
            imageUrl: getValue('imageUrl'),
            productName: getValue('productName'),
            productDesc: getValue('productDesc'),
            productPrice: getValue('productPrice'),
            productPromoPrice: getValue('productPromoPrice'),
            productCategory: getValue('productCategory'),
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem('productDraft', JSON.stringify(draftData));
        showToast('Rascunho salvo!', { icon: '💾' });
    } catch (error) {
        console.error('Erro ao salvar rascunho:', error);
    }
}

function loadDraft() {
    try {
        const draft = localStorage.getItem('productDraft');
        if (!draft) {
            showToast('Nenhum rascunho encontrado', { bgColor: '#ffa502', icon: '📝' });
            return;
        }
        
        const draftData = JSON.parse(draft);
        
        setValue('imageUrl', draftData.imageUrl || '');
        setValue('productName', draftData.productName || '');
        setValue('productDesc', draftData.productDesc || '');
        setValue('productPrice', draftData.productPrice || '');
        setValue('productPromoPrice', draftData.productPromoPrice || '');
        setValue('productCategory', draftData.productCategory || '');
        
        // Atualizar preview da imagem se houver URL
        if (draftData.imageUrl) {
            const imagePreview = document.getElementById('imagePreview');
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            if (imagePreview) {
                imagePreview.src = draftData.imageUrl;
                imagePreview.style.display = 'block';
            }
            if (uploadPlaceholder) {
                uploadPlaceholder.style.display = 'none';
            }
        }
        
        showToast('Rascunho carregado!', { icon: '📝' });
    } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        showToast('Erro ao carregar rascunho', { bgColor: '#ff4757', icon: '✕' });
    }
}

function clearDraft() {
    try {
        localStorage.removeItem('productDraft');
        
        // Limpar apenas os campos do formulário, não a imagem
        setValue('productName', '');
        setValue('productDesc', '');
        setValue('productPrice', '');
        setValue('productPromoPrice', '');
        setValue('productCategory', '');
        
        showToast('Rascunho limpo!', { icon: '🗑️' });
    } catch (error) {
        console.error('Erro ao limpar rascunho:', error);
    }
}

// ==================== INITIALIZATION ====================

function initAdminFeatures() {
    initAdvancedSearch();
    initQuickActions();
    
    // Adicionar event listeners para funcionalidades avançadas
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.onchange = importProducts;
    }

    // Botões de rascunho
    const loadDraftBtn = document.getElementById('loadDraftBtn');
    const clearDraftBtn = document.getElementById('clearDraftBtn');

    if (loadDraftBtn) {
        loadDraftBtn.onclick = loadDraft;
    }

    if (clearDraftBtn) {
        clearDraftBtn.onclick = clearDraft;
    }

    // Auto-save do rascunho
    const productForm = document.getElementById('productForm');
    if (productForm) {
        let saveTimeout;
        productForm.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveDraft, 2000);
        });
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminFeatures);
} else {
    initAdminFeatures();
}