# Mog.ai Backend - Complete Setup Guide

## 📦 Installation Instructions

### 1. Install Required Dependencies

```bash
# Navigate to your project root
cd /Users/michaelchibuzor/Desktop/Fit

# Install new dependencies
npm install @react-native-async-storage/async-storage aws-amplify axios

# Or with yarn
yarn add @react-native-async-storage/async-storage aws-amplify axios
```

### 2. AWS Setup

#### A. Create AWS Account
1. Go to https://aws.amazon.com and create an account
2. Set up billing (free tier available)

#### B. Set Up AWS Cognito (Authentication)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
amplify init

# Add authentication
amplify add auth
# Select: Default configuration with email sign-in
# Do you want to add User Pool Groups? No
# Do you want to add an admin queries API? No

# Push to AWS
amplify push
```

#### C. Set Up DynamoDB Tables
Create the following tables in AWS Console (https://console.aws.amazon.com/dynamodb):

**Table 1: mog-ai-users**
- Partition Key: `userId` (String)
- Sort Key: None
- Attributes: email, username, mogScore, tier, rank, subscriptionStatus
- GSI: email-index (on email attribute)

**Table 2: mog-ai-scans**
- Partition Key: `userId` (String)
- Sort Key: `scanId` (String)
- Attributes: createdAt, mogScore, tier, frontPhotoUrl
- GSI: scanId-index (on scanId)

**Table 3: mog-ai-nutrition**
- Partition Key: `userId` (String)
- Sort Key: `date` (String, format: YYYY-MM-DD)
- Attributes: caloriesConsumed, proteinConsumed, compliancePercentage

**Table 4: mog-ai-workouts**
- Partition Key: `userId` (String)
- Sort Key: `planId` (String)
- Attributes: name, daysPerWeek, isActive

**Table 5: mog-ai-leaderboard**
- Partition Key: `tier` (String)
- Sort Key: `mogScore#userId` (String, composite)
- Attributes: username, profilePhotoUrl, globalRank, localRank
- GSI: globalRank-index (on globalRank)

**Table 6: mog-ai-missions**
- Partition Key: `userId` (String)
- Sort Key: `weekStartDate` (String)
- Attributes: completedObjectives, totalObjectives, isCompleted

#### D. Set Up S3 Bucket (Photo Storage)
```bash
# Add storage
amplify add storage

# Select: Content (Images, audio, video, etc.)
# Provide a friendly name: mogaiuploads
# Provide bucket name: mog-ai-uploads
# Who should have access: Auth users only
# What kind of access do you want: create/update, read, delete

# Push to AWS
amplify push
```

#### E. Set Up API Gateway (Optional - for custom backend)
```bash
# Add API
amplify add api

# Select: REST
# Provide a friendly name: MogAI
# Provide a path: /api
# Choose a Lambda source: Create a new Lambda function
# Provide a function name: mogApiHandler
# Choose runtime: NodeJS

# Push to AWS
amplify push
```

### 3. Environment Configuration

#### A. Create .env file
```bash
# Copy the example file
cp backend/.env.example .env

# Edit .env with your AWS credentials
nano .env
```

#### B. Get AWS Credentials
After running `amplify push`, you'll find credentials in:
- `amplify/backend/amplify-meta.json`
- Copy the following:
  - Cognito User Pool ID
  - Cognito Client ID
  - Identity Pool ID
  - S3 Bucket Name
  - Region

Update your `.env` file with these values.

### 4. Initialize Amplify in Your App

Create or update `App.tsx`:
```typescript
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './backend/config/aws-config';

// Initialize Amplify
Amplify.configure(amplifyConfig);
```

### 5. Wrap App with Providers

Update your `App.tsx`:
```typescript
import { ToastProvider } from './components/MogToast';
import { AlertProvider } from './components/MogAlert';

export default function App() {
  return (
    <ToastProvider>
      <AlertProvider>
        <AppProvider>
          {/* Your app content */}
        </AppProvider>
      </AlertProvider>
    </ToastProvider>
  );
}
```

## 🗄️ DynamoDB Schema Details

### Users Table Schema
```json
{
  "userId": "string (UUID)",
  "email": "string",
  "username": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "profile": {
    "firstName": "string",
    "lastName": "string",
    "age": "number",
    "weight": "number",
    "height": "number",
    "profilePhotoUrl": "string",
    "bio": "string",
    "location": "string"
  },
  "onboarding": {
    "age": "number",
    "weight": "number",
    "height": "number",
    "bodyType": "string",
    "goals": ["string"],
    "completedAt": "string"
  },
  "mogScore": "number",
  "tier": "string",
  "rank": "number",
  "streak": "number",
  "subscriptionStatus": "string",
  "subscriptionEndDate": "string"
}
```

### Scans Table Schema
```json
{
  "scanId": "string (UUID)",
  "userId": "string",
  "createdAt": "string (ISO 8601)",
  "frontPhotoUrl": "string",
  "sidePhotoUrl": "string",
  "backPhotoUrl": "string",
  "mogScore": "number",
  "tier": "string",
  "analysis": {
    "frameScore": "number",
    "proportionScore": "number",
    "balanceScore": "number",
    "symmetryScore": "number",
    "recommendations": ["string"]
  },
  "previousScanId": "string",
  "improvementScore": "number"
}
```

### Nutrition Table Schema
```json
{
  "dayId": "string (UUID)",
  "userId": "string",
  "date": "string (YYYY-MM-DD)",
  "calorieTarget": "number",
  "proteinTarget": "number",
  "caloriesConsumed": "number",
  "proteinConsumed": "number",
  "carbsConsumed": "number",
  "fatsConsumed": "number",
  "meals": [
    {
      "mealId": "string",
      "name": "string",
      "time": "string",
      "calories": "number",
      "protein": "number",
      "carbs": "number",
      "fats": "number",
      "photoUrl": "string",
      "isAiEstimated": "boolean"
    }
  ],
  "compliancePercentage": "number",
  "isCompliant": "boolean",
  "streakDay": "number"
}
```

## 📱 Usage Examples

### Authentication
```typescript
import { AuthService } from './backend/services/auth.service';

// Signup
const result = await AuthService.signup({
  email: 'user@example.com',
  password: 'Password123',
  username: 'mogger123',
  firstName: 'John',
  lastName: 'Doe',
});

// Login
const loginResult = await AuthService.login({
  email: 'user@example.com',
  password: 'Password123',
});

// Get current user
const user = await AuthService.getCurrentUser();
```

### Scanning
```typescript
import { ScanService } from './backend/services/scan.service';

// Create scan
const result = await ScanService.createScan({
  frontPhotoUri: 'file://...',
  weight: 175,
});

// Get scan history
const history = await ScanService.getScanHistory(10);
```

### Nutrition
```typescript
import { NutritionService } from './backend/services/nutrition.service';

// Get today's nutrition
const today = await NutritionService.getTodayNutrition();

// Add meal
const meal = await NutritionService.addMeal({
  name: 'Chicken & Rice',
  calories: 500,
  protein: 50,
  carbs: 60,
  fats: 10,
});

// AI estimation
const estimated = await NutritionService.estimateMealFromText(
  'chicken breast with broccoli and rice'
);
```

### Toasts & Alerts
```typescript
import { useGlobalToast } from './components/MogToast';
import { useGlobalAlert } from './components/MogAlert';

function MyComponent() {
  const { showToast } = useGlobalToast();
  const { showAlert } = useGlobalAlert();

  const handleSuccess = () => {
    showToast({
      type: 'success',
      title: 'Scan Complete!',
      message: 'Your Mog Score: 85',
    });
  };

  const handleConfirm = () => {
    showAlert({
      type: 'confirm',
      title: 'Delete Scan?',
      message: 'This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    });
  };
}
```

## 🚀 Next Steps

1. **Install Dependencies**: Run the npm/yarn install commands above
2. **Set Up AWS**: Follow the AWS setup instructions
3. **Configure Environment**: Update your .env file
4. **Test Authentication**: Try signing up and logging in
5. **Test Services**: Use the example code to test each service
6. **Deploy Backend**: Set up Lambda functions for custom API logic

## 📝 Notes

- Free tier limits: 25GB DynamoDB storage, 25 write units/sec
- Cognito: 50,000 MAU (Monthly Active Users) free
- S3: 5GB storage, 20,000 GET requests free
- Consider setting up CloudWatch for monitoring
- Enable AWS Backup for data safety

## 🆘 Troubleshooting

**Issue: Amplify configuration error**
- Solution: Run `amplify configure` and follow prompts

**Issue: DynamoDB access denied**
- Solution: Check IAM policies in AWS Console

**Issue: S3 upload fails**
- Solution: Verify bucket permissions and CORS settings

**Issue: Toast/Alert not showing**
- Solution: Ensure ToastProvider/AlertProvider wraps your app
