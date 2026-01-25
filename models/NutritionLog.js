const mongoose = require('mongoose');

const NutritionLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  logId: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  calories: Number,
  protein: Number,
  carbs: Number,
  fats: Number,
  meal: Object,
});

module.exports = mongoose.model('NutritionLog', NutritionLogSchema);
