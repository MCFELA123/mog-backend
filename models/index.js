/**
 * MongoDB Models for Mog.ai
 */

const mongoose = require('mongoose');

// =====================================================
// USER SCHEMA
// =====================================================
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  verificationCode: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  mogScore: {
    type: Number,
    default: 0,
  },
  tier: {
    type: String,
    default: 'Unranked',
  },
  streak: {
    type: Number,
    default: 0,
  },
  onboardingData: {
    trainingExperience: String,
    primaryGoal: String,
    secondaryGoals: [String],
    referralSource: String,
    referralCode: String,
    hasUsedAIFitnessApp: Boolean,
    gender: String,
    heightFeet: Number,
    heightInches: Number,
    weightLbs: Number,
    age: Number,
    trainingDaysPerWeek: Number,
    equipmentType: String,
  },
}, {
  timestamps: true,
});

// =====================================================
// SCAN SCHEMA
// =====================================================
const scanSchema = new mongoose.Schema({
  scanId: {
    type: String,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  mogScore: {
    type: Number,
    required: true,
  },
  tier: {
    type: String,
    required: true,
  },
  muscleBreakdown: {
    chest: Number,
    shoulders: Number,
    back: Number,
    arms: Number,
    legs: Number,
    core: Number,
    leanness: Number,
  },
  weakPoints: [String],
  strongPoints: [String],
  symmetry: Number,
  overallAssessment: String,
  improvementTips: [String],
  scanSteps: [{
    label: String,
    status: String,
  }],
  aiPowered: {
    type: Boolean,
    default: false,
  },
  frontPhotoUrl: String,
  backPhotoUrl: String,
}, {
  timestamps: true,
});

// =====================================================
// WORKOUT PLAN SCHEMA
// =====================================================
const exerciseSchema = new mongoose.Schema({
  name: String,
  muscle: String,
  sets: Number,
  reps: String,
  completed: {
    type: Boolean,
    default: false,
  },
});

const workoutDaySchema = new mongoose.Schema({
  day: Number,
  name: String,
  exercises: [exerciseSchema],
  completed: {
    type: Boolean,
    default: false,
  },
});

const workoutPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: String,
  weeklyPlan: [workoutDaySchema],
  focusAreas: [String],
}, {
  timestamps: true,
});

// =====================================================
// NUTRITION LOG SCHEMA
// =====================================================
const nutritionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mealName: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fats: Number,
  date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// =====================================================
// LEADERBOARD ENTRY SCHEMA
// =====================================================
const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  username: String,
  mogScore: Number,
  tier: String,
  rank: Number,
}, {
  timestamps: true,
});

// Create models
const User = mongoose.model('User', userSchema);
const Scan = mongoose.model('Scan', scanSchema);
const WorkoutPlan = mongoose.model('WorkoutPlan', workoutPlanSchema);
const NutritionLog = mongoose.model('NutritionLog', nutritionLogSchema);
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = {
  User,
  Scan,
  WorkoutPlan,
  NutritionLog,
  Leaderboard,
};
