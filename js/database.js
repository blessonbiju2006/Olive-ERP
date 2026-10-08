const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

function getDatabasePath() {
    let userDataDir;

    // 1. Try Electron app module (Main process)
    try {
        const { app } = require("electron");
        if (app && app.getPath) {
            userDataDir = app.getPath("userData");
        }
    } catch (e) {
        // Main app object unavailable
    }

    // 2. Try Electron remote (Renderer process fallback)
    if (!userDataDir) {
        try {
            const { remote } = require("electron");
            if (remote && remote.app) {
                userDataDir = remote.app.getPath("userData");
            }
        } catch (e) {
            // Remote module unavailable
        }
    }

    // 3. Fallback to Windows APPDATA directory
    if (!userDataDir && process.env.APPDATA) {
        const gstPath = path.join(process.env.APPDATA, "gst-billing-app");
        if (fs.existsSync(gstPath)) {
            userDataDir = gstPath;
        } else {
            userDataDir = path.join(process.env.APPDATA, "Olive Quotations & Billing");
        }
    }

    // 4. Development local fallback
    if (!userDataDir) {
        userDataDir = path.join(__dirname, "../database");
    }

    // Ensure target AppData directory exists
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    const targetDbPath = path.join(userDataDir, "olive_billing.db");

    // Auto-migration check: If target DB does not exist, copy from project folder
    if (!fs.existsSync(targetDbPath)) {
        const localDbSource = path.join(__dirname, "../database/olive.db");
        const altLocalSource = path.join(__dirname, "../database/olive_billing.db");

        if (fs.existsSync(localDbSource)) {
            console.log("Migrating local database from olive.db to AppData...");
            fs.copyFileSync(localDbSource, targetDbPath);
        } else if (fs.existsSync(altLocalSource)) {
            console.log("Migrating local database from olive_billing.db to AppData...");
            fs.copyFileSync(altLocalSource, targetDbPath);
        }
    }

    return targetDbPath;
}

// Target database location
const dbPath = getDatabasePath();

console.log("Connecting SQLite Database at:", dbPath);

// Open or create the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to Olive database successfully at:", dbPath);
    }
});

// Initialize Schema & Enable Foreign Keys
db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");

    // Create quotations table
    db.run(`
        CREATE TABLE IF NOT EXISTS quotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quotation_no TEXT,
            customer_name TEXT,
            designation TEXT,
            phone TEXT,
            site TEXT,
            total REAL,
            quotation_date TEXT,
            pdf_path TEXT
        )
    `);

    // Create customers table
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT UNIQUE,
            designation TEXT,
            phone TEXT
        )
    `);

    // Create quotation items table
    db.run(`
        CREATE TABLE IF NOT EXISTS quotation_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quotation_id INTEGER NOT NULL,
            description TEXT,
            details TEXT,
            rate REAL,
            area REAL,
            amount REAL,
            FOREIGN KEY (quotation_id)
            REFERENCES quotations(id) ON DELETE CASCADE
        )
    `);

    // Create vouchers table
    db.run(`
        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            ref_no TEXT,
            bill_no TEXT,
            voucher_date TEXT,
            party_name TEXT,
            site TEXT,
            mobile TEXT,
            total REAL,
            items_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

/* ===========================================================
   QUOTATION FUNCTIONS
=========================================================== */
function saveQuotation(quotationData, callback) {
    db.serialize(() => {
        const sql = `
            INSERT INTO quotations
            (quotation_no, customer_name, designation, phone, site, total, quotation_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
            sql,
            [
                quotationData.quotationNo,
                quotationData.customerName,
                quotationData.designation,
                quotationData.phone,
                quotationData.site,
                quotationData.total,
                quotationData.date
            ],
            function (err) {
                if (err) {
                    console.error("Quotation insert error:", err.message);
                    callback(false, err.message);
                    return;
                }

                const quotationId = this.lastID;

                // Save or update customer
                db.run(
                    `INSERT OR IGNORE INTO customers (customer_name, designation, phone) VALUES (?, ?, ?)`,
                    [quotationData.customerName, quotationData.designation, quotationData.phone]
                );

                db.run(
                    `UPDATE customers SET designation = ?, phone = ? WHERE customer_name = ?`,
                    [quotationData.designation, quotationData.phone, quotationData.customerName]
                );

                // Insert Items
                const itemSql = `
                    INSERT INTO quotation_items (quotation_id, description, details, rate, area, amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const stmt = db.prepare(itemSql);

                if (Array.isArray(quotationData.items)) {
                    quotationData.items.forEach(item => {
                        stmt.run([
                            quotationId,
                            item.description,
                            item.details,
                            item.rate,
                            item.area,
                            item.amount
                        ]);
                    });
                }

                stmt.finalize();
                callback(true, quotationId);
            }
        );
    });
}

function getQuotations(callback) {
    const sql = `SELECT * FROM quotations ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Fetch error:", err.message);
            callback(false, []);
            return;
        }
        callback(true, rows);
    });
}

function getLastQuotationId(callback) {
    const sql = `SELECT id FROM quotations ORDER BY id DESC LIMIT 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error(err);
            callback(false, 0);
            return;
        }
        callback(true, row ? row.id : 0);
    });
}

function getQuotationById(id, callback) {
    const sql1 = `SELECT * FROM quotations WHERE id = ?`;
    const sql2 = `SELECT * FROM quotation_items WHERE quotation_id = ?`;

    db.get(sql1, [id], (err, quotation) => {
        if (err || !quotation) {
            console.error(err);
            callback(false, null);
            return;
        }

        db.all(sql2, [id], (err2, items) => {
            if (err2) {
                console.error(err2);
                callback(false, null);
                return;
            }

            callback(true, { quotation, items });
        });
    });
}

function updateQuotation(id, quotationData, callback) {
    db.serialize(() => {
        db.run(
            `UPDATE quotations SET customer_name = ?, designation = ?, phone = ?, site = ?, total = ? WHERE id = ?`,
            [
                quotationData.customerName,
                quotationData.designation,
                quotationData.phone,
                quotationData.site,
                quotationData.total,
                id
            ],
            function (err) {
                if (err) {
                    console.error("Update error:", err.message);
                    callback(false, err.message);
                    return;
                }

                db.run(`DELETE FROM quotation_items WHERE quotation_id = ?`, [id], (err2) => {
                    if (err2) {
                        console.error(err2);
                        callback(false, err2.message);
                        return;
                    }

                    const stmt = db.prepare(`
                        INSERT INTO quotation_items (quotation_id, description, details, rate, area, amount)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);

                    if (Array.isArray(quotationData.items)) {
                        quotationData.items.forEach(item => {
                            stmt.run([id, item.description, item.details, item.rate, item.area, item.amount]);
                        });
                    }

                    stmt.finalize();
                    callback(true);
                });
            }
        );
    });
}

function deleteQuotation(id, callback) {
    db.serialize(() => {
        db.run("DELETE FROM quotation_items WHERE quotation_id = ?", [id], function (err) {
            if (err) {
                console.error("Error deleting quotation items:", err.message);
                callback(false, err.message);
                return;
            }

            db.run("DELETE FROM quotations WHERE id = ?", [id], function (err) {
                if (err) {
                    console.error("Error deleting quotation:", err.message);
                    callback(false, err.message);
                    return;
                }

                console.log(`Quotation ID ${id} deleted successfully.`);
                callback(true);
            });
        });
    });
}

function getDashboardData(callback) {
    const sql = `
        SELECT
            COUNT(*) AS totalQuotations,
            IFNULL(SUM(total), 0) AS totalRevenue
        FROM quotations
    `;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error(err);
            callback(false, null);
            return;
        }
        callback(true, row);
    });
}

function searchQuotations(searchText, callback) {
    const sql = `
        SELECT * FROM quotations
        WHERE quotation_no LIKE ? OR customer_name LIKE ? OR phone LIKE ?
        ORDER BY id DESC
    `;
    const keyword = `%${searchText}%`;
    db.all(sql, [keyword, keyword, keyword], (err, rows) => {
        if (err) {
            console.error(err);
            callback(false, []);
            return;
        }
        callback(true, rows);
    });
}

/* ===========================================================
   CUSTOMER FUNCTIONS
=========================================================== */
function getCustomerHistory(customerName, callback) {
    const sql = `SELECT id, quotation_no, quotation_date, total FROM quotations WHERE customer_name = ? ORDER BY id DESC`;
    db.all(sql, [customerName], (err, rows) => {
        if (err) {
            console.error(err);
            callback(false, []);
            return;
        }
        callback(true, rows);
    });
}

function getCustomers(callback) {
    const sql = `
        SELECT
            c.id,
            c.customer_name,
            c.designation,
            c.phone,
            COUNT(q.id) AS totalQuotations,
            IFNULL(SUM(q.total), 0) AS totalBusiness
        FROM customers c
        LEFT JOIN quotations q ON c.customer_name = q.customer_name
        GROUP BY c.id
        ORDER BY c.customer_name ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            callback(false, []);
            return;
        }
        callback(true, rows);
    });
}

function deleteCustomer(customerName, callback) {
    const sql = `DELETE FROM customers WHERE customer_name = ?`;
    db.run(sql, [customerName], function (err) {
        if (err) {
            console.error("Error deleting customer:", err.message);
            callback(false, err.message);
            return;
        }
        console.log(`Customer "${customerName}" deleted successfully.`);
        callback(true);
    });
}

/* ===========================================================
   PAYMENT VOUCHER FUNCTIONS
=========================================================== */
function saveVoucher(data, callback) {
    const { voucherNo, refNo, billNo, date, partyName, site, mobile, total, items } = data;
    const itemsJson = JSON.stringify(items || []);

    const query = `
        INSERT INTO vouchers (voucher_no, ref_no, bill_no, voucher_date, party_name, site, mobile, total, items_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(voucher_no) DO UPDATE SET
            ref_no=excluded.ref_no,
            bill_no=excluded.bill_no,
            voucher_date=excluded.voucher_date,
            party_name=excluded.party_name,
            site=excluded.site,
            mobile=excluded.mobile,
            total=excluded.total,
            items_json=excluded.items_json;
    `;

    db.run(query, [voucherNo, refNo, billNo, date, partyName, site, mobile, total, itemsJson], function (err) {
        if (err) {
            console.error("Voucher insert error:", err.message);
            callback(false, err.message);
        } else {
            console.log("Voucher saved with ID:", this.lastID);
            callback(true, this.lastID);
        }
    });
}

function getVouchers(callback) {
    const sql = `SELECT * FROM vouchers ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Voucher fetch error:", err.message);
            callback(false, []);
            return;
        }
        callback(true, rows);
    });
}

module.exports = {
    db,
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
};