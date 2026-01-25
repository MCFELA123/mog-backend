/**
 * AWS Configuration for Mog.ai Backend
 * Configure AWS SDK, Cognito, DynamoDB, and S3
 */

export const AWS_CONFIG = {
  // AWS Region
  region: process.env.AWS_REGION || 'us-east-1',
  
  // AWS Cognito Configuration
  cognito: {
    userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || 'us-east-1_XXXXXXX',
    clientId: process.env.AWS_COGNITO_CLIENT_ID || 'your-client-id',
    identityPoolId: process.env.AWS_COGNITO_IDENTITY_POOL_ID || 'us-east-1:xxxxx',
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

// AWS Amplify Configuration
export const amplifyConfig = {
  Auth: {
    region: AWS_CONFIG.region,
    userPoolId: AWS_CONFIG.cognito.userPoolId,
    userPoolWebClientId: AWS_CONFIG.cognito.clientId,
    identityPoolId: AWS_CONFIG.cognito.identityPoolId,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
  Storage: {
    AWSS3: {
      bucket: AWS_CONFIG.s3.bucketName,
      region: AWS_CONFIG.s3.region,
    },
  },
  API: {
    endpoints: [
      {
        name: 'MogAI',
        endpoint: AWS_CONFIG.api.endpoint,
        region: AWS_CONFIG.region,
      },
    ],
  },
};
