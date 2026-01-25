/**
 * Scan Service
 * Handles physique scan uploads, analysis, and history
 */

import { Storage } from 'aws-amplify';
import { apiClient } from './api.client';
import {
  PhysiqueScan,
  ScanAnalysis,
  ApiResponse,
} from '../types';
import { AWS_CONFIG } from '../config/aws-config';

export class ScanService {
  /**
   * Upload scan photo to S3
   */
  static async uploadPhoto(
    uri: string,
    userId: string,
    type: 'front' | 'side' | 'back'
  ): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `${userId}/${Date.now()}_${type}.jpg`;
      const key = `${AWS_CONFIG.s3.scanPhotosPrefix}${filename}`;

      const result = await Storage.put(key, blob, {
        contentType: 'image/jpeg',
        level: 'private',
      });

      return key;
    } catch (error) {
      console.error('Upload photo error:', error);
      throw error;
    }
  }

  /**
   * Create a new scan with AI analysis
   */
  static async createScan(data: {
    frontPhotoUri: string;
    sidePhotoUri?: string;
    backPhotoUri?: string;
    weight?: number;
    measurements?: any;
  }): Promise<ApiResponse<PhysiqueScan>> {
    try {
      // Upload photos to S3
      const userId = 'current-user-id'; // Get from auth context
      
      const frontPhotoUrl = await this.uploadPhoto(data.frontPhotoUri, userId, 'front');
      const sidePhotoUrl = data.sidePhotoUri 
        ? await this.uploadPhoto(data.sidePhotoUri, userId, 'side')
        : undefined;
      const backPhotoUrl = data.backPhotoUri
        ? await this.uploadPhoto(data.backPhotoUri, userId, 'back')
        : undefined;

      // Send to backend for AI analysis
      return await apiClient.post<PhysiqueScan>('/api/scans/analyze', {
        frontPhotoUrl,
        sidePhotoUrl,
        backPhotoUrl,
        weight: data.weight,
        measurements: data.measurements,
      });
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SCAN_ERROR',
          message: error.message || 'Failed to create scan',
        },
      };
    }
  }

  /**
   * Get scan by ID
   */
  static async getScan(scanId: string): Promise<ApiResponse<PhysiqueScan>> {
    return await apiClient.get<PhysiqueScan>(`/api/scans/${scanId}`);
  }

  /**
   * Get user's scan history
   */
  static async getScanHistory(limit: number = 10): Promise<ApiResponse<PhysiqueScan[]>> {
    return await apiClient.get<PhysiqueScan[]>(`/api/scans/history?limit=${limit}`);
  }

  /**
   * Get latest scan
   */
  static async getLatestScan(): Promise<ApiResponse<PhysiqueScan>> {
    return await apiClient.get<PhysiqueScan>('/api/scans/latest');
  }

  /**
   * Compare two scans
   */
  static async compareScans(scanId1: string, scanId2: string): Promise<ApiResponse<{
    scan1: PhysiqueScan;
    scan2: PhysiqueScan;
    improvement: {
      mogScoreDelta: number;
      weightDelta: number;
      tierChanged: boolean;
      muscleGains: string[];
      notes: string;
    };
  }>> {
    return await apiClient.get(`/api/scans/compare?scan1=${scanId1}&scan2=${scanId2}`);
  }

  /**
   * Delete a scan
   */
  static async deleteScan(scanId: string): Promise<ApiResponse<{ success: boolean }>> {
    return await apiClient.delete(`/api/scans/${scanId}`);
  }

  /**
   * Get Mog Score breakdown
   */
  static async getMogScoreBreakdown(scanId?: string): Promise<ApiResponse<{
    totalScore: number;
    tier: string;
    breakdown: {
      frame: number;
      proportions: number;
      balance: number;
      symmetry: number;
      leanness: number;
    };
    recommendations: string[];
  }>> {
    const endpoint = scanId 
      ? `/api/scans/${scanId}/breakdown`
      : '/api/scans/latest/breakdown';
    return await apiClient.get(endpoint);
  }

  /**
   * Simulate AI Analysis (for development)
   */
  static simulateAnalysis(): ScanAnalysis {
    const muscleGroups = [
      'Chest', 'Shoulders', 'Back', 'Arms', 'Core', 'Legs'
    ];

    return {
      frameScore: Math.floor(Math.random() * 30) + 70,
      frameNotes: 'Solid skeletal structure with good proportions',
      proportionScore: Math.floor(Math.random() * 30) + 70,
      proportionNotes: 'Well-balanced muscle distribution',
      muscleGroups: muscleGroups.map(name => ({
        name,
        score: Math.floor(Math.random() * 30) + 70,
        status: Math.random() > 0.5 ? 'strong' : 'adequate',
        notes: `${name} development is progressing well`,
      })),
      limiterMuscles: ['Rear Delts', 'Lower Back'],
      limiterNotes: 'Focus on posterior chain development',
      balanceScore: Math.floor(Math.random() * 30) + 70,
      balanceNotes: 'Aesthetic balance is solid with minor adjustments needed',
      symmetryScore: Math.floor(Math.random() * 30) + 70,
      tierScore: Math.floor(Math.random() * 30) + 70,
      tierNotes: 'Strong foundation, focus on limiter muscles to advance',
      nextTierRequirements: [
        'Increase rear delt mass',
        'Improve lower back thickness',
        'Enhance overall conditioning',
      ],
      overallNotes: 'Elite physique with clear path to next tier',
      recommendations: [
        'Prioritize rear delt work 2x per week',
        'Add Romanian deadlifts for lower back',
        'Maintain current training intensity',
      ],
    };
  }
}
