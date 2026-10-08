// INITIALIZE DEFAULT VOUCHER DATE
if (document.getElementById('input-date')) {
    document.getElementById('input-date').valueAsDate = new Date();
}

let items = [{ slNo: '1', desc: 'Initial Advance Payment', area: '', amount: 0 }];

// MODULE SWITCHING FUNCTION
function switchAppModule(moduleName) {
    const quotationView = document.getElementById('quotationModuleView');
    const voucherView = document.getElementById('voucherModuleView');
    const tabBtnQ = document.getElementById('tab-btn-quotation');
    const tabBtnV = document.getElementById('tab-btn-voucher');

    if (!quotationView || !voucherView) return;

    if (moduleName === 'quotation') {
        quotationView.style.display = 'block';
        voucherView.style.display = 'none';
        if (tabBtnQ) tabBtnQ.classList.add('active');
        if (tabBtnV) tabBtnV.classList.remove('active');
    } else {
        quotationView.style.display = 'none';
        voucherView.style.display = 'block';
        if (tabBtnV) tabBtnV.classList.add('active');
        if (tabBtnQ) tabBtnQ.classList.remove('active');
    }
}

// LIVE FORM SYNC
function syncForm() {
    const fields = [
        { input: 'input-date', doc: 'doc-date' },
        { input: 'input-ref', doc: 'doc-ref' },
        { input: 'input-voucher', doc: 'doc-voucher' },
        { input: 'input-bill', doc: 'doc-bill' },
        { input: 'input-party', doc: 'doc-party' },
        { input: 'input-site', doc: 'doc-site' },
        { input: 'input-mobile', doc: 'doc-mobile' }
    ];

    fields.forEach(({ input, doc }) => {
        const inputElem = document.getElementById(input);
        const docElem = document.getElementById(doc);
        if (inputElem && docElem) {
            docElem.innerText = inputElem.value;
        }
    });
}

// RENDER VOUCHER TABLE ROWS
function renderItems() {
    const tbody = document.getElementById('items-container');
    if (!tbody) return;

    tbody.innerHTML = '';

    items.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
          <td style="vertical-align: top; text-align: center;" contenteditable="true" class="editable-cell" data-field="slNo">
            ${item.slNo !== undefined ? item.slNo : index + 1}
          </td>
          <td style="vertical-align: top;" contenteditable="true" class="editable-cell desc-cell" data-field="desc">
            ${item.desc || ''}
          </td>
          <td style="vertical-align: top; text-align: right;" contenteditable="true" class="editable-cell" data-field="area">
            ${item.area || ''}
          </td>
          <td style="vertical-align: top; text-align: right;" contenteditable="true" class="editable-cell" data-field="amount">
            ${item.amount || 0}
          </td>
          <td class="btn-remove" style="vertical-align: middle;">
            <button class="btn-remove" onclick="removeItem(${index})">×</button>
          </td>
        `;
        tbody.appendChild(tr);
    });

    attachCellEvents();
    calculateVoucherTotal();
}

// ATTACH LISTENERS WITH EXPLICIT SELECTION MANIPULATION
function attachCellEvents() {
    const cells = document.querySelectorAll('#items-container .editable-cell');

    cells.forEach((cell) => {
        const tr = cell.closest('tr');
        const index = tr ? tr.rowIndex - 1 : -1;

        if (index < 0 || !items[index]) return;

        // Sync inputs directly to state
        cell.addEventListener('input', function () {
            const field = cell.getAttribute('data-field');
            if (field === 'desc' || field === 'area') {
                items[index][field] = cell.innerHTML;
            } else if (field === 'amount') {
                const cleanVal = cell.innerText.replace(/<[^>]*>/g, '').replace(/,/g, '').trim();
                items[index].amount = parseFloat(cleanVal) || 0;
                calculateVoucherTotal();
            } else if (field) {
                items[index][field] = cell.innerText;
            }
        });

        // Intercept formatting shortcuts explicitly
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

                    const field = cell.getAttribute('data-field');
                    if (field) {
                        items[index][field] = cell.innerHTML;
                    }
                }
            }
        });
    });
}

function addItemRow() {
    items.push({ slNo: items.length + 1, desc: '', area: '', amount: 0 });
    renderItems();
}

function removeItem(index) {
    items.splice(index, 1);
    renderItems();
}

function calculateVoucherTotal() {
    let grandTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalArea = document.getElementById('input-total-amount');
    
    if (totalArea) {
        // Auto-calculate if user hasn't manually focused/typed in the field, or set calculated total
        totalArea.value = Math.round(grandTotal).toLocaleString('en-IN');
    }
}

// RESET ALL VOUCHER FIELDS TO A NEW VOUCHER STATE
function newVoucher() {
    if (document.getElementById('input-date')) {
        document.getElementById('input-date').valueAsDate = new Date();
    }
    if (document.getElementById('input-ref')) document.getElementById('input-ref').value = '';
    if (document.getElementById('input-voucher')) document.getElementById('input-voucher').value = '';
    if (document.getElementById('input-bill')) document.getElementById('input-bill').value = '';
    if (document.getElementById('input-party')) document.getElementById('input-party').value = '';
    if (document.getElementById('input-site')) document.getElementById('input-site').value = '';
    if (document.getElementById('input-mobile')) document.getElementById('input-mobile').value = '';
    if (document.getElementById('voucher-note-input')) document.getElementById('voucher-note-input').value = '';
    if (document.getElementById('voucher-bottom-amount-note')) document.getElementById('voucher-bottom-amount-note').value = '';

    items = [{ slNo: '1', desc: 'Initial Advance Payment', area: '', amount: 0 }];

    syncForm();
    renderItems();
}

// DATABASE OPERATIONS VIA ELECTRON API
async function saveVoucherToDB() {
    const voucherData = {
        voucherNo: document.getElementById('input-voucher')?.value || '',
        refNo: document.getElementById('input-ref')?.value || '',
        billNo: document.getElementById('input-bill')?.value || '',
        date: document.getElementById('input-date')?.value || '',
        partyName: document.getElementById('input-party')?.value || '',
        site: document.getElementById('input-site')?.value || '',
        mobile: document.getElementById('input-mobile')?.value || '',
        note: document.getElementById('voucher-note-input')?.value || '',
        bottomAmountNote: document.getElementById('voucher-bottom-amount-note')?.value || '',
        total: document.getElementById('input-total-amount')?.value || '',
        items: items
    };

    if (window.electronAPI && window.electronAPI.saveVoucher) {
        try {
            const response = await window.electronAPI.saveVoucher(voucherData);
            if (response && response.success) {
                alert('Payment Voucher saved successfully!');
            } else {
                alert('Error saving voucher: ' + (response?.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Save Voucher Error:', err);
            alert('Failed to save voucher: ' + err.message);
        }
    } else {
        alert('Electron API is not available.');
    }
}

async function loadVouchersFromDB() {
    const getVouchersAPI = window.electronAPI?.getVouchers || window.electronAPI?.getVoucher;

    if (getVouchersAPI) {
        try {
            const response = await getVouchersAPI();
            if (response && response.success && response.data && response.data.length > 0) {
                const voucher = response.data[0];

                if (document.getElementById('input-voucher')) document.getElementById('input-voucher').value = voucher.voucher_no || voucher.voucherNo || '';
                if (document.getElementById('input-ref')) document.getElementById('input-ref').value = voucher.ref_no || voucher.refNo || '';
                if (document.getElementById('input-bill')) document.getElementById('input-bill').value = voucher.bill_no || voucher.billNo || '';
                if (document.getElementById('input-date')) document.getElementById('input-date').value = voucher.voucher_date || voucher.date || '';
                if (document.getElementById('input-party')) document.getElementById('input-party').value = voucher.party_name || voucher.partyName || '';
                if (document.getElementById('input-site')) document.getElementById('input-site').value = voucher.site || '';
                if (document.getElementById('input-mobile')) document.getElementById('input-mobile').value = voucher.mobile || '';
                if (document.getElementById('voucher-note-input')) document.getElementById('voucher-note-input').value = voucher.note || voucher.voucher_note || '';
                if (document.getElementById('voucher-bottom-amount-note')) document.getElementById('voucher-bottom-amount-note').value = voucher.bottomAmountNote || voucher.bottom_amount_note || '';

                if (typeof voucher.items_json === 'string') {
                    items = JSON.parse(voucher.items_json);
                } else if (typeof voucher.items === 'string') {
                    items = JSON.parse(voucher.items);
                } else if (Array.isArray(voucher.items_json)) {
                    items = voucher.items_json;
                } else if (Array.isArray(voucher.items)) {
                    items = voucher.items;
                } else {
                    items = [];
                }

                syncForm();
                renderItems();
                alert('Latest voucher loaded successfully!');
            } else {
                alert('No saved vouchers found.');
            }
        } catch (error) {
            console.error('Failed to load voucher:', error);
            alert('Error loading voucher: ' + error.message);
        }
    } else {
        alert('electronAPI.getVouchers is not defined.');
    }
}

// INITIALIZATION CALLS
syncForm();
renderItems();