const {
    saveQuotation,
    getQuotations,
    getLastQuotationId,
    getQuotationById,
    updateQuotation,
    deleteQuotation,
    getDashboardData,
    searchQuotations,
    getCustomerHistory,
    getCustomers,
    deleteCustomer,
    saveVoucher,
    getVouchers
} = require("./js/database");

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let splashWindow;
let mainWindow;

function createWindows() {
    // 1. Create Frameless Splash Screen Window (500x500 Transparent)
    splashWindow = new BrowserWindow({
        width: 500,
        height: 500,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile("assets/splash.html");

    // 2. Create Main Application Window (Hidden initially)
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Keep hidden while splash plays
        icon: path.join(__dirname, "assets", "icons", "icon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile("index-v4.html");

    // 3. Switch to Main Window when splash animation completes (~2.8s)
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    }, 2800);
}

app.whenReady().then(() => {
    // Create folder for storing app documents if it doesn't exist
    const documentsPath = path.join(
        os.homedir(),
        "Documents",
        "Olive Quotations"
    );

    if (!fs.existsSync(documentsPath)) {
        fs.mkdirSync(documentsPath, { recursive: true });
        console.log("Created folder:", documentsPath);
    }

    createWindows();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// TEST CONNECTION HANDLER
ipcMain.on("test-connection", () => {
    console.log("✅ Renderer successfully communicated with Main Process!");
});

// ==========================================
// QUOTATION IPC HANDLERS
// ==========================================

ipcMain.handle("save-quotation", async (event, quotationData) => {
    return new Promise((resolve) => {
        saveQuotation(quotationData, (success, quotationId) => {
            if (success) {
                console.log("=================================");
                console.log("Quotation Saved Successfully");
                console.log("Quotation ID:", quotationId);
                console.log("=================================");
                resolve({ success: true, quotationId });
            } else {
                resolve({ success: false });
            }
        });
    });
});

ipcMain.handle("get-quotations", async () => {
    return new Promise((resolve) => {
        getQuotations((success, rows) => {
            resolve({ success, data: rows || [] });
        });
    });
});

ipcMain.handle("get-last-quotation-id", async () => {
    return new Promise((resolve) => {
        getLastQuotationId((success, lastId) => {
            resolve({ success, lastId });
        });
    });
});

ipcMain.handle("get-quotation-by-id", async (event, id) => {
    return new Promise((resolve) => {
        getQuotationById(id, (success, data) => {
            resolve({ success, data });
        });
    });
});

ipcMain.handle("update-quotation", async (event, id, data) => {
    return new Promise((resolve) => {
        updateQuotation(id, data, (success) => {
            resolve({ success });
        });
    });
});

ipcMain.handle("delete-quotation", async (event, id) => {
    return new Promise((resolve) => {
        deleteQuotation(id, (success, err) => {
            resolve({ success, status: success ? "ok" : "error", error: err });
        });
    });
});

ipcMain.handle("search-quotations", async (event, searchText) => {
    return new Promise((resolve) => {
        searchQuotations(searchText, (success, rows) => {
            resolve({ success, data: rows || [] });
        });
    });
});

// ==========================================
// CUSTOMER & DASHBOARD IPC HANDLERS
// ==========================================

ipcMain.handle("get-dashboard-data", async () => {
    return new Promise((resolve) => {
        getDashboardData((success, data) => {
            resolve({ success, data });
        });
    });
});

ipcMain.handle("get-customer-history", async (event, customerName) => {
    return new Promise((resolve) => {
        getCustomerHistory(customerName, (success, rows) => {
            resolve({ success, data: rows || [] });
        });
    });
});

ipcMain.handle("get-customers", async () => {
    return new Promise((resolve) => {
        getCustomers((success, rows) => {
            resolve({ success, data: rows || [] });
        });
    });
});

ipcMain.handle("delete-customer", async (event, customerName) => {
    return new Promise((resolve) => {
        if (typeof deleteCustomer === "function") {
            deleteCustomer(customerName, (success) => {
                resolve({ success, status: success ? "ok" : "error" });
            });
        } else {
            resolve({
                success: false,
                message: "deleteCustomer function not found in database.js"
            });
        }
    });
});

// ==========================================
// PAYMENT VOUCHER IPC HANDLERS
// ==========================================

ipcMain.handle("save-voucher", async (event, voucherData) => {
    return new Promise((resolve) => {
        saveVoucher(voucherData, (success, result) => {
            if (success) {
                resolve({ success: true, id: result });
            } else {
                resolve({ success: false, error: result });
            }
        });
    });
});

ipcMain.handle("get-vouchers", async () => {
    return new Promise((resolve) => {
        getVouchers((success, rows) => {
            resolve({ success, data: rows || [] });
        });
    });
});