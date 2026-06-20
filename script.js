const defaultData = {
    isPremium: false, 
    accounts: {
        wallet: { balance: 5000, monthlyBudget: 10000 },
        bank: { balance: 12000, monthlyBudget: 20000 }
    },
    transactions: []
};

let userData;

// Load Data
try {
    const saved = localStorage.getItem('toniPaidData');
    userData = saved ? JSON.parse(saved) : defaultData;
    if (!userData.accounts || !userData.accounts.wallet) userData = defaultData;
} catch (e) {
    userData = defaultData;
}

function saveData() {
    localStorage.setItem('toniPaidData', JSON.stringify(userData));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

window.togglePremium = function() {
    userData.isPremium = !userData.isPremium;
    saveData();
    updateDashboardUI();
    closeSidebar();
    if(userData.isPremium) {
        showToast("💎 Premium Activated! Camera Scan Unlocked.");
    } else {
        showToast("📉 Reverted to Standard User.");
    }
};

window.resetAppData = function() {
    if(confirm("Are you sure you want to reset all data?")) {
        localStorage.removeItem('toniPaidData');
        userData = JSON.parse(JSON.stringify(defaultData)); 
        saveData();
        updateDashboardUI();
        updateHistoryUI();
        closeSidebar();
        showToast("✅ App data has been reset!");
    }
};

function updateDashboardUI() {
    const walletBar = document.getElementById('wallet-fill');
    const bankBar = document.getElementById('bank-fill');
    const walletText = document.getElementById('wallet-balance');
    const bankText = document.getElementById('bank-balance');
    const tierLabel = document.getElementById('user-tier-label');

    tierLabel.innerText = userData.isPremium ? "💎 Premium User" : "Standard User";
    tierLabel.style.color = userData.isPremium ? "#FFF" : "rgba(255,255,255,0.9)";

    walletText.innerText = formatCurrency(userData.accounts.wallet.balance);
    bankText.innerText = formatCurrency(userData.accounts.bank.balance);

    let walletPercent = (userData.accounts.wallet.balance / userData.accounts.wallet.monthlyBudget) * 100;
    let bankPercent = (userData.accounts.bank.balance / userData.accounts.bank.monthlyBudget) * 100;

    walletBar.style.width = `${Math.max(0, Math.min(walletPercent, 100))}%`;
    bankBar.style.width = `${Math.max(0, Math.min(bankPercent, 100))}%`;
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    list.innerHTML = ''; 

    if (userData.transactions.length === 0) {
        list.innerHTML = '<p class="empty-history">No transactions yet.</p>';
        return;
    }

    for (let i = userData.transactions.length - 1; i >= 0; i--) {
        const tx = userData.transactions[i];
        const dateObj = new Date(tx.date);
        const dateStr = `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        const amountClass = tx.type === 'in' ? 'in' : 'out';
        const sign = tx.type === 'in' ? '+' : '-';
        const accountLabel = tx.account === 'wallet' ? 'Wallet' : 'Bank';

        item.innerHTML = `
            <div class="tx-info">
                <h5>${tx.note} (${accountLabel})</h5>
                <p>${dateStr}</p>
            </div>
            <div class="tx-amount ${amountClass}">
                ${sign}${formatCurrency(tx.amount)}
            </div>
        `;
        list.appendChild(item);
    }
}

function processTransaction(amount, type, accountType, note) {
    if (type === 'in') {
        userData.accounts[accountType].balance += amount;
    } else if (type === 'out') {
        userData.accounts[accountType].balance -= amount;
    }

    userData.transactions.push({
        date: new Date().toISOString(),
        amount: amount,
        type: type,
        account: accountType,
        note: note || "Misc"
    });

    saveData();
    updateDashboardUI();
    updateHistoryUI(); 
}

window.simulateScan = function() {
    if (userData.isPremium) {
        document.getElementById('camera-input').click();
    } else {
        document.getElementById('gallery-input').click();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardUI();
    updateHistoryUI();

    // --- LOGIN / LOGOUT LOGIC ---
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const greetingName = document.getElementById('user-greeting-name');

    btnLogin.addEventListener('click', () => {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        if (user && pass) {
            // Set the greeting name dynamically based on email/username input
            const displayName = user.split('@')[0];
            greetingName.innerText = displayName.charAt(0).toUpperCase() + displayName.slice(1) + "!";
            
            // Fade out login screen
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                mainApp.style.display = 'flex'; // Show main app container
                showToast(`Welcome back, ${displayName}!`);
            }, 500);
        } else {
            showToast("⚠️ Please enter both username and password.");
        }
    });

    btnLogout.addEventListener('click', () => {
        closeSidebar();
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
        
        // Slight delay to trigger CSS fade-in
        setTimeout(() => {
            loginScreen.style.opacity = '1';
        }, 50);
        
        showToast("Logged out successfully.");
    });


    // --- FILE INPUTS ---
   // --- REAL AI FILE INPUTS (TESSERACT.JS) ---
    
    async function scanReceiptWithAI(file) {
        showToast("📸 Reading receipt... Keep the app open (may take 5-10s).");
        console.log("Starting AI OCR process...");
        
        try {
            // Start the AI Worker
            const worker = await Tesseract.createWorker('eng');
            
            // Read the image
            const ret = await worker.recognize(file);
            const text = ret.data.text;
            await worker.terminate();

            // 🔍 DEBUGGING: Look at your browser console to see what the AI actually read!
            console.log("----- RAW TEXT SEEN BY AI -----");
            console.log(text);
            console.log("-------------------------------");

            // Smarter Search: Matches 12.34, 1,234.56, 1234,56, etc.
            const amounts = text.match(/\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g);

            if (amounts && amounts.length > 0) {
                console.log("Potential money amounts found:", amounts);
                
                // Clean up the numbers (remove commas, fix weird decimals)
                const cleanAmounts = amounts.map(str => {
                    // Replace commas with nothing (1,200.00 -> 1200.00)
                    let cleanStr = str.replace(/,/g, '');
                    return parseFloat(cleanStr);
                }).filter(num => !isNaN(num));

                // Find the highest number (usually the grand total)
                const maxAmount = Math.max(...cleanAmounts);
                
                if (maxAmount > 0) {
                    processTransaction(maxAmount, 'out', 'wallet', 'Scanned AI Receipt');
                    showToast(`✅ Success! Found Total: ₱${maxAmount}`);
                    setTimeout(() => { document.getElementById('history-modal').style.display = 'flex'; }, 1000);
                } else {
                    throw new Error("Found numbers, but none were greater than 0.");
                }
            } else {
                // If it can't find a price, open the manual entry
                showToast("⚠️ Couldn't find a clear price. Please enter manually.");
                document.getElementById('tx-note').value = "Unreadable Receipt";
                document.getElementById('transaction-modal').style.display = 'flex';
            }
        } catch (error) {
            console.error("AI Scanning Error:", error);
            showToast("⚠️ Error analyzing image. Try a clearer photo.");
        }
    }

    // --- SIDEBAR ---
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    window.openSidebar = function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    };

    window.closeSidebar = function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // --- NEW TRANSACTION MODAL ---
    const txModal = document.getElementById('transaction-modal');
    
    document.getElementById('add-transaction-btn').addEventListener('click', () => {
        txModal.style.display = 'flex';
    });

    document.getElementById('btn-cancel').addEventListener('click', () => {
        txModal.style.display = 'none';
    });

    document.getElementById('btn-save').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const type = document.getElementById('tx-type').value;
        const account = document.getElementById('tx-account').value;
        const note = document.getElementById('tx-note').value;

        if (isNaN(amount) || amount <= 0) {
            showToast("⚠️ Please enter a valid amount.");
            return;
        }
        if (amount > 1000000000) {
            showToast("⚠️ Amount is too large!");
            return;
        }

        processTransaction(amount, type, account, note);
        txModal.style.display = 'none';
        
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-note').value = '';
        showToast("✅ Transaction saved successfully!");
    });

    // --- HISTORY MODAL ---
    const historyModal = document.getElementById('history-modal');

    document.getElementById('history-btn').addEventListener('click', () => {
        historyModal.style.display = 'flex';
    });

    document.getElementById('btn-close-history').addEventListener('click', () => {
        historyModal.style.display = 'none';
    });
});