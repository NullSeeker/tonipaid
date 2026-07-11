let currentWallet = 'cash';
let currentTier = 'Free'; 
let registeredUsers = JSON.parse(localStorage.getItem('toniPaidUsers_v4')) || [];

const defaultAppData = {
    cash: { balance: 0, expenses: {}, budgets: {}, history: [] },
    cashless: { balance: 0, expenses: {}, budgets: {}, history: [] },
    receipts: [] 
};

let appData = JSON.parse(localStorage.getItem('toniPaidData_v4')) || defaultAppData;

if (!appData.receipts) appData.receipts = [];

function saveLocalData() {
    localStorage.setItem('toniPaidUsers_v4', JSON.stringify(registeredUsers));
    localStorage.setItem('toniPaidData_v4', JSON.stringify(appData));
}

const categoryColors = { Food: '#ccaa39', Bills: '#111111', Shopping: '#64748b', Fun: '#94a3b8', Transport: '#e2e8f0' };
const fallbackColors = ['#111111', '#333333', '#475569', '#64748b', '#94a3b8', '#ccaa39', '#e3c153', '#b89832'];

function getCatColor(cat) {
    if (categoryColors[cat]) return categoryColors[cat];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % fallbackColors.length;
    categoryColors[cat] = fallbackColors[index];
    return fallbackColors[index];
}

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
    document.getElementById('walletBalance').innerText = wallet.balance.toLocaleString('en-US', {minimumFractionDigits: 2});

    const categories = Object.keys(wallet.expenses);
    const values = Object.values(wallet.expenses);
    const totalExpense = values.reduce((a, b) => a + b, 0);

    const mainCat = categories.length > 0 ? categories[0] : "None";
    const mainPct = totalExpense > 0 ? Math.round((values[0] / totalExpense) * 100) : 0;
    
    document.getElementById('centerPercent').innerText = `${mainPct}%`;
    document.getElementById('centerLabel').innerText = mainCat;

    chart.data.labels = categories;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = categories.map(cat => getCatColor(cat));
    chart.update();

    const legendDiv = document.getElementById('chartLegend');
    legendDiv.innerHTML = '';
    categories.forEach(cat => {
        legendDiv.innerHTML += `
            <div class="legend-item">
                <div class="legend-left"><div class="legend-color" style="background:${getCatColor(cat)};"></div> ${cat}</div>
                <div class="legend-amount">${wallet.expenses[cat].toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
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
                <div class="tx-amount ${cssClass}">${sign}${item.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>`;
    });
}

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
        home.className = 'fade-in';
    } else {
        home.className = 'fade-out';
        history.className = 'fade-in';
        chart.update();
    }
    
    document.getElementById('navHome').style.color = view === 'home' ? '#111111' : '#94a3b8';
    document.getElementById('navHistory').style.color = view === 'history' ? '#111111' : '#94a3b8';
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

function openSidebar() {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function toggleAuthMode() {
    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');
    if (login.style.display === 'none') {
        login.style.display = 'block';
        signup.style.display = 'none';
    } else {
        login.style.display = 'none';
        signup.style.display = 'block';
    }
}

function performSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass = document.getElementById('signupPassword').value;

    if (!name || !email || !pass) {
        showToast("Please fill out all fields.");
        return;
    }
    
    if (registeredUsers.find(u => u.email === email)) {
        showToast("Email already exists.");
        return;
    }
    
    registeredUsers.push({ name, email, pass });
    saveLocalData(); 
    showToast("Account created.");
    
    document.getElementById('signupName').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    toggleAuthMode();
}

function performLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;

    const user = registeredUsers.find(u => u.email === email && u.pass === pass);
    
    if (!user) {
        showToast("Invalid credentials.");
        return;
    }

    document.getElementById('welcomeName').innerText = user.name + '!';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('mainApp').className = 'app-container fade-in';
    updateUI();
}

function logout() {
    document.getElementById('mainApp').className = 'app-container fade-out';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    closeSidebar();
    switchView('home');
}

function showToast(msg) {
    const toast = document.getElementById('appToast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTier() {
    currentTier = document.getElementById('tierSelect').value;
    showToast(`Account updated to ${currentTier} tier.`);
}

function triggerFeature(requiredTier, featureName) {
    const tiers = { 'Free': 0, 'Gold': 1 };
    
    if (tiers[currentTier] >= tiers[requiredTier]) {
        if (featureName === 'Scan Receipt') {
            startCamera();
        } else if (featureName === 'Budget Planning') {
            closeSidebar();
            renderBudgets();
            openModal('budgetModal');
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
        showToast(`Locked. ${featureName} requires ${requiredTier} access.`);
    }
}

function renderBudgets() {
    const wallet = appData[currentWallet];
    const container = document.getElementById('budgetList');
    document.getElementById('budgetWalletLabel').innerText = currentWallet === 'cash' ? 'Cash' : 'Cashless';
    container.innerHTML = '';

    const categories = Object.keys(wallet.expenses);
    
    if(categories.length === 0) {
        container.innerHTML = '<p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">Log expenses first.</p>';
        return;
    }

    categories.forEach(cat => {
        const spent = wallet.expenses[cat] || 0;
        const limit = wallet.budgets[cat] || 0;
        const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        const color = getCatColor(cat);
        const warning = spent > limit && limit > 0 ? '<span style="color: #ef4444; font-size: 0.7rem; font-weight: 600; margin-left: 5px;">Over limit</span>' : '';

        container.innerHTML += `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-size: 0.8rem; font-weight: 600; color: #1e293b;">${cat} ${warning}</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 0.75rem; color: #64748b;">₱</span>
                        <input type="number" id="budgetInput_${cat}" value="${limit}" style="width: 75px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: 'Inter'; text-align: right; outline: none; font-size: 0.8rem;">
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #64748b;">
                    <span>Spent: ${spent.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: ${spent > limit && limit > 0 ? '#ef4444' : color}; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
    });
}

function saveBudgets() {
    const wallet = appData[currentWallet];
    const categories = Object.keys(wallet.expenses);
    categories.forEach(cat => {
        const inputElement = document.getElementById(`budgetInput_${cat}`);
        if(inputElement) wallet.budgets[cat] = parseFloat(inputElement.value) || 0;
    });
    saveLocalData();
    showToast("Budgets saved.");
    closeModal('budgetModal');
}

let cameraStream;
let pendingReceiptImage = null;

async function startCamera() {
    closeModal('addModal');
    openModal('cameraModal');
    const video = document.getElementById('cameraFeed');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = cameraStream;
    } catch (err) {
        showToast("Camera access denied.");
    }
}

function closeCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    closeModal('cameraModal');
}

function captureReceipt() {
    showToast("Processing image frame...");
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('snapshotCanvas');
    
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 400;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    pendingReceiptImage = canvas.toDataURL('image/jpeg', 0.5);
    
    setTimeout(() => {
        closeCamera();
        openModal('addModal');
        document.getElementById('receiptAttachedIndicator').style.display = 'flex';
        document.getElementById('txAmount').value = "1250.00";
        document.getElementById('txCategory').value = "Shopping";
        document.getElementById('txType').value = "out";
        showToast("Receipt image captured.");
    }, 1200);
}

function openGallery() {
    closeSidebar();
    const grid = document.getElementById('receiptGrid');
    grid.innerHTML = '';
    
    if (appData.receipts.length === 0) {
        grid.innerHTML = '<p style="grid-column: span 2; font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 20px;">No receipts saved yet.</p>';
    } else {
        appData.receipts.slice().reverse().forEach(receipt => {
            grid.innerHTML += `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 6px;">
                    <img src="${receipt.image}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; background: #e2e8f0;">
                    <div style="padding: 8px 4px 4px 4px;">
                        <p style="font-size: 0.75rem; font-weight: 600; color: #1e293b; margin:0; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${receipt.category}</p>
                        <p style="font-size: 0.7rem; color: #64748b; margin:0;">${receipt.amount.toLocaleString()}</p>
                        <p style="font-size: 0.6rem; color: #94a3b8; margin:4px 0 0 0;">${receipt.date.split(' ')[0]}</p>
                    </div>
                </div>
            `;
        });
    }
    openModal('galleryModal');
}

function addTransaction() {
    const type = document.getElementById('txType').value;
    let category = document.getElementById('txCategory').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    let dateInput = document.getElementById('txDate').value;

    if (!category) { alert("Please enter a category."); return; }
    if (!amount || amount <= 0) { alert("Invalid amount."); return; }
    
    category = category.charAt(0).toUpperCase() + category.slice(1);

    if (!dateInput) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toISOString().split('T')[0];
        dateInput = `${dateString} ${timeString}`;
    } else {
        dateInput = dateInput.replace('T', ' '); 
    }

    const wallet = appData[currentWallet];
    
    if (type === 'in') {
        wallet.balance += amount;
        wallet.history.push({ type, category: 'Income: ' + category, amount, date: dateInput });
    } else {
        wallet.balance -= amount;
        wallet.expenses[category] = (wallet.expenses[category] || 0) + amount;
        wallet.history.push({ type, category, amount, date: dateInput });
        
        if (!wallet.budgets[category]) wallet.budgets[category] = 0;
    }

    if (pendingReceiptImage) {
        appData.receipts.push({
            image: pendingReceiptImage,
            amount: amount,
            category: category,
            date: dateInput
        });
        pendingReceiptImage = null; 
        document.getElementById('receiptAttachedIndicator').style.display = 'none'; 
    }

    saveLocalData();

    document.getElementById('txCategory').value = '';
    document.getElementById('txAmount').value = '';
    document.getElementById('txDate').value = '';
    closeModal('addModal');
    updateUI();
}

initChart();
