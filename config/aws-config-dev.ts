/**
 * AWS Configuration for Mog.ai Backend - Development Mode
 * For production, set up real AWS credentials
 */

// Development mode - uses mock/demo data
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

export const AWS_CONFIG = {
  // AWS Region
  region: process.env.AWS_REGION || 'us-east-1',
  
  // AWS Cognito Configuration (use demo values for dev)
  cognito: {
    userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || 'us-east-1_DEMO',
    clientId: process.env.AWS_COGNITO_CLIENT_ID || 'demo-client-id',
    identityPoolId: process.env.AWS_COGNITO_IDENTITY_POOL_ID || 'us-east-1:demo-identity',
  },
  
  // DynamoDB Table Names
  dynamodb: {
    usersTable: process.env.DYNAMODB_USERS_TABLE || 'mog-ai-users',
    scansTable: process.env.DYNAMODB_SCANS_TABLE || 'mog-ai-scans',
    nutritionTable: process.env.DYNAMODB_NUTRITION_TABLE || 'mog-ai-nutrition',
    workoutsTable: process.env.DYNAMODB_WORKOUTS_TABLE || 'mog-ai-workouts',
    leaderboardTable: process.env.DYNAMODB_LEADERBOARD_TABLE || 'mog-ai-leaderboard',
    missionsTable: process.env.DYNAMODB_MISSIONS_TABLE || 'mog-ai-missions',
  },
  
  // S3 Bucket Configuration
  s3: {
    bucketName: process.env.AWS_S3_BUCKET || 'mog-ai-uploads',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    scanPhotosPrefix: 'scans/',
    profilePhotosPrefix: 'profiles/',
    mealPhotosPrefix: 'meals/',
  },
  
  // API Gateway Configuration
  api: {
    endpoint: process.env.API_ENDPOINT || 'https://api.mog.ai',
    timeout: 30000, // 30 seconds
  },
};

// AWS Amplify Configuration (conditional for dev mode)
export const amplifyConfig = IS_DEVELOPMENT 
  ? {
      // Development mode - minimal config
      Auth: {
        region: AWS_CONFIG.region,
        userPoolId: AWS_CONFIG.cognito.userPoolId,
        userPoolWebClientId: AWS_CONFIG.cognito.clientId,
      }
    }
  : {
      // Production mode - full config
      Auth: {
        Cognito: {
          userPoolId: AWS_CONFIG.cognito.userPoolId,
          userPoolClientId: AWS_CONFIG.cognito.clientId,
          identityPoolId: AWS_CONFIG.cognito.identityPoolId,
          loginWith: {
            email: true,
          },
          signUpVerificationMethod: 'code',
          userAttributes: {
            email: {
              required: true,
            },
          },
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
          },
        },
      },
      Storage: {
        S3: {
          bucket: AWS_CONFIG.s3.bucketName,
          region: AWS_CONFIG.s3.region,
        },
      },
    };

// Export helper to check if AWS is configured
export const isAWSConfigured = () => {
  return (
    AWS_CONFIG.cognito.userPoolId !== 'us-east-1_DEMO' &&
    AWS_CONFIG.cognito.clientId !== 'demo-client-id'
  );
};
