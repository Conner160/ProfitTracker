// Main app logic only
const form = document.createElement('form');
form.innerHTML = `
  <input type="text" id="description" placeholder="Description" required>
  <input type="number" id="amount" placeholder="Amount" required>
  <button type="submit" class="btn">Add</button>
`;
document.getElementById('app').appendChild(form);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await db.transactions.add({
    description: e.target.description.value,
    amount: parseFloat(e.target.amount.value),
    date: new Date()
  });
  e.target.reset();
});
