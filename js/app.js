/**************************************************************************
 * Olive ERP - Desktop GST Billing & Quotation App
 * app.js
 **************************************************************************/

"use strict";

/* ===========================================================
   GLOBAL VARIABLES
=========================================================== */

// In app.js
window.currentQuotationId = null;
window.currentMode = "NEW";
window.itemCounter = 0;

/* ===========================================================
   DOM READY & INITIALIZATION
=========================================================== */

document.addEventListener("DOMContentLoaded", initializeApplication);

async function initializeApplication() {
    console.log("Olive ERP Starting Initialization...");

    setCurrentDate();
    attachInputEvents();

    const tbody = document.querySelector("#itemsTable tbody");
    if (tbody && tbody.rows.length === 0) {
        addItem();
    }

    await generateQuotationNumber();
    await refreshApplication();
}

/* ===========================================================
   CURRENCY FORMATTING HELPER
=========================================================== */

function formatCurrency(amount) {
    if (isNaN(amount) || amount === null) return "0";
    return Math.round(amount).toLocaleString('en-IN'); 
}

/* ===========================================================
   DATE & STATUS HELPERS
=========================================================== */

function setCurrentDate() {
    const today = new Date();
    const formatted = today.toLocaleDateString("en-IN");

    const dateElement = document.getElementById("date");
    if (dateElement) dateElement.innerText = formatted;

    const signatureDate = document.getElementById("signatureDate");
    if (signatureDate) signatureDate.innerText = formatted;
}

function setQuotationStatus(status) {
    currentMode = status;
    const statusElement = document.getElementById("quotationStatus");
    if (statusElement) {
        statusElement.innerText = status;
    }
}

/* ===========================================================
   GENERATE QUOTATION NUMBER
=========================================================== */

async function generateQuotationNumber() {
    try {
        let lastId = 0;
        if (window.electronAPI && typeof window.electronAPI.getLastQuotationId === "function") {
            const response = await window.electronAPI.getLastQuotationId();
            if (response && response.success) {
                lastId = response.lastId || 0;
            }
        }

        const year = new Date().getFullYear();
        const quotationNumber = "OLIVE-" + year + "-" + String(lastId + 1).padStart(4, "0");

        const qNoElem = document.getElementById("quotationNo");
        if (qNoElem) {
            qNoElem.innerText = quotationNumber;
        }
    } catch (error) {
        console.error("Error generating quotation number:", error);
    }
}

/* ===========================================================
   TABLE & ITEM MANAGEMENT (DYNAMIC CONTENTEDITABLE CREATION)
=========================================================== */

function addItem() {
    itemCounter++;

    const tbody = document.querySelector("#itemsTable tbody");
    if (!tbody) return;

    const row = tbody.insertRow();

    // Dynamically added row with contenteditable fields for formatting support
    row.innerHTML = `
        <td style="text-align: center; vertical-align: middle;">${tbody.rows.length}</td>
        <td contenteditable="true" class="editable-cell description" data-placeholder="[Description]"></td>
        <td contenteditable="true" class="editable-cell details" data-placeholder="[Work Specification]"></td>
        <td contenteditable="true" class="editable-cell area" style="text-align: right;" data-placeholder="0">0</td>
        <td contenteditable="true" class="editable-cell rate" style="text-align: right;" data-placeholder="0.00">0.00</td>
        <td>
            <input type="text" class="amount" value="0.00" readonly>
        </td>
        <td style="text-align: center; vertical-align: middle;" class="no-print action-col">
            <button class="delete-btn" onclick="removeItem(this)">❌</button>
        </td>
    `;

    attachRowEvents(row);
    reindexRows();
}

function removeItem(button) {
    const row = button.closest("tr");
    if (row) {
        row.remove();
        reindexRows();
        calculate();
    }
}

function attachRowEvents(row) {
    const rate = row.querySelector(".rate");
    const area = row.querySelector(".area");

    if (rate) rate.addEventListener("input", calculate);
    if (area) area.addEventListener("input", calculate);
}

function reindexRows() {
    const rows = document.querySelectorAll("#itemsTable tbody tr");
    rows.forEach((row, index) => {
        row.cells[0].innerText = index + 1;
    });
}

/* ===========================================================
   AUTOMATIC CALCULATION
=========================================================== */

function calculate() {
    let subtotal = 0;
    const rows = document.querySelectorAll("#itemsTable tbody tr");

    rows.forEach(row => {
        const rateStr = row.querySelector(".rate")?.innerText.replace(/,/g, '') || "0";
        const areaStr = row.querySelector(".area")?.innerText.replace(/,/g, '') || "0";

        const rate = parseFloat(rateStr) || 0;
        const area = parseFloat(areaStr) || 0;
        const amount = rate * area;

        const amountInput = row.querySelector(".amount");
        if (amountInput) {
            amountInput.value = formatCurrency(amount); 
        }

        subtotal += amount;
    });

    const totalElement = document.getElementById("total");
    if (totalElement) {
        totalElement.innerText = formatCurrency(subtotal);
    }

    calculateGrandTotal();
}

function calculateGrandTotal() {
    const subtotalText = (document.getElementById("total")?.innerText || "0").replace(/,/g, '');
    const subtotal = parseFloat(subtotalText) || 0;

    const discountText = (document.getElementById("discountInput")?.value || "0").replace(/,/g, '');
    const discount = parseFloat(discountText) || 0;

    const grandTotal = Math.max(0, subtotal - discount);

    const grandTotalInput = document.getElementById("grandTotalInput");
    if (grandTotalInput) {
        grandTotalInput.value = formatCurrency(grandTotal);
    }
}

window.calculateGrandTotal = calculateGrandTotal;

function attachInputEvents() {
    const customerInput = document.getElementById("customerName");
    if (customerInput) {
        customerInput.addEventListener("change", loadCustomerHistory);
    }
}

/* ===========================================================
   COLLECT DATA & SAVE / UPDATE QUOTATION
=========================================================== */

function collectQuotationData() {
    const items = [];

    document.querySelectorAll("#itemsTable tbody tr").forEach(row => {
        const rawAmountStr = (row.querySelector(".amount")?.value || "0").replace(/,/g, '');
        const rateStr = row.querySelector(".rate")?.innerText.replace(/,/g, '') || "0";
        const areaStr = row.querySelector(".area")?.innerText.replace(/,/g, '') || "0";

        items.push({
            description: row.querySelector(".description")?.innerHTML || "",
            details: row.querySelector(".details")?.innerHTML || "",
            area: parseFloat(areaStr) || 0,
            rate: parseFloat(rateStr) || 0,
            amount: parseFloat(rawAmountStr) || 0
        });
    });

    const rawTotalStr = (document.getElementById("total")?.innerText || "0").replace(/,/g, '');

    return {
        quotationNo: document.getElementById("quotationNo")?.innerText || "",
        date: document.getElementById("signatureDate")?.innerText || "",
        customerName: document.getElementById("customerName")?.value || "",
        companyName: document.getElementById("companyName")?.value || "",
        address: document.getElementById("Address")?.value || "",
        site: document.getElementById("site")?.value || "",
        workTitle: document.getElementById("workTitleInput")?.value || "",
        total: parseFloat(rawTotalStr) || 0,
        items
    };
}

async function saveQuotation() {
    try {
        showLoading();
        const quotation = collectQuotationData();

        if (!quotation.customerName.trim()) {
            hideLoading();
            showNotification("Please enter customer name.", "warning");
            return;
        }

        if (window.electronAPI && typeof window.electronAPI.saveQuotation === "function") {
            const result = await window.electronAPI.saveQuotation(quotation);
            hideLoading();

            if (result && result.success) {
                currentQuotationId = result.quotationId;
                setQuotationStatus("SAVED");
                showNotification("Quotation Saved Successfully", "success");
                await refreshApplication();
            } else {
                showNotification("Failed to save quotation.", "error");
            }
        } else {
            hideLoading();
            showNotification("Quotation Saved (Demo Mode)", "success");
            setQuotationStatus("SAVED");
        }
    } catch (error) {
        hideLoading();
        console.error("Save Error:", error);
        showNotification("Unable to save quotation.", "error");
    }
}

async function updateQuotation() {
    try {
        if (!currentQuotationId) {
            showNotification("No quotation loaded to update.", "warning");
            return;
        }

        showLoading();
        const quotation = collectQuotationData();

        if (window.electronAPI && typeof window.electronAPI.updateQuotation === "function") {
            const result = await window.electronAPI.updateQuotation(currentQuotationId, quotation);
            hideLoading();

            if (result && result.success) {
                setQuotationStatus("UPDATED");
                showNotification("Quotation Updated Successfully", "success");
                await refreshApplication();
            } else {
                showNotification("Failed to update quotation.", "error");
            }
        } else {
            hideLoading();
            showNotification("Quotation Updated (Demo Mode)", "success");
            setQuotationStatus("UPDATED");
        }
    } catch (error) {
        hideLoading();
        console.error("Update Error:", error);
        showNotification("Unable to update quotation.", "error");
    }
}

async function saveOrUpdateQuotation() {
    if (currentQuotationId === null) {
        await saveQuotation();
    } else {
        await updateQuotation();
    }
}

/* ===========================================================
   RESET / NEW QUOTATION
=========================================================== */

async function newQuotation() {
    currentQuotationId = null;
    itemCounter = 0;

    const inputs = ["customerName", "designation", "phone", "Address", "site"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const tbody = document.querySelector("#itemsTable tbody");
    if (tbody) tbody.innerHTML = "";

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.innerText = "0.00";

    setQuotationStatus("NEW MODE");

    await generateQuotationNumber();
    addItem();

    showNotification("New quotation form ready", "info");
}

/* ===========================================================
   DELETE QUOTATION
=========================================================== */

async function deleteQuotation() {
    try {
        if (!currentQuotationId) {
            showNotification("Please load a quotation to delete.", "warning");
            return;
        }

        if (!confirm("Are you sure you want to delete this quotation?")) {
            return;
        }

        showLoading();

        if (window.electronAPI && typeof window.electronAPI.deleteQuotation === "function") {
            const result = await window.electronAPI.deleteQuotation(currentQuotationId);
            hideLoading();

            if (result && result.success) {
                showNotification("Quotation Deleted Successfully", "success");
                await newQuotation();
                await refreshApplication();
            } else {
                showNotification("Failed to delete quotation.", "error");
            }
        } else {
            hideLoading();
            showNotification("Deleted (Demo Mode)", "info");
            await newQuotation();
        }
    } catch (error) {
        hideLoading();
        console.error("Delete Error:", error);
        showNotification("Unable to delete quotation.", "error");
    }
}

/* ===========================================================
   LOAD ALL QUOTATIONS & SEARCH
=========================================================== */

async function loadQuotations() {
    try {
        const container = document.getElementById("quotationList");
        if (!container) return;

        if (!window.electronAPI || typeof window.electronAPI.getQuotations !== "function") {
            container.innerHTML = "<p class='empty-message'>No saved backend connection found (Demo Mode).</p>";
            return;
        }

        container.innerHTML = "<p>Loading quotations...</p>";

        const response = await window.electronAPI.getQuotations();
        if (!response || !response.success) {
            container.innerHTML = "<p class='empty-message'>Error loading quotations.</p>";
            return;
        }

        const quotations = response.data || [];
        if (quotations.length === 0) {
            container.innerHTML = "<p class='empty-message'>No quotations found.</p>";
            return;
        }

        container.innerHTML = "";
        quotations.forEach(q => {
            const card = document.createElement("div");
            card.className = "quotation-card";
            card.innerHTML = `
                <div class="flex-between">
                    <strong>${q.quotation_no || "N/A"}</strong>
                    <span class="text-muted" style="font-size:12px;">${q.quotation_date || ""}</span>
                </div>
                <div class="mt-10"><b>Customer:</b> ${q.customer_name || "N/A"}</div>
                <div><b>Phone:</b> ${q.phone || "N/A"}</div>
                <div><b>Total:</b> ₹ ${formatCurrency(q.total || 0)}</div>
                <button class="blue-btn mt-10" onclick="openQuotation(${q.id})">📂 Open</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Load Quotations Error:", error);
    }
}

async function searchQuotations() {
    try {
        const searchTextElem = document.getElementById("searchText");
        const keyword = searchTextElem ? searchTextElem.value.trim() : "";

        if (keyword === "") {
            await loadQuotations();
            return;
        }

        const container = document.getElementById("quotationList");
        if (!container) return;

        if (!window.electronAPI || typeof window.electronAPI.searchQuotations !== "function") return;

        const response = await window.electronAPI.searchQuotations(keyword);
        if (!response || !response.success) {
            container.innerHTML = "<p class='empty-message'>Search failed.</p>";
            return;
        }

        const quotations = response.data || [];
        container.innerHTML = "";

        if (quotations.length === 0) {
            container.innerHTML = "<p class='empty-message'>No matching quotations found.</p>";
            return;
        }

        quotations.forEach(q => {
            const card = document.createElement("div");
            card.className = "quotation-card";
            card.innerHTML = `
                <div class="flex-between">
                    <strong>${q.quotation_no || "N/A"}</strong>
                    <span class="text-muted" style="font-size:12px;">${q.quotation_date || ""}</span>
                </div>
                <div class="mt-10"><b>Customer:</b> ${q.customer_name || "N/A"}</div>
                <div><b>Phone:</b> ${q.phone || "N/A"}</div>
                <div><b>Total:</b> ₹ ${formatCurrency(q.total || 0)}</div>
                <button class="blue-btn mt-10" onclick="openQuotation(${q.id})">📂 Open</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Search Error:", error);
    }
}

/* ===========================================================
   OPEN QUOTATION BY ID
=========================================================== */

async function openQuotation(id) {
    try {
        showLoading();
        if (!window.electronAPI || typeof window.electronAPI.getQuotationById !== "function") {
            hideLoading();
            return;
        }

        const response = await window.electronAPI.getQuotationById(id);
        hideLoading();

        if (!response || !response.success || !response.data) {
            showNotification("Quotation details not found.", "error");
            return;
        }

        const { quotation, items } = response.data;
        if (!quotation) return;

        currentQuotationId = quotation.id;

        const qNoElem = document.getElementById("quotationNo");
        if (qNoElem) qNoElem.innerText = quotation.quotation_no || "";

        const dateElem = document.getElementById("date");
        if (dateElem) dateElem.innerText = quotation.quotation_date || "";

        if (document.getElementById("customerName")) document.getElementById("customerName").value = quotation.customer_name || "";
        if (document.getElementById("designation")) document.getElementById("designation").value = quotation.designation || "";
        if (document.getElementById("phone")) document.getElementById("phone").value = quotation.phone || "";
        if (document.getElementById("Address")) document.getElementById("Address").value = quotation.address || "";
        if (document.getElementById("site")) document.getElementById("site").value = quotation.site || "";

        setQuotationStatus("EDIT MODE");

        const tbody = document.querySelector("#itemsTable tbody");
        if (tbody) tbody.innerHTML = "";

        itemCounter = 0;

        if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                addItem();
                const row = tbody.lastElementChild;
                if (row) {
                    const desc = row.querySelector(".description");
                    const det = row.querySelector(".details");

                    desc.innerHTML = item.description || "";
                    det.innerHTML = item.details || "";
                    row.querySelector(".rate").innerText = item.rate || 0;
                    row.querySelector(".area").innerText = item.area || 0;
                    row.querySelector(".amount").value = formatCurrency(item.amount || 0);
                }
            });
        } else {
            addItem();
        }

        calculate();
        await loadCustomerHistory();
        scrollToTop();

        showNotification("Quotation #" + quotation.quotation_no + " Loaded", "info");
    } catch (error) {
        hideLoading();
        console.error("Open Quotation Error:", error);
        showNotification("Unable to open quotation.", "error");
    }
}

/* ===========================================================
   CUSTOMER MANAGEMENT
=========================================================== */

async function loadCustomers() {
    try {
        const container = document.getElementById("customersList");
        if (!container) return;

        if (!window.electronAPI || typeof window.electronAPI.getCustomers !== "function") {
            container.innerHTML = "<p class='empty-message'>No customer records loaded (Demo Mode).</p>";
            return;
        }

        container.innerHTML = "<p>Loading customers...</p>";
        const response = await window.electronAPI.getCustomers();

        if (!response || !response.success) {
            container.innerHTML = "<p class='empty-message'>Failed to load customers.</p>";
            return;
        }

        const customers = response.data || [];
        if (customers.length === 0) {
            container.innerHTML = "<p class='empty-message'>No customers found.</p>";
            return;
        }

        container.innerHTML = "";
        customers.forEach(c => {
            const card = document.createElement("div");
            card.className = "customer-card";

            card.innerHTML = `
                <div class="customer-title"><strong>${c.customer_name}</strong></div>
                <div><b>Phone:</b> ${c.phone || "N/A"}</div>
                <div><b>Designation:</b> ${c.designation || "N/A"}</div>
                <div><b>Quotations:</b> ${c.totalQuotations || 0}</div>
                <div><b>Total Business:</b> ₹ ${formatCurrency(c.totalBusiness || 0)}</div>
                
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="green-btn" style="flex: 1;" onclick="selectCustomer('${c.customer_name.replace(/'/g, "\\'")}')">👤 Select</button>
                    <button class="delete-btn" style="background-color: #dc3545; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;" onclick="deleteCustomer('${c.customer_name.replace(/'/g, "\\'")}')">🗑️</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Load Customers Error:", error);
    }
}

async function deleteCustomer(customerName) {
    if (!confirm(`Are you sure you want to delete customer "${customerName}"?`)) return;

    try {
        showLoading();
        if (window.electronAPI && typeof window.electronAPI.deleteCustomer === "function") {
            const result = await window.electronAPI.deleteCustomer(customerName);
            hideLoading();

            if (result && result.success) {
                showNotification(`Customer "${customerName}" deleted successfully.`, "success");
                await refreshApplication();
            } else {
                showNotification(result?.message || "Failed to delete customer.", "error");
            }
        } else {
            hideLoading();
            showNotification("Deleted Customer (Demo Mode)", "info");
        }
    } catch (error) {
        hideLoading();
        console.error("Delete Customer Error:", error);
        showNotification("Unable to delete customer.", "error");
    }
}

function selectCustomer(name) {
    const nameInput = document.getElementById("customerName");
    if (nameInput) {
        nameInput.value = name;
        loadCustomerHistory();
        showNotification("Customer selected: " + name, "info");
    }
}

async function loadCustomerHistory() {
    try {
        const nameInput = document.getElementById("customerName");
        const customerName = nameInput ? nameInput.value.trim() : "";

        const historyDiv = document.getElementById("customerHistory");
        if (!historyDiv) return;

        if (customerName === "") {
            historyDiv.innerHTML = "<p class='empty-message'>Select or type a customer name to view history.</p>";
            return;
        }

        if (!window.electronAPI || typeof window.electronAPI.getCustomerHistory !== "function") return;

        const response = await window.electronAPI.getCustomerHistory(customerName);
        if (!response || !response.success) {
            historyDiv.innerHTML = "<p class='empty-message'>Failed to fetch history.</p>";
            return;
        }

        const history = response.data || [];
        historyDiv.innerHTML = "";

        if (history.length === 0) {
            historyDiv.innerHTML = "<p class='empty-message'>No previous quotations for " + customerName + ".</p>";
            return;
        }

        history.forEach(item => {
            const row = document.createElement("div");
            row.className = "history-row flex-between mt-10";
            row.innerHTML = `
                <div>
                    <strong>${item.quotation_no}</strong> | ${item.quotation_date}
                    <br>
                    <span class="text-primary">₹ ${formatCurrency(item.total)}</span>
                </div>
                <button class="blue-btn" onclick="openQuotation(${item.id})">Open</button>
            `;
            historyDiv.appendChild(row);
        });
    } catch (error) {
        console.error("Customer History Error:", error);
    }
}

/* ===========================================================
   DASHBOARD METRICS & REFRESH
=========================================================== */

async function loadDashboard() {
    try {
        if (!window.electronAPI || typeof window.electronAPI.getDashboardData !== "function") return;

        const response = await window.electronAPI.getDashboardData();
        if (!response || !response.success || !response.data) return;

        const data = response.data;
        const qElem = document.getElementById("totalQuotations");
        const rElem = document.getElementById("totalRevenue");

        if (qElem) qElem.innerText = data.totalQuotations || 0;
        if (rElem) rElem.innerText = formatCurrency(data.totalRevenue || 0);
    } catch (error) {
        console.error("Dashboard Load Error:", error);
    }
}

async function refreshApplication() {
    await Promise.all([
        loadDashboard(),
        loadCustomers(),
        loadQuotations()
    ]);
}

/* ===========================================================
   DOWNLOAD PDF & PRINT
=========================================================== */

function downloadPDF() {
    const element = document.getElementById('invoice');
    
    document.body.classList.add('is-printing');

    const opt = {
        margin: [0, 0, 0, 0],
        filename: 'Quotation_Olive.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            scrollY: 0
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        document.body.classList.remove('is-printing');
    });
}

function printQuotation() {
    window.print();
}

/* ===========================================================
   UI NOTIFICATIONS & LOADERS
=========================================================== */

function showNotification(message, type = "success") {
    const old = document.querySelector(".notification");
    if (old) old.remove();

    const notification = document.createElement("div");
    notification.className = "notification " + type;
    notification.innerText = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 50);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showLoading() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "flex";
}

function hideLoading() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) loader.style.display = "none";
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===========================================================
   EXPORTS & KEYBINDINGS
=========================================================== */

window.addItem = addItem;
window.removeItem = removeItem;
window.calculate = calculate;
window.saveQuotation = saveQuotation;
window.updateQuotation = updateQuotation;
window.saveOrUpdateQuotation = saveOrUpdateQuotation;
window.newQuotation = newQuotation;
window.deleteQuotation = deleteQuotation;
window.loadQuotations = loadQuotations;
window.openQuotation = openQuotation;
window.searchQuotations = searchQuotations;
window.loadCustomers = loadCustomers;
window.selectCustomer = selectCustomer;
window.deleteCustomer = deleteCustomer;
window.loadCustomerHistory = loadCustomerHistory;
window.loadDashboard = loadDashboard;
window.refreshApplication = refreshApplication;
window.downloadPDF = downloadPDF;
window.printQuotation = printQuotation;

document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveOrUpdateQuotation();
    }
    if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newQuotation();
    }
    if (event.ctrlKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        printQuotation();
    }
});