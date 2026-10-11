const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder and database.json exist (adaptif untuk Vercel /tmp dan lokal)
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Gagal membuat direktori data:', e.message);
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        {
          id: 'admin_1',
          username: 'Shukoh#Dev',
          password: 'FAFA17052007',
          role: 'admin',
          profile: null,
          createdAt: new Date().toISOString()
        }
      ],
      meals: [],
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
    
    // Ensure admin user exists
    const adminExists = parsed.users.some(u => u.username === 'Shukoh#Dev');
    if (!adminExists) {
      parsed.users.push({
        id: 'admin_1',
        username: 'Shukoh#Dev',
        password: 'FAFA17052007',
        role: 'admin',
        profile: null,
        createdAt: new Date().toISOString()
      });
      writeDB(parsed);
    }

    // Pastikan hak akses admin hanya untuk Shukoh#Dev, pengguna lain selalu berstatus user
    let modified = false;
    parsed.users.forEach(u => {
      if (u.username !== 'Shukoh#Dev' && u.role === 'admin') {
        u.role = 'user';
        modified = true;
      }
    });
    // Pastikan array reports tersedia
    if (!Array.isArray(parsed.reports)) {
      parsed.reports = [];
      modified = true;
    }

    if (modified) {
      writeDB(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading database file, reinitializing:', err);
    const initialData = {
      users: [
        {
          id: 'admin_1',
          username: 'Shukoh#Dev',
          password: 'FAFA17052007',
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
  return process.env.GEMINI_API_KEY || (db.systemSettings && db.systemSettings.geminiApiKey) || '';
}

// Auth API: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nama akun dan kata sandi wajib diisi.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.username.trim() === username.trim() && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Nama akun atau kata sandi tidak cocok.' });
  }

  res.json({
    success: true,
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
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nama akun dan kata sandi wajib diisi.' });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.toLowerCase() === 'shukoh#dev') {
    return res.status(403).json({ success: false, message: 'Nama akun Shukoh#Dev diproteksi khusus sebagai administrator utama.' });
  }

  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, message: 'Nama akun minimal 3 karakter.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 4 karakter.' });
  }

  const db = readDB();
  const exists = db.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(409).json({ success: false, message: 'Nama akun sudah terdaftar. Silakan pilih nama lain atau langsung login.' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username: cleanUsername,
    password: password,
    role: 'user', // Pengguna baru selalu berstatus user, tidak pernah diberikan hak admin
    profile: null,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({
    success: true,
    message: 'Pendaftaran berhasil. Silakan lengkapi data profil gizi Anda.',
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      hasProfile: false,
      profile: null
    }
  });
});

// Admin API: Ambil seluruh akun terdaftar (Eksklusif Shukoh#Dev)
app.get('/api/admin/users', (req, res) => {
  const { adminId } = req.query;
  const db = readDB();

  const requester = db.users.find(u => u.id === adminId);
  if (!requester || requester.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hak admin hanya dimiliki secara eksklusif oleh akun Shukoh#Dev.' });
  }

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

// Admin API: Hapus akun pengguna (Eksklusif Shukoh#Dev)
app.delete('/api/admin/users/:userId', (req, res) => {
  const { adminId } = req.query;
  const { userId } = req.params;
  const db = readDB();

  const requester = db.users.find(u => u.id === adminId);
  if (!requester || requester.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hak admin hanya dimiliki secara eksklusif oleh akun Shukoh#Dev.' });
  }

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
  writeDB(db);

  res.json({ success: true, message: 'Akun pengguna berhasil dihapus dari sistem.' });
});

// ============================================================================
// Report & Feedback API (Kritik, Saran, Bug Pengguna)
// ============================================================================

// 1. Pengguna membuat laporan baru (Kritik, Saran, Bug)
app.post('/api/reports', (req, res) => {
  const { userId, category, title, description } = req.body;
  if (!userId || !category || !title || !description) {
    return res.status(400).json({ success: false, message: 'Kategori, judul, dan isi laporan wajib diisi.' });
  }

  const validCategories = ['bug', 'saran', 'kritik'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ success: false, message: 'Kategori laporan tidak valid. Pilih bug, saran, atau kritik.' });
  }

  const cleanTitle = title.trim();
  const cleanDesc = description.trim();
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
    status: 'baru', // 'baru' (Baru Saja), 'proses' (Sedang Diproses), 'selesai' (Sudah Selesai)
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

// 2. Pengguna mengambil daftar laporan milik akunnya
app.get('/api/reports', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'ID pengguna wajib disertakan.' });
  }

  const db = readDB();
  const userReports = (db.reports || [])
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    reports: userReports
  });
});

// 3. Khusus Admin Shukoh#Dev: Ambil seluruh laporan pengguna
app.get('/api/admin/reports', (req, res) => {
  const { adminId } = req.query;
  const db = readDB();

  const requester = db.users.find(u => u.id === adminId);
  if (!requester || requester.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Fitur laporan admin khusus untuk akun Shukoh#Dev.' });
  }

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

// 4. Khusus Admin Shukoh#Dev: Ubah status laporan ('baru', 'proses', 'selesai')
app.patch('/api/admin/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const { adminId, status, adminNote } = req.body;
  const db = readDB();

  const requester = db.users.find(u => u.id === adminId);
  if (!requester || requester.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hak admin hanya dimiliki secara eksklusif oleh akun Shukoh#Dev.' });
  }

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
    report.adminNote = adminNote.trim();
  }
  report.updatedAt = new Date().toISOString();
  writeDB(db);

  res.json({
    success: true,
    message: 'Status laporan berhasil diperbarui.',
    report
  });
});

// 5. Khusus Admin Shukoh#Dev: Hapus laporan
app.delete('/api/admin/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const { adminId } = req.query;
  const db = readDB();

  const requester = db.users.find(u => u.id === adminId);
  if (!requester || requester.username !== 'Shukoh#Dev') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }

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

// Profile API: Save/Update Profile
app.post('/api/user/profile', (req, res) => {
  const { userId, name, gender, height, weight, birthDate, activityLevel, goal, targetWeight } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID tidak ditemukan.' });
  }

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

  // Macro calculation
  // Protein: 2.0g per kg body weight (optimal for muscle retention and satiety)
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

  // Fiber: 14g per 1000 kcal (standard dietary guidelines)
  const fiberGrams = Math.round((targetCalories / 1000) * 14);

  // Sugar limit: 7% of total calories (under WHO max recommendation of 10%)
  const maxSugarGrams = Math.round((targetCalories * 0.07) / 4);

  const profileData = {
    name,
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

// Profile API: Get Profile
app.get('/api/user/profile/:userId', (req, res) => {
  const { userId } = req.params;
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

// Meals API: Get Daily Summary & Meals
app.get('/api/meals', (req, res) => {
  const { userId, date } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID diperlukan.' });
  }

  const targetDate = date || new Date().toISOString().split('T')[0];
  const db = readDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  const userMeals = (db.meals || []).filter(m => m.userId === userId && m.date === targetDate);

  // Sum total consumed
  const consumed = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
    sugar: 0
  };

  userMeals.forEach(m => {
    consumed.calories += Number(m.totalCalories || 0);
    consumed.protein += Number(m.totalProtein || 0);
    consumed.fat += Number(m.totalFat || 0);
    consumed.carbs += Number(m.totalCarbs || 0);
    consumed.fiber += Number(m.totalFiber || 0);
    consumed.sugar += Number(m.totalSugar || 0);
  });

  // Round values
  for (const k in consumed) {
    consumed[k] = Math.round(consumed[k] * 10) / 10;
  }

  const quota = (user.profile && user.profile.dailyQuota) ? user.profile.dailyQuota : {
    calories: 2000,
    protein: 100,
    fat: 60,
    carbs: 250,
    fiber: 28,
    sugar: 40
  };

  const remaining = {
    calories: Math.max(0, Math.round(quota.calories - consumed.calories)),
    protein: Math.max(0, Math.round(quota.protein - consumed.protein)),
    fat: Math.max(0, Math.round(quota.fat - consumed.fat)),
    carbs: Math.max(0, Math.round(quota.carbs - consumed.carbs)),
    fiber: Math.max(0, Math.round(quota.fiber - consumed.fiber)),
    sugar: Math.max(0, Math.round(quota.sugar - consumed.sugar))
  };

  // Group meals by mealType
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

// Meals API: Save Confirmed Meal
app.post('/api/meals', (req, res) => {
  const { userId, mealType, foodName, components, totalNutrition, date, imageUrl } = req.body;

  if (!userId || !foodName || !Array.isArray(components)) {
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
    foodName,
    imageUrl: imageUrl || '',
    totalCalories: Math.round(totalNutrition.calories || 0),
    totalProtein: Math.round((totalNutrition.protein || 0) * 10) / 10,
    totalFat: Math.round((totalNutrition.fat || 0) * 10) / 10,
    totalCarbs: Math.round((totalNutrition.carbs || 0) * 10) / 10,
    totalFiber: Math.round((totalNutrition.fiber || 0) * 10) / 10,
    totalSugar: Math.round((totalNutrition.sugar || 0) * 10) / 10,
    components: components.map(c => ({
      name: c.name || 'Bahan makanan',
      weightGrams: parseFloat(c.weightGrams) || 0,
      calories: Math.round(parseFloat(c.calories) || 0),
      protein: Math.round((parseFloat(c.protein) || 0) * 10) / 10,
      fat: Math.round((parseFloat(c.fat) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(c.carbs) || 0) * 10) / 10,
      sugar: Math.round((parseFloat(c.sugar) || 0) * 10) / 10,
      fiber: Math.round((parseFloat(c.fiber) || 0) * 10) / 10,
      notes: c.notes || ''
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

// Meals API: Delete Meal
app.delete('/api/meals/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const initialLength = (db.meals || []).length;
  db.meals = (db.meals || []).filter(m => m.id !== id);

  if (db.meals.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Data makanan tidak ditemukan.' });
  }

  writeDB(db);
  res.json({ success: true, message: 'Catatan makanan berhasil dihapus.' });
});

// Gemini Vision Food Analysis Endpoint
app.post('/api/analyze-food', async (req, res) => {
  const { imageBase64, mimeType, clientApiKey } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Data gambar tidak ditemukan.' });
  }

  const apiKey = clientApiKey || getGeminiKey();

  // If no API key is set anywhere, return realistic simulation with notification
  if (!apiKey) {
    return res.json({
      success: true,
      isSimulation: true,
      apiKeyConfigured: false,
      message: 'Gemini API Key belum dikonfigurasi. Menampilkan hasil estimasi simulasi cerdas. Anda dapat memasukkan API Key di menu Pengaturan.',
      analysis: generateIntelligentFallbackAnalysis()
    });
  }

  try {
    // Clean base64 string
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

    // Call Gemini via fetch API (v1beta)
    // Model choices: gemini-2.5-flash or gemini-1.5-flash
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

    // If 2.5 flash is unavailable or fails, fallback to gemini-1.5-flash
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
      console.error('Gemini API Error Response:', errText);
      // Return helpful message
      let parsedErr;
      try { parsedErr = JSON.parse(errText); } catch(e) {}
      const errMsg = (parsedErr && parsedErr.error && parsedErr.error.message) || 'Gagal menghubungi Gemini Vision API.';
      
      // Fallback with note
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
      // Clean possible fences
      const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', parseErr, candidateText);
      throw new Error('Format respon Gemini tidak sesuai dengan skema JSON terstruktur.');
    }

    res.json({
      success: true,
      isSimulation: false,
      apiKeyConfigured: true,
      analysis: parsedResult
    });

  } catch (error) {
    console.error('Food analysis error:', error);
    res.json({
      success: true,
      isSimulation: true,
      apiKeyConfigured: !!apiKey,
      warning: `Terjadi kendala saat analisis: ${error.message}. Menampilkan estimasi gizi cadangan.`,
      analysis: generateIntelligentFallbackAnalysis()
    });
  }
});

// Settings API: Status
app.get('/api/settings/status', (req, res) => {
  const currentKey = getGeminiKey();
  res.json({
    success: true,
    hasApiKey: !!currentKey,
    maskedKey: currentKey ? currentKey.substring(0, 4) + '...' + currentKey.substring(currentKey.length - 4) : ''
  });
});

// Settings API: Update API Key
app.post('/api/settings/key', (req, res) => {
  const { apiKey } = req.body;
  const db = readDB();
  if (!db.systemSettings) db.systemSettings = {};
  db.systemSettings.geminiApiKey = (apiKey || '').trim();
  writeDB(db);

  // Also update process.env for runtime
  process.env.GEMINI_API_KEY = (apiKey || '').trim();

  // Try updating .env file
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

// Fallback intelligent analyzer for instant zero-friction demo testing
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

  // Return a realistic item
  const selected = samples[Math.floor(Math.random() * samples.length)];
  return selected;
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server Aturlah Porsi Makanmu berjalan pada port http://localhost:${PORT}`);
  });
}

module.exports = app;
