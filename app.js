const STORAGE_KEY = "mini-ledger-records";

const categories = {
  expense: ["餐飲", "交通", "購物", "娛樂", "住家", "醫療", "其他"],
  income: ["薪資", "獎金", "投資", "副業", "退款", "其他"],
};

const form = document.querySelector("#entryForm");
const dateInput = document.querySelector("#dateInput");
const amountInput = document.querySelector("#amountInput");
const categoryInput = document.querySelector("#categoryInput");
const noteInput = document.querySelector("#noteInput");
const monthFilter = document.querySelector("#monthFilter");
const recordsBody = document.querySelector("#recordsBody");
const emptyState = document.querySelector("#emptyState");
const recordCount = document.querySelector("#recordCount");
const categoryBars = document.querySelector("#categoryBars");
const incomeTotal = document.querySelector("#incomeTotal");
const expenseTotal = document.querySelector("#expenseTotal");
const balanceTotal = document.querySelector("#balanceTotal");
const exportCsv = document.querySelector("#exportCsv");
const clearAll = document.querySelector("#clearAll");

let records = loadRecords();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return today().slice(0, 7);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function selectedType() {
  return new FormData(form).get("type");
}

function setCategoryOptions(type) {
  categoryInput.innerHTML = categories[type]
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function filteredRecords() {
  return records
    .filter((record) => record.date.startsWith(monthFilter.value))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderSummary(items) {
  const income = items
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + record.amount, 0);
  const expense = items
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amount, 0);

  incomeTotal.textContent = formatCurrency(income);
  expenseTotal.textContent = formatCurrency(expense);
  balanceTotal.textContent = formatCurrency(income - expense);
}

function renderCategoryBars(items) {
  const expenseItems = items.filter((record) => record.type === "expense");
  const totals = expenseItems.reduce((result, record) => {
    result[record.category] = (result[record.category] ?? 0) + record.amount;
    return result;
  }, {});
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((row) => row[1]), 1);

  categoryBars.innerHTML = rows.length
    ? rows
        .map(([category, amount]) => {
          const width = Math.round((amount / max) * 100);
          return `
            <div class="bar-row">
              <span>${category}</span>
              <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
              <strong>${formatCurrency(amount)}</strong>
            </div>
          `;
        })
        .join("")
    : `<p class="empty-state show">尚無支出分類統計。</p>`;
}

function renderRecords(items) {
  recordCount.textContent = `${items.length} 筆`;
  recordsBody.innerHTML = items
    .map(
      (record) => `
        <tr>
          <td>${record.date}</td>
          <td><span class="tag ${record.type}">${record.type === "income" ? "收入" : "支出"}</span></td>
          <td>${record.category}</td>
          <td>${record.note || "-"}</td>
          <td class="amount-col">${record.type === "income" ? "+" : "-"}${formatCurrency(record.amount)}</td>
          <td><button class="delete-button" data-id="${record.id}" type="button">刪除</button></td>
        </tr>
      `,
    )
    .join("");
  emptyState.classList.toggle("show", items.length === 0);
}

function render() {
  const items = filteredRecords();
  renderSummary(items);
  renderCategoryBars(items);
  renderRecords(items);
}

function addRecord(event) {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  records.push({
    id: crypto.randomUUID(),
    type: selectedType(),
    date: dateInput.value,
    amount,
    category: categoryInput.value,
    note: noteInput.value.trim(),
    createdAt: Date.now(),
  });

  saveRecords();
  form.reset();
  dateInput.value = today();
  monthFilter.value = dateInput.value.slice(0, 7);
  setCategoryOptions(selectedType());
  render();
}

function deleteRecord(id) {
  records = records.filter((record) => record.id !== id);
  saveRecords();
  render();
}

function exportCurrentMonth() {
  const items = filteredRecords();
  const header = ["日期", "類型", "分類", "備註", "金額"];
  const rows = items.map((record) => [
    record.date,
    record.type === "income" ? "收入" : "支出",
    record.category,
    record.note,
    record.type === "income" ? record.amount : -record.amount,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `小記帳-${monthFilter.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll('input[name="type"]').forEach((input) => {
  input.addEventListener("change", () => setCategoryOptions(selectedType()));
});

recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (button) deleteRecord(button.dataset.id);
});

form.addEventListener("submit", addRecord);
monthFilter.addEventListener("change", render);
exportCsv.addEventListener("click", exportCurrentMonth);
clearAll.addEventListener("click", () => {
  if (!records.length || !confirm("確定要清空所有記帳資料？")) return;
  records = [];
  saveRecords();
  render();
});

dateInput.value = today();
monthFilter.value = currentMonth();
setCategoryOptions("expense");
render();
