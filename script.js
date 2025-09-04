document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const fundBalanceEl = document.getElementById('fund-balance');
    const contributionForm = document.getElementById('contribution-form');
    const contributionPersonEl = document.getElementById('contribution-person');
    const contributionAmountEl = document.getElementById('contribution-amount');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionEl = document.getElementById('expense-description');
    const expenseAmountEl = document.getElementById('expense-amount');
    const fundHistoryEl = document.getElementById('fund-history');

    // Analytics DOM Elements
    const equalizerTextEl = document.getElementById('equalizer-text');
    const sageTotalContribEl = document.getElementById('sage-total-contrib');
    const sageAvgContribEl = document.getElementById('sage-avg-contrib');
    const emilyTotalContribEl = document.getElementById('emily-total-contrib');
    const emilyAvgContribEl = document.getElementById('emily-avg-contrib');

    // Mileage DOM Elements
    const mileageTotalEl = document.getElementById('mileage-total');
    const mileageForm = document.getElementById('mileage-form');
    const tripDescriptionEl = document.getElementById('trip-description');
    const tripMilesEl = document.getElementById('trip-miles');
    const paymentForm = document.getElementById('payment-form');
    const paymentAmountEl = document.getElementById('payment-amount');
    const mileageHistoryEl = document.getElementById('mileage-history');

    // Mileage Settings DOM Elements
    const mpgInput = document.getElementById('mpg');
    const gasCostInput = document.getElementById('gas-cost');
    const maintenanceFeeInput = document.getElementById('maintenance-fee');
    const convenienceFeeInput = document.getElementById('convenience-fee');
    const effectiveRateEl = document.getElementById('effective-rate');
    const mileageSettingsForm = document.getElementById('mileage-settings-form');

    // Whiteboard DOM Elements
    const whiteboardForm = document.getElementById('whiteboard-form');
    const whiteboardMessageEl = document.getElementById('whiteboard-message');
    const whiteboardListEl = document.getElementById('whiteboard-list');

    // State
    let state = {
        fundBalance: 0,
        contributions: { Sage: 0, Emily: 0 },
        fundHistory: [],
        mileageTotal: 0,
        mileageSettings: {
            mpg: 25,
            gasCost: 3.75,
            maintenance: 0.05,
            convenience: 0.05,
        },
        mileageHistory: [],
        whiteboard: [],
    };

    // --- Data Persistence & Migration ---
    function saveData() {
        localStorage.setItem('expenseTrackerState', JSON.stringify(state));
    }

    function loadData() {
        const savedState = localStorage.getItem('expenseTrackerState');
        if (savedState) {
            let loadedState = JSON.parse(savedState);

            // --- Data Migration: v1 -> v2 (Fund Contributions) ---
            if (!loadedState.contributions) {
                console.log("Migrating fund data to v2...");
                let migratedState = { ...state, ...loadedState, contributions: { Sage: 0, Emily: 0 }, fundHistory: [] };
                if (loadedState.fundHistory) {
                    loadedState.fundHistory.forEach(item => {
                        const newHistoryItem = { type: item.type, amount: item.amount, date: new Date().toISOString() };
                        if (item.type === 'contribution') {
                            if (item.description.includes('Sage')) { newHistoryItem.person = 'Sage'; migratedState.contributions.Sage += item.amount; }
                            else if (item.description.includes('Emily')) { newHistoryItem.person = 'Emily'; migratedState.contributions.Emily += item.amount; }
                        } else { newHistoryItem.description = item.description; }
                        migratedState.fundHistory.push(newHistoryItem);
                    });
                }
                state = migratedState;
            } else {
                state = { ...state, ...loadedState };
            }

            // --- Data Migration: v2 -> v3 (Mileage Rate to Settings) ---
            if (loadedState.mileageRate) {
                console.log("Migrating mileage data to v3...");
                // Keep the old rate as the convenience fee and use defaults for others
                state.mileageSettings = {
                    mpg: 25,
                    gasCost: 3.75,
                    maintenance: 0.05,
                    convenience: loadedState.mileageRate - 0.20, // Approximate
                };
                delete state.mileageRate; // Remove old key
            }

            // --- Backward Compatibility Checks ---
            state.mileageHistory.forEach(item => { if (!item.type) item.type = 'trip'; });
            if (!state.whiteboard) state.whiteboard = [];
            if (!state.mileageSettings) state.mileageSettings = { mpg: 25, gasCost: 3.75, maintenance: 0.05, convenience: 0.05 };

            saveData();
        }
    }

    // --- Calculation Helpers ---
    function calculateEffectiveRate() {
        const s = state.mileageSettings;
        if (s.mpg === 0) return s.maintenance + s.convenience; // Avoid division by zero
        return (s.gasCost / s.mpg) + s.maintenance + s.convenience;
    }

    function calculateMonthlyAverage(person) {
        const contributionsByMonth = {};
        state.fundHistory.forEach(item => {
            if (item.type === 'contribution' && item.person === person) {
                const date = new Date(item.date);
                const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
                if (!contributionsByMonth[monthYear]) { contributionsByMonth[monthYear] = 0; }
                contributionsByMonth[monthYear] += item.amount;
            }
        });
        const monthlyTotals = Object.values(contributionsByMonth);
        if (monthlyTotals.length === 0) return 0;
        const totalContribution = monthlyTotals.reduce((sum, total) => sum + total, 0);
        return totalContribution / monthlyTotals.length;
    }

    // --- Rendering ---
    function render() {
        // Render Fund
        fundBalanceEl.textContent = `$${state.fundBalance.toFixed(2)}`;
        fundHistoryEl.innerHTML = '';
        state.fundHistory.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            let description = '', sign = '', color = '';
            if (item.type === 'contribution') {
                description = `${item.person} contributed`;
                sign = '+';
                color = 'green';
            } else {
                description = item.description;
                sign = '-';
                color = 'red';
            }
            li.innerHTML = `${description} <span style="color: ${color};">${sign}$${Math.abs(item.amount).toFixed(2)}</span>`;
            fundHistoryEl.appendChild(li);
        });

        // Render Analytics
        const sageTotal = state.contributions.Sage, emilyTotal = state.contributions.Emily;
        sageTotalContribEl.textContent = `$${sageTotal.toFixed(2)}`;
        emilyTotalContribEl.textContent = `$${emilyTotal.toFixed(2)}`;
        const sageAvg = calculateMonthlyAverage('Sage'), emilyAvg = calculateMonthlyAverage('Emily');
        sageAvgContribEl.textContent = `$${sageAvg.toFixed(2)}`;
        emilyAvgContribEl.textContent = `$${emilyAvg.toFixed(2)}`;
        const diff = sageTotal - emilyTotal;
        if (diff > 0) { equalizerTextEl.textContent = `Emily needs to add $${diff.toFixed(2)} to catch up.`; }
        else if (diff < 0) { equalizerTextEl.textContent = `Sage needs to add $${Math.abs(diff).toFixed(2)} to catch up.`; }
        else { equalizerTextEl.textContent = 'Contributions are perfectly balanced.'; }

        // Render Mileage
        mileageTotalEl.textContent = `$${state.mileageTotal.toFixed(2)}`;
        mpgInput.value = state.mileageSettings.mpg;
        gasCostInput.value = state.mileageSettings.gasCost;
        maintenanceFeeInput.value = state.mileageSettings.maintenance;
        convenienceFeeInput.value = state.mileageSettings.convenience;
        effectiveRateEl.textContent = calculateEffectiveRate().toFixed(2);

        mileageHistoryEl.innerHTML = '';
        state.mileageHistory.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            if (item.type === 'payment') {
                li.innerHTML = `Payment Received <span style="color: green;">-$${item.amount.toFixed(2)}</span>`;
            } else {
                li.innerHTML = `${item.description} (${item.miles} miles) <span>$${item.cost.toFixed(2)}</span>`;
            }
            mileageHistoryEl.appendChild(li);
        });

        // Render Whiteboard
        whiteboardListEl.innerHTML = '';
        state.whiteboard.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            const date = new Date(item.date).toLocaleString();
            li.innerHTML = `<span>${item.message}</span><small style="align-self: flex-end;">${date}</small>`;
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            whiteboardListEl.appendChild(li);
        });
    }

    // --- Logic Functions ---
    function addContribution(e) { e.preventDefault(); const p = contributionPersonEl.value, a = parseFloat(contributionAmountEl.value); if(isNaN(a)||a<=0)return; state.fundBalance+=a; state.contributions[p]+=a; state.fundHistory.push({type:'contribution',person:p,amount:a,date:new Date().toISOString()}); contributionAmountEl.value=''; saveData(); render(); }
    function addExpense(e) { e.preventDefault(); const d = expenseDescriptionEl.value, a = parseFloat(expenseAmountEl.value); if(!d||isNaN(a)||a<=0)return; state.fundBalance-=a; state.fundHistory.push({type:'expense',description:d,amount:-a,date:new Date().toISOString()}); expenseDescriptionEl.value=''; expenseAmountEl.value=''; saveData(); render(); }
    function addMessage(e) { e.preventDefault(); const m=whiteboardMessageEl.value; if(!m)return; state.whiteboard.push({message:m,date:new Date().toISOString()}); whiteboardMessageEl.value=''; saveData(); render(); }

    function logTrip(e) {
        e.preventDefault();
        const description = tripDescriptionEl.value;
        const miles = parseFloat(tripMilesEl.value);
        if (!description || isNaN(miles) || miles <= 0) return;

        const cost = miles * calculateEffectiveRate();
        state.mileageTotal += cost;
        state.mileageHistory.push({ type: 'trip', description, miles, cost, date: new Date().toISOString() });

        tripDescriptionEl.value = '';
        tripMilesEl.value = '';
        saveData();
        render();
    }

    function recordMileagePayment(e) {
        e.preventDefault();
        const amount = parseFloat(paymentAmountEl.value);
        if (isNaN(amount) || amount <= 0) return;
        state.mileageTotal -= amount;
        state.mileageHistory.push({ type: 'payment', amount: amount, date: new Date().toISOString() });
        paymentAmountEl.value = '';
        saveData();
        render();
    }

    function updateMileageSettings() {
        state.mileageSettings.mpg = parseFloat(mpgInput.value) || 0;
        state.mileageSettings.gasCost = parseFloat(gasCostInput.value) || 0;
        state.mileageSettings.maintenance = parseFloat(maintenanceFeeInput.value) || 0;
        state.mileageSettings.convenience = parseFloat(convenienceFeeInput.value) || 0;

        // Recalculate total based on new settings
        let newTotal = 0;
        const effectiveRate = calculateEffectiveRate();
        state.mileageHistory.forEach(item => {
            if (item.type === 'trip') {
                item.cost = item.miles * effectiveRate;
                newTotal += item.cost;
            } else { // payment
                newTotal -= item.amount;
            }
        });
        state.mileageTotal = newTotal;

        saveData();
        render();
    }

    // --- Theme Switcher Logic ---
    function switchTheme(e) { if(e.target.checked){document.body.classList.add('dark-mode');localStorage.setItem('theme','dark');}else{document.body.classList.remove('dark-mode');localStorage.setItem('theme','light');} }
    function loadTheme() { const theme=localStorage.getItem('theme'); if(theme==='dark'){document.body.classList.add('dark-mode');themeToggle.checked=true;} }

    // --- Event Listeners ---
    contributionForm.addEventListener('submit', addContribution);
    expenseForm.addEventListener('submit', addExpense);
    mileageForm.addEventListener('submit', logTrip);
    paymentForm.addEventListener('submit', recordMileagePayment);
    themeToggle.addEventListener('change', switchTheme);
    whiteboardForm.addEventListener('submit', addMessage);
    mileageSettingsForm.addEventListener('change', updateMileageSettings);

    // --- Initial Load ---
    loadData();
    loadTheme();
    render();
});
