# Olive ERP - Custom Interior Quotation & Payment Voucher Suite

**Olive ERP** is an offline-first desktop management suite built using Electron, Node.js, and SQLite. It simplifies quotation creation, customer tracking, payment voucher generation, and printing for interior design and turnkey solution providers.

## Key Features
- **Offline-First SQLite Persistence:** All database records reside locally on the host machine.
- **Secure Process Isolation:** Renderer UI and Node Main processes communicate via context-isolated IPC channels.
- **Dual-Panel Payment Voucher Sync:** Live editing and rendering for voucher creation.
- **Media-Optimized Printing:** Built-in `@media print` CSS rules for clean A4 printing without web toolbars.
- **Frameless Splash Screen:** Custom CSS keyframe shimmer animations on startup.

## Tech Stack
- **Desktop Framework:** Electron
- **Runtime Environment:** Node.js
- **Database Engine:** SQLite
- **UI & Layout:** HTML5, CSS3, JavaScript (ES6+)

## Quick Start (Development)

1. Clone the repository:
   ```bash
   git clone [https://github.com/](https://github.com/)<your-username>/olive-erp.git