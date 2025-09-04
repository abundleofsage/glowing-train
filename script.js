document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // Category Breakdown DOM Elements
    const categoryBreakdownListEl = document.getElementById('category-breakdown-list');

    // Chore DOM Elements
    const choreForm = document.getElementById('chore-form');
    const choreDescriptionEl = document.getElementById('chore-description');
    const choreDurationEl = document.getElementById('chore-duration');
    const oneTimeChoreListEl = document.getElementById('one-time-chore-list');
    const recurringChoreListEl = document.getElementById('recurring-chore-list');
    const completedChoreListEl = document.getElementById('completed-chore-list');

    // Control DOM Elements
    const resetButton = document.getElementById('reset-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFileEl = document.getElementById('import-file');
    const loadTestDataButton = document.getElementById('load-test-data-button');

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
        chores: [],
        completedChores: [],
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
            if (!state.chores) state.chores = [];
            if (!state.completedChores) state.completedChores = [];

            purgeOldCompletedChores();

            // --- Data Migration: v3 -> v4 (Add Expense Categories) ---
            let migrationNeeded = false;
            state.fundHistory.forEach(item => {
                if (item.type === 'expense' && !item.category) {
                    item.category = 'Other';
                    migrationNeeded = true;
                }
            });
            if (migrationNeeded) console.log("Migrating expense data to v4...");

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
        state.fundHistory.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            const originalIndex = state.fundHistory.length - 1 - index;
            const date = new Date(item.date).toLocaleString();
            let description = '', sign = '', color = '';
            let content;

            if (item.type === 'contribution') {
                description = `${item.person} contributed`;
                sign = '+';
                color = 'green';
                content = `<div>${description} <span style="color: ${color};">${sign}$${Math.abs(item.amount).toFixed(2)}</span></div><small>${date}</small>`;
            } else {
                description = item.description;
                sign = '-';
                color = 'red';
                const categoryLabel = item.category ? ` <span class="category-chip">${item.category}</span>` : '';
                content = `<div>${description}${categoryLabel} <span style="color: ${color};">${sign}$${Math.abs(item.amount).toFixed(2)}</span></div><small>${date}</small>`;
            }

            const deleteBtn = `<button class="delete-btn" data-type="fund" data-index="${originalIndex}">&times;</button>`;
            li.innerHTML = `<div>${content}</div>${deleteBtn}`;
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
            const deleteBtn = `<button class="delete-btn" data-type="mileage" data-index="${originalIndex}">&times;</button>`;
            li.innerHTML = `<div>${content}</div>${deleteBtn}`;
            mileageHistoryEl.appendChild(li);
        });

        // Render Whiteboard
        whiteboardListEl.innerHTML = '';
        state.whiteboard.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            const originalIndex = state.whiteboard.length - 1 - index;
            const date = new Date(item.date).toLocaleString();

            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = `<span>${item.message}</span><small style="align-self: flex-end;">${date}</small>`;
            contentDiv.style.display = 'flex';
            contentDiv.style.flexDirection = 'column';
            contentDiv.style.alignItems = 'flex-start';
            contentDiv.style.flexGrow = '1';

            const deleteBtn = `<button class="delete-btn" data-type="whiteboard" data-index="${originalIndex}">&times;</button>`;

            li.appendChild(contentDiv);
            li.insertAdjacentHTML('beforeend', deleteBtn);
            whiteboardListEl.appendChild(li);
        });

        renderCategoryBreakdown();
        renderChores();
    }

    function renderChores() {
        oneTimeChoreListEl.innerHTML = '';
        recurringChoreListEl.innerHTML = '';
        completedChoreListEl.innerHTML = '';
        const now = new Date();

        const oneTimeChores = state.chores.filter(c => c.isOneTime);
        const recurringChores = state.chores.filter(c => !c.isOneTime);

        // Render One-Time Chores
        if (oneTimeChores.length === 0) {
            oneTimeChoreListEl.innerHTML = '<li>No one-time chores.</li>';
        } else {
            oneTimeChores.sort((a, b) => new Date(a.creationDate) - new Date(b.creationDate)).forEach(chore => {
                const li = document.createElement('li');
                const age = Math.floor((now - new Date(chore.creationDate)) / (1000 * 60 * 60 * 24));
                const ageText = age > 0 ? ` (added ${age}d ago)` : ' (added today)';
                li.className = 'chore-item';
                li.innerHTML = `
                    <div class="chore-info">
                        <span class="chore-description">${chore.description}</span>
                        <small class="chore-last-completed">Added ${new Date(chore.creationDate).toLocaleDateString()}${ageText}</small>
                    </div>
                    <div class="chore-actions">
                        <button class="chore-btn sage" data-chore-id="${chore.id}" data-person="Sage">Sage did it</button>
                        <button class="chore-btn emily" data-chore-id="${chore.id}" data-person="Emily">Emily did it</button>
                    </div>
                `;
                oneTimeChoreListEl.appendChild(li);
            });
        }

        // Render Recurring Chores
        if (recurringChores.length === 0) {
            recurringChoreListEl.innerHTML = '<li>No recurring chores.</li>';
        } else {
            recurringChores.sort((a, b) => {
                const aDueDate = a.lastCompletedDate ? new Date(new Date(a.lastCompletedDate).getTime() + a.durationDays * 86400000) : now;
                const bDueDate = b.lastCompletedDate ? new Date(new Date(b.lastCompletedDate).getTime() + b.durationDays * 86400000) : now;
                return aDueDate - bDueDate;
            }).forEach(chore => {
                const li = document.createElement('li');
                li.className = 'chore-item';

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

                const lastCompletedText = chore.lastCompletedBy ? `Last done by ${chore.lastCompletedBy} on ${lastCompletedDate.toLocaleDateString()}` : 'Not yet completed';
                li.innerHTML = `
                    <div class="chore-info">
                        <span class="chore-description">${chore.description}</span>
                        <small class="chore-last-completed">${lastCompletedText}</small>
                    </div>
                    <div class="chore-status">
                        <span class="chore-timer" style="color: ${timerColor};">${timerText}</span>
                        <div class="chore-actions">
                            <button class="chore-btn sage" data-chore-id="${chore.id}" data-person="Sage">Sage did it</button>
                            <button class="chore-btn emily" data-chore-id="${chore.id}" data-person="Emily">Emily did it</button>
                        </div>
                    </div>
                `;
                recurringChoreListEl.appendChild(li);
            });
        }

        // Render Completed Chores
        if (state.completedChores.length === 0) {
            completedChoreListEl.innerHTML = '<li>No chores completed recently.</li>';
        } else {
            state.completedChores.sort((a,b) => new Date(b.completionDate) - new Date(a.completionDate)).forEach(chore => {
                const li = document.createElement('li');
                li.className = 'chore-item completed';
                li.innerHTML = `
                    <div class="chore-info">
                        <span class="chore-description">${chore.description}</span>
                        <small class="chore-last-completed">Completed by ${chore.lastCompletedBy} on ${new Date(chore.completionDate).toLocaleDateString()}</small>
                    </div>
                `;
                completedChoreListEl.appendChild(li);
            });
        }
    }

    function renderCategoryBreakdown() {
        categoryBreakdownListEl.innerHTML = '';
        const categoryTotals = {};
        let totalExpenses = 0;

        state.fundHistory.forEach(item => {
            if (item.type === 'expense') {
                const amount = Math.abs(item.amount);
                if (!categoryTotals[item.category]) {
                    categoryTotals[item.category] = 0;
                }
                categoryTotals[item.category] += amount;
                totalExpenses += amount;
            }
        });

        if (totalExpenses === 0) {
            categoryBreakdownListEl.innerHTML = '<li>No expenses recorded yet.</li>';
            return;
        }

        const sortedCategories = Object.entries(categoryTotals).sort(([,a],[,b]) => b - a);

        sortedCategories.forEach(([category, total]) => {
            const percentage = ((total / totalExpenses) * 100).toFixed(1);
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="width: 100%;">
                    <span>${category}</span>
                    <span style="float: right;">$${total.toFixed(2)} (${percentage}%)</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                </div>
            `;
            categoryBreakdownListEl.appendChild(li);
        });
    }

    // --- Logic Functions ---
    function recalculateTotals() {
        // Reset totals to zero
        state.fundBalance = 0;
        state.contributions = { Sage: 0, Emily: 0 };
        state.mileageTotal = 0;
        const effectiveRate = calculateEffectiveRate();

        // Recalculate fund history
        state.fundHistory.forEach(item => {
            if (item.type === 'contribution') {
                state.fundBalance += item.amount;
                if (state.contributions[item.person] !== undefined) {
                    state.contributions[item.person] += item.amount;
                }
            } else if (item.type === 'expense') {
                state.fundBalance += item.amount; // amount is negative for expenses
            }
        });

        // Recalculate mileage history
        state.mileageHistory.forEach(item => {
            if (item.type === 'trip') {
                // Ensure cost is updated if settings changed since original logging
                item.cost = item.miles * effectiveRate;
                state.mileageTotal += item.cost;
            } else if (item.type === 'payment') {
                state.mileageTotal -= item.amount;
            }
        });
    }

    function deleteHistoryItem(type, index, event) {
        const skipConfirm = event.shiftKey;
        const confirmed = skipConfirm || confirm('Are you sure you want to delete this item? This action cannot be undone.');

        if (confirmed) {
            let historyArray;
            if (type === 'fund') {
                historyArray = state.fundHistory;
            } else if (type === 'mileage') {
                historyArray = state.mileageHistory;
            } else if (type === 'whiteboard') {
                historyArray = state.whiteboard;
            } else {
                return; // Should not happen
            }

            historyArray.splice(index, 1);

            if (type === 'fund' || type === 'mileage') {
                recalculateTotals();
            }

            saveData();
            render();
        }
    }

    function resetAllData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            localStorage.removeItem('expenseTrackerState');
            location.reload();
        }
    }

    function exportData() {
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sage-emily-expenses.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function loadTestData() {
        if (confirm('Are you sure you want to load test data? This will overwrite all current data.')) {
            state = generateRandomData(); // This function is from test-data.js
            saveData();
            render();
            alert('Test data loaded and applied!');
        }
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedState = JSON.parse(event.target.result);
                // Basic validation
                if (importedState && typeof importedState === 'object' && 'fundBalance' in importedState) {
                    if (confirm('Are you sure you want to import this data? This will overwrite current data.')) {
                        state = { ...state, ...importedState };
                        saveData();
                        render();
                        alert('Data imported successfully!');
                    }
                } else {
                    alert('Error: Invalid or corrupted data file.');
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Error: Could not parse the file. Make sure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
        // Reset file input so the same file can be loaded again
        importFileEl.value = '';
    }

    function addContribution(e) { e.preventDefault(); const p = contributionPersonEl.value, a = parseFloat(contributionAmountEl.value); if(isNaN(a)||a<=0)return; state.fundBalance+=a; state.contributions[p]+=a; state.fundHistory.push({type:'contribution',person:p,amount:a,date:new Date().toISOString()}); contributionAmountEl.value=''; saveData(); render(); }
    function addExpense(e) { e.preventDefault(); const d = expenseDescriptionEl.value, c = expenseCategoryEl.value, a = parseFloat(expenseAmountEl.value); if(!d||!c||isNaN(a)||a<=0)return; state.fundBalance-=a; state.fundHistory.push({type:'expense',description:d,category:c,amount:-a,date:new Date().toISOString()}); expenseDescriptionEl.value=''; expenseAmountEl.value=''; saveData(); render(); }
    function addMessage(e) { e.preventDefault(); const m=whiteboardMessageEl.value; if(!m)return; state.whiteboard.push({message:m,date:new Date().toISOString()}); whiteboardMessageEl.value=''; saveData(); render(); }
    function purgeOldCompletedChores() {
        if (!state.completedChores || state.completedChores.length === 0) return;
        const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
        state.completedChores = state.completedChores.filter(chore => {
            const completedDate = new Date(chore.completionDate).getTime();
            return completedDate > thirtyDaysAgo;
        });
    }

    function addChore(e) {
        e.preventDefault();
        const description = choreDescriptionEl.value;
        const durationInput = choreDurationEl.value;
        if (!description) return;

        const isOneTime = !durationInput;
        const durationDays = isOneTime ? null : parseInt(durationInput, 10);

        if (!isOneTime && (isNaN(durationDays) || durationDays <= 0)) {
            alert("Please enter a valid number of days for the timer or leave it empty for a one-time chore.");
            return;
        }

        const newChore = {
            id: `chore_${new Date().getTime()}`,
            description,
            isOneTime,
            durationDays,
            creationDate: new Date().toISOString(),
            lastCompletedBy: null,
            lastCompletedDate: null,
        };
        state.chores.push(newChore);
        choreDescriptionEl.value = '';
        choreDurationEl.value = '';
        saveData();
        render();
    }

    function completeChore(choreId, person) {
        const choreIndex = state.chores.findIndex(c => c.id === choreId);
        if (choreIndex === -1) return;

        const chore = state.chores[choreIndex];
        chore.lastCompletedBy = person;
        chore.lastCompletedDate = new Date().toISOString();

        if (chore.isOneTime) {
            chore.completionDate = new Date().toISOString();
            state.completedChores.push(chore);
            state.chores.splice(choreIndex, 1);
        }

        saveData();
        render();
    }

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
    fundHistoryEl.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            deleteHistoryItem(e.target.dataset.type, parseInt(e.target.dataset.index, 10), e);
        }
    });

    mileageHistoryEl.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            deleteHistoryItem(e.target.dataset.type, parseInt(e.target.dataset.index, 10), e);
        }
    });

    whiteboardListEl.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            deleteHistoryItem(e.target.dataset.type, parseInt(e.target.dataset.index, 10), e);
        }
    });

    contributionForm.addEventListener('submit', addContribution);
    expenseForm.addEventListener('submit', addExpense);
    mileageForm.addEventListener('submit', logTrip);
    paymentForm.addEventListener('submit', recordMileagePayment);
    themeToggle.addEventListener('change', switchTheme);
    whiteboardForm.addEventListener('submit', addMessage);
    mileageSettingsForm.addEventListener('change', updateMileageSettings);
    resetButton.addEventListener('click', resetAllData);
    exportButton.addEventListener('click', exportData);
    importButton.addEventListener('click', () => importFileEl.click());
    importFileEl.addEventListener('change', importData);
    loadTestDataButton.addEventListener('click', loadTestData);
    choreForm.addEventListener('submit', addChore);
    const choreCard = document.querySelectorAll('.card')[3]; // Chores is the 4th card
    if (choreCard) {
        choreCard.addEventListener('click', (e) => {
            if (e.target.matches('.chore-btn')) {
                const choreId = e.target.dataset.choreId;
                const person = e.target.dataset.person;
                completeChore(choreId, person);
            }
        });
    }

    // --- Initial Load ---
    loadData();
    loadTheme();
    render();

    // --- Card Navigation Logic ---
    const container = document.querySelector('.container');
    const cards = document.querySelectorAll('.card');
    const navLeft = document.getElementById('nav-left');
    const navRight = document.getElementById('nav-right');
    const topNav = document.getElementById('top-nav');
    const navButtons = document.querySelectorAll('.nav-button');
    let currentCardIndex = 0;

    function updateNavigationState() {
        // Update side arrows
        navLeft.style.display = currentCardIndex === 0 ? 'none' : 'flex';
        navRight.style.display = currentCardIndex === cards.length - 1 ? 'none' : 'flex';

        // Update top nav buttons
        navButtons.forEach((btn, index) => {
            if (index === currentCardIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function scrollToCard(index) {
        const cardWidth = container.offsetWidth;
        container.scrollLeft = cardWidth * index;
        currentCardIndex = index;
        updateNavigationState();
    }

    navLeft.addEventListener('click', () => {
        if (currentCardIndex > 0) {
            scrollToCard(currentCardIndex - 1);
        }
    });

    navRight.addEventListener('click', () => {
        if (currentCardIndex < cards.length - 1) {
            scrollToCard(currentCardIndex + 1);
        }
    });

    topNav.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            const index = parseInt(e.target.dataset.index, 10);
            scrollToCard(index);
        }
    });

    // Also update on scroll (e.g., if user swipes)
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const cardWidth = container.offsetWidth;
            const newIndex = Math.round(container.scrollLeft / cardWidth);
            if (newIndex !== currentCardIndex) {
                currentCardIndex = newIndex;
                updateNavigationState();
            }
        }, 150); // Debounce to avoid excessive calculations during scroll
    });

    // Initial state
    updateNavigationState();
});
