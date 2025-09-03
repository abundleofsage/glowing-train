document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fundBalanceEl = document.getElementById('fund-balance');
    const contributionForm = document.getElementById('contribution-form');
    const contributionPersonEl = document.getElementById('contribution-person');
    const contributionAmountEl = document.getElementById('contribution-amount');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionEl = document.getElementById('expense-description');
    const expenseAmountEl = document.getElementById('expense-amount');
    const fundHistoryEl = document.getElementById('fund-history');

    const mileageTotalEl = document.getElementById('mileage-total');
    const mileageForm = document.getElementById('mileage-form');
    const tripDescriptionEl = document.getElementById('trip-description');
    const tripMilesEl = document.getElementById('trip-miles');
    const mileageRateEl = document.getElementById('mileage-rate');
    const mileageHistoryEl = document.getElementById('mileage-history');

    // State
    let state = {
        fundBalance: 0,
        fundHistory: [],
        mileageTotal: 0,
        mileageRate: 0.25,
        mileageHistory: [],
    };

    // --- Data Persistence ---
    function saveData() {
        localStorage.setItem('expenseTrackerState', JSON.stringify(state));
    }

    function loadData() {
        const savedState = localStorage.getItem('expenseTrackerState');
        if (savedState) {
            state = JSON.parse(savedState);
        }
    }

    // --- Rendering ---
    function render() {
        // Render Fund
        fundBalanceEl.textContent = `$${state.fundBalance.toFixed(2)}`;
        fundHistoryEl.innerHTML = '';
        state.fundHistory.forEach(item => {
            const li = document.createElement('li');
            const sign = item.type === 'contribution' ? '+' : '-';
            const color = item.type === 'contribution' ? 'green' : 'red';
            li.innerHTML = `${item.description} <span style="color: ${color};">${sign}$${Math.abs(item.amount).toFixed(2)}</span>`;
            fundHistoryEl.appendChild(li);
        });

        // Render Mileage
        mileageRateEl.value = state.mileageRate;
        mileageTotalEl.textContent = `$${state.mileageTotal.toFixed(2)}`;
        mileageHistoryEl.innerHTML = '';
        state.mileageHistory.forEach(trip => {
            const li = document.createElement('li');
            li.innerHTML = `${trip.description} (${trip.miles} miles) <span>$${trip.cost.toFixed(2)}</span>`;
            mileageHistoryEl.appendChild(li);
        });
    }

    // --- Fund Logic ---
    function addContribution(e) {
        e.preventDefault();
        const person = contributionPersonEl.value;
        const amount = parseFloat(contributionAmountEl.value);

        if (isNaN(amount) || amount <= 0) return;

        state.fundBalance += amount;
        state.fundHistory.push({
            type: 'contribution',
            description: `${person} contributed`,
            amount: amount,
        });

        contributionAmountEl.value = '';
        saveData();
        render();
    }

    function addExpense(e) {
        e.preventDefault();
        const description = expenseDescriptionEl.value;
        const amount = parseFloat(expenseAmountEl.value);

        if (!description || isNaN(amount) || amount <= 0) return;

        state.fundBalance -= amount;
        state.fundHistory.push({
            type: 'expense',
            description: description,
            amount: -amount,
        });

        expenseDescriptionEl.value = '';
        expenseAmountEl.value = '';
        saveData();
        render();
    }

    // --- Mileage Logic ---
    function logTrip(e) {
        e.preventDefault();
        const description = tripDescriptionEl.value;
        const miles = parseFloat(tripMilesEl.value);

        if (!description || isNaN(miles) || miles <= 0) return;

        const cost = miles * state.mileageRate;
        state.mileageTotal += cost;
        state.mileageHistory.push({
            description,
            miles,
            cost,
        });

        tripDescriptionEl.value = '';
        tripMilesEl.value = '';
        saveData();
        render();
    }

    function updateMileageRate() {
        const newRate = parseFloat(mileageRateEl.value);
        if (isNaN(newRate) || newRate < 0) return;

        state.mileageRate = newRate;
        // Recalculate total based on new rate
        state.mileageTotal = state.mileageHistory.reduce((total, trip) => {
            trip.cost = trip.miles * state.mileageRate;
            return total + trip.cost;
        }, 0);

        saveData();
        render();
    }

    // --- Event Listeners ---
    contributionForm.addEventListener('submit', addContribution);
    expenseForm.addEventListener('submit', addExpense);
    mileageForm.addEventListener('submit', logTrip);
    mileageRateEl.addEventListener('change', updateMileageRate);

    // --- Initial Load ---
    loadData();
    render();
});
