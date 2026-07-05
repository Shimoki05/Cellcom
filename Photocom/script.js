// PHOTOCOM v6.0 - Dynamic Classroom System with 1-5 Surveys
// LOCAL STORAGE ONLY: NO FIREBASE!

const LS = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
};

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};
const escapeAttr = (str) => escapeHtml(str).replace(/"/g,'&quot;');

// Initialize App Data
const initAppData = () => {
  let teachers = LS.get('teachers');
  if (!teachers || !Array.isArray(teachers)) {
    teachers = [{
      id: 'admin-default',
      fullName: 'Administrator',
      username: 'admin',
      email: 'admin@photocom.com',
      password: 'admin123',
      createdAt: new Date().toISOString()
    }];
    LS.set('teachers', teachers);
  }
  let students = LS.get('students');
  if (!students || !Array.isArray(students)) {
    students = [];
    LS.set('students', students);
  }
  let parts = LS.get('parts');
  if (!parts || !Array.isArray(parts)) {
    parts = []; // Start completely empty!
    LS.set('parts', parts);
  }
  let comics = LS.get('comics');
  if (!comics || !Array.isArray(comics)) {
    comics = []; // Start completely empty!
    LS.set('comics', comics);
  }
  let quizzes = LS.get('quizzes');
  if (!quizzes || !Array.isArray(quizzes)) {
    quizzes = []; // Start completely empty!
    LS.set('quizzes', quizzes);
  }
  let games = LS.get('games');
  if (!games || !Array.isArray(games)) {
    games = [];
    LS.set('games', games);
  }
  let quizAttempts = LS.get('quiz_attempts');
  if (!quizAttempts || !Array.isArray(quizAttempts)) {
    quizAttempts = [];
    LS.set('quiz_attempts', quizAttempts);
  }
  let rooms = LS.get('rooms');
  if (!rooms) {
    rooms = {};
    LS.set('rooms', rooms);
  }
};
initAppData();

let currentMode = 'signin';
let currentRole = null;
let currentUser = null;
let userData = null;
let activeStudentTab = 'home';
let activeTeacherPartId = null;
let partModalEditId = null;
let pendingQuizPartId = null;
let gameModalEditId = null;
let pendingGamePartId = null;
let selectedGameType = null;
let selectedQuizType = null;
let quizModalEditId = null;
let comicModalEditId = null;
let currentGameLevelMeta = [];

// Lucide icons refresh
const refreshLucide = () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Show/Hide screens
const showScreen = (screenId) => {
  ['sc-land', 'sc-tdash', 'sc-sdash', 'sc-qplayer', 'sc-qscore', 'sc-comic-reader', 'sc-game-player'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');
  if (screenId === 'sc-sdash' && activeStudentTab === 'home') {
    renderStudentHomeDashboard();
  }
};

// Modals
const openRoleModal = (mode) => {
  currentMode = mode;
  const modal = document.getElementById('roleModal');
  const title = document.getElementById('modalTitle');
  if (title) title.textContent = mode === 'signin' ? 'Choose Role to Sign In' : 'Choose Role to Register';
  if (modal) modal.classList.remove('hidden');
};

const closeRoleModal = () => {
  const modal = document.getElementById('roleModal');
  if (modal) modal.classList.add('hidden');
};

const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    if (modalId === 'gameTypeModal') setTimeout(initGameTypeCardFocus, 60);
  }
};

const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
};

// Promise-based confirm modal
const openConfirmModal = (message) => {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmModalMessage');
    const input = document.getElementById('confirmModalInput');
    const ok = document.getElementById('confirmOkBtn');
    const cancel = document.getElementById('confirmCancelBtn');
    if (!modal || !msg || !ok || !cancel || !input) {
      // Fallback to native confirm if modal not present
      const r = window.confirm(message);
      resolve(r);
      return;
    }
    msg.textContent = message;
    input.style.display = 'none';
    input.value = '';
    // Bring confirm modal to front and focus OK for accessibility
    modal.style.zIndex = 12000;
    modal.classList.remove('hidden');
    setTimeout(() => {
      try { ok.focus(); } catch(e){}
    }, 50);

    const cleanup = () => {
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.classList.add('hidden');
      input.style.display = 'none';
      input.value = '';
      modal.style.zIndex = '';
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
};

const openPromptModal = (message, options = {}) => {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmModalMessage');
    const input = document.getElementById('confirmModalInput');
    const ok = document.getElementById('confirmOkBtn');
    const cancel = document.getElementById('confirmCancelBtn');
    if (!modal || !msg || !ok || !cancel || !input) {
      const response = window.prompt(message, options.defaultValue || '');
      resolve(response ? response.trim() : null);
      return;
    }
    msg.textContent = message;
    input.style.display = 'block';
    input.placeholder = options.placeholder || 'Type here...';
    input.value = options.defaultValue || '';
    modal.style.zIndex = 12000;
    modal.classList.remove('hidden');
    setTimeout(() => {
      try { input.focus(); } catch(e){}
    }, 50);

    const cleanup = () => {
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      modal.classList.add('hidden');
      input.style.display = 'none';
      input.value = '';
      modal.style.zIndex = '';
    };

    const onOk = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };
    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
};

const openStudentJoinRoomModal = () => {
  showScreen('sc-land');
  openModal('studentJoinRoomModal');
  const codeInput = document.getElementById('studentJoinRoomCodeInput');
  if (codeInput) codeInput.value = '';
  refreshLucide();
};

const selectRole = (role) => {
  currentRole = role;
  closeRoleModal();
  if (currentMode === 'signin') {
    if (role === 'teacher') {
      const modal = document.getElementById('teacherSigninModal');
      if (modal) modal.classList.remove('hidden');
    } else {
      const modal = document.getElementById('studentSigninModal');
      if (modal) modal.classList.remove('hidden');
    }
  } else {
    if (role === 'teacher') {
      const modal = document.getElementById('teacherRegisterModal');
      if (modal) modal.classList.remove('hidden');
    } else {
      const modal = document.getElementById('studentRegisterModal');
      if (modal) modal.classList.remove('hidden');
    }
  }
};

// User data helpers
const getUserDataKey = (userId, role) => `userdata_${role}_${userId}`;

const initUserData = (userId, role) => {
  const key = getUserDataKey(userId, role);
  let data = LS.get(key);
  if (!data || typeof data !== 'object') {
    if (role === 'teacher') {
      data = {
        students: 0,
        quizzes: 0,
        comics: 0,
        rooms: 0
      };
    } else {
      data = {
        stars: 0,
        quizzesTaken: 0,
        comicsRead: 0,
        rank: 1
      };
    }
    LS.set(key, data);
  }
  return data;
};

const getStoredParts = () => LS.get('parts') || [];

const getPartOrdinalLabel = (index) => `Part ${index + 1}`;

const getPartMatchInfo = (partReference, parts = getStoredParts()) => {
  if (!partReference) return null;
  let index = parts.findIndex(part => part && part.id === partReference);
  if (index === -1) {
    index = parts.findIndex((part, idx) => part && getPartOrdinalLabel(idx) === partReference);
  }
  if (index === -1) return null;
  return {
    part: parts[index],
    index,
    legacyLabel: getPartOrdinalLabel(index)
  };
};

const partReferenceMatches = (partReference, partId, legacyLabel) => (
  partReference === partId || (!!legacyLabel && partReference === legacyLabel)
);

const isContentLinkedToPart = (contentPartId, part, index) => (
  partReferenceMatches(contentPartId, part.id, getPartOrdinalLabel(index))
);

const getPartDisplayLabel = (partReference) => {
  const match = getPartMatchInfo(partReference);
  if (!match) return partReference || 'No Part';
  return `${match.legacyLabel} — ${match.part.title || 'Untitled Part'}`;
};

const getStoredGames = () => LS.get('games') || [];

const parseDateTimeValue = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatDateTimeLabel = (value) => {
  const time = parseDateTimeValue(value);
  if (time === null) return '';
  return new Date(time).toLocaleString();
};

const hasAutoUnlocked = (item) => {
  const unlockTime = parseDateTimeValue(item?.unlockAt);
  return unlockTime !== null && Date.now() >= unlockTime;
};

const isItemLockedNow = (item) => !!item?.locked && !hasAutoUnlocked(item);

const getLockStatusLabel = (item) => {
  if (!item?.locked) return 'Unlocked';
  if (hasAutoUnlocked(item)) return 'Auto-Unlocked';
  return item.unlockAt ? `Locked until ${formatDateTimeLabel(item.unlockAt)}` : 'Locked';
};

const getQuizAvailability = (quiz) => {
  if (isPartLockedForStudents(quiz?.partId)) {
    return {
      available: false,
      reason: getPartLockReason(quiz.partId)
    };
  }

  const opensAtTime = parseDateTimeValue(quiz?.opensAt);
  const isOpenByTime = opensAtTime === null || Date.now() >= opensAtTime;
  const isLockedByToggle = isItemLockedNow(quiz);

  if (!isOpenByTime) {
    return {
      available: false,
      reason: `Opens ${formatDateTimeLabel(quiz.opensAt)}`
    };
  }

  if (isLockedByToggle) {
    return {
      available: false,
      reason: getLockStatusLabel(quiz)
    };
  }

  return { available: true, reason: 'Available' };
};

const getItemLockNotice = (item, fallback = 'Locked') => getLockStatusLabel(item) || fallback;

const getPartRooms = (part, index) => {
  const rooms = LS.get('rooms') || {};
  return Object.entries(rooms)
    .filter(([_, room]) => (
      room
      && room.teacherId === currentUser?.id
      && partReferenceMatches(room.partId, part.id, getPartOrdinalLabel(index))
    ))
    .map(([code, room]) => ({ code, ...room }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

const isPartLockedForStudents = (partReference) => {
  const match = getPartMatchInfo(partReference);
  return match ? isItemLockedNow(match.part) : false;
};

const getPartLockReason = (partReference) => {
  const match = getPartMatchInfo(partReference);
  if (!match) return '';
  return getLockStatusLabel(match.part);
};

const normalizeSavedUser = (user) => {
  if (!user || typeof user !== 'object') return null;
  if (user.role) {
    user.role = String(user.role).trim().toLowerCase();
  }
  if (!user.role) {
    if ('firstName' in user && 'lastName' in user) {
      user.role = 'student';
    } else if ('fullName' in user && 'email' in user) {
      user.role = 'teacher';
    }
  }
  return user;
};

// Populate dashboards
const populateDashboard = () => {
  if (!currentUser) return;
  
  const quizzes = LS.get('quizzes') || [];
  const comics = LS.get('comics') || [];
  const students = LS.get('students') || [];
  const attempts = LS.get('quiz_attempts') || [];
  const rooms = LS.get('rooms') || {};
  
  if (currentUser.role === 'teacher') {
    const nameEl = document.getElementById('t-dash-name');
    if (nameEl) nameEl.textContent = currentUser.fullName || 'Teacher Dashboard';
    const userEl = document.getElementById('t-dash-username');
    if (userEl) userEl.textContent = '@' + (currentUser.username || '');
    const sideName = document.getElementById('teacherSidebarName');
    if (sideName) sideName.textContent = currentUser.fullName || 'Teacher';
    const heroName = document.getElementById('t-hero-teacher-name');
    if (heroName) heroName.textContent = currentUser.fullName || 'Teacher';
    
    // Live counts
    const s1 = document.getElementById('t-h-students');
    if (s1) s1.textContent = students.length;
    const s2 = document.getElementById('t-h-quizzes');
    if (s2) s2.textContent = quizzes.length;
    const s3 = document.getElementById('t-h-comics');
    if (s3) s3.textContent = comics.length;
    const s4 = document.getElementById('t-h-rooms');
    if (s4) s4.textContent = Object.keys(rooms).length;
    
    // Set photos
    const sideImg = document.querySelector('.sidebar-user .sav');
    if (sideImg && currentUser.photoURL) {
      sideImg.innerHTML = `<img src="${currentUser.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
    }
  } else {
    const nameEl = document.getElementById('s-h-name');
    if (nameEl) nameEl.textContent = 'Hi, ' + (currentUser.firstName || 'Student') + '!';
    const infoEl = document.getElementById('s-dash-info');
    if (infoEl) infoEl.textContent = (currentUser.gradeLevel || currentUser.course || '') + ' - ' + (currentUser.section || '') + ' | @' + (currentUser.username || '');
    const sideName = document.getElementById('studentSidebarName');
    if (sideName) sideName.textContent = (currentUser.firstName || 'Student') + ' ' + (currentUser.lastName || '');
    
    userData = initUserData(currentUser.id, 'student');
    
    const myAttempts = attempts.filter(a => a.studentId === currentUser.id);
    const s1 = document.getElementById('s-h-stars');
    if (s1) s1.textContent = userData.stars || 0;
    const sLevel = document.getElementById('s-h-levels');
    if (sLevel) sLevel.textContent = (getStoredParts() || []).length || 0;
    const s2 = document.getElementById('s-h-quizzes');
    if (s2) s2.textContent = myAttempts.length;
    const s3 = document.getElementById('s-h-comics');
    if (s3) s3.textContent = userData.comicsRead || 0;
    
    // Calculate live rank
    const sorted = [...students].map(s => {
      const uData = LS.get(getUserDataKey(s.id, 'student')) || { stars: 0 };
      return { id: s.id, name: s.firstName, stars: uData.stars };
    }).sort((a, b) => b.stars - a.stars);
    
    const rankIndex = sorted.findIndex(s => s.id === currentUser.id);
    const liveRank = rankIndex !== -1 ? rankIndex + 1 : 1;
    
    const s4 = document.getElementById('s-h-rank');
    if (s4) s4.textContent = '#' + liveRank;
    
    const sideImg = document.querySelector('.sidebar-user .sav');
    if (sideImg && currentUser.photoURL) {
      sideImg.innerHTML = `<img src="${currentUser.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
    }
    const homeImg = document.querySelector('.sduav');
    if (homeImg && currentUser.photoURL) {
      homeImg.innerHTML = `<img src="${currentUser.photoURL}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`;
    }
    if (currentUser.role === 'student') {
      renderStudentHomeDashboard();
    }
  }
  refreshLucide();
};

// Navigation helpers
const setTeacherTab = (tab) => {
  const tabs = ['home', 'parts', 'comics', 'quizzes', 'games', 'room', 'reports', 'class'];
  document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('on'));
  document.querySelectorAll('.mnb').forEach(btn => btn.classList.remove('on'));
  // clear parts sub-item focus when switching main tabs
  document.querySelectorAll('.sidebar-sub-btn').forEach(btn => btn.classList.remove('on'));
  
  tabs.forEach(t => {
    const el = document.getElementById('t-' + t);
    if (el) el.classList.add('hidden');
  });
  
  const targetEl = document.getElementById('t-' + tab);
  if (targetEl) targetEl.classList.remove('hidden');
  
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tab) || btn.getAttribute('onclick')?.includes(tab)) {
      btn.classList.add('on');
    }
  });
  document.querySelectorAll('.sidebar-sub-btn').forEach(btn => btn.classList.remove('on'));
  if (['comics', 'quizzes', 'games'].includes(tab)) {
    const subBtn = document.querySelector(`.sidebar-sub-btn[data-tab="${tab}"]`);
    if (subBtn) {
      subBtn.classList.add('on');
      const partsBtn = document.getElementById('sidebar-btn-parts');
      if (partsBtn) partsBtn.classList.add('on');
      const partsMenu = document.getElementById('partsDropdownMenu');
      if (partsMenu) partsMenu.classList.remove('hidden');
      const chevron = document.querySelector('.parts-dropdown-chevron');
      if (chevron) chevron.classList.add('rotate');
    }
  }
  document.querySelectorAll('.mnb').forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tab) || btn.getAttribute('onclick')?.includes(tab)) {
      btn.classList.add('on');
    }
  });
  
  if (tab === 'parts') renderParts();
  if (tab === 'games') renderGames();
  if (tab === 'comics') renderComics();
  if (tab === 'quizzes') renderTeacherQuizzes();
  if (tab === 'reports') renderQuizReports();
  if (tab === 'class') renderClassStudents();
  if (tab === 'room') {
    // Check if teacher has a saved room code, if not generate one
    const currentCode = getCurrentRoomCode();
    if (!currentCode) {
      generateNewRoomCode();
    } else {
      // Check if current code is still valid/active
      const roomData = getRoomData(currentCode);
      if (!roomData || !roomData.active) {
        generateNewRoomCode();
      } else {
        refreshTeacherRoomUI();
      }
    }
  }
  
  refreshLucide();
};

const setStudentTab = (tab) => {
  activeStudentTab = tab;
  const tabs = ['home', 'parts', 'comics', 'quizzes', 'games', 'room', 'leaderboard'];
  document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('on'));
  document.querySelectorAll('.mnb').forEach(btn => btn.classList.remove('on'));
  document.querySelectorAll('.sidebar-sub-btn').forEach(btn => btn.classList.remove('on'));
  
  tabs.forEach(t => {
    const el = document.getElementById('s-' + t);
    if (el) el.classList.add('hidden');
  });
  
  const targetEl = document.getElementById('s-' + tab);
  if (targetEl) targetEl.classList.remove('hidden');
  
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tab) || btn.getAttribute('onclick')?.includes(tab)) {
      btn.classList.add('on');
    }
  });
  document.querySelectorAll('.mnb').forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tab) || btn.getAttribute('onclick')?.includes(tab)) {
      btn.classList.add('on');
    }
  });
  if (['comics', 'quizzes', 'games'].includes(tab)) {
    const subBtn = document.querySelector(`.sidebar-sub-btn[data-tab="${tab}"]`);
    if (subBtn) {
      subBtn.classList.add('on');
      const partsBtn = document.getElementById('sidebar-btn-parts-student');
      if (partsBtn) partsBtn.classList.add('on');
      const partsMenu = document.getElementById('partsDropdownMenuStudent');
      if (partsMenu) partsMenu.classList.remove('hidden');
      const chevron = document.querySelector('.parts-dropdown-chevron');
      if (chevron) chevron.classList.add('rotate');
    }
  }
  
  // Highlight sidebar sub-buttons and toggle dropdown states
  document.querySelectorAll('.sidebar-sub-btn').forEach(btn => btn.classList.remove('on'));
  if (tab === 'room') {
    const mainBtn = document.getElementById('sidebar-btn-room');
    if (mainBtn) mainBtn.classList.add('on');
    const menu = document.getElementById('roomDropdownMenu');
    if (menu) menu.classList.remove('hidden');
    const chevron = document.querySelector('.dropdown-chevron');
    if (chevron) chevron.classList.add('rotate');
    
    if (window.forceShowJoinForm) {
      const btn = document.getElementById('subBtnJoinAnother');
      if (btn) btn.classList.add('on');
    } else {
      const btn = document.getElementById('subBtnExistingRoom');
      if (btn) btn.classList.add('on');
    }
  } else {
    const menu = document.getElementById('roomDropdownMenu');
    if (menu) menu.classList.add('hidden');
    const chevron = document.querySelector('.dropdown-chevron');
    if (chevron) chevron.classList.remove('rotate');
  }
  
  if (tab === 'parts') renderParts();
  if (tab === 'games') renderGames();
  if (tab === 'comics') renderComics();
  if (tab === 'quizzes') renderStudentQuizzes();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'room') {
    refreshStudentRoomUI();
  }
  
  refreshLucide();
};

// Mobile sidebar
const toggleMobileSidebar = () => {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('hidden');
};

// Photo helper (Reads selected photo to base64)
const readPhotoAsBase64 = (input, previewId) => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    input.dataset.base64 = e.target.result;
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;">`;
    }
  };
  reader.readAsDataURL(file);
};

// Auth functions
const handleTeacherSignin = () => {
  const usernameInput = document.getElementById('tSigninUser');
  const passwordInput = document.getElementById('tSigninPass');
  const username = usernameInput?.value?.trim();
  const password = passwordInput?.value;
  if (!username || !password) {
    toast('Please fill all fields', 'warn');
    return;
  }
  const teachers = LS.get('teachers');
  const teacher = teachers.find(t => t && t.username === username && t.password === password);
  if (teacher) {
    currentUser = teacher;
    currentUser.role = 'teacher';
    LS.set('currentUser', currentUser);
    closeModal('teacherSigninModal');
    showScreen('sc-tdash');
    setTeacherTab('home');
    populateDashboard();
    startRoomSync();
    toast('Welcome back, ' + teacher.fullName + '!', 'ok');
  } else {
    toast('Invalid username or password', 'warn');
  }
};

const handleStudentSignin = () => {
  const usernameInput = document.getElementById('sSigninUser');
  const passwordInput = document.getElementById('sSigninPass');
  const username = usernameInput?.value?.trim();
  const password = passwordInput?.value;
  if (!username || !password) {
    toast('Please fill all fields', 'warn');
    return;
  }
  const students = LS.get('students');
  const student = students.find(s => s && s.username === username && s.password === password);
  if (student) {
    // Check if student is blocked
    if (student.blocked) {
      toast('Your account has been blocked by the teacher. Please contact your teacher.', 'warn');
      return;
    }
    currentUser = student;
    currentUser.role = 'student';
    LS.set('currentUser', currentUser);
    closeModal('studentSigninModal');
    
    // Check if student already has an active room
    const studentData = LS.get(`studentData_${currentUser.id}`) || {};
    if (studentData.currentRoomCode) {
      const roomData = getRoomData(studentData.currentRoomCode);
      if (roomData && roomData.active) {
        // If valid, go straight to dashboard
        showScreen('sc-sdash');
        setStudentTab('home');
        populateDashboard();
        if (isStudentUser(currentUser)) {
          renderStudentHomeDashboard();
        }
        startRoomSync();
        toast('Welcome back, ' + student.firstName + '!', 'ok');
        return;
      } else {
        // Clear invalid room code
        studentData.currentRoomCode = null;
        LS.set(`studentData_${currentUser.id}`, studentData);
      }
    }
    
    openStudentJoinRoomModal();
    toast('Welcome back, ' + student.firstName + '! Please join the room.', 'info');
  } else {
    toast('Invalid username or password', 'warn');
  }
};

const handleStudentJoinRoomFromModal = () => {
  const codeInput = document.getElementById('studentJoinRoomCodeInput');
  const code = codeInput?.value?.trim()?.toUpperCase();
  if (!code) {
    toast('Please enter a room code', 'warn');
    return;
  }
  
  const roomData = getRoomData(code);
  if (!roomData || !roomData.active) {
    toast('Invalid or expired room code. Please try again.', 'warn');
    return;
  }
  
  // Save student's current room
  const studentData = LS.get(`studentData_${currentUser.id}`) || {};
  studentData.currentRoomCode = code;
  LS.set(`studentData_${currentUser.id}`, studentData);
  
  // Add student to joined students if not already there
  const studentAlreadyJoined = roomData.joinedStudents.some(s => s.id === currentUser.id);
  if (!studentAlreadyJoined) {
    roomData.joinedStudents.push({
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      photoURL: currentUser.photoURL || null,
      joinedAt: Date.now()
    });
    saveRoomData(code, roomData);
  }
  
  // Close modal and go to dashboard
  closeModal('studentJoinRoomModal');
  showScreen('sc-sdash');
  setStudentTab('home');
  populateDashboard();
  renderStudentHomeDashboard();
  startRoomSync();
  toast('Successfully joined room ' + code + '!', 'ok');
};

const handleTeacherRegister = () => {
  const fullNameInput = document.getElementById('tRegFullName');
  const usernameInput = document.getElementById('tRegUser');
  const emailInput = document.getElementById('tRegEmail');
  const passwordInput = document.getElementById('tRegPass');
  const fileInput = document.getElementById('tRegPhoto');
  
  const fullName = fullNameInput?.value?.trim();
  const username = usernameInput?.value?.trim();
  const email = emailInput?.value?.trim();
  const password = passwordInput?.value;
  const photoURL = fileInput?.dataset?.base64 || '';
  
  if (!fullName || !username || !email || !password) {
    toast('Please fill all fields', 'warn');
    return;
  }
  const teachers = LS.get('teachers') || [];
  if (teachers.some(t => t && t.username === username)) {
    toast('Username already exists', 'warn');
    return;
  }
  const newTeacher = {
    id: Date.now().toString(),
    fullName,
    username,
    email,
    password,
    photoURL,
    createdAt: new Date().toISOString()
  };
  teachers.push(newTeacher);
  LS.set('teachers', teachers);
  initUserData(newTeacher.id, 'teacher');
  toast('Registration successful! Please sign in.', 'ok');
  closeModal('teacherRegisterModal');
  openRoleModal('signin');
  selectRole('teacher');
};

const handleStudentRegister = () => {
  const firstNameInput = document.getElementById('sRegFirstName');
  const lastNameInput = document.getElementById('sRegLastName');
  const gradeLevelInput = document.getElementById('sRegGradeLevel');
  const sectionInput = document.getElementById('sRegSection');
  const usernameInput = document.getElementById('sRegUser');
  const passwordInput = document.getElementById('sRegPass');
  const fileInput = document.getElementById('sRegPhoto');
  
  const firstName = firstNameInput?.value?.trim();
  const lastName = lastNameInput?.value?.trim();
  const gradeLevel = gradeLevelInput?.value;
  const section = sectionInput?.value?.trim();
  const username = usernameInput?.value?.trim();
  const password = passwordInput?.value;
  const photoURL = fileInput?.dataset?.base64 || '';
  
  if (!firstName || !lastName || !gradeLevel || !section || !username || !password) {
    toast('Please fill all fields', 'warn');
    return;
  }
  const students = LS.get('students') || [];
  if (students.some(s => s && s.username === username)) {
    toast('Username already exists', 'warn');
    return;
  }
  const newStudent = {
    id: Date.now().toString(),
    firstName,
    lastName,
    gradeLevel,
    section,
    username,
    password,
    photoURL,
    createdAt: new Date().toISOString()
  };
  students.push(newStudent);
  LS.set('students', students);
  initUserData(newStudent.id, 'student');
  toast('Registration successful! Please sign in.', 'ok');
  closeModal('studentRegisterModal');
  openRoleModal('signin');
  selectRole('student');
};

const logout = async () => {
  const confirmed = await openConfirmModal('Are you sure you want to log out?');
  if (!confirmed) return;
  if (window.roomSyncInterval) {
    clearInterval(window.roomSyncInterval);
    window.roomSyncInterval = null;
  }
  LS.remove('currentUser');
  currentUser = null;
  userData = null;
  showScreen('sc-land');
  toast('You have logged out', 'info');
};

// Utilities
const togglePass = (btn) => {
  if (!btn) return;
  const input = btn.previousElementSibling;
  if (input && (input.type === 'password' || input.type === 'text')) {
    input.type = input.type === 'password' ? 'text' : 'password';
    if (typeof lucide !== 'undefined') {
      const icon = btn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
        lucide.createIcons();
      }
    }
  }
};

const toast = (msg, type = 'info') => {
  const wrapper = document.getElementById('tw');
  if (!wrapper) return;
  const el = document.createElement('div');
  el.className = 'toast t-' + type;
  const ico = type === 'ok' ? '✓' : type === 'warn' ? '⚠' : 'ℹ';
  el.textContent = ico + ' ' + msg;
  wrapper.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(110%)';
    setTimeout(() => { try { wrapper.removeChild(el); } catch {} }, 300);
  }, 3000);
};

const toggleTheme = () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  LS.set('theme', next);
  
  const iconEls = document.querySelectorAll('#tico, .theme-ico');
  iconEls.forEach(el => {
    el.setAttribute('data-lucide', next === 'dark' ? 'moon' : 'sun');
  });
  refreshLucide();
};

// Profile details
const openUserProfile = () => {
  if (!currentUser) return;
  const avImg = `
    <div class="profile-pic-container" onclick="document.getElementById('profile-pic-uploader').click()" title="Click to change profile picture">
      ${currentUser.photoURL 
        ? `<img src="${currentUser.photoURL}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid var(--leaf);">`
        : `<div style="width:96px;height:96px;border-radius:50%;background:var(--surf3);display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;color:var(--txt2);">${(currentUser.fullName || currentUser.firstName || '?')[0].toUpperCase()}</div>`
      }
      <div class="profile-pic-overlay">
        <i data-lucide="camera" style="width:14px; height:14px;"></i>
      </div>
      <input type="file" id="profile-pic-uploader" accept="image/*" style="display:none;" onchange="handleProfilePicChange(this)">
    </div>
  `;
    
  const detailHtml = `
    <div style="text-align:center;padding:12px 0;">
      <div style="display:flex;justify-content:center;margin-bottom:16px;">${avImg}</div>
      <h3 style="font-family:'Lexend',sans-serif;color:var(--txth);margin-bottom:4px;">${currentUser.fullName || (currentUser.firstName + ' ' + currentUser.lastName)}</h3>
      <p style="font-size:0.85rem;color:var(--txt3);margin-bottom:20px;">@${currentUser.username} • ${currentUser.role.toUpperCase()}</p>
      <div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;text-align:left;font-size:0.85rem;">
        <div style="margin-bottom:8px;"><strong>Email:</strong> ${currentUser.email || 'None'}</div>
        ${currentUser.role === 'student' ? `
          <div style="margin-bottom:8px;"><strong>Grade Level:</strong> ${currentUser.gradeLevel || currentUser.course || '-'}</div>
          <div><strong>Section:</strong> ${currentUser.section || '-'}</div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Reuse role modal for generic user details
  const modal = document.getElementById('roleModal');
  const title = document.getElementById('modalTitle');
  if (title) title.textContent = 'User Profile Details';
  
  const body = modal.querySelector('.role-options');
  if (body) {
    body.innerHTML = detailHtml;
  }
  modal.classList.remove('hidden');
  refreshLucide();
};

// Room helpers
const makeRandomCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getTeacherDataKey = (teacherId) => `teacherData_${teacherId}`;

// Helper to get current room code and data
const getCurrentRoomCode = () => {
  if (!currentUser) return null;
  if (currentUser.role === 'teacher') {
    // For teachers: check saved room code from LS
    const teacherData = LS.get(getTeacherDataKey(currentUser.id)) || {};
    return teacherData.currentRoomCode || null;
  } else {
    // For students: check saved room code from LS
    const studentData = LS.get(`studentData_${currentUser.id}`) || {};
    return studentData.currentRoomCode || null;
  }
};

// Helper to get/initialize room data
const getRoomData = (code) => {
  if (!code) return null;
  const rooms = LS.get('rooms') || {};
  if (!rooms[code]) return null;
  
  // Ensure room has all required fields
  const room = rooms[code];
  if (!Array.isArray(room.joinedStudents)) room.joinedStudents = [];
  if (!Array.isArray(room.chatMessages)) room.chatMessages = [];
  if (typeof room.active !== 'boolean') room.active = true;
  
  return room;
};

// Helper to save room data
const saveRoomData = (code, data) => {
  const rooms = LS.get('rooms') || {};
  rooms[code] = data;
  LS.set('rooms', rooms);
};

// Helper to get initials from name
const getInitials = (first, last) => {
  const f = (first || '').charAt(0).toUpperCase();
  const l = (last || '').charAt(0).toUpperCase();
  return f + l;
};

// Refresh teacher room UI
const refreshTeacherRoomUI = () => {
  const currentCode = getCurrentRoomCode();
  if (!currentCode) return;
  
  const roomData = getRoomData(currentCode);
  if (!roomData) return;
  
  // Update room code display
  const codeEl = document.getElementById('roomCode');
  if (codeEl) codeEl.textContent = currentCode;
  
  // Update lock button
  const lockBtn = document.getElementById('toggleLockRoomBtn');
  if (lockBtn) {
    lockBtn.innerHTML = roomData.locked 
      ? '<i data-lucide="unlock"></i> Unlock Room' 
      : '<i data-lucide="lock"></i> Lock Room';
  }
  
  // Update joined students
  const sgridEl = document.getElementById('t-joinedStudents');
  if (sgridEl) {
    if (roomData.joinedStudents.length === 0) {
      sgridEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div>No students joined yet</div>`;
    } else {
      sgridEl.innerHTML = roomData.joinedStudents.map((student, index) => {
        const initials = getInitials(student.firstName, student.lastName);
        
        return `
          <div class="schip2 live">
            ${student.handRaised ? '<div class="hand-raised">🖐️</div>' : ''}
            <div class="sav">
              ${student.photoURL 
                ? `<img src="${student.photoURL}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` 
                : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, rgba(138,180,248,.2), rgba(122,162,247,.3));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;color:var(--leaf);">${initials}</div>`
              }
            </div>
            <div class="snm">${student.firstName} ${student.lastName}</div>
            <div class="spr">Joined</div>
            <div class="schip-actions">
              <button onclick="removeStudentFromRoom('${student.id}')" style="padding:4px 8px;border-radius:8px;border:1px solid rgba(248,113,113,.3);background:rgba(248,113,113,.1);cursor:pointer;">
                <i data-lucide="user-minus" style="width:14px;height:14px;color:var(--coral);"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
      refreshLucide();
    }
  }
  
  // Update chat messages
  const chatMsgsEl = document.getElementById('chatMessages');
  if (chatMsgsEl) {
    if (roomData.chatMessages.length === 0) {
      chatMsgsEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div>No messages yet</div>`;
    } else {
      chatMsgsEl.innerHTML = roomData.chatMessages.map(msg => {
        const initials = msg.senderName ? msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '👤';
        return `
          <div class="cmsg ${msg.type === 'announcement' ? 'announcement' : ''}">
            <div class="cav">
              ${msg.photoURL 
                ? `<img src="${msg.photoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` 
                : msg.role === 'teacher' 
                  ? '👨‍🏫' 
                  : initials
              }
            </div>
            <div>
              <div class="cnm">${msg.senderName}</div>
              <div class="cbub">${msg.text}</div>
            </div>
          </div>
        `;
      }).join('');
      chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
    }
  }
};

// Refresh student room UI
const refreshStudentRoomUI = () => {
  const currentCode = getCurrentRoomCode();
  
  // Update sidebar dropdown text
  const existingTextEl = document.getElementById('existingRoomText');
  if (existingTextEl) {
    existingTextEl.textContent = currentCode ? `Existing Room (${currentCode})` : 'Existing Room (None)';
  }
  
  if (!currentCode || window.forceShowJoinForm) {
    // Show join form, hide joined UI
    document.getElementById('s-room-join-form').classList.remove('hidden');
    document.getElementById('s-room-joined').classList.add('hidden');
    
    // Handle dynamic "Back to Active Room" button in room tab
    const joinBox = document.querySelector('#s-room-join-form .auth-box');
    if (joinBox) {
      let cancelBtn = document.getElementById('s-room-join-cancel');
      if (currentCode && window.forceShowJoinForm) {
        if (!cancelBtn) {
          cancelBtn = document.createElement('button');
          cancelBtn.id = 's-room-join-cancel';
          cancelBtn.className = 'btn btn-ghost mt1';
          cancelBtn.style.width = '100%';
          cancelBtn.textContent = 'Back to Active Room';
          cancelBtn.onclick = () => {
            window.forceShowJoinForm = false;
            refreshStudentRoomUI();
            setStudentTab('room');
          };
          joinBox.appendChild(cancelBtn);
        } else {
          cancelBtn.classList.remove('hidden');
        }
      } else {
        if (cancelBtn) cancelBtn.classList.add('hidden');
      }
    }
    return;
  }
  
  const roomData = getRoomData(currentCode);
  if (!roomData) {
    // Invalid room, clear it
    if (currentUser) {
      const studentData = LS.get(`studentData_${currentUser.id}`) || {};
      studentData.currentRoomCode = null;
      LS.set(`studentData_${currentUser.id}`, studentData);
    }
    document.getElementById('s-room-join-form').classList.remove('hidden');
    document.getElementById('s-room-joined').classList.add('hidden');
    return;
  }
  
  // Show joined UI, hide join form
  document.getElementById('s-room-join-form').classList.add('hidden');
  document.getElementById('s-room-joined').classList.remove('hidden');
  
  // Update room code display
  const codeEl = document.getElementById('s-roomCode');
  if (codeEl) codeEl.textContent = currentCode;
  
  // Update raise hand button
  const currentStudent = roomData.joinedStudents.find(s => s.id === currentUser.id);
  const raiseBtn = document.getElementById('studentRaiseHandBtn');
  if (raiseBtn && currentStudent) {
    raiseBtn.classList.toggle('active', currentStudent.handRaised);
    raiseBtn.innerHTML = currentStudent.handRaised 
      ? '<i data-lucide="hand"></i> Lower Hand' 
      : '<i data-lucide="hand"></i> Raise Hand';
    refreshLucide();
  }
  
  // Update joined students
  const sgridEl = document.getElementById('s-joinedStudents');
  if (sgridEl) {
    if (roomData.joinedStudents.length === 0) {
      sgridEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div>No students joined yet</div>`;
    } else {
      sgridEl.innerHTML = roomData.joinedStudents.map((student, index) => {
        const initials = getInitials(student.firstName, student.lastName);
        
        return `
          <div class="schip2 live">
            ${student.handRaised ? '<div class="hand-raised">🖐️</div>' : ''}
            <div class="sav">
              ${student.photoURL 
                ? `<img src="${student.photoURL}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">` 
                : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg, rgba(138,180,248,.2), rgba(122,162,247,.3));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;color:var(--leaf);">${initials}</div>`
              }
            </div>
            <div class="snm">${student.firstName} ${student.lastName}</div>
            <div class="spr">Joined</div>
          </div>
        `;
      }).join('');
    }
  }
  
  // Update chat messages
  const chatMsgsEl = document.getElementById('s-chatMessages');
  if (chatMsgsEl) {
    if (roomData.chatMessages.length === 0) {
      chatMsgsEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div>No messages yet</div>`;
    } else {
      chatMsgsEl.innerHTML = roomData.chatMessages.map(msg => {
        const initials = msg.senderName ? msg.senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '👤';
        return `
          <div class="cmsg ${msg.type === 'announcement' ? 'announcement' : ''}">
            <div class="cav">
              ${msg.photoURL 
                ? `<img src="${msg.photoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` 
                : msg.role === 'teacher' 
                  ? '👨‍🏫' 
                  : initials
              }
            </div>
            <div>
              <div class="cnm">${msg.senderName}</div>
              <div class="cbub">${msg.text}</div>
            </div>
          </div>
        `;
      }).join('');
      chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
    }
  }
};

const generateNewRoomCode = (partId = null) => {
  const newCode = makeRandomCode(6);
  
  // Save to teacher's data
  const teacherData = LS.get(getTeacherDataKey(currentUser.id)) || {};
  teacherData.currentRoomCode = newCode;
  LS.set(getTeacherDataKey(currentUser.id), teacherData);
  
  // Initialize room
  const rooms = LS.get('rooms') || {};
  // Disable old room codes from this teacher first
  for (let key in rooms) {
    if (rooms[key] && rooms[key].teacherId === currentUser.id) {
      rooms[key].active = false;
    }
  }
  rooms[newCode] = {
    active: true,
    locked: false,
    teacherId: currentUser.id,
    partId,
    createdAt: Date.now(),
    joinedStudents: [],
    chatMessages: [
      {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        role: 'teacher',
        type: 'message',
        text: 'Welcome to the game room!',
        photoURL: null,
        timestamp: Date.now()
      }
    ]
  };
  LS.set('rooms', rooms);
  
  // Update UI
  refreshTeacherRoomUI();
  if (activeTeacherPartId) {
    renderTeacherPartDetail();
  }
  
  toast('Generated new Room Code: ' + newCode, 'ok');
};

// New room functions
const sendAnnouncement = async () => {
  const text = await openPromptModal('Enter your announcement:', {
    placeholder: 'Type your announcement here...'
  });
  if (!text) return;
  
  const code = getCurrentRoomCode();
  if (!code) return;
  
  const roomData = getRoomData(code);
  if (!roomData) return;
  
  roomData.chatMessages.push({
    id: Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.fullName,
    role: 'teacher',
    type: 'announcement',
    text,
    photoURL: currentUser.photoURL || null,
    timestamp: Date.now()
  });
  saveRoomData(code, roomData);
  toast('Announcement sent!', 'ok');
  refreshTeacherRoomUI();
};

const clearRoomChat = async () => {
  const confirmed = await openConfirmModal('Are you sure you want to clear all chat messages?');
  if (!confirmed) return;
  
  const code = getCurrentRoomCode();
  if (!code) return;
  
  const roomData = getRoomData(code);
  if (!roomData) return;
  
  roomData.chatMessages = [];
  saveRoomData(code, roomData);
  toast('Chat cleared!', 'ok');
  refreshTeacherRoomUI();
};

const toggleLockRoom = () => {
  const code = getCurrentRoomCode();
  if (!code) return;
  
  const roomData = getRoomData(code);
  if (!roomData) return;
  
  roomData.locked = !roomData.locked;
  saveRoomData(code, roomData);
  
  const btn = document.getElementById('toggleLockRoomBtn');
  if (btn) {
    btn.innerHTML = roomData.locked 
      ? '<i data-lucide="unlock"></i> Unlock Room' 
      : '<i data-lucide="lock"></i> Lock Room';
    refreshLucide();
  }
  
  toast(roomData.locked ? 'Room locked!' : 'Room unlocked!', 'ok');
};

const removeStudentFromRoom = (studentId) => {
  if (!confirm('Are you sure you want to remove this student from the room?')) return;
  
  const code = getCurrentRoomCode();
  if (!code) return;
  
  const roomData = getRoomData(code);
  if (!roomData) return;
  
  roomData.joinedStudents = roomData.joinedStudents.filter(s => s.id !== studentId);
  saveRoomData(code, roomData);
  toast('Student removed from room!', 'ok');
  refreshTeacherRoomUI();
};

const toggleStudentRaiseHand = () => {
  const code = getCurrentRoomCode();
  if (!code) return;
  
  const roomData = getRoomData(code);
  if (!roomData) return;
  
  const studentIdx = roomData.joinedStudents.findIndex(s => s.id === currentUser.id);
  if (studentIdx === -1) return;
  
  roomData.joinedStudents[studentIdx].handRaised = !roomData.joinedStudents[studentIdx].handRaised;
  saveRoomData(code, roomData);
  
  const btn = document.getElementById('studentRaiseHandBtn');
  if (btn) {
    btn.classList.toggle('active', roomData.joinedStudents[studentIdx].handRaised);
    btn.innerHTML = roomData.joinedStudents[studentIdx].handRaised 
      ? '<i data-lucide="hand"></i> Lower Hand' 
      : '<i data-lucide="hand"></i> Raise Hand';
    refreshLucide();
  }
  
  toast(roomData.joinedStudents[studentIdx].handRaised ? 'Hand raised! 🖐️' : 'Hand lowered!', 'ok');
  refreshStudentRoomUI();
};

const joinRoom = () => {
  const codeInput = document.getElementById('joinRoomCode');
  const code = codeInput?.value?.trim()?.toUpperCase();
  if (!code) {
    toast('Please enter a room code', 'warn');
    return;
  }
  
  const roomData = getRoomData(code);
  if (!roomData || !roomData.active) {
    toast('Invalid or expired room code. Please try again.', 'warn');
    return;
  }

  if (roomData.locked) {
    toast('This room is locked. Please ask your teacher to unlock it.', 'warn');
    return;
  }
  
  // Save student's current room
  const studentData = LS.get(`studentData_${currentUser.id}`) || {};
  studentData.currentRoomCode = code;
  LS.set(`studentData_${currentUser.id}`, studentData);
  
  // Add student to joined students if not already there
  const studentAlreadyJoined = roomData.joinedStudents.some(s => s.id === currentUser.id);
  if (!studentAlreadyJoined) {
    roomData.joinedStudents.push({
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      photoURL: currentUser.photoURL || null,
      joinedAt: Date.now(),
      handRaised: false
    });
    saveRoomData(code, roomData);
  }
  
  window.forceShowJoinForm = false;
  // Update UI
  refreshStudentRoomUI();
  startRoomSync();
  
  toast('Successfully joined room ' + code + '! 🎮', 'ok');
};

const copyRoomCode = () => {
  const currentCode = getCurrentRoomCode();
  if (!currentCode) {
    toast('No active room code yet', 'warn');
    return;
  }
  
  navigator.clipboard.writeText(currentCode).then(() => {
    toast('Room code copied!', 'ok');
  }).catch(() => {
    toast('Could not copy code', 'warn');
  });
};

const sendChat = () => {
  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;
  
  const currentCode = getCurrentRoomCode();
  if (!currentCode) {
    toast('No active room', 'warn');
    return;
  }
  
  const roomData = getRoomData(currentCode);
  if (!roomData) return;
  
  // Add message
  roomData.chatMessages.push({
    id: Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.fullName,
    role: 'teacher',
    type: 'message',
    text: text,
    photoURL: currentUser.photoURL || null,
    timestamp: Date.now()
  });
  saveRoomData(currentCode, roomData);
  
  // Clear input and refresh UI
  chatInput.value = '';
  refreshTeacherRoomUI();
};

const sendStudentChat = () => {
  const chatInput = document.getElementById('s-chatInput');
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;
  
  const currentCode = getCurrentRoomCode();
  if (!currentCode) {
    toast('You are not in a room', 'warn');
    return;
  }
  
  const roomData = getRoomData(currentCode);
  if (!roomData) return;
  
  // Add message
  roomData.chatMessages.push({
    id: Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.firstName + ' ' + currentUser.lastName,
    role: 'student',
    type: 'message',
    text: text,
    photoURL: currentUser.photoURL || null,
    timestamp: Date.now()
  });
  saveRoomData(currentCode, roomData);
  
  // Clear input and refresh UI
  chatInput.value = '';
  refreshStudentRoomUI();
};

const sendEmoji = (emoji) => {
  // Try student input first, then teacher input
  let chatInput = document.getElementById('s-chatInput');
  if (!chatInput || chatInput.offsetParent === null) {
    chatInput = document.getElementById('chatInput');
  }
  
  if (chatInput) {
    chatInput.value += emoji;
    chatInput.focus();
  }
};

// ═══ PARTS MANAGEMENT ═══

const showTeacherPartsMainView = () => {
  const mainView = document.getElementById('teacher-parts-main-view');
  const detailView = document.getElementById('teacher-part-detail-view');
  if (mainView) mainView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
};

const showTeacherPartDetailView = () => {
  const mainView = document.getElementById('teacher-parts-main-view');
  const detailView = document.getElementById('teacher-part-detail-view');
  if (mainView) mainView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');
};

const closePartModal = () => {
  partModalEditId = null;
  closeModal('partModal');
};

const openPartModal = (partId = null) => {
  const parts = getStoredParts();
  const modalTitle = document.getElementById('partModalTitle');
  const saveBtn = document.getElementById('partModalSaveBtn');
  const titleInput = document.getElementById('pt-title');
  const subtitleInput = document.getElementById('pt-subtitle');
  const descInput = document.getElementById('pt-desc');
  const lockToggle = document.getElementById('pt-lock-toggle');
  const unlockInput = document.getElementById('pt-unlock-at');

  partModalEditId = partId;

  if (partId) {
    const part = parts.find(item => item && item.id === partId);
    if (!part) {
      toast('Part not found', 'warn');
      return;
    }
    if (titleInput) titleInput.value = part.title || '';
    if (subtitleInput) subtitleInput.value = part.subtitle || '';
    if (descInput) descInput.value = part.description || '';
    if (lockToggle) lockToggle.checked = !!part.locked && !hasAutoUnlocked(part);
    if (unlockInput) unlockInput.value = part.unlockAt || '';
    if (modalTitle) modalTitle.textContent = 'Edit Part';
    if (saveBtn) saveBtn.textContent = 'Update Part';
  } else {
    if (titleInput) titleInput.value = '';
    if (subtitleInput) subtitleInput.value = '';
    if (descInput) descInput.value = '';
    if (lockToggle) lockToggle.checked = false;
    if (unlockInput) unlockInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Add New Part';
    if (saveBtn) saveBtn.textContent = 'Save Part';
  }
  
  openModal('partModal');
};

const addNewPart = () => {
  const title = document.getElementById('pt-title')?.value?.trim();
  const subtitle = document.getElementById('pt-subtitle')?.value?.trim();
  const description = document.getElementById('pt-desc')?.value?.trim();
  const locked = !!document.getElementById('pt-lock-toggle')?.checked;
  const unlockAt = document.getElementById('pt-unlock-at')?.value || '';
  
  if (!title) {
    toast('Part title is required', 'warn');
    return;
  }
  
  const parts = getStoredParts();
  if (partModalEditId) {
    const partIndex = parts.findIndex(part => part && part.id === partModalEditId);
    if (partIndex === -1) {
      toast('Part not found', 'warn');
      return;
    }
    parts[partIndex] = {
      ...parts[partIndex],
      title,
      subtitle,
      description,
      locked,
      unlockAt
    };
    LS.set('parts', parts);
    toast('Part updated successfully!', 'ok');
  } else {
    const newPart = {
      id: `part_${Date.now()}`,
      title,
      subtitle,
      description,
      locked,
      unlockAt,
      createdAt: Date.now()
    };
    parts.push(newPart);
    LS.set('parts', parts);
    toast('New Part added!', 'ok');
  }

  const updatedPartId = partModalEditId;
  partModalEditId = null;
  LS.set('parts', parts);
  closePartModal();
  renderParts();
  if (updatedPartId && activeTeacherPartId === updatedPartId) {
    renderTeacherPartDetail();
  }
};

const deletePart = (partId) => {
  const parts = getStoredParts();
  const partIndex = parts.findIndex(part => part && part.id === partId);
  if (partIndex === -1) {
    toast('Part not found', 'warn');
    return;
  }
  const legacyLabel = getPartOrdinalLabel(partIndex);

  openConfirmModal('Are you sure you want to delete this part? All linked contents will remain but lose their part link.')
    .then(confirmed => {
      if (!confirmed) return;
      const remainingParts = parts.filter(part => part.id !== partId);
      LS.set('parts', remainingParts);

      const comics = (LS.get('comics') || []).map(comic => (
        partReferenceMatches(comic.partId, partId, legacyLabel)
          ? { ...comic, partId: null }
          : comic
      ));
      LS.set('comics', comics);

      const quizzes = (LS.get('quizzes') || []).map(quiz => (
        partReferenceMatches(quiz.partId, partId, legacyLabel)
          ? { ...quiz, partId: null }
          : quiz
      ));
      LS.set('quizzes', quizzes);

      const games = getStoredGames().map(game => (
        partReferenceMatches(game.partId, partId, legacyLabel)
          ? { ...game, partId: null }
          : game
      ));
      LS.set('games', games);

      const rooms = LS.get('rooms') || {};
      Object.keys(rooms).forEach(code => {
        if (partReferenceMatches(rooms[code]?.partId, partId, legacyLabel)) {
          rooms[code].partId = null;
        }
      });
      LS.set('rooms', rooms);

      if (activeTeacherPartId === partId) {
        activeTeacherPartId = null;
        showTeacherPartsMainView();
      }

      toast('Part deleted', 'ok');
      renderParts();
      renderComics();
      renderTeacherQuizzes();
      refreshTeacherRoomUI();
    });
};

const togglePartLock = (partId) => {
  const parts = getStoredParts();
  const part = parts.find(p => p.id === partId);
  if (part) {
    part.locked = !part.locked;
    if (!part.locked) {
      part.unlockAt = '';
    }
    LS.set('parts', parts);
    toast(`Part is now ${part.locked ? 'Locked 🔒' : 'Unlocked 🔓'}`, 'info');
    renderParts();
    if (activeTeacherPartId === partId) {
      renderTeacherPartDetail();
    }
  }
};

const openPartWorkspace = (partId) => {
  activeTeacherPartId = partId;
  showTeacherPartDetailView();
  renderTeacherPartDetail();
};

const closePartWorkspace = () => {
  activeTeacherPartId = null;
  showTeacherPartsMainView();
  renderParts();
};

const openCreateQuizFromPart = (partId) => {
  pendingQuizPartId = partId;
  setTeacherTab('quizzes');
  openCreateQuizForm(partId);
};

const openGameBuilderFromPart = (partId) => {
  openGameModal(partId);
};

const renderTeacherPartDetail = () => {
  const container = document.getElementById('teacher-part-detail-content');
  if (!container) return;

  const parts = getStoredParts();
  const match = getPartMatchInfo(activeTeacherPartId, parts);
  if (!match) {
    activeTeacherPartId = null;
    showTeacherPartsMainView();
    renderParts();
    return;
  }

  const { part, index, legacyLabel } = match;
  const themeClass = `p${(index % 3) + 1}`;
  const partLockedNow = isItemLockedNow(part);
  const comics = (LS.get('comics') || []).filter(comic => isContentLinkedToPart(comic.partId, part, index));
  const quizzes = (LS.get('quizzes') || []).filter(quiz => isContentLinkedToPart(quiz.partId, part, index));
  const games = getStoredGames().filter(game => isContentLinkedToPart(game.partId, part, index));

  const comicItems = comics.length
    ? comics.map(comic => `
        <div class="pitem" onclick="${isItemLockedNow(comic) ? '' : `openComicReader('${comic.id}')`}">
          <div class="pitem-ico" style="background:var(--surf3);">📖</div>
          <div class="pitem-inf">
            <h5>${comic.title}</h5>
            <p>${comic.pages.length} page${comic.pages.length !== 1 ? 's' : ''} • ${getLockStatusLabel(comic)}</p>
          </div>
          <i data-lucide="${isItemLockedNow(comic) ? 'lock' : 'chevron-right'}" class="pitem-arr"></i>
        </div>
      `).join('')
    : '<div class="part-empty-note">No comics yet for this part.</div>';

  const quizItems = quizzes.length
    ? quizzes.map(quiz => `
        <div class="pitem" onclick="setTeacherTab('quizzes')">
          <div class="pitem-ico" style="background:rgba(168,199,250,0.15);">📝</div>
          <div class="pitem-inf">
            <h5>${quiz.title}</h5>
            <p>${quiz.type} • ${quiz.questions.length} questions • ${getLockStatusLabel(quiz)}</p>
          </div>
          <i data-lucide="chevron-right" class="pitem-arr"></i>
        </div>
      `).join('')
    : '<div class="part-empty-note">No quizzes yet for this part.</div>';

  const gameItems = games.length
    ? games.map(game => `
        <div class="pitem" onclick="openGameModal('${part.id}', '${game.id}')">
          <div class="pitem-ico" style="background:rgba(122,162,247,0.16);">🎮</div>
          <div class="pitem-inf">
            <h5>${game.title}</h5>
            <p>${game.typeLabel} • ${getLockStatusLabel(game)}</p>
          </div>
          <i data-lucide="chevron-right" class="pitem-arr"></i>
        </div>
      `).join('')
    : '<div class="part-empty-note">No games yet for this part.</div>';

  container.innerHTML = `
    <div class="part-workspace-shell">
      <div class="pcard">
        <div class="ph ${themeClass}">
          <div>
            <div class="ptitle ${themeClass}">${legacyLabel}</div>
            <div style="font-family:'Lexend',sans-serif;font-size:1.5rem;font-weight:800;color:var(--txth);margin-top:4px;">${part.title || 'Untitled Part'}</div>
            <div class="psub">${part.subtitle || 'No subtitle yet'}</div>
          </div>
          <div class="lock-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <span class="lock-lbl">${getLockStatusLabel(part)}</span>
            <button class="choice-delete-btn" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:transparent;transition:all 0.3s ease;cursor:pointer;border:none;" onclick="togglePartLock('${part.id}')">
              <i data-lucide="${partLockedNow ? 'lock' : 'unlock'}" style="width:24px;height:24px;color:${partLockedNow ? 'var(--coral)' : 'var(--leaf)'};"></i>
            </button>
          </div>
        </div>
        <div class="pbody">
          <p style="font-size:0.92rem;color:var(--txt2);margin-bottom:14px;">${part.description || 'No description yet for this part.'}</p>
          <div class="part-stats-row">
            <div class="part-stat-chip"><strong>${comics.length}</strong><span>Comics</span></div>
            <div class="part-stat-chip"><strong>${quizzes.length}</strong><span>Quizzes</span></div>
            <div class="part-stat-chip"><strong>${games.length}</strong><span>Games</span></div>
            <div class="part-stat-chip"><strong>${partLockedNow ? 'Locked' : 'Ready'}</strong><span>Status</span></div>
          </div>
          <div class="part-action-row">
            <button class="btn btn-ghost btn-sm" onclick="openPartModal('${part.id}')">
              <i data-lucide="pencil"></i> Edit Part
            </button>
            <button class="btn btn-g btn-sm" onclick="openComicModal('${part.id}')">
              <i data-lucide="book-plus"></i> Create Comic
            </button>
            <button class="btn btn-g btn-sm" onclick="openCreateQuizFromPart('${part.id}')">
              <i data-lucide="clipboard-plus"></i> Create Quiz
            </button>
            <button class="btn btn-g btn-sm" onclick="openGameBuilderFromPart('${part.id}')">
              <i data-lucide="gamepad-2"></i> Create Game
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  refreshLucide();
};

const renderParts = () => {
  const tGrid = document.getElementById('teacher-parts-grid');
  const sGrid = document.getElementById('student-parts-grid');
  const parts = getStoredParts();
  const quizzes = LS.get('quizzes') || [];
  const comics = LS.get('comics') || [];
  
  const renderPartCardsHtml = (isTeacher) => {
    if (parts.length === 0) {
      return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3);">No learning parts yet. ${isTeacher ? 'Create one to start building your lesson.' : 'Your teacher will add lessons here soon.'}</div>`;
    }
    
    const isSinglePart = parts.length === 1;
    
    return parts.map((p, idx) => {
      const partQuizzes = quizzes.filter(q => isContentLinkedToPart(q.partId, p, idx));
      const partComics = comics.filter(c => isContentLinkedToPart(c.partId, p, idx));
      const partGames = getStoredGames().filter(g => isContentLinkedToPart(g.partId, p, idx));
      const partLockedNow = isItemLockedNow(p);
      
      let itemsListHtml = '';
      if (isTeacher || !partLockedNow) {
        partComics.forEach(c => {
          const comicLockedNow = isItemLockedNow(c);
          itemsListHtml += `
            <div class="pitem" onclick="${comicLockedNow ? '' : `openComicReader('${c.id}')`}">
              <div class="pitem-ico" style="background:var(--surf3);">📖</div>
              <div class="pitem-inf">
                <h5>${c.title}</h5>
                <p>${comicLockedNow ? getLockStatusLabel(c) : 'Read comic chapter'}</p>
              </div>
              <i data-lucide="${comicLockedNow ? 'lock' : 'chevron-right'}" class="pitem-arr"></i>
            </div>
          `;
        });
        partQuizzes.forEach(q => {
          // Check if student completed it
          const attempts = LS.get('quiz_attempts') || [];
          const done = !isTeacher && attempts.some(a => a.quizId === q.id && a.studentId === currentUser.id);
          const quizAvailability = getQuizAvailability(q);
          
          itemsListHtml += `
            <div class="pitem" onclick="${isTeacher ? `setTeacherTab('quizzes')` : (quizAvailability.available ? `startStudentQuiz('${q.id}')` : '')}">
              <div class="pitem-ico" style="background:${done ? 'var(--surf3)' : 'rgba(168,199,250,0.15)'};">${done ? '✓' : '📝'}</div>
              <div class="pitem-inf">
                <h5>${q.title}</h5>
                <p>${q.type} • ${q.questions.length} Qs${quizAvailability.available ? '' : ` • ${quizAvailability.reason}`}</p>
              </div>
              <i data-lucide="${!isTeacher && !quizAvailability.available ? 'lock' : 'chevron-right'}" class="pitem-arr"></i>
            </div>
          `;
        });
        partGames.forEach(g => {
          const gameLockedNow = isItemLockedNow(g);
          itemsListHtml += `
            <div class="pitem" onclick="${isTeacher ? `openGameModal('${p.id}', '${g.id}')` : (gameLockedNow ? '' : `openGamePreview('${g.id}')`)}">
              <div class="pitem-ico" style="background:rgba(122,162,247,0.16);">🎮</div>
              <div class="pitem-inf">
                <h5>${g.title}</h5>
                <p>${g.typeLabel}${gameLockedNow ? ` • ${getLockStatusLabel(g)}` : ''}</p>
              </div>
              <i data-lucide="${gameLockedNow && !isTeacher ? 'lock' : 'chevron-right'}" class="pitem-arr"></i>
            </div>
          `;
        });
        
        if (partQuizzes.length === 0 && partComics.length === 0 && partGames.length === 0) {
          itemsListHtml = '<div style="font-size:0.8rem;color:var(--txt3);padding:10px 0;text-align:center;">This part does not have any materials yet.</div>';
        }
      } else {
        itemsListHtml = `
          <div class="pitem" style="opacity: 0.6; cursor:not-allowed;">
            <div class="pitem-ico">🔒</div>
            <div class="pitem-inf">
              <h5>Part is Locked</h5>
              <p>${getItemLockNotice(p, 'Wait for teacher to unlock')}</p>
            </div>
          </div>
        `;
      }
      
      const partThemeClass = `p${(idx % 3) + 1}`;
      
      if (isTeacher) {
        return `
          <div class="pcard" style="${isSinglePart ? 'grid-column:1/-1;display:flex;flex-direction:row;gap:24px;' : ''}">
            <div class="ph ${partThemeClass}" style="${isSinglePart ? 'flex:0 0 300px;' : ''}">
              <div>
                <div class="ptitle ${partThemeClass}">${getPartOrdinalLabel(idx)}</div>
                <div class="psub">${p.title}</div>
              </div>
              <div class="lock-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <span class="lock-lbl">${getLockStatusLabel(p)}</span>
                <button class="choice-delete-btn" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:transparent;transition:all 0.3s ease;cursor:pointer;border:none;" onclick="togglePartLock('${p.id}')">
                  <i data-lucide="${partLockedNow ? 'lock' : 'unlock'}" style="width:24px;height:24px;color:${partLockedNow ? 'var(--coral)' : 'var(--leaf)'};"></i>
                </button>
              </div>
            </div>
            <div class="pbody" style="${isSinglePart ? 'flex:1;display:flex;flex-direction:column;' : ''}">
              <p style="font-size:0.82rem;color:var(--txt2);margin-bottom:12px;">${p.description || 'No description.'}</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <span class="part-chip">${partComics.length} comic${partComics.length !== 1 ? 's' : ''}</span>
                <span class="part-chip">${partQuizzes.length} quiz${partQuizzes.length !== 1 ? 'zes' : ''}</span>
                <span class="part-chip">${partGames.length} game${partGames.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="pitems" style="${isSinglePart ? 'flex:1;' : ''}">${itemsListHtml}</div>
              <div class="part-card-actions" style="margin-top:12px;display:flex;gap:8px;align-items:center;">
                <button class="btn btn-g btn-sm" onclick="openPartWorkspace('${p.id}')">
                  <i data-lucide="folder-open"></i> Open Part
                </button>
                <button class="btn btn-ghost btn-sm" 
                        style="width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;"
                        onclick="openPartModal('${p.id}')"
                        onmouseover="this.style.background='rgba(168,199,250,0.3)';this.querySelector('i').style.transform='scale(1.2)';this.querySelector('i').style.transition='transform 0.2s ease';"
                        onmouseout="this.style.background='transparent';this.querySelector('i').style.transform='scale(1)';">
                  <i data-lucide="pencil" style="width:18px;height:18px;"></i>
                </button>
                <button class="btn btn-ghost btn-sm" 
                        style="color:var(--coral);width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;" 
                        onclick="deletePart('${p.id}')"
                        onmouseover="this.style.background='rgba(255,200,200,0.5)';this.querySelector('i').style.transform='scale(1.2)';this.querySelector('i').style.transition='transform 0.2s ease';"
                        onmouseout="this.style.background='transparent';this.querySelector('i').style.transform='scale(1)';">
                  <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="pcard" style="${partLockedNow ? 'opacity: 0.8;' : ''} ${isSinglePart ? 'grid-column:1/-1;display:flex;flex-direction:row;gap:24px;' : ''}">
            <div class="ph ${partThemeClass}" style="${isSinglePart ? 'flex:0 0 300px;' : ''}">
              <div>
                <div class="ptitle ${partThemeClass}">${getPartOrdinalLabel(idx)}</div>
                <div class="psub">${p.title}</div>
              </div>
              <span>${partLockedNow ? '🔒' : '🔓'}</span>
            </div>
            <div class="pbody" style="${isSinglePart ? 'flex:1;' : ''}">
              <p style="font-size:0.82rem;color:var(--txt2);margin-bottom:12px;">${p.description || 'No description.'}</p>
              <div class="pitems">${itemsListHtml}</div>
            </div>
          </div>
        `;
      }
    }).join('');
  };
  
  if (currentUser) {
    if (currentUser.role === 'teacher' && tGrid) {
      tGrid.innerHTML = renderPartCardsHtml(true);
    } else if (currentUser.role === 'student' && sGrid) {
      sGrid.innerHTML = renderPartCardsHtml(false);
    }
  }
  refreshLucide();
};

// ═══ GAMES MANAGEMENT ═══

const initGameTypeCardFocus = () => {
  const modal = document.getElementById('gameTypeModal');
  if (!modal) return;
  const cards = Array.from(modal.querySelectorAll('.role-card'));
  if (!cards.length) return;
  if (modal.dataset.cardsInit === '1') {
    cards.forEach(c => c.setAttribute('tabindex','0'));
    return;
  }
  modal.dataset.cardsInit = '1';
  cards.forEach(card => {
    card.setAttribute('tabindex', '0');
    const onClick = (e) => {
      cards.forEach(c => c.classList.remove('selected'));
      const target = e.currentTarget || e.target.closest('.role-card');
      if (target) target.classList.add('selected');
    };
    card.addEventListener('click', onClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick({ currentTarget: card }); }
    });
  });
};

const closeGameTypeModal = () => {
  closeModal('gameTypeModal');
  pendingGamePartId = null;
};

const selectGameType = (type) => {
  selectedGameType = type;
  closeGameTypeModal();
  
  // Now open the actual game modal with the selected type
  openGameModalWithType(selectedGameType, pendingGamePartId);
};

const closeGameModal = () => {
  gameModalEditId = null;
  selectedGameType = null;
  closeModal('gameModal');
};

const onGameTypeChange = () => {
  const type = selectedGameType || document.getElementById('gm-type')?.value || 'jigsaw';
  const sections = {
    jigsaw: document.getElementById('gm-jigsaw-settings'),
    'word-search': document.getElementById('gm-word-search-settings'),
    cryptogram: document.getElementById('gm-cryptogram-settings')
  };
  Object.entries(sections).forEach(([key, element]) => {
    if (!element) return;
    element.classList.toggle('hidden', key !== type);
  });
};

const readGameImage = (input) => {
  const file = input.files?.[0];
  if (!file) return;
  const level = input.dataset && input.dataset.level ? input.dataset.level : null;
  const reader = new FileReader();
  reader.onload = (event) => {
    const hiddenId = level ? `gm-jigsaw-image-data-${level}` : 'gm-jigsaw-image-data';
    const hidden = document.getElementById(hiddenId);
    if (hidden) hidden.value = event.target.result;
    previewGameImage(event.target.result, level);
    toast('Game image loaded!', 'ok');
  };
  reader.readAsDataURL(file);
};

const previewGameImageUrl = (url, level = null) => {
  if (!url) {
    const previewId = level ? `gm-jigsaw-image-preview-${level}` : 'gm-jigsaw-image-preview';
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.innerHTML = '';
      preview.classList.add('hidden');
    }
    return;
  }
  const hiddenId = level ? `gm-jigsaw-image-data-${level}` : 'gm-jigsaw-image-data';
  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = url;
  previewGameImage(url, level);
};

const previewGameImage = (source, level = null) => {
  const previewId = level ? `gm-jigsaw-image-preview-${level}` : 'gm-jigsaw-image-preview';
  const preview = document.getElementById(previewId);
  if (!preview) return;
  preview.innerHTML = `<img src="${source}" alt="Puzzle preview">`;
  preview.classList.remove('hidden');
};

const getDefaultLevelMeta = (type) => {
  if (type === 'word-search') {
    return { title: '', description: '', gridSize: 10, words: '' };
  }
  if (type === 'cryptogram') {
    return { title: '', description: '', phrase: '', hint: '' };
  }
  return { title: '', description: '', pieces: 9, image: '' };
};

const renderGameLevelSetup = () => {
  const container = document.getElementById('gm-level-setup-container');
  const levelCount = parseInt(document.getElementById('gm-level')?.value || '1', 10);
  const type = selectedGameType || document.getElementById('gm-type')?.value || 'jigsaw';
  if (!container || levelCount < 1) return;
  currentGameLevelMeta = currentGameLevelMeta.slice(0, levelCount);
  while (currentGameLevelMeta.length < levelCount) {
    currentGameLevelMeta.push(getDefaultLevelMeta(type));
  }

  const levelsHtml = currentGameLevelMeta.map((meta, index) => {
    const levelNumber = index + 1;

    if (type === 'word-search') {
      const gridSizeVal = meta.gridSize || 10;
      const wordsVal = meta.words || '';
      return `
        <div style="padding:14px 16px;margin-bottom:12px;border-radius:var(--rsm);background:var(--surf);border:1px solid var(--bdr);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <strong style="font-size:0.98rem;color:var(--txth);">Level ${levelNumber}</strong>
            <span style="font-size:0.82rem;color:var(--txt3);">Word Search settings</span>
          </div>
          <div style="display:grid;gap:12px;">
            <div>
              <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Title</label>
              <input id="gm-level-title-${levelNumber}" class="inp" placeholder="Optional title" value="${escapeHtml(meta.title || '')}">
            </div>
            <div>
              <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Description</label>
              <textarea id="gm-level-desc-${levelNumber}" class="inp" rows="2" placeholder="Optional description">${escapeHtml(meta.description || '')}</textarea>
            </div>
            <div>
              <label class="lbl">Grid Size</label>
              <select id="gm-word-grid-size-${levelNumber}" class="inp" style="height:46px;padding:0 12px;">
                <option value="8" ${gridSizeVal==8 ? 'selected' : ''}>8 x 8</option>
                <option value="10" ${gridSizeVal==10 ? 'selected' : ''}>10 x 10</option>
                <option value="12" ${gridSizeVal==12 ? 'selected' : ''}>12 x 12</option>
                <option value="15" ${gridSizeVal==15 ? 'selected' : ''}>15 x 15</option>
              </select>
            </div>
            <div>
              <label class="lbl">Words to Hide</label>
              <textarea id="gm-word-list-${levelNumber}" class="inp" rows="4" placeholder="Enter one word per line">${escapeHtml(wordsVal)}</textarea>
            </div>
          </div>
        </div>
      `;
    }

    if (type === 'cryptogram') {
      const phraseVal = meta.phrase || '';
      const hintVal = meta.hint || '';
      return `
        <div style="padding:14px 16px;margin-bottom:12px;border-radius:var(--rsm);background:var(--surf);border:1px solid var(--bdr);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
            <strong style="font-size:0.98rem;color:var(--txth);">Level ${levelNumber}</strong>
            <span style="font-size:0.82rem;color:var(--txt3);">Cryptogram settings</span>
          </div>
          <div style="display:grid;gap:12px;">
            <div>
              <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Title</label>
              <input id="gm-level-title-${levelNumber}" class="inp" placeholder="Optional title" value="${escapeHtml(meta.title || '')}">
            </div>
            <div>
              <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Description</label>
              <textarea id="gm-level-desc-${levelNumber}" class="inp" rows="2" placeholder="Optional description">${escapeHtml(meta.description || '')}</textarea>
            </div>
            <div>
              <label class="lbl">Secret Phrase</label>
              <textarea id="gm-crypto-phrase-${levelNumber}" class="inp" rows="3" placeholder="Enter the phrase students should decode">${escapeHtml(phraseVal)}</textarea>
            </div>
            <div>
              <label class="lbl">Hint</label>
              <input id="gm-crypto-hint-${levelNumber}" class="inp" placeholder="Optional hint" value="${escapeHtml(hintVal)}">
            </div>
          </div>
        </div>
      `;
    }

    const piecesVal = meta.pieces || 9;
    const imageVal = meta.image || '';
    return `
      <div style="padding:14px 16px;margin-bottom:12px;border-radius:var(--rsm);background:var(--surf);border:1px solid var(--bdr);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <strong style="font-size:0.98rem;color:var(--txth);">Level ${levelNumber}</strong>
          <span style="font-size:0.82rem;color:var(--txt3);">Jigsaw settings</span>
        </div>
        <div style="display:grid;gap:12px;">
          <div>
            <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Title</label>
            <input id="gm-level-title-${levelNumber}" class="inp" placeholder="Optional title" value="${escapeHtml(meta.title || '')}">
          </div>
          <div>
            <label class="lbl" style="margin-bottom:6px;display:block;">Level ${levelNumber} Description</label>
            <textarea id="gm-level-desc-${levelNumber}" class="inp" rows="2" placeholder="Optional description">${escapeHtml(meta.description || '')}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
            <div>
              <label class="lbl">Puzzle Pieces</label>
              <select id="gm-jigsaw-pieces-${levelNumber}" class="inp" style="height:46px;padding:0 12px;">
                <option value="9" ${piecesVal==9 ? 'selected' : ''}>9 Pieces</option>
                <option value="16" ${piecesVal==16 ? 'selected' : ''}>16 Pieces</option>
                <option value="25" ${piecesVal==25 ? 'selected' : ''}>25 Pieces</option>
                <option value="36" ${piecesVal==36 ? 'selected' : ''}>36 Pieces</option>
              </select>
            </div>
            <div>
              <label class="lbl">Puzzle Image</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <label class="btn btn-ghost btn-sm" style="justify-content:flex-start; gap:10px; cursor:pointer;">
                  <span>Choose</span>
                  <input type="file" data-level="${levelNumber}" id="gm-jigsaw-file-${levelNumber}" accept="image/*" onchange="readGameImage(this)" style="display:none;">
                </label>
                <input class="inp" id="gm-jigsaw-image-url-${levelNumber}" placeholder="Or paste image URL" oninput="previewGameImageUrl(this.value, ${levelNumber})">
              </div>
              <div id="gm-jigsaw-image-preview-${levelNumber}" class="game-image-preview ${imageVal ? '' : 'hidden'}" style="margin-top:8px;">${imageVal ? `<img src="${escapeAttr(imageVal)}" alt="Preview">` : ''}</div>
              <input type="hidden" id="gm-jigsaw-image-data-${levelNumber}" value="${escapeAttr(imageVal)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px;">
      <div style="font-weight:700;color:var(--txth);">Level Setup</div>
      <div style="font-size:0.86rem;color:var(--txt3);">${levelCount} Level${levelCount > 1 ? 's' : ''}</div>
    </div>
    ${levelsHtml}
  `;
  container.classList.remove('hidden');
};

const openGameModal = (selectedPartId = null, gameId = null) => {
  // If editing an existing game, skip the type selection and open directly
  if (gameId) {
    openGameModalWithType(null, selectedPartId, gameId);
    return;
  }
  
  // For new games, open the type selection modal first
  const parts = getStoredParts();
  if (parts.length === 0) {
    toast('Please create at least one Part first!', 'warn');
    return;
  }
  
  pendingGamePartId = selectedPartId;
  openModal('gameTypeModal');
  refreshLucide();
};

const openGameModalWithType = (type, selectedPartId = null, gameId = null) => {
  const parts = getStoredParts();
  const partSelect = document.getElementById('gm-part');
  const titleEl = document.getElementById('gameModalTitle');
  const saveEl = document.getElementById('gameModalSaveBtn');
  if (!partSelect) return;

  if (parts.length === 0) {
    toast('Please create at least one Part first!', 'warn');
    return;
  }

  partSelect.innerHTML = parts.map((part, idx) => `<option value="${part.id}">${getPartOrdinalLabel(idx)} — ${part.title}</option>`).join('');
  gameModalEditId = gameId;

  if (gameId) {
    const game = getStoredGames().find(item => item.id === gameId);
    if (!game) {
      toast('Game not found', 'warn');
      return;
    }
    document.getElementById('gm-title').value = game.title || '';
    document.getElementById('gm-desc').value = game.description || '';
    // Note: We removed the gm-type select since we use the type modal now, but keep for compatibility
    const typeSelect = document.getElementById('gm-type');
    if (typeSelect) {
      typeSelect.value = game.type || 'jigsaw';
    }
    selectedGameType = game.type;
    document.getElementById('gm-part').value = game.partId || selectedPartId || parts[0].id;
    document.getElementById('gm-lock-toggle').checked = !!game.locked && !hasAutoUnlocked(game);
    document.getElementById('gm-unlock-at').value = game.unlockAt || '';
    const savedLevels = game.settings?.levels || game.settings?.level || (game.settings?.levelDetails?.length || 1);
    document.getElementById('gm-level').value = String(savedLevels);
    document.getElementById('gm-duration').value = String(game.settings?.duration || 0);
    if (Array.isArray(game.settings?.levelDetails)) {
      currentGameLevelMeta = game.settings.levelDetails.slice();
    } else if (selectedGameType === 'word-search') {
      currentGameLevelMeta = Array.from({ length: savedLevels }, () => ({ title: '', description: '', gridSize: game.settings?.gridSize || 10, words: (game.settings?.words || []).join('\n') }));
    } else if (selectedGameType === 'cryptogram') {
      currentGameLevelMeta = Array.from({ length: savedLevels }, () => ({ title: '', description: '', phrase: game.settings?.phrase || '', hint: game.settings?.hint || '' }));
    } else {
      const savedPieces = game.settings?.pieces;
      const savedImage = game.settings?.image;
      currentGameLevelMeta = Array.from({ length: savedLevels }, () => ({ title: '', description: '', pieces: savedPieces || 9, image: savedImage || '' }));
    }
    // Per-level fields (word list / phrase / hints) are handled in levelDetails now.
    if (titleEl) titleEl.textContent = 'Edit Game';
    if (saveEl) saveEl.textContent = 'Update Game';
  } else {
    document.getElementById('gm-title').value = '';
    document.getElementById('gm-desc').value = '';
    selectedGameType = type;
    // Keep for compatibility
    const typeSelect = document.getElementById('gm-type');
    if (typeSelect) {
      typeSelect.value = type || 'jigsaw';
    }
    document.getElementById('gm-part').value = selectedPartId || parts[0].id;
    document.getElementById('gm-lock-toggle').checked = false;
    document.getElementById('gm-unlock-at').value = '';
    document.getElementById('gm-level').value = '1';
    document.getElementById('gm-duration').value = '0';
    // No global per-type defaults needed; levels will provide their own fields.
    currentGameLevelMeta = [];
    if (titleEl) titleEl.textContent = 'Create Game';
    if (saveEl) saveEl.textContent = 'Save Game';
  }
  renderGameLevelSetup();

  // Show the appropriate settings based on selectedGameType
  const sections = {
    jigsaw: document.getElementById('gm-jigsaw-settings'),
    'word-search': document.getElementById('gm-word-search-settings'),
    cryptogram: document.getElementById('gm-cryptogram-settings')
  };
  Object.entries(sections).forEach(([key, element]) => {
    if (!element) return;
    element.classList.toggle('hidden', key !== selectedGameType);
  });
  
  openModal('gameModal');
  refreshLucide();
};

const saveGame = () => {
  const title = document.getElementById('gm-title')?.value?.trim();
  const description = document.getElementById('gm-desc')?.value?.trim();
  const type = selectedGameType || document.getElementById('gm-type')?.value || 'jigsaw';
  const partId = document.getElementById('gm-part')?.value;
  const locked = !!document.getElementById('gm-lock-toggle')?.checked;
  const unlockAt = document.getElementById('gm-unlock-at')?.value || '';

  if (!title) {
    toast('Please enter a game title', 'warn');
    return;
  }

  let settings = {};
  let typeLabel = 'Game';
  const levels = parseInt(document.getElementById('gm-level')?.value || '1', 10);
  const duration = parseInt(document.getElementById('gm-duration')?.value || '0', 10);
  const levelDetails = Array.from({ length: levels }, (_, index) => {
    const n = index + 1;
    const title = document.getElementById(`gm-level-title-${n}`)?.value?.trim() || '';
    const description = document.getElementById(`gm-level-desc-${n}`)?.value?.trim() || '';

    if (type === 'word-search') {
      const gridSize = parseInt(document.getElementById(`gm-word-grid-size-${n}`)?.value || '10', 10);
      const words = (document.getElementById(`gm-word-list-${n}`)?.value || '')
        .split(/\n|,/)
        .map(word => word.trim().toUpperCase())
        .filter(Boolean);
      return { title, description, gridSize, words };
    }

    if (type === 'cryptogram') {
      const phrase = document.getElementById(`gm-crypto-phrase-${n}`)?.value?.trim() || '';
      const hint = document.getElementById(`gm-crypto-hint-${n}`)?.value?.trim() || '';
      return { title, description, phrase, hint };
    }

    const pieces = parseInt(document.getElementById(`gm-jigsaw-pieces-${n}`)?.value || '9', 10);
    const image = document.getElementById(`gm-jigsaw-image-data-${n}`)?.value || document.getElementById(`gm-jigsaw-image-url-${n}`)?.value?.trim() || '';
    return { title, description, pieces, image };
  });

  if (type === 'jigsaw') {
    const missing = levelDetails.findIndex(ld => !ld.image);
    if (missing !== -1) {
      toast(`Please add a puzzle image for Level ${missing + 1}`, 'warn');
      return;
    }
    settings = { levels, duration, levelDetails };
    typeLabel = 'Jigsaw Puzzle';
  } else if (type === 'word-search') {
    const invalid = levelDetails.findIndex(ld => (ld.words || []).length < 3);
    if (invalid !== -1) {
      toast(`Word Search needs at least 3 words for Level ${invalid + 1}`, 'warn');
      return;
    }
    const firstLevel = levelDetails[0] || {};
    settings = { gridSize: firstLevel.gridSize || 10, words: firstLevel.words || [], levels, duration, levelDetails };
    typeLabel = 'Word Search';
  } else {
    const empty = levelDetails.findIndex(ld => !ld.phrase);
    if (empty !== -1) {
      toast(`Please enter the secret phrase for Level ${empty + 1}`, 'warn');
      return;
    }
    const firstLevel = levelDetails[0] || {};
    settings = { phrase: firstLevel.phrase || '', hint: firstLevel.hint || '', levels, duration, levelDetails };
    typeLabel = 'Cryptogram';
  }

  const games = getStoredGames();
  if (gameModalEditId) {
    const gameIndex = games.findIndex(game => game.id === gameModalEditId);
    if (gameIndex === -1) {
      toast('Game not found', 'warn');
      return;
    }
    games[gameIndex] = {
      ...games[gameIndex],
      title,
      description,
      type,
      typeLabel,
      partId,
      teacherId: games[gameIndex].teacherId || currentUser?.id,
      locked,
      unlockAt,
      settings
    };
  } else {
    games.push({
      id: `game_${Date.now()}`,
      title,
      description,
      type,
      typeLabel,
      partId,
      teacherId: currentUser?.id,
      locked,
      unlockAt,
      settings,
      createdAt: Date.now()
    });
  }

  LS.set('games', games);
  toast(`Game ${gameModalEditId ? 'updated' : 'saved'} successfully!`, 'ok');
  closeGameModal();
  renderParts();
  renderGames();
  if (activeTeacherPartId) renderTeacherPartDetail();
};

const deleteGame = (gameId) => {
  openConfirmModal('Are you sure you want to delete this game?')
    .then(confirmed => {
      if (!confirmed) return;
      const games = getStoredGames().filter(game => game.id !== gameId);
      LS.set('games', games);
      toast('Game deleted', 'ok');
      renderParts();
      if (activeTeacherPartId) renderTeacherPartDetail();
    });
};

const openGamePreview = (gameId) => {
  // Students shouldn't see preview - go straight to game
  if (currentRole === 'student') {
    loadGamePlayer(gameId);
    return;
  }

  // Only teachers see preview
  const game = getStoredGames().find(item => item.id === gameId);
  if (!game) {
    toast('Game not found', 'warn');
    return;
  }

  const titleEl = document.getElementById('gamePreviewTitle');
  const bodyEl = document.getElementById('gamePreviewBody');
  if (titleEl) titleEl.textContent = game.title;
  if (bodyEl) {
    let settingsHtml = '';
    if (game.type === 'jigsaw') {
      settingsHtml = `
        <div class="game-preview-box">
          <div class="game-preview-meta">Type: ${game.typeLabel}</div>
          <div class="game-preview-meta">Pieces: ${game.settings?.pieces || 9}</div>
          ${game.settings?.image ? `<img src="${game.settings.image}" alt="${game.title}" class="game-preview-image">` : ''}
        </div>
      `;
    } else if (game.type === 'word-search') {
      settingsHtml = `
        <div class="game-preview-box">
          <div class="game-preview-meta">Type: ${game.typeLabel}</div>
          <div class="game-preview-meta">Grid Size: ${game.settings?.gridSize || 10} x ${game.settings?.gridSize || 10}</div>
          <div class="game-preview-word-list">${(game.settings?.words || []).map(word => `<span class="part-chip">${word}</span>`).join('')}</div>
        </div>
      `;
    } else {
      settingsHtml = `
        <div class="game-preview-box">
          <div class="game-preview-meta">Type: ${game.typeLabel}</div>
          <div class="game-preview-meta">Hint: ${game.settings?.hint || 'No hint provided'}</div>
          <div class="part-empty-note" style="text-align:left;">Secret phrase is configured and ready for students to decode.</div>
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <p style="margin-bottom:12px;">${game.description || 'No description provided.'}</p>
      <p style="font-size:0.82rem;color:var(--txt3);margin-bottom:12px;">${getPartDisplayLabel(game.partId)} • ${getLockStatusLabel(game)}</p>
      ${settingsHtml}
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-g" onclick="startGamePlay('${gameId}')">
          <i data-lucide="play"></i> Play Game
        </button>
        <button class="btn btn-ghost" onclick="closeModal('gamePreviewModal')">
          Close
        </button>
      </div>
    `;
    refreshLucide();
  }
  openModal('gamePreviewModal');
};

const startGamePlay = (gameId) => {
  const game = getStoredGames().find(item => item.id === gameId);
  if (!game) {
    toast('Game not found', 'warn');
    return;
  }
  closeModal('gamePreviewModal');
  loadGamePlayer(gameId);
};

// ═══ GAME PLAYER ═══

let currentGameData = null;
let currentGameLevelIndex = 0;
let gameStartTime = null;
let gamePausedTime = 0; // Total time accumulated when paused
let gameTimerInterval = null;
let gameMaxDuration = 0; // Duration in minutes set by teacher

const loadGamePlayer = (gameId) => {
  const game = getStoredGames().find(item => item.id === gameId);
  if (!game) {
    toast('Game not found', 'warn');
    return;
  }

  // Check if student has already completed this game and time expired
  const gameAttempts = LS.get('game_attempts') || [];
  const studentAttempt = gameAttempts.find(a => a.gameId === gameId && a.studentId === currentUser.id);
  
  if (studentAttempt && studentAttempt.timeExpired && !studentAttempt.approvedForRetry) {
    toast('Game time expired. Ask your teacher to approve a retry.', 'warn');
    return;
  }

  currentGameData = { ...game, gameId: gameId };
  currentGameLevelIndex = 0;
  gameMaxDuration = (game.settings?.duration || 0) * 60; // Convert minutes to seconds
  
  // If resuming existing session, restore paused time
  if (studentAttempt && studentAttempt.timeUsedSeconds) {
    gamePausedTime = studentAttempt.timeUsedSeconds;
  } else {
    gamePausedTime = 0;
  }
  
  gameStartTime = Date.now();

  // Update title
  const titleEl = document.getElementById('gp-game-title');
  if (titleEl) titleEl.textContent = game.title;

  // Hide all game type containers
  document.getElementById('gp-word-search-container').style.display = 'none';
  document.getElementById('gp-jigsaw-container').style.display = 'none';
  document.getElementById('gp-cryptogram-container').style.display = 'none';
  document.getElementById('gp-tips-section').style.display = 'none';

  // Show time progress bar if there's a time limit
  const progressContainer = document.getElementById('gp-time-progress-container');
  if (progressContainer) {
    progressContainer.style.display = gameMaxDuration > 0 ? 'block' : 'none';
  }

  // Render based on game type
  if (game.type === 'word-search') {
    renderWordSearchGame(game);
    setGameTips('word-search');
    const submitBtn = document.querySelector('.main-content button.btn-g');
    if (submitBtn) submitBtn.style.display = 'none';
  } else if (game.type === 'jigsaw') {
    renderJigsawGame(game);
    setGameTips('jigsaw');
    const submitBtn = document.querySelector('.main-content button.btn-g');
    if (submitBtn) submitBtn.style.display = 'block';
  } else if (game.type === 'cryptogram') {
    renderCryptogramGame(game);
    setGameTips('cryptogram');
    const submitBtn = document.querySelector('.main-content button.btn-g');
    if (submitBtn) submitBtn.style.display = 'block';
  }

  // Start timer
  startGameTimer();

  showScreen('sc-game-player');
  refreshLucide();
};

const startGameTimer = () => {
  // Clear any existing timer
  if (gameTimerInterval) clearInterval(gameTimerInterval);

  gameTimerInterval = setInterval(() => {
    if (!gameStartTime) return;
    
    // Calculate total time elapsed (including previously paused time)
    const currentSessionElapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const totalElapsed = gamePausedTime + currentSessionElapsed;
    
    // Update display timer
    const minutes = Math.floor(totalElapsed / 60);
    const seconds = totalElapsed % 60;
    const timerEl = document.getElementById('gp-timer');
    if (timerEl) {
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Update progress bar if time limit exists
    if (gameMaxDuration > 0) {
      const remaining = Math.max(0, gameMaxDuration - totalElapsed);
      const progressPercent = (remaining / gameMaxDuration) * 100;
      const progressBar = document.getElementById('gp-time-progress');
      if (progressBar) {
        progressBar.style.width = progressPercent + '%';
        
        // Change color based on time remaining
        if (progressPercent > 50) {
          progressBar.style.background = 'linear-gradient(90deg, var(--leaf), var(--moss))';
        } else if (progressPercent > 20) {
          progressBar.style.background = 'linear-gradient(90deg, #ffd43b, #f59f00)';
        } else {
          progressBar.style.background = 'linear-gradient(90deg, #ff6b6b, #fa5252)';
        }
      }
      
      // Check if time expired
      if (remaining <= 0) {
        clearInterval(gameTimerInterval);
        gameTimeExpired();
      }
    }
  }, 100);
};

const gameTimeExpired = () => {
  // Save game attempt as time expired
  const gameAttempts = LS.get('game_attempts') || [];
  let attempt = gameAttempts.find(a => a.gameId === currentGameData.gameId && a.studentId === currentUser.id);
  
  if (!attempt) {
    attempt = {
      gameId: currentGameData.gameId,
      studentId: currentUser.id,
      gameType: currentGameData.type,
      startedAt: new Date().toISOString(),
      timeUsedSeconds: gamePausedTime + Math.floor((Date.now() - gameStartTime) / 1000),
      timeExpired: true,
      approvedForRetry: false,
      completed: false
    };
  } else {
    attempt.timeUsedSeconds = gamePausedTime + Math.floor((Date.now() - gameStartTime) / 1000);
    attempt.timeExpired = true;
    attempt.completed = false;
  }
  
  gameAttempts.push(attempt);
  LS.set('game_attempts', gameAttempts);
  
  // Show time expired modal
  showModal('gp-time-expired-modal');
};

const toggleGameTips = () => {
  const tipsSection = document.getElementById('gp-tips-section');
  if (!tipsSection) return;
  
  if (tipsSection.style.display === 'none') {
    tipsSection.style.display = 'block';
  } else {
    tipsSection.style.display = 'none';
  }
};

const setGameTips = (gameType) => {
  const tipsContent = document.getElementById('gp-tips-content');
  if (!tipsContent) return;

  let tips = '';
  if (gameType === 'word-search') {
    tips = `
      <div style="display:grid;gap:10px;">
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">1.</div>
          <div><strong>Click and drag</strong> across letters in a STRAIGHT LINE only to select words.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">2.</div>
          <div><strong>Valid straight-line directions:</strong> Horizontal (↔), Vertical (↕), or Diagonal (↗↙↖↘).</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">3.</div>
          <div><strong>Invalid selections turn RED</strong> - selections MUST be in a perfectly straight line!</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">4.</div>
          <div><strong>Found words automatically cross out</strong> in the word list and turn GREEN on the grid.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">5.</div>
          <div>Game <strong>completes automatically</strong> when all words are found!</div>
        </div>
      </div>
    `;
  } else if (gameType === 'jigsaw') {
    tips = `
      <div style="display:grid;gap:10px;">
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">1.</div>
          <div><strong>Arrange the puzzle pieces</strong> to complete the image.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">2.</div>
          <div><strong>Look for edge pieces</strong> (straight sides) and start with corners.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">3.</div>
          <div><strong>Group similar colors</strong> and patterns together.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">4.</div>
          <div>Try to <strong>match neighboring pieces</strong> that fit together.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">5.</div>
          <div>Once complete, click <strong>Submit</strong> to finish!</div>
        </div>
      </div>
    `;
  } else if (gameType === 'cryptogram') {
    tips = `
      <div style="display:grid;gap:10px;">
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">1.</div>
          <div>This is a <strong>substitution cipher</strong> where each letter is replaced by another.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">2.</div>
          <div><strong>Use the hint</strong> to help you figure out the pattern.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">3.</div>
          <div><strong>Look for common words</strong> and letter patterns in English.</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">4.</div>
          <div><strong>Single letters</strong> are often "A" or "I" - try those first!</div>
        </div>
        <div style="display:flex;gap:8px;">
          <div style="color:var(--leaf);font-weight:700;min-width:20px;">5.</div>
          <div>Decode the message and click <strong>Submit</strong> to verify!</div>
        </div>
      </div>
    `;
  }

  tipsContent.innerHTML = tips;
};

const generateWordSearchGrid = (words, gridSize) => {
  // Initialize empty grid
  const grid = Array(gridSize * gridSize).fill('');
  
  // Directions: H, V, D1, D2 (horizontal, vertical, diagonal-down-right, diagonal-up-right)
  const directions = [
    [0, 1],   // Horizontal right
    [1, 0],   // Vertical down
    [1, 1],   // Diagonal down-right
    [-1, 1],  // Diagonal up-right
    [0, -1],  // Horizontal left
    [-1, 0],  // Vertical up
    [-1, -1], // Diagonal up-left
    [1, -1]   // Diagonal down-left
  ];

  // Place each word
  words.forEach(word => {
    word = word.toUpperCase();
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);
      const dirIdx = Math.floor(Math.random() * directions.length);
      const [dirRow, dirCol] = directions[dirIdx];
      
      // Check if word fits in this position
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const row = startRow + (dirRow * i);
        const col = startCol + (dirCol * i);
        
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
          canPlace = false;
          break;
        }
        
        const idx = row * gridSize + col;
        if (grid[idx] && grid[idx] !== word[i]) {
          canPlace = false;
          break;
        }
      }
      
      // Place word if it fits
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const row = startRow + (dirRow * i);
          const col = startCol + (dirCol * i);
          const idx = row * gridSize + col;
          grid[idx] = word[i];
        }
        placed = true;
      }
      
      attempts++;
    }
  });
  
  // Fill empty cells with random letters
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) {
      grid[i] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
  }
  
  return grid;
};

const renderWordSearchGame = (game) => {
  const container = document.getElementById('gp-word-search-container');
  if (!container) return;

  // Get current level (assuming single level for now)
  const levels = game.levels || [];
  const currentLevel = levels[currentGameLevelIndex] || { title: game.title, description: game.description };

  document.getElementById('gp-ws-title').textContent = currentLevel.title || game.title;
  document.getElementById('gp-ws-description').textContent = currentLevel.description || 'Find all the hidden words in the grid.';

  // Create word search grid
  const gridSize = game.settings?.gridSize || 10;
  const words = game.settings?.words || [];
  const gridContainer = document.getElementById('gp-ws-grid');
  
  if (!gridContainer) return;
  gridContainer.innerHTML = '';
  gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

  // Generate word search grid with teacher's words
  const grid = generateWordSearchGrid(words, gridSize);

  // Store grid data for validation
  currentGameData.gridSize = gridSize;
  currentGameData.grid = grid;
  currentGameData.words = words;
  currentGameData.foundWords = new Set();
  currentGameData.selectedCells = [];

  // Create a grid UI from generated grid
  for (let i = 0; i < grid.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'ws-cell';
    cell.textContent = grid[i];
    cell.dataset.index = i;
    cell.onmousedown = () => startCellSelection(i);
    cell.onmouseover = () => continueCellSelection(i);
    cell.onmouseup = () => endCellSelection();
    gridContainer.appendChild(cell);
  }

  // Display words to find
  const wordsList = document.getElementById('gp-ws-words');
  if (wordsList) {
    wordsList.innerHTML = words.map((word, idx) => 
      `<span class="part-chip" data-word-idx="${idx}" data-word="${word.toUpperCase()}" style="transition:all 0.3s ease;">${word}</span>`
    ).join('');
  }

  container.style.display = 'block';
};

let wsSelectionActive = false;
let wsStartIndex = null;

const startCellSelection = (index) => {
  wsSelectionActive = true;
  wsStartIndex = index;
  currentGameData.selectedCells = [index];
  highlightSelectedCells();
};

const continueCellSelection = (index) => {
  if (!wsSelectionActive || wsStartIndex === null) return;
  
  // Check if this selection forms a valid straight line
  if (currentGameData.selectedCells.length === 0) {
    currentGameData.selectedCells = [index];
  } else {
    const isValidLine = isValidStraightLine(wsStartIndex, index);
    if (isValidLine) {
      const path = getPathBetweenCells(wsStartIndex, index);
      currentGameData.selectedCells = path;
    }
  }
  
  highlightSelectedCells();
};

const endCellSelection = () => {
  wsSelectionActive = false;
  
  if (currentGameData.selectedCells.length > 0) {
    // Check if selection forms a valid word
    const selectedWord = currentGameData.selectedCells
      .map(idx => document.querySelector(`[data-index="${idx}"]`).textContent)
      .join('')
      .toUpperCase();
    
    const reversedWord = selectedWord.split('').reverse().join('');
    const foundWord = currentGameData.words.find(w => 
      w.toUpperCase() === selectedWord || w.toUpperCase() === reversedWord
    );
    
    if (foundWord && !currentGameData.foundWords.has(foundWord.toUpperCase())) {
      // Valid word found!
      currentGameData.foundWords.add(foundWord.toUpperCase());
      markCellsAsFound(currentGameData.selectedCells);
      crossOutWord(foundWord);
      
      // Check if all words found
      if (currentGameData.foundWords.size === currentGameData.words.length) {
        setTimeout(() => {
          completeWordSearch();
        }, 500);
      }
    } else if (foundWord && currentGameData.foundWords.has(foundWord.toUpperCase())) {
      // Already found this word
      showInvalidSelection();
    } else {
      // Invalid selection - show red temporarily
      showInvalidSelection();
    }
  }
  
  currentGameData.selectedCells = [];
  setTimeout(() => {
    highlightSelectedCells();
  }, 300);
};

const isValidStraightLine = (startIdx, endIdx) => {
  const gridSize = currentGameData.gridSize;
  const startRow = Math.floor(startIdx / gridSize);
  const startCol = startIdx % gridSize;
  const endRow = Math.floor(endIdx / gridSize);
  const endCol = endIdx % gridSize;
  
  const rowDiff = endRow - startRow;
  const colDiff = endCol - startCol;
  
  // Check if horizontal
  if (rowDiff === 0) return true;
  // Check if vertical
  if (colDiff === 0) return true;
  // Check if diagonal (must have equal row and col diff)
  if (Math.abs(rowDiff) === Math.abs(colDiff)) return true;
  
  return false;
};

const getPathBetweenCells = (startIdx, endIdx) => {
  const gridSize = currentGameData.gridSize;
  const path = [];
  const startRow = Math.floor(startIdx / gridSize);
  const startCol = startIdx % gridSize;
  const endRow = Math.floor(endIdx / gridSize);
  const endCol = endIdx % gridSize;
  
  const rowDiff = endRow - startRow;
  const colDiff = endCol - startCol;
  
  const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
  const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
  const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
  
  for (let i = 0; i <= steps; i++) {
    const row = startRow + rowStep * i;
    const col = startCol + colStep * i;
    path.push(row * gridSize + col);
  }
  
  return path;
};

const highlightSelectedCells = () => {
  const gridContainer = document.getElementById('gp-ws-grid');
  if (!gridContainer) return;
  
  const cells = gridContainer.querySelectorAll('.ws-cell');
  cells.forEach(cell => {
    cell.classList.remove('selected', 'invalid');
  });
  
  currentGameData.selectedCells.forEach(idx => {
    const cell = document.querySelector(`[data-index="${idx}"]`);
    if (cell) cell.classList.add('selected');
  });
};

const showInvalidSelection = () => {
  const gridContainer = document.getElementById('gp-ws-grid');
  if (!gridContainer) return;
  
  const cells = gridContainer.querySelectorAll('.ws-cell');
  cells.forEach(cell => {
    cell.classList.add('invalid');
  });
  
  setTimeout(() => {
    cells.forEach(cell => {
      cell.classList.remove('invalid');
    });
  }, 500);
};

const markCellsAsFound = (cells) => {
  const gridContainer = document.getElementById('gp-ws-grid');
  if (!gridContainer) return;
  
  cells.forEach(idx => {
    const cell = document.querySelector(`[data-index="${idx}"]`);
    if (cell) {
      cell.classList.add('found');
      cell.style.opacity = '0.5';
    }
  });
};

const crossOutWord = (word) => {
  const wordChip = document.querySelector(`[data-word="${word.toUpperCase()}"]`);
  if (wordChip) {
    wordChip.style.textDecoration = 'line-through';
    wordChip.style.opacity = '0.5';
  }
};

const completeWordSearch = () => {
  // Calculate total elapsed time (including paused time)
  const currentSessionElapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
  const totalElapsed = gamePausedTime + currentSessionElapsed;
  const minutes = Math.floor(totalElapsed / 60);
  const seconds = totalElapsed % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Record game attempt as completed
  const gameAttempts = LS.get('game_attempts') || [];
  let attempt = gameAttempts.find(a => a.gameId === currentGameData.gameId && a.studentId === currentUser.id && !a.completed);
  
  if (!attempt) {
    attempt = {
      gameId: currentGameData.gameId,
      studentId: currentUser.id,
      gameType: 'word-search',
      startedAt: new Date().toISOString()
    };
    gameAttempts.push(attempt);
  }
  
  attempt.completedAt = new Date().toISOString();
  attempt.timeUsedSeconds = totalElapsed;
  attempt.completed = true;
  attempt.timeExpired = false;
  
  LS.set('game_attempts', gameAttempts);

  toast(`🎉 All words found! Time: ${timeString}`, 'ok');
  setTimeout(() => {
    exitGamePlayer();
  }, 2000);
};

let cryptogramState = {
  originalPhrase: '',
  cipherKey: {},
  reverseKey: {},
  userMap: {},
  selectedLetter: null,
  hintsGiven: 0,
  numberMap: {}
};

let jigsawState = {
  pieces: [],
  boardSlots: [],
  currentPiece: null,
  piecesPlaced: 0,
  totalPieces: 0
};

const renderJigsawGame = (game) => {
  const container = document.getElementById('gp-jigsaw-container');
  if (!container) return;

  const levels = game.levels || [];
  const currentLevel = levels[currentGameLevelIndex] || { title: game.title, description: game.description };
  const pieces = parseInt(currentLevel.pieces || game.settings?.pieces || '9', 10);
  const imageUrl = currentLevel.image || game.settings?.image || '';

  document.getElementById('gp-jigsaw-title').textContent = currentLevel.title || game.title;
  document.getElementById('gp-jigsaw-description').textContent = currentLevel.description || 'Complete this puzzle to continue.';
  
  const referenceImg = document.getElementById('gp-jigsaw-reference');
  if (referenceImg) {
    referenceImg.src = imageUrl;
  }

  if (!imageUrl) {
    toast('No puzzle image available', 'warn');
    return;
  }

  initJigsawGame(imageUrl, pieces);
  container.style.display = 'block';
};

const initJigsawGame = (imageUrl, numPieces) => {
  jigsawState = {
    pieces: [],
    boardSlots: [],
    currentPiece: null,
    piecesPlaced: 0,
    totalPieces: numPieces
  };

  const piecesContainer = document.getElementById('gp-jigsaw-pieces');
  const boardContainer = document.getElementById('gp-jigsaw-board');
  
  piecesContainer.innerHTML = '';
  boardContainer.innerHTML = '';

  const rows = Math.ceil(Math.sqrt(numPieces));
  const cols = Math.ceil(numPieces / rows);
  
  const pieceSize = 60;
  boardContainer.style.width = `${cols * pieceSize}px`;
  boardContainer.style.height = `${rows * pieceSize}px`;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    for (let i = 0; i < numPieces; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const pieceCanvas = document.createElement('canvas');
      pieceCanvas.width = pieceSize;
      pieceCanvas.height = pieceSize;
      const ctx = pieceCanvas.getContext('2d');
      
      const srcWidth = img.width / cols;
      const srcHeight = img.height / rows;
      ctx.drawImage(
        img,
        col * srcWidth, row * srcHeight, srcWidth, srcHeight,
        0, 0, pieceSize, pieceSize
      );
      
      const pieceId = `piece-${i}`;
      const slotId = `slot-${i}`;
      
      const piece = document.createElement('div');
      piece.className = 'jigsaw-piece';
      piece.id = pieceId;
      piece.dataset.pieceIndex = i;
      piece.draggable = true;
      piece.style.width = `${pieceSize}px`;
      piece.style.height = `${pieceSize}px`;
      piece.style.backgroundImage = `url(${pieceCanvas.toDataURL()})`;
      piece.style.backgroundSize = 'cover';
      piece.style.border = '2px solid var(--bdr)';
      piece.style.borderRadius = '4px';
      piece.style.cursor = 'grab';
      piece.style.transition = 'transform 0.2s, box-shadow 0.2s';
      
      piece.addEventListener('dragstart', handleJigsawDragStart);
      piece.addEventListener('dragend', handleJigsawDragEnd);
      piece.addEventListener('touchstart', handleJigsawTouchStart, { passive: false });
      piece.addEventListener('touchmove', handleJigsawTouchMove, { passive: false });
      piece.addEventListener('touchend', handleJigsawTouchEnd);
      
      piecesContainer.appendChild(piece);
      jigsawState.pieces.push({ element: piece, index: i, placed: false });
      
      const slot = document.createElement('div');
      slot.className = 'jigsaw-slot';
      slot.id = slotId;
      slot.dataset.slotIndex = i;
      slot.style.position = 'absolute';
      slot.style.left = `${col * pieceSize}px`;
      slot.style.top = `${row * pieceSize}px`;
      slot.style.width = `${pieceSize}px`;
      slot.style.height = `${pieceSize}px`;
      slot.style.border = '1px dashed var(--bdr)';
      slot.style.background = 'rgba(0,0,0,0.05)';
      
      slot.addEventListener('dragover', handleJigsawDragOver);
      slot.addEventListener('drop', handleJigsawDrop);
      
      boardContainer.appendChild(slot);
      jigsawState.boardSlots.push({ element: slot, index: i, filled: false });
    }
    
    shufflePieces();
  };
  img.src = imageUrl;
};

const shufflePieces = () => {
  const container = document.getElementById('gp-jigsaw-pieces');
  const pieces = Array.from(container.children);
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    container.insertBefore(pieces[j], pieces[i]);
  }
};

const handleJigsawDragStart = (e) => {
  jigsawState.currentPiece = e.target;
  e.target.style.opacity = '0.5';
  e.target.style.transform = 'scale(1.1)';
  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
};

const handleJigsawDragEnd = (e) => {
  e.target.style.opacity = '1';
  e.target.style.transform = 'scale(1)';
  e.target.style.boxShadow = 'none';
};

const handleJigsawDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

const handleJigsawDrop = (e) => {
  e.preventDefault();
  const slot = e.target.closest('.jigsaw-slot');
  if (!slot || !jigsawState.currentPiece) return;

  const pieceIndex = parseInt(jigsawState.currentPiece.dataset.pieceIndex);
  const slotIndex = parseInt(slot.dataset.slotIndex);
  
  if (pieceIndex === slotIndex) {
    placePiece(slot, jigsawState.currentPiece, pieceIndex);
  } else {
    toast('That piece doesn\'t fit here!', 'warn');
  }
};

let touchPiece = null;
let touchStartX = 0;
let touchStartY = 0;

const handleJigsawTouchStart = (e) => {
  e.preventDefault();
  touchPiece = e.target.closest('.jigsaw-piece');
  if (!touchPiece) return;
  
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  
  touchPiece.style.opacity = '0.7';
  touchPiece.style.transform = 'scale(1.1)';
  touchPiece.style.zIndex = '1000';
};

const handleJigsawTouchMove = (e) => {
  if (!touchPiece) return;
  e.preventDefault();
};

const handleJigsawTouchEnd = (e) => {
  if (!touchPiece) return;
  e.preventDefault();
  
  touchPiece.style.opacity = '1';
  touchPiece.style.transform = 'scale(1)';
  touchPiece.style.zIndex = '';
  
  const touch = e.changedTouches[0];
  const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (elementBelow) {
    const slot = elementBelow.closest('.jigsaw-slot');
    if (slot) {
      const pieceIndex = parseInt(touchPiece.dataset.pieceIndex);
      const slotIndex = parseInt(slot.dataset.slotIndex);
      
      if (pieceIndex === slotIndex) {
        placePiece(slot, touchPiece, pieceIndex);
      } else {
        toast('That piece doesn\'t fit here!', 'warn');
      }
    }
  }
  
  touchPiece = null;
};

const placePiece = (slot, piece, index) => {
  slot.innerHTML = '';
  piece.style.position = 'absolute';
  piece.style.left = '0';
  piece.style.top = '0';
  piece.style.opacity = '1';
  piece.style.transform = 'scale(1)';
  piece.draggable = false;
  piece.style.cursor = 'default';
  piece.style.border = 'none';
  slot.appendChild(piece);
  
  jigsawState.pieces[index].placed = true;
  jigsawState.boardSlots[index].filled = true;
  jigsawState.piecesPlaced++;
  
  if (jigsawState.piecesPlaced === jigsawState.totalPieces) {
    setTimeout(() => {
      toast('🎉 Puzzle Complete!', 'ok');
      completeGame();
    }, 500);
  }
};

const renderCryptogramGame = (game) => {
  const container = document.getElementById('gp-cryptogram-container');
  if (!container) return;

  const levels = game.levels || [];
  const currentLevel = levels[currentGameLevelIndex] || { title: game.title, description: game.description };
  const phrase = (currentLevel.phrase || game.settings?.phrase || 'SECRET MESSAGE').toUpperCase();
  const hint = currentLevel.hint || game.settings?.hint || 'No hint provided.';

  document.getElementById('gp-crypto-title').textContent = currentLevel.title || game.title;
  document.getElementById('gp-crypto-description').textContent = currentLevel.description || 'Decode this secret message.';
  document.getElementById('gp-crypto-hint').textContent = hint;

  initCryptogramGame(phrase);
  container.style.display = 'block';
};

const initCryptogramGame = (phrase) => {
  cryptogramState = {
    originalPhrase: phrase,
    cipherKey: {},
    reverseKey: {},
    userMap: {},
    selectedLetter: null,
    hintsGiven: 0,
    numberMap: {}
  };

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const shuffled = [...letters].sort(() => Math.random() - 0.5);
  
  letters.forEach((letter, i) => {
    cryptogramState.cipherKey[letter] = shuffled[i];
    cryptogramState.reverseKey[shuffled[i]] = letter;
    cryptogramState.userMap[shuffled[i]] = '';
  });

  // Assign numbers to each unique cipher character used in the phrase
  const usedCipherChars = new Set();
  phrase.split('').forEach(char => {
    if (/[A-Z]/.test(char)) {
      usedCipherChars.add(cryptogramState.cipherKey[char]);
    }
  });
  let num = 1;
  Array.from(usedCipherChars).sort().forEach(cipherChar => {
    cryptogramState.numberMap[cipherChar] = num++;
  });

  renderCryptogramPhrase();
  renderCryptogramKey();
  updateHintsLeft();
};

const renderCryptogramPhrase = () => {
  const display = document.getElementById('gp-crypto-phrase-display');
  if (!display) return;

  display.innerHTML = '';
  const words = cryptogramState.originalPhrase.split(' ');
  
  words.forEach((word, wordIndex) => {
    const wordDiv = document.createElement('div');
    wordDiv.style.display = 'inline-flex';
    wordDiv.style.gap = '4px';
    wordDiv.style.marginRight = '12px';
    wordDiv.style.marginBottom = '8px';
    
    word.split('').forEach((char, charIndex) => {
      if (!/[A-Z]/.test(char)) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.fontSize = '1.5rem';
        span.style.color = 'var(--txt)';
        wordDiv.appendChild(span);
        return;
      }
      
      const cipherChar = cryptogramState.cipherKey[char];
      const userChar = cryptogramState.userMap[cipherChar];
      const number = cryptogramState.numberMap[cipherChar];
      
      const charDiv = document.createElement('div');
      charDiv.className = 'crypto-char';
      charDiv.style.display = 'flex';
      charDiv.style.flexDirection = 'column';
      charDiv.style.alignItems = 'center';
      charDiv.style.minWidth = '36px';
      
      const cipherSpan = document.createElement('span');
      cipherSpan.textContent = cipherChar;
      cipherSpan.style.fontSize = '0.75rem';
      cipherSpan.style.color = 'var(--txt3)';
      cipherSpan.style.fontWeight = '600';
      
      const numberSpan = document.createElement('span');
      numberSpan.textContent = number;
      numberSpan.style.fontSize = '0.6rem';
      numberSpan.style.color = 'var(--txt2)';
      numberSpan.style.marginTop = '-2px';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.value = userChar;
      input.dataset.cipherChar = cipherChar;
      input.style.width = '36px';
      input.style.height = '36px';
      input.style.textAlign = 'center';
      input.style.fontSize = '1.25rem';
      input.style.fontWeight = '700';
      input.style.textTransform = 'uppercase';
      input.style.border = '2px solid var(--bdr)';
      input.style.borderRadius = '6px';
      input.style.background = 'var(--surf)';
      input.style.color = userChar === char ? 'var(--leaf)' : 'var(--txt)';
      input.style.outline = 'none';
      
      input.addEventListener('input', handleCryptogramInput);
      input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--leaf)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--bdr)';
      });
      
      charDiv.appendChild(cipherSpan);
      charDiv.appendChild(numberSpan);
      charDiv.appendChild(input);
      wordDiv.appendChild(charDiv);
    });
    
    display.appendChild(wordDiv);
  });
};

const renderCryptogramKey = () => {
  const keyContainer = document.getElementById('gp-crypto-key');
  if (!keyContainer) return;
  
  keyContainer.innerHTML = '';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  letters.forEach((cipherChar) => {
    const keyDiv = document.createElement('div');
    keyDiv.className = 'crypto-key-item';
    keyDiv.style.display = 'flex';
    keyDiv.style.flexDirection = 'column';
    keyDiv.style.alignItems = 'center';
    keyDiv.style.padding = '6px';
    keyDiv.style.background = 'var(--surf)';
    keyDiv.style.border = '1px solid var(--bdr)';
    keyDiv.style.borderRadius = '6px';
    keyDiv.style.cursor = 'pointer';
    keyDiv.style.transition = 'all 0.2s';
    
    if (cryptogramState.selectedLetter === cipherChar) {
      keyDiv.style.background = 'var(--leaf)';
      keyDiv.style.borderColor = 'var(--leaf)';
    }
    
    const cipherSpan = document.createElement('span');
    cipherSpan.textContent = cipherChar;
    cipherSpan.style.fontSize = '0.75rem';
    cipherSpan.style.color = cryptogramState.selectedLetter === cipherChar ? 'white' : 'var(--txt3)';
    cipherSpan.style.fontWeight = '600';
    
    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.maxLength = 1;
    userInput.value = cryptogramState.userMap[cipherChar];
    userInput.style.width = '28px';
    userInput.style.height = '28px';
    userInput.style.textAlign = 'center';
    userInput.style.fontSize = '1rem';
    userInput.style.fontWeight = '700';
    userInput.style.textTransform = 'uppercase';
    userInput.style.border = 'none';
    userInput.style.borderRadius = '4px';
    userInput.style.background = 'transparent';
    userInput.style.color = cryptogramState.selectedLetter === cipherChar ? 'white' : 'var(--txt)';
    userInput.style.outline = 'none';
    
    userInput.addEventListener('input', (e) => {
      handleCryptogramKeyInput(cipherChar, e.target.value.toUpperCase());
    });
    
    keyDiv.addEventListener('click', () => {
      cryptogramState.selectedLetter = cipherChar;
      renderCryptogramKey();
    });
    
    keyDiv.appendChild(cipherSpan);
    keyDiv.appendChild(userInput);
    keyContainer.appendChild(keyDiv);
  });
};

const handleCryptogramInput = (e) => {
  const cipherChar = e.target.dataset.cipherChar;
  const value = e.target.value.toUpperCase();
  
  if (value && !/[A-Z]/.test(value)) {
    e.target.value = '';
    return;
  }
  
  handleCryptogramKeyInput(cipherChar, value);
};

const handleCryptogramKeyInput = (cipherChar, value) => {
  const oldValue = cryptogramState.userMap[cipherChar];
  
  Object.keys(cryptogramState.userMap).forEach(key => {
    if (cryptogramState.userMap[key] === value && key !== cipherChar) {
      cryptogramState.userMap[key] = '';
    }
  });
  
  cryptogramState.userMap[cipherChar] = value;
  renderCryptogramPhrase();
  renderCryptogramKey();
  checkCryptogramComplete();
};

const updateHintsLeft = () => {
  const hintsLeftSpan = document.getElementById('gp-crypto-hints-left');
  const hintBtn = document.getElementById('gp-crypto-hint-btn');
  const remaining = 3 - cryptogramState.hintsGiven;
  if (hintsLeftSpan) {
    hintsLeftSpan.textContent = remaining;
  }
  if (hintBtn) {
    hintBtn.disabled = remaining <= 0;
    if (remaining <= 0) {
      hintBtn.style.opacity = '0.5';
      hintBtn.style.cursor = 'not-allowed';
    } else {
      hintBtn.style.opacity = '1';
      hintBtn.style.cursor = 'pointer';
    }
  }
};

const showHint = () => {
  if (cryptogramState.hintsGiven >= 3) {
    toast('No more hints available!', 'warn');
    return;
  }
  
  const missing = [];
  cryptogramState.originalPhrase.split('').forEach(char => {
    if (/[A-Z]/.test(char)) {
      const cipherChar = cryptogramState.cipherKey[char];
      if (!cryptogramState.userMap[cipherChar]) {
        missing.push({ original: char, cipher: cipherChar });
      }
    }
  });
  
  if (missing.length === 0) {
    toast('All letters already solved!', 'info');
    return;
  }
  
  const hint = missing[Math.floor(Math.random() * missing.length)];
  cryptogramState.userMap[hint.cipher] = hint.original;
  cryptogramState.hintsGiven++;
  
  renderCryptogramPhrase();
  renderCryptogramKey();
  updateHintsLeft();
  checkCryptogramComplete();
  toast(`Hint: ${hint.cipher} = ${hint.original}`, 'info');
};

const resetCryptogram = () => {
  Object.keys(cryptogramState.userMap).forEach(key => {
    cryptogramState.userMap[key] = '';
  });
  cryptogramState.selectedLetter = null;
  cryptogramState.hintsGiven = 0;
  renderCryptogramPhrase();
  renderCryptogramKey();
  updateHintsLeft();
};

const checkCryptogramComplete = () => {
  let complete = true;
  let correct = true;
  
  cryptogramState.originalPhrase.split('').forEach(char => {
    if (!/[A-Z]/.test(char)) return;
    
    const cipherChar = cryptogramState.cipherKey[char];
    const userChar = cryptogramState.userMap[cipherChar];
    
    if (!userChar) {
      complete = false;
    } else if (userChar !== char) {
      correct = false;
    }
  });
  
  if (complete && correct) {
    setTimeout(() => {
      toast('🎉 Cryptogram Solved!', 'ok');
      completeGame();
    }, 500);
  }
};

const completeGame = () => {
  const elapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const gameAttempts = LS.get('game_attempts') || [];
  let attempt = gameAttempts.find(a => a.gameId === currentGameData.gameId && a.studentId === currentUser.id && !a.completed);
  
  if (!attempt) {
    attempt = {
      gameId: currentGameData.gameId,
      studentId: currentUser.id,
      gameType: currentGameData.type,
      startedAt: new Date().toISOString()
    };
    gameAttempts.push(attempt);
  }
  
  attempt.completedAt = new Date().toISOString();
  attempt.timeUsedSeconds = elapsed;
  attempt.completed = true;
  LS.set('game_attempts', gameAttempts);

  toast(`Game Complete! Time: ${timeString} 🎉`, 'ok');
  setTimeout(() => {
    exitGamePlayer();
  }, 2000);
};

const submitGameAnswer = () => {
  if (!currentGameData) {
    toast('Game data not found', 'warn');
    return;
  }

  if (currentGameData.type === 'jigsaw') {
    if (jigsawState.piecesPlaced === jigsawState.totalPieces) {
      completeGame();
    } else {
      toast('Complete the puzzle first!', 'warn');
    }
  } else if (currentGameData.type === 'cryptogram') {
    checkCryptogramComplete();
  } else {
    const elapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    toast(`Game submitted! Time: ${timeString} 🎉`, 'ok');
    setTimeout(() => {
      exitGamePlayer();
    }, 1500);
  }
};

const exitGamePlayer = () => {
  // Save game session with paused time
  if (currentGameData && currentGameData.gameId) {
    const gameAttempts = LS.get('game_attempts') || [];
    let attempt = gameAttempts.find(a => a.gameId === currentGameData.gameId && a.studentId === currentUser.id && !a.completed);
    
    if (!attempt) {
      attempt = {
        gameId: currentGameData.gameId,
        studentId: currentUser.id,
        gameType: currentGameData.type,
        startedAt: new Date().toISOString()
      };
      gameAttempts.push(attempt);
    }
    
    // Update accumulated time
    attempt.timeUsedSeconds = gamePausedTime + Math.floor((Date.now() - gameStartTime) / 1000);
    attempt.lastPausedAt = new Date().toISOString();
    
    LS.set('game_attempts', gameAttempts);
  }
  
  currentGameData = null;
  currentGameLevelIndex = 0;
  gameStartTime = null;
  gamePausedTime = 0;
  gameMaxDuration = 0;
  
  // Stop timer
  if (gameTimerInterval) {
    clearInterval(gameTimerInterval);
    gameTimerInterval = null;
  }
  
  // Return to previous screen (likely student dashboard)
  if (currentRole === 'student') {
    showScreen('sc-sdash');
  } else {
    showScreen('sc-tdash');
  }
  refreshLucide();
};

// ═══ COMICS MANAGEMENT ═══

const openComicModal = (selectedPartId = null, comicId = null) => {
  const parts = getStoredParts();
  const cmPartSelect = document.getElementById('cm-part');
  if (!cmPartSelect) return;

  if (parts.length === 0) {
    toast('Please create at least one Part first!', 'warn');
    return;
  }

  cmPartSelect.innerHTML = parts.map((p, idx) => `<option value="${p.id}">${getPartOrdinalLabel(idx)} — ${p.title}</option>`).join('');
  comicModalEditId = comicId || null;

  if (comicModalEditId) {
    // Editing existing comic
    const comics = LS.get('comics') || [];
    const existing = comics.find(c => c.id === comicModalEditId);
    if (!existing) {
      toast('Comic not found', 'warn');
      comicModalEditId = null;
      return;
    }
    if (selectedPartId) cmPartSelect.value = selectedPartId;
    else cmPartSelect.value = existing.partId || parts[0].id;
    document.getElementById('cm-title').value = existing.title || '';
    document.getElementById('cm-desc').value = existing.description || '';
    document.getElementById('cm-lock-toggle').checked = !!existing.locked && !hasAutoUnlocked(existing);
    document.getElementById('cm-unlock-at').value = existing.unlockAt || '';
    const editor = document.getElementById('cm-pages-editor');
    if (editor) {
      editor.innerHTML = '';
      (existing.pages || []).forEach(p => addComicPageEditor(p));
    }
    const modalTitle = document.querySelector('#comicModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Edit Comic';
    const saveBtn = document.getElementById('comicModal')?.querySelector('.btn.btn-g');
    if (saveBtn) saveBtn.textContent = 'Update Comic';
  } else {
    // Creating new comic
    if (selectedPartId) cmPartSelect.value = selectedPartId;
    document.getElementById('cm-title').value = '';
    document.getElementById('cm-desc').value = '';
    document.getElementById('cm-lock-toggle').checked = false;
    document.getElementById('cm-unlock-at').value = '';
    document.getElementById('cm-pages-editor').innerHTML = '';
    addComicPageEditor();
    const modalTitle = document.querySelector('#comicModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Create Comic';
    const saveBtn = document.getElementById('comicModal')?.querySelector('.btn.btn-g');
    if (saveBtn) saveBtn.textContent = 'Publish Comic';
  }

  const modal = document.getElementById('comicModal');
  if (modal) modal.classList.remove('hidden');
};

const addComicPageEditor = (data = null) => {
  const container = document.getElementById('cm-pages-editor');
  if (!container) return;
  const idx = container.children.length;
  
  const card = document.createElement('div');
  card.className = 'comic-page-edit-card';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong style="color:var(--leaf);font-size:0.8rem;">Page #${idx + 1}</strong>
      <button class="choice-delete-btn" type="button" style="width:20px;height:20px;font-size:0.65rem;" onclick="confirmRemoveComicPage(this)"><i data-lucide="trash-2"></i></button>
    </div>
    <div class="comic-page-preview">
      <img class="cm-page-thumb" src="${data?.image || ''}" alt="Panel preview" ${data?.image ? '' : 'style="opacity:0.25;"'} onclick="openComicPageImageFull(this)">
      <div class="preview-meta">
        <input class="inp cm-page-img-name" placeholder="Image title (optional)" value="${data?.imageName || ''}">
        <input class="inp cm-page-url" placeholder="Or enter image URL" value="${data?.image || ''}" oninput="updateComicPageImagePreview(this)" style="margin-top:10px;">
        <input type="hidden" class="cm-page-img-data" value="${data?.image || ''}">
      </div>
    </div>
    <textarea class="inp cm-page-text" placeholder="Page dialogue/caption..." rows="2" style="font-size:0.8rem;padding:8px;border-radius:4px;width:100%;margin-top:8px;">${data?.text || ''}</textarea>
  `;
  container.appendChild(card);
  refreshLucide();
  return card;
};

const handleComicUploadDrag = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cm-upload-zone');
  if (zone) zone.classList.add('dragover');
};

const handleComicUploadLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cm-upload-zone');
  if (zone) zone.classList.remove('dragover');
};

const handleComicUploadDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById('cm-upload-zone');
  if (zone) zone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
  if (!files.length) {
    toast('Please drop image files only.', 'warn');
    return;
  }
  addComicPagesFromFiles(files);
};

const handleComicUploadInput = (event) => {
  const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
  if (!files.length) {
    toast('Please select image files only.', 'warn');
    event.target.value = '';
    return;
  }
  addComicPagesFromFiles(files);
  event.target.value = '';
};

const addComicPagesFromFiles = (files) => {
  files.forEach((file) => {
    const card = addComicPageEditor({ text: '', image: '', imageName: file.name });
    const reader = new FileReader();
    reader.onload = (e) => {
      updateComicPagePreviewFromData(card, e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  });
};

const handleComicPageFileInput = (fileInput) => {
  const file = fileInput.files[0];
  if (!file) return;
  const card = fileInput.closest('.comic-page-edit-card');
  const reader = new FileReader();
  reader.onload = (e) => {
    updateComicPagePreviewFromData(card, e.target.result, file.name);
  };
  reader.readAsDataURL(file);
};

const updateComicPagePreviewFromData = (card, imageData, fileName) => {
  if (!card) return;
  const thumb = card.querySelector('.cm-page-thumb');
  const hiddenInput = card.querySelector('.cm-page-img-data');
  const urlInput = card.querySelector('.cm-page-url');
  const nameInput = card.querySelector('.cm-page-img-name');
  if (thumb) {
    thumb.src = imageData;
    thumb.style.opacity = '1';
  }
  if (hiddenInput) hiddenInput.value = imageData;
  if (urlInput) urlInput.value = imageData;
  if (nameInput && !nameInput.value) nameInput.value = fileName;
  toast('Page image uploaded successfully.', 'ok');
};

const updateComicPageImagePreview = (input) => {
  const card = input.closest('.comic-page-edit-card');
  const thumb = card?.querySelector('.cm-page-thumb');
  const hiddenInput = card?.querySelector('.cm-page-img-data');
  if (!card || !thumb || !hiddenInput) return;
  const value = input.value.trim();
  if (value) {
    thumb.src = value;
    thumb.style.opacity = '1';
    hiddenInput.value = value;
  } else {
    thumb.src = '';
    thumb.style.opacity = '0.25';
    hiddenInput.value = '';
  }
};

const openComicPageImageFull = (img) => {
  const src = img?.src || '';
  if (!src) return;
  openFullscreenImageModal(src);
};

const previewComicPageImage = (btn) => {
  const card = btn.closest('.comic-page-edit-card');
  const src = card?.querySelector('.cm-page-img-data')?.value;
  if (!src) {
    toast('No image to preview yet.', 'warn');
    return;
  }
  openFullscreenImageModal(src);
};

const reindexComicPages = () => {
  const container = document.getElementById('cm-pages-editor');
  if (!container) return;
  container.querySelectorAll('.comic-page-edit-card').forEach((card, idx) => {
    const num = card.querySelector('strong');
    if (num) num.textContent = `Page #${idx + 1}`;
  });
};

const saveComic = () => {
  const title = document.getElementById('cm-title').value.trim();
  const description = document.getElementById('cm-desc').value.trim();
  const partId = document.getElementById('cm-part').value;
  const locked = !!document.getElementById('cm-lock-toggle')?.checked;
  const unlockAt = document.getElementById('cm-unlock-at')?.value || '';
  
  if (!title) {
    toast('Please enter a comic title', 'warn');
    return;
  }
  
  const pageCards = document.querySelectorAll('#cm-pages-editor .comic-page-edit-card');
  if (pageCards.length === 0) {
    toast('Please add at least one page', 'warn');
    return;
  }
  
  const pages = [];
  let valid = true;
  
  pageCards.forEach((card, idx) => {
    const text = card.querySelector('.cm-page-text').value.trim();
    const image = card.querySelector('.cm-page-img-data').value;
    const imageName = card.querySelector('.cm-page-img-name')?.value.trim();
    
    if (!text && !image) {
      toast(`Page #${idx + 1} has neither text nor panel image`, 'warn');
      valid = false;
      return;
    }
    
    pages.push({ text, image, imageName });
  });
  
  if (!valid) return;
  
  const comics = LS.get('comics') || [];
  if (comicModalEditId) {
    const idx = comics.findIndex(c => c.id === comicModalEditId);
    if (idx === -1) {
      toast('Comic not found', 'warn');
      return;
    }
    comics[idx] = {
      ...comics[idx],
      title,
      description,
      partId,
      locked,
      unlockAt,
      pages,
      updatedAt: Date.now()
    };
    LS.set('comics', comics);
    toast('Comic updated successfully! 📖', 'ok');
    comicModalEditId = null;
  } else {
    const newComic = {
      id: `comic_${Date.now()}`,
      title,
      description,
      partId,
      locked,
      unlockAt,
      pages,
      createdAt: Date.now()
    };
    comics.push(newComic);
    LS.set('comics', comics);
    toast('Comic published successfully! 📖', 'ok');
  }
  
  closeModal('comicModal');
  renderComics();
  renderParts();
  if (activeTeacherPartId) {
    renderTeacherPartDetail();
  }
};

const deleteComic = (comicId) => {
  openConfirmModal('Are you sure you want to delete this comic?')
    .then(confirmed => {
      if (!confirmed) return;
      let comics = LS.get('comics') || [];
      comics = comics.filter(c => c.id !== comicId);
      LS.set('comics', comics);
      toast('Comic deleted', 'ok');
      renderComics();
      renderParts();
      if (activeTeacherPartId) {
        renderTeacherPartDetail();
      }
    });
};

// Fullscreen image preview state
let fullscreenImageZoom = 1;

const openFullscreenImageModal = (imageSrc, comicId = null) => {
  // imageSrc may be string or object { src, comicId }
  const modal = document.getElementById('fullscreen-image-modal');
  const img = document.getElementById('fullscreen-image');
  if (!modal || !img) return;
  if (comicId) {
    img.src = imageSrc || '';
    window.currentFullscreenComicId = comicId;
  } else if (typeof imageSrc === 'object' && imageSrc !== null) {
    img.src = imageSrc.src || '';
    window.currentFullscreenComicId = imageSrc.comicId || null;
  } else {
    img.src = imageSrc;
    window.currentFullscreenComicId = null;
  }
  fullscreenImageZoom = 1;
  img.style.transform = `scale(1)`;
  modal.classList.remove('hidden');
  refreshLucide();
};

const closeFullscreenImageModal = () => {
  const modal = document.getElementById('fullscreen-image-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.currentFullscreenComicId = null;

const fullscreenNextComic = () => {
  const comics = LS.get('comics') || [];
  if (!comics.length) return;
  const idx = comics.findIndex(c => c.id === window.currentFullscreenComicId);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % comics.length;
  const next = comics[nextIdx];
  if (!next) return;
  const nextImg = next.pages && next.pages.length ? next.pages[0].image : '';
  openFullscreenImageModal({ src: nextImg, comicId: next.id });
};

const fullscreenPrevComic = () => {
  const comics = LS.get('comics') || [];
  if (!comics.length) return;
  const idx = comics.findIndex(c => c.id === window.currentFullscreenComicId);
  const prevIdx = idx <= 0 ? comics.length - 1 : idx - 1;
  const prev = comics[prevIdx];
  if (!prev) return;
  const prevImg = prev.pages && prev.pages.length ? prev.pages[0].image : '';
  openFullscreenImageModal({ src: prevImg, comicId: prev.id });
};

const applyFullscreenImageZoom = () => {
  const img = document.getElementById('fullscreen-image');
  if (img) {
    img.style.transform = `scale(${fullscreenImageZoom})`;
  }
};

const zoomInFullscreenImage = () => {
  fullscreenImageZoom = Math.min(fullscreenImageZoom + 0.25, 5);
  applyFullscreenImageZoom();
};

const zoomOutFullscreenImage = () => {
  fullscreenImageZoom = Math.max(fullscreenImageZoom - 0.25, 0.25);
  applyFullscreenImageZoom();
};

const resetFullscreenImageZoom = () => {
  fullscreenImageZoom = 1;
  applyFullscreenImageZoom();
};

const renderComics = () => {
  const tContainer = document.getElementById('teacher-comics-list');
  const sGrid = document.getElementById('student-comics-grid');
  const comics = LS.get('comics') || [];
  const parts = getStoredParts();

  const renderCard = (c, isTeacher) => {
    const lockLabel = getLockStatusLabel(c);
    const firstPageImage = c.pages && c.pages.length > 0 ? c.pages[0].image : null;
    const match = getPartMatchInfo(c.partId);
    const themeClass = match ? `p${(match.index % 3) + 1}` : 'p1';
    const disabled = isItemLockedNow(c) && !isTeacher;

    return `
      <div class="pcard" style="height:100%;display:flex;flex-direction:column;">
        ${firstPageImage ? `
          <div style="width:100%;height:160px;overflow:hidden;border-bottom:1px solid var(--bdr);cursor:pointer;" onclick="openFullscreenImageModal('${firstPageImage}','${c.id}')">
            <img src="${firstPageImage}" alt="${c.title}" style="width:100%;height:100%;object-fit:cover;">
          </div>
        ` : ''}
        <div class="ph ${themeClass}">
          <div>
            <div class="ptitle ${themeClass}">COMIC</div>
            <div style="font-family:'Lexend',sans-serif;font-size:1.1rem;font-weight:800;color:var(--txth);margin-top:6px;">${c.title}</div>
            <div class="psub" style="margin-top:6px;">${getPartDisplayLabel(c.partId)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <span class="lock-lbl" style="font-size:0.78rem;">${lockLabel}</span>
            ${isTeacher ? `
              <div style="display:flex;gap:8px;">
                <button class="btn btn-ghost btn-sm" onclick="openComicModal('${c.partId}', '${c.id}'); event.stopPropagation();"><i data-lucide="pencil"></i></button>
                <button class="btn btn-ghost btn-sm" style="color:var(--coral);" onclick="deleteComic('${c.id}'); event.stopPropagation();"><i data-lucide="trash-2"></i></button>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="pbody" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;">
          <p style="font-size:0.9rem;color:var(--txt2);">${c.description || ''}</p>
          <div style="display:flex;gap:8px;align-items:center;margin-top:12px;">
            <button class="btn btn-g btn-sm" onclick="${disabled ? "toast('This comic is locked', 'warn')" : `openComicReader('${c.id}')`}">Read Comic</button>
            <div style="margin-left:auto;color:var(--txt3);font-size:0.85rem;">${new Date(c.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    `;
  };

  const renderList = (isTeacher) => {
    if (comics.length === 0) {
      return `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;">
          <div style="text-align:center;color:var(--txt3);font-size:1.1rem;">No comics created yet.</div>
        </div>
      `;
    }

    const cardsHtml = comics
      .filter(c => isTeacher || !isItemLockedNow(c))
      .map(c => renderCard(c, isTeacher)).join('');

    return `<div class="pgrid">${cardsHtml}</div>`;
  };

  if (currentUser) {
    if (currentUser.role === 'teacher' && tContainer) {
      tContainer.innerHTML = renderList(true);
    } else if (currentUser.role === 'student' && sGrid) {
      sGrid.innerHTML = renderList(false);
    }
    refreshLucide();
  }
};

const renderGames = () => {
  const tContainer = document.getElementById('teacher-games-list');
  const sGrid = document.getElementById('student-games-grid');
  const games = LS.get('games') || [];
  const parts = getStoredParts();

  const renderCard = (g, isTeacher) => {
    const lockLabel = getLockStatusLabel(g);
    const match = getPartMatchInfo(g.partId);
    const typeLabel = (g.type === 'word-search') ? 'Word Search' : (g.type === 'cryptogram') ? 'Cryptogram' : 'Jigsaw Puzzle';
    const iconMap = {
      'jigsaw': 'puzzle',
      'word-search': 'type',
      'cryptogram': 'key'
    };
    const icon = iconMap[g.type] || 'gamepad-2';
    const badgeColor = g.type === 'word-search' ? 'var(--sky)' : g.type === 'cryptogram' ? 'var(--amber)' : 'var(--leaf)';
    const thumb = (g.settings && g.settings.image) ? g.settings.image : (g.settings && Array.isArray(g.settings.levelDetails) && g.settings.levelDetails[0] && g.settings.levelDetails[0].image) ? g.settings.levelDetails[0].image : '';

    const descriptionText = g.description || 'Try this challenging game to test your skills and have fun learning!';
    const difficultyBadge = g.difficulty || 'Medium';
    
    // STUDENT SIMPLIFIED VIEW - No details
    if (!isTeacher) {
      return `
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:220px;cursor:pointer;transition:all 0.2s ease;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='var(--sh2)'" onmouseout="this.style.transform='none';this.style.boxShadow='var(--sh)'">
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:12px;">
            <div style="width:58px;height:58px;border-radius:18px;background:rgba(138,180,248,0.16);display:flex;align-items:center;justify-content:center;">
              <i data-lucide="${icon}" style="width:26px;height:26px;color:var(--leaf);"></i>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--txt3);letter-spacing:0.12em;">Ready to play?</div>
              <div style="font-size:0.78rem;color:${badgeColor};font-weight:700;margin-top:4px;">${typeLabel}</div>
            </div>
          </div>

          <div style="padding:16px 12px 8px;flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;">
            <h4 style="margin:0 0 8px 0;">${g.title || '(Untitled Game)'}</h4>
          </div>

          <div style="display:flex;gap:10px;padding-top:16px;border-top:1px solid var(--bdr);">
            <button class="btn btn-g btn-sm" style="flex:1;" onclick="loadGamePlayer('${g.id}')" title="Click to play">
              <i data-lucide="play" style="width:16px;height:16px;"></i> Play Now
            </button>
          </div>
        </div>
      `;
    }

    // TEACHER DETAILED VIEW - Full information
    return `
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;min-height:280px;cursor:default;transition:all 0.2s ease;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:12px;">
          <div style="width:58px;height:58px;border-radius:18px;background:rgba(138,180,248,0.16);display:flex;align-items:center;justify-content:center;">
            <i data-lucide="${icon}" style="width:26px;height:26px;color:var(--leaf);"></i>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--txt3);letter-spacing:0.12em;">Game</div>
            <div style="font-size:0.78rem;color:${badgeColor};font-weight:700;margin-top:4px;">${typeLabel}</div>
          </div>
        </div>

        <div style="padding:16px 12px 8px;flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center;">
          <h4 style="margin:0 0 8px 0;">${g.title || '(Untitled Game)'}</h4>
          <p style="margin:0 0 12px 0;font-size:0.9rem;color:var(--txt2);line-height:1.4;">${escapeHtml(descriptionText)}</p>
          <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;">
            <span class="part-chip" style="font-size:0.75rem;">${typeLabel}</span>
            <span class="part-chip" style="font-size:0.75rem;">${getPartDisplayLabel(g.partId)}</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;padding-top:16px;border-top:1px solid var(--bdr);">
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="openGameModal('${g.partId}','${g.id}')">
            <i data-lucide="pencil" style="width:16px;height:16px;"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" style="flex:1;" onclick="deleteGame('${g.id}')">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i> Remove
          </button>
        </div>
      </div>
    `;
  };

  if (tContainer) {
    const currentUserId = currentUser?.id ? String(currentUser.id) : null;
    let patchedOldTeacherGames = false;
    const teacherGames = games.filter(g => {
      if (!currentUserId) return false;
      if (!g.teacherId) {
        if (currentUser?.role === 'teacher') {
          g.teacherId = currentUserId;
          patchedOldTeacherGames = true;
          return true;
        }
        return false;
      }
      return String(g.teacherId) === currentUserId;
    });

    if (patchedOldTeacherGames) {
      LS.set('games', games);
    }

    if (teacherGames.length === 0) {
      tContainer.innerHTML = `
        <div style="text-align:center;padding:36px;color:var(--txt3);">
          <div style="font-size:1.1rem;margin-bottom:18px;">No games created yet.</div>
        </div>
      `;
    } else {
      tContainer.innerHTML = `<div class="pgrid">${teacherGames.map(g => renderCard(g, true)).join('')}</div>`;
    }
    refreshLucide();
  }

  if (sGrid) {
    const available = games.filter(g => !isItemLockedNow(g));
    if (available.length === 0) {
      sGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎮</div>No games available</div>';
    } else {
      sGrid.innerHTML = available.map(g => renderCard(g, false)).join('');
    }
  }
  refreshLucide();
};

const showGameSelectorInGamesTab = (show) => {
  const wrapper = document.getElementById('teacher-game-type-wrapper');
  if (!wrapper) return;
  if (show) {
    wrapper.classList.remove('hidden');
    // ensure icons render
    refreshLucide();
    // scroll into view
    setTimeout(() => { try { wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e){} }, 100);
  } else {
    wrapper.classList.add('hidden');
  }
};

// ═══ COMIC PLAYER ENGINE ═══

let activeComic = null;
let comicCurrentPage = 0;
let comicZoomLevel = 1;

const openComicReader = (comicId) => {
  const comics = LS.get('comics') || [];
  activeComic = comics.find(c => c.id === comicId);
  if (!activeComic) return;
  
  comicCurrentPage = 0;
  showScreen('sc-comic-reader');
  
  const titleEl = document.getElementById('cr-comic-title');
  if (titleEl) titleEl.textContent = activeComic.title;
  
  renderComicPage();
};

const applyComicZoom = () => {
  const imgEl = document.getElementById('cr-panel-image');
  if (imgEl) {
    imgEl.style.transform = `scale(${comicZoomLevel})`;
  }
};

const zoomInComic = () => {
  comicZoomLevel = Math.min(comicZoomLevel + 0.25, 3);
  applyComicZoom();
};

const zoomOutComic = () => {
  comicZoomLevel = Math.max(comicZoomLevel - 0.25, 0.5);
  applyComicZoom();
};

const resetZoomComic = () => {
  comicZoomLevel = 1;
  applyComicZoom();
};

const renderComicPage = () => {
  const page = activeComic.pages[comicCurrentPage];
  if (!page) return;
  
  const indicator = document.getElementById('cr-page-indicator');
  if (indicator) indicator.textContent = `Page ${comicCurrentPage + 1} of ${activeComic.pages.length}`;
  
  const textEl = document.getElementById('cr-panel-text');
  if (textEl) textEl.textContent = page.text || '';
  
  const imgEl = document.getElementById('cr-panel-image');
  const phEl = document.getElementById('cr-image-placeholder');
  
  if (page.image) {
    if (imgEl) {
      imgEl.src = page.image;
      imgEl.style.display = 'block';
    }
    if (phEl) phEl.style.display = 'none';
  } else {
    if (imgEl) imgEl.style.display = 'none';
    if (phEl) phEl.style.display = 'block';
  }
  
  // Reset zoom when page changes
  comicZoomLevel = 1;
  applyComicZoom();
  
  // Set up Prev/Next buttons
  const prevBtn = document.getElementById('cr-prev-btn');
  if (prevBtn) prevBtn.style.visibility = comicCurrentPage === 0 ? 'hidden' : 'visible';
  
  const nextBtn = document.getElementById('cr-next-btn');
  if (nextBtn) {
    nextBtn.innerHTML = comicCurrentPage === activeComic.pages.length - 1 
      ? 'Finish Comic <i data-lucide="check-circle"></i>' 
      : 'Next <i data-lucide="arrow-right"></i>';
  }
  
  refreshLucide();
};

const prevComicPage = () => {
  if (comicCurrentPage > 0) {
    comicCurrentPage--;
    renderComicPage();
  }
};

const nextComicPage = () => {
  if (comicCurrentPage < activeComic.pages.length - 1) {
    comicCurrentPage++;
    renderComicPage();
  } else {
    // Finished comic! Award stars if student
    if (currentUser.role === 'student') {
      const sKey = getUserDataKey(currentUser.id, 'student');
      const sData = LS.get(sKey) || { stars: 0, quizzesTaken: 0, comicsRead: 0 };
      sData.comicsRead = (sData.comicsRead || 0) + 1;
      sData.stars = (sData.stars || 0) + 10; // Award 10 stars!
      LS.set(sKey, sData);
      populateDashboard();
      toast('Comic completed! +10 Stars awarded! ⭐', 'ok');
    }
    exitComicReader();
  }
};

const exitComicReader = () => {
  activeComic = null;
  if (currentUser.role === 'teacher') {
    showScreen('sc-tdash');
    setTeacherTab('comics');
  } else {
    showScreen('sc-sdash');
    setStudentTab('comics');
  }
};

// ═══ QUIZ SYSTEM LOGIC ═══

let activeQuiz = null;
let currentQuestionIndex = 0;
let studentAnswers = {}; // { questionId: chosenIndex / text }
let overallTimer = null;
let overallTimeRemaining = 0;
let questionTimer = null;
let questionTimeRemaining = 0;

// ═══ TEACHER QUIZ CREATION ═══

const openCreateQuizForm = (selectedPartId = null, quizId = null) => {
  if (quizId) {
    // Editing an existing quiz
    openQuizForEdit(quizId);
    return;
  }
  
  const parts = getStoredParts();
  if (parts.length === 0) {
    toast('Please create at least one Part first!', 'warn');
    return;
  }
  pendingQuizPartId = selectedPartId;
  selectedQuizType = null;
  quizModalEditId = null;
  openModal('quizTypeModal');
  refreshLucide();
};

const closeQuizTypeModal = () => {
  closeModal('quizTypeModal');
  pendingQuizPartId = null;
};

const selectQuizType = (quizType) => {
  selectedQuizType = quizType;
  closeQuizTypeModal();
  openQuizDetailsModal();
};

const openQuizDetailsModal = () => {
  const parts = getStoredParts();
  const qzPartSelect = document.getElementById('qz-part');
  if (qzPartSelect) {
    qzPartSelect.innerHTML = parts.map((p, idx) => `<option value="${p.id}">${getPartOrdinalLabel(idx)} — ${p.title}</option>`).join('');
    qzPartSelect.value = pendingQuizPartId || parts[0].id;
  }
  
  // Clear inputs for new quiz
  document.getElementById('qz-title').value = '';
  document.getElementById('qz-opens-at').value = new Date().toISOString().substring(0, 16);
  document.getElementById('qz-duration').value = '30';
  document.getElementById('qz-question-limit').value = '0';
  quizIsLocked = true;
  document.getElementById('qz-unlock-at').value = '';
  
  document.getElementById('quizModalTitle').textContent = 'Create New Quiz';
  document.getElementById('quiz-save-settings-section').classList.remove('hidden');
  openModal('quizModal');
  
  updateQuizLockUI();
  // Set quiz type selector for new quiz
  const qTypeSel = document.getElementById('qz-type');
  if (qTypeSel) qTypeSel.value = selectedQuizType || 'Pre-Test';
  selectedQuizType = qTypeSel ? qTypeSel.value : (selectedQuizType || 'Pre-Test');
  onQuizTypeChange();
  refreshLucide();
};

const handleQzTypeChange = () => {
  const el = document.getElementById('qz-type');
  if (!el) return;
  selectedQuizType = el.value;
  onQuizTypeChange();
};

let pendingQuizEditId = null;

const openQuizForEdit = (quizId) => {
  // Open choice modal to let teacher pick Settings or Questions to edit
  const quizzes = LS.get('quizzes') || [];
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) {
    toast('Quiz not found', 'warn');
    return;
  }
  pendingQuizEditId = quizId;
  const titleEl = document.getElementById('quizEditChoiceTitle');
  if (titleEl) titleEl.textContent = `Edit Quiz — ${quiz.title}`;
  openModal('quizEditChoiceModal');
  refreshLucide();
};

const closeQuizEditChoiceModal = () => {
  pendingQuizEditId = null;
  closeModal('quizEditChoiceModal');
};

const chooseEditSettings = () => {
  if (!pendingQuizEditId) return;
  const id = pendingQuizEditId;
  closeQuizEditChoiceModal();
  populateQuizModalForEdit(id);
};

const chooseEditQuestions = () => {
  if (!pendingQuizEditId) return;
  const id = pendingQuizEditId;
  closeQuizEditChoiceModal();
  openQuizQuestionsModal(id);
};

const populateQuizModalForEdit = (quizId) => {
  const quizzes = LS.get('quizzes') || [];
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) {
    toast('Quiz not found', 'warn');
    return;
  }
  quizModalEditId = quizId;
  selectedQuizType = quiz.type;

  const parts = getStoredParts();
  const qzPartSelect = document.getElementById('qz-part');
  if (qzPartSelect) {
    qzPartSelect.innerHTML = parts.map((p, idx) => `<option value="${p.id}">${getPartOrdinalLabel(idx)} — ${p.title}</option>`).join('');
    qzPartSelect.value = quiz.partId;
  }

  document.getElementById('qz-title').value = quiz.title;
  document.getElementById('qz-opens-at').value = quiz.opensAt;
  document.getElementById('qz-duration').value = quiz.durationMinutes;
  document.getElementById('qz-question-limit').value = quiz.questionLimit || '0';
  quizIsLocked = !!quiz.locked;
  document.getElementById('qz-unlock-at').value = quiz.unlockAt || '';

  // Set quiz type selector
  const qTypeSel = document.getElementById('qz-type');
  if (qTypeSel) qTypeSel.value = quiz.type || 'Pre-Test';

  document.getElementById('quizModalTitle').textContent = 'Edit Quiz Settings';
  document.getElementById('quiz-save-settings-section').classList.remove('hidden');

  openModal('quizModal');
  updateQuizLockUI();
  onQuizTypeChange();
  refreshLucide();
};

let quizIsLocked = true; // Default to locked

const toggleQuizLock = () => {
  quizIsLocked = !quizIsLocked;
  updateQuizLockUI();
};

const updateQuizLockUI = () => {
  const icon = document.getElementById('qz-lock-icon');
  const button = document.getElementById('qz-lock-toggle');
  const label = document.getElementById('qz-lock-label');
  const unlockAtInput = document.getElementById('qz-unlock-at');
  
  if (icon && button && unlockAtInput) {
    if (quizIsLocked) {
      icon.setAttribute('data-lucide', 'lock');
      icon.style.color = 'var(--coral)';
      button.classList.add('state-locked');
      button.classList.remove('state-unlocked');
      button.setAttribute('aria-pressed','true');
      if (label) { label.textContent = 'lock'; label.style.color = 'var(--txt3)'; }
      unlockAtInput.disabled = false;
      unlockAtInput.style.opacity = '1';
    } else {
      icon.setAttribute('data-lucide', 'unlock');
      icon.style.color = 'var(--leaf)';
      button.classList.remove('state-locked');
      button.classList.add('state-unlocked');
      button.setAttribute('aria-pressed','false');
      if (label) { label.textContent = 'unlock'; label.style.color = 'var(--leaf)'; }
      unlockAtInput.disabled = true;
      unlockAtInput.style.opacity = '0.5';
    }
    refreshLucide();
  }
};

const closeQuizModal = () => {
  quizModalEditId = null;
  closeModal('quizModal');
};

const closeCreateQuizForm = () => {
  const mainView = document.getElementById('teacher-quiz-main-view');
  const createView = document.getElementById('teacher-quiz-create-view');
  if (mainView && createView) {
    createView.classList.add('hidden');
    mainView.classList.remove('hidden');
  }
  if (pendingQuizPartId) {
    const returnPartId = pendingQuizPartId;
    pendingQuizPartId = null;
    setTeacherTab('parts');
    openPartWorkspace(returnPartId);
    return;
  }
  renderTeacherQuizzes();
};

const onQuizTypeChange = () => {
  const qType = document.getElementById('qz-type').value;
  const questionLimitContainer = document.getElementById('qz-question-limit-container');
  const list = document.getElementById('qz-questions-list');

  const applyTypeDisplay = (type) => {
    if (type === 'Survey Questionnaire') {
      if (questionLimitContainer) questionLimitContainer.style.display = 'none';
    } else {
      if (questionLimitContainer) questionLimitContainer.style.display = 'block';
    }
  };

  // If there are existing question blocks, confirm reset
  if (list && list.children.length > 0) {
    openConfirmModal('Changing quiz type will reset current questions in the form. Continue?')
      .then(confirmed => {
        if (confirmed) {
          list.innerHTML = '';
          addQuizQuestionEditor();
          selectedQuizType = qType;
          applyTypeDisplay(qType);
        } else {
          // Revert selector to previously selected type
          document.getElementById('qz-type').value = selectedQuizType || (qType === 'Survey Questionnaire' ? 'Pre-Test' : 'Survey Questionnaire');
        }
      });
    return;
  }

  // No existing questions — just apply display and update selectedQuizType
  applyTypeDisplay(qType);
  selectedQuizType = qType;
};

const addQuizQuestionEditor = (data = null, containerId = 'qz-modal-questions-list') => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const index = container.children.length;
  // Use selectedQuizType (set when quiz type was chosen) not a removed dropdown
  const isSurvey = selectedQuizType === 'Survey Questionnaire';
  
  const card = document.createElement('div');
  card.className = 'qz-card-editor';
  card.dataset.index = index;
  
  card.innerHTML = `
    <div class="qz-card-header">
      <span class="qz-card-num">Question #${index + 1}</span>
      <button class="choice-delete-btn" type="button" onclick="confirmRemoveQuestion(this)"><i data-lucide="trash-2"></i></button>
    </div>
    <div style="margin-bottom: 12px;">
      <label class="lbl">Question Description</label>
      <input class="inp q-text-input" placeholder="e.g. Rate your understanding of photosynthesis" value="${data?.text || ''}">
    </div>
    
    ${isSurvey ? `
      <div style="margin-bottom: 12px;">
        <label class="lbl">Survey Response Format</label>
        <select class="inp q-format-select" onchange="toggleOptionsEditor(this)" style="background:var(--surf);color:var(--txt);border:1px solid var(--bdr);height:40px;padding:0 8px;border-radius:4px;width:100%;">
          <option value="rating" ${(!data || data.type === 'rating') ? 'selected' : ''}>1-5 Rating Scale</option>
          <option value="open-ended" ${(data && data.type === 'open-ended') ? 'selected' : ''}>Open-Ended Comment</option>
        </select>
      </div>
      <div class="q-options-area" style="display:none; padding:12px; border-radius:4px; background:rgba(138,180,248,0.06); font-size:0.8rem; border:1px solid var(--bdr);">
        Rating survey automatically generates standard rating choices: <strong>1 to 5</strong>.
      </div>
    ` : `
      <div class="q-options-area">
        <label class="lbl">Options / Answers</label>
        <div class="q-options-inputs-list">
          <!-- Render inputs -->
        </div>
        <button class="btn btn-ghost btn-xs" type="button" onclick="addOptionToCard(this)" style="margin-top: 8px;">+ Add Option</button>
      </div>
    `}
  `;
  
  container.appendChild(card);
  
  if (!isSurvey) {
    const optsList = card.querySelector('.q-options-inputs-list');
    const defaultOpts = ['', '', '', ''];
    const options = data?.options || defaultOpts;
    const correctAnswer = data?.correctAnswer ?? 0;
    options.forEach((opt, oIdx) => {
      renderOptionEditorRow(optsList, opt, oIdx, false, correctAnswer);
    });
  } else {
    // Show static instruction banner
    toggleOptionsEditor(card.querySelector('.q-format-select'));
  }
  
  refreshLucide();
};

const renderOptionEditorRow = (container, val, idx, isSurvey, correctIdx) => {
  const row = document.createElement('div');
  row.className = 'choice-editor-row';
  row.innerHTML = `
    <span class="choice-letter">${String.fromCharCode(65 + idx)}</span>
    <input class="inp q-opt-input" placeholder="Option description" value="${val}" style="flex:1;">
    <button type="button" class="correct-btn ${correctIdx === idx ? 'active' : ''}" onclick="setCorrectChoice(this, ${idx})">
      ${correctIdx === idx ? 'Correct ✓' : 'Correct?'}
    </button>
    <button type="button" class="choice-delete-btn" onclick="confirmRemoveOption(this)"><i data-lucide="trash-2"></i></button>
  `;
  container.appendChild(row);
  refreshLucide();
};

// Confirmed removals for question/option/comic page editors
const confirmRemoveQuestion = (btn) => {
  const card = btn.closest('.qz-card-editor');
  if (!card) return;
  openConfirmModal('Remove this question?').then(confirmed => {
    if (!confirmed) return;
    card.remove();
    reindexQuizQuestions();
    toast('Question removed', 'ok');
  });
};

const confirmRemoveOption = (btn) => {
  const row = btn.closest('.choice-editor-row');
  if (!row) return;
  openConfirmModal('Remove this option?').then(confirmed => {
    if (!confirmed) return;
    const list = row.closest('.q-options-inputs-list');
    row.remove();
    if (list) reindexOptionLetters(list);
    toast('Option removed', 'ok');
  });
};

const confirmRemoveComicPage = (btn) => {
  const card = btn.closest('.comic-page-edit-card');
  if (!card) return;
  openConfirmModal('Remove this comic page?').then(confirmed => {
    if (!confirmed) return;
    card.remove();
    reindexComicPages();
    toast('Page removed', 'ok');
  });
};

const setCorrectChoice = (btn, correctIdx) => {
  const container = btn.closest('.q-options-inputs-list');
  container.querySelectorAll('.correct-btn').forEach(b => {
    b.classList.remove('active');
    b.textContent = 'Correct?';
  });
  btn.classList.add('active');
  btn.textContent = 'Correct ✓';
  container.dataset.correct = correctIdx;
};

const addOptionToCard = (btn) => {
  const card = btn.closest('.qz-card-editor');
  const container = card.querySelector('.q-options-inputs-list');
  const idx = container.children.length;
  renderOptionEditorRow(container, '', idx, false, 0);
};

const reindexOptionLetters = (container) => {
  container.querySelectorAll('.choice-editor-row').forEach((row, idx) => {
    const letter = row.querySelector('.choice-letter');
    if (letter) letter.textContent = String.fromCharCode(65 + idx);
    const correctBtn = row.querySelector('.correct-btn');
    if (correctBtn) {
      correctBtn.setAttribute('onclick', `setCorrectChoice(this, ${idx})`);
      if (correctBtn.classList.contains('active')) {
        container.dataset.correct = idx;
      }
    }
  });
};

const reindexQuizQuestions = (containerId = 'qz-modal-questions-list') => {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.qz-card-editor').forEach((card, idx) => {
    card.dataset.index = idx;
    const num = card.querySelector('.qz-card-num');
    if (num) num.textContent = `Question #${idx + 1}`;
  });
};

const toggleOptionsEditor = (select) => {
  const card = select.closest('.qz-card-editor');
  const optsArea = card.querySelector('.q-options-area');
  if (optsArea) {
    if (select.value === 'rating') {
      optsArea.style.display = 'block';
      optsArea.innerHTML = `Rating survey automatically generates standard scale rating: <strong>1 (Low) to 5 (High)</strong>.`;
    } else {
      optsArea.style.display = 'block';
      optsArea.innerHTML = `This question is open-ended. Students will type a free-form comment response.`;
    }
  }
};

const saveNewQuiz = () => {
  const title = document.getElementById('qz-title').value.trim();
  const type = selectedQuizType;
  const partId = document.getElementById('qz-part').value;
  const opensAt = document.getElementById('qz-opens-at').value;
  const duration = parseInt(document.getElementById('qz-duration').value || '0');
  const qLimit = parseInt(document.getElementById('qz-question-limit').value || '0');
  const locked = quizIsLocked;
  const unlockAt = document.getElementById('qz-unlock-at')?.value || '';
  
  if (!title) {
    toast('Please enter a quiz title', 'warn');
    return;
  }
  
  let quizzes = LS.get('quizzes') || [];
  
  if (quizModalEditId) {
    // Editing existing quiz settings only — ask for confirmation then save
    openConfirmModal('Save changes to this quiz settings?').then(confirmed => {
      if (!confirmed) return;
      const quizIndex = quizzes.findIndex(q => q.id === quizModalEditId);
      if (quizIndex === -1) {
        toast('Quiz not found', 'warn');
        return;
      }
      quizzes[quizIndex] = {
        ...quizzes[quizIndex],
        title,
        type,
        partId,
        opensAt,
        locked,
        unlockAt,
        durationMinutes: duration,
        questionTimeLimit: type === 'Survey Questionnaire' ? 0 : qLimit
      };
      LS.set('quizzes', quizzes);
      toast('Quiz settings updated! Now edit the questions.', 'ok');
      closeQuizModal();
      // Open questions modal
      openQuizQuestionsModal(quizModalEditId);
    });
  } else {
    // Creating new quiz: save settings first, then open questions modal
    const newQuizId = `quiz_${Date.now()}`;
    const newQuiz = {
      id: newQuizId,
      teacherId: currentUser.id,
      title,
      type,
      partId,
      opensAt,
      locked,
      unlockAt,
      durationMinutes: duration,
      questionTimeLimit: type === 'Survey Questionnaire' ? 0 : qLimit,
      questions: []
    };
    quizzes.push(newQuiz);
    LS.set('quizzes', quizzes);
    toast('Quiz saved! Now add your questions. 🚀', 'ok');
    closeQuizModal();
    // Open questions modal for the new quiz
    quizModalEditId = newQuizId;
    openQuizQuestionsModal(newQuizId);
  }
  
  if (activeTeacherPartId) renderTeacherPartDetail();
  renderTeacherQuizzes();
};

// Opens the quiz questions editor modal for a specific quiz
const openQuizQuestionsModal = (quizId) => {
  const quizzes = LS.get('quizzes') || [];
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) {
    toast('Quiz not found', 'warn');
    return;
  }
  quizModalEditId = quizId;
  selectedQuizType = quiz.type;
  
  const titleEl = document.getElementById('quizQuestionsModalTitle');
  if (titleEl) titleEl.textContent = `Questions — ${quiz.title} (${quiz.type})`;
  
  // Clear and re-populate
  const container = document.getElementById('qz-modal-questions-list');
  if (container) {
    container.innerHTML = '';
    if (quiz.questions && quiz.questions.length > 0) {
      quiz.questions.forEach(q => addQuizQuestionEditor(q, 'qz-modal-questions-list'));
    } else {
      // Start with one blank question
      addQuizQuestionEditor(null, 'qz-modal-questions-list');
    }
  }
  
  openModal('quizQuestionsModal');
  refreshLucide();
};

const closeQuizQuestionsModal = () => {
  closeModal('quizQuestionsModal');
  quizModalEditId = null;
};

// Save only the questions from the questions modal
const saveQuizQuestionsOnly = () => {
  if (!quizModalEditId) {
    toast('No quiz selected', 'warn');
    return;
  }
  
  const quizzes = LS.get('quizzes') || [];
  const quizIndex = quizzes.findIndex(q => q.id === quizModalEditId);
  if (quizIndex === -1) {
    toast('Quiz not found', 'warn');
    return;
  }
  
  const type = quizzes[quizIndex].type;
  const questionCards = document.querySelectorAll('#qz-modal-questions-list .qz-card-editor');
  let questions = [];
  let valid = true;
  
  questionCards.forEach((card, idx) => {
    const text = card.querySelector('.q-text-input').value.trim();
    if (!text) {
      toast(`Question #${idx + 1} text is empty`, 'warn');
      valid = false;
      return;
    }
    
    if (type === 'Survey Questionnaire') {
      const qFormat = card.querySelector('.q-format-select')?.value || 'rating';
      if (qFormat === 'rating') {
        questions.push({ id: `q_${idx}_${Date.now()}`, text, type: 'rating', options: ['1','2','3','4','5'] });
      } else {
        questions.push({ id: `q_${idx}_${Date.now()}`, text, type: 'open-ended', options: [] });
      }
    } else {
      const optInputs = card.querySelectorAll('.q-opt-input');
      if (optInputs.length < 2) {
        toast(`Question #${idx + 1} needs at least 2 options`, 'warn');
        valid = false;
        return;
      }
      const options = Array.from(optInputs).map(inp => inp.value.trim());
      if (options.some(opt => !opt)) {
        toast(`Question #${idx + 1} has empty options`, 'warn');
        valid = false;
        return;
      }
      let correctIdx = -1;
      card.querySelectorAll('.correct-btn').forEach((btn, bIdx) => {
        if (btn.classList.contains('active')) correctIdx = bIdx;
      });
      if (correctIdx === -1) {
        toast(`Choose a correct answer for Question #${idx + 1}`, 'warn');
        valid = false;
        return;
      }
      questions.push({ id: `q_${idx}_${Date.now()}`, text, type: 'multiple-choice', options, correctAnswer: correctIdx });
    }
  });
  
  if (!valid) return;

  openConfirmModal('Save changes to quiz questions?').then(confirmed => {
    if (!confirmed) return;
    quizzes[quizIndex].questions = questions;
    LS.set('quizzes', quizzes);
    toast(`${questions.length} question(s) saved successfully! ✅`, 'ok');
    closeQuizQuestionsModal();
    if (activeTeacherPartId) renderTeacherPartDetail();
    renderTeacherQuizzes();
  });
};

const deleteQuiz = (quizId) => {
  openConfirmModal('Are you sure you want to delete this quiz?')
    .then(confirmed => {
      if (!confirmed) return;
      let quizzes = LS.get('quizzes') || [];
      quizzes = quizzes.filter(q => q.id !== quizId);
      LS.set('quizzes', quizzes);
      toast('Quiz deleted', 'ok');
      renderTeacherQuizzes();
      renderParts();
      if (activeTeacherPartId) {
        renderTeacherPartDetail();
      }
    });
};

const renderTeacherQuizzes = () => {
  const container = document.getElementById('teacher-quizzes-list');
  if (!container) return;
  
  const quizzes = LS.get('quizzes') || [];
  const teacherQuizzes = quizzes.filter(q => q.teacherId === currentUser.id || q.teacherId === 'admin-default');
  
  if (teacherQuizzes.length === 0) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;">
        <div style="text-align:center;color:var(--txt3);font-size:1.1rem;">No quizzes created yet.</div>
      </div>
    `;
    refreshLucide();
    return;
  }
  
  const quizCards = teacherQuizzes.map(q => {
    const iconMap = {
      'Pre-Test': 'book-open-check',
      'Post-Test': 'book-check',
      'Survey Questionnaire': 'clipboard-list'
    };
    const icon = iconMap[q.type] || 'clipboard-check';
    const badgeColor = q.type === 'Survey Questionnaire' ? 'var(--sky)' : 'var(--amber)';

    return `
      <div class="card cq" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div style="text-align:center;padding-top:8px;">
          <i data-lucide="${icon}" style="width:54px;height:54px;color:var(--leaf);display:block;margin:0 auto 8px auto;"></i>
          <span class="cbadge bq" style="background:${badgeColor};color:var(--bg);font-weight:700;display:inline-block;padding:6px 10px;border-radius:18px;font-size:0.78rem;">${q.type}</span>
        </div>

        <div style="padding:12px 10px;flex:1;">
          <h4 style="margin:6px 0 8px 0;">${q.title}</h4>
          <p style="margin:0 0 8px 0;color:var(--txt2);">${q.questions.length} questions • ${getPartDisplayLabel(q.partId)}</p>
          <p style="font-size:0.75rem;color:var(--txt3);margin-top:6px;">Opens: ${new Date(q.opensAt).toLocaleString()}</p>
          <p style="font-size:0.72rem;color:var(--txt3);margin-top:4px;">${getLockStatusLabel(q)}</p>
        </div>

        <div style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--bdr);">
          <button class="btn btn-ghost" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;" onclick="openCreateQuizForm(null, '${q.id}')">
            <i data-lucide="pencil" style="width:16px;height:16px;color:var(--sky);"></i>
            Edit
          </button>
          <button class="btn btn-danger" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;" onclick="deleteQuiz('${q.id}')">
            <i data-lucide="trash-2" style="width:16px;height:16px;color:var(--bg);"></i>
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="cgrid">
      ${quizCards}
    </div>
  `;
  refreshLucide();
};

// ═══ STUDENT QUIZ PLAY LOOP ═══

const renderStudentQuizzes = () => {
  const grid = document.getElementById('student-quizzes-grid');
  if (!grid) return;
  
  const quizzes = LS.get('quizzes') || [];
  if (quizzes.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3);">No quizzes available yet.</div>';
    return;
  }
  
  grid.innerHTML = quizzes.map(q => {
    const availability = getQuizAvailability(q);
    
    // Check if student already attempted this quiz
    const attempts = LS.get('quiz_attempts') || [];
    const attempt = attempts.find(att => att.quizId === q.id && att.studentId === currentUser.id);
    
    let btnHtml = '';
    if (attempt) {
      btnHtml = `<button class="btn btn-ghost btn-sm" onclick="showQuizResultsById('${q.id}')" style="width:100%;margin-top:12px;">View Results (${attempt.type === 'Survey Questionnaire' ? 'Submitted' : attempt.score + '/' + attempt.totalQuestions})</button>`;
    } else if (availability.available) {
      btnHtml = `<button class="btn btn-g btn-sm" onclick="startStudentQuiz('${q.id}')" style="width:100%;margin-top:12px;">Start Quiz</button>`;
    } else {
      btnHtml = `<button class="btn btn-sm" disabled style="width:100%;margin-top:12px;opacity:0.5;cursor:not-allowed;"><i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> ${availability.reason}</button>`;
    }

    const iconMap = {
      'Pre-Test': 'book-open-check',
      'Post-Test': 'book-check',
      'Survey Questionnaire': 'clipboard-list'
    };
    const icon = iconMap[q.type] || 'clipboard-check';
    const badgeColor = q.type === 'Survey Questionnaire' ? 'var(--sky)' : 'var(--amber)';

    return `
      <div class="card cq" style="${!availability.available && !attempt ? 'opacity:0.75;' : ''}">
        <div style="display:flex;align-items:center;gap:8px;">
          <i data-lucide="${icon}" style="width:18px;height:18px;color:var(--leaf);"></i>
          <span class="cbadge bq" style="background:${badgeColor};color:var(--bg);">${q.type}</span>
        </div>
        <h4 style="margin-top:8px;">${q.title}</h4>
        <p>${q.questions.length} questions • ${getPartDisplayLabel(q.partId)}</p>
        ${q.durationMinutes > 0 ? `<p style="font-size:0.75rem;color:var(--txt2);"><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;"></i> Limit: ${q.durationMinutes} mins</p>` : ''}
        ${btnHtml}
      </div>
    `;
  }).join('');
  
  refreshLucide();
};

const startStudentQuiz = (quizId) => {
  const quizzes = LS.get('quizzes') || [];
  activeQuiz = quizzes.find(q => q.id === quizId);
  if (!activeQuiz) return;
  
  currentQuestionIndex = 0;
  studentAnswers = {};
  
  showScreen('sc-qplayer');
  
  const titleEl = document.getElementById('qp-quiz-title');
  const typeEl = document.getElementById('qp-quiz-type');
  if (titleEl) titleEl.textContent = activeQuiz.title;
  if (typeEl) {
    typeEl.textContent = activeQuiz.type;
    typeEl.style.background = activeQuiz.type === 'Survey Questionnaire' ? 'var(--sky)' : 'var(--amber)';
  }
  
  // Set up overall timer
  clearInterval(overallTimer);
  const timerBox = document.getElementById('qp-overall-timer');
  if (activeQuiz.durationMinutes > 0) {
    overallTimeRemaining = activeQuiz.durationMinutes * 60;
    if (timerBox) timerBox.style.display = 'flex';
    updateOverallTimerDisplay();
    overallTimer = setInterval(() => {
      overallTimeRemaining--;
      updateOverallTimerDisplay();
      if (overallTimeRemaining <= 0) {
        clearInterval(overallTimer);
        toast('Time is up! Auto-submitting quiz...', 'warn');
        submitQuiz(true);
      }
    }, 1000);
  } else {
    if (timerBox) timerBox.style.display = 'none';
  }
  
  renderActiveQuestion();
};

const updateOverallTimerDisplay = () => {
  const display = document.getElementById('qp-overall-time');
  if (!display) return;
  const m = String(Math.floor(overallTimeRemaining / 60)).padStart(2, '0');
  const s = String(overallTimeRemaining % 60).padStart(2, '0');
  display.textContent = `${m}:${s}`;
};

const renderActiveQuestion = () => {
  const question = activeQuiz.questions[currentQuestionIndex];
  if (!question) return;
  
  // Update progress
  const progressEl = document.getElementById('qp-question-progress');
  if (progressEl) progressEl.textContent = `Question ${currentQuestionIndex + 1} of ${activeQuiz.questions.length}`;
  
  const progressFill = document.getElementById('qp-progress-fill');
  if (progressFill) progressFill.style.width = `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%`;
  
  // Set up Prev button visibility
  const prevBtn = document.getElementById('qp-prev-btn');
  if (prevBtn) prevBtn.style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
  
  // Set up Next/Submit label
  const nextBtn = document.getElementById('qp-next-btn');
  if (nextBtn) {
    nextBtn.innerHTML = currentQuestionIndex === activeQuiz.questions.length - 1 
      ? 'Submit Quiz <i data-lucide="check-circle"></i>' 
      : 'Next <i data-lucide="chevron-right"></i>';
  }
  
  // Render question card contents
  const card = document.getElementById('qp-card');
  if (!card) return;
  
  let contentHtml = `<h3 style="font-family:'Lexend',sans-serif;font-size:1.3rem;margin-bottom:20px;color:var(--txth);">${question.text}</h3>`;
  
  if (question.type === 'rating') {
    // 1-5 Rating survey format
    contentHtml += `<div class="rating-row">`;
    for (let i = 1; i <= 5; i++) {
      const isSelected = studentAnswers[question.id] === i;
      contentHtml += `
        <div class="rating-btn ${isSelected ? 'selected' : ''}" onclick="selectRating(${i})">${i}</div>
      `;
    }
    contentHtml += `</div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:0.75rem;color:var(--txt3);padding:0 8px;">
        <span>1 - Low / Disagree</span>
        <span>5 - High / Agree</span>
      </div>`;
  } else if (question.type === 'multiple-choice') {
    contentHtml += `<div class="choice-picker">`;
    question.options.forEach((opt, oIdx) => {
      const isSelected = studentAnswers[question.id] === oIdx;
      contentHtml += `
        <div class="choice-card ${isSelected ? 'selected' : ''}" onclick="selectChoice(${oIdx})">
          <span class="choice-letter">${String.fromCharCode(65 + oIdx)}</span>
          <span>${opt}</span>
        </div>
      `;
    });
    contentHtml += `</div>`;
  } else {
    // Open ended (Survey format)
    const currentVal = studentAnswers[question.id] || '';
    contentHtml += `
      <div style="margin-top:20px;">
        <textarea class="inp" id="survey-text-area" rows="6" placeholder="Type your response here..." oninput="handleTextAreaInput(this)" style="resize:vertical;background:var(--surf2);color:var(--txt);border:1.5px solid var(--bdr);width:100%;border-radius:var(--r);padding:14px;">${currentVal}</textarea>
      </div>
    `;
  }
  
  card.innerHTML = contentHtml;
  
  // Question Timer
  clearInterval(questionTimer);
  const qTimerEl = document.getElementById('qp-question-timer');
  const timerBar = document.getElementById('qp-question-timer-fill');
  
  if (activeQuiz.questionTimeLimit > 0 && activeQuiz.type !== 'Survey Questionnaire') {
    questionTimeRemaining = activeQuiz.questionTimeLimit;
    if (qTimerEl) {
      qTimerEl.style.display = 'inline';
      qTimerEl.textContent = `Timer: ${questionTimeRemaining}s`;
    }
    if (timerBar) {
      timerBar.style.display = 'block';
      timerBar.style.width = '100%';
    }
    
    questionTimer = setInterval(() => {
      questionTimeRemaining--;
      if (qTimerEl) qTimerEl.textContent = `Timer: ${questionTimeRemaining}s`;
      if (timerBar) timerBar.style.width = `${(questionTimeRemaining / activeQuiz.questionTimeLimit) * 100}%`;
      
      if (questionTimeRemaining <= 0) {
        clearInterval(questionTimer);
        toast("Question timer expired! Proceeding...", "info");
        if (studentAnswers[question.id] === undefined) {
          studentAnswers[question.id] = -1; // timed out
        }
        nextQuizQuestion();
      }
    }, 1000);
  } else {
    if (qTimerEl) qTimerEl.style.display = 'none';
    if (timerBar) timerBar.style.display = 'none';
  }
  
  refreshLucide();
};

const selectRating = (val) => {
  const question = activeQuiz.questions[currentQuestionIndex];
  studentAnswers[question.id] = val;
  
  const buttons = document.querySelectorAll('.rating-btn');
  buttons.forEach((btn, idx) => {
    if ((idx + 1) === val) btn.classList.add('selected');
    else btn.classList.remove('selected');
  });
};

const selectChoice = (idx) => {
  const question = activeQuiz.questions[currentQuestionIndex];
  studentAnswers[question.id] = idx;
  
  const cards = document.querySelectorAll('.choice-card');
  cards.forEach((c, cIdx) => {
    if (cIdx === idx) c.classList.add('selected');
    else c.classList.remove('selected');
  });
};

const handleTextAreaInput = (textarea) => {
  const question = activeQuiz.questions[currentQuestionIndex];
  studentAnswers[question.id] = textarea.value;
};

const prevQuizQuestion = () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderActiveQuestion();
  }
};

const nextQuizQuestion = () => {
  const question = activeQuiz.questions[currentQuestionIndex];
  
  // Require answer if not survey
  if (activeQuiz.type !== 'Survey Questionnaire') {
    if (studentAnswers[question.id] === undefined) {
      toast('Please select an option to proceed', 'warn');
      return;
    }
  }
  
  if (currentQuestionIndex < activeQuiz.questions.length - 1) {
    currentQuestionIndex++;
    renderActiveQuestion();
  } else {
    submitQuiz();
  }
};

const exitQuizPlayer = () => {
  clearInterval(overallTimer);
  clearInterval(questionTimer);
  activeQuiz = null;
  showScreen('sc-sdash');
  setStudentTab('quizzes');
  renderStudentQuizzes();
};

const submitQuiz = (isAutoSubmit = false) => {
  clearInterval(overallTimer);
  clearInterval(questionTimer);
  
  let score = 0;
  if (activeQuiz.type !== 'Survey Questionnaire') {
    activeQuiz.questions.forEach(q => {
      if (studentAnswers[q.id] === q.correctAnswer) {
        score++;
      }
    });
  }
  
  const attempt = {
    id: `attempt_${Date.now()}`,
    quizId: activeQuiz.id,
    studentId: currentUser.id,
    studentName: (currentUser.firstName || 'Student') + ' ' + (currentUser.lastName || ''),
    type: activeQuiz.type,
    score,
    totalQuestions: activeQuiz.questions.length,
    answers: studentAnswers,
    timeTakenSeconds: activeQuiz.durationMinutes > 0 ? (activeQuiz.durationMinutes * 60 - overallTimeRemaining) : 60,
    completedAt: new Date().toISOString()
  };
  
  const attempts = LS.get('quiz_attempts') || [];
  attempts.push(attempt);
  LS.set('quiz_attempts', attempts);
  
  const sDataKey = getUserDataKey(currentUser.id, 'student');
  const sData = LS.get(sDataKey) || {};
  sData.quizzesTaken = (sData.quizzesTaken || 0) + 1;
  sData.stars = (sData.stars || 0) + (activeQuiz.type === 'Survey Questionnaire' ? 10 : score * 10);
  LS.set(sDataKey, sData);
  
  populateDashboard();
  showQuizResults(attempt);
};

const showQuizResults = (attempt) => {
  const quiz = (LS.get('quizzes') || []).find(q => q.id === attempt.quizId);
  if (!quiz) return;
  
  showScreen('sc-qscore');
  
  const headlineEl = document.getElementById('qs-headline');
  const titleEl = document.getElementById('qs-quiz-title');
  const scoreContainer = document.getElementById('qs-score-container');
  const reviewContainer = document.getElementById('qs-review-container');
  const iconEl = document.getElementById('qs-icon');
  
  if (titleEl) titleEl.textContent = quiz.title;
  
  if (attempt.type === 'Survey Questionnaire') {
    if (iconEl) iconEl.textContent = '📋';
    if (headlineEl) headlineEl.textContent = 'Survey Submitted!';
    if (scoreContainer) scoreContainer.style.display = 'none';
    if (reviewContainer) reviewContainer.style.display = 'none';
  } else {
    if (iconEl) iconEl.textContent = '🎉';
    if (headlineEl) headlineEl.textContent = 'Quiz Completed!';
    if (scoreContainer) {
      scoreContainer.style.display = 'block';
      const scoreEl = document.getElementById('qs-score');
      const pctEl = document.getElementById('qs-percentage');
      if (scoreEl) scoreEl.textContent = `${attempt.score} / ${attempt.totalQuestions}`;
      const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
      if (pctEl) pctEl.textContent = `${pct}% (${pct >= 60 ? 'Passed' : 'Needs Review'})`;
    }
    
    // Populate review list
    if (reviewContainer) {
      reviewContainer.style.display = 'block';
      const reviewList = document.getElementById('qs-review-list');
      if (reviewList) {
        reviewList.innerHTML = quiz.questions.map((q, idx) => {
          const sAns = attempt.answers[q.id];
          const isCorrect = sAns === q.correctAnswer;
          const corrText = q.options[q.correctAnswer];
          const chosenText = sAns === -1 ? 'Timed Out / Skipped' : (q.options[sAns] || 'None');
          
          return `
            <div class="qs-review-row">
              <div class="qs-review-q">Question ${idx + 1}: ${q.text}</div>
              <div class="qs-review-ans">Your Answer: <span style="color:${isCorrect ? 'var(--leaf)' : 'var(--coral)'};">${chosenText}</span></div>
              ${!isCorrect ? `<div class="qs-review-ans">Correct Answer: <span style="color:var(--leaf);">${corrText}</span></div>` : ''}
            </div>
          `;
        }).join('');
      }
    }
  }
};

const showQuizResultsById = (quizId) => {
  const attempts = LS.get('quiz_attempts') || [];
  const attempt = attempts.find(att => att.quizId === quizId && att.studentId === currentUser.id);
  if (attempt) showQuizResults(attempt);
};

// ═══ TEACHER REPORTS & ANALYTICS ═══

const renderQuizReports = () => {
  const container = document.getElementById('t-reports');
  if (!container) return;
  
  const quizzes = LS.get('quizzes') || [];
  const attempts = LS.get('quiz_attempts') || [];
  const students = LS.get('students') || [];
  
  let totalQuizAttempts = 0;
  let totalQuizScoreSum = 0;
  let totalQuizQuestionsCount = 0;
  quizzes.forEach(q => {
    const qAttempts = attempts.filter(a => a.quizId === q.id);
    totalQuizAttempts += qAttempts.length;
    qAttempts.forEach(a => {
      totalQuizScoreSum += a.score;
      totalQuizQuestionsCount += a.totalQuestions;
    });
  });
  
  const overallAvgScore = totalQuizQuestionsCount > 0 ? Math.round((totalQuizScoreSum / totalQuizQuestionsCount) * 100) : 0;
  const completionRate = students.length > 0 ? Math.round((totalQuizAttempts / (quizzes.length * students.length || 1)) * 100) : 0;
  
  container.innerHTML = `
    <h2 class="sec">Reports &amp; Analytics</h2>
    
    <!-- Class Overview -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
      <div class="rcard2" style="margin:0;">
        <h4 class="rcard2-title">Students Registered</h4>
        <div style="font-size:2.5rem;font-weight:800;color:var(--leaf);font-family:'Lexend',sans-serif;">${students.length}</div>
      </div>
      <div class="rcard2" style="margin:0;">
        <h4 class="rcard2-title">Total Quiz Attempts</h4>
        <div style="font-size:2.5rem;font-weight:800;color:var(--fern);font-family:'Lexend',sans-serif;">${totalQuizAttempts}</div>
      </div>
      <div class="rcard2" style="margin:0;">
        <h4 class="rcard2-title">Overall Average Score</h4>
        <div style="font-size:2.5rem;font-weight:800;color:var(--sky);font-family:'Lexend',sans-serif;">${overallAvgScore}%</div>
      </div>
      <div class="rcard2" style="margin:0;">
        <h4 class="rcard2-title">Class Completion Rate</h4>
        <div style="font-size:2.5rem;font-weight:800;color:var(--amber);font-family:'Lexend',sans-serif;">${Math.min(100, completionRate)}%</div>
      </div>
    </div>
    
    <!-- Quiz & Survey Summary -->
    <div class="rcard2">
      <h3 style="font-family:'Lexend',sans-serif;font-size:1.1rem;margin-bottom:16px;color:var(--txth);">Quiz &amp; Survey Summary</h3>
      <div id="rep-quizzes-list" class="cgrid">
        <!-- Renders report cards -->
      </div>
    </div>
    
    <!-- Detailed View -->
    <div id="rep-quiz-detail-view" style="display:none;background:var(--surf);border:1.5px solid var(--bdr2);border-radius:var(--rlg);padding:24px;margin-top:20px;box-shadow:var(--sh);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 id="rep-detail-title" style="font-family:'Lexend',sans-serif;font-size:1.3rem;color:var(--txth);">Detailed Report</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeReportDetails()">Back</button>
      </div>
      <div id="rep-detail-stats" style="margin-bottom:24px;"></div>
      <div id="rep-detail-content"></div>
    </div>
  `;
  
  const grid = document.getElementById('rep-quizzes-list');
  if (!grid) return;
  
  if (quizzes.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--txt3);">No quiz data available yet. Create a quiz to get started!</div>';
    return;
  }
  
  grid.innerHTML = quizzes.map(q => {
    const qAttempts = attempts.filter(att => att.quizId === q.id);
    const avgScore = qAttempts.length > 0 && q.type !== 'Survey Questionnaire'
      ? Math.round((qAttempts.reduce((sum, att) => sum + att.score, 0) / (qAttempts.length * q.questions.length)) * 100) 
      : 0;
    
    // Add graph-like progress bar to the card
    return `
      <div class="report-quiz-card" onclick="viewQuizReportDetails('${q.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <h4 class="report-quiz-title">${q.title}</h4>
          <span class="cbadge report-quiz-type" style="background:${q.type === 'Survey Questionnaire' ? 'var(--sky)' : 'var(--amber)'};color:var(--bg);">${q.type}</span>
        </div>
        <div style="margin-top:12px;font-size:0.8rem;color:var(--txt2);">
          <div>Taken by: <strong>${qAttempts.length}</strong> students</div>
          ${q.type !== 'Survey Questionnaire' ? `<div>Average Score: <strong>${avgScore}%</strong></div>` : '<div>Feedback Survey Responses</div>'}
        </div>
        ${q.type !== 'Survey Questionnaire' ? `
          <div style="margin-top:10px;">
            <div class="rbarl">
              <span>Average Score</span>
              <span>${avgScore}%</span>
            </div>
            <div class="rbar"><div class="rbf" style="width:${avgScore}%;background:linear-gradient(90deg, var(--leaf), var(--fern));"></div></div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
};

const viewQuizReportDetails = (quizId) => {
  const quiz = (LS.get('quizzes') || []).find(q => q.id === quizId);
  const attempts = (LS.get('quiz_attempts') || []).filter(att => att.quizId === quizId);
  const detailPanel = document.getElementById('rep-quiz-detail-view');
  if (!quiz || !detailPanel) return;
  
  detailPanel.style.display = 'block';
  
  const titleEl = document.getElementById('rep-detail-title');
  const statsEl = document.getElementById('rep-detail-stats');
  const contentEl = document.getElementById('rep-detail-content');
  
  if (titleEl) titleEl.textContent = `${quiz.title} Detailed Report`;
  
  if (quiz.type === 'Survey Questionnaire') {
    if (statsEl) statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr;gap:12px;">
        <div style="background:var(--surf2);padding:16px;border-radius:12px;text-align:center;">
          <div style="font-size:0.8rem;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;">TOTAL SUBMISSIONS</div>
          <div style="font-size:2.2rem;font-weight:800;color:var(--sky);font-family:'Lexend',sans-serif;">${attempts.length}</div>
        </div>
      </div>
    `;
    
    let contentHtml = '';
    quiz.questions.forEach((q, idx) => {
      contentHtml += `
        <div class="survey-resp-card">
          <div class="survey-q-title">Question ${idx + 1}: ${q.text}</div>
      `;
      
      if (q.type === 'rating') {
        const counts = Array(6).fill(0); // index 1 to 5
        let sum = 0;
        let answeredCount = 0;
        
        attempts.forEach(att => {
          const rating = att.answers[q.id];
          if (rating && rating >= 1 && rating <= 5) {
            counts[rating]++;
            sum += rating;
            answeredCount++;
          }
        });
        
        const avg = answeredCount > 0 ? (sum / answeredCount).toFixed(1) : '0.0';
        contentHtml += `<div style="font-size:0.9rem;color:var(--txt2);margin-bottom:12px;font-weight:600;">Average Rating: <strong>${avg} / 5.0</strong> (${answeredCount} ratings)</div>`;
        
        for (let i = 1; i <= 5; i++) {
          const count = counts[i];
          const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
          const color = i >=4 ? 'var(--fern)' : i >=3 ? 'var(--leaf)' : i >=2 ? 'var(--amber)' : 'var(--coral)';
          contentHtml += `
            <div class="survey-opt-stat">
              <span style="font-weight:600;">⭐ ${i} Star</span>
              <span><strong>${count}</strong> (${pct}%)</span>
            </div>
            <div class="survey-stat-bar">
              <div class="survey-stat-fill" style="width:${pct}%;background:linear-gradient(90deg, ${color}, ${color});"></div>
            </div>
          `;
        }
      } else {
        // Open ended responses
        contentHtml += `<div style="display:flex;flex-direction:column;gap:8px;">`;
        attempts.forEach(att => {
          const ans = att.answers[q.id];
          if (ans) {
            contentHtml += `<div class="survey-text-resp"><strong>${att.studentName}:</strong> "${ans}"</div>`;
          }
        });
        if (attempts.length === 0) contentHtml += `<div style="font-size:0.85rem;color:var(--txt3);text-align:center;padding:16px;">No responses yet.</div>`;
        contentHtml += `</div>`;
      }
      contentHtml += `</div>`;
    });
    
    if (contentEl) contentEl.innerHTML = contentHtml;
  } else {
    // Test stats details
    const average = attempts.length > 0 
      ? Math.round((attempts.reduce((sum, att) => sum + att.score, 0) / (attempts.length * quiz.questions.length)) * 100) 
      : 0;
    
    // Calculate score distribution
    let scoreDistribution = Array(11).fill(0); // 0-9, 10-19, ..., 90-100
    attempts.forEach(att => {
      const pct = Math.round((att.score / att.totalQuestions) * 100);
      const bucket = Math.min(Math.floor(pct / 10), 10);
      scoreDistribution[bucket]++;
    });
    
    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
          <div style="background:var(--surf2);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:0.75rem;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;">STUDENTS COMPLETED</div>
            <div style="font-size:2.2rem;font-weight:800;color:var(--leaf);font-family:'Lexend',sans-serif;">${attempts.length}</div>
          </div>
          <div style="background:var(--surf2);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:0.75rem;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;">AVERAGE SCORE</div>
            <div style="font-size:2.2rem;font-weight:800;color:var(--fern);font-family:'Lexend',sans-serif;">${average}%</div>
          </div>
          <div style="background:var(--surf2);padding:16px;border-radius:12px;text-align:center;">
            <div style="font-size:0.75rem;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;">TOTAL QUESTIONS</div>
            <div style="font-size:2.2rem;font-weight:800;color:var(--sky);font-family:'Lexend',sans-serif;">${quiz.questions.length}</div>
          </div>
        </div>
        
        <!-- Score Distribution -->
        <div style="margin-top:16px;">
          <h4 style="font-family:'Lexend',sans-serif;font-size:0.95rem;color:var(--txth);margin-bottom:12px;">Score Distribution</h4>
          <div style="display:flex;gap:8px;align-items:flex-end;height:150px;">
            ${scoreDistribution.map((count, idx) => {
              const maxCount = Math.max(...scoreDistribution, 1);
              const height = (count / maxCount) * 100;
              const label = idx === 10 ? '100' : `${idx * 10}-${idx * 10 + 9}`;
              const color = idx >= 6 ? 'var(--fern)' : idx >=4 ? 'var(--leaf)' : idx >=2 ? 'var(--amber)' : 'var(--coral)';
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                  <div style="font-size:0.7rem;color:var(--txt3);">${count}</div>
                  <div style="width:100%;min-width:30px;background:linear-gradient(180deg, ${color}, ${color});border-radius:4px 4px 0 0;transition:height 0.5s ease;height:${height}%;"></div>
                  <div style="font-size:0.7rem;color:var(--txt2);">${label}%</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    if (contentEl) {
      contentEl.innerHTML = `
        <h4 style="font-family:'Lexend',sans-serif;font-size:0.95rem;color:var(--txth);margin-bottom:12px;">Student Results</h4>
        <table class="rtbl">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Time Taken</th>
            </tr>
          </thead>
          <tbody>
            ${attempts.map(att => {
              const pct = Math.round((att.score / att.totalQuestions) * 100);
              return `
                <tr>
                  <td>${att.studentName}</td>
                  <td><span class="spill sp-h">${att.score} / ${att.totalQuestions}</span></td>
                  <td><span class="spill ${pct >= 60 ? 'sp-h' : 'sp-l'}">${pct}%</span></td>
                  <td>${formatTime(att.timeTakenSeconds)}</td>
                </tr>
              `;
            }).join('')}
            ${attempts.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--txt3);padding:24px;">No submissions yet.</td></tr>' : ''}
          </tbody>
        </table>
      `;
    }
  }
  
  detailPanel.scrollIntoView({ behavior: 'smooth' });
};

const closeReportDetails = () => {
  const detailPanel = document.getElementById('rep-quiz-detail-view');
  if (detailPanel) detailPanel.style.display = 'none';
};

const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
};

// ═══ CLASS REGISTRY MANAGEMENT ═══

const renderClassStudents = () => {
  const tbody = document.getElementById('teacher-class-students-tbody');
  const countLbl = document.getElementById('teacher-class-count-lbl');
  if (!tbody) return;
  
  const students = LS.get('students') || [];
  const attempts = LS.get('quiz_attempts') || [];
  
  if (countLbl) {
    countLbl.textContent = `${students.length} student(s) registered`;
  }
  
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--txt3);padding:24px;">No students registered yet.</td></tr>';
    return;
  }
  
  tbody.innerHTML = students.map(s => {
    const myAttempts = attempts.filter(att => att.studentId === s.id);
    const photo = s.photoURL 
      ? `<img src="${s.photoURL}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:var(--surf3);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--txt2);vertical-align:middle;margin-right:8px;">${s.firstName[0].toUpperCase()}</div>`;
    
    const isBlocked = !!s.blocked;
    const blockBtnLabel = isBlocked ? 'Unblock' : 'Block';
    const blockBtnStyle = isBlocked
      ? 'background:rgba(138,180,248,0.15);color:var(--leaf);border:1px solid var(--bdr2);'
      : 'background:rgba(255,160,100,0.15);color:#f8a25e;border:1px solid rgba(248,162,94,0.3);';
    const blockedBadge = isBlocked ? `<span style="font-size:0.7rem;background:rgba(255,100,100,0.15);color:#f87171;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:600;">Blocked</span>` : '';
      
    return `
      <tr style="${isBlocked ? 'opacity:0.65;' : ''}">
        <td style="display:flex;align-items:center;gap:4px;">${photo}<span>${s.firstName} ${s.lastName}</span>${blockedBadge}</td>
        <td>${s.gradeLevel || s.course || '-'} • ${s.section || '-'}</td>
        <td><span class="spill sp-m">${myAttempts.length} quizzes</span></td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <button onclick="reviewStudentProgress('${s.id}')" style="padding:5px 12px;border-radius:8px;border:1px solid var(--bdr2);background:rgba(138,180,248,0.1);color:var(--leaf);font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(138,180,248,0.25)'" onmouseout="this.style.background='rgba(138,180,248,0.1)'">
              📊 Review
            </button>
            <button onclick="toggleBlockStudent('${s.id}')" style="padding:5px 12px;border-radius:8px;${blockBtnStyle}font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
              ${isBlocked ? '🔓 Unblock' : '🚫 Block'}
            </button>
            <button onclick="removeStudent('${s.id}')" style="padding:5px 12px;border-radius:8px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.1);color:#f87171;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(248,113,113,0.25)'" onmouseout="this.style.background='rgba(248,113,113,0.1)'">
              🗑 Remove
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

// Toggle student blocked state
const toggleBlockStudent = (studentId) => {
  const students = LS.get('students') || [];
  const idx = students.findIndex(s => s.id === studentId);
  if (idx === -1) return;
  
  students[idx].blocked = !students[idx].blocked;
  LS.set('students', students);
  
  // If the student is currently logged in, log them out
  const savedUser = LS.get('currentUser');
  if (savedUser && savedUser.id === studentId && students[idx].blocked) {
    LS.remove('currentUser');
  }
  
  const action = students[idx].blocked ? 'blocked' : 'unblocked';
  toast(`Student ${action} successfully.`, 'ok');
  renderClassStudents();
};

// Remove a student from the class
const removeStudent = (studentId) => {
  openConfirmModal('Remove this student? This will also delete all their quiz attempts.')
    .then(confirmed => {
      if (!confirmed) return;
      let students = LS.get('students') || [];
      students = students.filter(s => s.id !== studentId);
      LS.set('students', students);

      // Remove their quiz attempts
      let attempts = LS.get('quiz_attempts') || [];
      attempts = attempts.filter(a => a.studentId !== studentId);
      LS.set('quiz_attempts', attempts);

      // Remove their user data key
      LS.remove(getUserDataKey(studentId, 'student'));
      LS.remove(`studentData_${studentId}`);

      // If this student is currently logged in, log them out
      const savedUser = LS.get('currentUser');
      if (savedUser && savedUser.id === studentId) LS.remove('currentUser');

      toast('Student removed', 'ok');
      renderClassStudents();
    });
  
  toast('Student removed successfully.', 'ok');
  renderClassStudents();
};

// Review a student's quiz progress (with correct/incorrect breakdown)
const reviewStudentProgress = (studentId) => {
  const students = LS.get('students') || [];
  const student = students.find(s => s.id === studentId);
  if (!student) return;
  
  const quizzes = LS.get('quizzes') || [];
  const allAttempts = LS.get('quiz_attempts') || [];
  const studentAttempts = allAttempts.filter(a => a.studentId === studentId);
  
  // Set modal title
  const titleEl = document.getElementById('studentReviewModalTitle');
  if (titleEl) titleEl.textContent = `Progress Review — ${student.firstName} ${student.lastName}`;
  
  // Student info section
  const infoEl = document.getElementById('student-review-info');
  const photoHtml = student.photoURL
    ? `<img src="${student.photoURL}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--leaf);">`
    : `<div style="width:48px;height:48px;border-radius:50%;background:var(--surf3);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;color:var(--txt2);">${student.firstName[0].toUpperCase()}</div>`;
  
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;">
        ${photoHtml}
        <div>
          <div style="font-weight:700;font-size:1.05rem;color:var(--txth);">${student.firstName} ${student.lastName}</div>
          <div style="font-size:0.82rem;color:var(--txt3);margin-top:2px;">@${student.username} • ${student.gradeLevel || '-'} - ${student.section || '-'}</div>
          <div style="font-size:0.82rem;color:var(--txt2);margin-top:4px;">${studentAttempts.length} quiz attempt(s) total${student.blocked ? ' <span style="color:#f87171;font-weight:600;">[BLOCKED]</span>' : ''}</div>
        </div>
      </div>
    `;
  }
  
  // Attempts list section
  const listEl = document.getElementById('student-review-attempts-list');
  if (!listEl) return;
  
  if (studentAttempts.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--txt3);">This student has not taken any quizzes yet.</div>`;
  } else {
    listEl.innerHTML = studentAttempts.map((attempt, aIdx) => {
      const quiz = quizzes.find(q => q.id === attempt.quizId);
      const quizTitle = quiz ? quiz.title : 'Unknown Quiz';
      const quizType = attempt.type || (quiz ? quiz.type : 'Quiz');
      const isSurvey = quizType === 'Survey Questionnaire';
      const completedAt = new Date(attempt.completedAt).toLocaleString();
      
      const pct = isSurvey ? null : Math.round((attempt.score / attempt.totalQuestions) * 100);
      const statusLabel = isSurvey ? 'Survey' : (pct >= 60 ? `${pct}% \u2014 Passed` : `${pct}% \u2014 Needs Review`);
      const statusColor = isSurvey ? 'var(--sky)' : (pct >= 60 ? 'var(--leaf)' : '#f87171');
      const typeIcon = isSurvey ? '\uD83D\uDCCB' : '\uD83D\uDCDD';
      const scoreText = isSurvey ? 'Completed' : `${attempt.score} / ${attempt.totalQuestions}`;
      const cardId = `attempt-card-${aIdx}`;
      const detailId = `attempt-detail-${aIdx}`;

      // Build questions detail HTML
      let questionsHtml = '';
      if (isSurvey) {
        questionsHtml = `<div style="font-size:0.82rem;color:var(--txt3);padding:8px 0 4px;">Survey responses are not graded.</div>`;
      } else if (quiz && quiz.questions) {
        questionsHtml = quiz.questions.map((q, qIdx) => {
          const studentAns = attempt.answers ? attempt.answers[q.id] : undefined;
          const isCorrect = studentAns !== undefined && studentAns === q.correctAnswer;
          const isSkipped = studentAns === undefined || studentAns === -1;
          const correctText = q.options ? q.options[q.correctAnswer] : 'N/A';
          const studentText = isSkipped ? 'Skipped / Timed Out' : (q.options ? (q.options[studentAns] || 'N/A') : 'N/A');
          const rowBg = isSkipped ? 'rgba(160,160,160,0.08)' : isCorrect ? 'rgba(138,180,248,0.08)' : 'rgba(248,113,113,0.08)';
          const ansColor = isSkipped ? 'var(--txt3)' : isCorrect ? 'var(--leaf)' : '#f87171';
          const borderColor = isSkipped ? 'var(--bdr)' : isCorrect ? 'var(--leaf)' : '#f87171';
          const statusIcon = isSkipped ? '\u23ED' : isCorrect ? '\u2705' : '\u274C';
          return `
            <div style="background:${rowBg};border-radius:8px;padding:10px 14px;margin-bottom:6px;border-left:3px solid ${borderColor};">
              <div style="font-size:0.83rem;font-weight:600;color:var(--txth);margin-bottom:5px;">${statusIcon} Q${qIdx+1}: ${q.text}</div>
              <div style="font-size:0.78rem;display:flex;flex-wrap:wrap;gap:14px;">
                <span>Answer: <strong style="color:${ansColor};">${studentText}</strong></span>
                ${!isCorrect && !isSkipped ? `<span>Correct: <strong style="color:var(--leaf);">${correctText}</strong></span>` : ''}
              </div>
            </div>`;
        }).join('');
      }

      return `
        <div style="background:var(--surf);border:1px solid var(--bdr2);border-radius:14px;overflow:hidden;">
          <!-- Compact header row (always visible) -->
          <div onclick="document.getElementById('${detailId}').style.display = document.getElementById('${detailId}').style.display === 'none' ? 'block' : 'none'; this.querySelector('.chev').style.transform = document.getElementById('${detailId}').style.display === 'none' ? 'rotate(0deg)' : 'rotate(90deg)';"
               style="display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer;user-select:none;transition:background 0.15s;"
               onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='transparent'">
            <!-- Icon -->
            <div style="width:40px;height:40px;border-radius:10px;background:var(--surf2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;">${typeIcon}</div>
            <!-- Text -->
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:0.92rem;color:var(--txth);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${quizTitle}</div>
              <div style="font-size:0.77rem;color:var(--txt3);margin-top:2px;">${quizType} &bull; ${completedAt}</div>
            </div>
            <!-- Score badge + chevron -->
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              <div style="text-align:right;">
                <div style="font-size:0.88rem;font-weight:700;color:var(--txth);">${scoreText}</div>
                <div style="font-size:0.72rem;font-weight:600;color:${statusColor};">${statusLabel}</div>
              </div>
              <span class="chev" style="font-size:1rem;color:var(--txt3);transition:transform 0.2s;display:inline-block;">›</span>
            </div>
          </div>
          <!-- Expandable questions detail -->
          <div id="${detailId}" style="display:none;padding:0 16px 14px;border-top:1px solid var(--bdr);">
            <div style="padding-top:12px;">${questionsHtml}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  openModal('studentReviewModal');
  refreshLucide();
};

// ═══ LEADERBOARD ═══

const renderLeaderboard = () => {
  const list = document.getElementById('student-leaderboard-list');
  if (!list) return;
  
  const students = LS.get('students') || [];
  const quizzes = LS.get('quizzes') || [];
  const comics = LS.get('comics') || [];
  const attempts = LS.get('quiz_attempts') || [];
  const gameAttempts = LS.get('game_attempts') || [];
  
  if (students.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt3);">No student records found to rank.</div>';
    return;
  }
  
  // Get or create filter state
  if (!window.leaderboardFilter) window.leaderboardFilter = 'completed';
  
  // Calculate activity metrics for each student
  const studentMetrics = students.map(s => {
    const sData = LS.get(getUserDataKey(s.id, 'student')) || {};
    const readComics = sData.readComicIds || [];
    
    // Quiz metrics
    const studentAttempts = attempts.filter(a => a.studentId === s.id);
    const quizzesCompleted = studentAttempts.length;
    const avgTimeSeconds = quizzesCompleted > 0 
      ? Math.round(studentAttempts.reduce((sum, a) => sum + (a.timeTakenSeconds || 0), 0) / quizzesCompleted)
      : 0;
    
    // Game metrics
    const studentGameAttempts = gameAttempts.filter(a => a.studentId === s.id && a.completed);
    const gamesCompleted = studentGameAttempts.length;
    const fastestGameTime = studentGameAttempts.length > 0
      ? Math.min(...studentGameAttempts.map(a => a.timeUsedSeconds || 0))
      : 0;
    const avgGameTime = studentGameAttempts.length > 0
      ? Math.round(studentGameAttempts.reduce((sum, a) => sum + (a.timeUsedSeconds || 0), 0) / studentGameAttempts.length)
      : 0;
    
    // Comic metrics
    const totalPagesRead = readComics.reduce((sum, cId) => {
      const comic = comics.find(c => c.id === cId);
      return sum + (comic?.pages?.length || 0);
    }, 0);
    
    return {
      id: s.id,
      name: s.firstName + ' ' + s.lastName,
      username: s.username,
      photoURL: s.photoURL,
      quizzesCompleted,
      avgTimeSeconds,
      gamesCompleted,
      fastestGameTime,
      avgGameTime,
      comicsRead: readComics.length,
      totalPagesRead
    };
  });
  
  // Sort by selected filter
  let ranked = [...studentMetrics];
  const filterValue = window.leaderboardFilter || 'completed';
  
  if (filterValue === 'completed') {
    ranked.sort((a, b) => {
      if (b.quizzesCompleted !== a.quizzesCompleted) return b.quizzesCompleted - a.quizzesCompleted;
      return a.avgTimeSeconds - b.avgTimeSeconds; // Tiebreaker: faster time
    });
  } else if (filterValue === 'fastest') {
    ranked = ranked.filter(s => s.quizzesCompleted > 0);
    ranked.sort((a, b) => a.avgTimeSeconds - b.avgTimeSeconds);
  } else if (filterValue === 'fastest-game') {
    ranked = ranked.filter(s => s.gamesCompleted > 0);
    ranked.sort((a, b) => a.fastestGameTime - b.fastestGameTime);
  } else if (filterValue === 'comics-read') {
    ranked.sort((a, b) => {
      if (b.comicsRead !== a.comicsRead) return b.comicsRead - a.comicsRead;
      return b.totalPagesRead - a.totalPagesRead;
    });
  } else if (filterValue === 'pages-read') {
    ranked.sort((a, b) => b.totalPagesRead - a.totalPagesRead);
  }
  
  // Add filter buttons above leaderboard
  const filterHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:16px;">
      <button class="btn btn-sm ${filterValue === 'completed' ? 'btn-g' : 'btn-ghost'}" onclick="window.leaderboardFilter='completed';renderLeaderboard();">
        📝 Most Quizzes
      </button>
      <button class="btn btn-sm ${filterValue === 'fastest' ? 'btn-g' : 'btn-ghost'}" onclick="window.leaderboardFilter='fastest';renderLeaderboard();">
        ⚡ Fastest Quiz
      </button>
      <button class="btn btn-sm ${filterValue === 'fastest-game' ? 'btn-g' : 'btn-ghost'}" onclick="window.leaderboardFilter='fastest-game';renderLeaderboard();">
        🎮 Fastest Game
      </button>
      <button class="btn btn-sm ${filterValue === 'comics-read' ? 'btn-g' : 'btn-ghost'}" onclick="window.leaderboardFilter='comics-read';renderLeaderboard();">
        📖 Most Comics
      </button>
      <button class="btn btn-sm ${filterValue === 'pages-read' ? 'btn-g' : 'btn-ghost'}" onclick="window.leaderboardFilter='pages-read';renderLeaderboard();">
        📄 Most Pages
      </button>
    </div>
  `;
  
  // Build leaderboard rows
  let leaderboardHtml = filterHtml;
  leaderboardHtml += ranked.map((s, idx) => {
    const isMe = s.username === currentUser.username;
    const rank = idx + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '⭐';
    
    const avHtml = s.photoURL
      ? `<img src="${s.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:36px;height:36px;border-radius:50%;background:var(--surf3);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.95rem;color:var(--txt2);">${s.name[0].toUpperCase()}</div>`;
    
    // Format time
    const formatTime = (seconds) => {
      if (!seconds) return '-';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };
    
    let statText = '';
    if (filterValue === 'completed') {
      statText = `${s.quizzesCompleted} quiz${s.quizzesCompleted !== 1 ? 'zes' : ''} • Avg: ${formatTime(s.avgTimeSeconds)}`;
    } else if (filterValue === 'fastest') {
      statText = `${formatTime(s.avgTimeSeconds)} avg • ${s.quizzesCompleted} completed`;
    } else if (filterValue === 'fastest-game') {
      statText = `${formatTime(s.fastestGameTime)} fastest • ${s.gamesCompleted} completed`;
    } else if (filterValue === 'comics-read') {
      statText = `${s.comicsRead} comic${s.comicsRead !== 1 ? 's' : ''} • ${s.totalPagesRead} pages`;
    } else if (filterValue === 'pages-read') {
      statText = `${s.totalPagesRead} pages • ${s.comicsRead} comic${s.comicsRead !== 1 ? 's' : ''}`;
    }
    
    return `
      <div class="lb-row" style="${isMe ? 'border-color:var(--leaf); background:rgba(138,180,248,0.06);' : ''}">
        <div class="lb-rank">${rank}</div>
        <div class="lb-av">${medal}</div>
        <div style="display:flex;align-items:center;gap:10px;flex:1;">
          ${avHtml}
          <div>
            <div class="lb-name" style="${isMe ? 'font-weight:700;color:var(--leaf);' : ''}">${s.name} ${isMe ? '(You)' : ''}</div>
            <div style="font-size:0.75rem;color:var(--txt3);margin-top:2px;">
              ${statText}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  list.innerHTML = leaderboardHtml;
};

// ═══ COMIC EDITOR PAGE BUILDER ═══
const openComicModalWrapper = (selectedPartId = null) => {
  openComicModal(selectedPartId);
};

const addComicPageEditorWrapper = () => {
  addComicPageEditor();
};

// ═══ NEW ROOMSync & Gating & Profile Picture Helpers ═══
const startRoomSync = () => {
  if (window.roomSyncInterval) clearInterval(window.roomSyncInterval);
  window.roomSyncInterval = setInterval(() => {
    const code = getCurrentRoomCode();
    if (!code) {
      clearInterval(window.roomSyncInterval);
      window.roomSyncInterval = null;
      return;
    }
    if (currentUser) {
      if (currentUser.role === 'student') {
        refreshStudentRoomUI();
      } else {
        refreshTeacherRoomUI();
      }
    }
  }, 1500);
};

// Listen to storage changes for multi-tab real-time sync
window.addEventListener('storage', (e) => {
  if (e.key === 'rooms') {
    if (currentUser) {
      if (currentUser.role === 'student') {
        refreshStudentRoomUI();
      } else {
        refreshTeacherRoomUI();
      }
    }
  }
});



const toggleRoomDropdown = (e) => {
  if (e) e.stopPropagation();
  const menu = document.getElementById('roomDropdownMenu');
  const chevron = document.querySelector('.dropdown-chevron');
  if (menu) {
    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (chevron) {
      chevron.classList.toggle('rotate', !isHidden);
    }
  }
  setStudentTab('room');
};

const togglePartsDropdown = (e) => {
  if (e) e.stopPropagation();
  const btn = e.currentTarget || e.target;
  const container = btn.closest('.sidebar-dropdown-container');
  let menu = container ? container.querySelector('.sidebar-dropdown-menu') : null;
  // fallback: try global parts menu
  if (!menu) menu = document.getElementById('partsDropdownMenu') || document.getElementById('partsDropdownMenuStudent');
  const chevron = container ? container.querySelector('.parts-dropdown-chevron') : document.querySelector('.parts-dropdown-chevron');
  if (menu) {
    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (chevron) chevron.classList.toggle('rotate', !isHidden);
    // keep main Parts button focused when menu open
    try {
      const mainBtn = container ? container.querySelector('.dropdown-toggle') : document.getElementById('sidebar-btn-parts');
      if (mainBtn) mainBtn.classList.toggle('on', !isHidden);
    } catch (err) {}
  }
};

const setPartsActive = (subTab) => {
  // remove active from other sub-btns
  document.querySelectorAll('.sidebar-sub-btn').forEach(btn => btn.classList.remove('on'));
  // find sub-btn matching data-tab or text
  const target = Array.from(document.querySelectorAll('.sidebar-sub-btn')).find(b => (b.dataset.tab === subTab) || b.textContent.toLowerCase().includes(subTab));
  if (target) target.classList.add('on');
  // ensure main Parts button stays active and dropdown open
  const tbtn = document.getElementById('sidebar-btn-parts') || document.getElementById('sidebar-btn-parts-student');
  if (tbtn) tbtn.classList.add('on');
  const partsMenu = document.getElementById('partsDropdownMenu') || document.getElementById('partsDropdownMenuStudent');
  if (partsMenu) partsMenu.classList.remove('hidden');
  const chevron = document.querySelector('.parts-dropdown-chevron');
  if (chevron) chevron.classList.add('rotate');
};

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  try {
    const partsMenus = [document.getElementById('partsDropdownMenu'), document.getElementById('partsDropdownMenuStudent')];
    partsMenus.forEach(menu => {
      if (!menu) return;
      const container = menu.closest('.sidebar-dropdown-container');
      const btn = container ? container.querySelector('.dropdown-toggle') : null;
      if (btn && (btn.contains(e.target) || menu.contains(e.target))) {
        // click inside - ignore
      } else {
        if (!menu.classList.contains('hidden')) menu.classList.add('hidden');
      }
    });

    // room dropdown
    const roomMenu = document.getElementById('roomDropdownMenu');
    const roomBtn = document.getElementById('sidebar-btn-room');
    const roomChevron = document.querySelector('.dropdown-chevron');
    if (roomMenu && roomBtn && !roomBtn.contains(e.target) && !roomMenu.contains(e.target)) {
      if (!roomMenu.classList.contains('hidden')) {
        roomMenu.classList.add('hidden');
        if (roomChevron) roomChevron.classList.remove('rotate');
      }
    }
  } catch (err) {}
});

const goToExistingRoom = (e) => {
  if (e) e.stopPropagation();
  window.forceShowJoinForm = false;
  setStudentTab('room');
};

const joinAnotherRoom = (e) => {
  if (e) e.stopPropagation();
  window.forceShowJoinForm = true;
  setStudentTab('room');
};

const handleProfilePicChange = (input) => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Url = e.target.result;
    
    // Update current user
    currentUser.photoURL = base64Url;
    LS.set('currentUser', currentUser);
    
    // Update matching user in teachers/students list
    if (currentUser.role === 'teacher') {
      const teachers = LS.get('teachers') || [];
      const idx = teachers.findIndex(t => t.id === currentUser.id);
      if (idx !== -1) {
        teachers[idx].photoURL = base64Url;
        LS.set('teachers', teachers);
      }
    } else {
      const students = LS.get('students') || [];
      const idx = students.findIndex(s => s.id === currentUser.id);
      if (idx !== -1) {
        students[idx].photoURL = base64Url;
        LS.set('students', students);
      }
    }
    
    // Update photo URL in active rooms (joinedStudents list & chat messages)
    const rooms = LS.get('rooms') || {};
    let changed = false;
    for (let code in rooms) {
      const r = rooms[code];
      if (currentUser.role === 'student') {
        const studentIdx = r.joinedStudents.findIndex(s => s.id === currentUser.id);
        if (studentIdx !== -1) {
          r.joinedStudents[studentIdx].photoURL = base64Url;
          changed = true;
        }
      }
      r.chatMessages.forEach(msg => {
        if (msg.senderId === currentUser.id) {
          msg.photoURL = base64Url;
          changed = true;
        }
      });
    }
    if (changed) {
      LS.set('rooms', rooms);
    }
    
    // Re-render components
    openUserProfile();
    populateDashboard();
    if (currentUser.role === 'student') {
      refreshStudentRoomUI();
    } else {
      refreshTeacherRoomUI();
    }
    
    toast('Profile picture updated successfully!', 'ok');
  };
  reader.readAsDataURL(file);
};

// ══ Init Hook and Exports ══
document.addEventListener('DOMContentLoaded', () => {
  initAppData();
  
  // Restore theme
  const savedTheme = LS.get('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    const iconEls = document.querySelectorAll('#tico, .theme-ico');
    iconEls.forEach(el => {
      el.setAttribute('data-lucide', savedTheme === 'dark' ? 'moon' : 'sun');
    });
  }
  
  // Add Enter key handlers for chat and room code inputs
  const addEnterKeyHandler = (inputId, actionFn) => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          actionFn();
        }
      });
    }
  };
  
  addEnterKeyHandler('chatInput', sendChat);
  addEnterKeyHandler('s-chatInput', sendStudentChat);
  addEnterKeyHandler('joinRoomCode', joinRoom);
  addEnterKeyHandler('studentJoinRoomCodeInput', handleStudentJoinRoomFromModal);
  
  // Check for saved user
  const savedUser = normalizeSavedUser(LS.get('currentUser'));
  if (savedUser) {
    currentUser = savedUser;
    if (currentUser.role === 'teacher') {
      showScreen('sc-tdash');
      setTeacherTab('home');
      startRoomSync();
    } else {
      const currentCode = getCurrentRoomCode();
      if (currentCode) {
        showScreen('sc-sdash');
        setStudentTab('home');
        startRoomSync();
      } else {
        openStudentJoinRoomModal();
      }
    }
    populateDashboard();
    if (isStudentUser(currentUser)) {
      renderStudentHomeDashboard();
    }
  }
  
  // Initialize lucide icons
  refreshLucide();
});

// Update population metrics with custom calculations
const originalPopulate = populateDashboard;
populateDashboard = () => {
  originalPopulate();
  
  const quizzes = LS.get('quizzes') || [];
  const attempts = LS.get('quiz_attempts') || [];
  const comics = LS.get('comics') || [];
  const students = LS.get('students') || [];
  
  if (currentUser) {
    if (currentUser.role === 'teacher') {
      const qCount = document.getElementById('t-h-quizzes');
      if (qCount) qCount.textContent = quizzes.length;
      const cCount = document.getElementById('t-h-comics');
      if (cCount) cCount.textContent = comics.length;
      const sCount = document.getElementById('t-h-students');
      if (sCount) sCount.textContent = students.length;
      // Render home dashboard cards
      renderTeacherHomeDashboard();
    } else {
      const qTaken = document.getElementById('s-h-quizzes');
      if (qTaken) qTaken.textContent = attempts.filter(att => att.studentId === currentUser.id).length;
      
      const cRead = document.getElementById('s-h-comics');
      const sData = LS.get(getUserDataKey(currentUser.id, 'student')) || {};
      if (cRead) cRead.textContent = sData.comicsRead || 0;
      // Render student home activity
      renderStudentHomeDashboard();
    }
  }
};


// Hook tab rendering into navigation
const originalTeacherTab = setTeacherTab;
setTeacherTab = (tab) => {
  originalTeacherTab(tab);
  if (tab === 'quizzes') renderTeacherQuizzes();
  if (tab === 'reports') renderQuizReports();
  if (tab === 'parts') renderParts();
  if (tab === 'comics') renderComics();
  if (tab === 'class') renderClassStudents();
  if (tab === 'home') renderTeacherHomeDashboard();
};

const originalStudentTab = setStudentTab;
setStudentTab = (tab) => {
  originalStudentTab(tab);
  if (tab === 'quizzes') renderStudentQuizzes();
  if (tab === 'parts') renderParts();
  if (tab === 'comics') renderComics();
  if (tab === 'leaderboard') renderLeaderboard();
  if (tab === 'home') renderStudentHomeDashboard();
};

// ═══ TEACHER HOME DASHBOARD ═══

const renderTeacherHomeDashboard = () => {
  const quizzes = LS.get('quizzes') || [];
  const comics = LS.get('comics') || [];
  const games = getStoredGames();
  const attempts = LS.get('quiz_attempts') || [];
  const parts = getStoredParts();
  const students = LS.get('students') || [];

  const activeParts = parts.filter(p => !isItemLockedNow(p)).length;
  const publishedItems = quizzes.length + comics.length + games.length;
  const topStudents = students
    .map(s => {
      const sData = LS.get(getUserDataKey(s.id, 'student')) || { stars: 0 };
      return { ...s, stars: sData.stars || 0 };
    })
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3);

  const topStudentContainer = document.getElementById('t-home-topstudents');
  if (topStudentContainer) {
    if (!topStudents.length) {
      topStudentContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏅</div>No student progress yet</div>`;
    } else {
      topStudentContainer.innerHTML = topStudents.map((s, idx) => {
        const initials = (s.firstName || 'S')[0] + (s.lastName || 'T')[0];
        return `
          <div class="card" style="display:flex;align-items:center;gap:14px;cursor:default;">
            <div class="role-icon" style="width:48px;height:48px;background:rgba(138,180,248,0.16);border:1px solid rgba(138,180,248,0.25);font-size:1rem;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <h4 style="font-size:0.98rem;margin-bottom:4px;">${s.firstName} ${s.lastName}</h4>
              <p style="font-size:0.82rem;color:var(--txt3);margin:0;">${s.gradeLevel || s.course || '-'} • ${s.section || '-'}</p>
            </div>
            <div style="text-align:right;min-width:64px;">
              <div style="font-size:1.1rem;font-weight:700;color:var(--leaf);">${s.stars}</div>
              <div style="font-size:0.72rem;color:var(--txt3);">Stars</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const partOverviewContainer = document.getElementById('t-home-parts');
  if (partOverviewContainer) {
    if (!parts.length) {
      partOverviewContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div>No lessons added yet</div>`;
    } else {
      partOverviewContainer.innerHTML = parts.slice(0, 3).map(part => {
        const partGames = games.filter(g => isContentLinkedToPart(g.partId, part.id, -1));
        const partQuizzes = quizzes.filter(q => isContentLinkedToPart(q.partId, part.id, -1));
        const partComics = comics.filter(c => isContentLinkedToPart(c.partId, part.id, -1));
        return `
          <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px;cursor:default;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div>
                <h4 style="font-size:1rem;margin:0;">${getPartOrdinalLabel(parts.indexOf(part))}</h4>
                <p style="font-size:0.82rem;color:var(--txt3);margin:4px 0 0;">${part.title || 'Untitled Part'}</p>
              </div>
              <span style="font-size:0.8rem;color:var(--leaf);font-weight:700;">${partGames.length + partQuizzes.length + partComics.length} items</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
              <div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:12px;padding:10px;text-align:center;">
                <div style="font-size:0.95rem;font-weight:700;color:var(--txth);">${partComics.length}</div>
                <div style="font-size:0.72rem;color:var(--txt3);">Comics</div>
              </div>
              <div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:12px;padding:10px;text-align:center;">
                <div style="font-size:0.95rem;font-weight:700;color:var(--txth);">${partQuizzes.length}</div>
                <div style="font-size:0.72rem;color:var(--txt3);">Quizzes</div>
              </div>
              <div style="background:var(--surf2);border:1px solid var(--bdr);border-radius:12px;padding:10px;text-align:center;">
                <div style="font-size:0.95rem;font-weight:700;color:var(--txth);">${partGames.length}</div>
                <div style="font-size:0.72rem;color:var(--txt3);">Games</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const sStudents = document.getElementById('t-h-students');
  if (sStudents) sStudents.textContent = students.length;
  const sParts = document.getElementById('t-h-parts');
  if (sParts) sParts.textContent = parts.length;
  const sQuizzes = document.getElementById('t-h-quizzes');
  if (sQuizzes) sQuizzes.textContent = quizzes.length;
  const sComics = document.getElementById('t-h-comics');
  if (sComics) sComics.textContent = comics.length;
  const sRooms = document.getElementById('t-h-rooms');
  if (sRooms) sRooms.textContent = Object.keys(LS.get('rooms') || {}).length;

  const sActiveParts = document.getElementById('t-h-active-parts');
  if (sActiveParts) sActiveParts.textContent = activeParts;
  const sPublished = document.getElementById('t-h-published-content');
  if (sPublished) sPublished.textContent = publishedItems;
  const sTopics = document.getElementById('t-h-topics');
  if (sTopics) sTopics.textContent = Math.max(parts.length, 1);
  const sEngaged = document.getElementById('t-h-completed-students');
  if (sEngaged) sEngaged.textContent = students.filter(s => {
    const sData = LS.get(getUserDataKey(s.id, 'student')) || {};
    return (sData.stars || 0) > 0;
  }).length;

  refreshLucide();
};

// ═══ STUDENT HOME DASHBOARD ═══

const isStudentUser = (user) => {
  if (!user) return false;
  if (user.role) return String(user.role).toLowerCase() === 'student';
  return 'firstName' in user && 'lastName' in user;
};

const debugStudentRender = (message) => {
  const debugEl = document.getElementById('script-debug');
  if (debugEl) {
    debugEl.textContent += `\n${message}`;
  } else {
    console.log('[StudentRender]', message);
  }
};

const renderStudentHomeDashboard = () => {
  if (!currentUser || !isStudentUser(currentUser)) return;
  const activityList = document.getElementById('s-home-activity');
  if (!activityList) return;
  activityList.innerHTML = '';

  try {
    const quizzes = LS.get('quizzes') || [];
    const comics = LS.get('comics') || [];
    const games = getStoredGames();
    const attempts = LS.get('quiz_attempts') || [];
    const sDataKey = getUserDataKey(currentUser.id, 'student');
    const sData = LS.get(sDataKey) || {};
    const readComics = sData.readComicIds || [];

    const activeItems = [];
    const recentItems = [];

    quizzes.forEach(q => {
      const availability = getQuizAvailability(q);
      const attempted = attempts.find(a => a.quizId === q.id && a.studentId === currentUser.id);
      const quizTitle = q.title || 'Untitled Quiz';
      const quizType = q.type || 'Quiz';
      const quizQuestionCount = Array.isArray(q.questions) ? q.questions.length : 0;

      if (attempted) {
        recentItems.push({
          type: 'quiz',
          icon: '✅',
          iconBg: 'background:rgba(138,180,248,0.12);',
          title: quizTitle,
          sub: `${quizType} — Completed`,
          status: 'done',
          statusText: quizType === 'Survey Questionnaire' ? 'Submitted' : `${attempted.score}/${attempted.totalQuestions}`,
          action: `showQuizResultsById('${q.id}')`,
          sortKey: 1,
        });
      } else if (availability.available) {
        activeItems.push({
          type: 'quiz',
          icon: '📝',
          iconBg: 'background:rgba(122,162,247,0.15);',
          title: quizTitle,
          sub: `${quizType} — ${quizQuestionCount} question${quizQuestionCount !== 1 ? 's' : ''}`,
          status: 'todo',
          statusText: 'Start',
          action: `startStudentQuiz('${q.id}')`,
        });
      } else {
        activeItems.push({
          type: 'quiz',
          icon: '🔒',
          iconBg: 'background:var(--surf3);',
          title: quizTitle,
          sub: availability.reason,
          status: 'locked',
          statusText: 'Locked',
          action: null,
        });
      }
    });

    comics.forEach(c => {
      if (isItemLockedNow(c)) {
        activeItems.push({
          type: 'comic',
          icon: '🔒',
          iconBg: 'background:var(--surf3);',
          title: c.title || 'Untitled Comic',
          sub: getLockStatusLabel(c),
          status: 'locked',
          statusText: 'Locked',
          action: null,
        });
        return;
      }

      const isRead = readComics.includes(c.id);
      const pageCount = Array.isArray(c.pages) ? c.pages.length : 0;
      if (isRead) {
        recentItems.push({
          type: 'comic',
          icon: '📖',
          iconBg: 'background:rgba(138,180,248,0.1);',
          title: c.title || 'Untitled Comic',
          sub: `${pageCount} page${pageCount !== 1 ? 's' : ''} • ${getPartDisplayLabel(c.partId)}`,
          status: 'done',
          statusText: 'Read',
          action: `openComicReader('${c.id}')`,
          sortKey: 1,
        });
      } else {
        activeItems.push({
          type: 'comic',
          icon: '📖',
          iconBg: 'background:rgba(138,180,248,0.1);',
          title: c.title || 'Untitled Comic',
          sub: `${pageCount} page${pageCount !== 1 ? 's' : ''} • ${getPartDisplayLabel(c.partId)}`,
          status: 'todo',
          statusText: 'Read',
          action: `openComicReader('${c.id}')`,
        });
      }
    });

    games.forEach(g => {
      if (isItemLockedNow(g)) {
        activeItems.push({
          type: 'game',
          icon: '🔒',
          iconBg: 'background:var(--surf3);',
          title: g.title || 'Untitled Game',
          sub: getLockStatusLabel(g),
          status: 'locked',
          statusText: 'Locked',
          action: null,
        });
        return;
      }
      activeItems.push({
        type: 'game',
        icon: '🎮',
        iconBg: 'background:rgba(122,162,247,0.15);',
        title: g.title || 'Untitled Game',
        sub: 'Ready to play?',
        status: 'todo',
        statusText: 'Play',
        action: `loadGamePlayer('${g.id}')`,
      });
    });

    if (activeItems.length === 0 && recentItems.length === 0) {
      activityList.innerHTML = `<div style="text-align:center;padding:32px;color:var(--txt3);">
        <div style="font-size:2.5rem;opacity:0.4;margin-bottom:10px;">📚</div>
        Nothing is available yet.<br><small>Ask your teacher to add a quiz, comic, or game here.</small>
      </div>`;
      return;
    }

    let html = '';

    if (recentItems.length > 0) {
      html += `<div style="margin-bottom:20px;">
        <h6 style="font-size:0.8rem;text-transform:uppercase;color:var(--txt3);letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">📌 Recent Activities</h6>`;
      html += recentItems.map(item => `
        <div class="ait" ${item.action ? `onclick="${item.action}"` : 'style="cursor:default;"'}>
          <div class="ait-ico" style="${item.iconBg}">${item.icon}</div>
          <div class="ait-inf">
            <h5>${item.title}</h5>
            <p>${item.sub}</p>
          </div>
          <span class="ait-status ${item.status}">${item.statusText}</span>
        </div>
      `).join('');
      html += '</div>';
    }

    if (activeItems.length > 0) {
      html += `<div style="margin-bottom:0px;">
        <h6 style="font-size:0.8rem;text-transform:uppercase;color:var(--txt3);letter-spacing:0.5px;margin-bottom:10px;font-weight:600;">🎯 Assigned Activities</h6>`;
      html += activeItems.map(item => `
        <div class="ait" ${item.action ? `onclick="${item.action}"` : 'style="cursor:default;"'}>
          <div class="ait-ico" style="${item.iconBg}">${item.icon}</div>
          <div class="ait-inf">
            <h5>${item.title}</h5>
            <p>${item.sub}</p>
          </div>
          <span class="ait-status ${item.status}">${item.statusText}</span>
        </div>
      `).join('');
      html += '</div>';
    }

    activityList.innerHTML = html;
  } catch (err) {
    console.error('renderStudentHomeDashboard failed', err);
    activityList.innerHTML = `<div style="text-align:center;padding:24px;color:var(--txt3);font-size:0.85rem;">Unable to load activities. Refresh or ask your teacher to add content.</div>`;
  }

  refreshLucide();
};

// ═══ QUIZ PROGRESS MODAL ═══

const openQuizProgressModal = (quizId) => {
  const quiz = (LS.get('quizzes') || []).find(q => q.id === quizId);
  if (!quiz) return;

  const attempts = (LS.get('quiz_attempts') || []).filter(a => a.quizId === quizId);
  const students = LS.get('students') || [];

  const titleEl = document.getElementById('prog-modal-title');
  const subtitleEl = document.getElementById('prog-modal-subtitle');
  const bodyEl = document.getElementById('prog-modal-body');

  if (titleEl) titleEl.textContent = quiz.title;
  if (subtitleEl) subtitleEl.textContent = `${quiz.type} • ${quiz.questions.length} questions • ${getPartDisplayLabel(quiz.partId)}`;

  // Stats
  const completedCount = attempts.length;
  const avgScore = quiz.type !== 'Survey Questionnaire' && completedCount > 0
    ? Math.round((attempts.reduce((s, a) => s + a.score, 0) / (completedCount * quiz.questions.length)) * 100)
    : null;
  const allStudentsCount = students.length;

  if (bodyEl) {
    let html = `
      <div class="prog-stats-row">
        <div class="prog-stat">
          <div class="prog-stat-val">${allStudentsCount}</div>
          <div class="prog-stat-lbl">Total Students</div>
        </div>
        <div class="prog-stat">
          <div class="prog-stat-val">${completedCount}</div>
          <div class="prog-stat-lbl">Completed</div>
        </div>
        <div class="prog-stat">
          <div class="prog-stat-val">${allStudentsCount - completedCount}</div>
          <div class="prog-stat-lbl">Not Yet Done</div>
        </div>
        ${avgScore !== null ? `
        <div class="prog-stat">
          <div class="prog-stat-val">${avgScore}%</div>
          <div class="prog-stat-lbl">Avg Score</div>
        </div>` : ''}
      </div>
    `;

    if (completedCount === 0) {
      html += `<div class="empty-state"><div class="empty-state-icon">⏳</div>No students have completed this quiz yet.</div>`;
    } else {
      // Sort by score desc
      const sorted = [...attempts].sort((a, b) => {
        if (quiz.type === 'Survey Questionnaire') return 0;
        return (b.score / b.totalQuestions) - (a.score / a.totalQuestions);
      });

      html += `<div style="margin-top:8px;font-size:0.8rem;color:var(--txt2);margin-bottom:12px;">${quiz.type === 'Survey Questionnaire' ? 'Survey Submissions' : 'Student Scores — click a student to see their question-by-question breakdown'}</div>`;

      sorted.forEach((att, rankIdx) => {
        const student = students.find(s => s.id === att.studentId);
        const pct = quiz.type === 'Survey Questionnaire' ? null : Math.round((att.score / att.totalQuestions) * 100);
        const pillClass = pct === null ? 'prog-score-neutral' : pct >= 60 ? 'prog-score-pass' : 'prog-score-fail';
        const avHtml = student?.photoURL
          ? `<img src="${student.photoURL}">`
          : `<span>${(att.studentName || '?')[0].toUpperCase()}</span>`;
        const completedAt = new Date(att.completedAt).toLocaleString();
        const timeTaken = formatTime(att.timeTakenSeconds || 0);

        // Per-question dots
        let dotsHtml = '';
        if (quiz.type !== 'Survey Questionnaire') {
          dotsHtml = `<div class="prog-question-grid">`;
          quiz.questions.forEach((q, qIdx) => {
            const sAns = att.answers?.[q.id];
            const isCorrect = sAns === q.correctAnswer;
            const isSkipped = sAns === -1 || sAns === undefined;
            let dotClass = isSkipped ? 'skipped' : isCorrect ? 'correct' : 'wrong';
            let dotSymbol = isSkipped ? '–' : isCorrect ? '✓' : '✗';
            dotsHtml += `<div class="prog-q-dot ${dotClass}" title="Q${qIdx+1}: ${q.text.substring(0,40)}">${dotSymbol}</div>`;
          });
          dotsHtml += `</div>`;
        }

        html += `
          <div class="prog-student-row" onclick="this.querySelector('.prog-question-grid') && this.querySelector('.prog-question-grid').classList.toggle('hidden')">
            <div class="prog-student-av">${avHtml}</div>
            <div class="prog-student-info">
              <div class="prog-student-name">#${rankIdx + 1} ${att.studentName}</div>
              <div class="prog-student-detail">Completed: ${completedAt} • Time: ${timeTaken}</div>
              ${dotsHtml}
            </div>
            <div class="prog-mini-bar-wrap" style="${pct === null ? 'display:none;' : ''}">
              <div class="prog-mini-bar-fill" style="width:${pct || 0}%;"></div>
            </div>
            <span class="prog-score-pill ${pillClass}">${pct !== null ? pct + '%' : 'Done'}</span>
          </div>
        `;
      });
    }

    bodyEl.innerHTML = html;
  }

  const modal = document.getElementById('progressModal');
  if (modal) modal.classList.remove('hidden');
  refreshLucide();
};

// ═══ COMIC PROGRESS MODAL ═══

const getComicReaders = (comicId) => {
  const students = LS.get('students') || [];
  const readers = [];
  students.forEach(s => {
    const sData = LS.get(getUserDataKey(s.id, 'student')) || {};
    const readComics = sData.readComicIds || [];
    if (readComics.includes(comicId)) {
      readers.push({ student: s, readAt: sData.comicReadDates?.[comicId] || null });
    }
  });
  return readers;
};

const openComicProgressModal = (comicId) => {
  const comics = LS.get('comics') || [];
  const comic = comics.find(c => c.id === comicId);
  if (!comic) return;

  const readers = getComicReaders(comicId);
  const students = LS.get('students') || [];
  const totalStudents = students.length;

  const titleEl = document.getElementById('prog-modal-title');
  const subtitleEl = document.getElementById('prog-modal-subtitle');
  const bodyEl = document.getElementById('prog-modal-body');

  if (titleEl) titleEl.textContent = comic.title;
  if (subtitleEl) subtitleEl.textContent = `Comic • ${comic.pages.length} pages • ${getPartDisplayLabel(comic.partId)}`;

  if (bodyEl) {
    let html = `
      <div class="prog-stats-row">
        <div class="prog-stat">
          <div class="prog-stat-val">${totalStudents}</div>
          <div class="prog-stat-lbl">Total Students</div>
        </div>
        <div class="prog-stat">
          <div class="prog-stat-val">${readers.length}</div>
          <div class="prog-stat-lbl">Read</div>
        </div>
        <div class="prog-stat">
          <div class="prog-stat-val">${totalStudents - readers.length}</div>
          <div class="prog-stat-lbl">Not Yet Read</div>
        </div>
        <div class="prog-stat">
          <div class="prog-stat-val">${totalStudents > 0 ? Math.round((readers.length / totalStudents) * 100) : 0}%</div>
          <div class="prog-stat-lbl">Completion</div>
        </div>
      </div>
    `;

    if (readers.length === 0) {
      html += `<div class="empty-state"><div class="empty-state-icon">⏳</div>No students have read this comic yet.</div>`;
    } else {
      html += `<div style="margin-top:8px;font-size:0.8rem;color:var(--txt2);margin-bottom:12px;">Students who read this comic</div>`;
      readers.forEach(r => {
        const avHtml = r.student.photoURL
          ? `<img src="${r.student.photoURL}">`
          : `<span>${(r.student.firstName || '?')[0].toUpperCase()}</span>`;
        const whenText = r.readAt ? new Date(r.readAt).toLocaleString() : 'Date unknown';
        html += `
          <div class="comic-reader-row">
            <div class="comic-reader-av">${avHtml}</div>
            <div class="comic-reader-info">
              <div class="comic-reader-name">${r.student.firstName} ${r.student.lastName}</div>
              <div class="comic-reader-when">Read on: ${whenText}</div>
            </div>
            <span class="spill sp-h" style="font-size:0.7rem;">✓ Read</span>
          </div>
        `;
      });
    }

    // Students who haven't read it
    if (totalStudents > readers.length) {
      const readerIds = readers.map(r => r.student.id);
      const notRead = students.filter(s => !readerIds.includes(s.id));
      html += `<div style="margin-top:16px;font-size:0.8rem;color:var(--txt3);margin-bottom:10px;">Haven't read yet (${notRead.length})</div>`;
      notRead.forEach(s => {
        const avHtml = s.photoURL
          ? `<img src="${s.photoURL}">`
          : `<span>${(s.firstName || '?')[0].toUpperCase()}</span>`;
        html += `
          <div class="comic-reader-row" style="opacity:0.6;">
            <div class="comic-reader-av">${avHtml}</div>
            <div class="comic-reader-info">
              <div class="comic-reader-name">${s.firstName} ${s.lastName}</div>
              <div class="comic-reader-when">${s.gradeLevel || s.course} • ${s.section}</div>
            </div>
            <span class="spill sp-m" style="font-size:0.7rem;">Pending</span>
          </div>
        `;
      });
    }

    bodyEl.innerHTML = html;
  }

  const modal = document.getElementById('progressModal');
  if (modal) modal.classList.remove('hidden');
  refreshLucide();
};

// Patch nextComicPage to track which comics a student read
const _origNextComicPage = nextComicPage;
window.nextComicPage = () => {
  if (activeComic && currentUser?.role === 'student') {
    if (comicCurrentPage >= activeComic.pages.length - 1) {
      // Mark comic as read with timestamp
      const sKey = getUserDataKey(currentUser.id, 'student');
      const sData = LS.get(sKey) || {};
      sData.readComicIds = sData.readComicIds || [];
      if (!sData.readComicIds.includes(activeComic.id)) {
        sData.readComicIds.push(activeComic.id);
      }
      sData.comicReadDates = sData.comicReadDates || {};
      sData.comicReadDates[activeComic.id] = new Date().toISOString();
      LS.set(sKey, sData);
    }
  }
  _origNextComicPage();
};


// Bind functions to window context
Object.assign(window, {
  openCreateQuizForm,
  closeCreateQuizForm,
  onQuizTypeChange,
  addQuizQuestionEditor,
  addOptionToCard,
  setCorrectChoice,
  saveNewQuiz,
  deleteQuiz,
  renderTeacherQuizzes,
  renderStudentQuizzes,
  startStudentQuiz,
  selectChoice,
  selectRating,
  handleTextAreaInput,
  prevQuizQuestion,
  nextQuizQuestion,
  exitQuizPlayer,
  submitQuiz,
  showQuizResultsById,
  viewQuizReportDetails,
  closeReportDetails,
  populateDashboard,
  setTeacherTab,
  setStudentTab,
  readPhotoAsBase64,
  handleTeacherSignin,
  handleStudentSignin,
  handleTeacherRegister,
  handleStudentRegister,
  logout,
  togglePass,
  toggleTheme,
  openUserProfile,
  copyRoomCode,
  joinRoom,
  sendChat,
  sendStudentChat,
  handleStudentJoinRoomFromModal,
  sendEmoji,
  closePartModal,
  openPartModal,
  addNewPart,
  deletePart,
  togglePartLock,
  openPartWorkspace,
  closePartWorkspace,
  openCreateQuizFromPart,
  createRoomForPart,
  openTeacherRoomFromPart,
  renderParts,
  openComicModal: openComicModalWrapper,
  addComicPageEditor: addComicPageEditorWrapper,
  readComicPageImage,
  saveComic,
  deleteComic,
  renderComics,
  openComicReader,
  renderComicPage,
  prevComicPage,
  nextComicPage: window.nextComicPage,
  exitComicReader,
  renderClassStudents,
  renderLeaderboard,
  toggleMobileSidebar,
  // New features
  renderTeacherHomeDashboard,
  renderStudentHomeDashboard,
  openQuizProgressModal,
  openComicProgressModal,
  getComicReaders,
  // Custom features
  toggleRoomDropdown,
  goToExistingRoom,
  joinAnotherRoom,
  handleProfilePicChange,
  // Phase 2 features
  reviewStudentProgress,
  toggleBlockStudent,
  removeStudent,
  openQuizQuestionsModal,
  closeQuizQuestionsModal,
  saveQuizQuestionsOnly,
  addQuizQuestionEditor,
  reindexQuizQuestions,
});

