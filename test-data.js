function generateRandomData() {
    console.log("Generating test data...");

    // This structure MUST match the defaultState in script.js
    const state = {
        fundBalance: 0,
        contributions: {}, // Will be populated based on roommates
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
        shoppingList: [],
        wishlist: [],
        recentlyPurchased: [],
        ious: [],
        roommates: ['Sage', 'Emily', 'Susan'],
        expenseCategories: ['Groceries', 'Utilities', 'Entertainment', 'Dining Out', 'Other', 'Household', 'Personal Care'],
    };

    // Initialize contributions object
    state.roommates.forEach(r => state.contributions[r] = 0);

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const rand = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(rand(min, max + 1));
    const randomDate = () => new Date(oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime()));
    const randomPerson = () => state.roommates[randInt(0, state.roommates.length - 1)];

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

    // --- Generate More Realistic Fund History ---
    // Simulate each person contributing ~$50/month for the past 12 months
    for (let i = 0; i < 12; i++) {
        state.roommates.forEach(person => {
            // Add a monthly contribution
            const contributionDate = new Date(oneYearAgo);
            contributionDate.setMonth(oneYearAgo.getMonth() + i);
            contributionDate.setDate(randInt(1, 5)); // Contribution at start of month
            state.fundHistory.push({
                type: 'contribution',
                person,
                amount: rand(45, 55), // around $50
                date: contributionDate.toISOString()
            });
        });

        // Add a few random expenses for the month
        const numExpenses = randInt(5, 10);
        for (let j = 0; j < numExpenses; j++) {
             const expenseDate = new Date(oneYearAgo);
             expenseDate.setMonth(oneYearAgo.getMonth() + i);
             expenseDate.setDate(randInt(1, 28)); // Expense sometime in the month
             const category = state.expenseCategories[randInt(0, state.expenseCategories.length - 1)];
             state.fundHistory.push({
                type: 'expense',
                description: `${category} purchase`,
                category: category,
                amount: -rand(10, 75), // Smaller, more frequent expenses
                date: expenseDate.toISOString()
            });
        }
    }


    // --- Generate More Realistic Mileage History for Emily ---
    // "Emily will probably only need rides around town a few times a week"
    // This is ~8-12 trips a month. Let's say ~100 trips over the year.
    const numMileageEntries = randInt(90, 120);
    for (let i = 0; i < numMileageEntries; i++) {
        const date = randomDate();
        // 95% chance of being a trip, 5% of being a payment
        if (Math.random() < 0.95) {
            const description = tripDescs[randInt(0, 5)]; // More mundane, local trips
            const miles = rand(3, 25); // "around town"
            const rate = (state.mileageSettings.gasCost / state.mileageSettings.mpg) + state.mileageSettings.maintenance + state.mileageSettings.convenience;
            const cost = miles * rate;
            state.mileageHistory.push({ type: 'trip', description, miles, cost, date: date.toISOString() });
        } else { // 5% chance of being a payment
            const amount = rand(20, 50); // Smaller, more frequent payments
            state.mileageHistory.push({ type: 'payment', amount, date: date.toISOString() });
        }
    }

    // --- Generate IOUs ---
    const numIous = randInt(15, 30);
    for (let i = 0; i < numIous; i++) {
        let payer = randomPerson();
        let ower = randomPerson();
        while (payer === ower) { ower = randomPerson(); } // Ensure payer and ower are different

        state.ious.push({
            id: `iou_${Date.now()}_${i}`,
            payer,
            ower,
            amount: rand(5, 75),
            description: `For ${['lunch', 'tickets', 'a shared item', 'that thing'][randInt(0,3)]}`,
            date: randomDate().toISOString()
        });
    }

    // --- Generate Shopping & Wishlist Items ---
    const shoppingItems = ["Milk", "Bread", "Eggs", "Cheese", "Coffee", "Paper Towels", "Dish Soap", "Laundry Detergent"];
    const wishItems = ["New couch", "Blender", "Air fryer", "Board game", "Art for the living room"];

    shoppingItems.forEach(item => {
        if (Math.random() < 0.8) { // 80% chance to be on a list
            const newItem = {
                id: `s_${Date.now()}_${randInt(1000,9999)}`,
                description: item,
                addedBy: randomPerson(),
                date: randomDate().toISOString(),
                claimedBy: null
            };
            if(Math.random() < 0.3) { // 30% chance of being a wish
                 state.wishlist.push(newItem);
            } else {
                 state.shoppingList.push(newItem);
            }
        }
    });

    // --- Generate Recently Purchased Items ---
    const purchasedItems = ["Pizza ingredients", "Light bulbs", "Cleaning spray", "Sponges"];
    purchasedItems.forEach(item => {
        const purchaser = randomPerson();
        state.recentlyPurchased.push({
            id: `p_${Date.now()}_${randInt(1000,9999)}`,
            description: item,
            addedBy: randomPerson(),
            date: randomDate().toISOString(),
            claimedBy: purchaser,
            purchasedBy: purchaser,
            purchaseDate: new Date(Date.now() - rand(1, 6) * 86400000).toISOString() // Purchased in the last week
        });
    });


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
                    newChore.lastCompletedBy = randomPerson();
                }
            }
        }

        // For one-time chores, randomly decide if it was completed
        if (newChore.isOneTime && Math.random() < 0.4) { // 40% chance of being completed
            newChore.completionDate = new Date(new Date(newChore.creationDate).getTime() + rand(1, 10) * 86400000).toISOString();
            newChore.lastCompletedBy = randomPerson();
            state.completedChores.push(newChore);
        } else {
            state.chores.push(newChore);
        }
    });

    // --- Generate Whiteboard Messages ---
    whiteboardMsgs.forEach((msg, i) => {
        const person = randomPerson();
        // Simulate some messages being seen
        const seenCount = randInt(0, state.roommates.length - 1);
        const viewers = [...state.roommates].filter(r => r !== person).sort(() => 0.5 - Math.random());
        const seenBy = viewers.slice(0, seenCount);

        state.whiteboard.push({
            id: `w_${Date.now()}_${i}`,
            message: msg,
            person: person,
            date: randomDate().toISOString(),
            replies: [], // For simplicity, test data will not have nested replies
            seenBy: seenBy
        });
    });

    // --- Sort Histories by Date ---
    state.fundHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.mileageHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.ious.sort((a, b) => new Date(a.date) - new Date(b.date));


    // --- Final Calculation Pass ---
    // This mimics the recalculateTotals function in the main script
    state.fundBalance = 0;
    state.roommates.forEach(r => state.contributions[r] = 0);
    state.fundHistory.forEach(item => {
        if (item.type === 'contribution') {
            state.fundBalance += item.amount;
            if (state.contributions[item.person] !== undefined) {
                state.contributions[item.person] += item.amount;
            }
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
