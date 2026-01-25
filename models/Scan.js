const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  scanId: { type: String, unique: true },
  userId: { type: String, required: true },
  mogScore: Number,
  tier: String,
  muscleBreakdown: Object,
  weakPoints: [String],
  strongPoints: [String],
  symmetry: Number,
  overallAssessment: String,
  improvementTips: [String],
  aiPowered: Boolean,
  frontPhotoUrl: String,
  backPhotoUrl: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Scan', ScanSchema);
