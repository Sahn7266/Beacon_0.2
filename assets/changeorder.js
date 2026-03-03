/**
 * Change Order Management Module
 * Provides functions for creating, reading, updating, and deleting change orders
 */

const CHANGE_ORDERS_KEY = 'change_orders_data';

// ==================== STORAGE FUNCTIONS ====================

/**
 * Get all change orders from localStorage
 * @returns {Array} Array of change order objects
 */
function getChangeOrders() {
  try {
    const data = localStorage.getItem(CHANGE_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading change orders:', e);
    return [];
  }
}

/**
 * Get a single change order by ID
 * @param {string} id - The change order ID
 * @returns {Object|null} The change order object or null if not found
 */
function getChangeOrder(id) {
  const orders = getChangeOrders();
  return orders.find(co => co.id === id) || null;
}

/**
 * Save a change order (create or update)
 * @param {Object} co - The change order object to save
 */
function saveChangeOrder(co) {
  try {
    const orders = getChangeOrders();
    const existingIndex = orders.findIndex(o => o.id === co.id);
    
    co.modifiedDate = new Date().toISOString();
    
    if (existingIndex !== -1) {
      orders[existingIndex] = co;
    } else {
      co.createdDate = co.createdDate || new Date().toISOString();
      orders.push(co);
    }
    
    localStorage.setItem(CHANGE_ORDERS_KEY, JSON.stringify(orders));
    
    // Dispatch storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
      key: CHANGE_ORDERS_KEY
    }));
    
    return true;
  } catch (e) {
    console.error('Error saving change order:', e);
    return false;
  }
}

/**
 * Delete a change order by ID
 * @param {string} id - The change order ID to delete
 * @returns {boolean} True if deleted, false otherwise
 */
function deleteChangeOrder(id) {
  try {
    const orders = getChangeOrders();
    const filteredOrders = orders.filter(co => co.id !== id);
    
    if (filteredOrders.length === orders.length) {
      return false; // Not found
    }
    
    localStorage.setItem(CHANGE_ORDERS_KEY, JSON.stringify(filteredOrders));
    return true;
  } catch (e) {
    console.error('Error deleting change order:', e);
    return false;
  }
}

/**
 * Generate a unique Change Order ID
 * @returns {string} A unique CO ID like "CO-A8X2K1"
 */
function generateCOId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CO-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ==================== MODAL FUNCTIONS ====================

/**
 * Open the Change Order Picker Modal
 * This modal allows users to create a new change order or add items to an existing one
 */
function openCOPickerModal() {
  // Check if modal already exists
  let modal = document.getElementById('coPickerModal');
  
  if (!modal) {
    // Create modal if it doesn't exist
    modal = createCOPickerModal();
    document.body.appendChild(modal);
  }
  
  // Populate existing change orders
  populateCOPickerList();
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Close the Change Order Picker Modal
 */
function closeCOPickerModal() {
  const modal = document.getElementById('coPickerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Create the CO Picker Modal HTML
 * @returns {HTMLElement} The modal element
 */
function createCOPickerModal() {
  const modal = document.createElement('div');
  modal.id = 'coPickerModal';
  modal.className = 'fixed inset-0 z-50 items-center justify-center bg-black bg-opacity-50 hidden';
  
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Change Order</h2>
          <button onclick="closeCOPickerModal()" class="text-white hover:text-green-200 transition-colors" aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Modal Body -->
      <div class="p-6">
        <!-- Create New Option -->
        <div class="mb-6">
          <button onclick="createNewChangeOrder()" class="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create New Change Order
          </button>
        </div>
        
        <!-- Divider -->
        <div class="flex items-center gap-4 mb-6">
          <div class="flex-1 border-t border-gray-200"></div>
          <span class="text-sm text-gray-500">or add to existing</span>
          <div class="flex-1 border-t border-gray-200"></div>
        </div>
        
        <!-- Existing Change Orders List -->
        <div id="coPickerList" class="space-y-2 max-h-64 overflow-y-auto">
          <p class="text-sm text-gray-500 text-center py-4">No existing change orders</p>
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button onclick="closeCOPickerModal()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCOPickerModal();
    }
  });
  
  return modal;
}

/**
 * Populate the Change Order picker list with existing COs
 */
function populateCOPickerList() {
  const listEl = document.getElementById('coPickerList');
  if (!listEl) return;
  
  const orders = getChangeOrders().filter(co => 
    (co.status || 'draft').toLowerCase() === 'draft'
  );
  
  if (orders.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No draft change orders available</p>';
    return;
  }
  
  listEl.innerHTML = orders.map(co => `
    <button onclick="addToChangeOrder('${co.id}')" class="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
      <div>
        <p class="text-sm font-medium text-gray-900">${co.name || co.id}</p>
        <p class="text-xs text-gray-500">${co.id} • ${formatDate(co.modifiedDate)}</p>
      </div>
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  `).join('');
}

/**
 * Create a new change order and navigate to it
 */
function createNewChangeOrder() {
  // Get advertiser info from localStorage
  let advData = null;
  try {
    const raw = localStorage.getItem('adv_selected_data');
    if (raw) advData = JSON.parse(raw);
  } catch {}

  // Create advertiser entity
  const advertiserEntity = advData ? {
    type: 'advertiser',
    id: advData.id || advData.advertiserId || 'unknown',
    name: advData.name || 'Unknown Advertiser',
    fields: {}
  } : null;

  const newCO = {
    id: generateCOId(),
    name: 'New Change Order',
    status: 'draft',
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
    owner: 'Current User', // Would be replaced with actual user
    entities: advertiserEntity ? [advertiserEntity] : [],
    advertiserId: getSelectedAdvertiserId()
  };
  
  saveChangeOrder(newCO);
  closeCOPickerModal();
  
  // Show success toast if available
  if (typeof showToast === 'function') {
    showToast('Change order created', 'success');
  } else if (window.toast && typeof window.toast.success === 'function') {
    window.toast.success('Change order created');
  }
  
  // Navigate to the new change order
  window.location.href = `./ChangeOrderDetail.html?coId=${encodeURIComponent(newCO.id)}`;
}

/**
 * Add current entity to an existing change order
 * @param {string} coId - The change order ID to add to
 */
function addToChangeOrder(coId) {
  const co = getChangeOrder(coId);
  if (!co) {
    if (typeof showToast === 'function') {
      showToast('Change order not found', 'error');
    }
    return;
  }
  
  // Get current page context (campaign, ad group, etc.)
  const entity = getCurrentEntityContext();
  
  if (entity) {
    co.entities = co.entities || [];
    
    // Check if entity already exists
    const exists = co.entities.some(e => e.id === entity.id && e.type === entity.type);
    
    if (!exists) {
      co.entities.push(entity);
      saveChangeOrder(co);
      
      if (typeof showToast === 'function') {
        showToast(`Added to ${co.name || co.id}`, 'success');
      } else if (window.toast && typeof window.toast.success === 'function') {
        window.toast.success(`Added to ${co.name || co.id}`);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast('Already in this change order', 'info');
      } else if (window.toast && typeof window.toast.info === 'function') {
        window.toast.info('Already in this change order');
      }
    }
  }
  
  closeCOPickerModal();
}

/**
 * Get the current entity context based on the page
 * @returns {Object|null} Entity object with id, type, and name
 */
function getCurrentEntityContext() {
  const url = window.location.href;
  const params = new URLSearchParams(window.location.search);
  
  // Campaign detail page
  if (url.includes('CampaignDetails.html')) {
    const campaignId = params.get('campaignId');
    const campaignName = params.get('campaignName');
    if (campaignId) {
      return { id: campaignId, type: 'campaign', name: campaignName || campaignId };
    }
  }
  
  // Ad Group detail page
  if (url.includes('AdGroupDetails.html')) {
    const adGroupId = params.get('id');
    if (adGroupId) {
      return { id: adGroupId, type: 'adgroup', name: adGroupId };
    }
  }
  
  return null;
}

/**
 * Get the selected advertiser ID from various sources
 * @returns {string|null} The advertiser ID or null
 */
function getSelectedAdvertiserId() {
  // Try URL params
  const params = new URLSearchParams(window.location.search);
  if (params.get('advertiserId')) {
    return params.get('advertiserId');
  }
  
  // Try localStorage
  try {
    const advData = localStorage.getItem('adv_selected_data');
    if (advData) {
      const adv = JSON.parse(advData);
      return adv.id || null;
    }
  } catch (e) {}
  
  return null;
}

/**
 * Format a date string for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

// ==================== TOAST HELPER ====================

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type: 'success', 'error', 'info', 'warning'
 */
function showToast(message, type = 'info') {
  // Try different toast implementations
  if (window.toast) {
    if (typeof window.toast[type] === 'function') {
      window.toast[type](message);
      return;
    }
    if (typeof window.toast.show === 'function') {
      window.toast.show(message, type);
      return;
    }
  }
  
  // Fallback to console
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Make functions globally available
window.getChangeOrders = getChangeOrders;
window.getChangeOrder = getChangeOrder;
window.saveChangeOrder = saveChangeOrder;
window.deleteChangeOrder = deleteChangeOrder;
window.openCOPickerModal = openCOPickerModal;
window.closeCOPickerModal = closeCOPickerModal;
window.createNewChangeOrder = createNewChangeOrder;
window.addToChangeOrder = addToChangeOrder;
window.generateCOId = generateCOId;
