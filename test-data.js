function generateRandomData() {
    console.log("Generating test data...");

    const state = {
        fundBalance: 0,
        contributions: { Sage: 0, Emily: 0 },
        fundHistory: [],
        mileageTotal: 0,
        mileageSettings: {
            mpg: 28,
            gasCost: 4.10,
            maintenance: 0.06,
            convenience: 0.05,
        },
        mileageHistory: [],
        whiteboard: [],
        chores: [],
        completedChores: [],
    };

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const rand = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const randomDate = () => new Date(oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime()));

    const people = ['Sage', 'Emily'];
    const expenseCats = ['Groceries', 'Utilities', 'Entertainment', 'Dining Out', 'Other'];
    const tripDescs = ['Coffee run', 'Visit friends', 'Weekend trip', 'Commute', 'Store pickup', 'Airport drop-off', 'IKEA adventure', 'Beach day', 'Mountain drive'];
    const choreDescs = [
        { desc: 'Clean the kitchen', recurring: true, days: 7 },
        { desc: 'Take out trash', recurring: true, days: 3 },
        { desc: 'Vacuum living room', recurring: true, days: 14 },
        { desc: 'Water plants', recurring: true, days: 5 },
        { desc: 'Clean bathrooms', recurring: true, days: 10 },
        { desc: 'Mow the lawn', recurring: true, days: 14 },
        { desc: 'Organize the garage', recurring: false },
        { desc: 'Fix leaky faucet', recurring: false },
        { desc: 'Deep clean the fridge', recurring: false },
        { desc: 'Paint the guest room', recurring: false },
    ];
    const whiteboardMsgs = [
        "Don't forget to buy milk!",
        "Movie night on Friday?",
        "Let's plan a hike for next weekend.",
        "Remember to pay the electricity bill.",
        "Who finished the coffee?!",
        "Happy Anniversary!",
        "Got concert tickets for next month!"
    ];

    // --- Generate Fund History (Contributions & Expenses) ---
    const numFundEntries = randInt(250, 400); // Increased from (80, 150)
    for (let i = 0; i < numFundEntries; i++) {
        const date = randomDate();
        if (Math.random() < 0.4) { // 40% chance of being a contribution
            const person = people[randInt(0, 1)];
            const amount = rand(20, 250); // Slightly increased max
            state.fundHistory.push({ type: 'contribution', person, amount, date: date.toISOString() });
        } else { // 60% chance of being an expense
            const description = expenseCats[randInt(0, 4)] + ' purchase';
            const category = expenseCats[randInt(0, 4)];
            const amount = -rand(5, 180); // Slightly increased max
            state.fundHistory.push({ type: 'expense', description, category, amount, date: date.toISOString() });
        }
    }

    // --- Generate Mileage History (Trips & Payments) ---
    const numMileageEntries = randInt(100, 200); // Increased from (40, 80)
    for (let i = 0; i < numMileageEntries; i++) {
        const date = randomDate();
        if (Math.random() < 0.8) { // 80% chance of being a trip
            const description = tripDescs[randInt(0, tripDescs.length - 1)];
            const miles = rand(5, 150); // Slightly increased max
            const rate = (state.mileageSettings.gasCost / state.mileageSettings.mpg) + state.mileageSettings.maintenance + state.mileageSettings.convenience;
            const cost = miles * rate;
            state.mileageHistory.push({ type: 'trip', description, miles, cost, date: date.toISOString() });
        } else { // 20% chance of being a payment
            const amount = rand(20, 100);
            state.mileageHistory.push({ type: 'payment', amount, date: date.toISOString() });
        }
    }

    // --- Generate Chores ---
    choreDescs.forEach(c => {
        const newChore = {
            id: `chore_${new Date().getTime()}_${randInt(1000, 9999)}`,
            description: c.desc,
            isOneTime: !c.recurring,
            durationDays: c.recurring ? c.days : null,
            creationDate: randomDate().toISOString(),
            lastCompletedBy: null,
            lastCompletedDate: null,
        };
        // Simulate some completions for recurring chores
        if (c.recurring) {
            let lastCompletion = new Date(newChore.creationDate);
            while (lastCompletion < now) {
                lastCompletion = new Date(lastCompletion.getTime() + rand(1, c.days * 1.5) * 86400000);
                if (lastCompletion < now) {
                    newChore.lastCompletedDate = lastCompletion.toISOString();
                    newChore.lastCompletedBy = people[randInt(0, 1)];
                }
            }
        }
        state.chores.push(newChore);
    });

    // --- Generate Whiteboard Messages ---
    whiteboardMsgs.forEach(msg => {
        state.whiteboard.push({ message: msg, date: randomDate().toISOString() });
    });

    // --- Sort Histories by Date ---
    state.fundHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.mileageHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // --- Final Calculation Pass ---
    // This mimics the recalculateTotals function in the main script
    state.fundBalance = 0;
    state.contributions = { Sage: 0, Emily: 0 };
    state.fundHistory.forEach(item => {
        if (item.type === 'contribution') {
            state.fundBalance += item.amount;
            state.contributions[item.person] += item.amount;
        } else if (item.type === 'expense') {
            state.fundBalance += item.amount; // Amount is already negative
        }
    });

    state.mileageTotal = 0;
    const effectiveRate = (state.mileageSettings.gasCost / state.mileageSettings.mpg) + state.mileageSettings.maintenance + state.mileageSettings.convenience;
    state.mileageHistory.forEach(item => {
        if (item.type === 'trip') {
            // Recalculate cost to ensure it's correct based on settings
            item.cost = item.miles * effectiveRate;
            state.mileageTotal += item.cost;
        } else if (item.type === 'payment') {
            state.mileageTotal -= item.amount;
        }
    });

    console.log("Test data generated:", state);
    return state;
}
