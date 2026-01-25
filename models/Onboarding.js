const mongoose = require('mongoose');

const OnboardingSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  data: {
    // Screen 4 - Training Experience
    trainingExperience: { type: String, enum: ['novice', 'beginner', 'intermediate', 'advanced'] },
    
    // Screen 5 - Goals
    primaryGoal: { type: String, enum: ['lean', 'build-size', 'aesthetics'] },
    secondaryGoals: [{ type: String, enum: ['fix-imbalances', 'increase-conditioning', 'improve-technique'] }],
    
    // Screen 7 - Referral
    referralSource: { type: String, enum: ['tiktok', 'instagram', 'twitter', 'youtube', 'friend', 'coach', 'other'] },
    referralCode: { type: String },
    
    // Screen 8 - AI Experience
    hasUsedAIFitnessApp: { type: Boolean },
    
    // Screen 10 - Gender
    gender: { type: String, enum: ['male', 'female'] },
    
    // Screen 11 - Body Measurements
    heightFeet: { type: Number },
    heightInches: { type: Number },
    weightLbs: { type: Number },
    
    // Screen 12 - Age
    age: { type: Number },
    
    // Screen 13 - Training Setup
    trainingDaysPerWeek: { type: Number },
    equipmentType: { type: String, enum: ['full-gym', 'home-gym', 'bodyweight'] },
    
    // Scan Results
    scanResults: {
      scanId: String,
      mogScore: Number,
      tier: String,
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
      aiPowered: Boolean,
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
OnboardingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Onboarding', OnboardingSchema);
