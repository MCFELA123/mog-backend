/**
 * User Service
 * Handles all user-related API calls
 */

import { apiClient } from './api.client';
import {
  User,
  UpdateProfileRequest,
  OnboardingData,
  ApiResponse,
} from '../types';

export class UserService {
  /**
   * Get current user profile
   */
  static async getProfile(): Promise<ApiResponse<User>> {
    return await apiClient.get<User>('/api/user/profile');
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<User>> {
    return await apiClient.put<User>('/api/user/profile', data);
  }

  /**
   * Save onboarding data
   */
  static async saveOnboarding(data: Partial<OnboardingData>): Promise<ApiResponse<User>> {
    return await apiClient.post<User>('/api/user/onboarding', data);
  }

  /**
   * Complete onboarding
   */
  static async completeOnboarding(data: OnboardingData): Promise<ApiResponse<User>> {
    return await apiClient.post<User>('/api/user/onboarding/complete', {
      ...data,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Get user stats
   */
  static async getUserStats(): Promise<ApiResponse<{
    totalScans: number;
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
    mogScore: number;
    tier: string;
    rank: number;
  }>> {
    return await apiClient.get('/api/user/stats');
  }

  /**
   * Update user photo
   */
  static async updatePhoto(photoUrl: string): Promise<ApiResponse<User>> {
    return await apiClient.patch<User>('/api/user/photo', { photoUrl });
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete('/api/user/account');
  }

  /**
   * Get user preferences
   */
  static async getPreferences(): Promise<ApiResponse<{
    notifications: boolean;
    emailUpdates: boolean;
    privacyMode: boolean;
    units: 'metric' | 'imperial';
  }>> {
    return await apiClient.get('/api/user/preferences');
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(preferences: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacyMode?: boolean;
    units?: 'metric' | 'imperial';
  }): Promise<ApiResponse<any>> {
    return await apiClient.patch('/api/user/preferences', preferences);
  }
}
