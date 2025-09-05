document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const themeToggle = document.getElementById('theme-toggle');
    const fundBalanceEl = document.getElementById('fund-balance');
    const contributionForm = document.getElementById('contribution-form');
    const contributionPersonEl = document.getElementById('contribution-person');
    const contributionAmountEl = document.getElementById('contribution-amount');
    const expenseForm = document.getElementById('expense-form');
    const expenseDescriptionEl = document.getElementById('expense-description');
    const expenseCategoryEl = document.getElementById('expense-category');
    const expenseAmountEl = document.getElementById('expense-amount');
    const fundHistoryEl = document.getElementById('fund-history');
    const equalizerTextEl = document.getElementById('equalizer-text');
    const sageTotalContribEl = document.getElementById('sage-total-contrib');
    const sageAvgContribEl = document.getElementById('sage-avg-contrib');
    const emilyTotalContribEl = document.getElementById('emily-total-contrib');
    const emilyAvgContribEl = document.getElementById('emily-avg-contrib');
    const mileageTotalEl = document.getElementById('mileage-total');
    const mileageForm = document.getElementById('mileage-form');
    const tripDescriptionEl = document.getElementById('trip-description');
    const tripMilesEl = document.getElementById('trip-miles');
    const paymentForm = document.getElementById('payment-form');
    const paymentAmountEl = document.getElementById('payment-amount');
    const mileageHistoryEl = document.getElementById('mileage-history');
    const mpgInput = document.getElementById('mpg');
    const gasCostInput = document.getElementById('gas-cost');
    const maintenanceFeeInput = document.getElementById('maintenance-fee');
    const convenienceFeeInput = document.getElementById('convenience-fee');
    const effectiveRateEl = document.getElementById('effective-rate');
    const mileageSettingsForm = document.getElementById('mileage-settings-form');
    const whiteboardForm = document.getElementById('whiteboard-form');
    const whiteboardMessageEl = document.getElementById('whiteboard-message');
    const whiteboardListEl = document.getElementById('whiteboard-list');
    const choreForm = document.getElementById('chore-form');
    const choreDescriptionEl = document.getElementById('chore-description');
    const choreDurationEl = document.getElementById('chore-duration');
    const oneTimeChoreListEl = document.getElementById('one-time-chore-list');
    const recurringChoreListEl = document.getElementById('recurring-chore-list');
    const completedChoreListEl = document.getElementById('completed-chore-list');
    const shoppingItemForm = document.getElementById('shopping-item-form');
    const shoppingItemDescriptionEl = document.getElementById('shopping-item-description');
    const shoppingItemTypeEl = document.getElementById('shopping-item-type');
    const shoppingListEl = document.getElementById('shopping-list');
    const wishlistEl = document.getElementById('wishlist');
    const recentlyPurchasedListEl = document.getElementById('recently-purchased-list');
    const resetButton = document.getElementById('reset-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFileEl = document.getElementById('import-file');
    const loadTestDataButton = document.getElementById('load-test-data-button');

    // --- Settings DOM Elements ---
    const roommate1NameInput = document.getElementById('roommate1-name');
    const roommate2NameInput = document.getElementById('roommate2-name');
    const themeToggleSettings = document.getElementById('theme-toggle-settings');
    const expenseCategoryListEl = document.getElementById('expense-category-list');
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryNameInput = document.getElementById('new-category-name');

    // --- Chart instances ---
    let contributionChart = null;
    let categoryChart = null;

    // --- State ---
    let state = {};
    const defaultState = {
        fundBalance: 0,
        contributions: {},
        fundHistory: [],
        mileageTotal: 0,
        mileageSettings: { mpg: 25, gasCost: 3.75, maintenance: 0.05, convenience: 0.05 },
        mileageHistory: [],
        whiteboard: [],
        chores: [],
        completedChores: [],
        shoppingList: [],
        wishlist: [],
        recentlyPurchased: [],
        roommates: ['Sage', 'Emily'],
        expenseCategories: ['Groceries', 'Utilities', 'Entertainment', 'Dining Out', 'Other'],
    };

    // --- Helper Functions ---
    const getPersonClass = (person) => state.roommates.indexOf(person) === 0 ? 'sage' : 'emily';
    const getPersonName = (index) => state.roommates[index] || `Roommate ${index + 1}`;

    // --- Data Persistence & Migration ---
    function saveData() {
        localStorage.setItem('expenseTrackerState', JSON.stringify(state));
    }

    function loadData() {
        const savedState = localStorage.getItem('expenseTrackerState');
        let loadedState = savedState ? JSON.parse(savedState) : {};

        // Merge loaded state with defaults to ensure all keys are present
        state = { ...defaultState, ...loadedState };

        // Initialize contributions object if it's missing or doesn't match roommates
        const currentContribKeys = Object.keys(state.contributions);
        if (state.roommates.length !== currentContribKeys.length || !state.roommates.every(r => currentContribKeys.includes(r))) {
            const newContributions = {};
            state.roommates.forEach(r => {
                newContributions[r] = state.contributions[r] || 0;
            });
            state.contributions = newContributions;
        }

        // Simple migration for whiteboard messages to include a person
        state.whiteboard.forEach(item => {
            if (!item.person) {
                item.person = state.roommates[0]; // Default to first roommate
            }
        });

        purgeOldCompletedChores();
        purgeOldRecentlyPurchased();
        saveData();
    }

    // --- Calculation Helpers ---
    function calculateEffectiveRate() {
        const s = state.mileageSettings;
        if (s.mpg === 0) return s.maintenance + s.convenience;
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
        // Update UI elements that depend on roommate names first
        document.title = `${getPersonName(0)} & ${getPersonName(1)}'s Expense Tracker`;
        document.querySelector('.contribution-stats p:nth-child(1) b').textContent = `${getPersonName(0)}:`;
        document.querySelector('.contribution-stats p:nth-child(2) b').textContent = `${getPersonName(1)}:`;
        document.querySelector('.main-title').textContent = `${getPersonName(0)[0]}&${getPersonName(1)[0]} Tracker`;
        document.querySelector('.whiteboard-post-btn[data-person="Sage"]').textContent = `Post as ${getPersonName(0)}`;
        document.querySelector('.whiteboard-post-btn[data-person="Emily"]').textContent = `Post as ${getPersonName(1)}`;


        // Render Fund
        fundBalanceEl.textContent = `$${state.fundBalance.toFixed(2)}`;
        fundHistoryEl.innerHTML = '';
        state.fundHistory.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            const originalIndex = state.fundHistory.length - 1 - index;
            const date = new Date(item.date).toLocaleString();
            let content;

            if (item.type === 'contribution') {
                const personClass = getPersonClass(item.person);
                content = `<div><span class="person-name ${personClass}">${item.person}</span> contributed <span style="color: green;">+$${Math.abs(item.amount).toFixed(2)}</span></div><small>${date}</small>`;
            } else {
                const categoryLabel = item.category ? ` <span class="category-chip">${item.category}</span>` : '';
                content = `<div>${item.description}${categoryLabel} <span style="color: red;">-$${Math.abs(item.amount).toFixed(2)}</span></div><small>${date}</small>`;
            }
            li.innerHTML = `<div>${content}</div><button class="delete-btn" data-type="fund" data-index="${originalIndex}">&times;</button>`;
            fundHistoryEl.appendChild(li);
        });

        // Render Analytics
        const [p1, p2] = state.roommates;
        const p1Total = state.contributions[p1] || 0, p2Total = state.contributions[p2] || 0;
        sageTotalContribEl.textContent = `$${p1Total.toFixed(2)}`;
        emilyTotalContribEl.textContent = `$${p2Total.toFixed(2)}`;
        const p1Avg = calculateMonthlyAverage(p1), p2Avg = calculateMonthlyAverage(p2);
        sageAvgContribEl.textContent = `$${p1Avg.toFixed(2)}`;
        emilyAvgContribEl.textContent = `$${p2Avg.toFixed(2)}`;
        const diff = p1Total - p2Total;
        if (diff > 5) { equalizerTextEl.innerHTML = `<span class="person-name ${getPersonClass(p2)}">${p2}</span> needs to add <b>$${diff.toFixed(2)}</b> to catch up.`; }
        else if (diff < -5) { equalizerTextEl.innerHTML = `<span class="person-name ${getPersonClass(p1)}">${p1}</span> needs to add <b>$${Math.abs(diff).toFixed(2)}</b> to catch up.`; }
        else { equalizerTextEl.textContent = 'Contributions are balanced.'; }

        // Render Mileage
        mileageTotalEl.textContent = `$${state.mileageTotal.toFixed(2)}`;
        effectiveRateEl.textContent = calculateEffectiveRate().toFixed(2);
        mileageHistoryEl.innerHTML = '';
        state.mileageHistory.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            const originalIndex = state.mileageHistory.length - 1 - index;
            const date = new Date(item.date).toLocaleString();
            let content;
            if (item.type === 'payment') {
                content = `<div>Payment Received <span style="color: green;">-$${item.amount.toFixed(2)}</span></div><small>${date}</small>`;
            } else {
                content = `<div>${item.description} (${item.miles} miles) <span>$${item.cost.toFixed(2)}</span></div><small>${date}</small>`;
            }
            li.innerHTML = `<div>${content}</div><button class="delete-btn" data-type="mileage" data-index="${originalIndex}">&times;</button>`;
            mileageHistoryEl.appendChild(li);
        });

        // Render Whiteboard
        whiteboardListEl.innerHTML = '';
        state.whiteboard.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            const originalIndex = state.whiteboard.length - 1 - index;
            const date = new Date(item.date).toLocaleString();
            const personClass = getPersonClass(item.person);

            li.innerHTML = `
                <div style="flex-grow: 1;">
                    <p style="margin: 0; padding: 0; font-weight: normal;">${item.message}</p>
                    <small>Posted by <span class="person-name ${personClass}">${item.person}</span> - ${date}</small>
                </div>
                <button class="delete-btn" data-type="whiteboard" data-index="${originalIndex}">&times;</button>
            `;
            whiteboardListEl.appendChild(li);
        });

        // Render Dropdowns
        populateDropdown(contributionPersonEl, state.roommates);
        populateDropdown(expenseCategoryEl, state.expenseCategories);

        renderCharts();
        renderChores();
        renderShoppingList();
        renderSettings();
    }

    function populateDropdown(selectElement, options) {
        const currentValue = selectElement.value;
        selectElement.innerHTML = '';
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            selectElement.appendChild(optionEl);
        });
        if (options.includes(currentValue)) {
            selectElement.value = currentValue;
        }
    }

    function renderChores() {
        oneTimeChoreListEl.innerHTML = '';
        recurringChoreListEl.innerHTML = '';
        completedChoreListEl.innerHTML = '';
        const now = new Date();
        const [p1, p2] = state.roommates;

        const oneTimeChores = state.chores.filter(c => c.isOneTime);
        const recurringChores = state.chores.filter(c => !c.isOneTime);

        const renderChoreItem = (chore, isRecurring) => {
            const personClass1 = getPersonClass(p1);
            const personClass2 = getPersonClass(p2);
            let timerHtml = '';
            if (isRecurring) {
                const lastCompletedDate = chore.lastCompletedDate ? new Date(chore.lastCompletedDate) : null;
                const dueDate = lastCompletedDate ? new Date(lastCompletedDate.getTime() + chore.durationDays * 86400000) : null;
                let timerText = 'New', timerColor = 'blue';
                if (dueDate) {
                    const diffTime = dueDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 1) { timerText = `Due in ${diffDays} days`; timerColor = 'green'; }
                    else if (diffDays === 1) { timerText = 'Due tomorrow'; timerColor = 'orange'; }
                    else if (diffDays === 0) { timerText = 'Due today'; timerColor = 'red'; }
                    else { timerText = `Overdue by ${-diffDays} day(s)`; timerColor = 'darkred'; }
                }
                const lastCompletedByClass = chore.lastCompletedBy ? getPersonClass(chore.lastCompletedBy) : '';
                const lastCompletedText = chore.lastCompletedBy ? `Last done by <span class="person-name ${lastCompletedByClass}">${chore.lastCompletedBy}</span> on ${lastCompletedDate.toLocaleDateString()}` : 'Not yet completed';
                timerHtml = `
                    <div class="chore-status">
                        <span class="chore-timer" style="color: ${timerColor};">${timerText}</span>
                        <div class="chore-actions">
                            <button class="chore-btn ${personClass1}" data-chore-id="${chore.id}" data-person="${p1}">${p1} did it</button>
                            <button class="chore-btn ${personClass2}" data-chore-id="${chore.id}" data-person="${p2}">${p2} did it</button>
                        </div>
                    </div>`;
            } else {
                 timerHtml = `<div class="chore-actions">
                        <button class="chore-btn ${personClass1}" data-chore-id="${chore.id}" data-person="${p1}">${p1} did it</button>
                        <button class="chore-btn ${personClass2}" data-chore-id="${chore.id}" data-person="${p2}">${p2} did it</button>
                    </div>`;
            }

            const age = Math.floor((now - new Date(chore.creationDate)) / (1000 * 60 * 60 * 24));
            const ageText = age > 0 ? ` (added ${age}d ago)` : ' (added today)';
            const lastCompletedText = isRecurring ? (chore.lastCompletedBy ? `Last done by <span class="person-name ${getPersonClass(chore.lastCompletedBy)}">${chore.lastCompletedBy}</span> on ${new Date(chore.lastCompletedDate).toLocaleDateString()}` : 'Not yet completed') : `Added ${new Date(chore.creationDate).toLocaleDateString()}${ageText}`;

            return `
                <li class="chore-item">
                    <div class="chore-info">
                        <span class="chore-description">${chore.description}</span>
                        <small class="chore-last-completed">${lastCompletedText}</small>
                    </div>
                    ${timerHtml}
                </li>`;
        };

        if (oneTimeChores.length === 0) oneTimeChoreListEl.innerHTML = '<li>No one-time chores.</li>';
        else oneTimeChores.sort((a,b) => new Date(a.creationDate) - new Date(b.creationDate)).forEach(c => oneTimeChoreListEl.innerHTML += renderChoreItem(c, false));

        if (recurringChores.length === 0) recurringChoreListEl.innerHTML = '<li>No recurring chores.</li>';
        else recurringChores.sort((a, b) => {
                const aDueDate = a.lastCompletedDate ? new Date(new Date(a.lastCompletedDate).getTime() + a.durationDays * 86400000) : now;
                const bDueDate = b.lastCompletedDate ? new Date(new Date(b.lastCompletedDate).getTime() + b.durationDays * 86400000) : now;
                return aDueDate - bDueDate;
            }).forEach(c => recurringChoreListEl.innerHTML += renderChoreItem(c, true));

        if (state.completedChores.length === 0) completedChoreListEl.innerHTML = '<li>No chores completed recently.</li>';
        else state.completedChores.sort((a,b) => new Date(b.completionDate) - new Date(a.completionDate)).forEach(chore => {
            const personClass = getPersonClass(chore.lastCompletedBy);
            completedChoreListEl.innerHTML += `
                <li class="chore-item completed">
                    <div class="chore-info">
                        <span class="chore-description">${chore.description}</span>
                        <small class="chore-last-completed">Completed by <span class="person-name ${personClass}">${chore.lastCompletedBy}</span> on ${new Date(chore.completionDate).toLocaleDateString()}</small>
                    </div>
                </li>`;
        });
    }

    function renderCharts() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        if (contributionChart) contributionChart.destroy();
        if (categoryChart) categoryChart.destroy();

        const [p1, p2] = state.roommates;
        const p1Class = getPersonClass(p1);
        const p2Class = getPersonClass(p2);

        // Contribution Chart
        const contributionCtx = document.getElementById('contribution-chart').getContext('2d');
        const contributions = state.fundHistory.filter(item => item.type === 'contribution');
        if (contributions.length > 0) {
            contributions.sort((a, b) => new Date(a.date) - new Date(b.date));
            const dailyContributions = new Map();
            contributions.forEach(c => {
                const date = new Date(c.date).toLocaleDateString();
                if (!dailyContributions.has(date)) dailyContributions.set(date, { [p1]: 0, [p2]: 0 });
                dailyContributions.get(date)[c.person] += c.amount;
            });
            const labels = [], p1Data = [], p2Data = [];
            let p1Cumulative = 0, p2Cumulative = 0;
            for (const [date, dailyTotal] of dailyContributions.entries()) {
                labels.push(date);
                p1Cumulative += dailyTotal[p1];
                p2Cumulative += dailyTotal[p2];
                p1Data.push(p1Cumulative);
                p2Data.push(p2Cumulative);
            }
            contributionChart = new Chart(contributionCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: `${p1}'s Contributions`, data: p1Data, borderColor: p1Class === 'sage' ? '#9b59b6' : '#3498db', backgroundColor: p1Class === 'sage' ? 'rgba(155, 89, 182, 0.1)' : 'rgba(52, 152, 219, 0.1)', fill: true, tension: 0.1
                    }, {
                        label: `${p2}'s Contributions`, data: p2Data, borderColor: p2Class === 'emily' ? '#3498db' : '#9b59b6', backgroundColor: p2Class === 'emily' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(155, 89, 182, 0.1)', fill: true, tension: 0.1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { labels: { color: textColor } } } }
            });
        }

        // Category Chart
        const categoryCtx = document.getElementById('category-chart').getContext('2d');
        const categoryTotals = {};
        let totalExpenses = 0;
        state.fundHistory.forEach(item => {
            if (item.type === 'expense') {
                const amount = Math.abs(item.amount);
                if (!categoryTotals[item.category]) categoryTotals[item.category] = 0;
                categoryTotals[item.category] += amount;
                totalExpenses += amount;
            }
        });
        if (totalExpenses > 0) {
            const categoryLabels = Object.keys(categoryTotals);
            const categoryData = Object.values(categoryTotals);
            categoryChart = new Chart(categoryCtx, {
                type: 'pie',
                data: {
                    labels: categoryLabels,
                    datasets: [{ data: categoryData, backgroundColor: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'], borderWidth: 1, borderColor: isDarkMode ? '#34495e' : '#ffffff' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } }, tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.parsed.toFixed(2)} (${(ctx.parsed / totalExpenses * 100).toFixed(1)}%)` } } } }
            });
        }
    }

    function renderSettings() {
        // General
        roommate1NameInput.value = getPersonName(0);
        roommate2NameInput.value = getPersonName(1);
        themeToggleSettings.checked = document.body.classList.contains('dark-mode');

        // Mileage
        mpgInput.value = state.mileageSettings.mpg;
        gasCostInput.value = state.mileageSettings.gasCost;
        maintenanceFeeInput.value = state.mileageSettings.maintenance;
        convenienceFeeInput.value = state.mileageSettings.convenience;

        // Categories
        expenseCategoryListEl.innerHTML = '';
        state.expenseCategories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${cat}</span><button class="delete-btn delete-category-btn" data-category="${cat}">&times;</button>`;
            expenseCategoryListEl.appendChild(li);
        });
    }

    // --- Logic Functions ---
    function recalculateTotals() {
        state.fundBalance = 0;
        state.contributions = {};
        state.roommates.forEach(r => state.contributions[r] = 0);

        state.fundHistory.forEach(item => {
            if (item.type === 'contribution') {
                state.fundBalance += item.amount;
                if (state.contributions[item.person] !== undefined) state.contributions[item.person] += item.amount;
            } else if (item.type === 'expense') {
                state.fundBalance += item.amount;
            }
        });

        const effectiveRate = calculateEffectiveRate();
        state.mileageTotal = 0;
        state.mileageHistory.forEach(item => {
            if (item.type === 'trip') {
                item.cost = item.miles * effectiveRate;
                state.mileageTotal += item.cost;
            } else if (item.type === 'payment') {
                state.mileageTotal -= item.amount;
            }
        });
    }

    function deleteItem(type, index, event) {
        if (event.shiftKey || confirm('Are you sure you want to delete this item?')) {
            const array = state[type === 'fund' ? 'fundHistory' : type === 'mileage' ? 'mileageHistory' : 'whiteboard'];
            array.splice(index, 1);
            if (type === 'fund' || type === 'mileage') recalculateTotals();
            saveData();
            render();
        }
    }

    function resetAllData() { if (confirm('Are you sure? This will delete all data.')) { localStorage.removeItem('expenseTrackerState'); location.reload(); } }
    function exportData() {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 's&e-tracker-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedState = JSON.parse(event.target.result);
                if (confirm('Import data? This will overwrite current data.')) {
                    state = { ...defaultState, ...importedState };
                    saveData();
                    render();
                    alert('Import successful!');
                }
            } catch (err) { alert('Error reading file.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function addContribution(e) { e.preventDefault(); const p = contributionPersonEl.value, a = parseFloat(contributionAmountEl.value); if(isNaN(a)||a<=0)return; state.fundBalance+=a; state.contributions[p]+=a; state.fundHistory.push({type:'contribution',person:p,amount:a,date:new Date().toISOString()}); contributionAmountEl.value=''; saveData(); render(); }
    function addExpense(e) { e.preventDefault(); const d = expenseDescriptionEl.value, c = expenseCategoryEl.value, a = parseFloat(expenseAmountEl.value); if(!d||!c||isNaN(a)||a<=0)return; state.fundBalance-=a; state.fundHistory.push({type:'expense',description:d,category:c,amount:-a,date:new Date().toISOString()}); expenseDescriptionEl.value=''; expenseAmountEl.value=''; saveData(); render(); }

    function addMessage(e) {
        e.preventDefault();
        const person = e.submitter.dataset.person === 'Sage' ? state.roommates[0] : state.roommates[1];
        const message = whiteboardMessageEl.value;
        if (!message || !person) return;
        state.whiteboard.push({ message, person, date: new Date().toISOString() });
        whiteboardMessageEl.value = '';
        saveData();
        render();
    }

    function purgeOldCompletedChores() {
        if (!state.completedChores) state.completedChores = [];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        state.completedChores = state.completedChores.filter(c => new Date(c.completionDate).getTime() > thirtyDaysAgo);
    }
    function addChore(e) { e.preventDefault(); const d=choreDescriptionEl.value, t=choreDurationEl.value; if(!d)return; const isOneTime=!t, dur=isOneTime?null:parseInt(t,10); if(!isOneTime&&(isNaN(dur)||dur<=0)){alert('Invalid duration.');return;} state.chores.push({id:`c_${Date.now()}`,description:d,isOneTime,durationDays:dur,creationDate:new Date().toISOString(),lastCompletedBy:null,lastCompletedDate:null}); choreDescriptionEl.value='';choreDurationEl.value=''; saveData(); render(); }
    function completeChore(id, person) { const i=state.chores.findIndex(c=>c.id===id); if(i===-1)return; const chore=state.chores[i]; chore.lastCompletedBy=person; chore.lastCompletedDate=new Date().toISOString(); if(chore.isOneTime){chore.completionDate=new Date().toISOString();state.completedChores.push(chore);state.chores.splice(i,1);} saveData(); render(); }
    function logTrip(e) { e.preventDefault(); const d=tripDescriptionEl.value, m=parseFloat(tripMilesEl.value); if(!d||isNaN(m)||m<=0)return; const c=m*calculateEffectiveRate(); state.mileageTotal+=c; state.mileageHistory.push({type:'trip',description:d,miles:m,cost:c,date:new Date().toISOString()}); tripDescriptionEl.value='';tripMilesEl.value=''; saveData(); render(); }
    function recordMileagePayment(e) { e.preventDefault(); const a=parseFloat(paymentAmountEl.value); if(isNaN(a)||a<=0)return; state.mileageTotal-=a; state.mileageHistory.push({type:'payment',amount:a,date:new Date().toISOString()}); paymentAmountEl.value=''; saveData(); render(); }

    function updateMileageSettings() {
        state.mileageSettings = { mpg: parseFloat(mpgInput.value)||0, gasCost: parseFloat(gasCostInput.value)||0, maintenance: parseFloat(maintenanceFeeInput.value)||0, convenience: parseFloat(convenienceFeeInput.value)||0 };
        recalculateTotals();
        saveData();
        render();
    }

    function updateRoommateName(index, newName) {
        const oldName = state.roommates[index];
        if (!newName || newName === oldName) return;

        // Update name in roommates array
        state.roommates[index] = newName;

        // Update contributions object
        if (state.contributions[oldName] !== undefined) {
            state.contributions[newName] = state.contributions[oldName];
            delete state.contributions[oldName];
        }

        // Update history
        state.fundHistory.forEach(item => { if (item.person === oldName) item.person = newName; });
        state.chores.forEach(item => { if (item.lastCompletedBy === oldName) item.lastCompletedBy = newName; });
        state.completedChores.forEach(item => { if (item.lastCompletedBy === oldName) item.lastCompletedBy = newName; });
        state.whiteboard.forEach(item => { if (item.person === oldName) item.person = newName; });

        saveData();
        render();
    }

    function addExpenseCategory(e) {
        e.preventDefault();
        const newCategory = newCategoryNameInput.value.trim();
        if (newCategory && !state.expenseCategories.includes(newCategory)) {
            state.expenseCategories.push(newCategory);
            newCategoryNameInput.value = '';
            saveData();
            render();
        }
    }

    function deleteExpenseCategory(category) {
        if (state.fundHistory.some(item => item.category === category)) {
            alert(`Cannot delete category "${category}" as it is used in the fund history.`);
            return;
        }
        if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
            state.expenseCategories = state.expenseCategories.filter(c => c !== category);
            saveData();
            render();
        }
    }

    function renderShoppingList() {
        shoppingListEl.innerHTML = '';
        wishlistEl.innerHTML = '';
        recentlyPurchasedListEl.innerHTML = '';
        const [p1, p2] = state.roommates;

        const renderItem = (item, listType) => {
            const personClass1 = getPersonClass(p1);
            const personClass2 = getPersonClass(p2);
            let actionButtons = '';
            if (listType === 'shopping' || listType === 'wish') {
                 if (item.claimedBy) {
                    const claimedClass = getPersonClass(item.claimedBy);
                    actionButtons = `<div class="shopping-actions"><span class="claimed-by ${claimedClass}">${item.claimedBy} will buy</span> <button class="shopping-btn unclaim" data-id="${item.id}" data-list="${listType}">Unclaim</button> <button class="shopping-btn purchase" data-id="${item.id}" data-list="${listType}">Purchased</button></div>`;
                } else {
                    actionButtons = `<div class="shopping-actions"><button class="shopping-btn claim ${personClass1}" data-id="${item.id}" data-person="${p1}" data-list="${listType}">${p1} will buy</button> <button class="shopping-btn claim ${personClass2}" data-id="${item.id}" data-person="${p2}" data-list="${listType}">${p2} will buy</button></div>`;
                }
            }
            const addedByClass = getPersonClass(item.addedBy);
            return `
                <li class="shopping-item">
                    <div class="shopping-info">
                        <span class="shopping-description">${item.description}</span>
                        <small>Added by <span class="person-name ${addedByClass}">${item.addedBy}</span> on ${new Date(item.date).toLocaleDateString()}</small>
                    </div>
                    ${actionButtons}
                </li>`;
        };

        if(state.shoppingList.length === 0) shoppingListEl.innerHTML = '<li>Nothing to buy.</li>';
        else state.shoppingList.forEach(item => shoppingListEl.innerHTML += renderItem(item, 'shopping'));

        if(state.wishlist.length === 0) wishlistEl.innerHTML = '<li>No wishes yet.</li>';
        else state.wishlist.forEach(item => wishlistEl.innerHTML += renderItem(item, 'wish'));

        if (state.recentlyPurchased.length === 0) recentlyPurchasedListEl.innerHTML = '<li>No items purchased recently.</li>';
        else state.recentlyPurchased.sort((a,b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)).forEach(item => {
            const purchaserClass = getPersonClass(item.purchasedBy);
            recentlyPurchasedListEl.innerHTML += `
                <li class="shopping-item purchased">
                    <div class="shopping-info">
                        <span class="shopping-description">${item.description}</span>
                        <small>Purchased by <span class="person-name ${purchaserClass}">${item.purchasedBy}</span> on ${new Date(item.purchaseDate).toLocaleDateString()}</small>
                    </div>
                </li>`;
        });
    }

     function addShoppingItem(e) {
        e.preventDefault();
        const description = shoppingItemDescriptionEl.value.trim();
        const type = shoppingItemTypeEl.value;
        if (!description) return;

        const person = state.roommates[0]; // For now, default to first roommate. A better implementation might ask who is adding it.

        const newItem = {
            id: `s_${Date.now()}`,
            description,
            addedBy: person,
            date: new Date().toISOString(),
            claimedBy: null
        };

        if (type === 'list') {
            state.shoppingList.push(newItem);
        } else {
            state.wishlist.push(newItem);
        }

        shoppingItemDescriptionEl.value = '';
        saveData();
        render();
    }

    function claimShoppingItem(id, person, listType) {
        const list = listType === 'shopping' ? state.shoppingList : state.wishlist;
        const item = list.find(i => i.id === id);
        if (item) {
            item.claimedBy = person;
            saveData();
            render();
        }
    }

    function unclaimShoppingItem(id, listType) {
        const list = listType === 'shopping' ? state.shoppingList : state.wishlist;
        const item = list.find(i => i.id === id);
        if (item) {
            item.claimedBy = null;
            saveData();
            render();
        }
    }

    function purchaseShoppingItem(id, listType) {
        const list = listType === 'shopping' ? state.shoppingList : state.wishlist;
        const itemIndex = list.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            const item = list[itemIndex];
            if (!item.claimedBy) {
                alert("Please claim the item before marking it as purchased.");
                return;
            }
            const purchasedItem = {
                ...item,
                purchasedBy: item.claimedBy,
                purchaseDate: new Date().toISOString()
            };
            state.recentlyPurchased.push(purchasedItem);
            list.splice(itemIndex, 1);
            purgeOldRecentlyPurchased();
            saveData();
            render();
        }
    }

    function purgeOldRecentlyPurchased() {
        if (!state.recentlyPurchased) state.recentlyPurchased = [];
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        state.recentlyPurchased = state.recentlyPurchased.filter(i => new Date(i.purchaseDate).getTime() > sevenDaysAgo);
    }


    // --- Theme Switcher ---
    function switchTheme(isDark) {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.body.classList.toggle('dark-mode', isDark);
        themeToggle.checked = isDark;
        themeToggleSettings.checked = isDark;
        renderCharts(); // Re-render charts for color change
    }
    function loadTheme() { switchTheme(localStorage.getItem('theme') === 'dark'); }

    // --- Event Listeners ---
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            const type = e.target.dataset.type;
            const index = parseInt(e.target.dataset.index, 10);
            deleteItem(type, index, e);
        }
        if (e.target.matches('.chore-btn')) {
            completeChore(e.target.dataset.choreId, e.target.dataset.person);
        }
        if (e.target.matches('.delete-category-btn')) {
            deleteExpenseCategory(e.target.dataset.category);
        }
        if (e.target.matches('.shopping-btn.claim')) {
            claimShoppingItem(e.target.dataset.id, e.target.dataset.person, e.target.dataset.list);
        }
        if (e.target.matches('.shopping-btn.unclaim')) {
            unclaimShoppingItem(e.target.dataset.id, e.target.dataset.list);
        }
        if (e.target.matches('.shopping-btn.purchase')) {
            purchaseShoppingItem(e.target.dataset.id, e.target.dataset.list);
        }
    });

    contributionForm.addEventListener('submit', addContribution);
    expenseForm.addEventListener('submit', addExpense);
    mileageForm.addEventListener('submit', logTrip);
    paymentForm.addEventListener('submit', recordMileagePayment);
    whiteboardForm.addEventListener('submit', addMessage);
    mileageSettingsForm.addEventListener('change', updateMileageSettings);
    resetButton.addEventListener('click', resetAllData);
    exportButton.addEventListener('click', exportData);
    importButton.addEventListener('click', () => importFileEl.click());
    importFileEl.addEventListener('change', importData);
    loadTestDataButton.addEventListener('click', () => { if(confirm('Load test data? This will overwrite current data.')){state=generateRandomData();saveData();render();}});
    choreForm.addEventListener('submit', addChore);
    shoppingItemForm.addEventListener('submit', addShoppingItem);
    addCategoryForm.addEventListener('submit', addExpenseCategory);
    roommate1NameInput.addEventListener('change', (e) => updateRoommateName(0, e.target.value));
    roommate2NameInput.addEventListener('change', (e) => updateRoommateName(1, e.target.value));
    themeToggle.addEventListener('change', (e) => switchTheme(e.target.checked));
    themeToggleSettings.addEventListener('change', (e) => switchTheme(e.target.checked));


    // --- Card Navigation ---
    const container = document.querySelector('.container');
    const cards = document.querySelectorAll('.card');
    const navLeft = document.getElementById('nav-left');
    const navRight = document.getElementById('nav-right');
    const navButtons = document.querySelectorAll('.nav-button');
    let currentCardIndex = 0;

    function updateNavigation() {
        navLeft.style.display = currentCardIndex === 0 ? 'none' : 'flex';
        navRight.style.display = currentCardIndex === cards.length - 1 ? 'none' : 'flex';
        navButtons.forEach((btn, i) => btn.classList.toggle('active', i === currentCardIndex));
    }
    function scrollToCard(index, smooth = true) {
        currentCardIndex = index;
        container.scrollTo({ left: container.offsetWidth * index, behavior: smooth ? 'smooth' : 'instant' });
        updateNavigation();
    }
    navButtons.forEach((btn, i) => btn.addEventListener('click', () => scrollToCard(i)));
    navLeft.addEventListener('click', () => { if (currentCardIndex > 0) scrollToCard(currentCardIndex - 1); });
    navRight.addEventListener('click', () => { if (currentCardIndex < cards.length - 1) scrollToCard(currentCardIndex + 1); });
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const newIndex = Math.round(container.scrollLeft / container.offsetWidth);
            if (newIndex !== currentCardIndex) {
                currentCardIndex = newIndex;
                updateNavigation();
            }
        }, 150);
    });

    // --- Initial Load ---
    loadData();
    loadTheme();
    render();
    updateNavigation();
});
