let currentWallet = 'cash';
let currentTier = 'Free'; 

const appData = {
    cash: {
        balance: 5000,
        expenses: { Food: 1200, Bills: 1500, Shopping: 600, Fun: 200, Transport: 150 },
        history: [
            { type: 'in', category: 'Salary', amount: 7650, date: '2026-06-19' },
            { type: 'out', category: 'Food', amount: 1200, date: '2026-06-20' }
        ]
    },
    cashless: {
        balance: 15240,
        expenses: { Food: 2765, Bills: 2160, Shopping: 1299, Fun: 249, Transport: 180 },
        history: [
            { type: 'out', category: 'Bills', amount: 2160, date: '2026-06-18' },
            { type: 'out', category: 'Food', amount: 2765, date: '2026-06-21' }
        ]
    }
};

const categoryColors = { Food: '#FF7A00', Bills: '#FFC107', Shopping: '#E91E63', Fun: '#00BFA5', Transport: '#2962FF' };
document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

let chart;
const ctx = document.getElementById('expenseChart').getContext('2d');

function initChart() {
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, cutout: '75%' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updateUI() {
    const wallet = appData[currentWallet];
    
    document.getElementById('walletLabel').innerText = currentWallet === 'cash' ? 'Cash Wallet' : 'Cashless Wallet';
    document.getElementById('walletBalance').innerText = `₱ ${wallet.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const categories = Object.keys(wallet.expenses);
    const values = Object.values(wallet.expenses);
    const totalExpense = values.reduce((a, b) => a + b, 0);

    const mainCat = categories.length > 0 ? categories[0] : "None";
    const mainVal = values.length > 0 ? values[0] : 0;
    const mainPct = totalExpense > 0 ? Math.round((mainVal / totalExpense) * 100) : 0;
    
    document.getElementById('centerPercent').innerText = `${mainPct}%`;
    document.getElementById('centerLabel').innerText = mainCat;

    chart.data.labels = categories;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = categories.map(cat => categoryColors[cat]);
    chart.update();

    const legendDiv = document.getElementById('chartLegend');
    legendDiv.innerHTML = '';
    categories.forEach(cat => {
        legendDiv.innerHTML += `
            <div class="legend-item">
                <div class="legend-left"><div class="legend-color" style="background:${categoryColors[cat]};"></div> ${cat}</div>
                <div class="legend-amount">₱${wallet.expenses[cat].toLocaleString()}</div>
            </div>`;
    });

    const historyDiv = document.getElementById('txHistory');
    historyDiv.innerHTML = wallet.history.length === 0 ? '<div class="empty-history">No logs yet</div>' : '';
    [...wallet.history].reverse().forEach(item => {
        const sign = item.type === 'in' ? '+' : '-';
        const cssClass = item.type === 'in' ? 'in' : 'out';
        historyDiv.innerHTML += `
            <div class="transaction-item">
                <div class="tx-info">
                    <h5>${item.category}</h5>
                    <p>${item.date}</p>
                </div>
                <div class="tx-amount ${cssClass}">${sign}₱${item.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>`;
    });
}

// --- VIEW & ANIMATION CONTROLS ---

function switchWallet(type) {
    currentWallet = type;
    document.getElementById('btnCash').className = type === 'cash' ? 'filter-btn active' : 'filter-btn';
    document.getElementById('btnCashless').className = type === 'cashless' ? 'filter-btn active' : 'filter-btn';
    document.getElementById('bankLinkContainer').style.display = type === 'cashless' ? 'block' : 'none';
    updateUI();
}

function switchView(view) {
    const home = document.getElementById('homeView');
    const history = document.getElementById('historyView');
    
    if(view === 'home') {
        history.className = 'fade-out';
        setTimeout(() => home.className = 'fade-in', 300);
    } else {
        home.className = 'fade-out';
        setTimeout(() => {
            history.className = 'fade-in';
            chart.update();
        }, 300);
    }
    
    document.getElementById('navHome').style.color = view === 'home' ? '#ccaa39' : '#a0aec0';
    document.getElementById('navHistory').style.color = view === 'history' ? '#ccaa39' : '#a0aec0';
}

function openModal(modalId) { 
    document.getElementById(modalId).classList.add('active'); 
}
function closeModal(modalId) { 
    document.getElementById(modalId).classList.remove('active'); 
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// --- APP FLOW ---

function performLogin() {
    const user = document.getElementById('loginUser').value || 'User';
    document.getElementById('welcomeName').innerText = user + '!';
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    setTimeout(() => document.getElementById('mainApp').className = 'app-container fade-in', 50);
    updateUI();
}

function logout() {
    document.getElementById('mainApp').className = 'app-container fade-out';
    setTimeout(() => {
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        closeSidebar();
        switchView('home');
    }, 300);
}

// --- TIER & FEATURE LOGIC ---

function showToast(msg) {
    const toast = document.getElementById('appToast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTier() {
    currentTier = document.getElementById('tierSelect').value;
    showToast(`Account updated to ${currentTier} tier!`);
}

function triggerFeature(requiredTier, featureName) {
    const tiers = { 'Free': 0, 'Gold': 1 }; // Stripped out Premium
    
    if (tiers[currentTier] >= tiers[requiredTier]) {
        // Feature Router
        if (featureName === 'Scan Receipt') {
            startCamera();
        } else if (featureName === 'RoboAdvisor') {
            closeSidebar();
            openModal('advisorModal');
        } else if (featureName === 'About Page') {
            closeSidebar();
            openModal('aboutModal');
        } else {
            showToast(`Launching ${featureName}...`);
        }
    } else {
        showToast(`🔒 Locked. ${featureName} requires ${requiredTier} access.`);
    }
}

// --- LIVE CAMERA LOGIC ---

let cameraStream;

async function startCamera() {
    closeModal('addModal');
    openModal('cameraModal');
    const video = document.getElementById('cameraFeed');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = cameraStream;
    } catch (err) {
        showToast("Camera access denied or unavailable.");
    }
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    closeModal('cameraModal');
}

function captureReceipt() {
    showToast("Scanning AI processing...");
    
    // Simulating the time it takes an AI to read a receipt
    setTimeout(() => {
        closeCamera();
        openModal('addModal');
        
        // Magically and accurately fill the form with "scanned" data
        document.getElementById('txAmount').value = "1250.00";
        document.getElementById('txCategory').value = "Shopping";
        document.getElementById('txType').value = "out";
        
        showToast("Receipt scanned and details extracted successfully!");
    }, 1500);
}

function addTransaction() {
    const type = document.getElementById('txType').value;
    const category = document.getElementById('txCategory').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;

    if (!amount || amount <= 0) { alert("Please input a valid amount."); return; }

    const wallet = appData[currentWallet];
    
    if (type === 'in') {
        wallet.balance += amount;
        wallet.history.push({ type, category: 'Income: ' + category, amount, date });
    } else {
        wallet.balance -= amount;
        wallet.expenses[category] = (wallet.expenses[category] || 0) + amount;
        wallet.history.push({ type, category, amount, date });
    }

    document.getElementById('txAmount').value = '';
    closeModal('addModal');
    updateUI();
}

initChart();
