function generateRandomData() {
    console.log("Generating NEW consolidated test data...");

    const state = {
        fundBalance: 0,
        contributions: {},
        mileageTotal: 0,
        mileageSettings: { mpg: 28, gasCost: 4.10, maintenance: 0.06, convenience: 0.05 },
        whiteboard: [],
        tasks: [],
        transactions: [],
        activityLog: [],
        roommates: ['Sage', 'Emily', 'Susan'],
        expenseCategories: ['Groceries', 'Utilities', 'Entertainment', 'Dining Out', 'Other', 'Household', 'Personal Care'],
    };

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const rand = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const randomDate = () => new Date(oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime()));
    const randomPerson = () => state.roommates[randInt(0, state.roommates.length - 1)];

    // --- GENERATE TRANSACTIONS ---
    // Contributions & Expenses
    for (let i = 0; i < 12; i++) {
        state.roommates.forEach(person => {
            const contributionDate = new Date(oneYearAgo);
            contributionDate.setMonth(oneYearAgo.getMonth() + i);
            contributionDate.setDate(randInt(1, 5));
            state.transactions.push({
                id: `txn_${contributionDate.getTime()}_${randInt(1000,9999)}`,
                type: 'contribution',
                person,
                amount: rand(45, 55),
                date: contributionDate.toISOString()
            });
        });
        const numExpenses = randInt(5, 10);
        for (let j = 0; j < numExpenses; j++) {
            const expenseDate = new Date(oneYearAgo);
            expenseDate.setMonth(oneYearAgo.getMonth() + i);
            expenseDate.setDate(randInt(1, 28));
            const category = state.expenseCategories[randInt(0, state.expenseCategories.length - 1)];
            state.transactions.push({
                id: `txn_${expenseDate.getTime()}_${randInt(1000,9999)}`,
                type: 'expense',
                description: `${category} purchase`,
                category: category,
                amount: rand(10, 75),
                date: expenseDate.toISOString()
            });
        }
    }

    // Mileage & Payments (as IOUs)
    const numMileageEntries = randInt(90, 120);
    for (let i = 0; i < numMileageEntries; i++) {
        const date = randomDate();
        if (Math.random() < 0.95) {
            state.transactions.push({
                id: `txn_${date.getTime()}_${randInt(1000,9999)}`,
                type: 'mileage',
                payer: 'Sage',
                ower: 'Emily',
                description: ['Coffee run', 'Visit friends', 'Weekend trip', 'Commute'][randInt(0,3)],
                miles: rand(3, 25),
                date: date.toISOString()
            });
        } else {
            state.transactions.push({
                id: `txn_${date.getTime()}_${randInt(1000,9999)}`,
                type: 'iou',
                payer: 'Emily',
                ower: 'Sage',
                amount: rand(20, 50),
                description: 'Mileage Payment',
                date: date.toISOString()
            });
        }
    }

    // Regular IOUs
    const numIous = randInt(15, 30);
    for (let i = 0; i < numIous; i++) {
        let payer = randomPerson();
        let ower = randomPerson();
        while (payer === ower) { ower = randomPerson(); }
        state.transactions.push({
            id: `txn_${randomDate().getTime()}_${randInt(1000,9999)}`,
            type: 'iou',
            payer,
            ower,
            amount: rand(5, 75),
            description: `For ${['lunch', 'tickets', 'a shared item'][randInt(0,2)]}`,
            date: randomDate().toISOString()
        });
    }

    state.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));


    // --- GENERATE TASKS ---
    const choreDescs = [
        { desc: 'Clean the kitchen', recurring: true, days: 7 },
        { desc: 'Take out trash', recurring: true, days: 3 },
        { desc: 'Vacuum living room', recurring: false },
        { desc: 'Fix leaky faucet', recurring: false },
    ];
    choreDescs.forEach(c => {
        const creationDate = randomDate();
        state.tasks.push({
            id: `task_${creationDate.getTime()}_${randInt(1000,9999)}`,
            type: 'chore',
            description: c.desc,
            status: 'todo',
            isOneTime: !c.recurring,
            durationDays: c.recurring ? c.days : null,
            creationDate: creationDate.toISOString(),
            lastCompletedBy: null,
            lastCompletedDate: null,
        });
    });

    const shoppingItems = ["Milk", "Bread", "Eggs", "Coffee"];
    shoppingItems.forEach(item => {
        const date = randomDate();
        state.tasks.push({
            id: `task_${date.getTime()}_${randInt(1000,9999)}`,
            type: 'shopping',
            description: item,
            status: 'todo',
            addedBy: randomPerson(),
            date: date.toISOString(),
            claimedBy: null
        });
    });

    const wishItems = ["New couch", "Blender", "Air fryer"];
     wishItems.forEach(item => {
        const date = randomDate();
        state.tasks.push({
            id: `task_${date.getTime()}_${randInt(1000,9999)}`,
            type: 'wish',
            description: item,
            status: 'todo',
            addedBy: randomPerson(),
            date: date.toISOString(),
            claimedBy: null
        });
    });

    // --- Final state object cleanup ---
    // Remove properties that are calculated dynamically in the main script
    delete state.fundBalance;
    delete state.contributions;
    delete state.mileageTotal;

    // Add back activityLog, which was removed from the initial object for clarity
    state.activityLog = [];

    console.log("Test data generated:", state);
    return state;
}
