/**
 * Scan Analysis Types for Mog.ai
 */

export interface MuscleBreakdown {
  chest: number;
  shoulders: number;
  back: number;
  arms: number;
  legs: number;
  core: number;
  leanness: number;
}

export type MuscleGroup = keyof Omit<MuscleBreakdown, 'leanness'>;

export type Tier = 
  | 'Final Boss Mogger'
  | 'Mogger'
  | 'Gigachad'
  | 'Chad'
  | 'Chadlite'
  | 'High-Tier Normie'
  | 'Normie'
  | 'Low-Tier Normie'
  | 'Gym Bro'
  | 'Unranked';

export interface ScanAnalysisResult {
  scanId: string;
  userId?: string;
  mogScore: number;
  tier: Tier;
  muscleBreakdown: MuscleBreakdown;
  weakPoints: string[];
  strongPoints: string[];
  symmetry: number;
  overallAssessment: string;
  improvementTips: string[];
  aiPowered: boolean;
  timestamp: string;
}

export interface ScanRequest {
  userId?: string;
  frontPhoto: string | null;  // base64 encoded
  backPhoto: string | null;   // base64 encoded
  onboardingData?: OnboardingData;
}

export interface OnboardingData {
  trainingExperience?: 'novice' | 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: string;
  secondaryGoals?: string[];
  gender?: 'male' | 'female';
  heightFeet?: number;
  heightInches?: number;
  weightLbs?: number;
  age?: number;
  trainingDaysPerWeek?: number;
  equipmentType?: 'full-gym' | 'home-gym' | 'bodyweight';
}

export interface ScanResponse {
  success: boolean;
  scan?: ScanAnalysisResult;
  workoutPlan?: WorkoutPlan;
  error?: string;
}

export interface WorkoutPlan {
  planId: string;
  name: string;
  weeklyPlan: WorkoutDay[];
  focusAreas: string[];
  createdAt: string;
}

export interface WorkoutDay {
  day: number;
  name: string;
  exercises: Exercise[];
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  completed: boolean;
}

// Helper to get tier color
export const getTierColor = (tier: Tier): string => {
  switch (tier) {
    case 'Final Boss Mogger':
      return '#FFD700'; // Gold
    case 'Mogger':
      return '#FF6B00'; // Orange
    case 'Gigachad':
      return '#A259FF'; // Purple
    case 'Chad':
      return '#00FFA3'; // Green
    case 'Chadlite':
      return '#00D1FF'; // Cyan
    case 'High-Tier Normie':
      return '#4CAF50'; // Light Green
    case 'Normie':
      return '#9E9E9E'; // Gray
    case 'Low-Tier Normie':
      return '#757575'; // Dark Gray
    case 'Gym Bro':
      return '#607D8B'; // Blue Gray
    default:
      return '#FFFFFF';
  }
};

// Helper to get tier description
export const getTierDescription = (tier: Tier): string => {
  switch (tier) {
    case 'Final Boss Mogger':
      return 'Elite physique. You are in the top 0.1%';
    case 'Mogger':
      return 'Outstanding development. Competition ready';
    case 'Gigachad':
      return 'Impressive build. Clear dedication shows';
    case 'Chad':
      return 'Above average. Solid muscle development';
    case 'Chadlite':
      return 'Good foundation. Keep pushing';
    case 'High-Tier Normie':
      return 'Better than average. Room for growth';
    case 'Normie':
      return 'Average fitness level. Time to level up';
    case 'Low-Tier Normie':
      return 'Just getting started. Great potential';
    case 'Gym Bro':
      return 'Beginning your journey. Sky is the limit';
    default:
      return 'Complete a scan to get ranked';
  }
};
