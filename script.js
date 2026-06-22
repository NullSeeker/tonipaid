const expenseData = {
    categories: ['Food', 'Bills', 'Shopping', 'Fun', 'Transport'],
    values: [2765, 2160, 1299, 249, 180],
    colors: ['#FF7A00', '#FFC107', '#E91E63', '#00BFA5', '#2962FF']
};

const ctx = document.getElementById('expenseChart').getContext('2d');
const expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: expenseData.categories,
        datasets: [{
            data: expenseData.values,
            backgroundColor: expenseData.colors,
            borderWidth: 0,
            cutout: '75%'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        }
    }
});

const totalExpense = expenseData.values.reduce((a, b) => a + b, 0);
const mainCat = expenseData.categories[0];
const mainVal = expenseData.values[0];
const mainPct = Math.round((mainVal / totalExpense) * 100);

document.getElementById('centerPercent').innerText = `${mainPct}%`;
document.getElementById('centerLabel').innerText = mainCat;

const legendDiv = document.getElementById('chartLegend');
expenseData.categories.forEach((cat, index) => {
    legendDiv.innerHTML += `
        <div class="legend-item">
            <div class="legend-left">
                <div class="legend-color" style="background:${expenseData.colors[index]};"></div> 
                ${cat}
            </div>
            <div class="legend-amount">₱${expenseData.values[index].toLocaleString()}</div>
        </div>`;
});
