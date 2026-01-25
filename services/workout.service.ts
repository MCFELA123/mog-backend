/**
 * Workout Service
 * Handles workout plans, exercises, and training tracking
 */

import { apiClient } from './api.client';
import {
  WorkoutPlan,
  WorkoutDay,
  Exercise,
  WeeklyMission,
  ApiResponse,
} from '../types';

export class WorkoutService {
  /**
   * Get user's active workout plan
   */
  static async getActivePlan(): Promise<ApiResponse<WorkoutPlan>> {
    return await apiClient.get<WorkoutPlan>('/api/workouts/active-plan');
  }

  /**
   * Generate personalized workout plan
   */
  static async generatePlan(params: {
    goals: string[];
    daysPerWeek: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    equipmentAccess: 'full_gym' | 'limited' | 'bodyweight';
    injuries?: string[];
    focusAreas?: string[];
  }): Promise<ApiResponse<WorkoutPlan>> {
    return await apiClient.post<WorkoutPlan>('/api/workouts/generate-plan', params);
  }

  /**
   * Get workout day by ID
   */
  static async getWorkoutDay(dayId: string): Promise<ApiResponse<WorkoutDay>> {
    return await apiClient.get<WorkoutDay>(`/api/workouts/days/${dayId}`);
  }

  /**
   * Complete a workout
   */
  static async completeWorkout(
    dayId: string,
    exercises: Array<{
      exerciseId: string;
      setsCompleted: number;
      weight?: number;
      reps?: number;
      notes?: string;
    }>
  ): Promise<ApiResponse<WorkoutDay>> {
    return await apiClient.post<WorkoutDay>(`/api/workouts/days/${dayId}/complete`, {
      exercises,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Log exercise set
   */
  static async logSet(
    exerciseId: string,
    data: {
      weight: number;
      reps: number;
      setNumber: number;
    }
  ): Promise<ApiResponse<any>> {
    return await apiClient.post(`/api/workouts/exercises/${exerciseId}/sets`, data);
  }

  /**
   * Get exercise library
   */
  static async getExercises(params?: {
    muscleGroup?: string;
    equipment?: string;
    difficulty?: string;
  }): Promise<ApiResponse<Exercise[]>> {
    const queryParams = new URLSearchParams(params as any).toString();
    return await apiClient.get<Exercise[]>(`/api/workouts/exercises?${queryParams}`);
  }

  /**
   * Get exercise details with video
   */
  static async getExerciseDetails(exerciseId: string): Promise<ApiResponse<Exercise>> {
    return await apiClient.get<Exercise>(`/api/workouts/exercises/${exerciseId}`);
  }

  /**
   * Get workout history
   */
  static async getWorkoutHistory(limit: number = 30): Promise<ApiResponse<WorkoutDay[]>> {
    return await apiClient.get<WorkoutDay[]>(`/api/workouts/history?limit=${limit}`);
  }

  /**
   * Get current weekly mission
   */
  static async getCurrentMission(): Promise<ApiResponse<WeeklyMission>> {
    return await apiClient.get<WeeklyMission>('/api/workouts/mission/current');
  }

  /**
   * Update mission objective progress
   */
  static async updateMissionProgress(
    objectiveId: string,
    progress: number
  ): Promise<ApiResponse<WeeklyMission>> {
    return await apiClient.patch<WeeklyMission>(`/api/workouts/mission/objectives/${objectiveId}`, {
      currentValue: progress,
    });
  }

  /**
   * Complete mission objective
   */
  static async completeMissionObjective(
    objectiveId: string
  ): Promise<ApiResponse<WeeklyMission>> {
    return await apiClient.post<WeeklyMission>(`/api/workouts/mission/objectives/${objectiveId}/complete`, {});
  }

  /**
   * Get mission history
   */
  static async getMissionHistory(): Promise<ApiResponse<WeeklyMission[]>> {
    return await apiClient.get<WeeklyMission[]>('/api/workouts/mission/history');
  }

  /**
   * Update workout plan
   */
  static async updatePlan(
    planId: string,
    data: Partial<WorkoutPlan>
  ): Promise<ApiResponse<WorkoutPlan>> {
    return await apiClient.patch<WorkoutPlan>(`/api/workouts/plans/${planId}`, data);
  }

  /**
   * Delete workout plan
   */
  static async deletePlan(planId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete(`/api/workouts/plans/${planId}`);
  }

  /**
   * Get workout stats
   */
  static async getWorkoutStats(): Promise<ApiResponse<{
    totalWorkouts: number;
    currentWeek: number;
    completionRate: number;
    averageWorkoutsPerWeek: number;
    strongestMuscleGroups: string[];
    focusAreas: string[];
  }>> {
    return await apiClient.get('/api/workouts/stats');
  }
}
