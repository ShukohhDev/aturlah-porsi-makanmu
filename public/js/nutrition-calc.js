/**
 * Module Perhitungan Metabolisme dan Nutrisi
 * Formula: Mifflin-St Jeor untuk BMR, TDEE, dan Distribusi Makronutrisi
 * Bebas tanda baca emdash dan bebas emoji
 */

window.NutritionCalc = (function() {
  function getAge(birthDateString) {
    if (!birthDateString) return 25;
    const birth = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(10, Math.min(100, isNaN(age) ? 25 : age));
  }

  function calculateBMR(gender, weightKg, heightCm, age) {
    const w = parseFloat(weightKg) || 60;
    const h = parseFloat(heightCm) || 165;
    const a = parseInt(age, 10) || 25;

    let bmr = 0;
    if (gender === 'male' || gender === 'Laki-laki') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }
    return Math.round(bmr);
  }

  function calculateTDEE(bmr, activityLevel) {
    const factors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const factor = factors[activityLevel] || 1.375;
    return Math.round(bmr * factor);
  }

  function calculateTargetCalories(tdee, goal, gender) {
    let cal = tdee;
    if (goal === 'loss') {
      cal = tdee - 500;
      const minCal = (gender === 'male' || gender === 'Laki-laki') ? 1500 : 1200;
      if (cal < minCal) cal = minCal;
    } else if (goal === 'gain') {
      cal = tdee + 500;
    }
    return Math.round(cal);
  }

  function calculateMacros(targetCalories, weightKg) {
    const w = parseFloat(weightKg) || 60;
    const cal = targetCalories || 2000;

    // Protein: 2.0g per kg berat badan
    let proteinGrams = Math.round(w * 2.0);
    let proteinCal = proteinGrams * 4;
    if (proteinCal > cal * 0.35) {
      proteinGrams = Math.round((cal * 0.30) / 4);
      proteinCal = proteinGrams * 4;
    }

    // Lemak: 25% dari total kalori
    const fatCal = cal * 0.25;
    const fatGrams = Math.round(fatCal / 9);

    // Karbohidrat: sisa kalori harian
    const remainingCal = cal - (proteinCal + (fatGrams * 9));
    const carbGrams = Math.max(50, Math.round(remainingCal / 4));

    // Serat: 14g per 1000 kkal
    const fiberGrams = Math.round((cal / 1000) * 14);

    // Batas Gula: maksimal 7% dari total kalori
    const sugarLimitGrams = Math.round((cal * 0.07) / 4);

    return {
      calories: cal,
      protein: proteinGrams,
      fat: fatGrams,
      carbs: carbGrams,
      fiber: fiberGrams,
      sugar: sugarLimitGrams
    };
  }

  return {
    getAge,
    calculateBMR,
    calculateTDEE,
    calculateTargetCalories,
    calculateMacros
  };
})();
