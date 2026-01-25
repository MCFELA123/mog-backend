/**
 * Leaderboard Service
 * Handles rankings, social features, and competition
 */

import { apiClient } from './api.client';
import {
  LeaderboardEntry,
  LeaderboardQuery,
  ApiResponse,
} from '../types';

export class LeaderboardService {
  /**
   * Get global leaderboard
   */
  static async getGlobalLeaderboard(params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    entries: LeaderboardEntry[];
    userRank: number;
    totalUsers: number;
  }>> {
    const queryParams = new URLSearchParams({
      limit: String(params?.limit || 50),
      offset: String(params?.offset || 0),
    }).toString();

    return await apiClient.get(`/api/leaderboard/global?${queryParams}`);
  }

  /**
   * Get local leaderboard (by location)
   */
  static async getLocalLeaderboard(params?: {
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    entries: LeaderboardEntry[];
    userRank: number;
    totalUsers: number;
  }>> {
    const queryParams = new URLSearchParams({
      location: params?.location || '',
      limit: String(params?.limit || 50),
      offset: String(params?.offset || 0),
    }).toString();

    return await apiClient.get(`/api/leaderboard/local?${queryParams}`);
  }

  /**
   * Get friends leaderboard
   */
  static async getFriendsLeaderboard(): Promise<ApiResponse<{
    entries: LeaderboardEntry[];
    userRank: number;
  }>> {
    return await apiClient.get('/api/leaderboard/friends');
  }

  /**
   * Get top moggers (top 3 globally)
   */
  static async getTopMoggers(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return await apiClient.get('/api/leaderboard/top-moggers');
  }

  /**
   * Get user's rank
   */
  static async getUserRank(): Promise<ApiResponse<{
    globalRank: number;
    localRank: number;
    percentile: number;
    tier: string;
  }>> {
    return await apiClient.get('/api/leaderboard/my-rank');
  }

  /**
   * Get leaderboard by tier
   */
  static async getTierLeaderboard(tier: string, limit: number = 50): Promise<ApiResponse<{
    entries: LeaderboardEntry[];
    userRank: number;
  }>> {
    return await apiClient.get(`/api/leaderboard/tier/${tier}?limit=${limit}`);
  }

  /**
   * Search users
   */
  static async searchUsers(query: string): Promise<ApiResponse<LeaderboardEntry[]>> {
    return await apiClient.get(`/api/leaderboard/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<ApiResponse<{
    user: LeaderboardEntry;
    stats: {
      totalScans: number;
      improvementScore: number;
      streak: number;
      joinDate: string;
    };
    recentScans: any[];
  }>> {
    return await apiClient.get(`/api/leaderboard/users/${userId}`);
  }

  /**
   * Follow user
   */
  static async followUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.post(`/api/social/follow/${userId}`, {});
  }

  /**
   * Unfollow user
   */
  static async unfollowUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete(`/api/social/follow/${userId}`);
  }

  /**
   * Get friends/following list
   */
  static async getFriends(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return await apiClient.get('/api/social/friends');
  }

  /**
   * Get followers
   */
  static async getFollowers(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return await apiClient.get('/api/social/followers');
  }

  /**
   * Get following
   */
  static async getFollowing(): Promise<ApiResponse<LeaderboardEntry[]>> {
    return await apiClient.get('/api/social/following');
  }

  /**
   * Get activity feed
   */
  static async getFeed(params?: {
    type?: 'all' | 'friends' | 'global';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Array<{
    userId: string;
    username: string;
    profilePhotoUrl?: string;
    type: 'scan' | 'workout' | 'achievement';
    content: string;
    timestamp: string;
    likes: number;
    comments: number;
  }>>> {
    const queryParams = new URLSearchParams({
      type: params?.type || 'all',
      limit: String(params?.limit || 20),
      offset: String(params?.offset || 0),
    }).toString();

    return await apiClient.get(`/api/social/feed?${queryParams}`);
  }

  /**
   * Like a post
   */
  static async likePost(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.post(`/api/social/posts/${postId}/like`, {});
  }

  /**
   * Unlike a post
   */
  static async unlikePost(postId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete(`/api/social/posts/${postId}/like`);
  }

  /**
   * Comment on a post
   */
  static async commentOnPost(
    postId: string,
    comment: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.post(`/api/social/posts/${postId}/comments`, {
      comment,
    });
  }

  /**
   * Get rank history (for charts)
   */
  static async getRankHistory(days: number = 30): Promise<ApiResponse<Array<{
    date: string;
    rank: number;
    score: number;
  }>>> {
    return await apiClient.get(`/api/leaderboard/rank-history?days=${days}`);
  }
}
