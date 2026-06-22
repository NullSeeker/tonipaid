// --- DATABASE ---
let currentWallet = 'cash';
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
document.getElementById('txDate').value = new Date().toISOString().split('T')[0]; // Set date to today

// --- CHART INITIALIZATION ---
let chart;
const ctx = document.getElementById('expenseChart').getContext('2d');

function initChart() {
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0, cutout: '75%' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// --- CORE UI UPDATER ---
function updateUI() {
    const wallet = appData[currentWallet];
    
    // 1. Update Wallet Dashboard
    document.getElementById('walletLabel').innerText = currentWallet === 'cash' ? 'Cash Wallet' : 'Cashless Wallet';
    document.getElementById('walletBalance').innerText = `₱ ${wallet.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    // 2. Prep Chart Data
    const categories = Object.keys(wallet.expenses);
    const values = Object.values(wallet.expenses);
    const totalExpense = values.reduce((a, b) => a + b, 0);

    const mainCat = categories.length > 0 ? categories[0] : "None";
    const mainVal = values.length > 0 ? values[0] : 0;
    const mainPct = totalExpense > 0 ? Math.round((mainVal / totalExpense) * 100) : 0;
    
    document.getElementById('centerPercent').innerText = `${mainPct}%`;
    document.getElementById('centerLabel').innerText = mainCat;

    // 3. Draw Chart
    chart.data.labels = categories;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = categories.map(cat => categoryColors[cat]);
    chart.update();

    // 4. Draw Legend
    const legendDiv = document.getElementById('chartLegend');
    legendDiv.innerHTML = '';
    categories.forEach(cat => {
        legendDiv.innerHTML += `
            <div class="legend-item">
                <div class="legend-left"><div class="legend-color" style="background:${categoryColors[cat]};"></div> ${cat}</div>
                <div class="legend-amount">₱${wallet.expenses[cat].toLocaleString()}</div>
            </div>`;
    });

    // 5. Draw Transaction History
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

// --- BUTTON ACTIONS ---

// Toggles between Cash and Cashless databases
function switchWallet(type) {
    currentWallet = type;
    document.getElementById('btnCash').className = type === 'cash' ? 'filter-btn active' : 'filter-btn';
    document.getElementById('btnCashless').className = type === 'cashless' ? 'filter-btn active' : 'filter-btn';
    updateUI();
}

// Toggles between Home screen and History screen
function switchView(view) {
    // Show/Hide divs
    document.getElementById('homeView').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('historyView').style.display = view === 'history' ? 'block' : 'none';
    
    // Update bottom nav colors
    document.getElementById('navHome').style.color = view === 'home' ? '#ccaa39' : '#a0aec0';
    document.getElementById('navHistory').style.color = view === 'history' ? '#ccaa39' : '#a0aec0';

    // Force chart to redraw so it sizes correctly when un-hidden
    if(view === 'history') chart.update();
}

// Modal Controls
function openModal() {
    document.getElementById('addModal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('addModal').style.display = 'none';
}

// Save new transaction
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
    closeModal();
    updateUI();
}

// --- BOOTSTRAP APP ---
initChart();
updateUI();
