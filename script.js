document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // General
    const themeToggle = document.getElementById('theme-toggle');
    const resetButton = document.getElementById('reset-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFileEl = document.getElementById('import-file');

    // Whiteboard
    const whiteboardForm = document.getElementById('whiteboard-form');
    const whiteboardMessageEl = document.getElementById('whiteboard-message');
    const whiteboardListEl = document.getElementById('whiteboard-list');

    // Consolidated Task Form
    const taskForm = document.getElementById('task-form');
    const taskDescriptionEl = document.getElementById('task-description');
    const taskTypeEl = document.getElementById('task-type');
    const choreOptionsEl = document.getElementById('chore-options');
    const choreDurationEl = document.getElementById('chore-duration');

    // Consolidated Finance Form
    const transactionForm = document.getElementById('transaction-form');
    const transactionTypeEl = document.getElementById('transaction-type');
    const transactionDetailsEl = document.getElementById('transaction-details');

    // Settings
    const themeToggleSettings = document.getElementById('theme-toggle-settings');
    const expenseCategoryListEl = document.getElementById('expense-category-list');
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryNameInput = document.getElementById('new-category-name');
    const mileageSettingsForm = document.getElementById('mileage-settings-form');
    const mpgInput = document.getElementById('mpg');
    const gasCostInput = document.getElementById('gas-cost');
    const maintenanceFeeInput = document.getElementById('maintenance-fee');
    const convenienceFeeInput = document.getElementById('convenience-fee');
    const effectiveRateEl = document.getElementById('effective-rate');

    // --- State ---
    let state = {};
    const defaultState = {
        fundBalance: 0,
        contributions: {},
        mileageTotal: 0,
        mileageSettings: { mpg: 25, gasCost: 3.75, maintenance: 0.05, convenience: 0.05 },
        whiteboard: [],
        tasks: [], // Unified tasks: chores, shopping, wishes
        transactions: [], // Unified transactions
        activityLog: [],
        roommates: ['Sage', 'Emily', 'Susan'],
        expenseCategories: ['Groceries', 'Utilities', 'Entertainment', 'Dining Out', 'Other'],
    };

    // --- Helper Functions ---
    const getPersonClass = (person) => {
        const lowerCasePerson = person.toLowerCase();
        // Return a default or calculated class if not one of the specific roommates
        if (['sage', 'emily', 'susan'].includes(lowerCasePerson)) {
            return lowerCasePerson;
        }
        // Fallback for dynamically added roommates
        const index = state.roommates.indexOf(person);
        const colors = ['#9b59b6', '#3498db', '#2ecc71', '#f1c40f', '#e67e22'];
        return `dynamic-roommate-${index % colors.length}`;
    };
    const getPersonName = (index) => state.roommates[index] || `Roommate ${index + 1}`;

    function findMessageById(messages, id) {
        for (const message of messages) {
            if (message.id === id) return { message, parent: messages };
            if (message.replies && message.replies.length > 0) {
                const found = findMessageById(message.replies, id);
                if (found) return found;
            }
        }
        return null;
    }

    function deleteMessageById(messages, id) {
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].id === id) {
                messages.splice(i, 1);
                return true;
            }
            if (messages[i].replies && messages[i].replies.length > 0) {
                if (deleteMessageById(messages[i].replies, id)) {
                    return true;
                }
            }
        }
        return false;
    }

    // --- Data Persistence & Migration ---
    function saveData() {
        localStorage.setItem('expenseTrackerState', JSON.stringify(state));
    }

    function logActivity(message, amount = null) {
        const entry = {
            date: new Date().toISOString(),
            message: message,
            amount: amount,
        };
        state.activityLog.unshift(entry); // Add to the beginning of the array
        if (state.activityLog.length > 50) { // Keep the log from getting too big
            state.activityLog.pop();
        }
    }

    function loadData() {
        const savedState = localStorage.getItem('expenseTrackerState');
        let loadedState = savedState ? JSON.parse(savedState) : {};

        // Merge loaded state with defaults to ensure all keys are present
        state = { ...defaultState, ...loadedState };

        // <<<< DATA MIGRATION from old structure to new unified transaction structure >>>>
        if (loadedState.fundHistory || loadedState.mileageHistory || loadedState.ious) {
            console.log("Old data structures found. Migrating to unified transactions model...");
            const newTransactions = state.transactions || [];

            // Migrate Fund History
            if (loadedState.fundHistory) {
                loadedState.fundHistory.forEach(item => {
                    if (item.type === 'contribution') {
                        newTransactions.push({
                            id: `txn_${new Date(item.date).getTime()}_${Math.random()}`,
                            type: 'contribution',
                            person: item.person,
                            amount: item.amount,
                            date: item.date
                        });
                    } else if (item.type === 'expense') {
                        newTransactions.push({
                            id: `txn_${new Date(item.date).getTime()}_${Math.random()}`,
                            type: 'expense',
                            description: item.description,
                            category: item.category,
                            amount: Math.abs(item.amount), // Expenses are stored as positive values
                            date: item.date
                        });
                    }
                });
            }

            // Migrate Mileage History
            if (loadedState.mileageHistory) {
                 // Assuming rides from Sage are for Emily, and payments are from Emily to Sage.
                 // This is based on test data and typical roommate setups.
                const mileageProvider = 'Sage';
                const mileageRecipient = 'Emily';
                loadedState.mileageHistory.forEach(item => {
                    if (item.type === 'trip') {
                        newTransactions.push({
                            id: `txn_${new Date(item.date).getTime()}_${Math.random()}`,
                            type: 'mileage',
                            payer: mileageProvider,
                            ower: mileageRecipient,
                            description: item.description,
                            miles: item.miles,
                            // Cost will be calculated dynamically, but we can store the original for posterity
                            originalCost: item.cost,
                            date: item.date
                        });
                    } else if (item.type === 'payment') {
                        newTransactions.push({
                            id: `txn_${new Date(item.date).getTime()}_${Math.random()}`,
                            type: 'iou', // A mileage payment is just an IOU settlement
                            payer: mileageRecipient,
                            ower: mileageProvider,
                            amount: item.amount,
                            description: 'Mileage Payment',
                            date: item.date
                        });
                    }
                });
            }

            // Migrate IOUs
            if (loadedState.ious) {
                loadedState.ious.forEach(item => {
                    newTransactions.push({
                        id: item.id || `txn_${new Date(item.date).getTime()}_${Math.random()}`,
                        type: 'iou',
                        payer: item.payer,
                        ower: item.ower,
                        amount: item.amount,
                        description: item.description,
                        date: item.date
                    });
                });
            }

            // Sort all transactions by date
            newTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
            state.transactions = newTransactions;

            // Clean up old state properties
            delete state.fundHistory;
            delete state.mileageHistory;
            delete state.ious;
            console.log("Migration complete.");
        }

        // <<<< DATA MIGRATION from old task structure to new unified task structure >>>>
        if (loadedState.chores || loadedState.shoppingList || loadedState.wishlist) {
            console.log("Old task data structures found. Migrating to unified tasks model...");
            const newTasks = state.tasks || [];

            // Migrate chores
            if (loadedState.chores) {
                loadedState.chores.forEach(c => {
                    newTasks.push({
                        id: c.id,
                        type: 'chore',
                        description: c.description,
                        isOneTime: c.isOneTime,
                        durationDays: c.durationDays,
                        creationDate: c.creationDate,
                        lastCompletedBy: c.lastCompletedBy,
                        lastCompletedDate: c.lastCompletedDate,
                        status: 'todo' // All active chores are 'todo'
                    });
                });
            }
            if (loadedState.completedChores) {
                loadedState.completedChores.forEach(c => {
                    newTasks.push({
                        id: c.id,
                        type: 'chore',
                        description: c.description,
                        isOneTime: c.isOneTime,
                        durationDays: c.durationDays,
                        creationDate: c.creationDate,
                        lastCompletedBy: c.lastCompletedBy,
                        lastCompletedDate: c.lastCompletedDate,
                        completionDate: c.completionDate,
                        status: 'completed'
                    });
                });
            }

            // Migrate shopping lists
            if (loadedState.shoppingList) {
                loadedState.shoppingList.forEach(s => {
                    newTasks.push({
                        id: s.id,
                        type: 'shopping',
                        description: s.description,
                        addedBy: s.addedBy,
                        date: s.date,
                        claimedBy: s.claimedBy,
                        status: 'todo'
                    });
                });
            }
            if (loadedState.wishlist) {
                loadedState.wishlist.forEach(w => {
                    newTasks.push({
                        id: w.id,
                        type: 'wish',
                        description: w.description,
                        addedBy: w.addedBy,
                        date: w.date,
                        claimedBy: w.claimedBy,
                        status: 'todo'
                    });
                });
            }
            if (loadedState.recentlyPurchased) {
                loadedState.recentlyPurchased.forEach(p => {
                    newTasks.push({
                        id: p.id,
                        type: 'shopping', // Assume purchased items were from shopping list
                        description: p.description,
                        addedBy: p.addedBy,
                        date: p.date,
                        purchasedBy: p.purchasedBy,
                        purchaseDate: p.purchaseDate,
                        status: 'purchased'
                    });
                });
            }

            state.tasks = newTasks;
            delete state.chores;
            delete state.completedChores;
            delete state.shoppingList;
            delete state.wishlist;
            delete state.recentlyPurchased;
            console.log("Task migration complete.");
        }


        // Initialize contributions object if it's missing or doesn't match roommates
        const currentContribKeys = Object.keys(state.contributions);
        if (state.roommates.length !== currentContribKeys.length || !state.roommates.every(r => currentContribKeys.includes(r))) {
            const newContributions = {};
            state.roommates.forEach(r => {
                newContributions[r] = state.contributions[r] || 0;
            });
            state.contributions = newContributions;
        }

        // Migration for whiteboard messages
        const migrateMessages = (messages) => {
            if (!messages) return;
            messages.forEach(item => {
                if (!item.person) {
                    item.person = state.roommates[0]; // Default to first roommate
                }
                if (!item.replies) {
                    item.replies = [];
                }
                if (!item.seenBy) {
                    item.seenBy = [];
                }
                if (!item.id) {
                    item.id = `w_${Date.now()}_${Math.random()}`;
                }
                migrateMessages(item.replies); // Recurse for replies
            });
        };
        migrateMessages(state.whiteboard);

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

    // --- Rendering ---
    function render() {
        // Update UI elements that depend on roommate names first
        document.title = `${state.roommates.join(' & ')}'s Expense Tracker`;
        document.querySelector('.main-title').textContent = `${state.roommates.map(r => r[0]).join('&')} Tracker`;

        // Dynamically create whiteboard post buttons
        const whiteboardPostButtons = document.getElementById('whiteboard-post-buttons');
        whiteboardPostButtons.innerHTML = '';
        state.roommates.forEach(person => {
            const button = document.createElement('button');
            button.type = 'submit';
            button.className = `whiteboard-post-btn ${getPersonClass(person)}`;
            button.dataset.person = person;
            button.textContent = `Post as ${person}`;
            whiteboardPostButtons.appendChild(button);
        });


        // Render Whiteboard
        whiteboardListEl.innerHTML = '';
        state.whiteboard.forEach(message => {
            whiteboardListEl.innerHTML += renderWhiteboardMessage(message, 0);
        });

        // Render Dropdowns
        // populateDropdown(expenseCategoryEl, state.expenseCategories); // This is now handled dynamically

        renderFinance();
        renderOverview();
        renderTasks();
        renderSettings();
        if(transactionTypeEl) renderTransactionDetails(); // Render the dynamic form
    }

    function renderOverview() {
        // --- Financial Summary ---
        const financialSummaryEl = document.getElementById('financial-summary-content');
        let summaryHTML = `<p><b>Shared Fund Balance:</b> <span style="color: ${state.fundBalance >= 0 ? 'green' : 'red'};">$${state.fundBalance.toFixed(2)}</span></p>`;
        summaryHTML += `<p><b>Mileage Owed:</b> $${state.mileageTotal.toFixed(2)}</p>`;
        financialSummaryEl.innerHTML = summaryHTML;

        // --- Upcoming Chores ---
        const upcomingChoresListEl = document.getElementById('upcoming-chores-list');
        upcomingChoresListEl.innerHTML = '';
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const upcomingChores = state.tasks
            .filter(t => t.type === 'chore' && t.status === 'todo' && !t.isOneTime)
            .map(c => {
                const lastCompleted = c.lastCompletedDate ? new Date(c.lastCompletedDate) : new Date(c.creationDate);
                const dueDate = new Date(lastCompleted.getTime() + c.durationDays * 86400000);
                return { ...c, dueDate };
            })
            .filter(c => c.dueDate >= now && c.dueDate <= threeDaysFromNow)
            .sort((a, b) => a.dueDate - b.dueDate);

        if (upcomingChores.length > 0) {
            upcomingChores.forEach(chore => {
                const li = document.createElement('li');
                const diffDays = Math.ceil((chore.dueDate - now) / (1000 * 60 * 60 * 24));
                li.textContent = `${chore.description} (due in ${diffDays} day${diffDays > 1 ? 's' : ''})`;
                upcomingChoresListEl.appendChild(li);
            });
        } else {
            upcomingChoresListEl.innerHTML = '<li>No chores due in the next 3 days.</li>';
        }

        // --- Activity Log ---
        const activityLogListEl = document.getElementById('activity-log-list');
        activityLogListEl.innerHTML = '';
        if (state.activityLog.length > 0) {
            state.activityLog.slice(0, 15).forEach(log => {
                const li = document.createElement('li');
                const date = new Date(log.date);
                let amountText = '';
                if (log.amount) {
                    amountText = ` (<span style="color: ${log.amount > 0 ? 'green' : 'red'};">$${Math.abs(log.amount).toFixed(2)}</span>)`;
                }
                li.innerHTML = `${log.message}${amountText} <small>(${getMessageAge(log.date)})</small>`;
                activityLogListEl.appendChild(li);
            });
        } else {
            activityLogListEl.innerHTML = '<li>No recent activity.</li>';
        }
    }

    function getMessageAge(dateString) {
        const now = new Date();
        const then = new Date(dateString);
        const diffSeconds = Math.floor((now - then) / 1000);

        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        const diffWeeks = Math.floor(diffDays / 7);
        return `${diffWeeks}w ago`;
    }

    function renderWhiteboardMessage(message, level) {
        const date = new Date(message.date);
        const personClass = getPersonClass(message.person);
        const age = getMessageAge(message.date);

        const seenDots = message.seenBy.map(person => {
            const seenPersonClass = getPersonClass(person);
            return `<div class="seen-dot ${seenPersonClass}" title="Seen by ${person}"></div>`;
        }).join('');

        const repliesHTML = message.replies.map(reply => renderWhiteboardMessage(reply, level + 1)).join('');

        const cardSizeStyle = `font-size: ${1 - level * 0.075}em;`;

        return `
            <div class="whiteboard-card" data-id="${message.id}" data-level="${level}" style="${cardSizeStyle}">
                <div class="card-header ${personClass}">
                    <span class="person-name">${message.person}</span>
                </div>
                <div class="card-body">
                    <p>${message.message}</p>
                </div>
                <div class="card-footer">
                    <span class="timestamp">${date.toLocaleString()} (${age})</span>
                    <div class="seen-by-container">
                        ${seenDots}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="reply-btn">Reply</button>
                    ${state.roommates.filter(r => r !== message.person && !message.seenBy.includes(r)).map(r => `
                        <button class="seen-btn" data-person="${r}">Seen by ${r}</button>
                    `).join('')}
                    <button class="delete-btn" data-type="whiteboard" data-id="${message.id}">&times;</button>
                </div>
                <div class="replies-container">
                    ${repliesHTML}
                </div>
            </div>
        `;
    }

    function renderFinance() {
        // 1. Render Summary
        const fundBalanceEl = document.getElementById('finance-fund-balance');
        const iouSummaryEl = document.getElementById('finance-iou-summary');

        if (fundBalanceEl) {
            fundBalanceEl.textContent = `$${state.fundBalance.toFixed(2)}`;
            fundBalanceEl.style.color = state.fundBalance >= 0 ? 'green' : 'red';
        }

        // 2. Calculate and Render IOU Summary
        const debts = {};
        state.roommates.forEach(p1 => {
            debts[p1] = {};
            state.roommates.forEach(p2 => {
                if (p1 !== p2) debts[p1][p2] = 0;
            });
        });

        const effectiveRate = calculateEffectiveRate();

        state.transactions.forEach(txn => {
            if (txn.type === 'iou') {
                if (debts[txn.ower] && debts[txn.ower][txn.payer] !== undefined) {
                    debts[txn.ower][txn.payer] += txn.amount;
                }
            } else if (txn.type === 'mileage') {
                const cost = txn.miles * (txn.effectiveRate || effectiveRate);
                if (debts[txn.ower] && debts[txn.ower][txn.payer] !== undefined) {
                    debts[txn.ower][txn.payer] += cost;
                }
            }
        });

        const summaryMessages = [];
        const processedPairs = new Set();

        state.roommates.forEach(p1 => {
            state.roommates.forEach(p2 => {
                if (p1 === p2) return;
                const pairKey = [p1, p2].sort().join('-');
                if (processedPairs.has(pairKey)) return;

                const p1OwesP2 = debts[p1][p2] || 0;
                const p2OwesP1 = debts[p2][p1] || 0;
                const netDebt = p1OwesP2 - p2OwesP1;

                if (Math.abs(netDebt) > 0.01) {
                    let ower, payer, amount;
                    if (netDebt > 0) { ower = p1; payer = p2; amount = netDebt; }
                    else { ower = p2; payer = p1; amount = -netDebt; }
                    const owerClass = getPersonClass(ower);
                    const payerClass = getPersonClass(payer);
                    summaryMessages.push(`<span class="person-name ${owerClass}">${ower}</span> owes <span class="person-name ${payerClass}">${payer}</span> <b>$${amount.toFixed(2)}</b>`);
                }
                processedPairs.add(pairKey);
            });
        });

        if (iouSummaryEl) {
            if (summaryMessages.length === 0) {
                iouSummaryEl.textContent = 'Everyone is settled up.';
            } else {
                iouSummaryEl.innerHTML = summaryMessages.join('<br>');
            }
        }


        // 3. Render History
        const historyEl = document.getElementById('transaction-history');
        if (!historyEl) return;
        historyEl.innerHTML = '';

        state.transactions.slice().reverse().forEach(txn => {
            const li = document.createElement('li');
            const date = new Date(txn.date).toLocaleString();
            let content = '';

            switch (txn.type) {
                case 'contribution':
                    content = `<div><span class="person-name ${getPersonClass(txn.person)}">${txn.person}</span> contributed <span style="color: green;">+$${txn.amount.toFixed(2)}</span></div>`;
                    break;
                case 'expense':
                    content = `<div>Expense: ${txn.description} <span class="category-chip">${txn.category}</span> <span style="color: red;">-$${txn.amount.toFixed(2)}</span></div>`;
                    break;
                case 'iou':
                    content = `<div>IOU: <span class="person-name ${getPersonClass(txn.payer)}">${txn.payer}</span> paid <span class="person-name ${getPersonClass(txn.ower)}">${txn.ower}</span> <b>$${txn.amount.toFixed(2)}</b> for "${txn.description}"</div>`;
                    break;
                case 'mileage':
                     const cost = txn.miles * (txn.effectiveRate || effectiveRate);
                    content = `<div>Mileage: <span class="person-name ${getPersonClass(txn.payer)}">${txn.payer}</span> drove ${txn.ower} ${txn.miles} miles for "${txn.description}" (<b>$${cost.toFixed(2)}</b>)</div>`;
                    break;
            }

            li.innerHTML = `
                <div>${content}<small>${date}</small></div>
                <button class="delete-btn" data-type="transaction" data-id="${txn.id}">&times;</button>
            `;
            historyEl.appendChild(li);
        });
    }


    function populateDropdown(selectElement, options, hasPlaceholder = false) {
        const currentValue = selectElement.value;
        const placeholder = hasPlaceholder ? selectElement.querySelector('option[disabled]') : null;
        selectElement.innerHTML = '';
        if (placeholder) {
            selectElement.appendChild(placeholder);
        }
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option;
            optionEl.textContent = option;
            selectElement.appendChild(optionEl);
        });
        if (options.includes(currentValue)) {
            selectElement.value = currentValue;
        } else if (hasPlaceholder) {
            selectElement.selectedIndex = 0;
        }
    }

    function markAsSeen(messageId, person) {
        const result = findMessageById(state.whiteboard, messageId);
        if (result && result.message) {
            if (!result.message.seenBy.includes(person)) {
                result.message.seenBy.push(person);
                saveData();
                render();
            }
        }
    }

    function addReply(parentId, message, person) {
        const result = findMessageById(state.whiteboard, parentId);
        if (result && result.message) {
            const newReply = {
                id: `w_${Date.now()}`,
                message,
                person,
                date: new Date().toISOString(),
                replies: [],
                seenBy: []
            };
            result.message.replies.push(newReply);
            saveData();

            // Find the parent card element and update it without a full re-render
            const parentCard = document.querySelector(`.whiteboard-card[data-id="${parentId}"]`);
            if (parentCard) {
                const repliesContainer = parentCard.querySelector('.replies-container');
                if (repliesContainer) {
                    const newReplyHTML = renderWhiteboardMessage(newReply, parseInt(parentCard.dataset.level, 10) + 1);
                    repliesContainer.insertAdjacentHTML('beforeend', newReplyHTML);

                    // Clear the reply form textarea
                    const replyForm = parentCard.querySelector('.reply-form textarea');
                    if (replyForm) {
                        replyForm.value = '';
                    }
                }
            } else {
                // Fallback to full render if the card isn't found
                render();
            }
        }
    }

    function renderTasks() {
        // Get list elements
        const todoChoreListEl = document.getElementById('todo-chore-list');
        const todoShoppingListEl = document.getElementById('todo-shopping-list');
        const todoWishListEl = document.getElementById('todo-wish-list');
        const completedTaskListEl = document.getElementById('completed-task-list');

        // Make sure elements exist before proceeding
        if (!todoChoreListEl || !todoShoppingListEl || !todoWishListEl || !completedTaskListEl) return;

        // Clear lists
        todoChoreListEl.innerHTML = '';
        todoShoppingListEl.innerHTML = '';
        todoWishListEl.innerHTML = '';
        completedTaskListEl.innerHTML = '';

        // Filter tasks
        const chores = state.tasks.filter(t => t.type === 'chore' && t.status === 'todo');
        const shopping = state.tasks.filter(t => t.type === 'shopping' && t.status === 'todo');
        const wishes = state.tasks.filter(t => t.type === 'wish' && t.status === 'todo');
        const completed = state.tasks.filter(t => t.status === 'completed' || t.status === 'purchased');

        // Render Chores
        chores.forEach(task => {
            // Simplified chore rendering for now. Can be expanded.
            const completeButtons = state.roommates.map(p => `<button class="task-btn complete-chore" data-id="${task.id}" data-person="${p}">${p} did it</button>`).join('');
            todoChoreListEl.innerHTML += `<li class="chore-item"><span>${task.description}</span><div>${completeButtons}</div></li>`;
        });

        // Render Shopping List
        shopping.forEach(task => {
            let actionButtons;
            if (task.claimedBy) {
                actionButtons = `<span class="claimed-by">Claimed by ${task.claimedBy}</span> <button class="task-btn purchase" data-id="${task.id}">Purchased</button>`;
            } else {
                actionButtons = state.roommates.map(p => `<button class="task-btn claim" data-id="${task.id}" data-person="${p}">${p} will buy</button>`).join('');
            }
            todoShoppingListEl.innerHTML += `<li class="shopping-item"><span>${task.description}</span><div>${actionButtons}</div></li>`;
        });

        // Render Wishlist
         wishes.forEach(task => {
            let actionButtons;
            if (task.claimedBy) {
                actionButtons = `<span class="claimed-by">Claimed by ${task.claimedBy}</span> <button class="task-btn purchase" data-id="${task.id}">Purchased</button>`;
            } else {
                actionButtons = state.roommates.map(p => `<button class="task-btn claim" data-id="${task.id}" data-person="${p}">${p} will buy</button>`).join('');
            }
            todoWishListEl.innerHTML += `<li class="shopping-item"><span>${task.description}</span><div>${actionButtons}</div></li>`;
        });

        // Render Completed
        completed.sort((a,b) => new Date(b.completionDate || b.purchaseDate) - new Date(a.completionDate || a.purchaseDate)).forEach(task => {
            let text = '';
            if (task.type === 'chore') {
                text = `Completed by ${task.lastCompletedBy} on ${new Date(task.completionDate).toLocaleDateString()}`;
            } else {
                text = `Purchased by ${task.purchasedBy} on ${new Date(task.purchaseDate).toLocaleDateString()}`;
            }
            completedTaskListEl.innerHTML += `<li class="task-item completed"><span>${task.description}</span><small>${text}</small></li>`;
        });
    }

    function renderSettings() {
        // General
        const roommateSettingsContainer = document.getElementById('roommate-settings-container');
        roommateSettingsContainer.innerHTML = '';
        state.roommates.forEach((name, index) => {
            const row = document.createElement('div');
            row.className = 'setting-row';
            row.innerHTML = `
                <label for="roommate${index}-name">Roommate ${index + 1} Name:</label>
                <input type="text" id="roommate${index}-name" data-index="${index}" value="${name}">
            `;
            roommateSettingsContainer.appendChild(row);
        });

        themeToggleSettings.checked = document.body.classList.contains('dark-mode');

        // Mileage
        mpgInput.value = state.mileageSettings.mpg;
        gasCostInput.value = state.mileageSettings.gasCost;
        maintenanceFeeInput.value = state.mileageSettings.maintenance;
        convenienceFeeInput.value = state.mileageSettings.convenience;
        if (effectiveRateEl) {
            effectiveRateEl.textContent = calculateEffectiveRate().toFixed(2);
        }


        // Categories
        expenseCategoryListEl.innerHTML = '';
        state.expenseCategories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${cat}</span><button class="delete-btn delete-category-btn" data-category="${cat}">&times;</button>`;
            expenseCategoryListEl.appendChild(li);
        });
    }

    function renderTransactionDetails() {
        const type = transactionTypeEl.value;
        transactionDetailsEl.innerHTML = ''; // Clear previous fields

        let fields = '';
        const personOptions = state.roommates.map(r => `<option value="${r}">${r}</option>`).join('');
        const categoryOptions = state.expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');

        switch (type) {
            case 'expense':
                fields = `
                    <input type="text" id="txn-expense-description" placeholder="Item Description" required>
                    <select id="txn-expense-category" required>${categoryOptions}</select>
                    <input type="number" id="txn-expense-amount" placeholder="Amount" step="0.01" required>
                `;
                break;
            case 'contribution':
                fields = `
                    <select id="txn-contribution-person" required>${personOptions}</select>
                    <input type="number" id="txn-contribution-amount" placeholder="Amount" step="0.01" required>
                `;
                break;
            case 'iou':
                fields = `
                    <label>Payer:</label>
                    <select id="txn-iou-payer" required>${personOptions}</select>
                    <label>Ower:</label>
                    <select id="txn-iou-ower" required>${personOptions}</select>
                    <input type="number" id="txn-iou-amount" placeholder="Amount" step="0.01" required>
                    <input type="text" id="txn-iou-description" placeholder="For..." required>
                `;
                break;
            case 'mileage':
                fields = `
                    <input type="text" id="txn-mileage-description" placeholder="Trip Description" required>
                    <input type="number" id="txn-mileage-miles" placeholder="Miles" step="0.1" required>
                `;
                break;
        }
        transactionDetailsEl.innerHTML = fields;
    }

    function addTransaction(e) {
        e.preventDefault();
        const type = transactionTypeEl.value;
        const now = new Date().toISOString();
        let newTxn = { id: `txn_${Date.now()}`, date: now, type: type };
        let logMessage = '';

        try {
            switch (type) {
                case 'expense':
                    newTxn.description = document.getElementById('txn-expense-description').value;
                    newTxn.category = document.getElementById('txn-expense-category').value;
                    newTxn.amount = parseFloat(document.getElementById('txn-expense-amount').value);
                    if (!newTxn.description || !newTxn.category || isNaN(newTxn.amount) || newTxn.amount <= 0) throw new Error("Invalid expense input.");
                    logMessage = `Expense: ${newTxn.description}`;
                    break;
                case 'contribution':
                    newTxn.person = document.getElementById('txn-contribution-person').value;
                    newTxn.amount = parseFloat(document.getElementById('txn-contribution-amount').value);
                    if (!newTxn.person || isNaN(newTxn.amount) || newTxn.amount <= 0) throw new Error("Invalid contribution input.");
                    logMessage = `${newTxn.person} contributed`;
                    break;
                case 'iou':
                    newTxn.payer = document.getElementById('txn-iou-payer').value;
                    newTxn.ower = document.getElementById('txn-iou-ower').value;
                    newTxn.amount = parseFloat(document.getElementById('txn-iou-amount').value);
                    newTxn.description = document.getElementById('txn-iou-description').value;
                    if (newTxn.payer === newTxn.ower) throw new Error("Payer and ower cannot be the same.");
                    if (!newTxn.description || isNaN(newTxn.amount) || newTxn.amount <= 0) throw new Error("Invalid IOU input.");
                    logMessage = `IOU added: ${newTxn.payer} paid ${newTxn.ower}`;
                    break;
                case 'mileage':
                    newTxn.payer = 'Sage'; // As per assumption
                    newTxn.ower = 'Emily'; // As per assumption
                    newTxn.description = document.getElementById('txn-mileage-description').value;
                    newTxn.miles = parseFloat(document.getElementById('txn-mileage-miles').value);
                    newTxn.effectiveRate = calculateEffectiveRate(); // Store the rate at the time of logging
                    if (!newTxn.description || isNaN(newTxn.miles) || newTxn.miles <= 0) throw new Error("Invalid mileage input.");
                    logMessage = `Logged trip: ${newTxn.description}`;
                    break;
            }

            state.transactions.push(newTxn);
            logActivity(logMessage, (type === 'expense' ? -newTxn.amount : newTxn.amount));
            transactionForm.reset(); // This will reset the select dropdown and clear the inputs
            renderTransactionDetails(); // Re-render the fields for the (now reset) dropdown
            saveData();
            render();

        } catch (error) {
            alert(error.message);
        }
    }


    // --- Logic Functions ---
    function recalculateTotals() {
        // Reset calculated values
        state.fundBalance = 0;
        state.mileageTotal = 0;
        state.contributions = {};
        state.roommates.forEach(r => state.contributions[r] = 0);

        const effectiveRate = calculateEffectiveRate();

        state.transactions.forEach(txn => {
            switch (txn.type) {
                case 'contribution':
                    state.fundBalance += txn.amount;
                    if (state.contributions[txn.person] !== undefined) {
                        state.contributions[txn.person] += txn.amount;
                    }
                    break;
                case 'expense':
                    // Expense amount is subtracted from the fund balance
                    state.fundBalance -= txn.amount;
                    break;
                case 'mileage':
                    // Mileage creates a debt, but doesn't affect the shared fund.
                    // The cost is calculated dynamically, using the stored rate if available.
                    const cost = txn.miles * (txn.effectiveRate || effectiveRate);
                    // We can handle mileage debt within the IOU logic, but for backward compatibility with the UI,
                    // we can calculate `mileageTotal` separately for now.
                    // This assumes mileage is between Sage and Emily.
                    if (txn.payer === 'Sage' && txn.ower === 'Emily') {
                        state.mileageTotal += cost;
                    }
                    break;
                case 'iou':
                    // Direct IOUs don't affect the fund balance.
                    // However, mileage payments (which are now IOUs) affect the mileage total.
                    if (txn.description === 'Mileage Payment' && txn.payer === 'Emily' && txn.ower === 'Sage') {
                        state.mileageTotal -= txn.amount;
                    }
                    break;
            }
        });
    }

    function deleteWhiteboardMessage(id) {
        const result = findMessageById(state.whiteboard, id);
        if (deleteMessageById(state.whiteboard, id)) {
            if (result && result.message) {
                logActivity(`Deleted message from ${result.message.person}: "${result.message.message.substring(0, 20)}..."`);
            }
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


    function addMessage(e) {
        e.preventDefault();
        const person = e.submitter.dataset.person;
        const message = whiteboardMessageEl.value;
        if (!message || !person) return;
        const newMessage = {
            id: `w_${Date.now()}`,
            message,
            person,
            date: new Date().toISOString(),
            replies: [],
            seenBy: []
        };
        state.whiteboard.push(newMessage);
        logActivity(`${person} posted on whiteboard: "${message.substring(0, 30)}..."`);
        whiteboardMessageEl.value = '';
        saveData();
        render();
    }

    function purgeOldCompletedChores() {
        if (!state.completedChores) state.completedChores = [];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        state.completedChores = state.completedChores.filter(c => new Date(c.completionDate).getTime() > thirtyDaysAgo);
    }

    function handleTaskTypeChange() {
        if (choreOptionsEl) {
            choreOptionsEl.style.display = taskTypeEl.value === 'chore' ? 'block' : 'none';
        }
    }

    function addTask(e) {
        e.preventDefault();
        const description = taskDescriptionEl.value.trim();
        if (!description) return;

        const type = taskTypeEl.value;
        const now = new Date().toISOString();
        const newTask = {
            id: `task_${Date.now()}`,
            description,
            type,
            status: 'todo',
            date: now,
            creationDate: now, // For compatibility with chore logic
        };

        if (type === 'chore') {
            const duration = choreDurationEl.value;
            const isOneTime = !duration;
            const durationDays = isOneTime ? null : parseInt(duration, 10);
            if (!isOneTime && (isNaN(durationDays) || durationDays <= 0)) {
                alert('Invalid duration for recurring chore.');
                return;
            }
            newTask.isOneTime = isOneTime;
            newTask.durationDays = durationDays;
            newTask.lastCompletedBy = null;
            newTask.lastCompletedDate = null;
        } else { // shopping or wish
            newTask.addedBy = state.roommates[0]; // Default to first roommate for now
            newTask.claimedBy = null;
        }

        state.tasks.push(newTask);
        logActivity(`Task added: ${description}`);
        taskForm.reset();
        handleTaskTypeChange();
        saveData();
        render();
    }

    function updateTask(id, action, person) {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        switch (action) {
            case 'complete':
                task.status = 'completed';
                task.lastCompletedBy = person;
                task.completionDate = new Date().toISOString();
                logActivity(`${person} completed chore: ${task.description}`);
                if (!task.isOneTime) {
                    // For recurring chores, we don't move them, just update date
                    task.status = 'todo';
                    task.lastCompletedDate = new Date().toISOString();
                }
                break;
            case 'claim':
                task.claimedBy = person;
                logActivity(`${person} claimed: ${task.description}`);
                break;
            case 'unclaim':
                logActivity(`${task.claimedBy} unclaimed: ${task.description}`);
                task.claimedBy = null;
                break;
            case 'purchase':
                if (!task.claimedBy) {
                    alert("Please claim the item before marking it as purchased.");
                    return;
                }
                task.status = 'purchased';
                task.purchasedBy = task.claimedBy;
                task.purchaseDate = new Date().toISOString();
                logActivity(`${task.purchasedBy} purchased: ${task.description}`);
                break;
        }
        saveData();
        render();
    }


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
        const keysToUpdate = ['person', 'lastCompletedBy', 'payer', 'ower', 'addedBy', 'claimedBy', 'purchasedBy'];
        const arraysToUpdate = [
            state.fundHistory, state.chores, state.completedChores,
            state.whiteboard, state.ious, state.shoppingList,
            state.wishlist, state.recentlyPurchased
        ];

        arraysToUpdate.forEach(arr => {
            if (arr) {
                arr.forEach(item => {
                    keysToUpdate.forEach(key => {
                        if (item[key] === oldName) {
                            item[key] = newName;
                        }
                    });
                });
            }
        });


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
        if (state.transactions.some(item => item.type === 'expense' && item.category === category)) {
            alert(`Cannot delete category "${category}" as it is used in the fund history.`);
            return;
        }
        if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
            state.expenseCategories = state.expenseCategories.filter(c => c !== category);
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
    }
    function loadTheme() { switchTheme(localStorage.getItem('theme') === 'dark'); }

    // --- Event Listeners ---
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            if (confirm('Are you sure you want to delete this item?')) {
                const type = e.target.dataset.type;
                const id = e.target.dataset.id;

                switch (type) {
                    case 'whiteboard':
                        deleteWhiteboardMessage(id);
                        break;
                    case 'transaction':
                        const txnIndex = state.transactions.findIndex(t => t.id === id);
                        if (txnIndex > -1) {
                            const deletedTxn = state.transactions[txnIndex];
                            logActivity(`Deleted transaction: ${deletedTxn.type} ${deletedTxn.description || ''}`);
                            state.transactions.splice(txnIndex, 1);
                            recalculateTotals();
                            saveData();
                            render();
                        }
                        break;
                }
            }
        }
        if (e.target.matches('.task-btn')) {
            const id = e.target.dataset.id;
            const person = e.target.dataset.person;
            if (e.target.matches('.complete-chore')) {
                updateTask(id, 'complete', person);
            } else if (e.target.matches('.claim')) {
                updateTask(id, 'claim', person);
            } else if (e.target.matches('.unclaim')) {
                updateTask(id, 'unclaim');
            } else if (e.target.matches('.purchase')) {
                updateTask(id, 'purchase');
            }
        }
        if (e.target.matches('.seen-btn')) {
            const person = e.target.dataset.person;
            const card = e.target.closest('.whiteboard-card');
            if (person && card) {
                const messageId = card.dataset.id;
                markAsSeen(messageId, person);
            }
        }
        if (e.target.matches('.reply-btn')) {
            const card = e.target.closest('.whiteboard-card');
            if (card) {
                const repliesContainer = card.querySelector('.replies-container');
                if (repliesContainer && !repliesContainer.querySelector('.reply-form')) {
                    const replyForm = document.createElement('div');
                    replyForm.className = 'reply-form';

                    const personOptions = state.roommates.map(r => `<option value="${r}">${r}</option>`).join('');

                    replyForm.innerHTML = `
                        <textarea placeholder="Write a reply..."></textarea>
                        <select>
                            ${personOptions}
                        </select>
                        <button class="post-reply-btn">Post Reply</button>
                    `;
                    repliesContainer.appendChild(replyForm);
                }
            }
        }
        if (e.target.matches('.post-reply-btn')) {
            const form = e.target.closest('.reply-form');
            const card = e.target.closest('.whiteboard-card');
            if (form && card) {
                const parentId = card.dataset.id;
                const message = form.querySelector('textarea').value;
                const person = form.querySelector('select').value;
                if (message.trim()) {
                    addReply(parentId, message, person);
                }
            }
        }
        if (e.target.matches('.delete-category-btn')) {
            deleteExpenseCategory(e.target.dataset.category);
        }
    });

    transactionForm.addEventListener('submit', addTransaction);
    transactionTypeEl.addEventListener('change', renderTransactionDetails);
    whiteboardForm.addEventListener('submit', addMessage);
    mileageSettingsForm.addEventListener('change', updateMileageSettings);
    resetButton.addEventListener('click', resetAllData);
    exportButton.addEventListener('click', exportData);
    importButton.addEventListener('click', () => importFileEl.click());
    importFileEl.addEventListener('change', importData);
    taskForm.addEventListener('submit', addTask);
    taskTypeEl.addEventListener('change', handleTaskTypeChange);
    addCategoryForm.addEventListener('submit', addExpenseCategory);
    document.getElementById('roommate-settings-container').addEventListener('change', (e) => {
        if (e.target.matches('input[type="text"]')) {
            const index = parseInt(e.target.dataset.index, 10);
            const newName = e.target.value;
            updateRoommateName(index, newName);
        }
    });
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
