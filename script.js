/**
 * SplitLedger - Next-Gen Expense Tracker & Bill Splitter
 * Designed for IIT Bombay Techfest Zero Code Challenge / SIRT College Bhopal
 * 100% Offline, Pure Vanilla JavaScript, Zero External Dependencies
 */

(function () {
  'use strict';

  // Storage Keys for Persistence across Page Reloads
  const STORAGE_KEY_STATE = 'splitledger_modern_state_v4';
  const STORAGE_KEY_VALIDATION = 'splitledger_modern_validation_v4';
  const STORAGE_KEY_GROUPS = 'splitledger_saved_groups_v4';

  // Vibrant Palette for Participants & Visualizer
  const PALETTE = [
    '#4f46e5', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#3b82f6', // Blue
    '#84cc16', // Lime
  ];

  // Default Seed Groups
  const defaultGroups = [
    {
      id: 'group_canteen',
      name: '☕ College Canteen (Weekly)',
      occasion: 'SIRT College Canteen Weekly Expenses',
      billAmount: '1200',
      peopleCount: 4,
      payerType: 'multi',
      singlePayerIndex: 0,
      participants: [
        { name: 'Atharv', paid: 600 },
        { name: 'Rahul', paid: 400 },
        { name: 'Priya', paid: 200 },
        { name: 'Amit', paid: 0 },
      ],
      expenses: [
        { id: 1, title: 'Monday Canteen Lunch', amount: 550, paidBy: 'Atharv' },
        { id: 2, title: 'Wednesday Tea & Samosas', amount: 250, paidBy: 'Rahul' },
        { id: 3, title: 'Friday Snacks & Juices', amount: 400, paidBy: 'Priya' },
      ],
    },
    {
      id: 'group_project',
      name: '💻 Major Project Team',
      occasion: 'Final Year B.Tech Major Project Expenses',
      billAmount: '1800',
      peopleCount: 3,
      payerType: 'multi',
      singlePayerIndex: 0,
      participants: [
        { name: 'Atharv', paid: 1000 },
        { name: 'Sneha', paid: 800 },
        { name: 'Divya', paid: 0 },
      ],
      expenses: [
        { id: 1, title: 'Microcontroller & Sensors', amount: 1000, paidBy: 'Atharv' },
        { id: 2, title: 'Color Report Printing & Hard Binding', amount: 800, paidBy: 'Sneha' },
      ],
    },
    {
      id: 'group_hostel',
      name: '🏠 Hostel Flat 304',
      occasion: 'Monthly Flat Groceries & WiFi Bill',
      billAmount: '3200',
      peopleCount: 4,
      payerType: 'single',
      singlePayerIndex: 0,
      participants: [
        { name: 'Vikram', paid: 3200 },
        { name: 'Deepak', paid: 0 },
        { name: 'Rohan', paid: 0 },
        { name: 'Kunal', paid: 0 },
      ],
      expenses: [
        { id: 1, title: 'High-speed Fiber WiFi', amount: 1200, paidBy: 'Vikram' },
        { id: 2, title: '20L Mineral Water Cans', amount: 600, paidBy: 'Vikram' },
        { id: 3, title: 'Milk, Eggs & Bread Supplies', amount: 1400, paidBy: 'Vikram' },
      ],
    },
  ];

  let savedGroups = [];
  let activeGroupId = 'instant'; // 'instant' (ad-hoc without group) or group id

  // Ad-hoc Instant Split Scratchpad state
  const instantState = {
    occasion: 'Canteen Tea & Snacks Split',
    billAmount: '160',
    peopleCount: 4,
    currency: '₹',
    mode: 'quick',
    payerType: 'multi',
    singlePayerIndex: 0,
    participants: [
      { name: 'Atharv', paid: 160 },
      { name: 'Rahul', paid: 0 },
      { name: 'Priya', paid: 0 },
      { name: 'Amit', paid: 0 },
    ],
    expenses: [
      { id: 1, title: 'Special Masala Tea (4 cups)', amount: 80, paidBy: 'Atharv' },
      { id: 2, title: 'Hot Samosas & Chutney', amount: 80, paidBy: 'Atharv' },
    ],
    hasCalculated: false,
  };

  let state = { ...instantState };

  // DOM Elements Cache
  const DOM = {};

  function initDOM() {
    DOM.currencySelect = document.getElementById('currencySelect');
    DOM.tabQuick = document.getElementById('tabQuick');
    DOM.tabExpenses = document.getElementById('tabExpenses');
    DOM.quickBillSection = document.getElementById('quickBillSection');
    DOM.expensesTrackerSection = document.getElementById('expensesTrackerSection');

    DOM.occasionInput = document.getElementById('occasionInput');
    DOM.billAmountInput = document.getElementById('billAmountInput');
    DOM.peopleCountInput = document.getElementById('peopleCountInput');

    DOM.payerNoneRadio = document.getElementById('payerNoneRadio');
    DOM.payerSingleRadio = document.getElementById('payerSingleRadio');
    DOM.payerMultiRadio = document.getElementById('payerMultiRadio');
    DOM.singlePayerSelectContainer = document.getElementById('singlePayerSelectContainer');
    DOM.singlePayerSelect = document.getElementById('singlePayerSelect');
    DOM.participantsSection = document.getElementById('participantsSection');
    DOM.participantsTableBody = document.getElementById('participantsTableBody');

    DOM.expensesTableBody = document.getElementById('expensesTableBody');
    DOM.newExpenseTitle = document.getElementById('newExpenseTitle');
    DOM.newExpenseAmount = document.getElementById('newExpenseAmount');
    DOM.newExpensePayer = document.getElementById('newExpensePayer');
    DOM.btnAddExpense = document.getElementById('btnAddExpense');
    DOM.expensesGrandTotal = document.getElementById('expensesGrandTotal');

    DOM.btnCalculate = document.getElementById('btnCalculate');
    DOM.btnReset = document.getElementById('btnReset');

    DOM.validationMessageBox = document.getElementById('validationMessageBox');
    DOM.validationMessageText = document.getElementById('validationMessageText');

    DOM.emptyResultsBox = document.getElementById('emptyResultsBox');
    DOM.resultsContainer = document.getElementById('resultsContainer');

    DOM.resOccasionName = document.getElementById('resOccasionName');
    DOM.resTotalBill = document.getElementById('resTotalBill');
    DOM.resPerPersonBase = document.getElementById('resPerPersonBase');
    DOM.resHeadcount = document.getElementById('resHeadcount');

    DOM.auditBillAmount = document.getElementById('auditBillAmount');
    DOM.auditSharesSum = document.getElementById('auditSharesSum');
    DOM.auditDiff = document.getElementById('auditDiff');

    DOM.distributionBar = document.getElementById('distributionBar');
    DOM.distributionLegend = document.getElementById('distributionLegend');

    DOM.sharesTableBody = document.getElementById('sharesTableBody');
    DOM.settlementList = document.getElementById('settlementList');
    DOM.settlementCount = document.getElementById('settlementCount');

    DOM.noteTopPayer = document.getElementById('noteTopPayer');
    DOM.noteReconciled = document.getElementById('noteReconciled');

    DOM.btnCopySummary = document.getElementById('btnCopySummary');
    DOM.btnPrintReceipt = document.getElementById('btnPrintReceipt');
    DOM.toastNotice = document.getElementById('toastNotice');

    DOM.printOccasionName = document.getElementById('printOccasionName');
    DOM.printReceiptDate = document.getElementById('printReceiptDate');

    // Groups Hub Elements
    DOM.savedGroupsList = document.getElementById('savedGroupsList');
    DOM.btnNewGroup = document.getElementById('btnNewGroup');
    DOM.btnSaveCurrentGroup = document.getElementById('btnSaveCurrentGroup');
    DOM.btnEditCurrentGroup = document.getElementById('btnEditCurrentGroup');
    DOM.btnDeleteCurrentGroup = document.getElementById('btnDeleteCurrentGroup');

    // Group Modal Elements
    DOM.groupModal = document.getElementById('groupModal');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.groupNameInput = document.getElementById('groupNameInput');
    DOM.groupMembersInput = document.getElementById('groupMembersInput');
    DOM.btnModalClose = document.getElementById('btnModalClose');
    DOM.btnModalCancel = document.getElementById('btnModalCancel');
    DOM.btnModalSave = document.getElementById('btnModalSave');

    // Delete Modal Elements
    DOM.deleteModal = document.getElementById('deleteModal');
    DOM.deleteTargetGroupName = document.getElementById('deleteTargetGroupName');
    DOM.btnDeleteModalClose = document.getElementById('btnDeleteModalClose');
    DOM.btnDeleteModalCancel = document.getElementById('btnDeleteModalCancel');
    DOM.btnDeleteModalConfirm = document.getElementById('btnDeleteModalConfirm');
  }

  // Load Groups & State from localStorage
  function loadPersistedData() {
    try {
      const groupsStr = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (groupsStr) {
        savedGroups = JSON.parse(groupsStr);
      } else {
        savedGroups = JSON.parse(JSON.stringify(defaultGroups));
        persistGroups();
      }

      const savedState = localStorage.getItem(STORAGE_KEY_STATE);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        state = { ...instantState, ...parsed };
        if (state.activeGroupId) {
          activeGroupId = state.activeGroupId;
        }
      }
    } catch (e) {
      console.warn('Error reading localStorage', e);
      savedGroups = JSON.parse(JSON.stringify(defaultGroups));
    }
  }

  function persistGroups() {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(savedGroups));
    } catch (e) {
      console.warn('Error saving groups', e);
    }
  }

  function persistState() {
    try {
      state.activeGroupId = activeGroupId;
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    } catch (e) {
      console.warn('Error saving state', e);
    }
  }

  function persistValidationMessage(msg) {
    try {
      if (msg) {
        localStorage.setItem(STORAGE_KEY_VALIDATION, JSON.stringify({ active: true, message: msg }));
      } else {
        localStorage.removeItem(STORAGE_KEY_VALIDATION);
      }
    } catch (e) {
      console.warn('Error saving validation msg', e);
    }
  }

  function getPersistedValidationMessage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VALIDATION);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading validation msg', e);
    }
    return null;
  }

  function showToast(message) {
    if (!DOM.toastNotice) return;
    DOM.toastNotice.textContent = message;
    DOM.toastNotice.classList.add('show');
    setTimeout(() => {
      DOM.toastNotice.classList.remove('show');
    }, 2800);
  }

  function fmt(num) {
    const val = Number(num) || 0;
    return `${state.currency} ${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function showValidationError(message) {
    DOM.validationMessageText.textContent = message;
    DOM.validationMessageBox.classList.remove('hidden');
    DOM.resultsContainer.classList.add('hidden');
    DOM.emptyResultsBox.style.display = 'block';

    persistValidationMessage(message);
    state.hasCalculated = false;
    persistState();
  }

  function clearValidationError() {
    DOM.validationMessageBox.classList.add('hidden');
    DOM.validationMessageText.textContent = '';
    persistValidationMessage(null);
  }

  // --- Groups Hub & Instant Ad-Hoc Split ---
  function renderSavedGroups() {
    if (!DOM.savedGroupsList) return;
    DOM.savedGroupsList.innerHTML = '';

    // 1. Instant Ad-hoc Split Button (Always first, allows dividing without selecting/saving a group)
    const instantBtn = document.createElement('button');
    instantBtn.type = 'button';
    instantBtn.className = `group-tab-chip instant ${activeGroupId === 'instant' ? 'active' : ''}`;
    instantBtn.innerHTML = `
      <span style="font-weight: 800;">⚡ Instant Split</span>
      <span class="group-member-count">Ad-hoc (No Group)</span>
    `;
    instantBtn.addEventListener('click', () => {
      switchToInstantSplit();
    });
    DOM.savedGroupsList.appendChild(instantBtn);

    // 2. Render all saved groups
    savedGroups.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `group-tab-chip ${g.id === activeGroupId ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${escapeHTML(g.name)}</span>
        <span class="group-member-count">${g.participants ? g.participants.length : 0} friends</span>
      `;
      btn.addEventListener('click', () => {
        switchGroup(g.id);
      });
      DOM.savedGroupsList.appendChild(btn);
    });

    updateGroupControlButtons();
  }

  function updateGroupControlButtons() {
    const isInstant = activeGroupId === 'instant';
    if (DOM.btnDeleteCurrentGroup) {
      DOM.btnDeleteCurrentGroup.style.display = isInstant ? 'none' : 'inline-flex';
    }
    if (DOM.btnEditCurrentGroup) {
      DOM.btnEditCurrentGroup.style.display = isInstant ? 'none' : 'inline-flex';
    }
    if (DOM.btnSaveCurrentGroup) {
      DOM.btnSaveCurrentGroup.textContent = isInstant ? '💾 Save as New Group' : '💾 Save Changes';
    }
  }

  function switchToInstantSplit() {
    activeGroupId = 'instant';
    state.activeGroupId = 'instant';
    state.occasion = 'Canteen Tea & Snacks Split';
    state.billAmount = '160';
    state.peopleCount = 4;
    state.payerType = 'multi';
    state.singlePayerIndex = 0;
    state.participants = [
      { name: 'Atharv', paid: 160 },
      { name: 'Rahul', paid: 0 },
      { name: 'Priya', paid: 0 },
      { name: 'Amit', paid: 0 },
    ];
    state.expenses = [
      { id: 1, title: 'Special Masala Tea (4 cups)', amount: 80, paidBy: 'Atharv' },
      { id: 2, title: 'Hot Samosas & Chutney', amount: 80, paidBy: 'Atharv' },
    ];

    syncFormInputsWithState();
    clearValidationError();
    performBillSplit();
    renderSavedGroups();
    showToast('Switched to Instant Split (Ad-hoc mode without group).');
  }

  function switchGroup(groupId) {
    const g = savedGroups.find((x) => x.id === groupId);
    if (!g) return;

    activeGroupId = groupId;
    state.activeGroupId = groupId;
    state.occasion = g.occasion || g.name;
    state.billAmount = g.billAmount || '1000';
    state.peopleCount = g.peopleCount || (g.participants ? g.participants.length : 4);
    state.payerType = g.payerType || 'multi';
    state.singlePayerIndex = g.singlePayerIndex || 0;
    state.participants = JSON.parse(JSON.stringify(g.participants || []));
    state.expenses = JSON.parse(JSON.stringify(g.expenses || []));

    syncFormInputsWithState();
    clearValidationError();
    performBillSplit();
    renderSavedGroups();
    showToast(`Switched to ledger: "${g.name}"`);
  }

  let modalMode = 'new'; // 'new' | 'edit'

  function openGroupModal(mode) {
    modalMode = mode;
    if (mode === 'new') {
      DOM.modalTitle.textContent = 'Create New Team / Ledger';
      DOM.groupNameInput.value = '';
      DOM.groupMembersInput.value = state.participants.map((p) => p.name).join(', ') || 'Atharv, Rahul, Priya, Amit';
    } else {
      const current = savedGroups.find((x) => x.id === activeGroupId);
      DOM.modalTitle.textContent = 'Edit Current Group';
      DOM.groupNameInput.value = current ? current.name : '';
      DOM.groupMembersInput.value = current && current.participants ? current.participants.map((p) => p.name).join(', ') : '';
    }
    DOM.groupModal.classList.remove('hidden');
    DOM.groupNameInput.focus();
  }

  function closeGroupModal() {
    DOM.groupModal.classList.add('hidden');
  }

  function saveGroupModal() {
    const name = (DOM.groupNameInput.value || '').trim();
    const rawMembers = (DOM.groupMembersInput.value || '').trim();

    if (!name) {
      showValidationError('Please provide a name for this group / ledger.');
      return;
    }

    const memberNames = rawMembers
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (memberNames.length === 0) {
      showValidationError('Please specify at least one member name.');
      return;
    }

    if (modalMode === 'new') {
      const newId = 'group_' + Date.now();
      const participants = memberNames.map((m, idx) => ({
        name: m,
        paid: state.participants[idx]?.paid || 0,
      }));
      const newGroup = {
        id: newId,
        name: name,
        occasion: state.occasion || name,
        billAmount: state.billAmount || '1200',
        peopleCount: participants.length,
        payerType: state.payerType || 'multi',
        singlePayerIndex: 0,
        participants: participants,
        expenses: JSON.parse(JSON.stringify(state.expenses || [])),
      };
      savedGroups.push(newGroup);
      persistGroups();
      closeGroupModal();
      switchGroup(newId);
      showToast(`Created & switched to "${name}"`);
    } else {
      const current = savedGroups.find((x) => x.id === activeGroupId);
      if (current) {
        current.name = name;
        current.occasion = name;
        const oldParticipants = current.participants || [];
        const newParticipants = memberNames.map((mName) => {
          const match = oldParticipants.find((p) => p.name.toLowerCase() === mName.toLowerCase());
          return {
            name: mName,
            paid: match ? match.paid : 0,
          };
        });
        current.participants = newParticipants;
        current.peopleCount = newParticipants.length;

        persistGroups();
        closeGroupModal();
        switchGroup(activeGroupId);
        showToast(`Updated group details for "${name}"`);
      }
    }
  }

  function saveCurrentChangesToGroup() {
    if (activeGroupId === 'instant') {
      // In Instant mode, clicking Save will prompt to save as a new permanent group
      openGroupModal('new');
      return;
    }

    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) return;

    current.occasion = state.occasion;
    current.billAmount = state.billAmount;
    current.peopleCount = state.peopleCount;
    current.payerType = state.payerType;
    current.singlePayerIndex = state.singlePayerIndex;
    current.participants = JSON.parse(JSON.stringify(state.participants));
    current.expenses = JSON.parse(JSON.stringify(state.expenses));

    persistGroups();
    persistState();
    renderSavedGroups();
    showToast(`Saved changes to "${current.name}"`);
  }

  // In-App Custom Delete Modal (Fixes iframe blockage)
  function openDeleteModal() {
    if (activeGroupId === 'instant') {
      showToast('You are in Instant Split mode (no group to delete).');
      return;
    }
    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) return;

    DOM.deleteTargetGroupName.textContent = current.name;
    DOM.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    DOM.deleteModal.classList.add('hidden');
  }

  function confirmDeleteGroup() {
    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) {
      closeDeleteModal();
      return;
    }

    const deletedName = current.name;
    savedGroups = savedGroups.filter((x) => x.id !== activeGroupId);
    persistGroups();
    closeDeleteModal();

    if (savedGroups.length > 0) {
      activeGroupId = savedGroups[0].id;
      switchGroup(activeGroupId);
    } else {
      switchToInstantSplit();
    }
    showToast(`Deleted ledger "${deletedName}".`);
  }

  // --- Bi-directional Auto-sync between Expenses & Quick Split ---
  function syncExpensesWithParticipants() {
    let grandTotal = 0;
    const paidByMap = {};

    // Initialize map with current participant names
    state.participants.forEach((p) => {
      paidByMap[p.name.trim().toLowerCase()] = 0;
    });

    state.expenses.forEach((item) => {
      const amt = Number(item.amount) || 0;
      grandTotal += amt;
      const key = (item.paidBy || '').trim().toLowerCase();
      if (paidByMap[key] !== undefined) {
        paidByMap[key] += amt;
      } else {
        paidByMap[key] = amt;
      }
    });

    // Automatically update each participant's paid amount in state
    state.participants.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (paidByMap[key] !== undefined) {
        p.paid = paidByMap[key];
      }
    });

    // Update bill amount
    state.billAmount = grandTotal.toString();
    DOM.billAmountInput.value = grandTotal;
    DOM.expensesGrandTotal.textContent = fmt(grandTotal);

    // Re-render participants table so inputs reflect synced paid amounts
    renderParticipantsUI();
    persistState();
  }

  function syncParticipantsCount(newCount) {
    const count = parseInt(newCount, 10);
    if (isNaN(count) || count < 1) return;

    const currentParticipants = state.participants || [];
    const updated = [];

    for (let i = 0; i < count; i++) {
      if (currentParticipants[i]) {
        updated.push(currentParticipants[i]);
      } else {
        updated.push({
          name: `Person ${i + 1}`,
          paid: 0,
        });
      }
    }

    state.participants = updated;
    state.peopleCount = count;
    renderParticipantsUI();
    renderSinglePayerDropdown();
    renderExpensePayerDropdown();
  }

  function renderParticipantsUI() {
    DOM.participantsTableBody.innerHTML = '';
    const showPaidColumn = state.payerType === 'multi';

    state.participants.forEach((p, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; display: inline-block; flex-shrink: 0;"></span>
          <input type="text" class="participant-name-input" value="${escapeHTML(p.name)}" placeholder="Person ${idx + 1}" data-index="${idx}">
        </div>
      `;
      tr.appendChild(tdName);

      if (showPaidColumn) {
        const tdPaid = document.createElement('td');
        tdPaid.innerHTML = `
          <input type="number" class="participant-paid-input" min="0" step="0.01" value="${p.paid !== undefined ? p.paid : 0}" placeholder="0.00" data-index="${idx}">
        `;
        tr.appendChild(tdPaid);
      }

      DOM.participantsTableBody.appendChild(tr);
    });

    const paidHeader = document.getElementById('thPaidHeader');
    if (paidHeader) {
      paidHeader.style.display = showPaidColumn ? '' : 'none';
    }

    DOM.participantsTableBody.querySelectorAll('.participant-name-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (state.participants[idx]) {
          state.participants[idx].name = e.target.value.trim() || `Person ${idx + 1}`;
          renderSinglePayerDropdown();
          renderExpensePayerDropdown();
          persistState();
        }
      });
    });

    DOM.participantsTableBody.querySelectorAll('.participant-paid-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (state.participants[idx]) {
          state.participants[idx].paid = parseFloat(e.target.value) || 0;
          persistState();
        }
      });
    });
  }

  function renderSinglePayerDropdown() {
    if (!DOM.singlePayerSelect) return;
    DOM.singlePayerSelect.innerHTML = '';

    state.participants.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${p.name || 'Person ' + (idx + 1)}`;
      if (idx === state.singlePayerIndex) {
        opt.selected = true;
      }
      DOM.singlePayerSelect.appendChild(opt);
    });
  }

  // Ensures all participants appear as options in the "Paid By" dropdown
  function renderExpensePayerDropdown() {
    if (!DOM.newExpensePayer) return;
    const currentSelected = DOM.newExpensePayer.value;
    DOM.newExpensePayer.innerHTML = '';

    state.participants.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      if (p.name === currentSelected) {
        opt.selected = true;
      }
      DOM.newExpensePayer.appendChild(opt);
    });
  }

  function renderExpensesUI() {
    DOM.expensesTableBody.innerHTML = '';
    let grandTotal = 0;

    if (!state.expenses || state.expenses.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-muted); padding: 18px;">No line items added yet. Add one below.</td>`;
      DOM.expensesTableBody.appendChild(tr);
    } else {
      state.expenses.forEach((item) => {
        grandTotal += Number(item.amount) || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="color: var(--text-title);">${escapeHTML(item.title)}</strong></td>
          <td class="tabular-nums" style="font-weight: 700;">${fmt(item.amount)}</td>
          <td><span style="font-weight: 700; color: var(--accent-indigo); background: var(--accent-indigo-light); padding: 2px 8px; border-radius: 6px; font-size: 12px;">${escapeHTML(item.paidBy)}</span></td>
          <td style="text-align: right;">
            <button type="button" class="btn-remove-line" data-id="${item.id}">Remove</button>
          </td>
        `;
        DOM.expensesTableBody.appendChild(tr);
      });
    }

    DOM.expensesGrandTotal.textContent = fmt(grandTotal);

    if (state.mode === 'expenses') {
      state.billAmount = grandTotal.toString();
      DOM.billAmountInput.value = grandTotal;
    }

    DOM.expensesTableBody.querySelectorAll('.btn-remove-line').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        state.expenses = state.expenses.filter((x) => x.id !== id);
        syncExpensesWithParticipants();
        renderExpensesUI();
        if (state.hasCalculated) {
          performBillSplit();
        }
      });
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function performBillSplit() {
    const occasion = (DOM.occasionInput.value || '').trim() || 'Untitled Bill Event';
    state.occasion = occasion;

    const billRaw = state.mode === 'expenses'
      ? parseFloat(DOM.billAmountInput.value) || state.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : parseFloat(DOM.billAmountInput.value);

    if (isNaN(billRaw) || billRaw === null || DOM.billAmountInput.value.trim() === '') {
      showValidationError('Bill amount cannot be empty. Please enter a valid numerical amount.');
      return;
    }

    if (billRaw <= 0) {
      showValidationError(`Bill amount cannot be zero or negative (Entered: ${billRaw}). Please enter an amount greater than 0.`);
      return;
    }

    const peopleRaw = parseInt(DOM.peopleCountInput.value, 10);
    const peopleStr = DOM.peopleCountInput.value.trim();

    if (peopleStr === '' || isNaN(peopleRaw)) {
      showValidationError('Number of people cannot be empty. Please specify how many people are splitting.');
      return;
    }

    if (peopleRaw <= 0) {
      showValidationError(`Number of people cannot be zero or negative (Entered: ${peopleRaw}). Minimum 1 person required.`);
      return;
    }

    if (!Number.isInteger(Number(peopleStr))) {
      showValidationError(`Number of people must be a whole integer number (Entered: ${peopleStr}).`);
      return;
    }

    syncParticipantsCount(peopleRaw);

    const totalBill = Math.round(billRaw * 100) / 100;
    const numPeople = peopleRaw;

    const totalCents = Math.round(totalBill * 100);
    const baseCents = Math.floor(totalCents / numPeople);
    let remainderCents = totalCents - (baseCents * numPeople);

    const individualShares = [];
    for (let i = 0; i < numPeople; i++) {
      let shareCents = baseCents;
      if (remainderCents > 0) {
        shareCents += 1;
        remainderCents -= 1;
      }
      individualShares.push(shareCents / 100);
    }

    let paidAmounts = [];

    if (state.payerType === 'none') {
      paidAmounts = new Array(numPeople).fill(0);
    } else if (state.payerType === 'single') {
      paidAmounts = new Array(numPeople).fill(0);
      const payerIdx = Math.min(state.singlePayerIndex, numPeople - 1);
      paidAmounts[payerIdx] = totalBill;
    } else if (state.payerType === 'multi') {
      paidAmounts = state.participants.map((p) => Number(p.paid) || 0);

      const totalPaid = paidAmounts.reduce((sum, v) => sum + v, 0);
      const difference = Math.abs(totalPaid - totalBill);

      if (difference > 0.05) {
        showValidationError(`Total amount paid by participants (${fmt(totalPaid)}) does not match Total Bill (${fmt(totalBill)}). Please ensure sum of payments equals the bill.`);
        return;
      }
    }

    clearValidationError();

    const participantBreakdowns = [];
    let sumOfShares = 0;

    for (let i = 0; i < numPeople; i++) {
      const p = state.participants[i];
      const name = p ? p.name : `Person ${i + 1}`;
      const share = individualShares[i];
      const paid = paidAmounts[i] || 0;
      const net = Math.round((paid - share) * 100) / 100;

      sumOfShares += share;

      participantBreakdowns.push({
        index: i,
        name,
        paid,
        share,
        net,
        color: PALETTE[i % PALETTE.length],
      });
    }

    sumOfShares = Math.round(sumOfShares * 100) / 100;
    const discrepancy = Math.abs(Math.round((totalBill - sumOfShares) * 100) / 100);

    const settlements = calculateSettlements(participantBreakdowns);

    renderResults({
      occasion,
      totalBill,
      numPeople,
      sumOfShares,
      discrepancy,
      participantBreakdowns,
      settlements,
    });

    state.hasCalculated = true;
    persistState();
    showToast('Calculated fair shares with 100% penny audit.');
  }

  function calculateSettlements(breakdowns) {
    const creditors = [];
    const debtors = [];

    breakdowns.forEach((p) => {
      const netCents = Math.round(p.net * 100);
      if (netCents > 0) {
        creditors.push({ name: p.name, amountCents: netCents });
      } else if (netCents < 0) {
        debtors.push({ name: p.name, amountCents: -netCents });
      }
    });

    creditors.sort((a, b) => b.amountCents - a.amountCents);
    debtors.sort((a, b) => b.amountCents - a.amountCents);

    const transactions = [];
    let c = 0;
    let d = 0;

    while (c < creditors.length && d < debtors.length) {
      const creditor = creditors[c];
      const debtor = debtors[d];

      const transferCents = Math.min(creditor.amountCents, debtor.amountCents);

      if (transferCents > 0) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: transferCents / 100,
        });

        creditor.amountCents -= transferCents;
        debtor.amountCents -= transferCents;
      }

      if (creditor.amountCents === 0) c++;
      if (debtor.amountCents === 0) d++;
    }

    return transactions;
  }

  function renderResults(data) {
    DOM.emptyResultsBox.style.display = 'none';
    DOM.resultsContainer.classList.remove('hidden');

    DOM.resOccasionName.textContent = data.occasion;
    DOM.resTotalBill.textContent = fmt(data.totalBill);
    DOM.resHeadcount.textContent = `${data.numPeople} ${data.numPeople === 1 ? 'person' : 'people'}`;

    const baseShare = data.participantBreakdowns[0] ? data.participantBreakdowns[0].share : 0;
    DOM.resPerPersonBase.textContent = fmt(baseShare);

    DOM.auditBillAmount.textContent = fmt(data.totalBill);
    DOM.auditSharesSum.textContent = fmt(data.sumOfShares);
    DOM.auditDiff.textContent = fmt(data.discrepancy);

    if (DOM.printOccasionName) DOM.printOccasionName.textContent = data.occasion;
    if (DOM.printReceiptDate) DOM.printReceiptDate.textContent = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    renderDistributionVisualizer(data);

    DOM.sharesTableBody.innerHTML = '';
    let totalPaidSum = 0;
    let totalShareSum = 0;

    data.participantBreakdowns.forEach((p) => {
      totalPaidSum += p.paid;
      totalShareSum += p.share;

      const tr = document.createElement('tr');

      let statusTag = '';
      if (p.net > 0) {
        statusTag = `<span class="modern-badge badge-positive">&uarr; Gets ${fmt(p.net)}</span>`;
      } else if (p.net < 0) {
        statusTag = `<span class="modern-badge badge-negative">&darr; Owes ${fmt(Math.abs(p.net))}</span>`;
      } else {
        statusTag = `<span class="modern-badge badge-neutral">&check; Settled (0.00)</span>`;
      }

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${p.color};"></span>
            <strong>${escapeHTML(p.name)}</strong>
          </div>
        </td>
        <td style="text-align: right;" class="tabular-nums">${fmt(p.paid)}</td>
        <td style="text-align: right;" class="tabular-nums" style="font-weight: 600;">${fmt(p.share)}</td>
        <td style="text-align: right;" class="tabular-nums" style="font-weight: 700; color:${p.net > 0 ? 'var(--emerald-mint)' : p.net < 0 ? 'var(--rose-debt)' : 'var(--text-muted)'};">
          ${p.net > 0 ? '+' : ''}${fmt(p.net)}
        </td>
        <td>${statusTag}</td>
      `;
      DOM.sharesTableBody.appendChild(tr);
    });

    const totalRow = document.createElement('tr');
    totalRow.style.background = 'var(--bg-card-subtle)';
    totalRow.style.fontWeight = '800';
    totalRow.innerHTML = `
      <td><strong>TOTAL AUDIT</strong></td>
      <td style="text-align: right;" class="tabular-nums"><strong>${fmt(totalPaidSum)}</strong></td>
      <td style="text-align: right;" class="tabular-nums"><strong>${fmt(totalShareSum)}</strong></td>
      <td style="text-align: right;" class="tabular-nums"><strong>${fmt(Math.round((totalPaidSum - totalShareSum) * 100) / 100)}</strong></td>
      <td><span class="modern-badge badge-positive">&check; Balanced 100%</span></td>
    `;
    DOM.sharesTableBody.appendChild(totalRow);

    DOM.settlementList.innerHTML = '';
    DOM.settlementCount.textContent = `${data.settlements.length} transfer${data.settlements.length === 1 ? '' : 's'}`;

    if (data.settlements.length === 0) {
      const li = document.createElement('li');
      li.className = 'settlement-step-item';
      li.innerHTML = `
        <div style="color: var(--emerald-mint); font-weight: 700; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          All friends are settled up! Zero reimbursements pending.
        </div>
      `;
      DOM.settlementList.appendChild(li);
    } else {
      data.settlements.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'settlement-step-item';
        li.innerHTML = `
          <div class="step-transfer-info">
            <span style="font-weight: 800; color: var(--text-title);">${escapeHTML(s.from)}</span>
            <span class="step-arrow-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </span>
            <span style="font-weight: 800; color: var(--text-title);">${escapeHTML(s.to)}</span>
          </div>
          <span class="step-amount-pill tabular-nums">${fmt(s.amount)}</span>
        `;
        DOM.settlementList.appendChild(li);
      });
    }

    updateSmartInsights(data);
    window.__lastCalculatedSummary = buildClipboardText(data);
  }

  function renderDistributionVisualizer(data) {
    if (!DOM.distributionBar || !DOM.distributionLegend) return;
    DOM.distributionBar.innerHTML = '';
    DOM.distributionLegend.innerHTML = '';

    const totalBill = data.totalBill || 1;

    data.participantBreakdowns.forEach((p) => {
      const pct = Math.max(1, Math.round((p.share / totalBill) * 100));

      const seg = document.createElement('div');
      seg.className = 'distribution-segment';
      seg.style.width = `${pct}%`;
      seg.style.background = p.color;
      seg.title = `${p.name}: ${fmt(p.share)} (${pct}%)`;
      DOM.distributionBar.appendChild(seg);

      const legend = document.createElement('div');
      legend.className = 'legend-item';
      legend.innerHTML = `
        <span class="legend-color" style="background: ${p.color};"></span>
        <span>${escapeHTML(p.name)} (${fmt(p.share)})</span>
      `;
      DOM.distributionLegend.appendChild(legend);
    });
  }

  function updateSmartInsights(data) {
    let maxPaid = -1;
    let topPayer = null;
    data.participantBreakdowns.forEach((p) => {
      if (p.paid > maxPaid) {
        maxPaid = p.paid;
        topPayer = p.name;
      }
    });

    if (DOM.noteTopPayer) {
      if (maxPaid > 0 && topPayer) {
        DOM.noteTopPayer.textContent = `${topPayer} paid the most (${fmt(maxPaid)}), covering ${Math.round((maxPaid / (data.totalBill || 1)) * 100)}% of the total cost.`;
      } else {
        DOM.noteTopPayer.textContent = `All ${data.numPeople} friends owe equal shares of ${fmt(data.participantBreakdowns[0]?.share || 0)}.`;
      }
    }

    if (DOM.noteReconciled) {
      DOM.noteReconciled.textContent = `Reconciliation Verified: Sum of shares (${fmt(data.sumOfShares)}) precisely balances the total bill (${fmt(data.totalBill)}).`;
    }
  }

  function buildClipboardText(data) {
    const lines = [
      `=========================================`,
      `  SPLITLEDGER BILL BREAKDOWN`,
      `  Occasion: ${data.occasion}`,
      `  Total Bill: ${fmt(data.totalBill)}`,
      `  Participants: ${data.numPeople}`,
      `  Exact Audit: ${fmt(data.sumOfShares)} / ${fmt(data.totalBill)} (Balanced)`,
      `=========================================`,
      ``,
      `INDIVIDUAL SHARES:`,
    ];

    data.participantBreakdowns.forEach((p) => {
      let netStr = p.net > 0 ? `[Gets back ${fmt(p.net)}]` : p.net < 0 ? `[Owes ${fmt(Math.abs(p.net))}]` : `[Settled]`;
      lines.push(`• ${p.name}: Share ${fmt(p.share)} | Paid ${fmt(p.paid)} -> ${netStr}`);
    });

    lines.push(``);
    lines.push(`SETTLEMENT PLAN (WHO PAYS WHOM):`);

    if (data.settlements.length === 0) {
      lines.push(`• All balances settled up!`);
    } else {
      data.settlements.forEach((s, idx) => {
        lines.push(`${idx + 1}. ${s.from} pays ${fmt(s.amount)} to ${s.to}`);
      });
    }

    lines.push(``);
    lines.push(`Generated by SplitLedger - IIT Bombay Techfest Bhopal`);
    return lines.join('\n');
  }

  function syncFormInputsWithState() {
    DOM.occasionInput.value = state.occasion;
    DOM.billAmountInput.value = state.billAmount;
    DOM.peopleCountInput.value = state.peopleCount;

    if (DOM.currencySelect) DOM.currencySelect.value = state.currency;
    updateCurrencySymbols(state.currency);

    if (state.payerType === 'none') {
      DOM.payerNoneRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'none';
    } else if (state.payerType === 'single') {
      DOM.payerSingleRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'block';
      DOM.participantsSection.style.display = 'block';
    } else {
      DOM.payerMultiRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'block';
    }

    if (state.mode === 'expenses') {
      DOM.tabExpenses.classList.add('active');
      DOM.tabQuick.classList.remove('active');
      DOM.quickBillSection.style.display = 'none';
      DOM.expensesTrackerSection.style.display = 'block';
    } else {
      DOM.tabQuick.classList.add('active');
      DOM.tabExpenses.classList.remove('active');
      DOM.quickBillSection.style.display = 'block';
      DOM.expensesTrackerSection.style.display = 'none';
    }

    renderParticipantsUI();
    renderSinglePayerDropdown();
    renderExpensePayerDropdown();
    renderExpensesUI();
  }

  function updateCurrencySymbols(curr) {
    state.currency = curr;
    document.querySelectorAll('.currency-symbol').forEach((el) => {
      el.textContent = curr;
    });
  }

  function attachEventListeners() {
    // Mode switcher
    DOM.tabQuick.addEventListener('click', () => {
      state.mode = 'quick';
      DOM.tabQuick.classList.add('active');
      DOM.tabExpenses.classList.remove('active');
      DOM.quickBillSection.style.display = 'block';
      DOM.expensesTrackerSection.style.display = 'none';
      renderParticipantsUI();
      persistState();
    });

    DOM.tabExpenses.addEventListener('click', () => {
      state.mode = 'expenses';
      DOM.tabExpenses.classList.add('active');
      DOM.tabQuick.classList.remove('active');
      DOM.quickBillSection.style.display = 'none';
      DOM.expensesTrackerSection.style.display = 'block';
      renderExpensesUI();
      renderExpensePayerDropdown();
      persistState();
    });

    // Currency selector
    DOM.currencySelect.addEventListener('change', (e) => {
      updateCurrencySymbols(e.target.value);
      persistState();
      if (state.hasCalculated) {
        performBillSplit();
      }
    });

    // Inputs live sync
    DOM.occasionInput.addEventListener('input', (e) => {
      state.occasion = e.target.value;
      persistState();
    });

    DOM.billAmountInput.addEventListener('input', (e) => {
      state.billAmount = e.target.value;
      persistState();
    });

    DOM.peopleCountInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) {
        syncParticipantsCount(val);
        persistState();
      }
    });

    // Payer radio group
    DOM.payerNoneRadio.addEventListener('change', () => {
      state.payerType = 'none';
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'none';
      renderParticipantsUI();
      persistState();
    });

    DOM.payerSingleRadio.addEventListener('change', () => {
      state.payerType = 'single';
      DOM.singlePayerSelectContainer.style.display = 'block';
      DOM.participantsSection.style.display = 'block';
      renderParticipantsUI();
      persistState();
    });

    DOM.payerMultiRadio.addEventListener('change', () => {
      state.payerType = 'multi';
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'block';
      renderParticipantsUI();
      persistState();
    });

    DOM.singlePayerSelect.addEventListener('change', (e) => {
      state.singlePayerIndex = parseInt(e.target.value, 10) || 0;
      persistState();
    });

    // Add Expense in Detailed Mode (with automatic participant sync)
    DOM.btnAddExpense.addEventListener('click', () => {
      const title = (DOM.newExpenseTitle.value || '').trim();
      const amount = parseFloat(DOM.newExpenseAmount.value);
      const paidBy = DOM.newExpensePayer.value || state.participants[0]?.name || 'Person 1';

      if (!title) {
        showValidationError('Please enter a description for the expense line item.');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showValidationError('Please enter an expense amount greater than 0.');
        return;
      }

      state.expenses.push({
        id: Date.now(),
        title,
        amount,
        paidBy,
      });

      DOM.newExpenseTitle.value = '';
      DOM.newExpenseAmount.value = '';
      clearValidationError();

      // Automatically sync each person's paid total into quick split & participants table
      syncExpensesWithParticipants();
      renderExpensesUI();
      if (state.hasCalculated) {
        performBillSplit();
      }
      showToast(`Added: "${title}" (${fmt(amount)}) paid by ${paidBy}. Synced with bill!`);
    });

    // Groups Hub Button Listeners
    DOM.btnNewGroup.addEventListener('click', () => {
      openGroupModal('new');
    });

    DOM.btnSaveCurrentGroup.addEventListener('click', () => {
      saveCurrentChangesToGroup();
    });

    DOM.btnEditCurrentGroup.addEventListener('click', () => {
      openGroupModal('edit');
    });

    // Fixed Delete Button: Opens in-app modal (no window.confirm iframe blockage)
    DOM.btnDeleteCurrentGroup.addEventListener('click', () => {
      openDeleteModal();
    });

    // Group Modal buttons
    DOM.btnModalClose.addEventListener('click', closeGroupModal);
    DOM.btnModalCancel.addEventListener('click', closeGroupModal);
    DOM.btnModalSave.addEventListener('click', saveGroupModal);

    DOM.groupModal.addEventListener('click', (e) => {
      if (e.target === DOM.groupModal) closeGroupModal();
    });

    // Delete Modal buttons
    DOM.btnDeleteModalClose.addEventListener('click', closeDeleteModal);
    DOM.btnDeleteModalCancel.addEventListener('click', closeDeleteModal);
    DOM.btnDeleteModalConfirm.addEventListener('click', confirmDeleteGroup);

    DOM.deleteModal.addEventListener('click', (e) => {
      if (e.target === DOM.deleteModal) closeDeleteModal();
    });

    // Calculate Button
    DOM.btnCalculate.addEventListener('click', () => {
      performBillSplit();
    });

    // Reset Button
    DOM.btnReset.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY_STATE);
      localStorage.removeItem(STORAGE_KEY_VALIDATION);
      state = JSON.parse(JSON.stringify(instantState));
      syncFormInputsWithState();
      clearValidationError();
      DOM.resultsContainer.classList.add('hidden');
      DOM.emptyResultsBox.style.display = 'block';
      showToast('Form reset to default.');
    });

    // Copy to Clipboard Button
    DOM.btnCopySummary.addEventListener('click', () => {
      if (!window.__lastCalculatedSummary) {
        showToast('Please calculate a bill first.');
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.__lastCalculatedSummary)
          .then(() => showToast('Copied summary to clipboard!'))
          .catch(() => fallbackCopy(window.__lastCalculatedSummary));
      } else {
        fallbackCopy(window.__lastCalculatedSummary);
      }
    });

    // Print Receipt Button
    DOM.btnPrintReceipt.addEventListener('click', () => {
      window.print();
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied summary to clipboard!');
    } catch (err) {
      showToast('Unable to copy automatically. Please select text manually.');
    }
    document.body.removeChild(ta);
  }

  function init() {
    initDOM();
    loadPersistedData();
    renderSavedGroups();
    syncFormInputsWithState();
    attachEventListeners();

    const lastError = getPersistedValidationMessage();
    if (lastError && lastError.active && lastError.message) {
      showValidationError(lastError.message);
    } else {
      performBillSplit();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
