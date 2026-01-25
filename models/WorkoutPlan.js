const mongoose = require('mongoose');

const WorkoutPlanSchema = new mongoose.Schema({
  planId: { type: String, unique: true },
  userId: { type: String, required: true },
  name: String,
  weeklyPlan: [Object],
  focusAreas: [String],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WorkoutPlan', WorkoutPlanSchema);
