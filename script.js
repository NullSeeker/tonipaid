// Default User Data
const defaultData = {
    isGold: false, 
    accounts: {
        wallet: { balance: 0 },
        bank: { balance: 0 }
    },
    transactions: []
};

let userData = JSON.parse(JSON.stringify(defaultData));

// --- LOCAL STORAGE DATABASE SYNCING ---
function saveToCloud() {
    // Saves data locally in the user's browser
    localStorage.setItem("toniPaid_data", JSON.stringify(userData));
}

function loadFromCloud() {
    // Loads data from the user's browser
    const savedData = localStorage.getItem("toniPaid_data");
    if (savedData) {
        userData = JSON.parse(savedData);
    } else {
        userData = JSON.parse(JSON.stringify(defaultData));
        saveToCloud(); 
    }
    updateDashboardUI();
    updateHistoryUI();
}

// --- UI UPDATE LOGIC ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

function updateDashboardUI() {
    document.getElementById('wallet-balance').innerText = formatCurrency(userData.accounts.wallet.balance);
    document.getElementById('bank-balance').innerText = formatCurrency(userData.accounts.bank.balance);

    document.getElementById('user-tier-label').innerText = userData.isGold ? "⭐️ Gold User" : "Standard User";
    document.getElementById('user-tier-label').style.color = userData.isGold ? "#FFD700" : "rgba(255,255,255,0.9)";

    let totalIncome = 0;
    let totalExpenses = 0;

    userData.transactions.forEach(tx => {
        if (tx.type === 'in') totalIncome += tx.amount;
        if (tx.type === 'out') totalExpenses += tx.amount;
    });

    let emergencyFund = totalIncome * 0.30;
    document.getElementById('emergency-text').innerText = formatCurrency(emergencyFund);

    if (emergencyFund > 0 && emergencyFund < 100) {
        showToast("⚠️ Notice: Please put at least a minimum of ₱100 in your Emergency Fund (Misc)!");
    }

    let maxGraphValue = Math.max(totalIncome, totalExpenses, 1); 
    let incomeHeight = (totalIncome / maxGraphValue) * 100;
    let expenseHeight = (totalExpenses / maxGraphValue) * 100;

    document.getElementById('graph-savings').style.height = `${Math.max(5, incomeHeight)}%`;
    document.getElementById('graph-expenses').style.height = `${Math.max(5, expenseHeight)}%`;
}

// History Filters & UI Update
let currentFilter = 'all';

window.setFilter = function(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateHistoryUI();
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    list.innerHTML = ''; 

    const filteredTx = userData.transactions.filter(tx => {
        if (currentFilter === 'all') return true;
        return tx.type === currentFilter;
    });

    if (filteredTx.length === 0) {
        list.innerHTML = '<p class="empty-history">No transactions match.</p>';
        return;
    }

    for (let i = filteredTx.length - 1; i >= 0; i--) {
        const tx = filteredTx[i];
        const dateObj = new Date(tx.date);
        const dateStr = `${dateObj.toLocaleDateString()} at ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        const item = document.createElement('div');
        item.className = 'transaction-item';
        const amountClass = tx.type === 'in' ? 'in' : 'out';
        const sign = tx.type === 'in' ? '+' : '-';
        
        item.innerHTML = `
            <div class="tx-info">
                <h5>${tx.note}</h5>
                <p>${dateStr}</p>
            </div>
            <div class="tx-amount ${amountClass}">${sign}${formatCurrency(tx.amount)}</div>
        `;
        list.appendChild(item);
    }
}

function processTransaction(amount, type, accountType, note) {
    if (type === 'in') userData.accounts[accountType].balance += amount;
    else userData.accounts[accountType].balance -= amount;

    userData.transactions.push({
        date: new Date().toISOString(),
        amount: amount,
        type: type,
        account: accountType,
        note: note || "Misc"
    });

    saveToCloud(); 
    updateDashboardUI();
    updateHistoryUI(); 
}

// --- GOLD TIER ACTIONS ---
window.toggleGold = function() {
    userData.isGold = !userData.isGold;
    saveToCloud();
    updateDashboardUI();
    closeSidebar();
    showToast(userData.isGold ? "⭐️ Gold Activated!" : "📉 Standard User.");
};

window.linkBank = function() {
    if (!userData.isGold) return showToast("⭐️ Please upgrade to Gold to automatically track bank accounts!");
    showToast("🏦 Bank Tracking feature unlocked!");
};

window.accessAdvisor = function() {
    if (!userData.isGold) return showToast("⭐️ Please upgrade to Gold to access the Financial Advisor!");
    showToast("🧑‍💼 Connecting to Financial Advisor...");
};

window.simulateScan = function() {
    if (!userData.isGold) return showToast("⭐️ Please upgrade to Gold to scan receipts!");
    document.getElementById('camera-input').click();
};

// --- REAL AI FILE INPUTS (TESSERACT.JS) ---
async function scanReceiptWithAI(file) {
    showToast("📸 Reading receipt... Keep the app open (may take 5-10s).");
    
    try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(file);
        const text = ret.data.text;
        await worker.terminate();

        const amounts = text.match(/\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g);

        if (amounts && amounts.length > 0) {
            const cleanAmounts = amounts.map(str => parseFloat(str.replace(/,/g, ''))).filter(num => !isNaN(num));
            const maxAmount = Math.max(...cleanAmounts);
            
            if (maxAmount > 0) {
                processTransaction(maxAmount, 'out', 'wallet', 'Scanned AI Receipt');
                showToast(`✅ Success! Found Total: ₱${maxAmount}`);
                setTimeout(() => { document.getElementById('history-modal').style.display = 'flex'; }, 1000);
            } else {
                throw new Error("Found numbers, but none were greater than 0.");
            }
        } else {
            showToast("⚠️ Couldn't find a clear price. Please enter manually.");
            document.getElementById('tx-note').value = "Unreadable Receipt";
            document.getElementById('transaction-modal').style.display = 'flex';
        }
    } catch (error) {
        showToast("⚠️ Error analyzing image. Try a clearer photo.");
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const greetingName = document.getElementById('user-greeting-name');

    // --- MOCK AUTHENTICATION CHECK ---
    const savedUser = localStorage.getItem("toniPaid_user");
    if (savedUser) {
        greetingName.innerText = savedUser + "!";
        loadFromCloud();
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';
    } else {
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
    }

    // --- LOGIN / REGISTER LOGIC ---
    let isRegistering = false;

    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
        isRegistering = !isRegistering;
        document.getElementById('auth-title').innerText = isRegistering ? "Create Account" : "Log In";
        document.getElementById('btn-login').style.display = isRegistering ? "none" : "block";
        document.getElementById('btn-register').style.display = isRegistering ? "block" : "none";
        e.target.innerText = isRegistering ? "Already have an account? Log In" : "Need an account? Sign Up";
    });

    function handleLogin() {
        const email = document.getElementById('login-email').value;
        if (!email) return showToast("Please enter an email!");
        
        const displayName = email.split('@')[0];
        const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        
        localStorage.setItem("toniPaid_user", formattedName);
        greetingName.innerText = formattedName + "!";
        
        loadFromCloud();
        
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'flex'; 
        }, 500);
        showToast("Logged in successfully!");
    }

    document.getElementById('btn-register').addEventListener('click', handleLogin);
    document.getElementById('btn-login').addEventListener('click', handleLogin);

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem("toniPaid_user");
        closeSidebar();
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
        loginScreen.style.opacity = '1';
        document.getElementById('login-email').value = '';
        document.getElementById('login-pass').value = '';
        showToast("Logged out successfully.");
    });

    // --- FILE INPUT LISTENERS ---
    document.getElementById('camera-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            scanReceiptWithAI(e.target.files[0]);
            e.target.value = ""; 
        }
    });

    document.getElementById('gallery-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            scanReceiptWithAI(e.target.files[0]);
            e.target.value = ""; 
        }
    });

    // --- SIDEBAR & MODAL LISTENERS ---
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    window.openSidebar = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    window.closeSidebar = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    document.getElementById('menu-btn').addEventListener('click', openSidebar);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    const txModal = document.getElementById('transaction-modal');
    document.getElementById('add-transaction-btn').addEventListener('click', () => txModal.style.display = 'flex');
    document.getElementById('btn-cancel').addEventListener('click', () => txModal.style.display = 'none');

    document.getElementById('btn-save').addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const type = document.getElementById('tx-type').value;
        const account = document.getElementById('tx-account').value;
        const note = document.getElementById('tx-note').value;

        if (isNaN(amount) || amount <= 0) return showToast("⚠️ Invalid amount.");
        
        processTransaction(amount, type, account, note);
        txModal.style.display = 'none';
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-note').value = '';
        showToast("✅ Saved!");
    });

    const historyModal = document.getElementById('history-modal');
    document.getElementById('history-btn').addEventListener('click', () => {
        historyModal.style.display = 'flex';
        setFilter('all'); 
    });
    document.getElementById('btn-close-history').addEventListener('click', () => historyModal.style.display = 'none');
});