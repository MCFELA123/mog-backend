# Mog.ai Backend API Documentation

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [User APIs](#user-apis)
3. [Scan APIs](#scan-apis)
4. [Nutrition APIs](#nutrition-apis)
5. [Workout APIs](#workout-apis)
6. [Leaderboard & Social APIs](#leaderboard--social-apis)

---

## Authentication APIs

### Sign Up
```typescript
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "username": "mogger123",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

### Verify Email
```typescript
POST /auth/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}

Response:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Login
```typescript
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}

Response:
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "idToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 3600
  },
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "mogger123"
  }
}
```

### Refresh Token
```typescript
POST /auth/refresh
Authorization: Bearer {refreshToken}

Response:
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 3600
  }
}
```

---

## User APIs

### Get Profile
```typescript
GET /api/user/profile
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "mogger123",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "age": 25,
      "weight": 175,
      "height": 70
    },
    "mogScore": 85,
    "tier": "Chad",
    "rank": 1234,
    "streak": 7
  }
}
```

### Update Profile
```typescript
PUT /api/user/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "John",
  "age": 26,
  "weight": 180,
  "bio": "On my mog journey"
}

Response:
{
  "success": true,
  "data": { /* updated user object */ }
}
```

### Save Onboarding Data
```typescript
POST /api/user/onboarding
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "age": 25,
  "weight": 175,
  "height": 70,
  "bodyType": "mesomorph",
  "goals": ["Build Muscle", "Get Shredded"],
  "workoutFrequency": 4,
  "equipmentAccess": "full_gym"
}

Response:
{
  "success": true,
  "data": { /* updated user object */ }
}
```

### Get User Stats
```typescript
GET /api/user/stats
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "totalScans": 15,
    "currentStreak": 7,
    "longestStreak": 21,
    "totalWorkouts": 48,
    "mogScore": 85,
    "tier": "Chad",
    "rank": 1234
  }
}
```

---

## Scan APIs

### Create Scan (with AI Analysis)
```typescript
POST /api/scans/analyze
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "frontPhotoUrl": "s3://bucket/scans/user123/front.jpg",
  "sidePhotoUrl": "s3://bucket/scans/user123/side.jpg",
  "weight": 175,
  "measurements": {
    "chest": 42,
    "waist": 32,
    "arms": 16
  }
}

Response:
{
  "success": true,
  "data": {
    "scanId": "uuid",
    "userId": "user123",
    "createdAt": "2026-01-22T10:00:00Z",
    "mogScore": 85,
    "tier": "Chad",
    "analysis": {
      "frameScore": 88,
      "proportionScore": 82,
      "balanceScore": 85,
      "symmetryScore": 87,
      "limiterMuscles": ["Rear Delts", "Calves"],
      "recommendations": [
        "Focus on rear delt isolation work",
        "Add calf raises 3x per week"
      ]
    }
  }
}
```

### Get Scan History
```typescript
GET /api/scans/history?limit=10
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "scanId": "uuid",
      "createdAt": "2026-01-22T10:00:00Z",
      "mogScore": 85,
      "tier": "Chad",
      "frontPhotoUrl": "s3://..."
    }
  ]
}
```

### Get Latest Scan
```typescript
GET /api/scans/latest
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": { /* scan object */ }
}
```

### Compare Scans
```typescript
GET /api/scans/compare?scan1={scanId1}&scan2={scanId2}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "scan1": { /* scan object */ },
    "scan2": { /* scan object */ },
    "improvement": {
      "mogScoreDelta": 5,
      "weightDelta": -3,
      "tierChanged": false,
      "muscleGains": ["Shoulders", "Back"],
      "notes": "Solid progress on upper body development"
    }
  }
}
```

---

## Nutrition APIs

### Get Today's Nutrition
```typescript
GET /api/nutrition/day/{YYYY-MM-DD}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "dayId": "uuid",
    "userId": "user123",
    "date": "2026-01-22",
    "calorieTarget": 2500,
    "proteinTarget": 200,
    "caloriesConsumed": 2300,
    "proteinConsumed": 185,
    "carbsConsumed": 250,
    "fatsConsumed": 70,
    "meals": [ /* meal objects */ ],
    "compliancePercentage": 92,
    "isCompliant": true,
    "streakDay": 7
  }
}
```

### Add Meal
```typescript
POST /api/nutrition/meals
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Chicken & Rice",
  "calories": 500,
  "protein": 50,
  "carbs": 60,
  "fats": 10,
  "items": [
    {
      "name": "Grilled Chicken",
      "quantity": 6,
      "unit": "oz",
      "calories": 280,
      "protein": 53,
      "carbs": 0,
      "fats": 6
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "mealId": "uuid",
    "name": "Chicken & Rice",
    "time": "2026-01-22T12:30:00Z",
    "calories": 500,
    "protein": 50,
    "isAiEstimated": false
  }
}
```

### AI Meal Estimation (Photo)
```typescript
POST /api/nutrition/estimate/photo
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

{
  "photo": <file>
}

Response:
{
  "success": true,
  "data": {
    "name": "Grilled Chicken with Vegetables",
    "calories": 450,
    "protein": 45,
    "carbs": 35,
    "fats": 12,
    "confidence": 0.87,
    "items": [ /* food items */ ]
  }
}
```

### AI Meal Estimation (Text)
```typescript
POST /api/nutrition/estimate/text
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "description": "chicken breast with broccoli and brown rice"
}

Response:
{
  "success": true,
  "data": {
    "name": "Chicken with Broccoli and Rice",
    "calories": 480,
    "protein": 50,
    "carbs": 55,
    "fats": 8,
    "confidence": 0.92,
    "items": [ /* food items */ ]
  }
}
```

### Get Weekly Summary
```typescript
GET /api/nutrition/weekly-summary
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "week": "2026-W03",
    "days": [ /* nutrition day objects */ ],
    "averageCompliance": 89,
    "totalDaysCompliant": 6,
    "currentStreak": 7,
    "averageCalories": 2450,
    "averageProtein": 195
  }
}
```

---

## Workout APIs

### Get Active Workout Plan
```typescript
GET /api/workouts/active-plan
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "planId": "uuid",
    "name": "4-Day Upper/Lower Split",
    "daysPerWeek": 4,
    "currentWeek": 3,
    "workoutDays": [ /* workout day objects */ ]
  }
}
```

### Generate Workout Plan
```typescript
POST /api/workouts/generate-plan
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "goals": ["Build Muscle", "Get Shredded"],
  "daysPerWeek": 4,
  "experienceLevel": "intermediate",
  "equipmentAccess": "full_gym",
  "focusAreas": ["Back", "Shoulders"]
}

Response:
{
  "success": true,
  "data": {
    "planId": "uuid",
    "name": "Custom 4-Day Split",
    "workoutDays": [ /* generated workout days */ ]
  }
}
```

### Complete Workout
```typescript
POST /api/workouts/days/{dayId}/complete
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "exercises": [
    {
      "exerciseId": "bench-press",
      "setsCompleted": 4,
      "weight": 185,
      "reps": 8
    }
  ],
  "completedAt": "2026-01-22T15:30:00Z"
}

Response:
{
  "success": true,
  "data": { /* completed workout day */ }
}
```

### Get Current Weekly Mission
```typescript
GET /api/workouts/mission/current
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "missionId": "uuid",
    "weekStartDate": "2026-01-20",
    "objectives": [
      {
        "objectiveId": "uuid",
        "title": "Complete 4 Workouts",
        "type": "workout",
        "targetValue": 4,
        "currentValue": 2,
        "isCompleted": false
      }
    ],
    "progressPercentage": 50
  }
}
```

---

## Leaderboard & Social APIs

### Get Global Leaderboard
```typescript
GET /api/leaderboard/global?limit=50&offset=0
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "entries": [
      {
        "userId": "uuid",
        "username": "mogger123",
        "mogScore": 95,
        "tier": "Final Boss Mogger",
        "globalRank": 1,
        "totalScans": 50,
        "streakDays": 45
      }
    ],
    "userRank": 1234,
    "totalUsers": 50000
  }
}
```

### Get Top Moggers (Top 3)
```typescript
GET /api/leaderboard/top-moggers
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "alpha_mog",
      "mogScore": 98,
      "tier": "Final Boss Mogger",
      "globalRank": 1,
      "badge": "🔥"
    }
  ]
}
```

### Search Users
```typescript
GET /api/leaderboard/search?q=john
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "john_doe",
      "mogScore": 85,
      "tier": "Chad",
      "globalRank": 5432
    }
  ]
}
```

### Follow User
```typescript
POST /api/social/follow/{userId}
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "success": true
  }
}
```

### Get Activity Feed
```typescript
GET /api/social/feed?type=all&limit=20
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": [
    {
      "userId": "uuid",
      "username": "mogger123",
      "type": "scan",
      "content": "Just completed a new scan! Mog Score: 87",
      "timestamp": "2026-01-22T10:00:00Z",
      "likes": 45,
      "comments": 12
    }
  ]
}
```

---

## Error Responses

All API errors follow this format:

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional error details */ }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or expired token
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `NETWORK_ERROR` - Network connection issue
- `SERVER_ERROR` - Internal server error
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Rate Limits
- Authentication: 10 requests/minute
- Standard APIs: 100 requests/minute
- Photo Uploads: 20 uploads/hour
- AI Estimations: 50 requests/hour

---

## Webhook Events (Optional)
If you want real-time updates, you can subscribe to webhook events:

### Scan Complete
```json
{
  "event": "scan.completed",
  "userId": "uuid",
  "scanId": "uuid",
  "mogScore": 85,
  "tier": "Chad",
  "timestamp": "2026-01-22T10:00:00Z"
}
```

### Mission Complete
```json
{
  "event": "mission.completed",
  "userId": "uuid",
  "missionId": "uuid",
  "rewardPoints": 100,
  "timestamp": "2026-01-22T10:00:00Z"
}
```

### Tier Upgrade
```json
{
  "event": "tier.upgraded",
  "userId": "uuid",
  "previousTier": "Fit Normie",
  "newTier": "Chadlite",
  "timestamp": "2026-01-22T10:00:00Z"
}
```
