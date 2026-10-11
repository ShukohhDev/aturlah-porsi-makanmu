/**
 * Aturlah Porsi Makanmu - Script Utama Antarmuka
 * Menangani otentikasi, profil gizi, kamera 1080p, preview, Gemini Vision API,
 * koreksi gramasi komponen, dan pencatatan riwayat harian.
 *
 * Aturan ketat: Tanpa emoji, tanpa karakter emdash, dan tanpa desain gradasi.
 */

(function () {
  'use strict';

  // State Aplikasi
  const state = {
    currentUser: null,
    selectedDate: new Date().toISOString().split('T')[0],
    cameraStream: null,
    facingMode: 'environment',
    capturedImageBase64: null,
    capturedMimeType: 'image/jpeg',
    selectedMealType: 'lunch',
    currentAnalysis: null,
    componentsData: []
  };

  // DOM Elements
  const elements = {
    // Views
    viewAuth: document.getElementById('view-auth'),
    viewOnboarding: document.getElementById('view-onboarding'),
    viewDashboard: document.getElementById('view-dashboard'),
    viewAdmin: document.getElementById('view-admin'),

    // Navbar
    navUserActions: document.getElementById('nav-user-actions'),
    userRoleBadge: document.getElementById('user-role-badge'),
    navUsername: document.getElementById('nav-username'),
    btnToggleTheme: document.getElementById('btn-toggle-theme'),
    themeBtnLabel: document.getElementById('theme-btn-label'),
    btnAdminPanel: document.getElementById('btn-admin-panel'),
    btnOpenReport: document.getElementById('btn-open-report'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnEditProfile: document.getElementById('btn-edit-profile'),
    btnLogout: document.getElementById('btn-logout'),

    // Admin Panel Elements
    btnAdminBackDash: document.getElementById('btn-admin-back-dash'),
    btnAdminTabUsers: document.getElementById('btn-admin-tab-users'),
    btnAdminTabReports: document.getElementById('btn-admin-tab-reports'),
    adminPaneUsers: document.getElementById('admin-pane-users'),
    adminPaneReports: document.getElementById('admin-pane-reports'),
    adminReportsBadge: document.getElementById('admin-reports-badge'),
    adminStatTotalUsers: document.getElementById('admin-stat-total-users'),
    adminStatActiveProfiles: document.getElementById('admin-stat-active-profiles'),
    adminStatTotalMeals: document.getElementById('admin-stat-total-meals'),
    adminSearchInput: document.getElementById('admin-search-input'),
    btnAdminRefresh: document.getElementById('btn-admin-refresh'),
    adminUsersTbody: document.getElementById('admin-users-tbody'),
    adminStatTotalReports: document.getElementById('admin-stat-total-reports'),
    adminStatReportsBaru: document.getElementById('admin-stat-reports-baru'),
    adminStatReportsProses: document.getElementById('admin-stat-reports-proses'),
    adminStatReportsSelesai: document.getElementById('admin-stat-reports-selesai'),
    adminSearchReports: document.getElementById('admin-search-reports'),
    btnAdminRefreshReports: document.getElementById('btn-admin-refresh-reports'),
    adminReportsTbody: document.getElementById('admin-reports-tbody'),
    adminReportFilterPills: document.getElementById('admin-report-filter-pills'),

    // User Report Modal Elements
    modalReport: document.getElementById('modal-report'),
    btnCloseReport: document.getElementById('btn-close-report'),
    btnCancelReport: document.getElementById('btn-cancel-report'),
    tabBtnReportCreate: document.getElementById('tab-btn-report-create'),
    tabBtnReportHistory: document.getElementById('tab-btn-report-history'),
    paneReportCreate: document.getElementById('pane-report-create'),
    paneReportHistory: document.getElementById('pane-report-history'),
    formCreateReport: document.getElementById('form-create-report'),
    reportInputTitle: document.getElementById('report-input-title'),
    reportInputDesc: document.getElementById('report-input-desc'),
    reportFormMsg: document.getElementById('report-form-msg'),
    btnSubmitReport: document.getElementById('btn-submit-report'),
    btnRefreshUserReports: document.getElementById('btn-refresh-user-reports'),
    userReportsList: document.getElementById('user-reports-list'),

    // Auth
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    btnFillAdmin: document.getElementById('btn-fill-admin'),
    formAuth: document.getElementById('form-auth'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    authErrorMsg: document.getElementById('auth-error-msg'),

    // Onboarding
    formProfile: document.getElementById('form-profile'),
    profileName: document.getElementById('profile-name'),
    profileBirthdate: document.getElementById('profile-birthdate'),
    profileHeight: document.getElementById('profile-height'),
    profileWeight: document.getElementById('profile-weight'),
    profileActivity: document.getElementById('profile-activity'),
    targetWeightContainer: document.getElementById('target-weight-container'),
    profileTargetWeight: document.getElementById('profile-target-weight'),
    previewBmr: document.getElementById('preview-bmr'),
    previewTdee: document.getElementById('preview-tdee'),
    previewTargetCal: document.getElementById('preview-target-cal'),

    // Dashboard
    dashDateTag: document.getElementById('dash-date-tag'),
    dashGreeting: document.getElementById('dash-greeting'),
    dashGoalDesc: document.getElementById('dash-goal-desc'),
    btnOpenCamera: document.getElementById('btn-open-camera'),
    btnUploadFileTrigger: document.getElementById('btn-upload-file-trigger'),
    fileInputFallback: document.getElementById('file-input-fallback'),

    // Quota Metrics
    quotaCalRemaining: document.getElementById('quota-cal-remaining'),
    quotaCalTarget: document.getElementById('quota-cal-target'),
    quotaCalConsumed: document.getElementById('quota-cal-consumed'),
    calProgressBar: document.getElementById('cal-progress-bar'),
    calProgressPercent: document.getElementById('cal-progress-percent'),
    metaBmrVal: document.getElementById('meta-bmr-val'),

    nutProteinRem: document.getElementById('nut-protein-rem'),
    nutProteinTar: document.getElementById('nut-protein-tar'),
    fillProtein: document.getElementById('fill-protein'),

    nutCarbsRem: document.getElementById('nut-carbs-rem'),
    nutCarbsTar: document.getElementById('nut-carbs-tar'),
    fillCarbs: document.getElementById('fill-carbs'),

    nutFatRem: document.getElementById('nut-fat-rem'),
    nutFatTar: document.getElementById('nut-fat-tar'),
    fillFat: document.getElementById('fill-fat'),

    nutFiberRem: document.getElementById('nut-fiber-rem'),
    nutFiberTar: document.getElementById('nut-fiber-tar'),
    fillFiber: document.getElementById('fill-fiber'),

    nutSugarRem: document.getElementById('nut-sugar-rem'),
    nutSugarTar: document.getElementById('nut-sugar-tar'),
    fillSugar: document.getElementById('fill-sugar'),

    // Meals Categories
    sumBreakfast: document.getElementById('sum-breakfast'),
    listBreakfast: document.getElementById('list-breakfast'),
    sumLunch: document.getElementById('sum-lunch'),
    listLunch: document.getElementById('list-lunch'),
    sumDinner: document.getElementById('sum-dinner'),
    listDinner: document.getElementById('list-dinner'),
    sumSnack: document.getElementById('sum-snack'),
    listSnack: document.getElementById('list-snack'),

    // Camera Modal
    modalCamera: document.getElementById('modal-camera'),
    cameraVideo: document.getElementById('camera-video'),
    cameraCanvas: document.getElementById('camera-canvas'),
    btnCloseCamera: document.getElementById('btn-close-camera'),
    btnSwitchCam: document.getElementById('btn-switch-cam'),
    btnCapturePhoto: document.getElementById('btn-capture-photo'),
    btnCameraUploadFallback: document.getElementById('btn-camera-upload-fallback'),

    // Preview Modal
    modalPreview: document.getElementById('modal-preview'),
    previewImageElem: document.getElementById('preview-image-elem'),
    btnClosePreview: document.getElementById('btn-close-preview'),
    btnPreviewRetake: document.getElementById('btn-preview-retake'),
    btnPreviewProceed: document.getElementById('btn-preview-proceed'),

    // Analyzing Modal
    modalAnalyzing: document.getElementById('modal-analyzing'),

    // Review Modal
    modalReview: document.getElementById('modal-review'),
    simulationBanner: document.getElementById('simulation-banner'),
    reviewFoodName: document.getElementById('review-food-name'),
    reviewMealTypeSelect: document.getElementById('review-meal-type-select'),
    reviewTotalCal: document.getElementById('review-total-cal'),
    reviewTotalProtein: document.getElementById('review-total-protein'),
    reviewTotalFat: document.getElementById('review-total-fat'),
    reviewTotalCarbs: document.getElementById('review-total-carbs'),
    reviewTotalFiber: document.getElementById('review-total-fiber'),
    reviewTotalSugar: document.getElementById('review-total-sugar'),
    reviewComponentsList: document.getElementById('review-components-list'),
    btnAddManualComp: document.getElementById('btn-add-manual-comp'),
    btnCloseReview: document.getElementById('btn-close-review'),
    btnCancelReview: document.getElementById('btn-cancel-review'),
    btnConfirmSaveMeal: document.getElementById('btn-confirm-save-meal'),

    // Settings Modal
    modalSettings: document.getElementById('modal-settings'),
    settingsKeyStatus: document.getElementById('settings-key-status'),
    settingsApiKeyInput: document.getElementById('settings-api-key-input'),
    settingsAlertMsg: document.getElementById('settings-alert-msg'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    btnCloseSettingsFooter: document.getElementById('btn-close-settings-footer'),
    btnSaveSettings: document.getElementById('btn-save-settings')
  };

  // Inisialisasi Aplikasi
  function init() {
    initTheme();
    setupEventListeners();
    checkStoredSession();
  }

  // Pengaturan Tema Warna
  function initTheme() {
    const savedTheme = localStorage.getItem('theme_preference') || 'light';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme_preference', theme);
    if (elements.themeBtnLabel) {
      elements.themeBtnLabel.textContent = theme === 'dark' ? 'Tema Segar' : 'Tema Gelap';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  // Cek apakah ada sesi pengguna tersimpan
  function checkStoredSession() {
    const raw = localStorage.getItem('user_session');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.id) {
          state.currentUser = user;
          updateNavbarUser();
          if (user.hasProfile && user.profile) {
            showView('dashboard');
            loadDashboardData();
          } else {
            showView('onboarding');
            fillOnboardingForm(user.profile);
          }
          return;
        }
      } catch (e) {
        localStorage.removeItem('user_session');
      }
    }
    showView('auth');
  }

  // Pengaturan Event Listeners
  function setupEventListeners() {
    // Auth Tabs
    elements.tabLogin.addEventListener('click', () => switchAuthTab('login'));
    elements.tabRegister.addEventListener('click', () => switchAuthTab('register'));

    // Preset Admin
    elements.btnFillAdmin.addEventListener('click', () => {
      elements.authUsername.value = 'Shukoh#Dev';
      elements.authPassword.value = 'FAFA17052007';
      switchAuthTab('login');
      hideAuthError();
    });

    // Form Auth Submit
    elements.formAuth.addEventListener('submit', handleAuthSubmit);

    // Navbar Actions
    if (elements.btnToggleTheme) {
      elements.btnToggleTheme.addEventListener('click', toggleTheme);
    }
    if (elements.btnAdminPanel) {
      elements.btnAdminPanel.addEventListener('click', openAdminPanel);
    }
    elements.btnLogout.addEventListener('click', handleLogout);
    elements.btnEditProfile.addEventListener('click', () => {
      if (state.currentUser) {
        showView('onboarding');
        fillOnboardingForm(state.currentUser.profile);
      }
    });
    elements.btnOpenSettings.addEventListener('click', openSettingsModal);

    // Onboarding Form Real-time Calculation & Goal toggle
    const calcInputs = [
      elements.profileHeight,
      elements.profileWeight,
      elements.profileBirthdate,
      elements.profileActivity
    ];
    calcInputs.forEach(input => {
      input.addEventListener('input', updateCalcPreview);
    });

    document.querySelectorAll('input[name="gender"]').forEach(radio => {
      radio.addEventListener('change', updateCalcPreview);
    });

    document.querySelectorAll('input[name="goal"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        handleGoalChange(e.target.value);
        updateCalcPreview();
      });
    });

    elements.formProfile.addEventListener('submit', handleProfileSubmit);

    // Camera and Upload Triggers
    elements.btnOpenCamera.addEventListener('click', openCameraInterface);
    elements.btnUploadFileTrigger.addEventListener('click', () => elements.fileInputFallback.click());
    elements.fileInputFallback.addEventListener('change', handleFileSelected);

    // Camera Modal
    elements.btnCloseCamera.addEventListener('click', stopCamera);
    elements.btnSwitchCam.addEventListener('click', toggleCameraFacing);
    elements.btnCapturePhoto.addEventListener('click', captureFrameFromVideo);
    elements.btnCameraUploadFallback.addEventListener('click', () => {
      stopCamera();
      elements.fileInputFallback.click();
    });

    // Preview Modal
    elements.btnClosePreview.addEventListener('click', () => elements.modalPreview.style.display = 'none');
    elements.btnPreviewRetake.addEventListener('click', () => {
      elements.modalPreview.style.display = 'none';
      openCameraInterface();
    });
    elements.btnPreviewProceed.addEventListener('click', proceedToAnalyzePhoto);

    // Review Modal Actions
    elements.btnCloseReview.addEventListener('click', () => elements.modalReview.style.display = 'none');
    elements.btnCancelReview.addEventListener('click', () => elements.modalReview.style.display = 'none');
    elements.btnAddManualComp.addEventListener('click', addManualComponentCard);
    elements.btnConfirmSaveMeal.addEventListener('click', handleConfirmSaveMeal);

    // Settings Modal
    elements.btnCloseSettings.addEventListener('click', () => elements.modalSettings.style.display = 'none');
    elements.btnCloseSettingsFooter.addEventListener('click', () => elements.modalSettings.style.display = 'none');
    elements.btnSaveSettings.addEventListener('click', handleSaveSettingsKey);

    // User Report Modal Events
    if (elements.btnOpenReport) elements.btnOpenReport.addEventListener('click', openReportModal);
    if (elements.btnCloseReport) elements.btnCloseReport.addEventListener('click', closeReportModal);
    if (elements.btnCancelReport) elements.btnCancelReport.addEventListener('click', closeReportModal);
    if (elements.tabBtnReportCreate) elements.tabBtnReportCreate.addEventListener('click', () => switchReportTab('create'));
    if (elements.tabBtnReportHistory) elements.tabBtnReportHistory.addEventListener('click', () => switchReportTab('history'));
    if (elements.formCreateReport) elements.formCreateReport.addEventListener('submit', handleSubmitReport);
    if (elements.btnRefreshUserReports) elements.btnRefreshUserReports.addEventListener('click', loadUserReports);

    // Admin Panel Events
    if (elements.btnAdminBackDash) {
      elements.btnAdminBackDash.addEventListener('click', () => {
        showView('dashboard');
        loadDashboardData();
      });
    }
    if (elements.btnAdminTabUsers) elements.btnAdminTabUsers.addEventListener('click', () => switchAdminTab('users'));
    if (elements.btnAdminTabReports) elements.btnAdminTabReports.addEventListener('click', () => switchAdminTab('reports'));
    if (elements.btnAdminRefresh) {
      elements.btnAdminRefresh.addEventListener('click', loadAdminUsers);
    }
    if (elements.btnAdminRefreshReports) {
      elements.btnAdminRefreshReports.addEventListener('click', loadAdminReports);
    }
    if (elements.adminSearchInput) {
      elements.adminSearchInput.addEventListener('input', (e) => {
        renderAdminUsersTable(e.target.value.trim().toLowerCase());
      });
    }
    if (elements.adminSearchReports) {
      elements.adminSearchReports.addEventListener('input', () => {
        renderAdminReportsTable();
      });
    }
    if (elements.adminReportFilterPills) {
      elements.adminReportFilterPills.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          elements.adminReportFilterPills.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentAdminReportFilter = btn.getAttribute('data-status') || 'all';
          renderAdminReportsTable();
        });
      });
    }
  }

  // Switch View
  function showView(viewName) {
    elements.viewAuth.classList.remove('active');
    elements.viewOnboarding.classList.remove('active');
    elements.viewDashboard.classList.remove('active');
    if (elements.viewAdmin) elements.viewAdmin.classList.remove('active');

    if (viewName === 'auth') {
      elements.viewAuth.classList.add('active');
      elements.navUserActions.style.display = 'none';
    } else if (viewName === 'onboarding') {
      elements.viewOnboarding.classList.add('active');
      elements.navUserActions.style.display = 'flex';
      updateCalcPreview();
    } else if (viewName === 'dashboard') {
      elements.viewDashboard.classList.add('active');
      elements.navUserActions.style.display = 'flex';
    } else if (viewName === 'admin') {
      if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') {
        showView('dashboard');
        return;
      }
      if (elements.viewAdmin) elements.viewAdmin.classList.add('active');
      elements.navUserActions.style.display = 'flex';
    }
  }

  // Update Navbar User Info
  function updateNavbarUser() {
    if (!state.currentUser) {
      elements.navUserActions.style.display = 'none';
      if (elements.btnAdminPanel) elements.btnAdminPanel.style.display = 'none';
      return;
    }
    elements.navUserActions.style.display = 'flex';
    elements.navUsername.textContent = state.currentUser.username;
    const isAdmin = state.currentUser.username === 'Shukoh#Dev';
    elements.userRoleBadge.textContent = isAdmin ? 'Administrator' : 'Pengguna';
    if (elements.btnAdminPanel) {
      elements.btnAdminPanel.style.display = isAdmin ? 'inline-flex' : 'none';
    }
  }

  // Tab Auth Switcher
  let authMode = 'login';
  function switchAuthTab(mode) {
    authMode = mode;
    hideAuthError();
    if (mode === 'login') {
      elements.tabLogin.classList.add('active');
      elements.tabRegister.classList.remove('active');
      elements.btnAuthSubmit.textContent = 'Masuk ke Aplikasi';
    } else {
      elements.tabRegister.classList.add('active');
      elements.tabLogin.classList.remove('active');
      elements.btnAuthSubmit.textContent = 'Daftar Akun Baru';
    }
  }

  function showAuthError(msg) {
    elements.authErrorMsg.textContent = msg;
    elements.authErrorMsg.style.display = 'block';
  }

  function hideAuthError() {
    elements.authErrorMsg.style.display = 'none';
  }

  // Handle Login & Register
  async function handleAuthSubmit(e) {
    e.preventDefault();
    hideAuthError();

    const username = elements.authUsername.value.trim();
    const password = elements.authPassword.value;

    if (!username || !password) {
      showAuthError('Nama akun dan kata sandi wajib diisi.');
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!data.success) {
        showAuthError(data.message || 'Gagal memproses permintaan.');
        return;
      }

      state.currentUser = data.user;
      localStorage.setItem('user_session', JSON.stringify(data.user));
      updateNavbarUser();

      if (data.user.hasProfile && data.user.profile) {
        showView('dashboard');
        loadDashboardData();
      } else {
        showView('onboarding');
        fillOnboardingForm(data.user.profile);
      }

    } catch (err) {
      showAuthError('Koneksi server terputus. Pastikan server backend sedang berjalan.');
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem('user_session');
    state.currentUser = null;
    elements.authUsername.value = '';
    elements.authPassword.value = '';
    showView('auth');
  }

  // Handle Goal Change
  function handleGoalChange(goalVal) {
    if (goalVal === 'maintain') {
      elements.targetWeightContainer.style.display = 'none';
      elements.profileTargetWeight.removeAttribute('required');
    } else {
      elements.targetWeightContainer.style.display = 'flex';
      elements.profileTargetWeight.setAttribute('required', 'true');
    }
  }

  // Fill Onboarding Form with existing profile
  function fillOnboardingForm(profile) {
    if (!profile) {
      elements.profileName.value = (state.currentUser && state.currentUser.username) || '';
      return;
    }

    elements.profileName.value = profile.name || '';
    elements.profileHeight.value = profile.height || 170;
    elements.profileWeight.value = profile.weight || 65;
    elements.profileBirthdate.value = profile.birthDate || '2000-01-01';
    elements.profileActivity.value = profile.activityLevel || 'light';

    const genderRadio = document.querySelector(`input[name="gender"][value="${profile.gender}"]`);
    if (genderRadio) genderRadio.checked = true;

    const goalRadio = document.querySelector(`input[name="goal"][value="${profile.goal}"]`);
    if (goalRadio) goalRadio.checked = true;

    handleGoalChange(profile.goal);
    if (profile.goal !== 'maintain' && profile.targetWeight) {
      elements.profileTargetWeight.value = profile.targetWeight;
    }

    updateCalcPreview();
  }

  // Live Recalculation on Onboarding
  function updateCalcPreview() {
    const gender = (document.querySelector('input[name="gender"]:checked') || {}).value || 'male';
    const height = parseFloat(elements.profileHeight.value) || 170;
    const weight = parseFloat(elements.profileWeight.value) || 65;
    const birthdate = elements.profileBirthdate.value;
    const activity = elements.profileActivity.value || 'light';
    const goal = (document.querySelector('input[name="goal"]:checked') || {}).value || 'maintain';

    const age = window.NutritionCalc.getAge(birthdate);
    const bmr = window.NutritionCalc.calculateBMR(gender, weight, height, age);
    const tdee = window.NutritionCalc.calculateTDEE(bmr, activity);
    const targetCal = window.NutritionCalc.calculateTargetCalories(tdee, goal, gender);

    elements.previewBmr.textContent = bmr.toLocaleString('id-ID') + ' kkal';
    elements.previewTdee.textContent = tdee.toLocaleString('id-ID') + ' kkal';
    elements.previewTargetCal.textContent = targetCal.toLocaleString('id-ID') + ' kkal';
  }

  // Submit Onboarding Profile
  async function handleProfileSubmit(e) {
    e.preventDefault();

    if (!state.currentUser) return;

    const gender = (document.querySelector('input[name="gender"]:checked') || {}).value || 'male';
    const goal = (document.querySelector('input[name="goal"]:checked') || {}).value || 'maintain';
    const targetWeight = goal === 'maintain' ? elements.profileWeight.value : elements.profileTargetWeight.value;

    const payload = {
      userId: state.currentUser.id,
      name: elements.profileName.value.trim(),
      gender,
      height: elements.profileHeight.value,
      weight: elements.profileWeight.value,
      birthDate: elements.profileBirthdate.value,
      activityLevel: elements.profileActivity.value,
      goal,
      targetWeight
    };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.message || 'Gagal menyimpan data diri.');
        return;
      }

      state.currentUser.hasProfile = true;
      state.currentUser.profile = data.profile;
      localStorage.setItem('user_session', JSON.stringify(state.currentUser));

      showView('dashboard');
      loadDashboardData();

    } catch (err) {
      alert('Gagal menyimpan ke server: ' + err.message);
    }
  }

  // Load Dashboard Data
  async function loadDashboardData() {
    if (!state.currentUser) return;

    const profile = state.currentUser.profile;
    if (profile) {
      elements.dashGreeting.textContent = `Halo, ${profile.name || state.currentUser.username}`;
      const goalTitles = {
        loss: `Target: Menurunkan Berat Badan ke ${profile.targetWeight} kg`,
        gain: `Target: Menaikkan Berat Badan ke ${profile.targetWeight} kg`,
        maintain: `Target: Mempertahankan Berat Badan (${profile.weight} kg)`
      };
      elements.dashGoalDesc.textContent = goalTitles[profile.goal] || 'Target Nutrisi Harian';
      elements.metaBmrVal.textContent = (profile.bmr || 0).toLocaleString('id-ID');
    }

    // Format Indonesian Date
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.dashDateTag.textContent = today.toLocaleDateString('id-ID', options);

    try {
      const res = await fetch(`/api/meals?userId=${state.currentUser.id}&date=${state.selectedDate}`);
      const data = await res.json();

      if (data.success) {
        renderDashboardMetrics(data);
        renderMealsHistory(data.grouped);
      }
    } catch (err) {
      console.error('Error fetching meals data:', err);
    }
  }

  // Render Quota Metrics
  function renderDashboardMetrics(data) {
    const quota = data.quota || {};
    const consumed = data.consumed || {};
    const remaining = data.remaining || {};

    // Calorie Master
    elements.quotaCalRemaining.textContent = (remaining.calories || 0).toLocaleString('id-ID');
    elements.quotaCalTarget.textContent = (quota.calories || 0).toLocaleString('id-ID') + ' kkal';
    elements.quotaCalConsumed.textContent = (consumed.calories || 0).toLocaleString('id-ID') + ' kkal';

    // Progress Bar
    const calTarget = quota.calories || 2000;
    const calCons = consumed.calories || 0;
    const percent = Math.min(100, Math.round((calCons / calTarget) * 100));
    elements.calProgressBar.style.width = percent + '%';
    elements.calProgressPercent.textContent = percent + '% dari target tercapai';

    // Individual Nutrients
    renderNutrientCard(elements.nutProteinRem, elements.nutProteinTar, elements.fillProtein, remaining.protein, quota.protein, consumed.protein);
    renderNutrientCard(elements.nutCarbsRem, elements.nutCarbsTar, elements.fillCarbs, remaining.carbs, quota.carbs, consumed.carbs);
    renderNutrientCard(elements.nutFatRem, elements.nutFatTar, elements.fillFat, remaining.fat, quota.fat, consumed.fat);
    renderNutrientCard(elements.nutFiberRem, elements.nutFiberTar, elements.fillFiber, remaining.fiber, quota.fiber, consumed.fiber);
    renderNutrientCard(elements.nutSugarRem, elements.nutSugarTar, elements.fillSugar, remaining.sugar, quota.sugar, consumed.sugar);
  }

  function renderNutrientCard(remElem, tarElem, fillElem, remVal, tarVal, consVal) {
    remElem.textContent = (remVal || 0) + ' g';
    tarElem.textContent = (tarVal || 0);
    const target = tarVal || 1;
    const cons = consVal || 0;
    const pct = Math.min(100, Math.round((cons / target) * 100));
    fillElem.style.width = pct + '%';
  }

  // Render Categorized Meals
  function renderMealsHistory(grouped) {
    renderMealCategory(grouped.breakfast, elements.listBreakfast, elements.sumBreakfast, 'Belum ada makanan yang dicatat untuk sarapan.');
    renderMealCategory(grouped.lunch, elements.listLunch, elements.sumLunch, 'Belum ada makanan yang dicatat untuk makan siang.');
    renderMealCategory(grouped.dinner, elements.listDinner, elements.sumDinner, 'Belum ada makanan yang dicatat untuk makan malam.');
    renderMealCategory(grouped.snack, elements.listSnack, elements.sumSnack, 'Belum ada camilan yang dicatat.');
  }

  function renderMealCategory(meals, containerElem, sumElem, emptyText) {
    containerElem.innerHTML = '';

    if (!meals || meals.length === 0) {
      containerElem.innerHTML = `<div class="empty-meal-placeholder">${emptyText}</div>`;
      sumElem.textContent = '0 kkal';
      return;
    }

    let totalCatCal = 0;
    meals.forEach(meal => {
      totalCatCal += meal.totalCalories || 0;

      const card = document.createElement('div');
      card.className = 'meal-item-card';

      let componentsSummary = '';
      if (meal.components && meal.components.length > 0) {
        componentsSummary = meal.components.map(c => `
          <div class="comp-summary-line">
            <span>${escapeHtml(c.name)} (${c.weightGrams}g)</span>
            <span>${c.calories} kkal</span>
          </div>
        `).join('');
      }

      card.innerHTML = `
        <div class="meal-item-main">
          <div class="meal-item-left">
            ${meal.imageUrl ? `<img src="${meal.imageUrl}" class="meal-thumb-img" alt="${escapeHtml(meal.foodName)}">` : ''}
            <div class="meal-item-info">
              <div class="meal-item-title">${escapeHtml(meal.foodName)}</div>
              <div class="meal-item-meta">Tercatat jam ${meal.time || ''}</div>
              <div class="meal-item-nutrition-tags">
                <span class="nut-tag">${meal.totalCalories} kkal</span>
                <span class="nut-tag tag-protein">P: ${meal.totalProtein}g</span>
                <span class="nut-tag tag-fat">L: ${meal.totalFat}g</span>
                <span class="nut-tag tag-carbs">K: ${meal.totalCarbs}g</span>
                <span class="nut-tag tag-sugar">G: ${meal.totalSugar}g</span>
                <span class="nut-tag tag-fiber">S: ${meal.totalFiber}g</span>
              </div>
            </div>
          </div>
          <div class="meal-item-actions">
            <button type="button" class="btn-subtle btn-delete-meal" title="Hapus Catatan" data-meal-id="${meal.id}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        ${componentsSummary ? `<div class="meal-components-collapsible">${componentsSummary}</div>` : ''}
      `;

      card.querySelector('.btn-delete-meal').addEventListener('click', () => handleDeleteMeal(meal.id));
      containerElem.appendChild(card);
    });

    sumElem.textContent = totalCatCal.toLocaleString('id-ID') + ' kkal';
  }

  // Delete Meal
  async function handleDeleteMeal(mealId) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan makanan ini dari riwayat?')) return;

    try {
      const res = await fetch(`/api/meals/${mealId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadDashboardData();
      } else {
        alert(data.message || 'Gagal menghapus.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  }

  // Camera Handling (1080p, WebRTC)
  async function openCameraInterface() {
    elements.modalCamera.style.display = 'flex';
    try {
      const constraints = {
        video: {
          facingMode: state.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      elements.cameraVideo.srcObject = state.cameraStream;
      await elements.cameraVideo.play();
    } catch (err) {
      console.warn('Akses kamera tidak dapat diaktifkan:', err);
      stopCamera();
      alert('Kamera tidak dapat diakses atau izin ditolak. Mengalihkan ke opsi unggah foto.');
      elements.fileInputFallback.click();
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      state.cameraStream = null;
    }
    elements.modalCamera.style.display = 'none';
  }

  function toggleCameraFacing() {
    state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    openCameraInterface();
  }

  // Capture Photo Frame to Max 1080p JPEG/WebP
  function captureFrameFromVideo() {
    const video = elements.cameraVideo;
    const canvas = elements.cameraCanvas;

    if (!video.videoWidth || !video.videoHeight) {
      alert('Video kamera belum siap. Coba sesaat lagi.');
      return;
    }

    // Constraint: Max 1080p resolution
    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    const maxDim = 1920;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Export as JPEG (quality 0.85)
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    state.capturedImageBase64 = base64;
    state.capturedMimeType = 'image/jpeg';

    stopCamera();
    openPreviewModal(base64);
  }

  // File Upload Fallback with 1080p Resize
  function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = elements.cameraCanvas;
        let w = img.width;
        let h = img.height;
        const maxDim = 1920;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const mime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const base64 = canvas.toDataURL(mime, 0.85);

        state.capturedImageBase64 = base64;
        state.capturedMimeType = mime;

        // Reset input file value
        elements.fileInputFallback.value = '';

        openPreviewModal(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Open Preview Modal (Confirmation Phase)
  function openPreviewModal(imageSrc) {
    elements.previewImageElem.src = imageSrc;
    elements.modalPreview.style.display = 'flex';
  }

  // Proceed to Gemini Vision Analysis
  async function proceedToAnalyzePhoto() {
    elements.modalPreview.style.display = 'none';
    elements.modalAnalyzing.style.display = 'flex';

    // Get selected meal type from radio
    const selectedRadio = document.querySelector('input[name="preview-meal-type"]:checked');
    state.selectedMealType = selectedRadio ? selectedRadio.value : 'lunch';

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: state.capturedImageBase64,
          mimeType: state.capturedMimeType
        })
      });

      const data = await res.json();
      elements.modalAnalyzing.style.display = 'none';

      if (!data.success) {
        alert(data.message || 'Gagal menganalisis foto makanan.');
        return;
      }

      state.currentAnalysis = data.analysis;
      openReviewModal(data);

    } catch (err) {
      elements.modalAnalyzing.style.display = 'none';
      alert('Terjadi kegagalan komunikasi dengan backend: ' + err.message);
    }
  }

  // Open Review & Grams Correction Modal
  function openReviewModal(apiResult) {
    const analysis = apiResult.analysis;
    state.componentsData = (analysis.components || []).map((c, idx) => ({
      id: 'comp_' + idx + '_' + Date.now(),
      name: c.name || 'Bahan Makanan',
      originalWeight: parseFloat(c.weightGrams) || 100,
      weightGrams: parseFloat(c.weightGrams) || 100,
      baseCalories: parseFloat(c.calories) || 0,
      baseProtein: parseFloat(c.protein) || 0,
      baseFat: parseFloat(c.fat) || 0,
      baseCarbs: parseFloat(c.carbs) || 0,
      baseSugar: parseFloat(c.sugar) || 0,
      baseFiber: parseFloat(c.fiber) || 0,
      calories: parseFloat(c.calories) || 0,
      protein: parseFloat(c.protein) || 0,
      fat: parseFloat(c.fat) || 0,
      carbs: parseFloat(c.carbs) || 0,
      sugar: parseFloat(c.sugar) || 0,
      fiber: parseFloat(c.fiber) || 0,
      notes: c.notes || ''
    }));

    // Notification banner if simulation mode
    if (apiResult.isSimulation) {
      elements.simulationBanner.style.display = 'block';
    } else {
      elements.simulationBanner.style.display = 'none';
    }

    elements.reviewFoodName.value = analysis.foodName || 'Hidangan Piring';
    elements.reviewMealTypeSelect.value = state.selectedMealType;

    renderReviewComponents();
    recalculateReviewTotals();

    elements.modalReview.style.display = 'flex';
  }

  // Render Component Cards in Review Modal
  function renderReviewComponents() {
    elements.reviewComponentsList.innerHTML = '';

    state.componentsData.forEach((comp, idx) => {
      const card = document.createElement('div');
      card.className = 'component-card-row';
      card.innerHTML = `
        <div class="component-main-fields">
          <div class="form-group">
            <label class="form-label">Nama Komponen</label>
            <input type="text" class="form-control comp-name-input" value="${escapeHtml(comp.name)}">
          </div>
          <div class="form-group">
            <label class="form-label">Gramasi (g)</label>
            <input type="number" class="form-control comp-weight-input" min="1" max="2000" step="1" value="${comp.weightGrams}">
          </div>
          <div>
            <button type="button" class="btn-subtle btn-delete-comp" title="Hapus Komponen" style="margin-top: 22px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="component-nutrition-summary">
          <span>Kalori: <strong>${comp.calories}</strong> kkal</span>
          <span>Protein: <strong>${comp.protein}</strong> g</span>
          <span>Lemak: <strong>${comp.fat}</strong> g</span>
          <span>Karbo: <strong>${comp.carbs}</strong> g</span>
          <span>Gula: <strong>${comp.sugar}</strong> g</span>
          <span>Serat: <strong>${comp.fiber}</strong> g</span>
        </div>
      `;

      // Event listener for Grams change (Recalculates proportionally)
      const weightInput = card.querySelector('.comp-weight-input');
      weightInput.addEventListener('input', (e) => {
        const newWeight = parseFloat(e.target.value) || 0;
        comp.weightGrams = newWeight;
        const ratio = comp.originalWeight > 0 ? (newWeight / comp.originalWeight) : 1;

        comp.calories = Math.round(comp.baseCalories * ratio);
        comp.protein = Math.round(comp.baseProtein * ratio * 10) / 10;
        comp.fat = Math.round(comp.baseFat * ratio * 10) / 10;
        comp.carbs = Math.round(comp.baseCarbs * ratio * 10) / 10;
        comp.sugar = Math.round(comp.baseSugar * ratio * 10) / 10;
        comp.fiber = Math.round(comp.baseFiber * ratio * 10) / 10;

        // Update nutrition summary text in card
        const summaryDiv = card.querySelector('.component-nutrition-summary');
        summaryDiv.innerHTML = `
          <span>Kalori: <strong>${comp.calories}</strong> kkal</span>
          <span>Protein: <strong>${comp.protein}</strong> g</span>
          <span>Lemak: <strong>${comp.fat}</strong> g</span>
          <span>Karbo: <strong>${comp.carbs}</strong> g</span>
          <span>Gula: <strong>${comp.sugar}</strong> g</span>
          <span>Serat: <strong>${comp.fiber}</strong> g</span>
        `;

        recalculateReviewTotals();
      });

      // Name change
      const nameInput = card.querySelector('.comp-name-input');
      nameInput.addEventListener('input', (e) => {
        comp.name = e.target.value;
      });

      // Delete Component
      card.querySelector('.btn-delete-comp').addEventListener('click', () => {
        state.componentsData.splice(idx, 1);
        renderReviewComponents();
        recalculateReviewTotals();
      });

      elements.reviewComponentsList.appendChild(card);
    });
  }

  // Add Manual Component (For hidden items like oils, dressings, chili)
  function addManualComponentCard() {
    state.componentsData.push({
      id: 'comp_manual_' + Date.now(),
      name: 'Bahan Tambahan (Minyak/Saus)',
      originalWeight: 15,
      weightGrams: 15,
      baseCalories: 130,
      baseProtein: 0,
      baseFat: 14.5,
      baseCarbs: 0.5,
      baseSugar: 0.5,
      baseFiber: 0,
      calories: 130,
      protein: 0,
      fat: 14.5,
      carbs: 0.5,
      sugar: 0.5,
      fiber: 0,
      notes: 'Komponen manual'
    });

    renderReviewComponents();
    recalculateReviewTotals();
  }

  // Recalculate Totals in Review Modal
  function recalculateReviewTotals() {
    let totCal = 0;
    let totProtein = 0;
    let totFat = 0;
    let totCarbs = 0;
    let totFiber = 0;
    let totSugar = 0;

    state.componentsData.forEach(c => {
      totCal += Number(c.calories) || 0;
      totProtein += Number(c.protein) || 0;
      totFat += Number(c.fat) || 0;
      totCarbs += Number(c.carbs) || 0;
      totFiber += Number(c.fiber) || 0;
      totSugar += Number(c.sugar) || 0;
    });

    elements.reviewTotalCal.textContent = Math.round(totCal).toLocaleString('id-ID');
    elements.reviewTotalProtein.textContent = (Math.round(totProtein * 10) / 10) + ' g';
    elements.reviewTotalFat.textContent = (Math.round(totFat * 10) / 10) + ' g';
    elements.reviewTotalCarbs.textContent = (Math.round(totCarbs * 10) / 10) + ' g';
    elements.reviewTotalFiber.textContent = (Math.round(totFiber * 10) / 10) + ' g';
    elements.reviewTotalSugar.textContent = (Math.round(totSugar * 10) / 10) + ' g';
  }

  // Confirm and Save Meal to Backend
  async function handleConfirmSaveMeal() {
    if (!state.currentUser) return;

    if (state.componentsData.length === 0) {
      alert('Minimal harus ada 1 komponen makanan yang dicatat.');
      return;
    }

    const foodName = elements.reviewFoodName.value.trim() || 'Hidangan Piring';
    const mealType = elements.reviewMealTypeSelect.value;

    let totCal = 0;
    let totProtein = 0;
    let totFat = 0;
    let totCarbs = 0;
    let totFiber = 0;
    let totSugar = 0;

    state.componentsData.forEach(c => {
      totCal += Number(c.calories) || 0;
      totProtein += Number(c.protein) || 0;
      totFat += Number(c.fat) || 0;
      totCarbs += Number(c.carbs) || 0;
      totFiber += Number(c.fiber) || 0;
      totSugar += Number(c.sugar) || 0;
    });

    const payload = {
      userId: state.currentUser.id,
      mealType,
      foodName,
      imageUrl: state.capturedImageBase64,
      date: state.selectedDate,
      components: state.componentsData,
      totalNutrition: {
        calories: Math.round(totCal),
        protein: Math.round(totProtein * 10) / 10,
        fat: Math.round(totFat * 10) / 10,
        carbs: Math.round(totCarbs * 10) / 10,
        sugar: Math.round(totSugar * 10) / 10,
        fiber: Math.round(totFiber * 10) / 10
      }
    };

    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal menyimpan catatan makanan.');
        return;
      }

      elements.modalReview.style.display = 'none';

      // Reload dashboard data so remaining quota is deducted automatically!
      await loadDashboardData();

    } catch (err) {
      alert('Gagal menyimpan ke server: ' + err.message);
    }
  }

  // Settings Modal Handling
  async function openSettingsModal() {
    elements.settingsAlertMsg.style.display = 'none';
    elements.settingsApiKeyInput.value = '';
    elements.settingsKeyStatus.textContent = 'Memeriksa...';
    elements.modalSettings.style.display = 'flex';

    try {
      const res = await fetch('/api/settings/status');
      const data = await res.json();
      if (data.hasApiKey) {
        elements.settingsKeyStatus.textContent = `Tersambung (${data.maskedKey})`;
      } else {
        elements.settingsKeyStatus.textContent = 'Belum Dikonfigurasi (Mode Simulasi Aktif)';
      }
    } catch (err) {
      elements.settingsKeyStatus.textContent = 'Server tidak merespon';
    }
  }

  async function handleSaveSettingsKey() {
    const key = elements.settingsApiKeyInput.value.trim();

    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();

      if (data.success) {
        elements.settingsAlertMsg.textContent = data.message;
        elements.settingsAlertMsg.style.display = 'block';
        setTimeout(() => {
          elements.modalSettings.style.display = 'none';
        }, 1200);
      }
    } catch (err) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // ==========================================================================
  // Logika Panel Pemantauan Administrator (Khusus Shukoh#Dev)
  // ==========================================================================
  let adminUsersList = [];

  async function openAdminPanel() {
    if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') {
      alert('Akses ditolak. Fitur pemantauan ini khusus untuk akun Shukoh#Dev.');
      return;
    }
    showView('admin');
    switchAdminTab('users');
    await loadAdminUsers();
    await fetchAdminReportsStatsOnly();
  }

  async function fetchAdminReportsStatsOnly() {
    if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') return;
    try {
      const res = await fetch(`/api/admin/reports?adminId=${state.currentUser.id}`);
      const data = await res.json();
      if (data.success && data.stats) {
        updateAdminReportStats(data.stats);
      }
    } catch (e) {}
  }

  async function loadAdminUsers() {
    if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') return;
    try {
      const res = await fetch(`/api/admin/users?adminId=${state.currentUser.id}`);
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal memuat data pengguna.');
        return;
      }

      adminUsersList = data.users || [];
      updateAdminStats(adminUsersList);
      const query = elements.adminSearchInput ? elements.adminSearchInput.value.trim().toLowerCase() : '';
      renderAdminUsersTable(query);
    } catch (err) {
      console.error('Error loading admin users:', err);
    }
  }

  function updateAdminStats(users) {
    if (elements.adminStatTotalUsers) {
      elements.adminStatTotalUsers.textContent = users.length;
    }
    if (elements.adminStatActiveProfiles) {
      const activeProfiles = users.filter(u => u.hasProfile).length;
      elements.adminStatActiveProfiles.textContent = activeProfiles;
    }
    if (elements.adminStatTotalMeals) {
      const totalMeals = users.reduce((acc, u) => acc + (u.mealCount || 0), 0);
      elements.adminStatTotalMeals.textContent = totalMeals;
    }
  }

  function renderAdminUsersTable(query = '') {
    if (!elements.adminUsersTbody) return;
    elements.adminUsersTbody.innerHTML = '';

    const filtered = adminUsersList.filter(u => {
      const uname = (u.username || '').toLowerCase();
      const pname = (u.profile && u.profile.name ? u.profile.name : '').toLowerCase();
      return uname.includes(query) || pname.includes(query);
    });

    if (filtered.length === 0) {
      elements.adminUsersTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 32px;">
            Tidak ada akun terdaftar yang cocok dengan pencarian.
          </td>
        </tr>
      `;
      return;
    }

    const goalLabels = {
      loss: 'Turunkan BB',
      gain: 'Naikkan BB',
      maintain: 'Pertahankan BB'
    };

    filtered.forEach(u => {
      const tr = document.createElement('tr');
      const isAdmin = u.username === 'Shukoh#Dev';
      const roleBadge = isAdmin
        ? '<span class="role-badge-admin">Admin</span>'
        : '<span class="role-badge-user">User</span>';

      const p = u.profile;
      const physicalData = p
        ? `${p.height || 0} cm / ${p.weight || 0} kg`
        : '<span class="badge-profile-empty">Belum diisi</span>';

      const goalData = p
        ? `${goalLabels[p.goal] || p.goal} (${p.dailyCalories || 0} kkal)`
        : '<span class="badge-profile-empty">Belum dihitung</span>';

      const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) : '-';

      const actionBtn = (u.username === 'Shukoh#Dev')
        ? '<span style="font-size: 11px; color: var(--color-text-subtle);">Akun Utama</span>'
        : `<button type="button" class="btn-subtle btn-delete-user" data-user-id="${u.id}">Hapus</button>`;

      tr.innerHTML = `
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td>${roleBadge}</td>
        <td>${p && p.name ? escapeHtml(p.name) : '<span class="badge-profile-empty">Belum ada</span>'}</td>
        <td>${physicalData}</td>
        <td>${goalData}</td>
        <td><strong>${u.mealCount || 0}</strong> porsi</td>
        <td>${regDate}</td>
        <td>${actionBtn}</td>
      `;

      const deleteBtn = tr.querySelector('.btn-delete-user');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDeleteUserByAdmin(u.id, u.username));
      }

      elements.adminUsersTbody.appendChild(tr);
    });
  }

  async function handleDeleteUserByAdmin(userId, username) {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun '${username}' dari sistem? Seluruh riwayat makannya juga akan dihapus.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}?adminId=${state.currentUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal menghapus pengguna.');
        return;
      }
      await loadAdminUsers();
    } catch (err) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    }
  }

  // ==========================================================================
  // Logika Panel Laporan Khusus Administrator (Shukoh#Dev)
  // ==========================================================================
  let adminReportsList = [];
  let currentAdminReportFilter = 'all';

  function switchAdminTab(tab) {
    if (tab === 'users') {
      if (elements.btnAdminTabUsers) elements.btnAdminTabUsers.classList.add('active');
      if (elements.btnAdminTabReports) elements.btnAdminTabReports.classList.remove('active');
      if (elements.adminPaneUsers) elements.adminPaneUsers.style.display = 'block';
      if (elements.adminPaneReports) elements.adminPaneReports.style.display = 'none';
      loadAdminUsers();
    } else {
      if (elements.btnAdminTabReports) elements.btnAdminTabReports.classList.add('active');
      if (elements.btnAdminTabUsers) elements.btnAdminTabUsers.classList.remove('active');
      if (elements.adminPaneUsers) elements.adminPaneUsers.style.display = 'none';
      if (elements.adminPaneReports) elements.adminPaneReports.style.display = 'block';
      loadAdminReports();
    }
  }

  async function loadAdminReports() {
    if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') return;
    try {
      const res = await fetch(`/api/admin/reports?adminId=${state.currentUser.id}`);
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal memuat laporan pengguna.');
        return;
      }

      adminReportsList = data.reports || [];
      updateAdminReportStats(data.stats || {});
      renderAdminReportsTable();
    } catch (err) {
      console.error('Error loading admin reports:', err);
    }
  }

  function updateAdminReportStats(stats) {
    if (elements.adminStatTotalReports) elements.adminStatTotalReports.textContent = stats.total || 0;
    if (elements.adminStatReportsBaru) elements.adminStatReportsBaru.textContent = stats.baru || 0;
    if (elements.adminStatReportsProses) elements.adminStatReportsProses.textContent = stats.proses || 0;
    if (elements.adminStatReportsSelesai) elements.adminStatReportsSelesai.textContent = stats.selesai || 0;
    if (elements.adminReportsBadge) elements.adminReportsBadge.textContent = stats.baru || 0;
  }

  function renderAdminReportsTable() {
    if (!elements.adminReportsTbody) return;
    elements.adminReportsTbody.innerHTML = '';

    const query = elements.adminSearchReports ? elements.adminSearchReports.value.trim().toLowerCase() : '';

    const filtered = adminReportsList.filter(r => {
      if (currentAdminReportFilter !== 'all' && r.status !== currentAdminReportFilter) {
        return false;
      }
      if (!query) return true;
      const uname = (r.username || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      const cat = (r.category || '').toLowerCase();
      return uname.includes(query) || title.includes(query) || desc.includes(query) || cat.includes(query);
    });

    if (filtered.length === 0) {
      elements.adminReportsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--color-text-muted); padding: 32px;">
            Tidak ada laporan pengguna yang cocok dengan filter atau pencarian saat ini.
          </td>
        </tr>
      `;
      return;
    }

    const categoryLabels = {
      bug: { text: 'Bug / Kendala', cls: 'category-badge-bug' },
      saran: { text: 'Saran Fitur', cls: 'category-badge-saran' },
      kritik: { text: 'Kritik & Masukan', cls: 'category-badge-kritik' }
    };

    const statusBadgeMap = {
      baru: { text: 'Baru Saja', cls: 'status-badge-baru' },
      proses: { text: 'Sedang Diproses', cls: 'status-badge-proses' },
      selesai: { text: 'Sudah Selesai', cls: 'status-badge-selesai' }
    };

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const cat = categoryLabels[r.category] || { text: r.category, cls: 'category-badge-bug' };
      const st = statusBadgeMap[r.status] || statusBadgeMap['baru'];

      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';

      tr.innerHTML = `
        <td><span style="font-size: 11px; color: var(--color-text-muted);">${dateStr}</span></td>
        <td><strong>${escapeHtml(r.username)}</strong></td>
        <td><span class="category-badge ${cat.cls}">${cat.text}</span></td>
        <td>
          <div style="font-weight: 700; color: var(--color-text-main); margin-bottom: 3px;">${escapeHtml(r.title)}</div>
          <div style="font-size: 12px; color: var(--color-text-muted); max-width: 300px; line-height: 1.4;">${escapeHtml(r.description)}</div>
          ${r.adminNote ? `<div style="margin-top: 4px; font-size: 11px; color: var(--color-primary);"><em>Tanggapan: ${escapeHtml(r.adminNote)}</em></div>` : ''}
        </td>
        <td><span class="status-badge ${st.cls}">${st.text}</span></td>
        <td>
          <select class="admin-status-select" data-report-id="${r.id}">
            <option value="baru" ${r.status === 'baru' ? 'selected' : ''}>Baru Saja</option>
            <option value="proses" ${r.status === 'proses' ? 'selected' : ''}>Sedang Diproses</option>
            <option value="selesai" ${r.status === 'selesai' ? 'selected' : ''}>Sudah Selesai</option>
          </select>
        </td>
        <td>
          <button type="button" class="btn-subtle btn-delete-report" data-report-id="${r.id}">Hapus</button>
        </td>
      `;

      const select = tr.querySelector('.admin-status-select');
      if (select) {
        select.addEventListener('change', async (e) => {
          const newStatus = e.target.value;
          await handleUpdateReportStatus(r.id, newStatus, r.adminNote || '');
        });
      }

      const deleteBtn = tr.querySelector('.btn-delete-report');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          await handleDeleteReport(r.id, r.title);
        });
      }

      elements.adminReportsTbody.appendChild(tr);
    });
  }

  async function handleUpdateReportStatus(reportId, newStatus, currentNote) {
    if (!state.currentUser || state.currentUser.username !== 'Shukoh#Dev') return;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: state.currentUser.id,
          status: newStatus,
          adminNote: currentNote
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal memperbarui status laporan.');
        return;
      }

      await loadAdminReports();
    } catch (err) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    }
  }

  async function handleDeleteReport(reportId, title) {
    if (!confirm(`Apakah Anda yakin ingin menghapus laporan '${title}'?`)) return;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}?adminId=${state.currentUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal menghapus laporan.');
        return;
      }
      await loadAdminReports();
    } catch (err) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    }
  }

  // ==========================================================================
  // Logika Modal Laporan Pengguna (Kritik, Saran, Bug)
  // ==========================================================================
  function openReportModal() {
    if (!state.currentUser) {
      alert('Silakan masuk ke akun terlebih dahulu untuk mengirimkan laporan.');
      return;
    }
    if (elements.modalReport) {
      elements.modalReport.style.display = 'flex';
      switchReportTab('create');
      if (elements.reportFormMsg) elements.reportFormMsg.style.display = 'none';
      if (elements.formCreateReport) elements.formCreateReport.reset();
    }
  }

  function closeReportModal() {
    if (elements.modalReport) {
      elements.modalReport.style.display = 'none';
    }
  }

  function switchReportTab(tab) {
    if (!elements.paneReportCreate || !elements.paneReportHistory) return;
    if (tab === 'create') {
      elements.tabBtnReportCreate.classList.add('active');
      elements.tabBtnReportHistory.classList.remove('active');
      elements.paneReportCreate.style.display = 'flex';
      elements.paneReportHistory.style.display = 'none';
    } else {
      elements.tabBtnReportHistory.classList.add('active');
      elements.tabBtnReportCreate.classList.remove('active');
      elements.paneReportCreate.style.display = 'none';
      elements.paneReportHistory.style.display = 'flex';
      loadUserReports();
    }
  }

  async function handleSubmitReport(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const checkedCategory = document.querySelector('input[name="report_category"]:checked');
    const category = checkedCategory ? checkedCategory.value : 'bug';
    const title = elements.reportInputTitle ? elements.reportInputTitle.value.trim() : '';
    const description = elements.reportInputDesc ? elements.reportInputDesc.value.trim() : '';

    if (!title || !description) {
      alert('Judul dan rincian laporan wajib diisi.');
      return;
    }

    try {
      if (elements.btnSubmitReport) {
        elements.btnSubmitReport.disabled = true;
        elements.btnSubmitReport.textContent = 'Mengirim Laporan...';
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.currentUser.id,
          category,
          title,
          description
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Gagal mengirimkan laporan.');
        return;
      }

      if (elements.reportFormMsg) {
        elements.reportFormMsg.textContent = data.message;
        elements.reportFormMsg.style.display = 'block';
      }
      elements.formCreateReport.reset();

      setTimeout(() => {
        switchReportTab('history');
      }, 1200);

    } catch (err) {
      alert('Terjadi kesalahan koneksi: ' + err.message);
    } finally {
      if (elements.btnSubmitReport) {
        elements.btnSubmitReport.disabled = false;
        elements.btnSubmitReport.textContent = 'Kirim Laporan ke Admin';
      }
    }
  }

  async function loadUserReports() {
    if (!state.currentUser || !elements.userReportsList) return;
    elements.userReportsList.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 24px;">Memuat riwayat laporan...</div>';

    try {
      const res = await fetch(`/api/reports?userId=${state.currentUser.id}`);
      const data = await res.json();

      if (!data.success || !data.reports || data.reports.length === 0) {
        elements.userReportsList.innerHTML = `
          <div style="text-align: center; color: var(--color-text-muted); padding: 32px;">
            Belum ada laporan yang Anda kirimkan. Kritik, usulan saran, dan laporan bug yang Anda kirimkan akan tampil di sini lengkap dengan status penanganannya oleh admin.
          </div>
        `;
        return;
      }

      renderUserReports(data.reports);
    } catch (err) {
      elements.userReportsList.innerHTML = '<div style="color: var(--color-danger); padding: 16px;">Gagal memuat riwayat laporan.</div>';
    }
  }

  function renderUserReports(reports) {
    if (!elements.userReportsList) return;
    elements.userReportsList.innerHTML = '';

    const categoryLabels = {
      bug: { text: 'Bug / Kendala', cls: 'category-badge-bug' },
      saran: { text: 'Saran Fitur', cls: 'category-badge-saran' },
      kritik: { text: 'Kritik & Masukan', cls: 'category-badge-kritik' }
    };

    const statusMap = {
      baru: { text: 'Baru Saja', cls: 'status-badge-baru', hint: 'Laporan telah masuk ke antrean administrator dan menunggu penanganan.' },
      proses: { text: 'Sedang Diproses', cls: 'status-badge-proses', hint: 'Laporan telah dibaca dan sedang ditindaklanjuti oleh admin.' },
      selesai: { text: 'Sudah Selesai', cls: 'status-badge-selesai', hint: 'Laporan telah selesai ditindaklanjuti dan diselesaikan oleh admin.' }
    };

    reports.forEach(r => {
      const cat = categoryLabels[r.category] || { text: r.category, cls: 'category-badge-bug' };
      const st = statusMap[r.status] || statusMap['baru'];
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';

      const card = document.createElement('div');
      card.className = 'report-history-card';

      let adminReplyHtml = '';
      if (r.adminNote && r.adminNote.trim()) {
        adminReplyHtml = `
          <div class="report-admin-reply-box">
            <div class="report-admin-reply-title">Tanggapan Admin (Shukoh#Dev):</div>
            <div>${escapeHtml(r.adminNote)}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="report-card-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="category-badge ${cat.cls}">${cat.text}</span>
            <span class="report-card-date">${dateStr}</span>
          </div>
          <span class="status-badge ${st.cls}" title="${st.hint}">${st.text}</span>
        </div>
        <h4 class="report-card-title">${escapeHtml(r.title)}</h4>
        <p class="report-card-desc">${escapeHtml(r.description)}</p>
        <div style="font-size: 11px; color: var(--color-text-muted);">${st.hint}</div>
        ${adminReplyHtml}
      `;

      elements.userReportsList.appendChild(card);
    });
  }

  // Run on DOM Loaded
  document.addEventListener('DOMContentLoaded', init);

})();
