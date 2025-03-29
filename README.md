**\# CoinRates \- Project Documentation**

# Project Overview

CoinRates is a cryptocurrency transaction management tool designed for beginners and casual traders who find traditional exchanges too complex. Unlike platforms like Binance, CoinRates focuses on tracking and organizing assets without enabling direct trading.

## Key Features:

* Organize investments across different wallets and exchanges  
* Record and review transactions with a clear purchase/sale history  
* Analyze performance with intuitive visualizations

CoinRates simplifies cryptocurrency tracking, allowing users to focus on strategy rather than managing scattered data across multiple platforms.

---

## Implementation Status

| Component | Status | Notes |
| :---- | ----- | ----- |
| **Backend API** | ✅ Completed | Express.js routes and controllers implemented |
| **CoinGecko API Integration** | 🔄 In Progress | Basic structure implemented, needs testing |
| **Frontend Templates** | ✅ Completed | Home page and dashboard designs ready |
| **User Authentication** | 🔄 In Progress | Registration, login, and session management setup, need social auth, auto-login and refinement |
| **Database Schema** | ✅ Completed | Models defined |
| **Transaction Management** | 🔄 In Progress | Controller structure almost completed |
| **Conversion Tool** | ⏳ Planned | UI design completed, functionality pending |
| **Asset Detail View** | ⏳ Planned | Scheduled for next phase |

---

## **Technical Stack**

### **Backend**

* **Runtime:** Node.js  
* **Framework:** Express.js  
* **Database:** PostgreSQL  
* **ORM:** Prisma 
* **Authentication:** Session-based, bcryptjs for password hashing  
* **Cache:** Node-cache for optimizing API responses

### **Frontend**

* **CSS Framework:** Tailwind CSS  
* **Data Visualization:** Chart.js  
* **Icons:** Lucide Icons  
* **JavaScript:** Vanilla JS (planned refactor to organized modules)

---

# **Backend Implementation**

## **Completed Components**

## **Database Schema**

We have designed the Prisma schema with the following models:

* **User:** Account management and authentication  
* **Asset:** Cryptocurrency and fiat currency definitions  
* **TradingPair:** Available trading pairs (BTC/USD, ETH/BTC, etc.)  
* **Transaction:** User buy/sell activities
* **Portfolio/PortfolioHolding:** Cryptocurrency holding tracking

---
## Authentication System
- Registration endpoints
- Email verification
- Login/logout functionality
- Session management setup
- Password hashing implementation

---

## **Planned Components**

### **Asset & Transaction Management**
* Conclude transaction implementation 
* Calculating total asset & portfolio value
* Graph views

---

# **Frontend Implementation**

## **Technologies Used**

* **Tailwind CSS** for styling  
* **Chart.js** for visualizing cryptocurrency trends  
* **Lucide Icons** for iconography

### Homepage:

* **Presentation and Access to Features:**

* The home page features a minimal design with images and brief descriptions of the key functionalities.

* **Main Navigation (Navbar):**

* **My Dashboard:** If the user is already authenticated, clicking on “My Dashboard” will take them directly to their portfolio. Otherwise, they will be prompted to log in or sign up.

* **Quick Convert (Not yet operational):** Present in the navbar, but currently non-functional.

* **Account:**

  * Contains options for Sign In or Sign Up.

  * If the user is authenticated, they can access My Profile (to modify personal details, email, and password) and Log Out.

* **Sign In or Sign Up:**

  * Sign Up (Registration): The user enters the required information (Full Name, Email, and Password) to create a new account.

  * Sign In (Login): The user enters their credentials to access their personal dashboard.

### **Dashboard Overview**

#### **Key Components**

* **Navigation Bar** (Branding, links to Dashboard & Quick Convert, user profile dropdown)  
* **Left Sidebar** (Real-time cryptocurrency prices via CoinGecko API)  
* **Main Content** (Asset & transaction overview, historical price chart, conversion tool)  
* **Right Sidebar** (Recent transaction history)

#### **Head Section**

The `<head>` includes:

* Metadata (`charset`, `viewport`)  
* External stylesheets and scripts:  
  * Tailwind CSS (`https://cdn.tailwindcss.com`)  
  * Chart.js for graphs (`https://cdn.jsdelivr.net/npm/chart.js`)  
  * Lucide Icons (`https://unpkg.com/lucide@latest`)

#### **Navigation Bar (`<nav>`)**

* Contains branding (`CoinRates` logo)  
* Navigation links for "Dashboard" and "Quick Convert"  
* User account section with a profile picture and dropdown menu  
* Mobile navigation menu (hidden by default, toggled via JavaScript)

#### **Left Sidebar**

* Displays cryptocurrency prices (BTC, ETH, XRP, SOL)  
* Updates prices dynamically using **CoinGecko API**

### **Main Content Section**

#### **Portfolio Overview**

* Displays **Total Portfolio Value** in different cryptocurrencies  
* Allows users to switch between currencies (USD, BTC, ETH, etc.) using a `<select>` dropdown  
* Uses **Pie Chart** to represent portfolio distribution

#### **Price Chart Section**

* **Line Chart** displays historical BTC price trends  
* Timeframe selection buttons (`1D`, `1W`, `1M`, etc.) update the chart dynamically  
* Fetches market chart data from CoinGecko API

#### **Right Sidebar (Transaction History)**

* Displays recent transactions in a **table format**  
* Transactions are dynamically inserted via JavaScript

### **JavaScript Functionality**

#### **1\. Fetching Real-Time Crypto Prices**

* fetchCryptoPrices() fetches BTC, ETH, XRP, and SOL prices using CoinGecko API.  
* Updates values every **5 seconds** using setInterval(fetchCryptoPrices, 5000);

#### **2\. Updating the Price Chart**

* updateChart(timeframe) fetches historical BTC price data based on user-selected timeframes.  
* Updates the **line chart** dynamically.

#### **3\. Handling Portfolio Value Conversion**

* document.getElementById('crypto-selector').addEventListener('change', async function () { ... })  
* Converts total portfolio value into selected cryptocurrency using CoinGecko API.

#### **4\. Populating Transaction History**

* populateTransactions() dynamically inserts transaction records into the table.  
* Example transactions are pre-loaded in JavaScript.

#### **5\. Navigation & UI Interactions**

* lucide.createIcons(); initializes Lucide icons.  
* Mobile menu toggle and account dropdown logic.  
* document.getElementById("addTransactionBtn").addEventListener("click", function () { window.location.href \= "/transactions/add"; });

#### **API Endpoints Used**

* **Real-Time Prices:** https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana\&vs\_currencies=usd  
* **Historical Prices:** https://api.coingecko.com/api/v3/coins/bitcoin/market\_chart?vs\_currency=usd\&days=\<timeframe\>  
* **Conversion Rates:** https://api.coingecko.com/api/v3/simple/price?ids=\<crypto\>\&vs\_currencies=usd

---

## **Implementation Timeline**

### **Completed**

* Project structure and architecture design  
* Frontend templates for home page and dashboard  
* Basic routes, controllers, database schema

### **In Progress (Next 7 Days)**

* CoinGecko API integration and configuration  
* Social Authentication  
* Transaction management functionality
* Graph views

### **Final Phase (Before Submission)**

* Asset analysis and visualization  
* Conversion tool functionality  
* Performance optimizations  
* Security enhancements  
* Comprehensive testing

---

## **Final Notes**

* CoinGecko API rate limits need proper handling  
* Error handling and validation will be improved  
* Placeholder transaction data will be replaced with real database records
* Tailwind need to be switched from CDN to npm for better performance
