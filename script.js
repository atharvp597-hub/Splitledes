/**
 * SplitLedger - Next-Gen Expense Tracker & Bill Splitter
 * 100% Offline, Pure Vanilla JavaScript, Zero External Dependencies
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEY_STATE      = 'splitledger_modern_state_v4';
  const STORAGE_KEY_VALIDATION = 'splitledger_modern_validation_v4';
  const STORAGE_KEY_GROUPS     = 'splitledger_saved_groups_v4';
  const STORAGE_KEY_INSTANT    = 'splitledger_instant_state_v4';

  // IIFE-scoped last summary — no window pollution (ISSUE-3 fix)
  let lastSummary = null;

  // Vibrant Palette
  const PALETTE = [
    '#4f46e5','#06b6d4','#10b981','#f59e0b','#ec4899',
    '#8b5cf6','#14b8a6','#f97316','#3b82f6','#84cc16',
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
        { name: 'Rahul',  paid: 400 },
        { name: 'Priya',  paid: 200 },
        { name: 'Amit',   paid: 0   },
      ],
      expenses: [
        { id: '1_aaa', title: 'Monday Canteen Lunch',       amount: 550, paidBy: 'Atharv' },
        { id: '2_bbb', title: 'Wednesday Tea & Samosas',    amount: 250, paidBy: 'Rahul'  },
        { id: '3_ccc', title: 'Friday Snacks & Juices',     amount: 400, paidBy: 'Priya'  },
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
        { name: 'Sneha',  paid: 800  },
        { name: 'Divya',  paid: 0    },
      ],
      expenses: [
        { id: '1_ddd', title: 'Microcontroller & Sensors',              amount: 1000, paidBy: 'Atharv' },
        { id: '2_eee', title: 'Color Report Printing & Hard Binding',   amount: 800,  paidBy: 'Sneha'  },
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
        { name: 'Deepak', paid: 0    },
        { name: 'Rohan',  paid: 0    },
        { name: 'Kunal',  paid: 0    },
      ],
      expenses: [
        { id: '1_fff', title: 'High-speed Fiber WiFi',          amount: 1200, paidBy: 'Vikram' },
        { id: '2_ggg', title: '20L Mineral Water Cans',         amount: 600,  paidBy: 'Vikram' },
        { id: '3_hhh', title: 'Milk, Eggs & Bread Supplies',    amount: 1400, paidBy: 'Vikram' },
      ],
    },
  ];

  let savedGroups  = [];
  let activeGroupId = 'instant';
  let isDirty      = false;
  let pendingSwitch = null;

  // Clean blank instant state (no demo data)
  const instantState = {
    occasion: '',
    billAmount: '0',
    peopleCount: 2,
    currency: '₹',
    mode: 'quick',
    payerType: 'multi',
    singlePayerIndex: 0,
    participants: [
      { name: 'Person 1', paid: 0 },
      { name: 'Person 2', paid: 0 },
    ],
    expenses: [],
    hasCalculated: false,
  };

  let state = JSON.parse(JSON.stringify(instantState));

  // DOM cache
  const DOM = {};

  // ─── Utilities ───────────────────────────────────────────────────────────────

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Debounced localStorage write (ISSUE-3 / performance fix)
  const debouncedPersist = debounce(function () {
    try {
      state.activeGroupId = activeGroupId;
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    } catch (e) {
      showToast('⚠️ Storage full — changes may not be saved this session.');
    }
  }, 400);

  function persistState() { debouncedPersist(); }

  function persistGroups() {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(savedGroups));
    } catch (e) {
      showToast('⚠️ Storage full — group changes may not be saved.');
    }
  }

  function persistValidationMessage(msg) {
    try {
      if (msg) {
        localStorage.setItem(STORAGE_KEY_VALIDATION, JSON.stringify({ active: true, message: msg }));
      } else {
        localStorage.removeItem(STORAGE_KEY_VALIDATION);
      }
    } catch (e) { /* silent */ }
  }

  function getPersistedValidationMessage() {
    try {
      const s = localStorage.getItem(STORAGE_KEY_VALIDATION);
      if (s) return JSON.parse(s);
    } catch (e) { /* silent */ }
    return null;
  }

  function showToast(message) {
    if (!DOM.toastNotice) return;
    DOM.toastNotice.textContent = message;
    DOM.toastNotice.classList.add('show');
    setTimeout(() => DOM.toastNotice.classList.remove('show'), 2800);
  }

  function fmt(num) {
    const val = Number(num) || 0;
    return `${state.currency} ${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // LOGIC-8 fix: escape single quotes too
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // UI-17 fix: enable/disable action buttons
  function setActionButtonsState(enabled) {
    [DOM.btnCopySummary, DOM.btnPrintReceipt].forEach((btn) => {
      if (btn) btn.disabled = !enabled;
    });
  }

  // ─── DOM Init ────────────────────────────────────────────────────────────────

  function initDOM() {
    const g = (id) => document.getElementById(id);
    DOM.currencySelect            = g('currencySelect');
    DOM.tabQuick                  = g('tabQuick');
    DOM.tabExpenses               = g('tabExpenses');
    DOM.quickBillSection          = g('quickBillSection');
    DOM.expensesTrackerSection    = g('expensesTrackerSection');
    DOM.occasionInput             = g('occasionInput');
    DOM.billAmountInput           = g('billAmountInput');
    DOM.peopleCountInput          = g('peopleCountInput');
    DOM.payerNoneRadio            = g('payerNoneRadio');
    DOM.payerSingleRadio          = g('payerSingleRadio');
    DOM.payerMultiRadio           = g('payerMultiRadio');
    DOM.singlePayerSelectContainer= g('singlePayerSelectContainer');
    DOM.singlePayerSelect         = g('singlePayerSelect');
    DOM.participantsSection       = g('participantsSection');
    DOM.participantsTableBody     = g('participantsTableBody');
    DOM.expensesTableBody         = g('expensesTableBody');
    DOM.newExpenseTitle           = g('newExpenseTitle');
    DOM.newExpenseAmount          = g('newExpenseAmount');
    DOM.newExpensePayer           = g('newExpensePayer');
    DOM.btnAddExpense             = g('btnAddExpense');
    DOM.expensesGrandTotal        = g('expensesGrandTotal');
    DOM.btnCalculate              = g('btnCalculate');
    DOM.btnReset                  = g('btnReset');
    DOM.validationMessageBox      = g('validationMessageBox');
    DOM.validationMessageText     = g('validationMessageText');
    DOM.emptyResultsBox           = g('emptyResultsBox');
    DOM.resultsContainer          = g('resultsContainer');
    DOM.resOccasionName           = g('resOccasionName');
    DOM.resTotalBill              = g('resTotalBill');
    DOM.resPerPersonBase          = g('resPerPersonBase');
    DOM.resHeadcount              = g('resHeadcount');
    DOM.auditBillAmount           = g('auditBillAmount');
    DOM.auditSharesSum            = g('auditSharesSum');
    DOM.auditDiff                 = g('auditDiff');
    DOM.distributionBar           = g('distributionBar');
    DOM.distributionLegend        = g('distributionLegend');
    DOM.sharesTableBody           = g('sharesTableBody');
    DOM.settlementList            = g('settlementList');
    DOM.settlementCount           = g('settlementCount');
    DOM.noteTopPayer              = g('noteTopPayer');
    DOM.noteReconciled            = g('noteReconciled');
    DOM.noteOptimization          = g('noteOptimization');
    DOM.noteTrackerRow            = g('noteTrackerRow');
    DOM.noteTrackerInfo           = g('noteTrackerInfo');
    DOM.btnThemeToggle            = g('btnThemeToggle');
    DOM.themeToggleText           = g('themeToggleText');
    DOM.btnCopySummary            = g('btnCopySummary');
    DOM.btnPrintReceipt           = g('btnPrintReceipt');
    DOM.toastNotice               = g('toastNotice');
    DOM.printOccasionName         = g('printOccasionName');
    DOM.printReceiptDate          = g('printReceiptDate');
    DOM.savedGroupsList           = g('savedGroupsList');
    DOM.btnNewGroup               = g('btnNewGroup');
    DOM.btnSaveCurrentGroup       = g('btnSaveCurrentGroup');
    DOM.btnEditCurrentGroup       = g('btnEditCurrentGroup');
    DOM.btnDeleteCurrentGroup     = g('btnDeleteCurrentGroup');
    DOM.groupModal                = g('groupModal');
    DOM.modalTitle                = g('modalTitle');
    DOM.groupNameInput            = g('groupNameInput');
    DOM.groupMembersInput         = g('groupMembersInput');
    DOM.btnModalClose             = g('btnModalClose');
    DOM.btnModalCancel            = g('btnModalCancel');
    DOM.btnModalSave              = g('btnModalSave');
    DOM.deleteModal               = g('deleteModal');
    DOM.deleteTargetGroupName     = g('deleteTargetGroupName');
    DOM.btnDeleteModalClose       = g('btnDeleteModalClose');
    DOM.btnDeleteModalCancel      = g('btnDeleteModalCancel');
    DOM.btnDeleteModalConfirm     = g('btnDeleteModalConfirm');
  }

  // ─── Theme System ─────────────────────────────────────────────────────────────
  const STORAGE_KEY_THEME = 'splitledger_theme';

  function initTheme() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'dark') {
        applyTheme('dark', false);
      } else if (savedTheme === 'light') {
        applyTheme('light', false);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light', false);
      }
    } catch (e) {
      applyTheme('light', false);
    }
  }

  function applyTheme(theme, notify = true) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      if (DOM.themeToggleText) DOM.themeToggleText.textContent = 'Day Mode';
      if (DOM.btnThemeToggle) DOM.btnThemeToggle.setAttribute('title', 'Switch to Day Mode');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      if (DOM.themeToggleText) DOM.themeToggleText.textContent = 'Night Mode';
      if (DOM.btnThemeToggle) DOM.btnThemeToggle.setAttribute('title', 'Switch to Night Mode');
    }

    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) { /* silent */ }

    if (notify) {
      showToast(`Switched to ${isDark ? 'Night (Dark)' : 'Day (Light)'} Mode.`);
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme') ||
      (!document.body.classList.contains('light-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(isDark ? 'light' : 'dark', true);
  }

  // ─── Persistence ─────────────────────────────────────────────────────────────

  function loadPersistedData() {
    try {
      const groupsStr = localStorage.getItem(STORAGE_KEY_GROUPS);
      savedGroups = groupsStr
        ? JSON.parse(groupsStr)
        : JSON.parse(JSON.stringify(defaultGroups));
      if (!groupsStr) persistGroups();

      const savedStr = localStorage.getItem(STORAGE_KEY_STATE);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        state = { ...JSON.parse(JSON.stringify(instantState)), ...parsed };
        if (state.activeGroupId) activeGroupId = state.activeGroupId;
      }
    } catch (e) {
      console.warn('Error reading localStorage', e);
      savedGroups = JSON.parse(JSON.stringify(defaultGroups));
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  function showValidationError(message) {
    DOM.validationMessageText.textContent = message;
    DOM.validationMessageBox.classList.remove('hidden');
    DOM.resultsContainer.classList.add('hidden');
    DOM.emptyResultsBox.style.display = 'block';
    persistValidationMessage(message);
    state.hasCalculated = false;
    setActionButtonsState(false);
    persistState();
  }

  function clearValidationError() {
    DOM.validationMessageBox.classList.add('hidden');
    DOM.validationMessageText.textContent = '';
    persistValidationMessage(null);
  }

  // ─── Groups Hub ──────────────────────────────────────────────────────────────

  function renderSavedGroups() {
    if (!DOM.savedGroupsList) return;
    DOM.savedGroupsList.innerHTML = '';

    const instantBtn = document.createElement('button');
    instantBtn.type = 'button';
    instantBtn.className = `group-tab-chip instant ${activeGroupId === 'instant' ? 'active' : ''}`;
    instantBtn.innerHTML = `
      <span style="font-weight:800;">⚡ Instant Split</span>
      <span class="group-member-count">Ad-hoc (No Group)</span>`;
    instantBtn.addEventListener('click', () => {
      if (isDirty && activeGroupId !== 'instant') {
        pendingSwitch = { type: 'instant' };
        openConfirmSwitchModal();
      } else {
        switchToInstantSplit();
      }
    });
    DOM.savedGroupsList.appendChild(instantBtn);

    savedGroups.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `group-tab-chip ${g.id === activeGroupId ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${escapeHTML(g.name)}</span>
        <span class="group-member-count">${g.participants ? g.participants.length : 0} friends</span>`;
      btn.addEventListener('click', () => {
        if (isDirty && activeGroupId !== g.id) {
          pendingSwitch = { type: 'group', id: g.id };
          openConfirmSwitchModal();
        } else {
          switchGroup(g.id);
        }
      });
      DOM.savedGroupsList.appendChild(btn);
    });

    updateGroupControlButtons();
  }

  function updateGroupControlButtons() {
    const isInstant = activeGroupId === 'instant';
    if (DOM.btnDeleteCurrentGroup) DOM.btnDeleteCurrentGroup.style.display = isInstant ? 'none' : 'inline-flex';
    if (DOM.btnEditCurrentGroup)   DOM.btnEditCurrentGroup.style.display   = isInstant ? 'none' : 'inline-flex';
    if (DOM.btnSaveCurrentGroup)   DOM.btnSaveCurrentGroup.textContent     = isInstant ? '💾 Save as New Group' : '💾 Save Changes';
  }

  // BUG-6 fix: restore saved instant state instead of always resetting to demo data
  function switchToInstantSplit() {
    activeGroupId = 'instant';
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INSTANT);
      if (saved) {
        state = { ...JSON.parse(JSON.stringify(instantState)), ...JSON.parse(saved), activeGroupId: 'instant' };
      } else {
        state = { ...JSON.parse(JSON.stringify(instantState)), activeGroupId: 'instant' };
      }
    } catch (e) {
      state = { ...JSON.parse(JSON.stringify(instantState)), activeGroupId: 'instant' };
    }
    isDirty = false;
    syncFormInputsWithState();
    clearValidationError();
    if (state.hasCalculated) {
      performBillSplit();
    } else {
      DOM.resultsContainer.classList.add('hidden');
      DOM.emptyResultsBox.style.display = 'block';
    }
    renderSavedGroups();
    showToast('Switched to Instant Split (Ad-hoc mode).');
  }

  // LOGIC-11 fix: only auto-calculate if group data is valid
  function switchGroup(groupId) {
    const g = savedGroups.find((x) => x.id === groupId);
    if (!g) return;

    activeGroupId        = groupId;
    state.activeGroupId  = groupId;
    state.occasion       = g.occasion || g.name;
    state.billAmount     = g.billAmount || '0';
    state.peopleCount    = g.peopleCount || (g.participants ? g.participants.length : 2);
    state.payerType      = g.payerType || 'multi';
    state.singlePayerIndex = g.singlePayerIndex || 0;
    state.participants   = JSON.parse(JSON.stringify(g.participants || []));
    state.expenses       = JSON.parse(JSON.stringify(g.expenses || []));

    isDirty = false;
    syncFormInputsWithState();
    clearValidationError();

    const billVal   = parseFloat(g.billAmount);
    const peopleVal = parseInt(g.peopleCount, 10);
    if (!isNaN(billVal) && billVal > 0 && !isNaN(peopleVal) && peopleVal >= 1) {
      performBillSplit();
    } else {
      DOM.resultsContainer.classList.add('hidden');
      DOM.emptyResultsBox.style.display = 'block';
      setActionButtonsState(false);
    }

    renderSavedGroups();
    showToast(`Switched to ledger: "${g.name}"`);
  }

  // UI-19 fix: unsaved-changes confirmation (reuses delete modal)
  function openConfirmSwitchModal() {
    DOM.deleteTargetGroupName.textContent = 'You have unsaved changes that will be lost. Switch anyway?';
    DOM.btnDeleteModalConfirm.textContent = 'Switch & Discard';
    DOM.deleteModal.classList.remove('hidden');
    DOM.btnDeleteModalConfirm.focus();

    const onConfirm = () => {
      DOM.btnDeleteModalConfirm.removeEventListener('click', onConfirm);
      DOM.btnDeleteModalConfirm.textContent = 'Confirm Delete';
      closeDeleteModal();
      isDirty = false;
      if (pendingSwitch) {
        if (pendingSwitch.type === 'instant') switchToInstantSplit();
        else if (pendingSwitch.type === 'group') switchGroup(pendingSwitch.id);
        pendingSwitch = null;
      }
    };
    DOM.btnDeleteModalConfirm.addEventListener('click', onConfirm);
  }

  // ─── Group Modal ─────────────────────────────────────────────────────────────

  let modalMode = 'new';

  function openGroupModal(mode) {
    modalMode = mode;
    if (mode === 'new') {
      DOM.modalTitle.textContent    = 'Create New Team / Ledger';
      DOM.groupNameInput.value      = '';
      DOM.groupMembersInput.value   = state.participants.map((p) => p.name).join(', ') || 'Person 1, Person 2';
    } else {
      const current = savedGroups.find((x) => x.id === activeGroupId);
      DOM.modalTitle.textContent    = 'Edit Current Group';
      DOM.groupNameInput.value      = current ? current.name : '';
      DOM.groupMembersInput.value   = current && current.participants
        ? current.participants.map((p) => p.name).join(', ') : '';
    }
    DOM.groupModal.classList.remove('hidden');
    DOM.groupNameInput.focus();
  }

  function closeGroupModal() {
    DOM.groupModal.classList.add('hidden');
  }

  function saveGroupModal() {
    const name       = (DOM.groupNameInput.value   || '').trim();
    const rawMembers = (DOM.groupMembersInput.value || '').trim();

    if (!name) { showToast('Please provide a name for this group.'); return; }

    const memberNames = rawMembers.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (memberNames.length === 0) { showToast('Please specify at least one member.'); return; }

    if (modalMode === 'new') {
      const newId = 'group_' + Date.now();
      const participants = memberNames.map((m, idx) => ({
        name: m,
        paid: state.participants[idx]?.paid || 0,
      }));
      const newGroup = {
        id: newId,
        name,
        occasion: state.occasion || name,
        billAmount: state.billAmount || '0',
        peopleCount: participants.length,
        payerType: state.payerType || 'multi',
        singlePayerIndex: 0,
        participants,
        expenses: [],   // LOGIC-4 fix: new groups start with empty expenses
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
        // LOGIC-3 fix: DO NOT overwrite current.occasion — preserve event title
        const oldParts = current.participants || [];
        current.participants = memberNames.map((mName) => {
          const match = oldParts.find((p) => p.name.toLowerCase() === mName.toLowerCase());
          return { name: mName, paid: match ? match.paid : 0 };
        });
        current.peopleCount = current.participants.length;
        persistGroups();
        closeGroupModal();
        switchGroup(activeGroupId);
        showToast(`Updated group "${name}"`);
      }
    }
  }

  function saveCurrentChangesToGroup() {
    if (activeGroupId === 'instant') {
      // Save instant state to its own key first (BUG-6 complement)
      try {
        localStorage.setItem(STORAGE_KEY_INSTANT, JSON.stringify(state));
      } catch (e) {
        showToast('⚠️ Storage full — instant state not saved.');
      }
      openGroupModal('new');
      return;
    }

    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) return;

    current.occasion        = state.occasion;
    current.billAmount      = state.billAmount;
    current.peopleCount     = state.peopleCount;
    current.payerType       = state.payerType;
    current.singlePayerIndex= state.singlePayerIndex;
    current.participants    = JSON.parse(JSON.stringify(state.participants));
    current.expenses        = JSON.parse(JSON.stringify(state.expenses));

    persistGroups();
    persistState();
    isDirty = false;
    renderSavedGroups();
    showToast(`Saved changes to "${current.name}"`);
  }

  // ─── Delete Modal ─────────────────────────────────────────────────────────────

  function openDeleteModal() {
    if (activeGroupId === 'instant') {
      showToast('You are in Instant Split mode (no group to delete).');
      return;
    }
    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) return;

    DOM.deleteTargetGroupName.textContent = current.name;
    DOM.btnDeleteModalConfirm.textContent = 'Confirm Delete';
    DOM.deleteModal.classList.remove('hidden');
    DOM.btnDeleteModalConfirm.focus();
  }

  function closeDeleteModal() {
    DOM.deleteModal.classList.add('hidden');
    DOM.btnDeleteModalConfirm.textContent = 'Confirm Delete';
  }

  function confirmDeleteGroup() {
    const current = savedGroups.find((x) => x.id === activeGroupId);
    if (!current) { closeDeleteModal(); return; }

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

  // ─── Expenses / Participants Sync ─────────────────────────────────────────────

  function syncExpensesWithParticipants() {
    let grandTotal = 0;
    const paidByMap = {};

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

    state.participants.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (paidByMap[key] !== undefined) p.paid = paidByMap[key];
    });

    state.billAmount = grandTotal.toString();
    DOM.billAmountInput.value = grandTotal;
    DOM.expensesGrandTotal.textContent = fmt(grandTotal);

    renderParticipantsUI();
    persistState();
  }

  // LOGIC-5 fix: debounced participant count sync to prevent mid-type array trimming
  const debouncedSyncCount = debounce(function (newCount) {
    const count = Math.max(1, Math.min(parseInt(newCount, 10) || 1, 50));
    if (newCount > 50) showToast('Maximum 50 participants allowed.');

    const current = state.participants || [];
    const updated = [];
    for (let i = 0; i < count; i++) {
      updated.push(current[i] || { name: `Person ${i + 1}`, paid: 0 });
    }
    state.participants = updated;
    state.peopleCount  = count;
    renderParticipantsUI();
    renderSinglePayerDropdown();
    renderExpensePayerDropdown();
  }, 300);

  function syncParticipantsCount(val) { debouncedSyncCount(val); }

  // ─── Render: Participants ─────────────────────────────────────────────────────

  function renderParticipantsUI() {
    DOM.participantsTableBody.innerHTML = '';
    const isSingle   = state.payerType === 'single';
    const isMulti    = state.payerType === 'multi';
    const showPaidCol = isMulti || isSingle; // LOGIC-1 fix: always show for single too (but readonly)
    const currSym    = state.currency || '₹';

    // LOGIC-2 fix: always show participants section even in 'none' mode (for name editing)
    DOM.participantsSection.style.display = 'block';

    state.participants.forEach((p, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      const tr    = document.createElement('tr');

      // Name cell
      const tdName = document.createElement('td');
      tdName.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;" aria-hidden="true"></span>
          <input type="text" class="participant-name-input"
            value="${escapeHTML(p.name)}"
            placeholder="Person ${idx + 1}"
            data-index="${idx}"
            aria-label="Participant ${idx + 1} name">
        </div>`;
      tr.appendChild(tdName);

      // Paid cell
      if (showPaidCol) {
        const tdPaid = document.createElement('td');
        tdPaid.style.opacity = isSingle ? '0.5' : '1';
        tdPaid.innerHTML = `
          <div style="position:relative;display:flex;align-items:center;">
            <span style="position:absolute;left:8px;font-size:12px;font-weight:700;color:var(--text-muted);pointer-events:none;" aria-hidden="true">${escapeHTML(currSym)}</span>
            <input type="number" class="participant-paid-input"
              min="0" step="0.01"
              value="${p.paid !== undefined ? p.paid : 0}"
              placeholder="0.00"
              data-index="${idx}"
              style="padding-left:26px;width:100%;"
              aria-label="Amount paid by ${escapeHTML(p.name)}"
              ${isSingle ? 'readonly title="Amounts are ignored in Single Payer mode — one person covers 100%"' : ''}>
          </div>`;
        tr.appendChild(tdPaid);
      }

      DOM.participantsTableBody.appendChild(tr);
    });

    const paidHeader = document.getElementById('thPaidHeader');
    if (paidHeader) paidHeader.style.display = showPaidCol ? '' : 'none';

    // Name input events
    DOM.participantsTableBody.querySelectorAll('.participant-name-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (state.participants[idx]) {
          state.participants[idx].name = e.target.value || `Person ${idx + 1}`;
          renderSinglePayerDropdown();
          renderExpensePayerDropdown();
          isDirty = true;
          persistState();
        }
      });
      // Restore placeholder name on empty blur
      input.addEventListener('blur', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (state.participants[idx] && !e.target.value.trim()) {
          e.target.value = `Person ${idx + 1}`;
          state.participants[idx].name = `Person ${idx + 1}`;
        }
      });
    });

    // Paid input events
    DOM.participantsTableBody.querySelectorAll('.participant-paid-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (state.participants[idx] && !input.readOnly) {
          state.participants[idx].paid = parseFloat(e.target.value) || 0;
          isDirty = true;
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
      opt.textContent = p.name || `Person ${idx + 1}`;
      if (idx === state.singlePayerIndex) opt.selected = true;
      DOM.singlePayerSelect.appendChild(opt);
    });
  }

  function renderExpensePayerDropdown() {
    if (!DOM.newExpensePayer) return;
    const currentSelected = DOM.newExpensePayer.value;
    DOM.newExpensePayer.innerHTML = '';
    state.participants.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      if (p.name === currentSelected) opt.selected = true;
      DOM.newExpensePayer.appendChild(opt);
    });
  }

  // ─── Render: Expenses ─────────────────────────────────────────────────────────

  function renderExpensesUI() {
    DOM.expensesTableBody.innerHTML = '';
    let grandTotal = 0;

    if (!state.expenses || state.expenses.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" style="text-align:center;color:var(--text-muted);padding:18px;">No line items added yet. Add one below.</td>`;
      DOM.expensesTableBody.appendChild(tr);
    } else {
      state.expenses.forEach((item) => {
        grandTotal += Number(item.amount) || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="color:var(--text-title);">${escapeHTML(item.title)}</strong></td>
          <td class="tabular-nums" style="font-weight:700;">${fmt(item.amount)}</td>
          <td><span style="font-weight:700;color:var(--accent-indigo);background:var(--accent-indigo-light);padding:2px 8px;border-radius:6px;font-size:12px;">${escapeHTML(item.paidBy)}</span></td>
          <td style="text-align:right;">
            <button type="button" class="btn-remove-line" data-id="${escapeHTML(String(item.id))}">Remove</button>
          </td>`;
        DOM.expensesTableBody.appendChild(tr);
      });
    }

    DOM.expensesGrandTotal.textContent = fmt(grandTotal);
    // BUG-4 fix: do NOT touch state.billAmount or DOM.billAmountInput here —
    // that is done exclusively in syncExpensesWithParticipants()

    DOM.expensesTableBody.querySelectorAll('.btn-remove-line').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        // LOGIC-9 fix: compare as strings (IDs are now string-based)
        state.expenses = state.expenses.filter((x) => String(x.id) !== String(id));
        syncExpensesWithParticipants();
        renderExpensesUI();
        isDirty = true;
        if (state.hasCalculated) performBillSplit();
      });
    });
  }

  // ─── Core Calculation ────────────────────────────────────────────────────────

  function setCalculateButtonLoading(loading) {
    if (!DOM.btnCalculate) return;
    DOM.btnCalculate.disabled = loading;
    if (loading) {
      DOM.btnCalculate.textContent = 'Calculating…';
    } else {
      DOM.btnCalculate.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        Calculate &amp; Split Bill`;
    }
  }

  function performBillSplit() {
    const occasion = (DOM.occasionInput.value || '').trim() || 'Untitled Bill Event';
    state.occasion = occasion;

    setCalculateButtonLoading(true);

    const billRaw = state.mode === 'expenses'
      ? (parseFloat(DOM.billAmountInput.value) || state.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0))
      : parseFloat(DOM.billAmountInput.value);

    const billInputStr = (DOM.billAmountInput.value || '').trim();

    if (isNaN(billRaw) || billInputStr === '') {
      setCalculateButtonLoading(false);
      showValidationError('Bill amount cannot be empty. Please enter a valid numerical amount.');
      return;
    }
    if (billRaw <= 0) {
      setCalculateButtonLoading(false);
      showValidationError(`Bill amount must be greater than 0 (entered: ${billRaw}).`);
      return;
    }

    const peopleStr = (DOM.peopleCountInput.value || '').trim();
    const peopleRaw = parseInt(peopleStr, 10);

    if (peopleStr === '' || isNaN(peopleRaw)) {
      setCalculateButtonLoading(false);
      showValidationError('Number of people cannot be empty.');
      return;
    }
    if (peopleRaw <= 0) {
      setCalculateButtonLoading(false);
      showValidationError(`Number of people must be at least 1 (entered: ${peopleRaw}).`);
      return;
    }
    if (!Number.isInteger(Number(peopleStr))) {
      setCalculateButtonLoading(false);
      showValidationError(`Number of people must be a whole number (entered: ${peopleStr}).`);
      return;
    }

    // Sync participant array to exact count (non-debounced for calculation)
    const numPeople = Math.min(peopleRaw, 50);
    const current = state.participants || [];
    const synced  = [];
    for (let i = 0; i < numPeople; i++) {
      synced.push(current[i] || { name: `Person ${i + 1}`, paid: 0 });
    }
    state.participants = synced;
    state.peopleCount  = numPeople;
    renderParticipantsUI();
    renderSinglePayerDropdown();
    renderExpensePayerDropdown();

    const totalBill  = Math.round(billRaw * 100) / 100;
    const totalCents = Math.round(totalBill * 100);
    const baseCents  = Math.floor(totalCents / numPeople);
    let   remainder  = totalCents - baseCents * numPeople;

    const individualShares = [];
    for (let i = 0; i < numPeople; i++) {
      let c = baseCents;
      if (remainder > 0) { c += 1; remainder -= 1; }
      individualShares.push(c / 100);
    }

    let paidAmounts = [];
    if (state.payerType === 'none') {
      paidAmounts = new Array(numPeople).fill(0);
    } else if (state.payerType === 'single') {
      paidAmounts = new Array(numPeople).fill(0);
      paidAmounts[Math.min(state.singlePayerIndex, numPeople - 1)] = totalBill;
    } else {
      paidAmounts = state.participants.map((p) => Number(p.paid) || 0);
      const totalPaid = paidAmounts.reduce((s, v) => s + v, 0);
      // BUG-1 fix: tolerance reduced from 0.05 to 0.01
      if (Math.abs(totalPaid - totalBill) > 0.01) {
        setCalculateButtonLoading(false);
        showValidationError(
          `Total paid (${fmt(totalPaid)}) does not match bill (${fmt(totalBill)}). ` +
          `Difference: ${fmt(Math.abs(totalPaid - totalBill))}. Please fix before calculating.`
        );
        return;
      }
    }

    clearValidationError();

    const breakdowns = [];
    let sumOfShares = 0;
    for (let i = 0; i < numPeople; i++) {
      const p    = state.participants[i];
      const name = p ? p.name : `Person ${i + 1}`;
      const share= individualShares[i];
      const paid = paidAmounts[i] || 0;
      const net  = Math.round((paid - share) * 100) / 100;
      sumOfShares += share;
      breakdowns.push({ index: i, name, paid, share, net, color: PALETTE[i % PALETTE.length] });
    }

    sumOfShares        = Math.round(sumOfShares * 100) / 100;
    const discrepancy  = Math.abs(Math.round((totalBill - sumOfShares) * 100) / 100);
    const settlements  = calculateSettlements(breakdowns);

    renderResults({ occasion, totalBill, numPeople, sumOfShares, discrepancy, breakdowns, settlements });

    setCalculateButtonLoading(false);
    state.hasCalculated = true;
    setActionButtonsState(true);
    isDirty = false;
    persistState();
    showToast('Calculated fair shares with 100% penny audit.');
  }

  // BUG-3 fix: use <= 0 to prevent infinite loop from float drift
  function calculateSettlements(breakdowns) {
    const creditors = [];
    const debtors   = [];

    breakdowns.forEach((p) => {
      const nc = Math.round(p.net * 100);
      if (nc > 0) creditors.push({ name: p.name, amountCents:  nc });
      else if (nc < 0) debtors.push({ name: p.name, amountCents: -nc });
    });

    creditors.sort((a, b) => b.amountCents - a.amountCents);
    debtors.sort((a, b)   => b.amountCents - a.amountCents);

    const transactions = [];
    let c = 0, d = 0;

    while (c < creditors.length && d < debtors.length) {
      const creditor = creditors[c];
      const debtor   = debtors[d];
      const transfer = Math.min(creditor.amountCents, debtor.amountCents);

      if (transfer > 0) {
        transactions.push({ from: debtor.name, to: creditor.name, amount: transfer / 100 });
        creditor.amountCents -= transfer;
        debtor.amountCents   -= transfer;
      }

      if (creditor.amountCents <= 0) c++;
      if (debtor.amountCents   <= 0) d++;
    }

    return transactions;
  }

  // ─── Render: Results ─────────────────────────────────────────────────────────

  function renderResults(data) {
    DOM.emptyResultsBox.style.display = 'none';
    DOM.resultsContainer.classList.remove('hidden');

    DOM.resOccasionName.textContent = data.occasion;
    DOM.resTotalBill.textContent    = fmt(data.totalBill);
    DOM.resHeadcount.textContent    = `${data.numPeople} ${data.numPeople === 1 ? 'person' : 'people'}`;

    // BUG-2 fix: show exact per-person decimal, not Person 0's possibly-larger share
    const exactPerPerson = Math.round((data.totalBill / data.numPeople) * 100) / 100;
    DOM.resPerPersonBase.textContent = fmt(exactPerPerson);

    DOM.auditBillAmount.textContent = fmt(data.totalBill);
    DOM.auditSharesSum.textContent  = fmt(data.sumOfShares);
    DOM.auditDiff.textContent       = fmt(data.discrepancy);

    if (DOM.printOccasionName) DOM.printOccasionName.textContent = data.occasion;
    if (DOM.printReceiptDate) {
      DOM.printReceiptDate.textContent = new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    }

    renderDistributionVisualizer(data);

    DOM.sharesTableBody.innerHTML = '';
    let totalPaidSum = 0, totalShareSum = 0;

    data.breakdowns.forEach((p) => {
      totalPaidSum  += p.paid;
      totalShareSum += p.share;

      let statusTag = '';
      if      (p.net > 0) statusTag = `<span class="modern-badge badge-positive">&uarr; Gets ${fmt(p.net)}</span>`;
      else if (p.net < 0) statusTag = `<span class="modern-badge badge-negative">&darr; Owes ${fmt(Math.abs(p.net))}</span>`;
      // C-4 fix: removed "(0.00)" from settled text
      else                statusTag = `<span class="modern-badge badge-neutral">&check; Settled</span>`;

      const tr = document.createElement('tr');
      // BUG-5 fix: merged duplicate style attributes into single style
      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${p.color};" aria-hidden="true"></span>
            <strong>${escapeHTML(p.name)}</strong>
          </div>
        </td>
        <td style="text-align:right;" class="tabular-nums">${fmt(p.paid)}</td>
        <td style="text-align:right;font-weight:600;" class="tabular-nums">${fmt(p.share)}</td>
        <td style="text-align:right;font-weight:700;color:${p.net > 0 ? 'var(--emerald-mint)' : p.net < 0 ? 'var(--rose-debt)' : 'var(--text-muted)'};" class="tabular-nums">
          ${p.net > 0 ? '+' : ''}${fmt(p.net)}
        </td>
        <td>${statusTag}</td>`;
      DOM.sharesTableBody.appendChild(tr);
    });

    const roundedPaid  = Math.round(totalPaidSum  * 100) / 100;
    const roundedShare = Math.round(totalShareSum * 100) / 100;
    const netDiff      = Math.round((roundedPaid - roundedShare) * 100) / 100;
    const isBalanced   = Math.abs(netDiff) < 0.01;

    // LOGIC-7 fix: conditional badge — not hardcoded
    const auditBadge = isBalanced
      ? `<span class="modern-badge badge-positive">&check; Balanced 100%</span>`
      : `<span class="modern-badge badge-negative">&#x26A0; Check Totals</span>`;

    const totalRow = document.createElement('tr');
    totalRow.style.cssText = 'background:var(--bg-card-subtle);font-weight:800;';
    totalRow.innerHTML = `
      <td><strong>TOTAL AUDIT</strong></td>
      <td style="text-align:right;" class="tabular-nums"><strong>${fmt(roundedPaid)}</strong></td>
      <td style="text-align:right;" class="tabular-nums"><strong>${fmt(roundedShare)}</strong></td>
      <td style="text-align:right;" class="tabular-nums"><strong>${fmt(netDiff)}</strong></td>
      <td>${auditBadge}</td>`;
    DOM.sharesTableBody.appendChild(totalRow);

    // Settlement list
    DOM.settlementList.innerHTML = '';
    DOM.settlementCount.textContent = `${data.settlements.length} transfer${data.settlements.length === 1 ? '' : 's'}`;

    if (data.settlements.length === 0) {
      const li = document.createElement('li');
      li.className = 'settlement-step-item';
      li.innerHTML = `
        <div style="color:var(--emerald-mint);font-weight:700;display:flex;align-items:center;gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
          All friends are settled up! Zero reimbursements pending.
        </div>`;
      DOM.settlementList.appendChild(li);
    } else {
      data.settlements.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'settlement-step-item';
        li.innerHTML = `
          <div class="step-transfer-info">
            <span style="font-weight:800;color:var(--text-title);">${escapeHTML(s.from)}</span>
            <span class="step-arrow-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </span>
            <span style="font-weight:800;color:var(--text-title);">${escapeHTML(s.to)}</span>
          </div>
          <span class="step-amount-pill tabular-nums">${fmt(s.amount)}</span>`;
        DOM.settlementList.appendChild(li);
      });
    }

    updateSmartInsights(data);
    lastSummary = buildClipboardText(data);
  }

  // LOGIC-6 fix: normalize distribution bar to sum exactly 100%
  function renderDistributionVisualizer(data) {
    if (!DOM.distributionBar || !DOM.distributionLegend) return;
    DOM.distributionBar.innerHTML   = '';
    DOM.distributionLegend.innerHTML = '';

    const totalBill = data.totalBill || 1;

    // Compute raw percentages then normalize
    let rawPcts = data.breakdowns.map((p) => Math.round((p.share / totalBill) * 100));
    const rawSum = rawPcts.reduce((a, b) => a + b, 0);
    if (rawSum !== 100 && rawPcts.length > 0) {
      const maxIdx = rawPcts.indexOf(Math.max(...rawPcts));
      rawPcts[maxIdx] += (100 - rawSum);
    }

    // Accessible patterns for colour-blind users (UI-23 fix)
    const bgPatterns = [
      'none',
      'repeating-linear-gradient(45deg,rgba(255,255,255,0.18) 0,rgba(255,255,255,0.18) 2px,transparent 2px,transparent 8px)',
      'repeating-linear-gradient(-45deg,rgba(255,255,255,0.18) 0,rgba(255,255,255,0.18) 2px,transparent 2px,transparent 8px)',
      'repeating-linear-gradient(90deg,rgba(255,255,255,0.18) 0,rgba(255,255,255,0.18) 2px,transparent 2px,transparent 8px)',
      'repeating-linear-gradient(0deg,rgba(255,255,255,0.18) 0,rgba(255,255,255,0.18) 2px,transparent 2px,transparent 8px)',
    ];

    data.breakdowns.forEach((p, i) => {
      const pct = Math.max(1, rawPcts[i]);

      const seg = document.createElement('div');
      seg.className            = 'distribution-segment';
      seg.style.width          = `${pct}%`;
      seg.style.background     = p.color;
      seg.style.backgroundImage= bgPatterns[i % bgPatterns.length];
      seg.title                = `${p.name}: ${fmt(p.share)} (${pct}%)`;
      seg.setAttribute('role', 'img');
      seg.setAttribute('aria-label', `${p.name}: ${pct}% of bill`);
      DOM.distributionBar.appendChild(seg);

      const legend = document.createElement('div');
      legend.className = 'legend-item';
      legend.innerHTML = `
        <span class="legend-color" style="background:${p.color};" aria-hidden="true"></span>
        <span>${escapeHTML(p.name)} (${fmt(p.share)})</span>`;
      DOM.distributionLegend.appendChild(legend);
    });
  }

  function updateSmartInsights(data) {
    // 1. Top Payer & Contribution insight
    let maxPaid = -1, topPayer = null;
    let totalPaidSum = 0, payersCount = 0;
    data.breakdowns.forEach((p) => {
      totalPaidSum += p.paid;
      if (p.paid > 0) payersCount++;
      if (p.paid > maxPaid) { maxPaid = p.paid; topPayer = p.name; }
    });

    if (DOM.noteTopPayer) {
      if (state.payerType === 'none') {
        const shareVal = data.breakdowns[0]?.share || 0;
        DOM.noteTopPayer.textContent =
          `Equal Split Mode: No upfront individual payments recorded. All ${data.numPeople} friends owe ${fmt(shareVal)} each.`;
      } else if (state.payerType === 'single') {
        const singlePayer = data.breakdowns[state.singlePayerIndex]?.name || topPayer || 'Primary Payer';
        DOM.noteTopPayer.textContent =
          `Single Payer Mode: ${singlePayer} paid 100% of the total bill (${fmt(data.totalBill)}) upfront for all ${data.numPeople} people.`;
      } else if (maxPaid > 0 && topPayer) {
        const pct = Math.round((maxPaid / (data.totalBill || 1)) * 100);
        DOM.noteTopPayer.textContent =
          `Multi-Payer Contribution: ${topPayer} paid the highest amount (${fmt(maxPaid)}, ${pct}% of total), leading ${payersCount} total contributor${payersCount === 1 ? '' : 's'}.`;
      } else {
        DOM.noteTopPayer.textContent =
          `All ${data.numPeople} friends owe equal shares of ${fmt(data.breakdowns[0]?.share || 0)}.`;
      }
    }

    // 2. Reconciliation & Penny Audit insight
    if (DOM.noteReconciled) {
      if (data.discrepancy < 0.01) {
        DOM.noteReconciled.textContent =
          `Penny Reconciliation Audit: Sum of fair shares (${fmt(data.sumOfShares)}) matches total bill (${fmt(data.totalBill)}) down to 0.00 exact precision.`;
      } else {
        DOM.noteReconciled.textContent =
          `Audit Warning: Discrepancy of ${fmt(data.discrepancy)} detected between total bill (${fmt(data.totalBill)}) and share sum (${fmt(data.sumOfShares)}).`;
      }
    }

    // 3. Smart Debt Optimization insight
    if (DOM.noteOptimization) {
      if (data.settlements.length === 0) {
        DOM.noteOptimization.textContent =
          `Smart Debt Minimization: Everyone is fully settled up! Zero reimbursements or transfers required.`;
      } else {
        const possibleTransfers = data.numPeople * (data.numPeople - 1);
        const sortedTransfers = [...data.settlements].sort((a, b) => b.amount - a.amount);
        const maxTransfer = sortedTransfers[0];
        const topTransferStr = maxTransfer ? ` (Largest: ${maxTransfer.from} pays ${fmt(maxTransfer.amount)} to ${maxTransfer.to})` : '';
        DOM.noteOptimization.textContent =
          `Smart Debt Minimization: Reduced ${possibleTransfers} potential peer transfers to just ${data.settlements.length} direct settlement${data.settlements.length === 1 ? '' : 's'}${topTransferStr}.`;
      }
    }

    // 4. Detailed Expense Tracker Itemization insight
    if (DOM.noteTrackerRow && DOM.noteTrackerInfo) {
      if (state.mode === 'expenses' && state.expenses && state.expenses.length > 0) {
        DOM.noteTrackerRow.style.display = 'flex';
        const itemCount = state.expenses.length;
        const avgItem = Math.round((data.totalBill / itemCount) * 100) / 100;
        DOM.noteTrackerInfo.textContent =
          `Itemized Tracker: Calculated across ${itemCount} expense item${itemCount === 1 ? '' : 's'}, averaging ${fmt(avgItem)} per line item.`;
      } else {
        DOM.noteTrackerRow.style.display = 'none';
      }
    }
  }

  function buildClipboardText(data) {
    const lines = [
      `=========================================`,
      `  SPLITLEDGER BILL BREAKDOWN`,
      `  Occasion: ${data.occasion}`,
      `  Total Bill: ${fmt(data.totalBill)}`,
      `  Participants: ${data.numPeople}`,
      `  Audit: ${fmt(data.sumOfShares)} / ${fmt(data.totalBill)} (Balanced)`,
      `=========================================`,
      ``,
      `INDIVIDUAL SHARES:`,
    ];

    data.breakdowns.forEach((p) => {
      const netStr = p.net > 0 ? `[Gets back ${fmt(p.net)}]` : p.net < 0 ? `[Owes ${fmt(Math.abs(p.net))}]` : `[Settled]`;
      lines.push(`• ${p.name}: Share ${fmt(p.share)} | Paid ${fmt(p.paid)} -> ${netStr}`);
    });

    lines.push(``, `SETTLEMENT PLAN (WHO PAYS WHOM):`);
    if (data.settlements.length === 0) {
      lines.push(`• All balances settled up!`);
    } else {
      data.settlements.forEach((s, idx) => lines.push(`${idx + 1}. ${s.from} pays ${fmt(s.amount)} to ${s.to}`));
    }
    lines.push(``, `Generated by SplitLedger`);
    return lines.join('\n');
  }

  // ─── Form ↔ State Sync ────────────────────────────────────────────────────────

  function syncFormInputsWithState() {
    DOM.occasionInput.value    = state.occasion || '';
    DOM.billAmountInput.value  = state.billAmount || '0';
    DOM.peopleCountInput.value = state.peopleCount || 2;

    const curr = state.currency || '₹';
    if (DOM.currencySelect) DOM.currencySelect.value = curr;
    updateCurrencySymbols(curr);

    if (state.payerType === 'none') {
      DOM.payerNoneRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'block'; // LOGIC-2 fix
    } else if (state.payerType === 'single') {
      DOM.payerSingleRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'block';
      DOM.participantsSection.style.display = 'block';
    } else {
      DOM.payerMultiRadio.checked = true;
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'block';
    }

    const isExpenses = state.mode === 'expenses';
    DOM.tabExpenses.classList.toggle('active', isExpenses);
    DOM.tabQuick.classList.toggle('active', !isExpenses);
    DOM.tabExpenses.setAttribute('aria-selected', String(isExpenses));
    DOM.tabQuick.setAttribute('aria-selected', String(!isExpenses));
    DOM.quickBillSection.style.display       = isExpenses ? 'none'  : 'block';
    DOM.expensesTrackerSection.style.display = isExpenses ? 'block' : 'none';

    renderParticipantsUI();
    renderSinglePayerDropdown();
    renderExpensePayerDropdown();
    renderExpensesUI();
  }

  function updateCurrencySymbols(curr) {
    state.currency = curr;
    document.querySelectorAll('.currency-symbol').forEach((el) => { el.textContent = curr; });
  }

  // ─── Event Listeners ─────────────────────────────────────────────────────────

  function attachEventListeners() {
    // ── Mode tabs ──
    const tabs = [DOM.tabQuick, DOM.tabExpenses];
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        const isExpenses = tab === DOM.tabExpenses;
        state.mode = isExpenses ? 'expenses' : 'quick';
        DOM.tabExpenses.classList.toggle('active', isExpenses);
        DOM.tabQuick.classList.toggle('active', !isExpenses);
        DOM.tabExpenses.setAttribute('aria-selected', String(isExpenses));
        DOM.tabQuick.setAttribute('aria-selected', String(!isExpenses));
        DOM.quickBillSection.style.display       = isExpenses ? 'none'  : 'block';
        DOM.expensesTrackerSection.style.display = isExpenses ? 'block' : 'none';
        if (isExpenses) { renderExpensesUI(); renderExpensePayerDropdown(); }
        else            { renderParticipantsUI(); }
        persistState();
        // UI-18 fix: recalculate when switching tabs
        if (state.hasCalculated) performBillSplit();
      });

      // UI-21 fix: Arrow-key navigation for tabs
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
          next.focus();
          next.click();
        }
      });
    });

    // ── Theme Toggle ──
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.addEventListener('click', toggleTheme);
    }

    // ── Currency ──
    DOM.currencySelect.addEventListener('change', (e) => {
      updateCurrencySymbols(e.target.value);
      persistState();
      if (state.hasCalculated) performBillSplit();
    });

    // ── Occasion / Bill / People ──
    DOM.occasionInput.addEventListener('input', (e) => {
      state.occasion = e.target.value;
      isDirty = true;
      persistState();
    });

    DOM.billAmountInput.addEventListener('input', (e) => {
      state.billAmount = e.target.value;
      isDirty = true;
      persistState();
    });

    // LOGIC-5 fix: debounced count sync
    DOM.peopleCountInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) {
        syncParticipantsCount(val);
        isDirty = true;
        persistState();
      }
      // UI-25 fix: clamp spinner to min 1
      if (!isNaN(val) && val < 1) e.target.value = 1;
    });

    // ── Payer radios ──
    DOM.payerNoneRadio.addEventListener('change', () => {
      state.payerType = 'none';
      DOM.singlePayerSelectContainer.style.display = 'none';
      DOM.participantsSection.style.display = 'block'; // LOGIC-2 fix
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

    // ── Add Expense ──
    DOM.btnAddExpense.addEventListener('click', () => {
      const title  = (DOM.newExpenseTitle.value || '').trim();
      const amount = parseFloat(DOM.newExpenseAmount.value);
      const paidBy = DOM.newExpensePayer.value || state.participants[0]?.name || 'Person 1';

      if (!title)                        { showToast('Please enter a description.'); return; }
      if (isNaN(amount) || amount <= 0)  { showToast('Please enter an amount greater than 0.'); return; }
      if (state.expenses.length >= 100)  { showToast('Maximum 100 expense items reached.'); return; }

      // LOGIC-9 fix: collision-safe composite ID
      const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      state.expenses.push({ id: newId, title, amount, paidBy });

      DOM.newExpenseTitle.value  = '';
      DOM.newExpenseAmount.value = '';
      clearValidationError();

      syncExpensesWithParticipants();
      renderExpensesUI();
      isDirty = true;
      if (state.hasCalculated) performBillSplit();
      showToast(`Added "${title}" (${fmt(amount)}) paid by ${paidBy}.`);
    });

    // ── Groups Hub ──
    DOM.btnNewGroup.addEventListener('click', () => openGroupModal('new'));
    DOM.btnSaveCurrentGroup.addEventListener('click', () => saveCurrentChangesToGroup());
    DOM.btnEditCurrentGroup.addEventListener('click', () => {
      if (activeGroupId === 'instant') { showToast('Switch to a saved group to edit it.'); return; }
      openGroupModal('edit');
    });
    DOM.btnDeleteCurrentGroup.addEventListener('click', () => openDeleteModal());

    // ── Group Modal ──
    DOM.btnModalClose.addEventListener('click',  closeGroupModal);
    DOM.btnModalCancel.addEventListener('click', closeGroupModal);
    DOM.btnModalSave.addEventListener('click',   saveGroupModal);
    DOM.groupModal.addEventListener('click', (e) => { if (e.target === DOM.groupModal) closeGroupModal(); });

    // ── Delete Modal ──
    DOM.btnDeleteModalClose.addEventListener('click',   closeDeleteModal);
    DOM.btnDeleteModalCancel.addEventListener('click',  closeDeleteModal);
    DOM.btnDeleteModalConfirm.addEventListener('click', confirmDeleteGroup);
    DOM.deleteModal.addEventListener('click', (e) => { if (e.target === DOM.deleteModal) closeDeleteModal(); });

    // UI-22 fix: Escape key closes any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!DOM.groupModal.classList.contains('hidden'))  closeGroupModal();
        if (!DOM.deleteModal.classList.contains('hidden')) closeDeleteModal();
      }
    });

    // UI-22 fix: focus trap for both modals
    function trapFocus(modal) {
      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(
          modal.querySelectorAll('button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.closest('.hidden'));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      });
    }
    trapFocus(DOM.groupModal);
    trapFocus(DOM.deleteModal);

    // ── Calculate ──
    DOM.btnCalculate.addEventListener('click', performBillSplit);

    // LOGIC-10 fix: Reset also clears activeGroupId and re-syncs group chips
    DOM.btnReset.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY_STATE);
      localStorage.removeItem(STORAGE_KEY_VALIDATION);
      localStorage.removeItem(STORAGE_KEY_INSTANT);
      state         = JSON.parse(JSON.stringify(instantState));
      activeGroupId = 'instant';
      isDirty       = false;
      lastSummary   = null;
      syncFormInputsWithState();
      clearValidationError();
      DOM.resultsContainer.classList.add('hidden');
      DOM.emptyResultsBox.style.display = 'block';
      setActionButtonsState(false);
      renderSavedGroups();
      showToast('Form reset to default.');
    });

    // ── Copy Summary ──
    DOM.btnCopySummary.addEventListener('click', () => {
      if (!lastSummary) { showToast('Please calculate a bill first.'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastSummary)
          .then(() => showToast('Copied summary to clipboard!'))
          .catch(() => fallbackCopy(lastSummary));
      } else {
        fallbackCopy(lastSummary);
      }
    });

    // UI-17 fix: Print only works after calculation
    DOM.btnPrintReceipt.addEventListener('click', () => {
      if (!state.hasCalculated) { showToast('Please calculate a bill before printing.'); return; }
      window.print();
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.select();
    try   { document.execCommand('copy'); showToast('Copied summary to clipboard!'); }
    catch { showToast('Unable to copy automatically. Please select text manually.'); }
    document.body.removeChild(ta);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    initDOM();
    initTheme();
    loadPersistedData();
    renderSavedGroups();
    syncFormInputsWithState();
    setActionButtonsState(false); // UI-17 fix: disabled until first calculation
    attachEventListeners();

    const lastError = getPersistedValidationMessage();
    if (lastError && lastError.active && lastError.message) {
      showValidationError(lastError.message);
    } else if (state.hasCalculated) {
      performBillSplit();
    } else {
      DOM.emptyResultsBox.style.display = 'block';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
