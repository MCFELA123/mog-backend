/**
 * Mog.ai Backend - Main Export File
 * Import all services from this single file
 */

// Services
export { AuthService } from './services/auth.service';
export { UserService } from './services/user.service';
export { ScanService } from './services/scan.service';
export { NutritionService } from './services/nutrition.service';
export { WorkoutService } from './services/workout.service';
export { LeaderboardService } from './services/leaderboard.service';
export { apiClient } from './services/api.client';

// Types
export * from './types';

// Configuration
export { AWS_CONFIG, amplifyConfig } from './config/aws-config';

/**
 * Usage Example:
 * 
 * import { AuthService, UserService, ScanService } from './backend';
 * 
 * // Authentication
 * const loginResult = await AuthService.login({ email, password });
 * 
 * // User data
 * const profile = await UserService.getProfile();
 * 
 * // Scan
 * const scan = await ScanService.createScan({ frontPhotoUri });
 */
