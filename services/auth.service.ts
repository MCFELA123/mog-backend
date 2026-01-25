/**
 * AWS Authentication Service
 * Handles user authentication with AWS Cognito
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
import { AuthTokens, SignupRequest, LoginRequest, User } from '../types';

const STORAGE_KEYS = {
  AUTH_TOKENS: '@mog_auth_tokens',
  USER_DATA: '@mog_user_data',
  REFRESH_TOKEN: '@mog_refresh_token',
};

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signup(request: SignupRequest): Promise<{ success: boolean; message: string }> {
    try {
      const { email, password, username, firstName, lastName } = request;

      const result = await Auth.signUp({
        username: email.toLowerCase(),
        password,
        attributes: {
          email: email.toLowerCase(),
          'custom:username': username,
          'custom:firstName': firstName,
          'custom:lastName': lastName,
        },
      });

      return {
        success: true,
        message: 'Verification code sent to your email',
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Confirm signup with verification code
   */
  static async confirmSignup(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      await Auth.confirmSignUp(email.toLowerCase(), code);
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error: any) {
      console.error('Confirm signup error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Resend confirmation code
   */
  static async resendConfirmationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await Auth.resendSignUp(email.toLowerCase());
      return {
        success: true,
        message: 'Verification code resent',
      };
    } catch (error: any) {
      console.error('Resend code error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Login user
   */
  static async login(request: LoginRequest): Promise<{ success: boolean; message: string; tokens?: AuthTokens }> {
    try {
      const { email, password } = request;

      const user = await Auth.signIn(email.toLowerCase(), password);
      
      const session = await Auth.currentSession();
      const tokens: AuthTokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
        expiresIn: session.getAccessToken().getExpiration(),
      };

      // Store tokens
      await this.storeTokens(tokens);

      return {
        success: true,
        message: 'Login successful',
        tokens,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await Auth.signOut();
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKENS,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (userData) {
        return JSON.parse(userData);
      }
      
      return null;
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
      await Auth.currentAuthenticatedUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current session tokens
   */
  static async getTokens(): Promise<AuthTokens | null> {
    try {
      const tokensStr = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
      if (tokensStr) {
        return JSON.parse(tokensStr);
      }
      
      // Try to get from Cognito
      const session = await Auth.currentSession();
      const tokens: AuthTokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
        expiresIn: session.getAccessToken().getExpiration(),
      };
      
      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Get tokens error:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<AuthTokens | null> {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();
      
      const tokens: AuthTokens = {
        accessToken: session.getAccessToken().getJwtToken(),
        refreshToken: session.getRefreshToken().getToken(),
        idToken: session.getIdToken().getJwtToken(),
        expiresIn: session.getAccessToken().getExpiration(),
      };
      
      await this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }

  /**
   * Forgot password - send reset code
   */
  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await Auth.forgotPassword(email.toLowerCase());
      return {
        success: true,
        message: 'Password reset code sent to your email',
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Reset password with code
   */
  static async resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      await Auth.forgotPasswordSubmit(email.toLowerCase(), code, newPassword);
      return {
        success: true,
        message: 'Password reset successful',
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, oldPassword, newPassword);
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: this.parseAuthError(error),
      };
    }
  }

  /**
   * Store authentication tokens
   */
  private static async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    } catch (error) {
      console.error('Store tokens error:', error);
    }
  }

  /**
   * Store user data
   */
  static async storeUserData(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.error('Store user data error:', error);
    }
  }

  /**
   * Parse authentication errors into user-friendly messages
   */
  private static parseAuthError(error: any): string {
    const errorCode = error.code || error.name;
    
    switch (errorCode) {
      case 'UserNotFoundException':
        return 'No account found with this email';
      case 'NotAuthorizedException':
        return 'Incorrect email or password';
      case 'UserNotConfirmedException':
        return 'Please verify your email first';
      case 'UsernameExistsException':
        return 'An account with this email already exists';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
      case 'CodeMismatchException':
        return 'Invalid verification code';
      case 'ExpiredCodeException':
        return 'Verification code has expired. Request a new one';
      case 'LimitExceededException':
        return 'Too many attempts. Please try again later';
      case 'InvalidParameterException':
        return 'Invalid input. Please check your details';
      case 'TooManyRequestsException':
        return 'Too many requests. Please slow down';
      case 'NetworkError':
        return 'Network error. Check your connection';
      default:
        return error.message || 'Authentication failed. Please try again';
    }
  }
}
