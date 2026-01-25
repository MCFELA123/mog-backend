# Mog.ai Backend - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd /Users/michaelchibuzor/Desktop/Fit
npm install @react-native-async-storage/async-storage aws-amplify axios
```

### Step 2: Set Up AWS (Choose One Option)

#### Option A: Use Amplify CLI (Recommended)
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize in your project
amplify init

# Add auth
amplify add auth

# Add storage
amplify add storage

# Deploy to AWS
amplify push
```

#### Option B: Manual AWS Setup
1. Go to AWS Console
2. Create Cognito User Pool
3. Create S3 Bucket
4. Create DynamoDB Tables (see SETUP_GUIDE.md)
5. Copy credentials to `.env` file

### Step 3: Configure Environment
```bash
# Copy example env file
cp backend/.env.example .env

# Edit with your AWS credentials
nano .env
```

### Step 4: Update App.tsx
```typescript
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './backend/config/aws-config';
import { ToastProvider } from './components/MogToast';
import { AlertProvider } from './components/MogAlert';

// Initialize Amplify
Amplify.configure(amplifyConfig);

export default function App() {
  return (
    <ToastProvider>
      <AlertProvider>
        <AppProvider>
          <Layout />
        </AppProvider>
      </AlertProvider>
    </ToastProvider>
  );
}
```

### Step 5: Test Authentication
```bash
# Run your app
npm start

# Navigate to Screen18 in your app
# Click "Try Free" button
# This will take you to the Signup screen
# Create an account and test the flow
```

---

## 📱 Usage Examples

### 1. Using Authentication
```typescript
import { AuthService } from './backend/services/auth.service';
import { useGlobalToast } from './components/MogToast';

function MyComponent() {
  const { showToast } = useGlobalToast();

  const handleSignup = async () => {
    const result = await AuthService.signup({
      email: 'user@example.com',
      password: 'Password123',
      username: 'mogger',
      firstName: 'John',
      lastName: 'Doe',
    });

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Account Created!',
        message: 'Check your email',
      });
    }
  };
}
```

### 2. Using Toasts
```typescript
import { useGlobalToast } from './components/MogToast';

function MyComponent() {
  const { showToast } = useGlobalToast();

  // Success toast
  showToast({
    type: 'success',
    title: 'Scan Complete!',
    message: 'Your Mog Score: 85',
    duration: 3000,
  });

  // Error toast
  showToast({
    type: 'error',
    title: 'Upload Failed',
    message: 'Check your connection',
  });

  // Warning toast
  showToast({
    type: 'warning',
    title: 'Low Protein',
    message: 'You need 50g more protein',
  });

  // Info toast
  showToast({
    type: 'info',
    title: 'New Mission',
    message: 'Complete 4 workouts this week',
  });
}
```

### 3. Using Alerts
```typescript
import { useGlobalAlert } from './components/MogAlert';

function MyComponent() {
  const { showAlert } = useGlobalAlert();

  // Confirmation dialog
  showAlert({
    type: 'confirm',
    title: 'Delete Scan?',
    message: 'This action cannot be undone.',
    buttons: [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: handleDelete 
      },
    ],
  });

  // Success alert
  showAlert({
    type: 'success',
    title: 'Mission Complete!',
    message: 'You earned 100 points',
    buttons: [
      { text: 'Awesome!', style: 'primary' },
    ],
  });
}
```

### 4. Using Scan Service
```typescript
import { ScanService } from './backend/services/scan.service';
import { useGlobalToast } from './components/MogToast';

function ScanScreen() {
  const { showToast } = useGlobalToast();

  const handleScan = async (photoUri: string) => {
    const result = await ScanService.createScan({
      frontPhotoUri: photoUri,
      weight: 175,
    });

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Analysis Complete',
        message: `Mog Score: ${result.data?.mogScore}`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Scan Failed',
        message: result.error?.message,
      });
    }
  };
}
```

### 5. Using Nutrition Service
```typescript
import { NutritionService } from './backend/services/nutrition.service';

function NutritionScreen() {
  const addMeal = async () => {
    // Manual entry
    const result = await NutritionService.addMeal({
      name: 'Chicken & Rice',
      calories: 500,
      protein: 50,
      carbs: 60,
      fats: 10,
    });

    // Or AI estimation from text
    const estimated = await NutritionService.estimateMealFromText(
      'grilled chicken breast with broccoli'
    );

    if (estimated.success) {
      await NutritionService.addMeal(estimated.data!);
    }
  };

  const getTodayNutrition = async () => {
    const result = await NutritionService.getTodayNutrition();
    console.log('Today:', result.data);
  };
}
```

### 6. Using Workout Service
```typescript
import { WorkoutService } from './backend/services/workout.service';

function WorkoutScreen() {
  const generatePlan = async () => {
    const result = await WorkoutService.generatePlan({
      goals: ['Build Muscle'],
      daysPerWeek: 4,
      experienceLevel: 'intermediate',
      equipmentAccess: 'full_gym',
    });

    console.log('Plan:', result.data);
  };

  const completeWorkout = async (dayId: string) => {
    const result = await WorkoutService.completeWorkout(dayId, [
      {
        exerciseId: 'bench-press',
        setsCompleted: 4,
        weight: 185,
        reps: 8,
      },
    ]);
  };
}
```

### 7. Using Leaderboard Service
```typescript
import { LeaderboardService } from './backend/services/leaderboard.service';

function LeaderboardScreen() {
  const getLeaderboard = async () => {
    const result = await LeaderboardService.getGlobalLeaderboard({
      limit: 50,
      offset: 0,
    });

    console.log('Top Moggers:', result.data?.entries);
  };

  const getMyRank = async () => {
    const result = await LeaderboardService.getUserRank();
    console.log('My Rank:', result.data?.globalRank);
  };

  const followUser = async (userId: string) => {
    await LeaderboardService.followUser(userId);
  };
}
```

---

## 🔧 Project Structure

```
Fit/
├── backend/
│   ├── config/
│   │   └── aws-config.ts          # AWS configuration
│   ├── services/
│   │   ├── auth.service.ts        # Authentication
│   │   ├── user.service.ts        # User management
│   │   ├── scan.service.ts        # Physique scans
│   │   ├── nutrition.service.ts   # Nutrition tracking
│   │   ├── workout.service.ts     # Workout plans
│   │   ├── leaderboard.service.ts # Rankings & social
│   │   └── api.client.ts          # HTTP client
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   ├── .env.example               # Environment template
│   ├── SETUP_GUIDE.md             # Detailed setup
│   └── API_DOCUMENTATION.md       # API reference
├── components/
│   ├── MogToast.tsx               # Toast notifications
│   ├── MogAlert.tsx               # Alert dialogs
│   └── ...
├── screens/
│   ├── auth/
│   │   ├── SignupScreen.tsx       # Signup flow
│   │   ├── LoginScreen.tsx        # Login flow
│   │   └── VerifyEmailScreen.tsx  # Email verification
│   ├── onboarding/
│   │   └── Screen18.tsx           # Updated with signup navigation
│   └── ...
└── App.tsx                        # Main app with providers
```

---

## 🎯 Next Steps

1. **Set up AWS**: Follow Step 2 above
2. **Test Auth Flow**: Create an account from Screen18
3. **Implement Features**: Use the service examples above
4. **Customize**: Modify services for your needs
5. **Deploy**: Push to production when ready

---

## 📚 Additional Resources

- [Full Setup Guide](./SETUP_GUIDE.md) - Detailed AWS setup
- [API Documentation](./API_DOCUMENTATION.md) - All API endpoints
- [AWS Amplify Docs](https://docs.amplify.aws/) - Amplify reference
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/) - Database setup

---

## 🆘 Common Issues

**Issue: "Cannot find module 'aws-amplify'"**
```bash
npm install aws-amplify
```

**Issue: "Toast not showing"**
```typescript
// Make sure App.tsx is wrapped with ToastProvider
<ToastProvider>
  <YourApp />
</ToastProvider>
```

**Issue: "Navigation error to 'Signup'"**
```typescript
// Make sure layout.tsx includes Signup screen
{ name: 'Signup', component: SignupScreen }
```

**Issue: "AWS configuration error"**
```bash
# Re-run amplify configure
amplify configure
amplify push
```

---

## 💡 Tips

1. **Start Simple**: Test auth flow first, then add other features
2. **Use Demo Mode**: The "Continue as Guest" button lets you test without AWS
3. **Check Logs**: Use `console.log` to debug service calls
4. **Test Toasts**: Try all toast types (success, error, warning, info)
5. **Customize**: All services are modular - modify as needed

---

## ✅ Checklist

- [ ] Install dependencies
- [ ] Set up AWS (Amplify or manual)
- [ ] Configure .env file
- [ ] Update App.tsx with providers
- [ ] Test signup flow from Screen18
- [ ] Test login flow
- [ ] Test toasts and alerts
- [ ] Implement scan functionality
- [ ] Implement nutrition tracking
- [ ] Implement workout plans
- [ ] Implement leaderboard
- [ ] Deploy to production

---

**Ready to build? Start with Step 1 and follow the guide!** 🚀
