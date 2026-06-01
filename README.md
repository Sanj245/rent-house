# 🏠 RentArc - Landlord Rent & Property Manager

RentArc is a premium, lightweight, responsive Progressive Web Application (PWA) and Capacitor-hybrid platform designed for landlords to easily manage properties, tenant agreements, payment ledgers, tenancy histories, and automated notifications.

🌐 **Live Deployed Site:** [https://logrent.netlify.app/](https://logrent.netlify.app/)

---

## 🌟 Key Features

*   **🏠 Property Management:** Register rental homes, track address, room counts, bank accounts, and appliance condition checklists (Kitchen Chimneys, ACs, Geysers).
*   **👥 Tenant Agreement Manager:** Setup tenant agreements with security deposits, move-in dates, phone numbers, and automatic rent raise schedules.
*   **💰 Rent Ledger:** Monitor monthly rent statuses (Paid, Unpaid, Partial payments), select payment methods (UPI, Cash, Bank Transfer), and record transactions.
*   **🚨 Automated System Notification Engine:** Uses native browser service workers and mobile local notification trays to alert landlords of:
    *   **5-Day / 10-Day Overdue Payments:** Automatic checks against due dates.
    *   **Rent Raise Applications:** Triggers instant raise updates when the scheduled date passes.
*   **📊 Tenancy History Logs:** Retain full logs of past tenants, security deposits collected, deductions applied, and vacate reasons.
*   **📱 Fully Portable Hybrid Platform:**
    *   **PWA Mode:** Responsive mobile views, offline capabilities, and home-screen installable notifications tray.
    *   **Capacitor Native Integration:** Standard configuration structures ready for building Android and iOS hybrid apps.

---

## 🛠️ Tech Stack & Configurations

*   **Frontend Core:** React 19, Vite, Vanilla CSS.
*   **Icons:** Lucide React.
*   **Database Sync:** Google Firebase / Cloud Firestore (real-time live database subscription).
*   **Mobile Framework:** Capacitor v8.
*   **PWA Support:** Service Worker with custom Network-First HTML caching.

---

## ⚙️ How to Build and Run Locally

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Sanj245/rent-house.git
    cd rent-house
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

4.  **Production Compilation:**
    Build the project with optimized code splitting using:
    ```bash
    npm run build
    ```

---

## 🔗 Live Site & Deployment
This application is automatically built and deployed to Netlify:
👉 **[RentArc Live Production App](https://logrent.netlify.app/)**
