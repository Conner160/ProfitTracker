// IndexedDB setup only
const db = new Dexie('ProfitDB');
db.version(1).stores({ transactions: '++id, description, amount, date' });
