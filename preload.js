const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    // -------------------------------------------------------------
    // SYSTEM & TEST HANDLERS
    // -------------------------------------------------------------
    testConnection: () => ipcRenderer.send("test-connection"),

    // -------------------------------------------------------------
    // QUOTATION IPC HANDLERS
    // -------------------------------------------------------------
    saveQuotation: (data) =>
        ipcRenderer.invoke("save-quotation", data),

    getQuotations: () =>
        ipcRenderer.invoke("get-quotations"),

    // Alias for getQuotations to support singular call fallbacks
    getQuotation: () =>
        ipcRenderer.invoke("get-quotations"),

    getLastQuotationId: () =>
        ipcRenderer.invoke("get-last-quotation-id"),

    getQuotationById: (id) =>
        ipcRenderer.invoke("get-quotation-by-id", id),

    updateQuotation: (id, data) =>
        ipcRenderer.invoke("update-quotation", id, data),

    deleteQuotation: (id) =>
        ipcRenderer.invoke("delete-quotation", id),

    searchQuotations: (searchText) =>
        ipcRenderer.invoke("search-quotations", searchText),

    // -------------------------------------------------------------
    // DASHBOARD & CUSTOMER IPC HANDLERS
    // -------------------------------------------------------------
    getDashboardData: () =>
        ipcRenderer.invoke("get-dashboard-data"),

    getCustomerHistory: (customerName) =>
        ipcRenderer.invoke("get-customer-history", customerName),

    getCustomers: () =>
        ipcRenderer.invoke("get-customers"),

    deleteCustomer: (customerName) =>
        ipcRenderer.invoke("delete-customer", customerName),

    // -------------------------------------------------------------
    // PAYMENT VOUCHER IPC HANDLERS
    // -------------------------------------------------------------
    saveVoucher: (data) =>
        ipcRenderer.invoke("save-voucher", data),

    getVouchers: () =>
        ipcRenderer.invoke("get-vouchers"),

    // Alias for getVouchers to support singular call fallbacks
    getVoucher: () =>
        ipcRenderer.invoke("get-vouchers"),

    getVoucherById: (id) =>
        ipcRenderer.invoke("get-voucher-by-id", id),

    updateVoucher: (id, data) =>
        ipcRenderer.invoke("update-voucher", id, data),

    deleteVoucher: (id) =>
        ipcRenderer.invoke("delete-voucher", id),

    searchVouchers: (searchText) =>
        ipcRenderer.invoke("search-vouchers", searchText)

});