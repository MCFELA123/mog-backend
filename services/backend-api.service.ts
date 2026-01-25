/**
 * API Service for Backend Communication
 * Connects React Native app to Express backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api.config';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKENS: '@mog_auth_tokens',
  USER_DATA: '@mog_user_data',
};

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const tokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    if (tokens) {
      const { accessToken } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - logout
      AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKENS, STORAGE_KEYS.USER_DATA]);
    }
    return Promise.reject(error);
  }
);

export class BackendAPI {
  // ==================== HEALTH CHECK ====================
  static async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // ==================== AUTH ====================
  
  static async signup(data: {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
    onboardingData?: any;
    tempId?: string;
  }) {
    try {
      const response = await apiClient.post('/api/auth/signup', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async verifyEmail(email: string, code: string) {
    try {
      const response = await apiClient.post('/api/auth/verify', { email, code });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async verifyEmailWithPassword(email: string, code: string, password: string) {
    try {
      const response = await apiClient.post('/api/auth/verify', { email, code, password });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async resendVerificationCode(email: string) {
    try {
      const response = await apiClient.post('/api/auth/resend-code', { email });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async login(email: string, password: string) {
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      
      // Store tokens and user data
      if (response.data.success && response.data.tokens) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.AUTH_TOKENS,
          JSON.stringify(response.data.tokens)
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(response.data.user)
        );
      }
      
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async logout() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKENS,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // ==================== USER ====================
  
  static async getProfile(userId: string) {
    try {
      const response = await apiClient.get(`/api/user/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async updateProfile(userId: string, data: any) {
    try {
      const response = await apiClient.put(`/api/user/${userId}`, data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== SCAN ====================
  
  static async analyzeScan(userId: string, frontPhoto: string, backPhoto: string) {
    try {
      // Use longer timeout for AI analysis (can take up to 60+ seconds)
      const response = await apiClient.post('/api/scan/analyze', {
        userId,
        frontPhoto,
        backPhoto,
      }, {
        timeout: 120000, // 2 minute timeout for scan analysis
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async uploadScan(userId: string, photoData: { frontImage: string; backImage: string }) {
    // Use the proper front and back images
    return this.analyzeScan(userId, photoData.frontImage, photoData.backImage);
  }

  static async getScanHistory(userId: string) {
    try {
      const response = await apiClient.get(`/api/scan/history/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== NUTRITION ====================
  
  static async getNutritionTargets(userId: string) {
    try {
      const response = await apiClient.get(`/api/nutrition/targets/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async logMeal(userId: string, mealData: any) {
    try {
      const response = await apiClient.post('/api/nutrition/log', {
        userId,
        ...mealData,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async getMeals(userId: string, date?: string) {
    try {
      const response = await apiClient.get(`/api/nutrition/targets/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== WORKOUT ====================
  
  static async getWorkoutPlan(userId: string) {
    try {
      const response = await apiClient.get(`/api/workout/plan/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async completeExercise(planId: string, exerciseId: string) {
    try {
      const response = await apiClient.post('/api/workout/complete-exercise', {
        planId,
        exerciseId,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async logWorkout(userId: string, workoutData: any) {
    try {
      const response = await apiClient.post('/api/workout/complete-exercise', workoutData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== LEADERBOARD ====================
  
  static async getLeaderboard() {
    try {
      const response = await apiClient.get('/api/leaderboard');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async getUserRank(userId: string) {
    try {
      const response = await apiClient.get(`/api/leaderboard/rank/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== TRAINING ====================

  static async getWeeklyTrainingPlan(userId: string) {
    try {
      const response = await apiClient.get(`/api/training/weekly/${userId}`);
      return response.data;
    } catch (error: any) {
      // If 404, plan needs to be generated
      if (error.response?.status === 404) {
        return { success: false, needsGeneration: true };
      }
      throw error.response?.data || error;
    }
  }

  static async generateWeeklyTrainingPlan(userId: string) {
    try {
      const response = await apiClient.post(`/api/training/generate/${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async generateExerciseImages(userId: string, exerciseId: string, exerciseName: string) {
    try {
      const response = await apiClient.post('/api/training/generate-images', {
        userId,
        exerciseId,
        exerciseName,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async completeTrainingDay(userId: string, weekId: string, dayNumber: number, exercisesData?: { targetMuscles: string[]; exerciseCount: number; formScore?: number }) {
    try {
      const response = await apiClient.post('/api/training/complete-day', {
        userId,
        weekId,
        dayNumber,
        exercisesData, // Include exercises data for AI muscle progress calculation
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // Update muscle progress based on workout data
  static async updateMuscleProgress(userId: string, muscleGains: Record<string, number>) {
    try {
      const response = await apiClient.post('/api/user/update-muscle-progress', {
        userId,
        muscleGains,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  static async startTrainingSession(userId: string, weekId: string, dayNumber: number) {
    try {
      const response = await apiClient.post('/api/training/start-session', {
        userId,
        weekId,
        dayNumber,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }

  // ==================== HELPERS ====================
  
  static async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  static async isAuthenticated() {
    try {
      const tokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      return tokens !== null;
    } catch (error) {
      return false;
    }
  }
}

export default BackendAPI;
