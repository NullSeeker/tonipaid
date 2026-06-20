// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ⚠️ REPLACE THIS OBJECT WITH YOUR CONFIG FROM FIREBASE CONSOLE ⚠️
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

// --- FIREBASE DATABASE SYNCING ---
async function saveToCloud() {
    const user = auth.currentUser;
    if (user) {
        try {
            await setDoc(doc(db, "users", user.uid), userData);
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }
}

async function loadFromCloud(user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        userData = docSnap.data();
    } else {
        userData = JSON.parse(JSON.stringify(defaultData));
        await saveToCloud(); 
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

    // Calculate totals for Graph and Emergency Fund
    let totalIncome = 0;
    let totalExpenses = 0;

    userData.transactions.forEach(tx => {
        if (tx.type === 'in') totalIncome += tx.amount;
        if (tx.type === 'out') totalExpenses += tx.amount;
    });

    // 30% Emergency Fund Logic
    let emergencyFund = totalIncome * 0.30;
    document.getElementById('emergency-text').innerText = formatCurrency(emergencyFund);

    // If emergency fund is less than 100, notify user
    if (emergencyFund > 0 && emergencyFund < 100) {
        showToast("⚠️ Notice: Please put at least a minimum of ₱100 in your Emergency Fund (Misc)!");
    }

    // Update Graph Heights (Relative to the largest number)
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
    
    // Update button styling
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    updateHistoryUI();
}

function updateHistoryUI() {
    const list = document.getElementById('history-list');
    list.innerHTML = ''; 

    // Filter the transactions
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
    if (!userData.isGold) {
        return showToast("⭐️ Please upgrade to Gold to automatically track bank accounts!");
    }
    showToast("🏦 Bank Tracking feature unlocked!");
};

window.accessAdvisor = function() {
    if (!userData.isGold) {
        return showToast("⭐️ Please upgrade to Gold to access the Financial Advisor!");
    }
    showToast("🧑‍💼 Connecting to Financial Advisor...");
};

window.simulateScan = function() {
    if (!userData.isGold) {
        return showToast("⭐️ Please upgrade to Gold to scan receipts!");
    }
    document.getElementById('camera-input').click();
};

// --- REAL AI FILE INPUTS (TESSERACT.JS) ---

async function scanReceiptWithAI(file) {
    showToast("📸 Reading receipt... Keep the app open (may take 5-10s).");
    console.log("Starting AI OCR process...");
    
    try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(file);
        const text = ret.data.text;
        await worker.terminate();

        console.log("----- RAW TEXT SEEN BY AI -----");
        console.log(text);
        console.log("-------------------------------");

        const amounts = text.match(/\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g);

        if (amounts && amounts.length > 0) {
            console.log("Potential money amounts found:", amounts);
            
            const cleanAmounts = amounts.map(str => {
                let cleanStr = str.replace(/,/g, '');
                return parseFloat(cleanStr);
            }).filter(num => !isNaN(num));

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
        console.error("AI Scanning Error:", error);
        showToast("⚠️ Error analyzing image. Try a clearer photo.");
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const greetingName = document.getElementById('user-greeting-name');

    // --- FIREBASE AUTHENTICATION LISTENER ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const displayName = user.email.split('@')[0];
            greetingName.innerText = displayName.charAt(0).toUpperCase() + displayName.slice(1) + "!";
            
            loadFromCloud(user).then(() => {
                loginScreen.style.opacity = '0';
                setTimeout(() => {
                    loginScreen.style.display = 'none';
                    mainApp.style.display = 'flex'; 
                }, 500);
            });
        } else {
            mainApp.style.display = 'none';
            loginScreen.style.display = 'flex';
            setTimeout(() => { loginScreen.style.opacity = '1'; }, 50);
        }
    });

    // --- LOGIN / REGISTER LOGIC ---
    let isRegistering = false;

    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
        isRegistering = !isRegistering;
        document.getElementById('auth-title').innerText = isRegistering ? "Create Account" : "Log In";
        document.getElementById('btn-login').style.display = isRegistering ? "none" : "block";
        document.getElementById('btn-register').style.display = isRegistering ? "block" : "none";
        e.target.innerText = isRegistering ? "Already have an account? Log In" : "Need an account? Sign Up";
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        createUserWithEmailAndPassword(auth, email, pass)
            .then(() => showToast("Account created successfully!"))
            .catch((error) => showToast("Error: " + error.message));
    });

    document.getElementById('btn-login').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        signInWithEmailAndPassword(auth, email, pass)
            .catch((error) => showToast("Error: Invalid email or password."));
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        signOut(auth).then(() => {
            closeSidebar();
            showToast("Logged out securely.");
        });
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
        showToast("✅ Saved to cloud!");
    });

    const historyModal = document.getElementById('history-modal');
    document.getElementById('history-btn').addEventListener('click', () => {
        historyModal.style.display = 'flex';
        setFilter('all'); // Reset filter when opened
    });
    document.getElementById('btn-close-history').addEventListener('click', () => historyModal.style.display = 'none');
});