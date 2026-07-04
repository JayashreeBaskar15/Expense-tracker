/**
 * Expense Tracker — Application Logic
 * Data stored in browser localStorage (no server required)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'expenseTrackerData';
  const THEME_KEY = 'expenseTrackerTheme';

  const EXPENSE_CATEGORIES = [
    'Food', 'Travel', 'Shopping', 'Bills', 'Rent',
    'Entertainment', 'Health', 'Education', 'Others'
  ];

  const INCOME_CATEGORIES = [
    'Salary', 'Freelancing', 'Investments', 'Other Income'
  ];

  let data = { transactions: [], budgets: {} };
  let deleteTargetId = null;
  let charts = {};

  /* ======================== INIT ======================== */
  function init() {
    loadData();
    initTheme();
    setDefaultDates();
    populateCategorySelects();
    bindEvents();
    navigate('dashboard');
    refreshAll();
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) data = JSON.parse(saved);
    } catch {
      data = { transactions: [], budgets: {} };
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ======================== THEME ======================== */
  function initTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      refreshCharts();
    });
  }

  /* ======================== NAVIGATION ======================== */
  function bindEvents() {
    document.querySelectorAll('[data-page]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.dataset.page);
      });
    });

    document.getElementById('dashMonth').addEventListener('change', refreshDashboard);
    document.getElementById('transactionForm').addEventListener('submit', handleSubmit);
    document.getElementById('budgetForm').addEventListener('submit', handleBudget);
    document.getElementById('cancelEdit').addEventListener('click', resetForm);
    document.getElementById('applyFilter').addEventListener('click', renderAllTransactions);
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('exportCsv').addEventListener('click', exportCsv);

    document.querySelectorAll('input[name="type"]').forEach((radio) => {
      radio.addEventListener('change', updateCategoryOptions);
    });
  }

  function navigate(page) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    document.querySelectorAll('[data-page]').forEach((l) => {
      l.classList.toggle('active', l.dataset.page === page);
    });

    if (page === 'dashboard') refreshDashboard();
    if (page === 'transactions') renderAllTransactions();
    if (page === 'reports') refreshReports();
    if (page === 'add') syncBudgetForm();
  }

  /* ======================== CATEGORIES ======================== */
  function populateCategorySelects() {
    updateCategoryOptions();

    const filterCat = document.getElementById('filterCategory');
    const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    filterCat.innerHTML = '<option value="">All Categories</option>' +
      all.map((c) => `<option value="${c}">${c}</option>`).join('');
  }

  function updateCategoryOptions() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    document.getElementById('category').innerHTML =
      cats.map((c) => `<option value="${c}">${c}</option>`).join('');
  }

  /* ======================== DATES ======================== */
  function setDefaultDates() {
    const today = new Date();
    const month = formatMonth(today);
    const date = formatDate(today);

    document.getElementById('dashMonth').value = month;
    document.getElementById('date').value = date;
    document.getElementById('budgetMonth').value = month;
  }

  function formatDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatMonth(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDisplay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatMoney(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  /* ======================== CRUD ======================== */
  function handleSubmit(e) {
    e.preventDefault();

    const editId = document.getElementById('editId').value;
    const tx = {
      id: editId || Date.now().toString(),
      type: document.querySelector('input[name="type"]:checked').value,
      description: document.getElementById('description').value.trim(),
      amount: parseFloat(document.getElementById('amount').value),
      category: document.getElementById('category').value,
      payment: document.getElementById('payment').value,
      date: document.getElementById('date').value,
      notes: document.getElementById('notes').value.trim()
    };

    if (editId) {
      const idx = data.transactions.findIndex((t) => t.id === editId);
      if (idx !== -1) data.transactions[idx] = tx;
      showToast('Transaction updated!');
    } else {
      data.transactions.push(tx);
      showToast('Transaction added!');
    }

    saveData();
    resetForm();
    refreshAll();
    navigate('dashboard');
  }

  function resetForm() {
    document.getElementById('transactionForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('typeExpense').checked = true;
    updateCategoryOptions();
    document.getElementById('date').value = formatDate(new Date());
    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-plus-lg"></i> Add Transaction';
    document.getElementById('cancelEdit').classList.add('d-none');
  }

  function editTransaction(id) {
    const tx = data.transactions.find((t) => t.id === id);
    if (!tx) return;

    document.getElementById('editId').value = tx.id;
    document.getElementById('description').value = tx.description;
    document.getElementById('amount').value = tx.amount;
    document.getElementById('payment').value = tx.payment;
    document.getElementById('date').value = tx.date;
    document.getElementById('notes').value = tx.notes || '';

    if (tx.type === 'income') {
      document.getElementById('typeIncome').checked = true;
    } else {
      document.getElementById('typeExpense').checked = true;
    }
    updateCategoryOptions();
    document.getElementById('category').value = tx.category;

    document.getElementById('submitBtn').innerHTML = '<i class="bi bi-check-lg"></i> Update Transaction';
    document.getElementById('cancelEdit').classList.remove('d-none');
    navigate('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function promptDelete(id) {
    deleteTargetId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
  }

  function confirmDelete() {
    data.transactions = data.transactions.filter((t) => t.id !== deleteTargetId);
    saveData();
    deleteTargetId = null;
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    showToast('Transaction deleted.');
    refreshAll();
  }

  /* ======================== BUDGET ======================== */
  function handleBudget(e) {
    e.preventDefault();
    const month = document.getElementById('budgetMonth').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);
    if (!month || !amount) return;

    data.budgets[month] = amount;
    saveData();
    showToast('Budget saved!');
    refreshDashboard();
  }

  function syncBudgetForm() {
    const month = document.getElementById('budgetMonth').value;
    document.getElementById('budgetAmount').value = data.budgets[month] || '';
  }

  /* ======================== FILTERING ======================== */
  function getFilteredTransactions() {
    const type = document.getElementById('filterType')?.value || '';
    const category = document.getElementById('filterCategory')?.value || '';
    const payment = document.getElementById('filterPayment')?.value || '';
    const from = document.getElementById('filterFrom')?.value || '';
    const to = document.getElementById('filterTo')?.value || '';

    return data.transactions.filter((t) => {
      if (type && t.type !== type) return false;
      if (category && t.category !== category) return false;
      if (payment && t.payment !== payment) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function getMonthTransactions(month) {
    return data.transactions.filter((t) => t.date.startsWith(month));
  }

  /* ======================== DASHBOARD ======================== */
  function refreshDashboard() {
    const month = document.getElementById('dashMonth').value;
    const txs = getMonthTransactions(month);

    const income = sumByType(txs, 'income');
    const expense = sumByType(txs, 'expense');
    const balance = income - expense;
    const budget = data.budgets[month] || 0;
    const usedPercent = budget > 0 ? Math.round((expense / budget) * 100) : 0;

    document.getElementById('totalIncome').textContent = formatMoney(income);
    document.getElementById('totalExpense').textContent = formatMoney(expense);
    document.getElementById('balance').textContent = formatMoney(balance);
    document.getElementById('balance').style.color = balance >= 0 ? '#22c55e' : '#ef4444';
    document.getElementById('budgetUsed').textContent = budget > 0 ? `${usedPercent}%` : 'N/A';
    document.getElementById('budgetLabel').textContent = `${formatMoney(expense)} / ${formatMoney(budget)}`;

    const bar = document.getElementById('budgetBar');
    bar.style.width = `${Math.min(usedPercent, 100)}%`;
    bar.classList.toggle('over', budget > 0 && expense > budget);

    renderRecentTable(txs);
    renderCategoryChart(txs.filter((t) => t.type === 'expense'));
    renderIncomeExpenseChart(month);
  }

  function sumByType(txs, type) {
    return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  }

  function renderRecentTable(txs) {
    const tbody = document.getElementById('recentTable');
    const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions yet</td></tr>';
      return;
    }

    tbody.innerHTML = recent.map(renderRow).join('');
  }

  function renderAllTransactions() {
    const txs = getFilteredTransactions();
    const tbody = document.getElementById('allTransactionsTable');

    if (!txs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No transactions found</td></tr>';
      return;
    }

    tbody.innerHTML = txs.map((t) => `
      <tr>
        <td>${formatDisplay(t.date)}</td>
        <td>${esc(t.description)}</td>
        <td><span class="badge badge-cat">${esc(t.category)}</span></td>
        <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type}</span></td>
        <td>${esc(t.payment)}</td>
        <td class="${t.type === 'income' ? 'text-success' : 'text-danger'} fw-semibold">
          ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
        </td>
        <td>
          <button class="btn-action" onclick="ExpenseTracker.edit('${t.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-action delete" onclick="ExpenseTracker.remove('${t.id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function renderRow(t) {
    return `
      <tr>
        <td>${formatDisplay(t.date)}</td>
        <td>${esc(t.description)}</td>
        <td><span class="badge badge-cat">${esc(t.category)}</span></td>
        <td><span class="badge ${t.type === 'income' ? 'badge-income' : 'badge-expense'}">${t.type}</span></td>
        <td class="${t.type === 'income' ? 'text-success' : 'text-danger'} fw-semibold">
          ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
        </td>
      </tr>
    `;
  }

  /* ======================== CHARTS ======================== */
  function chartColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      palette: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#a855f7', '#14b8a6']
    };
  }

  function destroyChart(name) {
    if (charts[name]) { charts[name].destroy(); charts[name] = null; }
  }

  function renderCategoryChart(expenses) {
    destroyChart('category');
    const colors = chartColors();
    const grouped = {};

    expenses.forEach((t) => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);

    charts.category = new Chart(document.getElementById('categoryChart'), {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{ data: values.length ? values : [1], backgroundColor: colors.palette, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.text, padding: 14, usePointStyle: true } }
        }
      }
    });
  }

  function renderIncomeExpenseChart(month) {
    destroyChart('incomeExpense');
    const colors = chartColors();
    const months = getLast6Months(month);
    const labels = months.map((m) => {
      const [y, mo] = m.split('-');
      return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short' });
    });

    const incomeData = months.map((m) => sumByType(getMonthTransactions(m), 'income'));
    const expenseData = months.map((m) => sumByType(getMonthTransactions(m), 'expense'));

    charts.incomeExpense = new Chart(document.getElementById('incomeExpenseChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
          { label: 'Expense', data: expenseData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: colors.text } } },
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text, callback: (v) => '₹' + v }, grid: { color: colors.grid } }
        }
      }
    });
  }

  function getLast6Months(currentMonth) {
    const [y, m] = currentMonth.split('-').map(Number);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      months.push(formatMonth(d));
    }
    return months;
  }

  /* ======================== REPORTS ======================== */
  function refreshReports() {
    const month = formatMonth(new Date());
    const txs = getMonthTransactions(month);
    const income = sumByType(txs, 'income');
    const expense = sumByType(txs, 'expense');
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    document.getElementById('reportIncome').textContent = formatMoney(income);
    document.getElementById('reportExpense').textContent = formatMoney(expense);
    document.getElementById('reportSavings').textContent = `${savingsRate}%`;
    document.getElementById('reportSavings').style.color = savingsRate >= 0 ? '#22c55e' : '#ef4444';

    renderReportPie(txs.filter((t) => t.type === 'expense'));
    renderReportBar();
  }

  function renderReportPie(expenses) {
    destroyChart('reportPie');
    const colors = chartColors();
    const grouped = {};
    expenses.forEach((t) => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });

    charts.reportPie = new Chart(document.getElementById('reportPieChart'), {
      type: 'pie',
      data: {
        labels: Object.keys(grouped).length ? Object.keys(grouped) : ['No data'],
        datasets: [{
          data: Object.values(grouped).length ? Object.values(grouped) : [1],
          backgroundColor: colors.palette
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: colors.text } } }
      }
    });
  }

  function renderReportBar() {
    destroyChart('reportBar');
    const colors = chartColors();
    const months = getLast6Months(formatMonth(new Date()));

    charts.reportBar = new Chart(document.getElementById('reportBarChart'), {
      type: 'bar',
      data: {
        labels: months.map((m) => {
          const [y, mo] = m.split('-');
          return new Date(y, mo - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
          label: 'Expenses',
          data: months.map((m) => sumByType(getMonthTransactions(m), 'expense')),
          backgroundColor: 'rgba(59,130,246,0.7)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
        }
      }
    });
  }

  function refreshCharts() {
    refreshDashboard();
    refreshReports();
  }

  /* ======================== EXPORT ======================== */
  function exportCsv() {
    if (!data.transactions.length) {
      showToast('No data to export.');
      return;
    }

    const headers = ['Date', 'Type', 'Description', 'Category', 'Payment', 'Amount', 'Notes'];
    const rows = data.transactions.map((t) =>
      [t.date, t.type, t.description, t.category, t.payment, t.amount, t.notes || '']
    );

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expense-tracker-${formatDate(new Date())}.csv`;
    a.click();
    showToast('CSV exported!');
  }

  /* ======================== UTILS ======================== */
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showToast(msg) {
    document.getElementById('toastMsg').textContent = msg;
    const t = new bootstrap.Toast(document.getElementById('toast'), { delay: 2500 });
    t.show();
  }

  function refreshAll() {
    refreshDashboard();
    renderAllTransactions();
    refreshReports();
  }

  /* ======================== PUBLIC API ======================== */
  window.ExpenseTracker = {
    edit: editTransaction,
    remove: promptDelete
  };

  document.addEventListener('DOMContentLoaded', init);
})();
