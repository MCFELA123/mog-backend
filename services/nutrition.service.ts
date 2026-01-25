/**
 * Nutrition Service
 * Handles meal tracking, macro calculations, and diet compliance
 */

import { apiClient } from './api.client';
import {
  NutritionDay,
  Meal,
  FoodItem,
  NutritionMode,
  ApiResponse,
} from '../types';

export class NutritionService {
  /**
   * Get today's nutrition data
   */
  static async getTodayNutrition(): Promise<ApiResponse<NutritionDay>> {
    const today = new Date().toISOString().split('T')[0];
    return await apiClient.get<NutritionDay>(`/api/nutrition/day/${today}`);
  }

  /**
   * Get nutrition data for specific date
   */
  static async getNutritionByDate(date: string): Promise<ApiResponse<NutritionDay>> {
    return await apiClient.get<NutritionDay>(`/api/nutrition/day/${date}`);
  }

  /**
   * Add meal (manual entry)
   */
  static async addMeal(meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    items?: FoodItem[];
  }): Promise<ApiResponse<Meal>> {
    return await apiClient.post<Meal>('/api/nutrition/meals', {
      ...meal,
      time: new Date().toISOString(),
      estimationMethod: 'manual',
      isAiEstimated: false,
    });
  }

  /**
   * AI Meal estimation from photo
   */
  static async estimateMealFromPhoto(photoUri: string): Promise<ApiResponse<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    items: FoodItem[];
  }>> {
    try {
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('photo', blob as any, 'meal.jpg');

      return await apiClient.post('/api/nutrition/estimate/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'ESTIMATION_ERROR',
          message: error.message || 'Failed to estimate meal',
        },
      };
    }
  }

  /**
   * AI Meal estimation from text description
   */
  static async estimateMealFromText(description: string): Promise<ApiResponse<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    items: FoodItem[];
  }>> {
    return await apiClient.post('/api/nutrition/estimate/text', {
      description,
    });
  }

  /**
   * Update meal
   */
  static async updateMeal(
    mealId: string,
    data: Partial<Meal>
  ): Promise<ApiResponse<Meal>> {
    return await apiClient.patch<Meal>(`/api/nutrition/meals/${mealId}`, data);
  }

  /**
   * Delete meal
   */
  static async deleteMeal(mealId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete(`/api/nutrition/meals/${mealId}`);
  }

  /**
   * Get weekly nutrition summary
   */
  static async getWeeklySummary(): Promise<ApiResponse<{
    week: string;
    days: NutritionDay[];
    averageCompliance: number;
    totalDaysCompliant: number;
    currentStreak: number;
    averageCalories: number;
    averageProtein: number;
  }>> {
    return await apiClient.get('/api/nutrition/weekly-summary');
  }

  /**
   * Get nutrition mode and targets
   */
  static async getNutritionMode(): Promise<ApiResponse<NutritionMode>> {
    return await apiClient.get<NutritionMode>('/api/nutrition/mode');
  }

  /**
   * Update nutrition mode
   */
  static async updateNutritionMode(mode: {
    mode: 'bulk' | 'cut' | 'maintain' | 'recomp';
    calorieTarget?: number;
    proteinTarget?: number;
    carbTarget?: number;
    fatTarget?: number;
  }): Promise<ApiResponse<NutritionMode>> {
    return await apiClient.post<NutritionMode>('/api/nutrition/mode', mode);
  }

  /**
   * Calculate macro targets based on user goals
   */
  static async calculateTargets(params: {
    weight: number;
    height: number;
    age: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    goal: 'bulk' | 'cut' | 'maintain' | 'recomp';
  }): Promise<ApiResponse<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>> {
    return await apiClient.post('/api/nutrition/calculate-targets', params);
  }

  /**
   * Get nutrition streak
   */
  static async getStreak(): Promise<ApiResponse<{
    currentStreak: number;
    longestStreak: number;
    lastComplianceDate: string;
  }>> {
    return await apiClient.get('/api/nutrition/streak');
  }

  /**
   * Get compliance history
   */
  static async getComplianceHistory(days: number = 30): Promise<ApiResponse<{
    days: Array<{
      date: string;
      isCompliant: boolean;
      compliancePercentage: number;
    }>;
  }>> {
    return await apiClient.get(`/api/nutrition/compliance?days=${days}`);
  }

  /**
   * Simulate AI meal estimation (for development)
   */
  static simulateMealEstimation(description: string): {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    items: FoodItem[];
  } {
    // Simple simulation based on description
    const items: FoodItem[] = [];
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    if (description.toLowerCase().includes('chicken')) {
      items.push({
        name: 'Grilled Chicken Breast',
        quantity: 6,
        unit: 'oz',
        calories: 280,
        protein: 53,
        carbs: 0,
        fats: 6,
      });
      calories += 280;
      protein += 53;
      fats += 6;
    }

    if (description.toLowerCase().includes('rice')) {
      items.push({
        name: 'White Rice',
        quantity: 1,
        unit: 'cup',
        calories: 200,
        protein: 4,
        carbs: 45,
        fats: 0,
      });
      calories += 200;
      protein += 4;
      carbs += 45;
    }

    if (description.toLowerCase().includes('eggs')) {
      items.push({
        name: 'Eggs',
        quantity: 3,
        unit: 'large',
        calories: 210,
        protein: 18,
        carbs: 2,
        fats: 15,
      });
      calories += 210;
      protein += 18;
      carbs += 2;
      fats += 15;
    }

    // Default if nothing matched
    if (items.length === 0) {
      calories = Math.floor(Math.random() * 400) + 300;
      protein = Math.floor(Math.random() * 40) + 20;
      carbs = Math.floor(Math.random() * 50) + 30;
      fats = Math.floor(Math.random() * 20) + 10;
    }

    return {
      name: description,
      calories,
      protein,
      carbs,
      fats,
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      items,
    };
  }
}
