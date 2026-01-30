const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  username: String,
  firstName: String,
  lastName: String,
  verificationCode: String,
  resetCode: String,
  resetCodeExpiry: Date,
  isVerified: { type: Boolean, default: false },
  mogScore: { type: Number, default: 0 },
  tier: { type: String, default: 'Unranked' },
  streak: { type: Number, default: 0 },
  totalWorkouts: { type: Number, default: 0 },
  lastWorkoutDate: Date,
  latestScan: { type: mongoose.Schema.Types.Mixed },
  weeklyTrainingPlan: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
