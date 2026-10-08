let quotationItems = [];

// INITIALIZE ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    try {
        const tbody = document.querySelector('#itemsTable tbody');
        if (tbody && tbody.rows.length === 0) {
            addItem();
        }
        updateSignatureDate();
        
        // Auto-load database data
        loadQuotations();
        loadCustomers();
        loadDashboard();

        // Attach Search Bar Listener
        setupSearchBar();
    } catch (err) {
        console.error('Initialization error in quotation.js:', err);
    }
});

// SEARCH BAR FILTERING
function setupSearchBar() {
    const searchInput = document.getElementById('searchInput') || document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterLists(e.target.value));
    }
}

function filterLists(query) {
    const filterText = query.toLowerCase().trim();
    
    // Filter Quotations List
    document.querySelectorAll('#quotationList li').forEach(li => {
        const text = li.innerText.toLowerCase();
        li.style.display = text.includes(filterText) ? 'flex' : 'none';
    });

    // Filter Customers List
    document.querySelectorAll('#customersList li').forEach(li => {
        const text = li.innerText.toLowerCase();
        li.style.display = text.includes(filterText) ? 'flex' : 'none';
    });
}

// FORCE TAB / VIEW SWITCH IF APP USES MULTI-MODULE VIEWS
function switchModuleToQuotation() {
    const mainView = document.getElementById('quotationModuleView');
    if (mainView) {
        mainView.style.display = 'block';
        mainView.classList.remove('hidden');
    }
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

// SET CURRENT DATE FOR SIGNATURE
function updateSignatureDate() {
    const dateSpan = document.getElementById('signatureDate');
    if (dateSpan) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        dateSpan.innerText = `${dd}.${mm}.${yyyy}`;
    }
}

// SAFE HELPER TO UNWRAP `{ success: true, data: [...] }` OR DIRECT ARRAYS
function extractArray(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.success && Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.quotations)) return response.quotations;
    return [];
}

// UNIVERSAL GETTER FOR INPUT OR CONTENTEDITABLE ELEMENTS
function getElementValue(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        return el.value.trim();
    }
    return el.innerText ? el.innerText.trim() : el.textContent.trim();
}

// UNIVERSAL SETTER FOR INPUT OR CONTENTEDITABLE ELEMENTS
function setElementValue(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const content = val ?? '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = content;
    } else {
        el.innerText = content;
    }
}

// ADD NEW ROW TO QUOTATION TABLE
function addItem(data = {}) {
    const tbody = document.querySelector('#itemsTable tbody');
    if (!tbody) return;

    const rowCount = tbody.rows.length + 1;
    const row = document.createElement('tr');

    row.innerHTML = `
        <td class="sl-no" style="text-align: center;">${rowCount}</td>
        <td contenteditable="true" class="editable-cell desc-cell" placeholder="Description">${data.description || data.desc || ''}</td>
        <td contenteditable="true" class="editable-cell details-cell" placeholder="Work Specification">${data.details || data.specification || ''}</td>
        <td><input type="number" class="doc-input sqft-input" value="${data.sqft ?? data.area ?? data.qty ?? ''}" placeholder="0" oninput="calculateRowAmount(this)"></td>
        <td><input type="number" class="doc-input rate-input" value="${data.rate ?? data.unitPrice ?? ''}" placeholder="0" oninput="calculateRowAmount(this)"></td>
        <td><input type="number" class="doc-input amount-input" value="${data.amount ?? '0.00'}" readonly></td>
        <td class="no-print action-col" style="text-align: center; vertical-align: middle;">
            <button type="button" class="delete-btn" onclick="deleteQuotationRow(this)" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold; font-size:14px;" title="Delete Row">✕</button>
        </td>
    `;

    tbody.appendChild(row);
    attachQuotationCellEvents(row);
    calculateGrandTotal();
}

// DELETE A SINGLE ROW FROM THE QUOTATION FORM
function deleteQuotationRow(buttonElement) {
    const row = buttonElement.closest('tr');
    if (row) {
        row.remove();
        updateSlNumbers();
        calculateGrandTotal();
    }
}

// RE-INDEX SERIAL NUMBERS (Sl)
function updateSlNumbers() {
    const rows = document.querySelectorAll('#itemsTable tbody tr');
    rows.forEach((row, index) => {
        const slCell = row.querySelector('.sl-no');
        if (slCell) {
            slCell.textContent = index + 1;
        }
    });
}

// ROW CALCULATION (Sqft * Rs. = Amount)
function calculateRowAmount(inputElement) {
    const row = inputElement.closest('tr');
    if (!row) return;

    const sqft = parseFloat(row.querySelector('.sqft-input')?.value) || 0;
    const rate = parseFloat(row.querySelector('.rate-input')?.value) || 0;
    const amountInput = row.querySelector('.amount-input');

    if (amountInput) {
        amountInput.value = (sqft * rate).toFixed(2);
    }

    calculateGrandTotal();
}

// ALIAS FOR TOOLBAR "CALCULATE" BUTTON
function calculate() {
    calculateGrandTotal();
}

// GRAND TOTAL & DISCOUNT CALCULATIONS
function calculateGrandTotal() {
    const rows = document.querySelectorAll('#itemsTable tbody tr');
    let subtotal = 0;

    rows.forEach(row => {
        const amountInput = row.querySelector('.amount-input');
        if (amountInput) {
            subtotal += parseFloat(amountInput.value) || 0;
        }
    });

    const totalElem = document.getElementById('total');
    if (totalElem) {
        totalElem.innerText = subtotal.toFixed(2);
    }

    const discountVal = parseFloat(getElementValue('discountInput')) || 0;
    const grandTotal = Math.max(0, subtotal - discountVal);

    setElementValue('grandTotalInput', grandTotal.toFixed(2));
}

// RESET TO NEW BLANK QUOTATION FORM
function newQuotation() {
    window.currentQuotationId = null; // Clear active ID safely
    window.currentMode = "NEW";
    switchModuleToQuotation();

    setElementValue('customerName', '');
    setElementValue('companyName', '');
    setElementValue('Address', '');
    setElementValue('site', '');
    setElementValue('workTitleInput', 'QUOTATION FOR PAINTING WORK');
    setElementValue('labourLabelInput', 'Labour only');
    setElementValue('discountInput', '');
    setElementValue('grandTotalInput', '');
    setElementValue('amountInWordsInput', '');
    setElementValue('place', '');

    const tbody = document.querySelector('#itemsTable tbody');
    if (tbody) tbody.innerHTML = '';

    addItem();
    updateSignatureDate();
}

// POPULATE FORM & ITEMS TABLE WITH SAVED QUOTATION
function populateQuotationForm(quotation) {
    if (!quotation) {
        console.error("populateQuotationForm: Received empty quotation object!");
        return;
    }

    if (quotation.data && typeof quotation.data === 'object') {
        quotation = { ...quotation, ...quotation.data };
    } else if (quotation.quotation_data && typeof quotation.quotation_data === 'string') {
        try { quotation = { ...quotation, ...JSON.parse(quotation.quotation_data) }; } catch(e){}
    }

    // Capture quotation ID for quick action toolbar actions
    window.currentQuotationId = quotation.id || quotation.quotation_id || null;
    window.currentMode = "EDIT";

    console.log('--- POPULATING FORM WITH RECORD ---', quotation);

    switchModuleToQuotation();

    const setFieldValue = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        const textValue = val ?? '';
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = textValue;
        } else {
            el.innerText = textValue;
        }
    };

    setFieldValue('customerName', quotation.customer_name || quotation.customerName || quotation.client);
    setFieldValue('companyName', quotation.company_name || quotation.companyName || quotation.company);
    setFieldValue('Address', quotation.address || quotation.Address);
    setFieldValue('site', quotation.site || quotation.siteLocation);
    
    setFieldValue('workTitleInput', quotation.work_title || quotation.workTitle || 'QUOTATION FOR PAINTING WORK');
    setFieldValue('labourLabelInput', quotation.labour_label || quotation.labourLabel || 'Labour only');

    setFieldValue('discountInput', quotation.discount || quotation.discountInput || '');
    setFieldValue('grandTotalInput', quotation.grand_total || quotation.grandTotal || quotation.total || '');
    setFieldValue('amountInWordsInput', quotation.amount_in_words || quotation.amountInWords || '');
    setFieldValue('place', quotation.place || quotation.location || '');

    const totalElem = document.getElementById('total');
    if (totalElem) {
        totalElem.innerText = parseFloat(quotation.total || quotation.grand_total || 0).toFixed(2);
    }

    let rawItems = quotation.items || quotation.items_json || quotation.quotation_items || [];
    if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch (e) { rawItems = []; }
    }

    const tbody = document.querySelector('#itemsTable tbody');
    if (tbody) tbody.innerHTML = '';

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        addItem();
    } else {
        rawItems.forEach(item => {
            addItem({
                description: item.description || item.desc || '',
                details: item.details || item.specification || '',
                sqft: item.sqft ?? item.area ?? item.qty ?? '',
                rate: item.rate ?? item.unitPrice ?? '',
                amount: item.amount ?? '0.00'
            });
        });
    }

    calculateGrandTotal();
}

// SAVE OR UPDATE QUOTATION IN DATABASE
async function saveQuotation() {
    const quotationData = {
        customerName: getElementValue('customerName'),
        companyName: getElementValue('companyName'),
        address: getElementValue('Address'),
        site: getElementValue('site'),
        workTitle: getElementValue('workTitleInput'),
        labourLabel: getElementValue('labourLabelInput'),
        total: getElementValue('total') || '0.00',
        discount: getElementValue('discountInput') || '0.00',
        grandTotal: getElementValue('grandTotalInput') || '0.00',
        amountInWords: getElementValue('amountInWordsInput'),
        place: getElementValue('place'),
        date: getElementValue('signatureDate'),
        items: []
    };

    const rows = document.querySelectorAll('#itemsTable tbody tr');
    rows.forEach(row => {
        const descCell = row.querySelector('.desc-cell');
        const detailsCell = row.querySelector('.details-cell');
        const sqftInput = row.querySelector('.sqft-input');
        const rateInput = row.querySelector('.rate-input');
        const amountInput = row.querySelector('.amount-input');

        quotationData.items.push({
            description: descCell ? descCell.innerHTML : '',
            details: detailsCell ? detailsCell.innerHTML : '',
            sqft: sqftInput ? sqftInput.value : '0',
            rate: rateInput ? rateInput.value : '0',
            amount: amountInput ? amountInput.value : '0.00'
        });
    });

    if (window.electronAPI && window.electronAPI.saveQuotation) {
        try {
            let response;
            if (window.currentQuotationId && window.electronAPI.updateQuotation) {
                response = await window.electronAPI.updateQuotation(window.currentQuotationId, quotationData);
            } else {
                response = await window.electronAPI.saveQuotation(quotationData);
                if (response?.id) window.currentQuotationId = response.id;
            }

            if (response && (response.success || response.id)) {
                alert('Quotation saved successfully!');
                loadQuotations();
                loadCustomers();
                loadDashboard();
            } else {
                alert('Error saving quotation.');
            }
        } catch (err) {
            console.error('Save Quotation Error:', err);
            alert('Failed to save quotation: ' + err.message);
        }
    } else {
        alert('Electron API is not available.');
    }
}

// TOOLBAR TOP BUTTON DELETE FUNCTION (`onclick="deleteQuotation()"`)
async function deleteQuotation(targetId = null) {
    const idToDelete = targetId || window.currentQuotationId;

    if (!idToDelete) {
        alert("No saved quotation is currently loaded to delete. Please load or select a quotation first.");
        return;
    }

    if (!confirm(`Are you sure you want to delete quotation #${idToDelete}?`)) {
        return;
    }

    if (window.electronAPI?.deleteQuotation) {
        try {
            const response = await window.electronAPI.deleteQuotation(Number(idToDelete));
            
            if (response && (response.success || response.status === 'ok' || response === true)) {
                alert(`Quotation #${idToDelete} deleted successfully.`);
                
                // Clear form to fresh blank state
                newQuotation();
                
                // Refresh list & metrics
                loadQuotations();
                loadCustomers();
                loadDashboard();
            } else {
                alert('Failed to delete quotation: ' + (response?.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error deleting active quotation:', err);
            alert('Error deleting quotation: ' + err.message);
        }
    } else {
        alert('Electron API bridge for deleteQuotation is missing.');
    }
}

// HANDLER FOR DELETING FROM SIDEBAR LIST
async function deleteQuotationRecord(event, quotationId) {
    if (event) event.stopPropagation();
    await deleteQuotation(quotationId);
}

// LOAD SINGLE QUOTATION BY ID
async function loadSingleQuotation(id) {
    try {
        let match = null;

        if (window.electronAPI?.getQuotationById) {
            const response = await window.electronAPI.getQuotationById(id);
            if (response?.success && response?.data) {
                match = response.data;
            } else {
                match = response;
            }
        }

        if (!match) {
            const getQuotationAPI = window.electronAPI?.getQuotations || window.electronAPI?.getQuotation;
            if (getQuotationAPI) {
                const response = await getQuotationAPI();
                let list = extractArray(response);
                match = list.find(q => Number(q.id) === Number(id));
            }
        }

        if (match) {
            populateQuotationForm(match);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(`Quotation ID ${id} not found.`);
        }
    } catch (err) {
        console.error('Error opening single quotation:', err);
    }
}

// POPULATE SAVED QUOTATIONS LIST
async function loadQuotations() {
    const getQuotationAPI = window.electronAPI?.getQuotations || window.electronAPI?.getQuotation;
    if (!getQuotationAPI) return;

    try {
        const response = await getQuotationAPI();
        const container = document.getElementById('quotationList');
        if (!container) return;

        const list = extractArray(response);

        if (list.length > 0) {
            let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
            list.forEach(item => {
                const name = item.customer_name || item.customerName || 'Unnamed Client';
                const site = item.site || 'N/A';
                const total = item.grand_total ?? item.grandTotal ?? item.total ?? '0.00';

                html += `
                    <li style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${name}</strong> <small style="color: #666;">(${site})</small><br>
                            <small style="color: #27ae60; font-weight: bold;">₹${parseFloat(total).toFixed(2)}</small>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <button class="blue-btn" style="padding: 4px 10px; font-size: 12px; cursor: pointer;" onclick="loadSingleQuotation(${item.id})">Open</button>
                            <button type="button" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 16px; padding: 2px 6px;" 
                                    onclick="deleteQuotationRecord(event, ${item.id})" 
                                    title="Delete Quotation">🗑️</button>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="empty-message">No quotations found.</p>';
        }
    } catch (err) {
        console.error('Error loading quotations list:', err);
    }
}

// POPULATE CUSTOMERS DIRECTORY WITH SELECT & DELETE
async function loadCustomers() {
    const getCustomersAPI = window.electronAPI?.getCustomers || window.electronAPI?.getQuotations;
    if (!getCustomersAPI) return;

    try {
        const response = await getCustomersAPI();
        const container = document.getElementById('customersList');
        if (!container) return;

        const list = extractArray(response);
        const customers = [...new Set(list.map(i => i.customer_name || i.customerName || i.name).filter(Boolean))];

        if (customers.length > 0) {
            let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
            customers.forEach(cust => {
                const safeName = cust.replace(/'/g, "\\'");
                html += `
                    <li style="padding: 8px 10px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" 
                        onclick="selectCustomer('${safeName}')"
                        onmouseover="this.style.background='#f5f5f5'" 
                        onmouseout="this.style.background='transparent'">
                        <span>👤 <strong>${cust}</strong></span>
                        <button type="button" 
                                onclick="deleteCustomer(event, '${safeName}')" 
                                style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 14px; padding: 2px 6px;" 
                                title="Delete Customer">🗑️</button>
                    </li>`;
            });
            html += '</ul>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="empty-message">No customers loaded.</p>';
        }
    } catch (err) {
        console.error('Error loading customers:', err);
    }
}

// SELECT CUSTOMER
function selectCustomer(customerName) {
    switchModuleToQuotation();
    setElementValue('customerName', customerName);
    
    const searchInput = document.getElementById('searchInput') || document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.value = customerName;
        filterLists(customerName);
    }
}

// DELETE CUSTOMER HANDLER
async function deleteCustomer(event, customerName) {
    if (event) event.stopPropagation();

    if (!confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
        return;
    }

    if (window.electronAPI?.deleteCustomer) {
        try {
            const response = await window.electronAPI.deleteCustomer(customerName);
            if (response && (response.success || response.status === 'ok' || response === true)) {
                alert(`Customer "${customerName}" deleted successfully.`);
                loadCustomers();
                loadQuotations();
                loadDashboard();
            } else {
                alert('Failed to delete customer: ' + (response?.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error deleting customer:', err);
            alert('Error deleting customer: ' + err.message);
        }
    } else {
        alert('Electron API bridge for deleteCustomer is missing.');
    }
}

// CALCULATE METRICS FOR DASHBOARD
async function loadDashboard() {
    if (window.electronAPI?.getDashboardData) {
        try {
            const res = await window.electronAPI.getDashboardData();
            if (res?.data) {
                if (document.getElementById('totalQuotations')) document.getElementById('totalQuotations').innerText = res.data.totalQuotations || res.data.count || 0;
                if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').innerText = parseFloat(res.data.totalRevenue || 0).toFixed(2);
                return;
            }
        } catch(e) {}
    }

    const getQuotationAPI = window.electronAPI?.getQuotations;
    if (!getQuotationAPI) return;

    try {
        const response = await getQuotationAPI();
        const list = extractArray(response);

        const count = list.length;
        const revenue = list.reduce((sum, item) => sum + (parseFloat(item.grand_total || item.grandTotal) || 0), 0);

        if (document.getElementById('totalQuotations')) document.getElementById('totalQuotations').innerText = count;
        if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').innerText = revenue.toFixed(2);
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

// ATTACH KEYBOARD SHORTCUTS TO EDITABLE CELLS
function attachQuotationCellEvents(container = document) {
    const cells = container.querySelectorAll('.editable-cell');

    cells.forEach(cell => {
        cell.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                let cmd = null;

                if (key === 'b') cmd = 'bold';
                if (key === 'i') cmd = 'italic';
                if (key === 'u') cmd = 'underline';

                if (cmd) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.execCommand(cmd, false, null);
                }
            }
        });
    });
}