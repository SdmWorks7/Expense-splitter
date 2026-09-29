let people = [];    // { id, name }
let expenses = [];  // { id, desc, amount, payerId, participantIds }
let editingId = null;
 
// ---------- Grab elements ----------
const personForm = document.getElementById("person-form");
const personInput = document.getElementById("person-name");
const personError = document.getElementById("person-error");
const peopleList = document.getElementById("people-list");
 
const expenseForm = document.getElementById("expense-form");
const descInput = document.getElementById("desc");
const amountInput = document.getElementById("amount");
const payerSelect = document.getElementById("payer");
const participantsBox = document.getElementById("participants");
const expenseError = document.getElementById("expense-error");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const selectAllBtn = document.getElementById("select-all");
const resetBtn = document.getElementById("reset-btn");
 
const totalSpentEl = document.getElementById("total-spent");
const statPeopleEl = document.getElementById("stat-people");
const statExpensesEl = document.getElementById("stat-expenses");
const balancesEl = document.getElementById("balances");
const settlementsEl = document.getElementById("settlements");
const expenseListEl = document.getElementById("expense-list");
 
// ---------- Helpers ----------
function formatMoney(paise) {
  const rupees = Math.abs(paise) / 100;
  return "₹" + rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
 
function getName(id) {
  const person = people.find(function (p) {
    return p.id === id;
  });
  return person ? person.name : "Unknown";
}
 
// gives each person one of five colours, based on their place in the group
function colorClass(id) {
  const index = people.findIndex(function (p) {
    return p.id === id;
  });
  return "c" + (index % 5);
}
 
// stops names like <b> from breaking the page
function safe(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
 
function save() {
  try {
    localStorage.setItem("splitterData", JSON.stringify({ people: people, expenses: expenses }));
  } catch (err) {
    // storage can be blocked in some browsers, the app still works without it
  }
}
 
function load() {
  try {
    const saved = localStorage.getItem("splitterData");
    if (!saved) return;
    const data = JSON.parse(saved);
    people = data.people || [];
    expenses = data.expenses || [];
  } catch (err) {
    people = [];
    expenses = [];
  }
}
 
// ---------- People ----------
personForm.addEventListener("submit", function (e) {
  e.preventDefault();
 
  const name = personInput.value.trim();
  personError.textContent = "";
 
  if (name === "") {
    personError.textContent = "Please type a name first.";
    return;
  }
 
  const exists = people.some(function (p) {
    return p.name.toLowerCase() === name.toLowerCase();
  });
 
  if (exists) {
    personError.textContent = name + " is already in the group.";
    return;
  }
 
  people.push({ id: Date.now(), name: name });
  personInput.value = "";
  save();
  renderAll();
});
 
function removePerson(id) {
  const inUse = expenses.some(function (exp) {
    return exp.payerId === id || exp.participantIds.includes(id);
  });
 
  if (inUse) {
    personError.textContent = getName(id) + " is part of an expense. Delete those expenses first.";
    return;
  }
 
  people = people.filter(function (p) {
    return p.id !== id;
  });
  personError.textContent = "";
  save();
  renderAll();
}
 
function renderPeople() {
  if (people.length === 0) {
    peopleList.innerHTML = '<li class="empty">No one here yet. Add at least two people to begin.</li>';
    return;
  }
 
  peopleList.innerHTML = "";
  people.forEach(function (p) {
    const li = document.createElement("li");
    li.className = "chip " + colorClass(p.id);
    li.innerHTML = "<span>" + safe(p.name) + "</span>";
 
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.setAttribute("aria-label", "Remove " + p.name);
    btn.addEventListener("click", function () {
      removePerson(p.id);
    });
 
    li.appendChild(btn);
    peopleList.appendChild(li);
  });
}
 
// ---------- Expense form ----------
function renderFormOptions() {
  // remember what was ticked so it doesn't reset when a new person is added
  const ticked = getTickedIds();
  const alreadyShown = Array.from(participantsBox.querySelectorAll("input")).map(function (box) {
    return Number(box.value);
  });
  const currentPayer = Number(payerSelect.value);
 
  payerSelect.innerHTML = "";
  participantsBox.innerHTML = "";
 
  people.forEach(function (p) {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    payerSelect.appendChild(option);
 
    const label = document.createElement("label");
    label.className = "check";
    // new people start ticked, existing ones keep whatever they were set to
    const isTicked = !alreadyShown.includes(p.id) || ticked.includes(p.id);
    label.innerHTML = '<input type="checkbox" value="' + p.id + '"' + (isTicked ? " checked" : "") + "> " + safe(p.name);
    participantsBox.appendChild(label);
  });
 
  if (currentPayer) payerSelect.value = currentPayer;
}
 
function getTickedIds() {
  const boxes = participantsBox.querySelectorAll("input:checked");
  return Array.from(boxes).map(function (box) {
    return Number(box.value);
  });
}
 
selectAllBtn.addEventListener("click", function () {
  participantsBox.querySelectorAll("input").forEach(function (box) {
    box.checked = true;
  });
});
 
expenseForm.addEventListener("submit", function (e) {
  e.preventDefault();
  expenseError.textContent = "";
 
  const desc = descInput.value.trim();
  const amount = Math.round(parseFloat(amountInput.value) * 100);
  const payerId = Number(payerSelect.value);
  const participantIds = getTickedIds();
 
  if (people.length < 2) {
    expenseError.textContent = "Add at least two people in the Group members box first.";
    return;
  }
  if (desc === "") {
    expenseError.textContent = "Tell us what the expense was for.";
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    expenseError.textContent = "Enter an amount greater than zero.";
    return;
  }
  if (participantIds.length === 0) {
    expenseError.textContent = "Pick at least one person to split with.";
    return;
  }
 
  if (editingId) {
    const exp = expenses.find(function (x) {
      return x.id === editingId;
    });
    exp.desc = desc;
    exp.amount = amount;
    exp.payerId = payerId;
    exp.participantIds = participantIds;
  } else {
    expenses.push({
      id: Date.now(),
      desc: desc,
      amount: amount,
      payerId: payerId,
      participantIds: participantIds
    });
  }
 
  save();
  resetForm();
  renderAll();
});
 
cancelBtn.addEventListener("click", resetForm);
 
// quick amount buttons fill the amount box
document.querySelectorAll(".quick button").forEach(function (btn) {
  btn.addEventListener("click", function () {
    amountInput.value = btn.dataset.amount;
    amountInput.focus();
  });
});
 
// top right button wipes the group and all expenses
resetBtn.addEventListener("click", function () {
  if (!confirm("Clear all people and expenses?")) return;
 
  people = [];
  expenses = [];
  save();
  resetForm();
  renderAll();
});
 
function resetForm() {
  editingId = null;
  expenseForm.reset();
  expenseError.textContent = "";
  formTitle.textContent = "Add an expense";
  submitBtn.textContent = "Add expense";
  cancelBtn.classList.add("hidden");
  renderFormOptions();
  selectAllBtn.click();
}
 
function startEdit(id) {
  const exp = expenses.find(function (x) {
    return x.id === id;
  });
 
  editingId = id;
  descInput.value = exp.desc;
  amountInput.value = exp.amount / 100;
  payerSelect.value = exp.payerId;
 
  participantsBox.querySelectorAll("input").forEach(function (box) {
    box.checked = exp.participantIds.includes(Number(box.value));
  });
 
  formTitle.textContent = "Edit expense";
  submitBtn.textContent = "Save changes";
  cancelBtn.classList.remove("hidden");
  descInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 
function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
 
  expenses = expenses.filter(function (x) {
    return x.id !== id;
  });
 
  if (editingId === id) resetForm();
  save();
  renderAll();
}
 
// ---------- Calculations ----------
function calculateBalances() {
  const result = {};
  people.forEach(function (p) {
    result[p.id] = { paid: 0, share: 0, net: 0 };
  });
 
  expenses.forEach(function (exp) {
    result[exp.payerId].paid += exp.amount;
 
    // split evenly, and hand the leftover paise out one by one
    const count = exp.participantIds.length;
    const base = Math.floor(exp.amount / count);
    const leftover = exp.amount % count;
 
    exp.participantIds.forEach(function (id, index) {
      result[id].share += base + (index < leftover ? 1 : 0);
    });
  });
 
  people.forEach(function (p) {
    result[p.id].net = result[p.id].paid - result[p.id].share;
  });
 
  return result;
}
 
// Matches the biggest debtor with the biggest creditor until everyone is square
function makeSettlements(balances) {
  const debtors = [];
  const creditors = [];
 
  people.forEach(function (p) {
    const net = balances[p.id].net;
    if (net < 0) debtors.push({ id: p.id, amount: -net });
    if (net > 0) creditors.push({ id: p.id, amount: net });
  });
 
  const payments = [];
 
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(function (a, b) { return b.amount - a.amount; });
    creditors.sort(function (a, b) { return b.amount - a.amount; });
 
    const debtor = debtors[0];
    const creditor = creditors[0];
    const pay = Math.min(debtor.amount, creditor.amount);
 
    payments.push({ from: debtor.id, to: creditor.id, amount: pay });
 
    debtor.amount -= pay;
    creditor.amount -= pay;
 
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }
 
  return payments;
}
 
// ---------- Rendering results ----------
function renderBalances(balances) {
  if (people.length === 0) {
    balancesEl.innerHTML = '<p class="empty">Balances will show up once you add people.</p>';
    return;
  }
 
  balancesEl.innerHTML = "";
  people.forEach(function (p) {
    const b = balances[p.id];
    let text = "All settled";
    let cls = "zero";
 
    if (b.net > 0) {
      text = "Gets back " + formatMoney(b.net);
      cls = "pos";
    } else if (b.net < 0) {
      text = "Owes " + formatMoney(b.net);
      cls = "neg";
    }
 
    const row = document.createElement("div");
    row.className = "balance-row";
    row.innerHTML =
      '<div class="person">' +
        '<div class="avatar ' + colorClass(p.id) + '">' + safe(p.name.charAt(0).toUpperCase()) + "</div>" +
        "<div><div>" + safe(p.name) + "</div>" +
        '<div class="sub">Paid ' + formatMoney(b.paid) + " | Share " + formatMoney(b.share) + "</div></div>" +
      "</div>" +
      '<div class="amount ' + cls + '">' + text + "</div>";
    balancesEl.appendChild(row);
  });
}
 
function renderSettlements(balances) {
  if (expenses.length === 0) {
    settlementsEl.innerHTML = '<p class="empty">Nothing to settle yet.</p>';
    return;
  }
 
  const payments = makeSettlements(balances);
 
  if (payments.length === 0) {
    settlementsEl.innerHTML = '<div class="settled">Everyone is even. No payments needed.</div>';
    return;
  }
 
  settlementsEl.innerHTML = "";
  payments.forEach(function (pay) {
    const row = document.createElement("div");
    row.className = "pay-row";
    row.innerHTML =
      '<div class="pay-text">' +
        '<div class="avatar sm ' + colorClass(pay.from) + '">' + safe(getName(pay.from).charAt(0).toUpperCase()) + "</div>" +
        "<strong>" + safe(getName(pay.from)) + '</strong><span class="verb">pays</span>' +
        '<div class="avatar sm ' + colorClass(pay.to) + '">' + safe(getName(pay.to).charAt(0).toUpperCase()) + "</div>" +
        "<strong>" + safe(getName(pay.to)) + "</strong>" +
      "</div>" +
      '<div class="pay-amount">' + formatMoney(pay.amount) + "</div>";
    settlementsEl.appendChild(row);
  });
}
 
function renderExpenses() {
  if (expenses.length === 0) {
    expenseListEl.innerHTML = '<p class="empty">No expenses yet. Add your first one on the left.</p>';
    return;
  }
 
  expenseListEl.innerHTML = "";
 
  // newest first
  expenses.slice().reverse().forEach(function (exp) {
    const names = exp.participantIds.map(getName).join(", ");
 
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML =
      '<div class="info">' +
        '<div class="title">' + safe(exp.desc) + "</div>" +
        '<div class="sub">Paid by ' + safe(getName(exp.payerId)) + ". Split between " + safe(names) + ".</div>" +
        '<div class="actions"></div>' +
      "</div>" +
      '<div class="amount">' + formatMoney(exp.amount) + "</div>";
 
    const editBtn = document.createElement("button");
    editBtn.className = "small-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", function () {
      startEdit(exp.id);
    });
 
    const delBtn = document.createElement("button");
    delBtn.className = "small-btn danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function () {
      deleteExpense(exp.id);
    });
 
    item.querySelector(".actions").append(editBtn, delBtn);
    expenseListEl.appendChild(item);
  });
}
 
function renderAll() {
  const balances = calculateBalances();
  const total = expenses.reduce(function (sum, exp) {
    return sum + exp.amount;
  }, 0);
 
  totalSpentEl.textContent = formatMoney(total);
  statPeopleEl.textContent = people.length;
  statExpensesEl.textContent = expenses.length;
 
  renderPeople();
  renderFormOptions();
  renderBalances(balances);
  renderSettlements(balances);
  renderExpenses();
}
 
// ---------- Start ----------
load();
renderAll();