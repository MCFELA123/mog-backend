/**
 * Development Auth Service
 * Mock authentication for testing without AWS setup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple user type for dev mode
export interface SimpleUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  onboardingCompleted: boolean;
  tier: string;
  mogScore: number;
  createdAt: string;
}

const STORAGE_KEYS = {
  AUTH_TOKENS: '@mog_auth_tokens',
  USER_DATA: '@mog_user_data',
  REFRESH_TOKEN: '@mog_refresh_token',
  DEV_USERS: '@mog_dev_users', // Store mock users
};

export class AuthService {
  /**
   * Sign up a new user (mock)
   */
  static async signup(
    email: string,
    password: string,
    username: string,
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; message: string }> {
    try {

      // Check if user already exists
      const existingUsers = await this.getDevUsers();
      if (existingUsers[email.toLowerCase()]) {
        return {
          success: false,
          message: 'An account with this email already exists',
        };
      }

      // Store user for later verification
      existingUsers[email.toLowerCase()] = {
        email: email.toLowerCase(),
        password, // In real app, this would be hashed
        username,
        firstName,
        lastName,
        verified: false,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.DEV_USERS, JSON.stringify(existingUsers));

      console.log('[DEV MODE] User signed up:', email);
      return {
        success: true,
        message: 'Verification code sent to your email (use any 6-digit code)',
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: 'Failed to create account',
      };
    }
  }

  /**
   * Confirm signup with verification code (mock - accepts any 6-digit code)
   */
  static async confirmSignup(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          message: 'Invalid verification code. Please enter a 6-digit code',
        };
      }

      const existingUsers = await this.getDevUsers();
      const user = existingUsers[email.toLowerCase()];

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Mark user as verified
      user.verified = true;
      existingUsers[email.toLowerCase()] = user;
      await AsyncStorage.setItem(STORAGE_KEYS.DEV_USERS, JSON.stringify(existingUsers));

      console.log('[DEV MODE] Email verified:', email);
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('Confirm signup error:', error);
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  /**
   * Resend confirmation code (mock)
   */
  static async resendConfirmationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const existingUsers = await this.getDevUsers();
      const user = existingUsers[email.toLowerCase()];

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.verified) {
        return {
          success: false,
          message: 'Email already verified',
        };
      }

      console.log('[DEV MODE] Verification code resent to:', email);
      return {
        success: true,
        message: 'Verification code sent (use any 6-digit code)',
      };
    } catch (error: any) {
      console.error('Resend code error:', error);
      return {
        success: false,
        message: 'Failed to resend code',
      };
    }
  }

  /**
   * Login with email and password (mock)
   */
  static async login(email: string, password: string): Promise<{ success: boolean; user?: SimpleUser; message: string }> {
    try {
      const existingUsers = await this.getDevUsers();
      const user = existingUsers[email.toLowerCase()];

      if (!user) {
        return {
          success: false,
          message: 'No account found with this email',
        };
      }

      if (!user.verified) {
        return {
          success: false,
          message: 'Please verify your email first',
        };
      }

      if (user.password !== password) {
        return {
          success: false,
          message: 'Incorrect password',
        };
      }

      // Create user object
      const userData: SimpleUser = {
        id: `dev_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingCompleted: false,
        tier: 'Tier 10',
        mogScore: 0,
        createdAt: user.createdAt,
      };

      // Store mock tokens
      const tokens = {
        accessToken: `mock_access_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
        idToken: `mock_id_token_${Date.now()}`,
        expiresIn: 3600,
      };

      await this.storeTokens(tokens);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

      console.log('[DEV MODE] User logged in:', email);
      return {
        success: true,
        user: userData,
        message: 'Login successful',
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Failed to login',
      };
    }
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKENS,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      console.log('[DEV MODE] User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get currently logged in user
   */
  static async getCurrentUser(): Promise<SimpleUser | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (!userData) {
        return null;
      }
      return JSON.parse(userData);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      return tokens !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Forgot password (mock - just logs message)
   */
  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const existingUsers = await this.getDevUsers();
      const user = existingUsers[email.toLowerCase()];

      if (!user) {
        return {
          success: false,
          message: 'No account found with this email',
        };
      }

      console.log('[DEV MODE] Password reset code sent to:', email);
      return {
        success: true,
        message: 'Password reset code sent to your email (use any 6-digit code)',
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: 'Failed to send reset code',
      };
    }
  }

  /**
   * Reset password with code (mock)
   */
  static async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          message: 'Invalid verification code',
        };
      }

      const existingUsers = await this.getDevUsers();
      const user = existingUsers[email.toLowerCase()];

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Update password
      user.password = newPassword;
      existingUsers[email.toLowerCase()] = user;
      await AsyncStorage.setItem(STORAGE_KEYS.DEV_USERS, JSON.stringify(existingUsers));

      console.log('[DEV MODE] Password reset for:', email);
      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'Failed to reset password',
      };
    }
  }

  /**
   * Change password for logged in user
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          message: 'No user logged in',
        };
      }

      const existingUsers = await this.getDevUsers();
      const user = existingUsers[currentUser.email.toLowerCase()];

      if (!user || user.password !== oldPassword) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      user.password = newPassword;
      existingUsers[currentUser.email.toLowerCase()] = user;
      await AsyncStorage.setItem(STORAGE_KEYS.DEV_USERS, JSON.stringify(existingUsers));

      console.log('[DEV MODE] Password changed for:', currentUser.email);
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  // Helper methods

  private static async getDevUsers(): Promise<Record<string, any>> {
    try {
      const users = await AsyncStorage.getItem(STORAGE_KEYS.DEV_USERS);
      return users ? JSON.parse(users) : {};
    } catch (error) {
      return {};
    }
  }

  private static async storeTokens(tokens: any): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
  }

  private static async getTokens(): Promise<any | null> {
    try {
      const tokens = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      return null;
    }
  }

  private static parseAuthError(error: any): string {
    if (error.code === 'UsernameExistsException') {
      return 'An account with this email already exists';
    }
    if (error.code === 'InvalidPasswordException') {
      return 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }
    if (error.code === 'UserNotFoundException') {
      return 'No account found with this email';
    }
    if (error.code === 'NotAuthorizedException') {
      return 'Incorrect email or password';
    }
    if (error.code === 'CodeMismatchException') {
      return 'Invalid verification code';
    }
    if (error.code === 'ExpiredCodeException') {
      return 'Verification code has expired';
    }
    return error.message || 'An error occurred';
  }
}
