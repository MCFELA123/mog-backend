const mongoose = require('mongoose');

const WorkoutPlanSchema = new mongoose.Schema({
  planId: { type: String }, // Removed unique constraint - not used consistently
  userId: { type: String, required: true, index: true },
  name: String,
  weekId: String,
  mission: String,
  expectedGain: { type: Number, default: 1.0 },
  targets: { type: mongoose.Schema.Types.Mixed, default: [] }, // AI-generated targets for weak points
  currentWeek: { type: Number, default: 1 },
  weeklyPlan: { type: mongoose.Schema.Types.Mixed, default: [] },
  completedHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
  focusAreas: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update updatedAt on save
WorkoutPlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('WorkoutPlan', WorkoutPlanSchema);
