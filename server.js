/**
 * Mog.ai Backend Server v2.1
 * Complete backend for the fitness app with REAL AI Analysis
 * 
 * Features:
 * - User Authentication (signup, login, verification)
 * - Onboarding data storage
 * - Real AI Body Scan Analysis (OpenAI Vision API)
 * - Personalized workout plan generation
 * - Nutrition tracking & targets
 * - Leaderboard system
 * - Progress tracking
 */


// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

// MongoDB connection
const { connectMongo } = require('./mongo');
const User = require('./models/User');
const Onboarding = require('./models/Onboarding');
const Scan = require('./models/Scan');
const WorkoutPlan = require('./models/WorkoutPlan');
const NutritionLog = require('./models/NutritionLog');
const Leaderboard = require('./models/Leaderboard');

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Initialize OpenAI client
const OpenAI = require('openai');
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Gmail SMTP Configuration
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

// Create Gmail transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// Verify email configuration on startup
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.log('[EMAIL] Gmail SMTP configuration error:', error.message);
      console.log('[EMAIL] Emails will be logged to console instead');
    } else {
      console.log('[EMAIL] Gmail SMTP configured successfully');
    }
  });
} else {
  console.log('[EMAIL] Gmail credentials not configured - emails will be logged to console');
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// =====================================================
// TIER SYSTEM - Based on MogScore
// =====================================================

const TIERS = [
  { name: 'Final Boss Mogger', minScore: 97, type: 'mythic' },    // Pro bodybuilder - almost impossible
  { name: 'Mogger', minScore: 93, type: 'legendary' },            // Elite competitor
  { name: 'Gigachad', minScore: 88, type: 'epic' },               // Very impressive physique
  { name: 'Chad', minScore: 78, type: 'rare' },                   // Clearly above average
  { name: 'Chadlite', minScore: 68, type: 'uncommon' },           // Noticeable muscle
  { name: 'High-Tier Normie', minScore: 55, type: 'common' },     // Regular gym-goer
  { name: 'Normie', minScore: 45, type: 'common' },               // Average
  { name: 'Low-Tier Normie', minScore: 35, type: 'common' },      // Below average
  { name: 'Gym Bro', minScore: 0, type: 'starter' },              // Just starting
];

const getTierFromScore = (score) => {
  for (const tier of TIERS) {
    if (score >= tier.minScore) {
      return tier.name;
    }
  }
  return 'Gym Bro';
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// =====================================================
// EMAIL FUNCTIONS
// =====================================================

/**
 * Send verification email with code
 * Falls back to console logging if Gmail is not configured
 */
const sendVerificationEmail = async (email, code, firstName = '') => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #A259FF, #FF4D9E); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .card { background: linear-gradient(145deg, #1a1a1a, #0d0d0d); border: 1px solid #333; border-radius: 16px; padding: 30px; text-align: center; }
        .greeting { font-size: 18px; color: #aaa; margin-bottom: 10px; }
        .title { font-size: 24px; font-weight: 700; margin-bottom: 20px; }
        .code-box { background: linear-gradient(135deg, #A259FF20, #FF4D9E20); border: 2px solid #A259FF; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffffff; }
        .expires { font-size: 14px; color: #888; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>MOG.AI</h1>
        </div>
        <div class="card">
          <p class="greeting">Hey${firstName ? ' ' + firstName : ''} 👋</p>
          <p class="title">Verify your email to start mogging</p>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <p class="expires">This code expires in 10 minutes</p>
        </div>
        <div class="footer">
          <p>If you didn't create an account with Mog.ai, you can ignore this email.</p>
          <p>© ${new Date().getFullYear()} Mog.ai - Become the best version of yourself</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Check if Gmail is configured
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[EMAIL] Gmail not configured. Verification code for ${email}: ${code}`);
    return { success: true, method: 'console' };
  }

  try {
    const mailOptions = {
      from: `"Mog.ai" <${GMAIL_USER}>`,
      to: email,
      subject: `${code} is your Mog.ai verification code`,
      html: emailHtml,
      text: `Your Mog.ai verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account with Mog.ai, you can ignore this email.`,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] Verification email sent to ${email}`);
    return { success: true, method: 'gmail' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${email}:`, error.message);
    console.log(`[EMAIL] Fallback - Verification code for ${email}: ${code}`);
    return { success: false, method: 'console', error: error.message };
  }
};

// =====================================================
// AI PHYSIQUE ANALYSIS (OpenAI Vision API)
// =====================================================

/**
 * Analyze physique photos using OpenAI Vision API
 * Returns real AI analysis with mog score, muscle breakdown, etc.
 */
const analyzePhysiqueWithAI = async (frontPhotoBase64, backPhotoBase64, onboardingData) => {
  // Debug logging
  console.log('[AI] Received photos - Front:', typeof frontPhotoBase64, frontPhotoBase64 ? `exists (${frontPhotoBase64.length} chars)` : 'missing');
  console.log('[AI] Received photos - Back:', typeof backPhotoBase64, backPhotoBase64 ? `exists (${backPhotoBase64.length} chars)` : 'missing');
  
  // Check if we have valid string photos
  const hasFrontPhoto = frontPhotoBase64 && typeof frontPhotoBase64 === 'string' && frontPhotoBase64.length > 100;
  const hasBackPhoto = backPhotoBase64 && typeof backPhotoBase64 === 'string' && backPhotoBase64.length > 100;
  
  // STRICT MODE: Reject if no API key - do not use simulated analysis
  if (!OPENAI_API_KEY) {
    console.log('[AI] ERROR: No OpenAI API key configured');
    throw new Error('AI analysis is not available. Please configure OpenAI API key.');
  }
  
  // STRICT MODE: Reject if no valid photos
  if (!hasFrontPhoto && !hasBackPhoto) {
    console.log('[AI] ERROR: No valid photos provided');
    throw new Error('Please provide valid photos for analysis. Both front and back photos are required.');
  }
  
  if (!hasFrontPhoto) {
    console.log('[AI] ERROR: Front photo is missing or invalid');
    throw new Error('Front photo is missing or invalid. Please upload a clear front view photo.');
  }
  
  if (!hasBackPhoto) {
    console.log('[AI] ERROR: Back photo is missing or invalid');
    throw new Error('Back photo is missing or invalid. Please upload a clear back view photo.');
  }

  try {
    // Build context from onboarding data
    const userContext = buildUserContext(onboardingData);
    
    // Prepare image content for OpenAI
    const imageContent = [];
    
    // Validate and handle front photo
    if (frontPhotoBase64 && typeof frontPhotoBase64 === 'string') {
      // Handle both base64 and URI formats
      const base64Data = frontPhotoBase64.startsWith('data:') 
        ? frontPhotoBase64 
        : `data:image/jpeg;base64,${frontPhotoBase64}`;
      
      imageContent.push({
        type: 'image_url',
        image_url: { url: base64Data, detail: 'low' } // Changed to 'low' for faster processing
      });
    } else {
      console.log('[AI] Warning: frontPhotoBase64 is invalid:', typeof frontPhotoBase64);
    }
    
    // Validate and handle back photo
    if (backPhotoBase64 && typeof backPhotoBase64 === 'string') {
      const base64Data = backPhotoBase64.startsWith('data:') 
        ? backPhotoBase64 
        : `data:image/jpeg;base64,${backPhotoBase64}`;
      
      imageContent.push({
        type: 'image_url',
        image_url: { url: base64Data, detail: 'low' } // Changed to 'low' for faster processing
      });
    } else {
      console.log('[AI] Warning: backPhotoBase64 is invalid:', typeof backPhotoBase64);
    }

    const systemPrompt = `You are an elite fitness coach and physique analyst for the Mog.ai fitness app.
You must analyze BOTH the front photo AND back photo carefully to give an accurate assessment.

CRITICAL: Look at the ACTUAL images provided. Do NOT guess or use generic responses.

VALIDATION RULES:
- ACCEPT images that show a human body/physique, even if the face is visible - faces are OK!
- ACCEPT gym selfies, mirror selfies, progress photos - as long as body is visible
- REJECT images that ONLY show a face with no body visible
- REJECT random objects, landscapes, food, animals, screenshots, etc.
- CHECK if photos are swapped: IMAGE 1 should show FRONT view (chest, abs, front delts), IMAGE 2 should show BACK view (lats, rear delts, back)

IMPORTANT - SAME PERSON VERIFICATION:
Before flagging photos as different people, you MUST check ALL of these factors:
1. Clothing - Are they wearing the same shorts/underwear? Same color? Same style?
2. Environment - Is the background/location the same or similar? (same room, gym, mirror, etc.)
3. Skin tone - Account for different lighting which can make skin appear different
4. Body proportions - Similar height, build, shoulder width relative to waist
5. Tattoos/marks - If visible, do they match?
6. Items nearby - Same objects, furniture, gym equipment in both photos?
7. Photo quality/style - Same camera, same filter, same time period?

ONLY flag as different people if you are 100% CERTAIN they are different (e.g., completely different skin color, drastically different body sizes, different tattoos in same locations, different gender). When in doubt, ALWAYS assume it's the same person and proceed with analysis.

If you are ABSOLUTELY CERTAIN (100% confidence) the photos show DIFFERENT PEOPLE, respond with:
{
  "isValidPhysique": false,
  "differentPerson": true,
  "errorMessage": "The front and back photos appear to show different people. Please upload photos of the same person for accurate analysis."
}

If the photos appear to be SWAPPED (back photo uploaded as front, front photo uploaded as back), respond with:
{
  "isValidPhysique": false,
  "photosSwapped": true,
  "errorMessage": "It looks like your photos might be swapped! Please upload your FRONT view (showing chest/abs) in the first slot, and your BACK view (showing back/lats) in the second slot."
}

NUDITY DETECTION - CRITICAL:
If the photos contain NUDITY (exposed genitals, fully exposed buttocks, or any private parts clearly visible), respond with:
{
  "isValidPhysique": false,
  "inappropriateContent": true,
  "errorMessage": "⚠️ INAPPROPRIATE CONTENT DETECTED ⚠️\n\nYour photos contain nudity which violates our community guidelines.\n\nPlease upload photos wearing appropriate clothing (shorts, underwear, swimwear, etc.).\n\nRepeated violations may result in account suspension."
}

If the images do NOT show a human body/physique, respond ONLY with:
{
  "isValidPhysique": false,
  "errorMessage": "Please upload clear photos of your physique (front and back views of your body) for accurate analysis."
}

IF VALID PHYSIQUE PHOTOS, analyze them EXACTLY as you see them:

CLOTHING ASSESSMENT - IMPORTANT:
First, note what the person is wearing and adjust scoring accordingly:
- Shirtless/Sports bra: Best for judging upper body - full visibility
- Tank top/Stringer: Good visibility of shoulders, arms, some chest
- T-shirt: Limited upper body visibility - harder to judge, be more conservative
- Shorts/Boxers/Briefs: Good for judging legs and lower body
- Pants/Joggers/Sweats: Cannot properly judge legs - mark legs as null or reduce confidence
- Baggy clothes: CANNOT accurately assess - give conservative scores or mark areas as not visible

SCORING PENALTY FOR CLOTHING:
- If wearing a shirt that hides the torso, you CANNOT give high chest/core scores - be conservative
- If wearing pants/joggers, set legs to null (not visible) or give very conservative estimate
- Baggy clothing hides muscle definition - assume LESS muscle than visible, not more
- Only give high scores for body parts that are CLEARLY VISIBLE and UNCOVERED

IMPORTANT - ONLY SCORE WHAT YOU CAN ACTUALLY SEE:
- If legs are NOT visible in the photos, set legs score to null and add "legs" to notVisible array
- If any body part is cut off, covered by clothing, or not shown, do NOT guess - mark it as not visible
- Only provide scores for body parts you can CLEARLY see in the images

FRONT PHOTO ANALYSIS - Look for:
- Chest development (pec size, shape, definition, separation) - ONLY if shirtless/tank
- Shoulder width and deltoid caps (anterior/lateral heads visible from front)
- Arm development (biceps size, peak, vascularity)
- Core/abs (visible lines, V-taper, obliques) - ONLY if torso exposed
- Leg development if visible (quad sweep, definition) - mark null if wearing pants
- Overall body fat level (visible abs = lower bf%, no definition = higher bf%)

BACK PHOTO ANALYSIS - Look for:
- Back width (lat spread, V-taper from behind) - ONLY if shirtless/tank
- Back thickness (traps, rhomboids, erectors) - ONLY if shirtless
- Rear deltoid development
- Tricep development (horseshoe shape)
- Glute and hamstring development if visible - mark null if wearing pants
- Lower back definition (Christmas tree) - ONLY if shirtless

SCORING - BE STRICT AND CRITICAL:
Do NOT give inflated scores. Be honest and tough like a real bodybuilding judge.
Compare against ELITE standards. Most regular gym-goers score 40-65, not 70+.

STRICT SCORING GUIDELINES:
- 95-100: Pro bodybuilder / elite athlete level - EXTREMELY RARE
- 85-94: Competitive amateur bodybuilder - very impressive, years of dedicated training
- 75-84: Advanced lifter - clearly muscular, visible separation, low body fat
- 65-74: Intermediate lifter - noticeable muscle, some definition
- 50-64: Regular gym-goer - some training evident but nothing exceptional
- 40-49: Beginner - basic fitness, minimal muscle development
- 25-39: Untrained - little to no muscle definition
- 0-24: Very underdeveloped or skinny-fat
- null: Not visible in photos (add to notVisible array)

BE HARSH BUT FAIR:
- If someone is skinny with no muscle mass, give scores in the 30-45 range
- If someone is overweight with no definition, leanness should be 30-50
- Average person off the street = 40-55 range
- Only give 70+ if muscles are CLEARLY developed and defined
- Only give 85+ for genuinely impressive physiques
- Reserve 95+ for competitive bodybuilder level

RESPONSE FORMAT:
{
  "isValidPhysique": true,
  "mogScore": <calculated from VISIBLE muscle averages only - be strict>,
  "muscleBreakdown": {
    "chest": <score or null if not visible>,
    "shoulders": <score or null if not visible>,
    "back": <score or null if not visible>,
    "arms": <score or null if not visible>,
    "legs": <score or null if not visible>,
    "core": <score or null if not visible>,
    "leanness": <body fat estimate - higher score = leaner, be strict>
  },
  "notVisible": ["<list of body parts not visible in photos, e.g. 'legs', 'lower body'>"],
  "weakPoints": ["<2 weakest muscles you OBSERVED>"],
  "strongPoints": ["<2 strongest muscles you OBSERVED>"],
  "symmetry": <left-right balance 0-100>,
  "overallAssessment": "<2-3 sentences describing EXACTLY what you see. Be honest about their current level. Mention which parts were not visible and couldn't be scored.>",
  "improvementTips": ["<specific tip for their weakest area>", "<tip 2>", "<tip 3>"],
  "scanSteps": [
    {"title": "Analyzing Chest Development", "description": "<exact observation from front photo>"},
    {"title": "Measuring Back Width", "description": "<exact observation from back photo>"},
    {"title": "Evaluating Arm Size", "description": "<what you see>"},
    {"title": "Assessing Core Definition", "description": "<ab visibility, bf% estimate>"},
    {"title": "Calculating Final Score", "description": "<summary of overall development, note what wasn't visible>"}
  ]
}

TIER CALCULATION (mogScore determines tier) - STRICT THRESHOLDS:
- 97-100: Final Boss Mogger (elite pro bodybuilder - ALMOST NEVER GIVE THIS)
- 93-96: Mogger (competitive physique athlete - VERY RARE)
- 88-92: Gigachad (impressive, dedicated, visible muscle separation)
- 78-87: Chad (above average, clearly lifts, athletic)
- 68-77: Chadlite (noticeable progress, some muscle)
- 55-67: High-Tier Normie (regular gym-goer, working on it)
- 45-54: Normie (average person, beginner)
- 35-44: Low-Tier Normie (early stages, not much muscle)
- 0-34: Gym Bro (just starting or untrained)

REALITY CHECK:
- Most people who think they're a "Chad" are actually "Chadlite" or "High-Tier Normie"
- If you can't see clear muscle definition and separation, they're NOT a Chad
- "Gigachad" requires genuinely impressive development - not just being fit
- Reserve "Mogger" and "Final Boss" for competition-ready physiques only

BE HONEST. If someone is skinny, say so. If they're overweight, factor it into leanness. If muscles are small, give lower scores. Users want REAL feedback to improve.`;

    const userPrompt = `Analyze this person's physique from the provided photos.

IMAGE 1: FRONT VIEW - Analyze chest, shoulders (front delts), biceps, abs/core, front legs if visible
IMAGE 2: BACK VIEW - Analyze back (lats, traps), rear delts, triceps, glutes/hamstrings if visible

USER CONTEXT:
${userContext}

Look at BOTH images carefully. Base your scores on what you ACTUALLY SEE in each photo.
Respond with JSON only, no markdown, no explanation.`;

    console.log('[AI] Calling OpenAI Vision API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              ...imageContent
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.2, // Lower for more consistent, precise analysis
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] OpenAI API error:', error);
      return simulatePhysiqueAnalysis(onboardingData);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('[AI] No content in response');
      return simulatePhysiqueAnalysis(onboardingData);
    }

    console.log('[AI] Raw response from OpenAI:', content.substring(0, 500) + '...');

    // Parse JSON from response (handle potential markdown wrapping)
    let analysis;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
      console.log('[AI] Parsed analysis - mogScore:', analysis.mogScore, 'isValid:', analysis.isValidPhysique);
      console.log('[AI] Muscle breakdown:', JSON.stringify(analysis.muscleBreakdown));
    } catch (parseError) {
      console.error('[AI] Failed to parse response:', parseError);
      console.error('[AI] Raw content was:', content);
      return simulatePhysiqueAnalysis(onboardingData);
    }

    // Check if the image is a valid physique photo
    if (analysis.isValidPhysique === false) {
      console.log('[AI] Invalid physique image detected');
      return {
        isValidPhysique: false,
        errorMessage: analysis.errorMessage || 'Please upload a clear photo of your physique for accurate analysis.',
      };
    }

    // Validate and normalize the response
    const normalizedAnalysis = {
      isValidPhysique: true,
      mogScore: Math.max(0, Math.min(100, analysis.mogScore || 50)),
      tier: getTierFromScore(analysis.mogScore || 50),
      muscleBreakdown: {
        chest: analysis.muscleBreakdown?.chest || 50,
        shoulders: analysis.muscleBreakdown?.shoulders || 50,
        back: analysis.muscleBreakdown?.back || 50,
        arms: analysis.muscleBreakdown?.arms || 50,
        legs: analysis.muscleBreakdown?.legs || 50,
        core: analysis.muscleBreakdown?.core || 50,
        leanness: analysis.muscleBreakdown?.leanness || 50,
      },
      weakPoints: analysis.weakPoints || ['legs', 'back'],
      strongPoints: analysis.strongPoints || ['chest', 'arms'],
      symmetry: analysis.symmetry || 70,
      overallAssessment: analysis.overallAssessment || 'Analysis complete.',
      improvementTips: analysis.improvementTips || ['Focus on compound movements', 'Prioritize protein intake', 'Get adequate rest'],
      scanSteps: analysis.scanSteps || [],
      aiPowered: true,
    };

    console.log(`[AI] Analysis complete: Score=${normalizedAnalysis.mogScore}, Tier=${normalizedAnalysis.tier}`);
    return normalizedAnalysis;

  } catch (error) {
    console.error('[AI] Error during analysis:', error);
    return simulatePhysiqueAnalysis(onboardingData);
  }
};

/**
 * Build user context string from onboarding data
 */
const buildUserContext = (onboardingData) => {
  if (!onboardingData) return 'No additional context available.';
  
  const parts = [];
  
  if (onboardingData.gender) {
    parts.push(`Gender: ${onboardingData.gender}`);
  }
  if (onboardingData.age) {
    parts.push(`Age: ${onboardingData.age} years old`);
  }
  if (onboardingData.heightFeet && onboardingData.heightInches) {
    parts.push(`Height: ${onboardingData.heightFeet}'${onboardingData.heightInches}"`);
  }
  if (onboardingData.weightLbs) {
    parts.push(`Weight: ${onboardingData.weightLbs} lbs`);
  }
  if (onboardingData.trainingExperience) {
    parts.push(`Training Experience: ${onboardingData.trainingExperience}`);
  }
  if (onboardingData.primaryGoal) {
    parts.push(`Primary Goal: ${onboardingData.primaryGoal}`);
  }
  if (onboardingData.secondaryGoals?.length) {
    parts.push(`Secondary Goals: ${onboardingData.secondaryGoals.join(', ')}`);
  }
  if (onboardingData.trainingDaysPerWeek) {
    parts.push(`Training Days/Week: ${onboardingData.trainingDaysPerWeek}`);
  }
  if (onboardingData.equipmentType) {
    parts.push(`Equipment: ${onboardingData.equipmentType}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'No additional context available.';
};

/**
 * Fallback simulation when OpenAI API is not available
 */
const simulatePhysiqueAnalysis = (onboardingData) => {
  console.log('[AI] Using simulated analysis (no API key)');
  
  const experienceBonus = {
    'novice': 5,
    'beginner': 15,
    'intermediate': 30,
    'advanced': 45,
  };
  
  let baseScore = 40 + (experienceBonus[onboardingData?.trainingExperience] || 10);
  baseScore += Math.floor(Math.random() * 20) - 10;
  const mogScore = Math.max(20, Math.min(95, baseScore));
  
  const muscleBreakdown = {
    chest: Math.floor(50 + Math.random() * 40),
    shoulders: Math.floor(50 + Math.random() * 40),
    back: Math.floor(50 + Math.random() * 40),
    arms: Math.floor(50 + Math.random() * 40),
    legs: Math.floor(40 + Math.random() * 40),
    core: Math.floor(45 + Math.random() * 40),
    leanness: Math.floor(50 + Math.random() * 35),
  };
  
  const muscleEntries = Object.entries(muscleBreakdown);
  muscleEntries.sort((a, b) => a[1] - b[1]);
  
  return {
    isValidPhysique: true, // Always valid in fallback mode (user uploaded photos)
    mogScore,
    tier: getTierFromScore(mogScore),
    muscleBreakdown,
    weakPoints: muscleEntries.slice(0, 2).map(e => e[0]),
    strongPoints: muscleEntries.slice(-2).map(e => e[0]),
    symmetry: Math.floor(60 + Math.random() * 30),
    overallAssessment: 'Your physique shows potential. Focus on your weak points and maintain consistency.',
    improvementTips: [
      'Prioritize compound movements for overall development',
      'Ensure adequate protein intake (0.8-1g per lb bodyweight)',
      'Get 7-9 hours of quality sleep for recovery',
    ],
    scanSteps: [
      { title: 'Analyzing muscle structure', description: 'Evaluating overall muscle development' },
      { title: 'Measuring proportions', description: 'Checking symmetry and balance' },
      { title: 'Assessing body composition', description: 'Estimating lean mass distribution' },
      { title: 'Calculating Mog Score', description: 'Computing your fitness rating' },
    ],
    aiPowered: false,
  };
};

// Legacy function for backward compatibility
const analyzePhysique = (onboardingData) => {
  return simulatePhysiqueAnalysis(onboardingData);
};

// Generate personalized workout plan
const generateWorkoutPlan = (onboardingData, scanResults) => {
  const { trainingDaysPerWeek = 4, equipmentType = 'full-gym', primaryGoal = 'aesthetics' } = onboardingData || {};
  const { weakPoints = ['legs', 'back'] } = scanResults || {};
  
  const exercisesByMuscle = {
    'full-gym': {
      chest: ['Bench Press', 'Incline DB Press', 'Cable Flyes'],
      shoulders: ['Overhead Press', 'Lateral Raises', 'Face Pulls'],
      back: ['Lat Pulldown', 'Barbell Rows', 'Cable Rows'],
      arms: ['Barbell Curls', 'Tricep Pushdowns', 'Hammer Curls'],
      legs: ['Squats', 'Leg Press', 'Romanian Deadlifts', 'Leg Curls'],
    },
    'home-gym': {
      chest: ['DB Bench Press', 'Push-ups', 'DB Flyes'],
      shoulders: ['DB Shoulder Press', 'Lateral Raises', 'Arnold Press'],
      back: ['DB Rows', 'Pull-ups', 'Renegade Rows'],
      arms: ['DB Curls', 'Tricep Dips', 'Hammer Curls'],
      legs: ['Goblet Squats', 'Lunges', 'RDLs'],
    },
    'bodyweight': {
      chest: ['Push-ups', 'Diamond Push-ups', 'Decline Push-ups'],
      shoulders: ['Pike Push-ups', 'Wall Handstand', 'Shoulder Taps'],
      back: ['Pull-ups', 'Inverted Rows', 'Superman'],
      arms: ['Chin-ups', 'Dips', 'Close-grip Push-ups'],
      legs: ['Squats', 'Lunges', 'Bulgarian Split Squats'],
    },
  };
  
  const weeklyPlan = [];
  const muscleGroups = ['chest', 'back', 'shoulders', 'arms', 'legs'];
  const prioritizedMuscles = [...weakPoints, ...muscleGroups.filter(m => !weakPoints.includes(m))];
  
  for (let day = 1; day <= trainingDaysPerWeek; day++) {
    const musclesForDay = prioritizedMuscles.slice((day - 1) * 2 % 5, ((day - 1) * 2 % 5) + 2);
    const exercises = [];
    
    musclesForDay.forEach(muscle => {
      const muscleExercises = exercisesByMuscle[equipmentType]?.[muscle] || [];
      muscleExercises.slice(0, 3).forEach((name, idx) => {
        exercises.push({
          id: `ex_${day}_${muscle}_${idx}`,
          name,
          muscle,
          sets: primaryGoal === 'build-size' ? 4 : 3,
          reps: primaryGoal === 'lean' ? '12-15' : '8-12',
          completed: false,
        });
      });
    });
    
    weeklyPlan.push({
      day,
      name: `Day ${day}: ${musclesForDay.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' & ')}`,
      exercises,
      completed: false,
    });
  }
  
  return {
    planId: generateId(),
    name: `${trainingDaysPerWeek}-Day Split`,
    weeklyPlan,
    focusAreas: weakPoints,
    createdAt: new Date().toISOString(),
  };
};

// Calculate nutrition targets
const calculateNutritionTargets = (onboardingData) => {
  const { heightFeet = 5, heightInches = 10, weightLbs = 170, age = 25, gender = 'male', primaryGoal = 'aesthetics' } = onboardingData || {};
  
  const heightCm = (heightFeet * 12 + heightInches) * 2.54;
  const weightKg = weightLbs * 0.453592;
  
  let bmr = gender === 'female'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  
  const tdee = bmr * 1.55;
  
  let calorieTarget = primaryGoal === 'lean' 
    ? Math.round(tdee - 400)
    : primaryGoal === 'build-size' 
      ? Math.round(tdee + 300)
      : Math.round(tdee);
  
  const proteinGrams = Math.round(weightLbs * (primaryGoal === 'lean' ? 1.2 : 1.0));
  const fatGrams = Math.round((calorieTarget * 0.25) / 9);
  const carbGrams = Math.round((calorieTarget - (proteinGrams * 4) - (fatGrams * 9)) / 4);
  
  return {
    calories: calorieTarget,
    protein: proteinGrams,
    carbs: carbGrams,
    fats: fatGrams,
    mode: primaryGoal === 'lean' ? 'cutting' : primaryGoal === 'build-size' ? 'lean bulk' : 'recomp',
  };
};

// =====================================================
// ROUTES
// =====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Mog.ai Backend', version: '2.0' });
});

// ----- AUTH -----

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username, firstName, lastName, onboardingData, tempId } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ success: false, message: 'Email, password, and username required' });
  }
  try {
    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const userId = generateId();
    const verificationCode = generateVerificationCode();
    const user = new User({
      userId,
      email,
      password,
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      verificationCode,
      isVerified: false,
      mogScore: 0,
      tier: 'Unranked',
      streak: 0,
      createdAt: new Date(),
    });
    await user.save();
    
    // If we have a tempId, update the existing onboarding record with the real userId
    // Otherwise create a new one with the provided data
    if (tempId) {
      const existingOnboarding = await Onboarding.findOne({ userId: tempId });
      if (existingOnboarding) {
        // Update the tempId to the real userId and merge any new data
        const mergedData = { ...existingOnboarding.data, ...onboardingData };
        await Onboarding.findOneAndUpdate(
          { userId: tempId },
          { userId, data: mergedData },
          { new: true }
        );
        console.log(`[SIGNUP] Linked onboarding data from ${tempId} to ${userId}`);
      } else if (onboardingData) {
        await Onboarding.create({ userId, data: onboardingData });
      }
      
      // Link any scans from tempId to real userId
      const tempScans = await Scan.find({ userId: tempId });
      if (tempScans.length > 0) {
        await Scan.updateMany(
          { userId: tempId },
          { userId }
        );
        console.log(`[SIGNUP] Linked ${tempScans.length} scan(s) from ${tempId} to ${userId}`);
        
        // Update user's mogScore and tier from the latest scan
        const latestScan = tempScans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        if (latestScan) {
          user.mogScore = latestScan.mogScore;
          user.tier = latestScan.tier;
          await user.save();
          await updateLeaderboard(user);
          console.log(`[SIGNUP] Updated user score from linked scan: ${latestScan.mogScore}`);
        }
      }
      
      // Link any workout plans from tempId
      await WorkoutPlan.updateMany(
        { userId: tempId },
        { userId }
      );
    } else if (onboardingData) {
      await Onboarding.create({ userId, data: onboardingData });
    }
    
    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationCode, firstName);
    
    console.log(`[SIGNUP] ${email} registered. Email sent via: ${emailResult.method}`);
    res.json({ 
      success: true, 
      message: 'Account created. Check your email for verification code.', 
      userId,
      // Only include code in response for development/testing when email fails
      ...(emailResult.method === 'console' ? { verificationCode } : {})
    });
  } catch (err) {
    console.error('[SIGNUP] Error:', err);
    res.status(500).json({ success: false, message: 'Signup failed', error: err.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  const { email, code, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verificationCode !== code) return res.status(400).json({ success: false, message: 'Invalid code' });
    
    user.isVerified = true;
    await user.save();
    
    console.log(`[VERIFY] ${email} verified`);
    
    // If password provided, also return user data for auto-login
    if (password && user.password === password) {
      const onboarding = await Onboarding.findOne({ userId: user.userId });
      const scan = await Scan.findOne({ userId: user.userId }).sort({ createdAt: -1 });
      
      console.log(`[VERIFY] Found scan for user ${user.userId}:`, scan ? `Score: ${scan.mogScore}, Tier: ${scan.tier}` : 'No scan found');
      
      return res.json({ 
        success: true, 
        message: 'Email verified',
        autoLogin: true,
        user: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          mogScore: scan?.mogScore || user.mogScore || 0,
          tier: scan?.tier || user.tier || 'Unranked',
          streak: user.streak || 0,
          isVerified: true,
          muscleBreakdown: scan?.muscleBreakdown || null,
        },
        latestScan: scan ? {
          scanId: scan.scanId,
          mogScore: scan.mogScore,
          tier: scan.tier,
          muscleBreakdown: scan.muscleBreakdown,
          weakPoints: scan.weakPoints,
          strongPoints: scan.strongPoints,
          symmetry: scan.symmetry,
          overallAssessment: scan.overallAssessment,
          improvementTips: scan.improvementTips,
          frontPhotoUrl: scan.frontPhotoUrl,
          backPhotoUrl: scan.backPhotoUrl,
          timestamp: scan.timestamp,
        } : null,
        onboardingData: onboarding?.data || null,
        tokens: { accessToken: `access_${generateId()}`, refreshToken: `refresh_${generateId()}` },
      });
    }
    
    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
});

// Resend verification code
app.post('/api/auth/resend-code', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified' });
    
    // Generate new code
    const newCode = generateVerificationCode();
    user.verificationCode = newCode;
    await user.save();
    
    // Send email
    const emailResult = await sendVerificationEmail(email, newCode, user.firstName);
    
    console.log(`[RESEND] New code sent to ${email} via: ${emailResult.method}`);
    res.json({ 
      success: true, 
      message: 'Verification code resent',
      ...(emailResult.method === 'console' ? { verificationCode: newCode } : {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resend code', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid password' });
    
    const onboarding = await Onboarding.findOne({ userId: user.userId });
    const scan = await Scan.findOne({ odeinuserIdg: user.userId }).sort({ createdAt: -1 });
    
    console.log(`[LOGIN] ${email}`);
    
    res.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        mogScore: user.mogScore,
        tier: user.tier,
        streak: user.streak,
        isVerified: user.isVerified,
        muscleBreakdown: scan?.results?.muscleBreakdown || null,
      },
      onboardingData: onboarding?.data || null,
      tokens: { accessToken: `access_${generateId()}`, refreshToken: `refresh_${generateId()}` },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
});

// ----- ONBOARDING -----

app.post('/api/onboarding/save', async (req, res) => {
  const { tempId, data } = req.body;
  const id = tempId || generateId();
  try {
    await Onboarding.findOneAndUpdate({ userId: id }, { userId: id, data }, { upsert: true });
    console.log(`[ONBOARDING] Saved for ${id}`);
    res.json({ success: true, tempId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Save failed', error: err.message });
  }
});

app.get('/api/onboarding/:id', async (req, res) => {
  try {
    const onboarding = await Onboarding.findOne({ userId: req.params.id });
    res.json({ success: true, data: onboarding?.data || null });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

// ----- SCAN -----

app.post('/api/scan/analyze', async (req, res) => {
  const { userId, frontPhoto, backPhoto, onboardingData } = req.body;
  
  try {
    // Use real AI analysis with OpenAI Vision API
    const analysis = await analyzePhysiqueWithAI(frontPhoto, backPhoto, onboardingData || {});
    
    // Check if the image was detected as invalid physique
    if (analysis.isValidPhysique === false) {
      return res.status(400).json({
        success: false,
        isValidPhysique: false,
        message: analysis.errorMessage || 'Please upload a clear photo of your physique for accurate analysis.',
      });
    }
    
    const scanData = {
      scanId: generateId(),
      userId: userId || 'anonymous',
      mogScore: analysis.mogScore,
      tier: analysis.tier,
      muscleBreakdown: analysis.muscleBreakdown,
      weakPoints: analysis.weakPoints,
      strongPoints: analysis.strongPoints,
      symmetry: analysis.symmetry,
      overallAssessment: analysis.overallAssessment,
      improvementTips: analysis.improvementTips,
      scanSteps: analysis.scanSteps || [],
      aiPowered: analysis.aiPowered,
      // Save the physique images
      frontPhotoUrl: frontPhoto || null,
      backPhotoUrl: backPhoto || null,
      timestamp: new Date(),
    };
    
    // Save scan to MongoDB
    const scan = await Scan.create(scanData);
    
    // Update user score and save latest scan data if userId provided
    if (userId) {
      const user = await User.findOne({ 
        $or: [{ tempId: userId }, { userId: userId }]
      });
      if (user) {
        user.mogScore = analysis.mogScore;
        user.tier = analysis.tier;
        // Save the complete scan analysis for AI training plan generation
        user.latestScan = {
          scanId: scanData.scanId,
          mogScore: analysis.mogScore,
          tier: analysis.tier,
          muscleBreakdown: analysis.muscleBreakdown,
          weakPoints: analysis.weakPoints,
          strongPoints: analysis.strongPoints,
          symmetry: analysis.symmetry,
          overallAssessment: analysis.overallAssessment,
          improvementTips: analysis.improvementTips,
          timestamp: new Date(),
        };
        await user.save();
        await updateLeaderboard(user);
        console.log(`[SCAN] Saved latestScan to user ${userId}`);
      }
    }
    
    // Generate workout plan based on AI analysis
    const workoutPlanData = generateWorkoutPlan(onboardingData, analysis);
    if (userId) {
      await WorkoutPlan.findOneAndUpdate(
        { userId },
        { ...workoutPlanData, userId },
        { upsert: true }
      );
      
      // ALSO generate AI-powered weekly training plan based on scan analysis
      console.log(`[SCAN] Generating AI training plan for user ${userId}...`);
      try {
        const scanAnalysisData = {
          mogScore: analysis.mogScore,
          tier: analysis.tier,
          muscleBreakdown: analysis.muscleBreakdown,
          weakPoints: analysis.weakPoints || [],
          strongPoints: analysis.strongPoints || [],
          symmetry: analysis.symmetry,
          overallAssessment: analysis.overallAssessment,
          improvementTips: analysis.improvementTips || [],
        };
        
        const aiTrainingPlan = await generateAITrainingPlan(scanAnalysisData);
        
        // Save to user's profile
        const userToUpdate = await User.findOne({ 
          $or: [{ tempId: userId }, { userId: userId }]
        });
        if (userToUpdate) {
          userToUpdate.weeklyTrainingPlan = aiTrainingPlan;
          await userToUpdate.save();
          console.log(`[SCAN] AI training plan saved for user ${userId}`);
        }
      } catch (trainingError) {
        console.error(`[SCAN] Failed to generate AI training plan:`, trainingError.message);
        // Don't fail the scan if training plan generation fails
      }
    }
    
    console.log(`[SCAN] ${userId || 'anonymous'}: Score=${analysis.mogScore}, Tier=${analysis.tier}, AI=${analysis.aiPowered ? 'Yes' : 'No'}`);
    
    res.json({ success: true, scan: scanData, workoutPlan: workoutPlanData });
  } catch (error) {
    console.error('[SCAN] Error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
  }
});

app.get('/api/scan/history/:userId', async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, scans });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

// ----- WORKOUT -----

app.get('/api/workout/plan/:userId', async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({ userId: req.params.userId });
    if (!plan) return res.status(404).json({ success: false, message: 'No plan found' });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

app.post('/api/workout/complete-exercise', async (req, res) => {
  const { userId, dayIndex, exerciseId } = req.body;
  try {
    const plan = await WorkoutPlan.findOne({ userId });
    if (!plan) return res.status(404).json({ success: false, message: 'No plan found' });
    
    const day = plan.weeklyPlan[dayIndex];
    if (day) {
      const exercise = day.exercises.find(e => e.id === exerciseId);
      if (exercise) exercise.completed = true;
      day.completed = day.exercises.every(e => e.completed);
    }
    
    await plan.save();
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
});

// ----- WEEKLY TRAINING PLAN -----

// Get user's weekly training plan
app.get('/api/training/:userId/weekly', async (req, res) => {
  const { userId } = req.params;
  console.log(`[TRAINING] Getting weekly plan for user ${userId}`);
  
  try {
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    
    // Check if user has a weekly training plan
    if (user.weeklyTrainingPlan) {
      console.log(`[TRAINING] Found weekly plan: ${user.weeklyTrainingPlan.weekId}`);
      return res.json({ 
        success: true, 
        plan: user.weeklyTrainingPlan 
      });
    }
    
    console.log(`[TRAINING] No weekly plan found for user ${userId}`);
    return res.json({ success: false, message: 'No plan found' });
    
  } catch (err) {
    console.error('[TRAINING] Get weekly plan failed:', err);
    res.status(500).json({ success: false, message: 'Failed to get plan', error: err.message });
  }
});

// Save user's weekly training plan
app.post('/api/training/:userId/weekly', async (req, res) => {
  const { userId } = req.params;
  const { plan } = req.body;
  console.log(`[TRAINING] Saving weekly plan for user ${userId}, weekId: ${plan?.weekId}`);
  
  try {
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Save the weekly training plan
    user.weeklyTrainingPlan = plan;
    await user.save();
    
    console.log(`[TRAINING] Weekly plan saved successfully for user ${userId}`);
    return res.json({ success: true, message: 'Plan saved' });
    
  } catch (err) {
    console.error('[TRAINING] Save weekly plan failed:', err);
    res.status(500).json({ success: false, message: 'Failed to save plan', error: err.message });
  }
});

// Update a specific training day status
app.patch('/api/training/:userId/day', async (req, res) => {
  const { userId } = req.params;
  const { weekId, dayNumber, status } = req.body;
  console.log(`[TRAINING] Updating day ${dayNumber} to ${status} for user ${userId}`);
  
  try {
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (!user || !user.weeklyTrainingPlan) {
      return res.status(404).json({ success: false, message: 'No plan found' });
    }
    
    // Find and update the day
    const dayIndex = user.weeklyTrainingPlan.days.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) {
      return res.status(404).json({ success: false, message: 'Day not found' });
    }
    
    user.weeklyTrainingPlan.days[dayIndex].status = status;
    
    // If marking as done, also set next day as today
    if (status === 'done') {
      const nextDayIndex = user.weeklyTrainingPlan.days.findIndex(d => d.day === dayNumber + 1);
      if (nextDayIndex !== -1 && user.weeklyTrainingPlan.days[nextDayIndex].status === 'upcoming') {
        user.weeklyTrainingPlan.days[nextDayIndex].status = 'today';
      }
    }
    
    user.markModified('weeklyTrainingPlan');
    await user.save();
    
    console.log(`[TRAINING] Day ${dayNumber} updated to ${status}`);
    return res.json({ success: true, plan: user.weeklyTrainingPlan });
    
  } catch (err) {
    console.error('[TRAINING] Update day failed:', err);
    res.status(500).json({ success: false, message: 'Failed to update day', error: err.message });
  }
});

// Generate AI-powered personalized weekly training plan
app.post('/api/training/:userId/generate', async (req, res) => {
  const { userId } = req.params;
  console.log(`[AI TRAINING] Generating personalized training plan for user ${userId}`);
  
  try {
    // Find user and their latest scan data
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get the latest scan for this user
    const latestScan = await Scan.findOne({ userId }).sort({ timestamp: -1 });
    
    if (!latestScan) {
      return res.status(400).json({ 
        success: false, 
        message: 'No physique scan found. Please complete a body scan first.' 
      });
    }
    
    console.log(`[AI TRAINING] Found scan - MogScore: ${latestScan.mogScore}, Tier: ${latestScan.tier}`);
    console.log(`[AI TRAINING] Weak points: ${latestScan.weakPoints?.join(', ')}`);
    console.log(`[AI TRAINING] Strong points: ${latestScan.strongPoints?.join(', ')}`);
    
    // Build the AI prompt with user's physique data
    const scanData = {
      mogScore: latestScan.mogScore,
      tier: latestScan.tier,
      muscleBreakdown: latestScan.muscleBreakdown,
      weakPoints: latestScan.weakPoints || [],
      strongPoints: latestScan.strongPoints || [],
      symmetry: latestScan.symmetry,
      overallAssessment: latestScan.overallAssessment,
      improvementTips: latestScan.improvementTips || [],
    };
    
    // Generate the training plan using AI
    const trainingPlan = await generateAITrainingPlan(scanData);
    
    // Save the plan to user's profile
    user.weeklyTrainingPlan = trainingPlan;
    user.latestScan = scanData;
    await user.save();
    
    console.log(`[AI TRAINING] Plan generated and saved for user ${userId}`);
    
    res.json({ 
      success: true, 
      plan: trainingPlan,
      message: 'Training plan generated based on your physique analysis'
    });
    
  } catch (err) {
    console.error('[AI TRAINING] Generation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to generate plan', error: err.message });
  }
});

// AI Training Plan Generator Function
async function generateAITrainingPlan(scanData) {
  console.log('[AI TRAINING] Starting plan generation...');
  
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check your API key.');
  }
  
  const { mogScore, tier, muscleBreakdown, weakPoints, strongPoints, symmetry, overallAssessment, improvementTips } = scanData;
  
  console.log('[AI TRAINING] Scan data:', { mogScore, tier, weakPoints, strongPoints });
  
  // Optimized, shorter prompt for faster generation
  const systemPrompt = `You are an elite AI fitness coach. Create a 6-day personalized training plan.

USER DATA:
- Score: ${mogScore}/100 (${tier})
- Weak Points: ${weakPoints.join(', ')}
- Strong Points: ${strongPoints.join(', ')}

RULES:
1. Day 1 targets #1 weak point
2. Each day: 3-4 exercises max
3. Each exercise: 3-4 steps (sets), 60sec each
4. Badge exercises targeting weak points: "WEAK POINT" (#FF4D9E)
5. Badge compound movements: "COMPOUND" (#FFD700)

OUTPUT (JSON only):
{
  "mission": "[target weak point] → Push Mog Score",
  "expectedGain": [0.5-1.5],
  "targets": [{"name": "[weak1]", "points": 0.8}, {"name": "[weak2]", "points": 0.4}],
  "days": [{
    "day": 1,
    "title": "[Focus area]",
    "type": "Strength|Hypertrophy|Recovery",
    "typeColor": "#FF4D9E|#4A7CFF|#00FF88",
    "status": "today",
    "duration": "45 min",
    "caloriesBurn": 300,
    "targetMuscles": ["muscle1"],
    "exercises": [{
      "name": "[Exercise]",
      "sets": "4 x 8-10",
      "note": "[Form tip]",
      "badge": "WEAK POINT|COMPOUND|null",
      "badgeColor": "#FF4D9E|#FFD700|null",
      "steps": [
        {"stepNumber": 1, "title": "Set 1 - Warm Up", "description": "[Motivational instruction]", "duration": 60}
      ]
    }]
  }]
}

Generate 6 days. Day 1 = "today", others = "upcoming".`;

  try {
    console.log('[AI TRAINING] Calling OpenAI API (gpt-4o-mini for speed)...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate my 6-day training plan. JSON only.' }
      ],
      temperature: 0.6,
      max_tokens: 4000, // Reduced for faster response
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[AI TRAINING] OpenAI response received in ${elapsed}ms`);

    let planText = response.choices[0].message.content.trim();
    console.log('[AI TRAINING] Plan text length:', planText.length);
    
    // Remove markdown code blocks if present
    if (planText.startsWith('```')) {
      planText = planText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      console.log('[AI TRAINING] Removed markdown, new length:', planText.length);
    }
    
    console.log('[AI TRAINING] Parsing JSON...');
    const plan = JSON.parse(planText);
    console.log('[AI TRAINING] JSON parsed successfully, days:', plan.days?.length);
    
    // Ensure proper timestamps
    const now = new Date();
    plan.weekId = `week-${now.getTime()}`;
    plan.startDate = now.toISOString();
    plan.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    plan.generatedAt = now.toISOString();
    
    // Ensure all days have proper structure
    plan.days = plan.days.map((day, index) => ({
      ...day,
      day: index + 1,
      status: index === 0 ? 'today' : 'upcoming',
      exercises: day.exercises.map(ex => ({
        ...ex,
        borderColor: ex.borderColor || '#3A2A4A',
        steps: (ex.steps || []).map(step => ({
          ...step,
          duration: Math.max(60, step.duration || 60) // Ensure minimum 60 seconds
        }))
      }))
    }));
    
    console.log(`[AI TRAINING] Generated plan with ${plan.days.length} days, mission: ${plan.mission}`);
    
    return plan;
    
  } catch (error) {
    console.error('[AI TRAINING] OpenAI API error:', error.message);
    console.error('[AI TRAINING] Full error:', error);
    throw new Error('Failed to generate AI training plan: ' + error.message);
  }
}

// ----- TRAINING SESSION -----

// Complete a training day
app.post('/api/training/complete-day', async (req, res) => {
  const { userId, weekId, dayNumber } = req.body;
  console.log(`[TRAINING] Completing day ${dayNumber} for user ${userId}`);
  
  try {
    // Find the workout plan
    const plan = await WorkoutPlan.findOne({ userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'No workout plan found' });
    }
    
    // Find and update the day status
    const dayIndex = plan.weeklyPlan.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) {
      return res.status(404).json({ success: false, message: 'Day not found in plan' });
    }
    
    // Mark day as completed
    plan.weeklyPlan[dayIndex].status = 'done';
    plan.weeklyPlan[dayIndex].completed = true;
    plan.weeklyPlan[dayIndex].completedAt = new Date();
    
    // Mark all exercises as completed
    if (plan.weeklyPlan[dayIndex].exercises) {
      plan.weeklyPlan[dayIndex].exercises = plan.weeklyPlan[dayIndex].exercises.map(ex => ({
        ...ex,
        completed: true
      }));
    }
    
    await plan.save();
    
    // Calculate mog points earned
    const exerciseCount = plan.weeklyPlan[dayIndex].exercises?.length || 3;
    const mogPointsEarned = 0.2 + exerciseCount * 0.15;
    
    // Update user's mog score
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (user) {
      user.mogScore = (user.mogScore || 0) + mogPointsEarned;
      user.totalWorkouts = (user.totalWorkouts || 0) + 1;
      user.lastWorkoutDate = new Date();
      await user.save();
      
      console.log(`[TRAINING] User ${userId} earned ${mogPointsEarned} mog points. Total: ${user.mogScore}`);
      
      // Return updated data
      res.json({
        success: true,
        dayCompleted: dayNumber,
        mogPointsEarned,
        newMogScore: user.mogScore,
        totalWorkouts: user.totalWorkouts,
      });
    } else {
      res.json({
        success: true,
        dayCompleted: dayNumber,
        mogPointsEarned,
      });
    }
    
  } catch (err) {
    console.error('[TRAINING] Complete day failed:', err);
    res.status(500).json({ success: false, message: 'Failed to complete day', error: err.message });
  }
});

// Start a training session
app.post('/api/training/start-session', async (req, res) => {
  const { userId, weekId, dayNumber } = req.body;
  console.log(`[TRAINING] Starting session for day ${dayNumber}, user ${userId}`);
  
  try {
    const plan = await WorkoutPlan.findOne({ userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'No workout plan found' });
    }
    
    const dayIndex = plan.weeklyPlan.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) {
      return res.status(404).json({ success: false, message: 'Day not found' });
    }
    
    // Mark day as in progress
    plan.weeklyPlan[dayIndex].status = 'today';
    plan.weeklyPlan[dayIndex].startedAt = new Date();
    
    await plan.save();
    
    res.json({
      success: true,
      session: {
        dayNumber,
        startedAt: new Date(),
        exercises: plan.weeklyPlan[dayIndex].exercises,
      }
    });
    
  } catch (err) {
    console.error('[TRAINING] Start session failed:', err);
    res.status(500).json({ success: false, message: 'Failed to start session', error: err.message });
  }
});

// ----- NUTRITION -----

// ----- EXERCISE IMAGE GENERATION (DALL-E) -----

// Global rate limiter for DALL-E requests (5 images per minute limit)
const imageGenerationQueue = {
  lastRequestTime: 0,
  isProcessing: false,
  minDelayMs: 15000, // 15 seconds between exercises (3 images each, well under 5/min)
};

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - imageGenerationQueue.lastRequestTime;
  
  if (timeSinceLastRequest < imageGenerationQueue.minDelayMs) {
    const waitTime = imageGenerationQueue.minDelayMs - timeSinceLastRequest;
    console.log(`[AI-IMAGE] Rate limit: waiting ${waitTime}ms before next exercise...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  imageGenerationQueue.lastRequestTime = Date.now();
};

app.post('/api/workout/generate-exercise-image', async (req, res) => {
  const { exerciseName, exerciseId } = req.body;
  
  if (!exerciseName) {
    return res.status(400).json({ success: false, message: 'Exercise name required' });
  }
  
  // Use high-quality fitness stock images for instant loading
  // Categorized by muscle group for relevant visuals
  const getFitnessImages = (exName, exId) => {
    const name = exName.toLowerCase();
    
    // Leg exercises
    if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('deadlift')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Chest/Push exercises
    if (name.includes('press') || name.includes('push') || name.includes('chest') || name.includes('bench')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1598971639058-a907e5e9f3d5?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Back/Pull exercises
    if (name.includes('row') || name.includes('pull') || name.includes('back') || name.includes('lat')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Arm/Bicep/Tricep exercises
    if (name.includes('curl') || name.includes('bicep') || name.includes('tricep') || name.includes('arm')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1591940742878-13aba4b7a34e?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Shoulder exercises
    if (name.includes('shoulder') || name.includes('raise') || name.includes('lateral') || name.includes('delt')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Core/Ab exercises
    if (name.includes('plank') || name.includes('crunch') || name.includes('core') || name.includes('ab')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Default - general workout images
    return [
      { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop', phase: 'start' },
      { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop', phase: 'middle' },
      { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&h=600&fit=crop', phase: 'end' },
    ];
  };
  
  // Return instantly with relevant stock images - no AI generation delay
  console.log(`[AI-IMAGE] Returning instant images for: ${exerciseName}`);
  return res.json({
    success: true,
    images: getFitnessImages(exerciseName, exerciseId),
  });
});

// AI Form Analysis endpoint - analyzes user's form via camera capture
app.post('/api/workout/analyze-form', async (req, res) => {
  const { exerciseName, stepName, imageBase64, stepNumber, totalSteps } = req.body;
  
  if (!exerciseName || !imageBase64) {
    return res.status(400).json({ 
      success: false, 
      isCorrectForm: false, 
      confidence: 0, 
      feedback: 'Missing exercise name or image',
      guidance: ''
    });
  }
  
  if (!openai) {
    console.log('[AI-FORM] OpenAI not initialized - returning mock response');
    return res.json({
      success: true,
      isCorrectForm: true,
      confidence: 75,
      feedback: 'Keep up the good form! Focus on controlled movements.',
      guidance: 'Maintain steady breathing throughout the movement.'
    });
  }
  
  try {
    console.log(`[AI-FORM] Analyzing form for: ${exerciseName} - ${stepName || 'general'}`);
    
    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a friendly, encouraging personal trainer speaking DIRECTLY to the user during their workout. Talk TO them, not ABOUT them.

YOUR PERSONALITY: Warm, supportive, but honest. Like a best friend who's also a fitness expert. Use "you" and "your" - speak directly to the person.

ANALYZE THE IMAGE:
1. What do you see? (their position, the environment)
2. Are they actively doing the exercise or waiting/resting?
3. If exercising, is their form correct?

FOR ${exerciseName.toUpperCase()}:
- Check the key positions and alignment
- Look for common mistakes
- Be ready to guide them through proper execution

HOW TO RESPOND:

IF THEY'RE NOT EXERCISING YET:
- feedback: "Alright, let's get started! I'm here to guide you."
- guidance: Tell them exactly how to begin. E.g., "Stand with your feet shoulder-width apart, take a breath, and let's do this together."

IF THEIR FORM NEEDS WORK:
- feedback: Acknowledge their effort, then correct. E.g., "Good effort! Let's adjust your stance a bit."
- guidance: Give specific, actionable coaching. E.g., "Push your hips back more, keep your chest up, and drive through your heels."

IF THEIR FORM IS GOOD:
- feedback: Celebrate! E.g., "That's it! Perfect form, keep that energy!"
- guidance: Encourage continuation. E.g., "Maintain that position, breathe steadily, you're doing amazing."

IF YOU CAN'T SEE THEM CLEARLY:
- feedback: "I can't quite see you clearly."
- guidance: "Try adjusting your phone so I can see your full body."

RULES:
- NEVER say "The person is..." - Always say "You are..." or give direct commands
- Be conversational and motivating, not robotic
- Keep feedback warm but honest
- isCorrectForm: true ONLY if form is genuinely good

Respond ONLY in valid JSON:
{
  "isCorrectForm": boolean,
  "confidence": number (0-100),
  "feedback": "10-15 words speaking directly to the user",
  "guidance": "15-30 words of specific coaching instructions for them"
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `EXERCISE: ${exerciseName}
CURRENT STEP (${stepNumber || 1}/${totalSteps || 1}): ${stepName || 'in progress'}

Look at this image and coach the user directly. What should they do?`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high' // Use high detail for accurate analysis
              }
            }
          ]
        }
      ],
      max_tokens: 250,
      temperature: 0.2 // Low temperature for consistent, honest responses
    });
    
    const content = completion.choices?.[0]?.message?.content || '';
    console.log('[AI-FORM] Raw response:', content);
    
    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[AI-FORM] ✅ Analysis complete - Correct: ${parsed.isCorrectForm}, Confidence: ${parsed.confidence}%`);
        console.log(`[AI-FORM] Feedback: ${parsed.feedback}`);
        console.log(`[AI-FORM] Guidance: ${parsed.guidance}`);
        return res.json({
          success: true,
          isCorrectForm: parsed.isCorrectForm ?? false,
          confidence: parsed.confidence ?? 50,
          feedback: parsed.feedback ?? 'Check your form.',
          guidance: parsed.guidance ?? 'Focus on proper technique.'
        });
      }
    } catch (parseErr) {
      console.log('[AI-FORM] JSON parse error:', parseErr.message);
    }
    
    // Fallback - be conservative if parsing fails
    res.json({
      success: true,
      isCorrectForm: false,
      confidence: 40,
      feedback: 'Unable to analyze clearly. Please adjust your position.',
      guidance: 'Make sure your full body is visible to the camera.'
    });
    
  } catch (err) {
    console.error('[AI-FORM] Analysis failed:', err.message);
    res.json({
      success: false,
      isCorrectForm: false,
      confidence: 30,
      feedback: 'Analysis error. Continue with focus on form.',
      guidance: 'Maintain proper posture and controlled movements.'
    });
  }
});

app.get('/api/nutrition/targets/:userId', async (req, res) => {
  try {
    const onboarding = await Onboarding.findOne({ userId: req.params.userId });
    if (!onboarding?.data) return res.status(404).json({ success: false, message: 'No data found' });
    
    const targets = calculateNutritionTargets(onboarding.data);
    const today = new Date().toISOString().split('T')[0];
    const logs = await NutritionLog.find({ userId: req.params.userId });
    const todayLogs = logs.filter(l => l.date.toISOString().startsWith(today));
    
    const consumed = todayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    res.json({ success: true, targets, consumed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

app.post('/api/nutrition/log', async (req, res) => {
  const { userId, meal } = req.body;
  try {
    const log = await NutritionLog.create({
      logId: generateId(),
      userId,
      date: new Date(),
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      meal,
    });
    console.log(`[NUTRITION] Logged for ${userId}`);
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Log failed', error: err.message });
  }
});

// ----- LEADERBOARD -----

const updateLeaderboard = async (user) => {
  try {
    await Leaderboard.findOneAndUpdate(
      { userId: user.userId },
      { userId: user.userId, username: user.username, mogScore: user.mogScore, tier: user.tier },
      { upsert: true }
    );
    // Recalculate ranks
    const all = await Leaderboard.find().sort({ mogScore: -1 });
    for (let i = 0; i < all.length; i++) {
      all[i].rank = i + 1;
      await all[i].save();
    }
  } catch (err) {
    console.error('[LEADERBOARD] Update error:', err);
  }
};

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Leaderboard.find().sort({ mogScore: -1 }).limit(50);
    const total = await Leaderboard.countDocuments();
    res.json({ success: true, leaderboard, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

app.get('/api/leaderboard/rank/:userId', async (req, res) => {
  try {
    const entry = await Leaderboard.findOne({ userId: req.params.userId });
    res.json({ success: true, ...(entry?.toObject() || {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

// ----- USER PROFILE -----

app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const onboarding = await Onboarding.findOne({ userId: req.params.userId });
    const scans = await Scan.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    const workoutPlan = await WorkoutPlan.findOne({ userId: req.params.userId });
    
    res.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        mogScore: user.mogScore,
        tier: user.tier,
        streak: user.streak,
      },
      onboardingData: onboarding?.data || null,
      latestScan: scans[0] || null,
      hasWorkoutPlan: !!workoutPlan,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// Manually trigger background job (for testing/admin)
app.post('/api/admin/run-background-job', async (req, res) => {
  console.log('[ADMIN] Manually triggering background generation job...');
  
  // Run in background, don't wait for completion
  runBackgroundGenerationJob().catch(err => {
    console.error('[ADMIN] Background job error:', err);
  });
  
  res.json({ 
    success: true, 
    message: 'Background job started. Check server logs for progress.' 
  });
});

// Get background job status
app.get('/api/admin/job-status', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isVerified: true });
    const usersWithPlans = await WorkoutPlan.countDocuments();
    const usersProcessing = processingUsers.size;
    
    res.json({
      success: true,
      status: {
        totalVerifiedUsers: totalUsers,
        usersWithTrainingPlans: usersWithPlans,
        usersCurrentlyProcessing: usersProcessing,
        processingUserIds: Array.from(processingUsers),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate training plan for a specific user
app.post('/api/admin/generate-plan/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const user = await User.findOne({ 
      $or: [{ userId }, { tempId: userId }]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log(`[ADMIN] Generating plan for user ${user.email}`);
    
    // Run in background
    generatePlanForUser(user).catch(err => {
      console.error(`[ADMIN] Failed to generate plan for ${user.email}:`, err);
    });
    
    res.json({ 
      success: true, 
      message: `Training plan generation started for ${user.email}. Check server logs for progress.` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// SEED LEADERBOARD
// =====================================================

const seedLeaderboard = async () => {
  const seedUsers = [
    { userId: 'seed_1', username: 'APEX_King', mogScore: 99, tier: 'Final Boss Mogger' },
    { userId: 'seed_2', username: 'TitanFrame', mogScore: 98, tier: 'Final Boss Mogger' },
    { userId: 'seed_3', username: 'AlphaElite_92', mogScore: 96, tier: 'Mogger' },
    { userId: 'seed_4', username: 'IronDominance', mogScore: 94, tier: 'Mogger' },
    { userId: 'seed_5', username: 'PhysiqueGoat', mogScore: 91, tier: 'Mogger' },
    { userId: 'seed_6', username: 'AestheticPeak', mogScore: 88, tier: 'Gigachad' },
    { userId: 'seed_7', username: 'MogMaster', mogScore: 86, tier: 'Gigachad' },
    { userId: 'seed_8', username: 'GymKing', mogScore: 82, tier: 'Chad' },
    { userId: 'seed_9', username: 'LiftLord', mogScore: 79, tier: 'Chad' },
    { userId: 'seed_10', username: 'IronWolf', mogScore: 76, tier: 'Chad' },
  ];
  
  try {
    for (let i = 0; i < seedUsers.length; i++) {
      const user = seedUsers[i];
      await Leaderboard.findOneAndUpdate(
        { userId: user.userId },
        { ...user, rank: i + 1 },
        { upsert: true }
      );
    }
    console.log(`[SEED] Added ${seedUsers.length} users to leaderboard`);
  } catch (err) {
    console.error('[SEED] Error:', err);
  }
};

// =====================================================
// BACKGROUND JOB: Pre-generate training plans and images for all users
// =====================================================

// Track which users we're currently processing to avoid duplicates
const processingUsers = new Set();

// Generate training plan for a user if they don't have one
const generatePlanForUser = async (user) => {
  const userId = user.userId || user.tempId;
  
  if (processingUsers.has(userId)) {
    console.log(`[BG-JOB] Skipping ${user.email} - already processing`);
    return;
  }
  
  processingUsers.add(userId);
  
  try {
    // Check if user already has a plan
    const existingPlan = await WorkoutPlan.findOne({ userId });
    if (existingPlan && existingPlan.weeklyPlan?.length > 0) {
      console.log(`[BG-JOB] User ${user.email} already has a plan`);
      processingUsers.delete(userId);
      return;
    }
    
    // Get user's onboarding data for personalized plan
    const onboarding = await Onboarding.findOne({ userId });
    const latestScan = await Scan.findOne({ userId }).sort({ createdAt: -1 });
    
    // Get weak points from scan or use defaults
    const weakPoints = latestScan?.weakPoints || ['Overall', 'Core'];
    const primaryFocus = weakPoints[0] || 'Overall';
    
    console.log(`[BG-JOB] Generating training plan for ${user.email} (focus: ${primaryFocus})`);
    
    // Generate AI training plan
    const weeklyPlan = await generateAITrainingPlan(userId, primaryFocus, onboarding?.data);
    
    if (weeklyPlan) {
      // Save the plan
      await WorkoutPlan.findOneAndUpdate(
        { userId },
        { 
          userId,
          weekId: `week_${Date.now()}`,
          weeklyPlan,
          generatedAt: new Date(),
          mission: `Target ${primaryFocus} → Maximize Mog Score`,
          expectedGain: 1.2,
        },
        { upsert: true, new: true }
      );
      
      console.log(`[BG-JOB] ✅ Training plan generated for ${user.email}`);
      
      // Pre-generate images for first day's exercises (with rate limiting)
      if (weeklyPlan[0]?.exercises && OPENAI_API_KEY) {
        console.log(`[BG-JOB] Pre-generating images for ${user.email}'s Day 1...`);
        for (const exercise of weeklyPlan[0].exercises.slice(0, 2)) { // Limit to 2 exercises due to rate limits
          await generateExerciseImagesForBackground(exercise.id || exercise.name, exercise.name);
          // Wait 45 seconds between exercises to respect rate limits (3 images * 15s)
          await new Promise(resolve => setTimeout(resolve, 45000));
        }
      }
    }
  } catch (err) {
    console.error(`[BG-JOB] Failed to generate plan for ${user.email}:`, err.message);
  } finally {
    processingUsers.delete(userId);
  }
};

// Generate exercise images in background (stores in cache collection)
const generateExerciseImagesForBackground = async (exerciseId, exerciseName) => {
  if (!OPENAI_API_KEY) return null;
  
  const phases = [
    { id: 'start', description: 'starting position, muscles relaxed, body ready to begin the movement' },
    { id: 'middle', description: 'mid-movement phase, muscles engaged, transitioning through the exercise' },
    { id: 'end', description: 'peak contraction position, muscles fully squeezed, at the top of the movement' }
  ];
  
  const images = [];
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    
    try {
      console.log(`[BG-JOB] Generating ${phase.id} image for ${exerciseName}...`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Digital art of a glowing neon humanoid figure made of geometric wireframe lines performing ${exerciseName} exercise - ${phase.description}. The figure is an abstract robotic mannequin with cyan and magenta glowing edges on pure black background. Minimalist tech aesthetic, no realistic features, just clean geometric wireframe body shape. Tron-style digital art.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });
      
      const data = await response.json();
      
      if (data.data?.[0]?.url) {
        images.push({ id: `${exerciseId}-${i + 1}`, url: data.data[0].url, phase: phase.id });
        console.log(`[BG-JOB] ✅ Generated ${phase.id} for ${exerciseName}`);
      }
      
      // Wait 15 seconds between images
      if (i < phases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    } catch (err) {
      console.error(`[BG-JOB] Image generation error for ${exerciseName}:`, err.message);
    }
  }
  
  return images;
};

// Background job: Process all registered users
const runBackgroundGenerationJob = async () => {
  console.log('[BG-JOB] Starting background generation job...');
  
  try {
    // Find all verified users who might need training plans
    const users = await User.find({ 
      isVerified: true,
      email: { $exists: true, $ne: null }
    }).limit(50); // Process max 50 users per run to avoid overload
    
    console.log(`[BG-JOB] Found ${users.length} verified users to check`);
    
    for (const user of users) {
      // Check if user has a workout plan
      const userId = user.userId || user.tempId;
      const existingPlan = await WorkoutPlan.findOne({ userId });
      
      if (!existingPlan || !existingPlan.weeklyPlan?.length) {
        console.log(`[BG-JOB] User ${user.email} needs a training plan`);
        await generatePlanForUser(user);
        
        // Wait 30 seconds between users to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    console.log('[BG-JOB] ✅ Background generation job completed');
  } catch (err) {
    console.error('[BG-JOB] Job failed:', err.message);
  }
};

// Schedule background job to run periodically
const startBackgroundJobs = () => {
  console.log('[BG-JOB] Initializing background job scheduler...');
  
  // Run immediately on startup (after 10 second delay to let server stabilize)
  setTimeout(() => {
    console.log('[BG-JOB] Running initial background generation...');
    runBackgroundGenerationJob();
  }, 10000);
  
  // Then run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('[BG-JOB] Scheduled run starting...');
    runBackgroundGenerationJob();
  }, SIX_HOURS);
};

// =====================================================
// START SERVER
// =====================================================

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectMongo();
    
    // Seed leaderboard after connection
    await seedLeaderboard();
    
    // Start background jobs
    startBackgroundJobs();
    
    // Start Express server
    app.listen(PORT, () => {
      const hasApiKey = !!OPENAI_API_KEY;
      console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   🏋️  MOG.AI BACKEND SERVER v2.1  🏋️              ║
  ║   Running on: http://localhost:${PORT}              ║
  ║   AI Mode: ${hasApiKey ? '✅ OpenAI Vision Enabled' : '⚠️  Simulated (set OPENAI_API_KEY)'}       ║
  ║   Background Jobs: ✅ Enabled                      ║
  ╚═══════════════════════════════════════════════════╝
  
  Endpoints:
  - POST /api/auth/signup
  - POST /api/auth/verify
  - POST /api/auth/login
  - POST /api/onboarding/save
  - POST /api/scan/analyze (AI-powered!)
  - GET  /api/scan/history/:userId
  - GET  /api/workout/plan/:userId
  - GET  /api/nutrition/targets/:userId
  - POST /api/nutrition/log
  - GET  /api/leaderboard
  - GET  /api/user/:userId
  
  Background Jobs:
  - Training plan generation for all verified users
  - Exercise image pre-generation (DALL-E 3)
      `);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
};

startServer();
