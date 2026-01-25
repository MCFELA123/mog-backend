/**
 * TypeScript Types for Mog.ai Backend
 */

// ==================== USER TYPES ====================
export interface User {
  userId: string;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  
  // Profile Data
  profile: UserProfile;
  
  // Onboarding Data
  onboarding: OnboardingData;
  
  // Current Status
  mogScore: number;
  tier: TierLevel;
  rank: number;
  streak: number;
  
  // Subscription
  subscriptionStatus: 'free_trial' | 'active' | 'expired' | 'cancelled';
  subscriptionEndDate?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  age: number;
  weight: number; // lbs
  height: number; // inches
  profilePhotoUrl?: string;
  bio?: string;
  location?: string;
}

export interface OnboardingData {
  // Screen 2: Age
  age: number;
  
  // Screen 3: Weight
  weight: number;
  weightUnit: 'lbs' | 'kg';
  
  // Screen 4: Height
  heightFeet: number;
  heightInches: number;
  heightCm?: number;
  
  // Screen 5: Body Type
  bodyType: 'ectomorph' | 'mesomorph' | 'endomorph';
  
  // Screen 6: Experience Level
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  
  // Screen 7: Workout Frequency
  workoutFrequency: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  
  // Screen 8: Goals
  primaryGoals: Goal[];
  secondaryGoals?: Goal[];
  
  // Screen 9: Training Focus
  trainingFrequency: number;
  equipmentAccess: 'full_gym' | 'limited' | 'bodyweight';
  
  // Screen 10: Injuries/Limitations
  injuries?: string[];
  limitations?: string[];
  
  // Screen 11: Nutrition Preferences
  dietaryRestrictions?: string[];
  mealsPerDay: number;
  
  // Screen 12: Motivation
  motivationLevel: 1 | 2 | 3 | 4 | 5;
  motivationFactors: string[];
  
  // Additional onboarding screens data...
  completedAt?: string;
}

export type Goal = 
  | 'Build Muscle' 
  | 'Get Shredded' 
  | 'Max Tier' 
  | 'Fix Imbalances' 
  | 'V-Taper' 
  | 'Maintain';

export type TierLevel = 
  | 'Final Boss Mogger'
  | 'Apex Mogger'
  | 'Chadlite'
  | 'Fit Normie'
  | 'Tier 5'
  | 'Tier 6'
  | 'Tier 7'
  | 'Tier 8'
  | 'Tier 9'
  | 'Tier 10';

// ==================== SCAN TYPES ====================
export interface PhysiqueScan {
  scanId: string;
  userId: string;
  createdAt: string;
  
  // Photo Data
  frontPhotoUrl: string;
  sidePhotoUrl?: string;
  backPhotoUrl?: string;
  
  // Analysis Results
  mogScore: number;
  tier: TierLevel;
  analysis: ScanAnalysis;
  
  // Measurements
  measurements?: BodyMeasurements;
  
  // Progress
  previousScanId?: string;
  improvementScore?: number;
}

export interface ScanAnalysis {
  // Frame Analysis
  frameScore: number;
  frameNotes: string;
  
  // Muscle Proportions
  proportionScore: number;
  proportionNotes: string;
  muscleGroups: MuscleGroupAnalysis[];
  
  // Limiter Muscles
  limiterMuscles: string[];
  limiterNotes: string;
  
  // Aesthetic Balance
  balanceScore: number;
  balanceNotes: string;
  symmetryScore: number;
  
  // Tier Placement
  tierScore: number;
  tierNotes: string;
  nextTierRequirements: string[];
  
  // Overall
  overallNotes: string;
  recommendations: string[];
}

export interface MuscleGroupAnalysis {
  name: string;
  score: number;
  status: 'strong' | 'adequate' | 'weak' | 'limiter';
  notes: string;
}

export interface BodyMeasurements {
  chest?: number;
  shoulders?: number;
  arms?: number;
  waist?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  bodyFatPercentage?: number;
}

// ==================== NUTRITION TYPES ====================
export interface NutritionDay {
  dayId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  
  // Targets
  calorieTarget: number;
  proteinTarget: number;
  carbTarget?: number;
  fatTarget?: number;
  
  // Actual
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatsConsumed: number;
  
  // Meals
  meals: Meal[];
  
  // Compliance
  compliancePercentage: number;
  isCompliant: boolean;
  
  // Streak
  streakDay: number;
}

export interface Meal {
  mealId: string;
  name: string;
  time: string;
  
  // Macros
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  
  // Photo
  photoUrl?: string;
  
  // AI Estimation
  isAiEstimated: boolean;
  estimationMethod: 'photo' | 'text' | 'manual';
  confidence?: number;
  
  // Items
  items?: FoodItem[];
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionMode {
  mode: 'bulk' | 'cut' | 'maintain' | 'recomp';
  startDate: string;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
}

// ==================== WORKOUT TYPES ====================
export interface WorkoutPlan {
  planId: string;
  userId: string;
  name: string;
  description: string;
  
  // Configuration
  daysPerWeek: number;
  split: string; // e.g., "4-day split", "Push Pull Legs"
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  
  // Days
  workoutDays: WorkoutDay[];
  
  // Progress
  currentWeek: number;
  startDate: string;
  
  // Status
  isActive: boolean;
}

export interface WorkoutDay {
  dayId: string;
  dayName: string; // e.g., "Push Day", "Leg Day"
  dayNumber: number; // 1-7
  
  // Exercises
  exercises: Exercise[];
  
  // Completion
  isCompleted: boolean;
  completedAt?: string;
}

export interface Exercise {
  exerciseId: string;
  name: string;
  targetMuscles: string[];
  
  // Sets & Reps
  sets: number;
  reps: string; // e.g., "8-12", "AMRAP"
  
  // Rest
  restSeconds: number;
  
  // Notes
  instructions?: string;
  videoUrl?: string;
  
  // Progression
  previousWeight?: number;
  currentWeight?: number;
  
  // Completion
  setsCompleted: number;
  isCompleted: boolean;
}

export interface WeeklyMission {
  missionId: string;
  userId: string;
  weekStartDate: string;
  
  // Objectives
  objectives: MissionObjective[];
  
  // Progress
  completedObjectives: number;
  totalObjectives: number;
  progressPercentage: number;
  
  // Rewards
  rewardPoints?: number;
  rewardBadge?: string;
  
  // Status
  isCompleted: boolean;
  completedAt?: string;
}

export interface MissionObjective {
  objectiveId: string;
  title: string;
  description: string;
  type: 'workout' | 'nutrition' | 'scan' | 'social';
  
  // Target
  targetValue: number;
  currentValue: number;
  
  // Status
  isCompleted: boolean;
}

// ==================== LEADERBOARD TYPES ====================
export interface LeaderboardEntry {
  userId: string;
  username: string;
  profilePhotoUrl?: string;
  
  // Score
  mogScore: number;
  tier: TierLevel;
  
  // Rank
  globalRank: number;
  localRank?: number;
  
  // Stats
  totalScans: number;
  improvementScore?: number;
  streakDays: number;
  
  // Badge
  badge?: string;
  
  // Timestamp
  lastUpdated: string;
}

export interface LeaderboardQuery {
  type: 'global' | 'local' | 'friends';
  limit?: number;
  offset?: number;
  location?: string;
}

// ==================== API REQUEST/RESPONSE TYPES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  age?: number;
  weight?: number;
  height?: number;
  profilePhotoUrl?: string;
  bio?: string;
  location?: string;
}

// ==================== STORAGE TYPES ====================
export interface StorageKeys {
  AUTH_TOKENS: string;
  USER_DATA: string;
  ONBOARDING_PROGRESS: string;
  OFFLINE_DATA: string;
}
