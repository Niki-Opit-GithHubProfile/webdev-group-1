# Implementation Logic

# addTransaction.ejs form logic

1. **Type of Operation:**
    - **Dropdown** with options:
        - "Buy" (Buy)
        - "Sell" (Sell)
2. **Trading Pair:**
    - **Dropdown** with a list of predefined pairs (e.g., BTC/USDT, BTC/ETH, ETH/USDT, etc.).
    - The trading pair clearly indicates which assets are involved:
        - **Asset Base:** the one being bought (if buying trade) or sold (if selling trade).
        - **Quotation Currency:** the one in which the unit price is expressed.
    - **Example:**
        - If you choose BTC/USDT: the transaction involves the purchase or sale of BTC, and the price is in USDT.
        - If you choose BTC/ETH: the transaction is about converting BTC to ETH (or vice versa).
3. **Quantity:**
    - Numeric field in which the user enters the quantity of the base asset.
    - **Example:**
        - For BTC/USDT, if you buy 0.05 BTC, enter "0.05."
        - For BTC/ETH, if you sell 0.1 BTC, enter "0.1."
4. **Unit Price:**
    - Numeric field to enter the price per unit, expressed in the quotation currency of the trading pair.
    - **Example:**
        - For BTC/USDT, if the price is USDT 40,000 for 1 BTC, enter "40000."
        - For BTC/ETH, if you are selling BTC at 15 ETH for 1 BTC, enter "15."
5. **Commissions:**
    - Numeric field to record the commissions paid for the transaction.
    - Must support decimal values.
    - **Example:**
        - If you pay USDT 10 in commissions, enter "10."
        - If in a BTC/ETH transaction the commission is in ETH, enter the value in ETH.
6. **Date:**
    - Date picker to select the date (and possibly time) when the transaction occurred.

---

## Practical Examples.

### Example 1: Purchase of Bitcoin with USDT.

- **Transaction Type:** Purchase
- **Trading Pair:** BTC/USDT
- **Quantity:** 0.05 (BTC)
- **Unit Price:** 40000 (USDT for 1 BTC)
- **Commissions:** 10 (USDT)
- **Date:** 15/03/2024

The system will calculate the total invested as follows:

Total = (0.05 × 40000) + 10 = 2000 + 10 = 2010 USDT

### Example 2: Selling Bitcoin to get Ethereum

- **Transaction Type:** Sale
- **Trading Pair:** BTC/ETH
- **Quantity:** 0.1 (BTC)
- **Unit Price:** 15 (ETH for 1 BTC)
- **Commissions:** 0.05 (ETH) - (depending on the currency in which the commissions are paid)
- **Date:** 16/03/2024

The system will calculate the total received in ETH like this:

Total = (0.1 x 15) - 0.05 = 1.5 - 0.05 = 1.45 ETH

---

## Special Cases to Consider

- **Validation of Funds:**
    
    If the user enters a sale without having the corresponding balance (calculated from the initial balance, deposits, and previous transactions), the system should show a warning or prevent entry until an appropriate deposit is entered.
    
- **Management of Non-Predefined Trading Pairs:**
    
    If the user wants to enter a trading pair that is not on the list, provide an option to manually add the pair, but be sure to validate it (e.g., by checking if it exists through an API or a list of recognized pairs).
    
- **Data Consistency:**
    
    Ensure that the system uses the data entered (initial balance, transactions, deposits, and withdrawals) to correctly update the portfolio and calculate the PnL accurately.
    

---

This structure ensures that the necessary data is collected for each transaction and that the system can correctly interpret whether it is a buy or a sell, as well as the trading pair involved. This way the "Add Transaction" will have all the details to perform the calculations and update the portfolio consistently.

# Withdrawals & Deposits Functionality

## Add Deposit

**Required inputs:**

1. **Asset:**
    - A dropdown or text field that allows the user to select or enter the asset (e.g., BTC, USDT, ETH, etc.).
2. **Amount:**
    - A numeric field to enter the amount deposited.
    - Must support decimal values.
3. **Date:**
    - Date picker to indicate the date (and time, if necessary) the deposit was made.
4. **Commissions (optional):**
    - Numeric field for any fees charged during the deposit, if relevant.
5. **Notes (optional):**
    - A text field for any additional comments or details.

**Practical example:**

- **Asset:** USDT
- **Amount:** 500
- **Date:** 03/15/2024
- **Commissions:** 0 (if not applicable)
- **Notes:** "Deposit from Binance exchange"

---

## Add Withdrawal

**Required inputs:**

1. **Asset:**
    - Dropdown or text field to select the asset withdrawn.
2. **Amount:**
    - Numeric field to enter the amount withdrawn.
    - Must support decimal values.
3. **Date:**
    - Date picker to indicate the date (and time) of the withdrawal.
4. **Commissions (optional):**
    - Numeric field for any fees applied to the withdrawal.
5. **Notes (optional):**
    - Text field for additional comments or details about the transaction.

**Practical example:**

- **Asset:** USDT
- **Amount:** 300
- **Date:** 16/03/2024
- **Fees:** 1 (if applicable)
- **Notes:** "Withdrawal to bank account"

---

## Common Considerations for Deposits and Withdrawals.

- **Data Validation:**
    
    Ensure that the amount entered is a positive number and that the date is not future.
    
- **Portfolio Update:**
    
    The system should automatically update asset balances based on recorded deposits and withdrawals. This data, along with buy and sell transactions, will be used to calculate the PnL and update the portfolio.
    
- **Confirmation/Error Messages:**
    
    Display messages confirming that the deposit or withdrawal has been registered, or error messages if any mandatory data is missing or if there is inconsistency (e.g., if the withdrawal exceeds the available balance).
    

---

# First Login User Path

After the user registers and verifies the email, when the user first logs in, instead of the dashboard he or she is directed to a form that through questions collects the user's initial data to allow use of the platform.

First of all, it is necessary to ask if the user has previously made trades or if he intends to start investing subsequent to accessing our platform.

If he is his first experience, we immediately direct him to the dashboard, otherwise we need to get for proper setup of the dashboard and initial values the list of all assets owned (the relevant data are the name of the asset (which he selects from the dropdown list) and the amount of that asset). Thus the user has a portfolio and initial assets that he can use in his trades.

# Portfolio & PnL

## 1. Definition of the Overall PnL

Overall Profit and Loss (PnL) represents the net gain or loss of the entire portfolio over time.

**General formula:**

Overall PnL = Current Portfolio Value - Total Acquisition Cost.

Where:

- Current Portfolio Value = ∑(Quantity owned of each asset x Current price of that asset)
- Total Acquisition Cost is the sum of the Total Cost incurred to acquire all assets held.

---

## 2. Calculation of PnL per Single Asset.

PnL per single asset measures the gain or loss related to a specific asset.

**Formula:**

PnL_asset = (Current Price - Average Price) * Quantity

Where:

- Current Price is the current market price of the asset.
- Average Price is the calculated dividing the Total Acquisition Cost to acquire that asset by the Quantity Acquired
- Quantity is the current quantity of that asset possessed by the user.

---

## 3. Calculation of PnL for Single Transaction.

The PnL for a single transaction is calculated by considering both the asset purchased and the asset sold.

**General formula:**

PnL_transaction = PnL_asset_bought - PnL_asset_sold

Where:

- PnL_asset_bought = (Current Price - Total Cost) * Quantity
- PnL_asset_sold = (Q × P_Sold) - (Q × Current Price)

Where:

- Quantity is the quantity of the asset bought or sold.
- Current Price is the current market price of the asset.
- Total Cost is the total amount spent to acquire the purchased asset (Price + Commissions)
- P_sold is the price of that asset in the moment the transaction actually happened