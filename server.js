const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aturlah_porsi_makanmu_jwt_secret_token_2026_x89a';
const ADMIN_DEFAULT_PASS = process.env.ADMIN_DEFAULT_PASSWORD || 'FAFA17052007';

// 1. HTTP Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 2. CORS Policy
app.use(cors({
  origin: true,
  credentials: true
}));

// 3. Body Parsers with limits
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. Rate Limiting Middleware
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300, // Maks 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba kembali beberapa saat lagi.' }
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Maks 30 percobaan auth per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan autentikasi. Silakan tunggu beberapa saat sebelum mencoba lagi.' }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40, // Maks 40 kali analisis per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Batas frekuensi analisis makanan tercapai. Harap tunggu beberapa saat.' }
});

// 5. Ensure data folder and database.json exist (adaptif untuk Vercel /tmp dan lokal)
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Gagal membuat direktori data:', e.message);
}

// Security Helper: Sanitasi string teks untuk mencegah XSS
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

// Security Helper: Password Hashing & Verification
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword || !plainPassword) return false;
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return bcrypt.compareSync(plainPassword, storedPassword);
  }
  // Fallback plain-text match (akan langsung di-migrasi ke bcrypt)
  return plainPassword === storedPassword;
}

// Security Helper: JWT Token Generation & Middleware
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan atau belum login. Akses ditolak.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin' || req.user.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Fitur ini khusus hanya untuk administrator utama Shukoh#Dev.' });
  }
  next();
}

// Security Helper: Sanitasi objek user (jangan pernah kirim password ke frontend)
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        {
          id: 'admin_1',
          username: 'Shukoh#Dev',
          password: hashPassword(ADMIN_DEFAULT_PASS),
          role: 'admin',
          profile: null,
          createdAt: new Date().toISOString()
        }
      ],
      meals: [],
      reports: [],
      systemSettings: {
        geminiApiKey: process.env.GEMINI_API_KEY || ''
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    let modified = false;

    // Pastikan array users tersedia
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
      modified = true;
    }

    // Ensure admin user exists
    const adminUser = parsed.users.find(u => u.username === 'Shukoh#Dev');
    if (!adminUser) {
      parsed.users.push({
        id: 'admin_1',
        username: 'Shukoh#Dev',
        password: hashPassword(ADMIN_DEFAULT_PASS),
        role: 'admin',
        profile: null,
        createdAt: new Date().toISOString()
      });
      modified = true;
    }

    // Auto-migrate seluruh password teks biasa ke bcrypt hash
    parsed.users.forEach(u => {
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        u.password = hashPassword(u.password);
        modified = true;
      }
    });

    // Pastikan hak akses admin hanya untuk Shukoh#Dev
    parsed.users.forEach(u => {
      if (u.username !== 'Shukoh#Dev' && u.role === 'admin') {
        u.role = 'user';
        modified = true;
      }
    });

    // Pastikan array reports dan meals tersedia
    if (!Array.isArray(parsed.reports)) {
      parsed.reports = [];
      modified = true;
    }
    if (!Array.isArray(parsed.meals)) {
      parsed.meals = [];
      modified = true;
    }

    if (modified) {
      writeDB(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading database file, reinitializing:', err.message);
    const initialData = {
      users: [
        {
          id: 'admin_1',
          username: 'Shukoh#Dev',
          password: hashPassword(ADMIN_DEFAULT_PASS),
          role: 'admin',
          profile: null,
          createdAt: new Date().toISOString()
        }
      ],
      meals: [],
      reports: [],
      systemSettings: {
        geminiApiKey: process.env.GEMINI_API_KEY || ''
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper to get active Gemini API key
function getGeminiKey() {
  const db = readDB();
  const rawKey = process.env.GEMINI_API_KEY || (db.systemSettings && db.systemSettings.geminiApiKey) || '';
  return rawKey.trim();
}

// ============================================================================
// 1. Auth APIs
// ============================================================================

// Auth API: Login
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nama akun dan kata sandi wajib diisi.' });
  }

  const cleanUsername = sanitizeText(username);
  const db = readDB();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Nama akun atau kata sandi tidak cocok.' });
  }

  // Jika password belum di-hash, update otomatis
  if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    user.password = hashPassword(password);
    writeDB(db);
  }

  const token = generateToken(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      hasProfile: !!user.profile,
      profile: user.profile
    }
  });
});

// Auth API: Register
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nama akun dan kata sandi wajib diisi.' });
  }

  const cleanUsername = sanitizeText(username);
  if (cleanUsername.toLowerCase() === 'shukoh#dev') {
    return res.status(403).json({ success: false, message: 'Nama akun Shukoh#Dev diproteksi khusus sebagai administrator utama.' });
  }

  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, message: 'Nama akun minimal 3 karakter.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter demi keamanan akun Anda.' });
  }

  const db = readDB();
  const exists = db.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(409).json({ success: false, message: 'Nama akun sudah terdaftar. Silakan gunakan nama lain atau langsung masuk.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: cleanUsername,
    password: hashPassword(password),
    role: 'user', // Pengguna baru selalu berstatus user biasa
    profile: null,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  const token = generateToken(newUser);

  res.json({
    success: true,
    message: 'Pendaftaran berhasil. Silakan lengkapi data profil gizi Anda.',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      hasProfile: false,
      profile: null
    }
  });
});

// ============================================================================
// 2. Admin APIs (Eksklusif Shukoh#Dev, Dilindungi Token JWT)
// ============================================================================

// Admin API: Ambil seluruh akun terdaftar
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const db = readDB();

  const userList = db.users.map(u => {
    const mealCount = (db.meals || []).filter(m => m.userId === u.id).length;
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt || new Date().toISOString(),
      hasProfile: !!u.profile,
      profile: u.profile ? {
        name: u.profile.name,
        gender: u.profile.gender,
        height: u.profile.height,
        weight: u.profile.weight,
        targetWeight: u.profile.targetWeight,
        goal: u.profile.goal,
        activityLevel: u.profile.activityLevel,
        dailyCalories: u.profile.dailyQuota ? u.profile.dailyQuota.calories : 0
      } : null,
      mealCount
    };
  });

  res.json({
    success: true,
    totalUsers: userList.length,
    users: userList
  });
});

// Admin API: Hapus akun pengguna
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  if (targetUser.username === 'Shukoh#Dev') {
    return res.status(400).json({ success: false, message: 'Akun administrator utama tidak dapat dihapus.' });
  }

  db.users = db.users.filter(u => u.id !== userId);
  if (db.meals) {
    db.meals = db.meals.filter(m => m.userId !== userId);
  }
  if (db.reports) {
    db.reports = db.reports.filter(r => r.userId !== userId);
  }
  writeDB(db);

  res.json({ success: true, message: 'Akun pengguna berhasil dihapus dari sistem.' });
});

// Admin API: Ambil seluruh laporan masukan pengguna
app.get('/api/admin/reports', authenticateToken, requireAdmin, (req, res) => {
  const db = readDB();
  const allReports = (db.reports || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const stats = {
    total: allReports.length,
    baru: allReports.filter(r => r.status === 'baru').length,
    proses: allReports.filter(r => r.status === 'proses').length,
    selesai: allReports.filter(r => r.status === 'selesai').length
  };

  res.json({
    success: true,
    stats,
    reports: allReports
  });
});

// Admin API: Ubah status laporan
app.patch('/api/admin/reports/:reportId', authenticateToken, requireAdmin, (req, res) => {
  const { reportId } = req.params;
  const { status, adminNote } = req.body;
  const db = readDB();

  const validStatuses = ['baru', 'proses', 'selesai'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Status tidak valid. Pilihan status: baru, proses, selesai.' });
  }

  const report = (db.reports || []).find(r => r.id === reportId);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
  }

  report.status = status;
  if (typeof adminNote === 'string') {
    report.adminNote = sanitizeText(adminNote);
  }
  report.updatedAt = new Date().toISOString();
  writeDB(db);

  res.json({
    success: true,
    message: 'Status laporan berhasil diperbarui.',
    report
  });
});

// Admin API: Hapus laporan
app.delete('/api/admin/reports/:reportId', authenticateToken, requireAdmin, (req, res) => {
  const { reportId } = req.params;
  const db = readDB();

  const reportExists = (db.reports || []).some(r => r.id === reportId);
  if (!reportExists) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
  }

  db.reports = (db.reports || []).filter(r => r.id !== reportId);
  writeDB(db);

  res.json({
    success: true,
    message: 'Laporan berhasil dihapus.'
  });
});

// ============================================================================
// 3. Reports API (Pengguna Umum)
// ============================================================================

// Pengguna membuat laporan baru (Kritik, Saran, Bug)
app.post('/api/reports', authenticateToken, (req, res) => {
  const { category, title, description } = req.body;
  const userId = req.user.id;

  if (!category || !title || !description) {
    return res.status(400).json({ success: false, message: 'Kategori, judul, dan isi laporan wajib diisi.' });
  }

  const validCategories = ['bug', 'saran', 'kritik'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: 'Kategori laporan tidak valid. Pilih bug, saran, atau kritik.' });
  }

  const cleanTitle = sanitizeText(title);
  const cleanDesc = sanitizeText(description);
  if (cleanTitle.length < 3) {
    return res.status(400).json({ success: false, message: 'Judul laporan minimal 3 karakter.' });
  }
  if (cleanDesc.length < 5) {
    return res.status(400).json({ success: false, message: 'Isi laporan minimal 5 karakter.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  const newReport = {
    id: 'rep_' + Date.now(),
    userId: user.id,
    username: user.username,
    category: category,
    title: cleanTitle,
    description: cleanDesc,
    status: 'baru',
    adminNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!db.reports) db.reports = [];
  db.reports.unshift(newReport);
  writeDB(db);

  res.json({
    success: true,
    message: 'Laporan Anda berhasil dikirim ke administrator. Anda dapat memantau status tindak lanjutnya pada riwayat laporan.',
    report: newReport
  });
});

// Pengguna mengambil riwayat laporan miliknya (IDOR Proteksi)
app.get('/api/reports', authenticateToken, (req, res) => {
  const db = readDB();
  const userReports = (db.reports || [])
    .filter(r => r.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    reports: userReports
  });
});

// ============================================================================
// 4. Profile & Nutrition Calculator APIs (Dilindungi Token & Anti-IDOR)
// ============================================================================

// Save/Update Profile
app.post('/api/user/profile', authenticateToken, (req, res) => {
  const { name, gender, height, weight, birthDate, activityLevel, goal, targetWeight } = req.body;
  const userId = req.user.id; // Diambil dari token JWT sesi aman

  const numHeight = parseFloat(height);
  const numWeight = parseFloat(weight);
  const numTargetWeight = targetWeight !== undefined && targetWeight !== null && targetWeight !== '' ? parseFloat(targetWeight) : numWeight;

  if (!name || !gender || isNaN(numHeight) || isNaN(numWeight) || !birthDate || !activityLevel || !goal) {
    return res.status(400).json({ success: false, message: 'Semua kolom data diri wajib diisi dengan benar.' });
  }

  // Calculate age from birthDate
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 5 || age > 120) {
    age = Math.max(10, Math.min(100, isNaN(age) ? 25 : age));
  }

  // Mifflin-St Jeor formula for BMR
  let bmr = 0;
  if (gender === 'male' || gender === 'Laki-laki') {
    bmr = (10 * numWeight) + (6.25 * numHeight) - (5 * age) + 5;
  } else {
    bmr = (10 * numWeight) + (6.25 * numHeight) - (5 * age) - 161;
  }
  bmr = Math.round(bmr);

  // Activity multipliers
  const activityFactors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  const factor = activityFactors[activityLevel] || 1.375;
  const tdee = Math.round(bmr * factor);

  // Daily calorie quota based on goal
  let targetCalories = tdee;
  if (goal === 'loss') {
    targetCalories = tdee - 500;
    const minCalories = (gender === 'male' || gender === 'Laki-laki') ? 1500 : 1200;
    if (targetCalories < minCalories) targetCalories = minCalories;
  } else if (goal === 'gain') {
    targetCalories = tdee + 500;
  }
  targetCalories = Math.round(targetCalories);

  // Protein: 2.0g per kg target body weight
  let proteinGrams = Math.round(numWeight * 2.0);
  let proteinCalories = proteinGrams * 4;
  if (proteinCalories > targetCalories * 0.35) {
    proteinGrams = Math.round((targetCalories * 0.30) / 4);
    proteinCalories = proteinGrams * 4;
  }

  // Fat: 25% of target calories
  const fatCalories = targetCalories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbohydrates: remaining calories
  const remainingCalories = targetCalories - (proteinCalories + (fatGrams * 9));
  const carbGrams = Math.max(50, Math.round(remainingCalories / 4));

  // Fiber: 14g per 1000 kcal
  const fiberGrams = Math.round((targetCalories / 1000) * 14);

  // Sugar limit: 7% of total calories
  const maxSugarGrams = Math.round((targetCalories * 0.07) / 4);

  const profileData = {
    name: sanitizeText(name),
    gender,
    height: numHeight,
    weight: numWeight,
    birthDate,
    age,
    activityLevel,
    goal,
    targetWeight: goal === 'maintain' ? numWeight : numTargetWeight,
    bmr,
    tdee,
    dailyQuota: {
      calories: targetCalories,
      protein: proteinGrams,
      fat: fatGrams,
      carbs: carbGrams,
      fiber: fiberGrams,
      sugar: maxSugarGrams
    },
    updatedAt: new Date().toISOString()
  };

  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  db.users[userIndex].profile = profileData;
  writeDB(db);

  res.json({
    success: true,
    message: 'Data profil dan target nutrisi berhasil disimpan.',
    profile: profileData
  });
});

// Get Profile (IDOR Safe)
app.get('/api/user/profile/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;

  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses profil ditolak.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }
  res.json({
    success: true,
    profile: user.profile
  });
});

// ============================================================================
// 5. Meals API (Dilindungi Token & Anti-IDOR)
// ============================================================================

// Get Meals & Daily Consumption (IDOR Safe)
app.get('/api/meals', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];
  const db = readDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  const quota = (user.profile && user.profile.dailyQuota) ? user.profile.dailyQuota : {
    calories: 2000,
    protein: 100,
    fat: 60,
    carbs: 250,
    fiber: 25,
    sugar: 40
  };

  // Ambil hanya makanan milik user yang sedang aktif pada tanggal tertentu
  const userMeals = (db.meals || []).filter(m => m.userId === userId && m.date === targetDate);

  const consumed = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0
  };

  userMeals.forEach(meal => {
    consumed.calories += Number(meal.totalCalories) || 0;
    consumed.protein += Number(meal.totalProtein) || 0;
    consumed.fat += Number(meal.totalFat) || 0;
    consumed.carbs += Number(meal.totalCarbs) || 0;
    consumed.fiber += Number(meal.totalFiber) || 0;
    consumed.sugar += Number(meal.totalSugar) || 0;
  });

  consumed.calories = Math.round(consumed.calories);
  consumed.protein = Math.round(consumed.protein * 10) / 10;
  consumed.fat = Math.round(consumed.fat * 10) / 10;
  consumed.carbs = Math.round(consumed.carbs * 10) / 10;
  consumed.fiber = Math.round(consumed.fiber * 10) / 10;
  consumed.sugar = Math.round(consumed.sugar * 10) / 10;

  const remaining = {
    calories: Math.max(0, quota.calories - consumed.calories),
    protein: Math.max(0, Math.round((quota.protein - consumed.protein) * 10) / 10),
    fat: Math.max(0, Math.round((quota.fat - consumed.fat) * 10) / 10),
    carbs: Math.max(0, Math.round((quota.carbs - consumed.carbs) * 10) / 10),
    fiber: Math.max(0, Math.round((quota.fiber - consumed.fiber) * 10) / 10),
    sugar: Math.max(0, Math.round((quota.sugar - consumed.sugar) * 10) / 10)
  };

  const grouped = {
    breakfast: userMeals.filter(m => m.mealType === 'breakfast'),
    lunch: userMeals.filter(m => m.mealType === 'lunch'),
    dinner: userMeals.filter(m => m.mealType === 'dinner'),
    snack: userMeals.filter(m => m.mealType === 'snack')
  };

  res.json({
    success: true,
    date: targetDate,
    quota,
    consumed,
    remaining,
    grouped,
    meals: userMeals
  });
});

// Save Confirmed Meal
app.post('/api/meals', authenticateToken, (req, res) => {
  const { mealType, foodName, components, totalNutrition, date, imageUrl } = req.body;
  const userId = req.user.id; // Enforce user ID dari token JWT

  if (!foodName || !Array.isArray(components) || !totalNutrition) {
    return res.status(400).json({ success: false, message: 'Data makanan tidak lengkap.' });
  }

  const db = readDB();
  const mealId = 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const mealDate = date || new Date().toISOString().split('T')[0];

  const newMeal = {
    id: mealId,
    userId,
    date: mealDate,
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    mealType: mealType || 'lunch',
    foodName: sanitizeText(foodName),
    imageUrl: imageUrl || '',
    totalCalories: Math.round(totalNutrition.calories || 0),
    totalProtein: Math.round((totalNutrition.protein || 0) * 10) / 10,
    totalFat: Math.round((totalNutrition.fat || 0) * 10) / 10,
    totalCarbs: Math.round((totalNutrition.carbs || 0) * 10) / 10,
    totalFiber: Math.round((totalNutrition.fiber || 0) * 10) / 10,
    totalSugar: Math.round((totalNutrition.sugar || 0) * 10) / 10,
    components: components.map(c => ({
      name: sanitizeText(c.name || 'Bahan makanan'),
      weightGrams: parseFloat(c.weightGrams) || 0,
      calories: Math.round(parseFloat(c.calories) || 0),
      protein: Math.round((parseFloat(c.protein) || 0) * 10) / 10,
      fat: Math.round((parseFloat(c.fat) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(c.carbs) || 0) * 10) / 10,
      sugar: Math.round((parseFloat(c.sugar) || 0) * 10) / 10,
      fiber: Math.round((parseFloat(c.fiber) || 0) * 10) / 10,
      notes: sanitizeText(c.notes || '')
    })),
    createdAt: new Date().toISOString()
  };

  if (!db.meals) db.meals = [];
  db.meals.push(newMeal);
  writeDB(db);

  res.json({
    success: true,
    message: 'Makanan berhasil dicatat dalam riwayat gizi harian.',
    meal: newMeal
  });
});

// Delete Meal (IDOR Safe)
app.delete('/api/meals/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const targetMeal = (db.meals || []).find(m => m.id === id);
  if (!targetMeal) {
    return res.status(404).json({ success: false, message: 'Data makanan tidak ditemukan.' });
  }

  // Hanya pemilik makanan atau admin yang boleh menghapus
  if (targetMeal.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menghapus data makanan ini.' });
  }

  db.meals = (db.meals || []).filter(m => m.id !== id);
  writeDB(db);

  res.json({ success: true, message: 'Catatan makanan berhasil dihapus.' });
});

// ============================================================================
// 6. Gemini Vision Food Analysis Endpoint (Dilindungi Rate Limiter)
// ============================================================================

app.post('/api/analyze-food', aiLimiter, async (req, res) => {
  const { imageBase64, mimeType, clientApiKey } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Data gambar tidak ditemukan.' });
  }

  const apiKey = (clientApiKey ? clientApiKey.trim() : getGeminiKey());

  // Jika belum ada API key, berikan hasil simulasi cerdas
  if (!apiKey) {
    return res.json({
      success: true,
      isSimulation: true,
      apiKeyConfigured: false,
      message: 'Gemini API Key belum dikonfigurasi. Menampilkan hasil estimasi simulasi cerdas.',
      analysis: generateIntelligentFallbackAnalysis()
    });
  }

  try {
    const cleanedBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const actualMimeType = mimeType || 'image/jpeg';

    const systemPrompt = `Anda adalah asisten ahli nutrisi dan gizi klinis presisi tinggi.
Tugas Anda adalah menganalisis foto makanan pada piring/wadah dengan cermat.
Instruksi ketat:
1. Kenali seluruh elemen/komponen makanan yang tampak di piring.
2. Estimasi porsi bobot nyata dalam satuan gram untuk masing-masing komponen berdasarkan ukuran piring standar dan densitas makanan.
3. Hitung estimasi kandungan gizi masing-masing komponen: Kalori (kkal), Protein (g), Lemak (g), Karbohidrat (g), Gula (g), dan Serat (g).
4. Berikan total akumulasi seluruh komponen.
5. Format keluaran HARUS berupa JSON murni tanpa markdown, tanpa teks pembuka atau penutup, persis mengikuti struktur berikut:
{
  "foodName": "Nama ringkas hidangan utama dalam Bahasa Indonesia",
  "description": "Deskripsi objektif singkat mengenai porsi dan sajian makanan",
  "totalEstimatedWeightGrams": 0,
  "components": [
    {
      "name": "Nama komponen makanan spesifik",
      "weightGrams": 0,
      "calories": 0,
      "protein": 0,
      "fat": 0,
      "carbs": 0,
      "sugar": 0,
      "fiber": 0,
      "notes": "keterangan singkat metode masak atau tekstur"
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "fat": 0,
    "carbs": 0,
    "sugar": 0,
    "fiber": 0
  }
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: actualMimeType,
                data: cleanedBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok && response.status === 404) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error Response status:', response.status);
      let parsedErr;
      try { parsedErr = JSON.parse(errText); } catch(e) {}
      const errMsg = (parsedErr && parsedErr.error && parsedErr.error.message) || 'Gagal menghubungi Gemini API.';
      
      return res.json({
        success: true,
        isSimulation: true,
        apiKeyConfigured: true,
        warning: `Panggilan API mengembalikan respon: ${errMsg}. Menggunakan estimasi gizi cerdas cadangan.`,
        analysis: generateIntelligentFallbackAnalysis()
      });
    }

    const data = await response.json();
    const candidateText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

    if (!candidateText) {
      throw new Error('Tidak ada respon teks yang diterima dari model Gemini.');
    }

    let parsedResult;
    try {
      const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      throw new Error('Format respon Gemini tidak sesuai dengan skema JSON terstruktur.');
    }

    res.json({
      success: true,
      isSimulation: false,
      apiKeyConfigured: true,
      analysis: parsedResult
    });

  } catch (error) {
    console.error('Food analysis error:', error.message);
    res.json({
      success: true,
      isSimulation: true,
      apiKeyConfigured: !!apiKey,
      warning: `Terjadi kendala saat analisis. Menampilkan estimasi gizi cadangan.`,
      analysis: generateIntelligentFallbackAnalysis()
    });
  }
});

// ============================================================================
// 7. Settings APIs
// ============================================================================

// Status API
app.get('/api/settings/status', (req, res) => {
  const currentKey = getGeminiKey();
  res.json({
    success: true,
    hasApiKey: !!currentKey,
    maskedKey: currentKey ? currentKey.substring(0, 4) + '...' + currentKey.substring(currentKey.length - 4) : ''
  });
});

// Update API Key (Eksklusif Admin Shukoh#Dev)
app.post('/api/settings/key', authenticateToken, requireAdmin, (req, res) => {
  const { apiKey } = req.body;
  const db = readDB();
  if (!db.systemSettings) db.systemSettings = {};
  db.systemSettings.geminiApiKey = (apiKey || '').trim();
  writeDB(db);

  process.env.GEMINI_API_KEY = (apiKey || '').trim();

  try {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${(apiKey || '').trim()}`);
    } else {
      envContent += `\nGEMINI_API_KEY=${(apiKey || '').trim()}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    console.warn('Could not update .env file directly:', e.message);
  }

  res.json({
    success: true,
    message: 'Gemini API Key berhasil disimpan dan diaktifkan.'
  });
});

// ============================================================================
// 8. Fallback Intelligent Analyzer
// ============================================================================

function generateIntelligentFallbackAnalysis() {
  const samples = [
    {
      foodName: 'Nasi Dada Ayam Panggang dan Sayuran',
      description: 'Porsi seimbang yang terdiri dari sumber karbohidrat nasi putih, protein dada ayam tanpa kulit, dan sayuran brokoli rebus.',
      totalEstimatedWeightGrams: 370,
      components: [
        {
          name: 'Nasi Putih Pulen',
          weightGrams: 150,
          calories: 195,
          protein: 4.1,
          fat: 0.5,
          carbs: 42.0,
          sugar: 0.1,
          fiber: 0.6,
          notes: 'Porsi sedang 1 mangkuk centong'
        },
        {
          name: 'Dada Ayam Panggang',
          weightGrams: 140,
          calories: 231,
          protein: 43.4,
          fat: 5.0,
          carbs: 0.0,
          sugar: 0.0,
          fiber: 0.0,
          notes: 'Dipanggang dengan sedikit rempah dan minyak zaitun'
        },
        {
          name: 'Brokoli dan Wortel Rebus',
          weightGrams: 80,
          calories: 28,
          protein: 2.1,
          fat: 0.3,
          carbs: 5.6,
          sugar: 1.8,
          fiber: 2.4,
          notes: 'Sayuran matang kukus segar'
        }
      ],
      totalNutrition: {
        calories: 454,
        protein: 49.6,
        fat: 5.8,
        carbs: 47.6,
        sugar: 1.9,
        fiber: 3.0
      }
    },
    {
      foodName: 'Nasi Telur Ceplok dan Tempe Orek',
      description: 'Hidangan rumahan populer dengan sumber protein nabati tempe dan hewani telur ayam.',
      totalEstimatedWeightGrams: 320,
      components: [
        {
          name: 'Nasi Putih',
          weightGrams: 150,
          calories: 195,
          protein: 4.0,
          fat: 0.5,
          carbs: 42.0,
          sugar: 0.1,
          fiber: 0.6,
          notes: '1 porsi standar'
        },
        {
          name: 'Telur Ceplok Goreng',
          weightGrams: 60,
          calories: 110,
          protein: 7.2,
          fat: 8.8,
          carbs: 0.4,
          sugar: 0.2,
          fiber: 0.0,
          notes: 'Digoreng minyak standar'
        },
        {
          name: 'Orek Tempe Manis Gurih',
          weightGrams: 80,
          calories: 156,
          protein: 11.2,
          fat: 7.4,
          carbs: 12.0,
          sugar: 4.5,
          fiber: 2.8,
          notes: 'Kecap manis dan bawang'
        },
        {
          name: 'Timun Segar Iris',
          weightGrams: 30,
          calories: 5,
          protein: 0.2,
          fat: 0.0,
          carbs: 1.1,
          sugar: 0.5,
          fiber: 0.3,
          notes: 'Lalapan mentah'
        }
      ],
      totalNutrition: {
        calories: 466,
        protein: 22.6,
        fat: 16.7,
        carbs: 55.5,
        sugar: 5.3,
        fiber: 3.7
      }
    }
  ];

  return samples[Math.floor(Math.random() * samples.length)];
}

// ============================================================================
// 9. 404 & Global Error Handlers (Anti Leaking Error Stack Traces)
// ============================================================================

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled Internal Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan sistem internal pada server. Silakan coba kembali nanti.'
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server Aturlah Porsi Makanmu berjalan pada port http://localhost:${PORT}`);
  });
}

module.exports = app;
