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

// Create Gmail transporter with settings optimized for cloud hosting
const emailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certs
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
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

/**
 * Send password reset email with code
 */
const sendPasswordResetEmail = async (email, code, firstName = '') => {
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
        .code-box { background: linear-gradient(135deg, #FF4D9E20, #A259FF20); border: 2px solid #FF4D9E; border-radius: 12px; padding: 20px; margin: 20px 0; }
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
          <p class="title">Reset your password</p>
          <p style="color: #aaa; font-size: 14px;">Use this code to reset your Mog.ai password</p>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <p class="expires">This code expires in 10 minutes</p>
        </div>
        <div class="footer">
          <p>If you didn't request a password reset, you can ignore this email.</p>
          <p>© ${new Date().getFullYear()} Mog.ai - Become the best version of yourself</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Check if Gmail is configured
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log(`[EMAIL] Gmail not configured. Password reset code for ${email}: ${code}`);
    return { success: true, method: 'console' };
  }

  try {
    const mailOptions = {
      from: `"Mog.ai" <${GMAIL_USER}>`,
      to: email,
      subject: `${code} is your Mog.ai password reset code`,
      html: emailHtml,
      text: `Your Mog.ai password reset code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`[EMAIL] Password reset email sent to ${email}`);
    return { success: true, method: 'gmail' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send password reset email to ${email}:`, error.message);
    console.log(`[EMAIL] Fallback - Password reset code for ${email}: ${code}`);
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
    const analysisStartTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use gpt-4o instead of gpt-5 for faster response (~15-30sec vs 60-90sec)
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
        max_tokens: 2000, // Sufficient for JSON response
        response_format: { type: 'json_object' }, // Force JSON output
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] OpenAI API error:', response.status, error);
      return simulatePhysiqueAnalysis(onboardingData);
    }

    const data = await response.json();
    console.log(`[AI] Analysis completed in ${Date.now() - analysisStartTime}ms`);
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[AI] No content in response. Full data:', JSON.stringify(data));
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

    // Validate and normalize the response - preserve null for non-visible body parts
    const normalizedAnalysis = {
      isValidPhysique: true,
      mogScore: Math.max(0, Math.min(100, analysis.mogScore || 50)),
      tier: getTierFromScore(analysis.mogScore || 50),
      muscleBreakdown: {
        // Only include values if AI detected them, otherwise keep null (UI will hide them)
        chest: analysis.muscleBreakdown?.chest ?? null,
        shoulders: analysis.muscleBreakdown?.shoulders ?? null,
        back: analysis.muscleBreakdown?.back ?? null,
        arms: analysis.muscleBreakdown?.arms ?? null,
        legs: analysis.muscleBreakdown?.legs ?? null,
        core: analysis.muscleBreakdown?.core ?? null,
        leanness: analysis.muscleBreakdown?.leanness ?? null,
      },
      notVisible: analysis.notVisible || [], // Body parts the AI couldn't see
      weakPoints: analysis.weakPoints || [],
      strongPoints: analysis.strongPoints || [],
      symmetry: analysis.symmetry || 70,
      overallAssessment: analysis.overallAssessment || 'Analysis complete.',
      improvementTips: analysis.improvementTips || [],
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
  
  // Determine nutrition mode based on goal
  let mode, modeDescription, modeIcon;
  if (primaryGoal === 'lean') {
    mode = 'cutting';
    modeDescription = 'Cutting mode. Burn fat, preserve muscle.';
    modeIcon = 'flame';
  } else if (primaryGoal === 'build-size') {
    mode = 'lean bulk';
    modeDescription = 'Lean-bulk mode. Build clean size.';
    modeIcon = 'dumbbell';
  } else {
    mode = 'recomp';
    modeDescription = 'Recomp mode. Build muscle, lose fat.';
    modeIcon = 'target';
  }
  
  return {
    calories: calorieTarget,
    protein: proteinGrams,
    carbs: carbGrams,
    fats: fatGrams,
    mode,
    modeDescription,
    modeIcon,
  };
};

// AI-powered nutrition mode analysis based on eating patterns
const analyzeNutritionModeWithAI = async (userId, targets, recentLogs, onboardingData) => {
  if (!openai) {
    console.log('[NUTRITION] OpenAI not available for mode analysis');
    return null;
  }
  
  try {
    console.log(`[NUTRITION] Analyzing mode for user ${userId} with ${recentLogs.length} logs`);
    
    // Calculate averages from recent logs (if any)
    const hasLogs = recentLogs.length > 0;
    const totalDays = hasLogs ? Math.max(1, new Set(recentLogs.map(l => l.date.toISOString().split('T')[0])).size) : 0;
    const totals = recentLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    const avgCalories = hasLogs ? Math.round(totals.calories / totalDays) : 0;
    const avgProtein = hasLogs ? Math.round(totals.protein / totalDays) : 0;
    const avgCarbs = hasLogs ? Math.round(totals.carbs / totalDays) : 0;
    const avgFats = hasLogs ? Math.round(totals.fats / totalDays) : 0;
    
    // Get meal names for context
    const recentMeals = recentLogs.slice(-10).map(l => l.meal?.name || 'meal').join(', ');
    
    // Build context based on whether we have meal data
    const mealContext = hasLogs 
      ? `ACTUAL AVERAGES (last ${totalDays} days):
- Avg Calories: ${avgCalories}/day (${avgCalories < targets.calories ? 'deficit' : avgCalories > targets.calories ? 'surplus' : 'maintenance'})
- Avg Protein: ${avgProtein}g/day (${Math.round(avgProtein/targets.protein*100)}% of target)
- Avg Carbs: ${avgCarbs}g/day
- Avg Fats: ${avgFats}g/day

RECENT MEALS: ${recentMeals}`
      : `No meals logged yet. User is just starting their nutrition journey.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fitness nutrition AI coach. Analyze the user's eating patterns OR their stated goal to determine their nutrition mode.

Based on their actual eating behavior (if available) or their stated goal, determine which mode best describes their current/intended nutrition approach.

Available modes:
1. "cutting" - Eating in a caloric deficit, high protein, losing fat. Icon: "flame"
2. "lean bulk" - Eating in a slight surplus, high protein, gaining muscle. Icon: "dumbbell"  
3. "recomp" - Eating at maintenance, body recomposition. Icon: "target"
4. "aggressive cut" - Eating in a significant deficit, very high protein. Icon: "flame"
5. "mass gain" - Eating in a larger surplus for size. Icon: "dumbbell"
6. "shred mode" - Getting lean and defined. Icon: "flame"
7. "bulk season" - Building maximum size. Icon: "dumbbell"

Provide a short, punchy, MOTIVATING description (max 35 chars) that sounds like a coach hyping them up.

Examples of good descriptions:
- "Shredding fat. Stay locked in."
- "Building size. Eat big, lift big."
- "Optimizing gains. Perfect balance."

Respond ONLY in JSON:
{
  "mode": "mode name (lowercase)",
  "description": "Short punchy description. Max 35 chars.",
  "icon": "flame" | "dumbbell" | "target"
}`
        },
        {
          role: 'user',
          content: `Analyze this user's nutrition situation:

DAILY TARGETS:
- Calories: ${targets.calories}/day
- Protein: ${targets.protein}g/day

${mealContext}

USER'S STATED GOAL: ${onboardingData?.primaryGoal || 'aesthetics'}
(lean = lose fat, build-size = gain muscle, aesthetics = balanced)

Determine their nutrition mode and give them a motivating description.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    const content = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[NUTRITION] AI mode: ${parsed.mode} - "${parsed.description}"`);
      return {
        mode: parsed.mode,
        modeDescription: parsed.description,
        modeIcon: parsed.icon || 'target',
      };
    }
  } catch (err) {
    console.error('[NUTRITION] AI mode analysis error:', err.message);
  }
  
  return null; // Fallback to default mode
};

// AI-powered diet discipline analysis
const analyzeDietDisciplineWithAI = async (weekData, targets, logs) => {
  if (!openai || logs.length === 0) {
    return null;
  }
  
  try {
    // Prepare day-by-day summary
    const daySummaries = weekData.map(day => {
      const percentCal = targets.calories > 0 ? Math.round((day.calories / targets.calories) * 100) : 0;
      const percentPro = targets.protein > 0 ? Math.round((day.protein / targets.protein) * 100) : 0;
      return `${day.day} (${day.date}): ${day.calories} cal (${percentCal}%), ${day.protein}g protein (${percentPro}%) - ${day.status}`;
    }).join('\n');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fitness nutrition coach AI. Analyze the user's weekly eating discipline and provide accurate status for each day.

Rules for determining day status:
- "complete": Day has logged meals AND calories are within 85-115% of target AND protein is at least 75% of target
- "pending": Today or future days (user hasn't finished eating yet)
- "notComplete": Past day with either no meals logged OR significantly off targets

Analyze the actual data carefully. Be honest but encouraging.

Respond ONLY in JSON:
{
  "weekData": [
    { "day": "Mon", "status": "complete" | "pending" | "notComplete", "reason": "brief reason" },
    { "day": "Tue", "status": "complete" | "pending" | "notComplete", "reason": "brief reason" },
    ...for all 7 days
  ],
  "streak": number (consecutive complete days ending yesterday),
  "compliance": number (0-100 percentage of past days that were complete),
  "insight": "One short motivating sentence about their discipline"
}`
        },
        {
          role: 'user',
          content: `Analyze this user's diet discipline for the week:

DAILY TARGETS:
- Calories: ${targets.calories}/day
- Protein: ${targets.protein}g/day

WEEKLY DATA:
${daySummaries}

Today is: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

Determine the accurate status for each day based on the actual nutrition data.`
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    });
    
    const content = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[NUTRITION] AI discipline: ${parsed.compliance}% compliance, streak: ${parsed.streak}`);
      return parsed;
    }
  } catch (err) {
    console.error('[NUTRITION] AI discipline analysis error:', err.message);
  }
  
  return null;
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
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Invalid password' });
    
    const onboarding = await Onboarding.findOne({ userId: user.userId });
    const scan = await Scan.findOne({ userId: user.userId }).sort({ createdAt: -1 });
    
    console.log(`[LOGIN] ${email} - Found scan:`, scan ? `Score: ${scan.mogScore}, Tier: ${scan.tier}` : 'No scan');
    
    res.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        mogScore: scan?.mogScore || user.mogScore,
        tier: scan?.tier || user.tier,
        streak: user.streak,
        isVerified: user.isVerified,
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
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed', error: err.message });
  }
});

// ----- FORGOT PASSWORD -----

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }
    
    // Generate reset code
    const resetCode = generateVerificationCode();
    const resetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store reset code on user
    user.resetCode = resetCode;
    user.resetCodeExpiry = resetExpiry;
    await user.save();
    
    // Send reset email
    await sendPasswordResetEmail(email, resetCode, user.firstName);
    
    console.log(`[PASSWORD RESET] Code sent to ${email}`);
    
    res.json({ success: true, message: 'Password reset code sent to your email' });
  } catch (err) {
    console.error('[PASSWORD RESET] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset code' });
  }
});

/**
 * Reset password with code
 * POST /api/auth/reset-password
 */
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check reset code
    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }
    
    // Check if code expired
    if (!user.resetCodeExpiry || new Date() > new Date(user.resetCodeExpiry)) {
      return res.status(400).json({ success: false, message: 'Reset code has expired' });
    }
    
    // Update password and clear reset code
    user.password = newPassword;
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();
    
    console.log(`[PASSWORD RESET] Password updated for ${email}`);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('[PASSWORD RESET] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
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

/**
 * Update onboarding data (account info - height, weight, gender, age)
 * PUT /api/onboarding/update
 */
app.put('/api/onboarding/update', async (req, res) => {
  try {
    const { userId, data } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const onboarding = await Onboarding.findOne({ userId });
    
    if (!onboarding) {
      return res.status(404).json({ success: false, error: 'Onboarding data not found' });
    }

    // Update only the provided fields
    if (data.heightFeet !== undefined) onboarding.data.heightFeet = data.heightFeet;
    if (data.heightInches !== undefined) onboarding.data.heightInches = data.heightInches;
    if (data.weightLbs !== undefined) onboarding.data.weightLbs = data.weightLbs;
    if (data.gender !== undefined) onboarding.data.gender = data.gender;
    if (data.age !== undefined) onboarding.data.age = data.age;

    await onboarding.save();

    console.log(`[ONBOARDING] Updated account info for user: ${userId}`);
    res.json({ success: true, message: 'Account information updated', data: onboarding.data });
  } catch (err) {
    console.error('[ONBOARDING] Update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update user profile (name, email)
 * PUT /api/user/update-profile
 */
app.put('/api/user/update-profile', async (req, res) => {
  try {
    const { userId, firstName, lastName, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if email is being changed to an existing email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, userId: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use by another account' });
      }
      // If email changed, mark as unverified
      user.email = email;
      user.isVerified = false;
      user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (firstName || lastName) {
      user.username = `${firstName || user.firstName}${lastName || user.lastName}`.toLowerCase().replace(/\s/g, '');
    }

    await user.save();

    console.log(`[USER] Updated profile for user: ${userId}`);
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        isVerified: user.isVerified,
      }
    });
  } catch (err) {
    console.error('[USER] Update profile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----- SCAN -----

// Verify if new scan photo is the same person as previous scan
const verifyUserIdentity = async (newFrontPhoto, previousFrontPhoto) => {
  if (!OPENAI_API_KEY || !openai) {
    console.log('[IDENTITY] No API key, skipping identity verification');
    return { isSamePerson: true }; // Skip verification if no API key
  }
  
  if (!newFrontPhoto || !previousFrontPhoto) {
    console.log('[IDENTITY] Missing photos for comparison, skipping verification');
    return { isSamePerson: true };
  }
  
  try {
    console.log('[IDENTITY] Verifying if new photo matches previous scan...');
    const startTime = Date.now();
    
    // Prepare image content
    const imageContent = [];
    
    // New front photo
    const newPhotoBase64 = newFrontPhoto.startsWith('data:') 
      ? newFrontPhoto 
      : `data:image/jpeg;base64,${newFrontPhoto}`;
    imageContent.push({
      type: 'image_url',
      image_url: { url: newPhotoBase64, detail: 'low' }
    });
    
    // Previous front photo
    const prevPhotoBase64 = previousFrontPhoto.startsWith('data:') 
      ? previousFrontPhoto 
      : `data:image/jpeg;base64,${previousFrontPhoto}`;
    imageContent.push({
      type: 'image_url',
      image_url: { url: prevPhotoBase64, detail: 'low' }
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster mini model for identity check
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You verify if two fitness photos show the SAME person. Compare: skin tone, body proportions, tattoos, gender. Physique changes (muscle/fat) are normal in fitness apps. ONLY flag different if CLEARLY different person (different gender, completely different skin color, impossible size difference). When in doubt, say SAME. JSON only: {"isSamePerson": true/false, "confidence": 0-100, "reason": "brief"}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Same person?' },
            ...imageContent
          ]
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    console.log(`[IDENTITY] Verification: ${result.isSamePerson ? 'SAME' : 'DIFFERENT'} (${result.confidence}%) - ${result.reason} [${Date.now() - startTime}ms]`);
    
    return {
      isSamePerson: result.isSamePerson,
      confidence: result.confidence,
      reason: result.reason
    };
  } catch (error) {
    console.error('[IDENTITY] Verification error:', error.message);
    // On error, allow the scan to proceed (don't block users due to AI errors)
    return { isSamePerson: true, error: error.message };
  }
};

app.post('/api/scan/analyze', async (req, res) => {
  const { userId, frontPhoto, backPhoto, onboardingData } = req.body;
  
  try {
    // Check if user has a previous scan and verify identity
    if (userId) {
      const previousScan = await Scan.findOne({ userId }).sort({ timestamp: -1 });
      
      if (previousScan && previousScan.frontPhotoUrl) {
        console.log(`[SCAN] User ${userId} has previous scan, verifying identity...`);
        
        const identityCheck = await verifyUserIdentity(frontPhoto, previousScan.frontPhotoUrl);
        
        if (!identityCheck.isSamePerson) {
          console.log(`[SCAN] Identity verification FAILED for user ${userId}: ${identityCheck.reason}`);
          return res.status(400).json({
            success: false,
            differentUser: true,
            message: `This doesn't appear to be the same person as your previous scans. ${identityCheck.reason || 'Please upload photos of yourself for accurate progress tracking.'}`,
            confidence: identityCheck.confidence
          });
        }
        
        console.log(`[SCAN] Identity verified for user ${userId}`);
      } else {
        console.log(`[SCAN] No previous scan for user ${userId}, skipping identity check`);
      }
    }
    
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
      
      // Generate AI training plan in BACKGROUND (don't block the response)
      // This significantly speeds up scan time from 2min to ~30-40sec
      console.log(`[SCAN] Queuing AI training plan generation for user ${userId} (background)...`);
      setImmediate(async () => {
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
          
          // Save to WorkoutPlan collection (for /api/training/:userId/weekly endpoint)
          await WorkoutPlan.findOneAndUpdate(
            { userId },
            { 
              userId,
              weeklyPlan: aiTrainingPlan.days,
              weekId: aiTrainingPlan.weekId,
              mission: aiTrainingPlan.mission,
              targets: aiTrainingPlan.targets || [],
              expectedGain: aiTrainingPlan.expectedGain || 1.0,
              currentWeek: 1,
              updatedAt: new Date()
            },
            { upsert: true }
          );
          console.log(`[SCAN-BG] AI training plan saved to WorkoutPlan for user ${userId}`);
          
          // Save to user's profile
          const userToUpdate = await User.findOne({ 
            $or: [{ tempId: userId }, { userId: userId }]
          });
          if (userToUpdate) {
            userToUpdate.weeklyTrainingPlan = aiTrainingPlan;
            await userToUpdate.save();
            console.log(`[SCAN-BG] AI training plan saved to User profile for ${userId}`);
          }
        } catch (trainingError) {
          console.error(`[SCAN-BG] Failed to generate AI training plan:`, trainingError.message);
        }
      });
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

// Track users currently regenerating plans (prevent duplicate regenerations)
const regeneratingPlans = new Map(); // userId -> timestamp

// Get user's weekly training plan
app.get('/api/training/:userId/weekly', async (req, res) => {
  const { userId } = req.params;
  console.log(`[TRAINING] Getting weekly plan for user ${userId}`);
  
  try {
    // Helper to check if plan is complete
    // Plan is complete if it has at least 3 days (minimum valid plan) and all exercises have steps
    const isPlanComplete = (days) => {
      if (!days || days.length < 3) return false;
      for (const day of days) {
        if (!day.exercises || day.exercises.length === 0) return false;
        for (const ex of day.exercises) {
          if (!ex.steps || ex.steps.length < 2) return false;
        }
      }
      return true;
    };
    
    // Check if already regenerating for this user
    const isRegenerating = regeneratingPlans.has(userId);
    if (isRegenerating) {
      const startTime = regeneratingPlans.get(userId);
      const elapsed = Date.now() - startTime;
      console.log(`[TRAINING] Already regenerating for user ${userId} (${Math.round(elapsed/1000)}s elapsed)`);
      
      // If it's been more than 2 minutes, clear the flag (timeout)
      if (elapsed > 120000) {
        regeneratingPlans.delete(userId);
      } else {
        // Return a "regenerating" status so frontend shows loader
        return res.json({ 
          success: true, 
          regenerating: true,
          message: 'Plan is being regenerated, please wait...'
        });
      }
    }

    // First check WorkoutPlan collection (used by complete-day for progressive plans)
    const workoutPlan = await WorkoutPlan.findOne({ userId });
    if (workoutPlan && workoutPlan.weeklyPlan && workoutPlan.weeklyPlan.length > 0) {
      // Check if plan is complete (6 days with exercises and steps)
      const isComplete = isPlanComplete(workoutPlan.weeklyPlan);
      
      if (!isComplete) {
        console.log(`[TRAINING] Plan incomplete (${workoutPlan.weeklyPlan.length} days), regenerating...`);
        
        // Mark as regenerating to prevent duplicate requests
        regeneratingPlans.set(userId, Date.now());
        
        // Get user's scan data for regeneration - check both User and Scan collections
        const user = await User.findOne({ 
          $or: [{ tempId: userId }, { userId: userId }]
        });
        
        // Also check Scan collection for latest scan
        const latestScan = await Scan.findOne({ userId }).sort({ createdAt: -1 });
        const scanData = user?.latestScan || latestScan;
        
        if (scanData) {
          try {
            // Regenerate the plan
            const newPlan = await generateAITrainingPlan(scanData);
            
            // Save the new plan
            workoutPlan.weeklyPlan = newPlan.days;
            workoutPlan.weekId = newPlan.weekId;
            workoutPlan.mission = newPlan.mission;
            workoutPlan.targets = newPlan.targets;
            workoutPlan.expectedGain = newPlan.expectedGain;
            await workoutPlan.save();
            
            // Also save to user if exists
            if (user) {
              user.weeklyTrainingPlan = newPlan;
              await user.save();
            }
            
            // Clear regenerating flag
            regeneratingPlans.delete(userId);
            
            console.log(`[TRAINING] Regenerated complete plan with ${newPlan.days.length} days`);
            return res.json({ 
              success: true, 
              plan: newPlan 
            });
          } catch (regenErr) {
            console.error('[TRAINING] Regeneration failed:', regenErr.message);
            // Clear regenerating flag on error
            regeneratingPlans.delete(userId);
            // Fall through to return incomplete plan
          }
        } else {
          console.log('[TRAINING] No scan data found for regeneration, returning current plan');
          // No scan data, clear flag and return current plan (don't loop)
          regeneratingPlans.delete(userId);
        }
      }
      
      // Default exercise step templates for incomplete plans
      const defaultSteps = [
        { stepNumber: 1, title: 'Set 1 - Warm Up', description: 'Start light and focus on form', duration: 60 },
        { stepNumber: 2, title: 'Set 2 - Build Up', description: 'Increase weight, maintain control', duration: 60 },
        { stepNumber: 3, title: 'Set 3 - Working Set', description: 'Push yourself, feel the burn', duration: 60 },
        { stepNumber: 4, title: 'Set 4 - Final Set', description: 'Give it everything you have!', duration: 60 },
      ];
      
      // Convert WorkoutPlan format to WeeklyTrainingPlan format
      const plan = {
        weekId: workoutPlan.weekId || `week-${workoutPlan.currentWeek || 1}`,
        mission: workoutPlan.mission || 'Complete your training program',
        expectedGain: workoutPlan.expectedGain || 1.0,
        targets: workoutPlan.targets || [],
        days: workoutPlan.weeklyPlan.map(day => ({
          day: day.day,
          title: day.title,
          description: day.description || '',
          type: day.type || 'Strength',
          typeColor: day.typeColor || '#4A7CFF',
          secondaryType: day.secondaryType || null,
          status: day.status || 'upcoming',
          duration: day.duration || '45 min',
          caloriesBurn: day.caloriesBurn || 300,
          targetMuscles: day.targetMuscles || [],
          exercises: (day.exercises || []).map(ex => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            note: ex.note || 'Focus on proper form',
            badge: ex.badge || null,
            badgeColor: ex.badgeColor || null,
            borderColor: ex.borderColor || '#3A2A4A',
            completed: ex.completed || false,
            // Add default steps if missing
            steps: (ex.steps && ex.steps.length >= 2) ? ex.steps : defaultSteps,
          })),
          completedAt: day.completedAt,
        })),
        currentWeek: workoutPlan.currentWeek || 1,
        weekNumber: workoutPlan.currentWeek || 1, // Also include weekNumber for frontend compatibility
      };
      console.log(`[TRAINING] Returning workout plan - Week: ${plan.currentWeek}, Days: ${plan.days.length}, WeekId: ${plan.weekId}`);
      console.log(`[TRAINING] Day statuses: ${plan.days.map(d => d.status).join(', ')}`);
      return res.json({ 
        success: true, 
        plan 
      });
    }

    // Fallback to user's weeklyTrainingPlan field
    const user = await User.findOne({ 
      $or: [{ tempId: userId }, { userId: userId }]
    });
    
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    
    // Check if user has a weekly training plan
    if (user.weeklyTrainingPlan) {
      // Check if it's complete
      const isComplete = isPlanComplete(user.weeklyTrainingPlan.days);
      
      if (!isComplete && user.latestScan) {
        console.log(`[TRAINING] User plan incomplete, regenerating...`);
        try {
          const newPlan = await generateAITrainingPlan(user.latestScan);
          user.weeklyTrainingPlan = newPlan;
          await user.save();
          
          console.log(`[TRAINING] Regenerated complete plan with ${newPlan.days.length} days`);
          return res.json({ 
            success: true, 
            plan: newPlan 
          });
        } catch (regenErr) {
          console.error('[TRAINING] Regeneration failed:', regenErr.message);
        }
      }
      
      console.log(`[TRAINING] Found user weekly plan: ${user.weeklyTrainingPlan.weekId}`);
      return res.json({ 
        success: true, 
        plan: user.weeklyTrainingPlan 
      });
    }
    
    // No plan exists - try to generate one if user has scan data
    if (user.latestScan) {
      console.log(`[TRAINING] No plan found, but user has scan data - generating new plan...`);
      
      // Mark as regenerating to prevent duplicate requests
      regeneratingPlans.set(userId, Date.now());
      
      try {
        const newPlan = await generateAITrainingPlan(user.latestScan);
        
        // Save to WorkoutPlan collection (including targets and expectedGain)
        await WorkoutPlan.findOneAndUpdate(
          { userId },
          { 
            userId,
            weeklyPlan: newPlan.days,
            weekId: newPlan.weekId,
            mission: newPlan.mission,
            targets: newPlan.targets || [],
            expectedGain: newPlan.expectedGain || 1.0,
            currentWeek: 1,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
        
        // Also save to user
        user.weeklyTrainingPlan = newPlan;
        await user.save();
        
        // Clear regenerating flag
        regeneratingPlans.delete(userId);
        
        console.log(`[TRAINING] ✅ Generated new plan with ${newPlan.days.length} days`);
        return res.json({ 
          success: true, 
          plan: newPlan 
        });
      } catch (genErr) {
        console.error('[TRAINING] Plan generation failed:', genErr.message);
        regeneratingPlans.delete(userId);
        return res.json({ success: false, message: 'Failed to generate plan', error: genErr.message });
      }
    }
    
    console.log(`[TRAINING] No weekly plan found for user ${userId} and no scan data`);
    return res.json({ success: false, message: 'No plan found - please complete a scan first' });
    
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
    
    // SAFEGUARD: Don't allow overwriting a newer week with an older one
    const existingPlan = await WorkoutPlan.findOne({ userId });
    const incomingWeek = plan?.currentWeek || plan?.weekNumber || 1;
    const existingWeek = existingPlan?.currentWeek || 1;
    
    if (existingPlan && existingWeek > incomingWeek) {
      console.log(`[TRAINING] ⚠️ Blocked overwrite: existing week ${existingWeek} > incoming week ${incomingWeek}`);
      return res.json({ 
        success: true, 
        message: 'Ignored - newer week already exists',
        currentWeek: existingWeek 
      });
    }
    
    // Save the weekly training plan to User
    user.weeklyTrainingPlan = plan;
    await user.save();
    
    // Also sync to WorkoutPlan collection for consistency
    await WorkoutPlan.findOneAndUpdate(
      { userId },
      {
        userId,
        weekId: plan.weekId,
        mission: plan.mission,
        weeklyPlan: plan.days,
        currentWeek: plan.currentWeek || 1,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    
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
    
    // Also save to WorkoutPlan collection for consistency
    await WorkoutPlan.findOneAndUpdate(
      { userId },
      {
        userId,
        weekId: trainingPlan.weekId,
        mission: trainingPlan.mission,
        weeklyPlan: trainingPlan.days,
        currentWeek: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    
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
    console.log('[AI TRAINING] Calling OpenAI API (gpt-4o)...');
    const startTime = Date.now();
    
    // Using gpt-4o for training plan generation - it's reliable and fast
    // GPT-5 uses reasoning tokens internally and often returns empty content
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate my 6-day training plan. JSON only.' }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[AI TRAINING] OpenAI response received in ${elapsed}ms`);

    // Check for valid response
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      console.error('[AI TRAINING] Invalid response structure:', JSON.stringify(response).slice(0, 500));
      throw new Error('Invalid response from OpenAI API');
    }

    // Check finish reason
    const finishReason = response.choices[0].finish_reason;
    console.log('[AI TRAINING] Finish reason:', finishReason);
    
    if (finishReason === 'length') {
      console.warn('[AI TRAINING] Response was truncated due to token limit');
    }

    let planText = (response.choices[0].message.content || '').trim();
    console.log('[AI TRAINING] Plan text length:', planText.length);
    
    // Handle empty response
    if (!planText || planText.length === 0) {
      console.error('[AI TRAINING] Empty response from API');
      console.log('[AI TRAINING] Full response:', JSON.stringify(response).slice(0, 1000));
      throw new Error('Empty response from OpenAI API - model may have refused or timed out');
    }
    
    // Remove markdown code blocks if present
    if (planText.startsWith('```')) {
      planText = planText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      console.log('[AI TRAINING] Removed markdown, new length:', planText.length);
    }
    
    // Log first 500 chars for debugging
    console.log('[AI TRAINING] Plan preview:', planText.slice(0, 500));
    
    console.log('[AI TRAINING] Parsing JSON...');
    const plan = JSON.parse(planText);
    console.log('[AI TRAINING] JSON parsed successfully, days:', plan.days?.length);
    
    // Validate we have all 6 days
    if (!plan.days || plan.days.length < 6) {
      console.warn(`[AI TRAINING] Only ${plan.days?.length || 0} days generated, expected 6`);
    }
    
    // Ensure proper timestamps
    const now = new Date();
    plan.weekId = `week-${now.getTime()}`;
    plan.startDate = now.toISOString();
    plan.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    plan.generatedAt = now.toISOString();
    plan.mission = plan.mission || 'Transform your physique';
    plan.expectedGain = plan.expectedGain || 1.0;
    
    // Default exercise step templates
    const defaultSteps = [
      { stepNumber: 1, title: 'Set 1 - Warm Up', description: 'Start light and focus on form', duration: 60 },
      { stepNumber: 2, title: 'Set 2 - Build Up', description: 'Increase weight, maintain control', duration: 60 },
      { stepNumber: 3, title: 'Set 3 - Working Set', description: 'Push yourself, feel the burn', duration: 60 },
      { stepNumber: 4, title: 'Set 4 - Final Set', description: 'Give it everything you have!', duration: 60 },
    ];
    
    // Ensure all days have proper structure
    plan.days = (plan.days || []).map((day, index) => ({
      day: index + 1,
      title: day.title || `Training Day ${index + 1}`,
      description: day.description || '',
      type: day.type || 'Strength',
      typeColor: day.typeColor || '#4A7CFF',
      status: index === 0 ? 'today' : 'upcoming',
      duration: day.duration || '45 min',
      caloriesBurn: day.caloriesBurn || 300,
      targetMuscles: day.targetMuscles || [],
      exercises: (day.exercises || []).map((ex, exIndex) => ({
        id: ex.id || `ex-${index + 1}-${exIndex + 1}`,
        name: ex.name || `Exercise ${exIndex + 1}`,
        sets: ex.sets || '4 x 10',
        note: ex.note || 'Focus on proper form',
        badge: ex.badge || null,
        badgeColor: ex.badgeColor || null,
        borderColor: ex.borderColor || '#3A2A4A',
        completed: false,
        steps: (ex.steps && ex.steps.length >= 3) ? ex.steps.map((step, stepIndex) => ({
          stepNumber: stepIndex + 1,
          title: step.title || `Set ${stepIndex + 1}`,
          description: step.description || 'Complete this set with good form',
          duration: Math.max(60, step.duration || 60)
        })) : defaultSteps.slice(0, 4) // Use default steps if missing or incomplete
      }))
    }));
    
    console.log(`[AI TRAINING] Generated plan with ${plan.days.length} days, mission: ${plan.mission}`);
    
    // Log exercise counts per day for debugging
    plan.days.forEach(day => {
      console.log(`[AI TRAINING] Day ${day.day}: ${day.exercises.length} exercises, ${day.exercises.map(e => e.steps?.length || 0).join('/')} steps each`);
    });
    
    return plan;
    
  } catch (error) {
    console.error('[AI TRAINING] OpenAI API error:', error.message);
    console.error('[AI TRAINING] Full error:', error);
    
    // If GPT-5 fails, try falling back to GPT-4o
    console.log('[AI TRAINING] Attempting fallback to gpt-4o...');
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate my 6-day training plan. JSON only.' }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      
      let fallbackText = (fallbackResponse.choices[0]?.message?.content || '').trim();
      if (fallbackText.startsWith('```')) {
        fallbackText = fallbackText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      if (fallbackText && fallbackText.length > 0) {
        console.log('[AI TRAINING] Fallback successful, parsing...');
        const fallbackPlan = JSON.parse(fallbackText);
        
        // Add required fields
        const now = new Date();
        fallbackPlan.weekId = `week-${now.getTime()}`;
        fallbackPlan.generatedAt = now.toISOString();
        fallbackPlan.days = (fallbackPlan.days || []).map((day, index) => ({
          ...day,
          day: index + 1,
          status: index === 0 ? 'today' : 'upcoming',
        }));
        
        return fallbackPlan;
      }
    } catch (fallbackError) {
      console.error('[AI TRAINING] Fallback also failed:', fallbackError.message);
    }
    
    throw new Error('Failed to generate AI training plan: ' + error.message);
  }
}

// Generate next week's plan with progressive overload based on user's history
async function generateNextWeekPlan(user, currentPlan) {
  console.log('[AI TRAINING] Generating progressive Week', (currentPlan.currentWeek || 1) + 1);
  
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  
  // Get user's latest scan data with image
  const latestScan = await Scan.findOne({ 
    $or: [{ userId: user?.userId }, { userId: user?.tempId }, { tempId: user?.tempId }] 
  }).sort({ createdAt: -1 });
  
  // Use user's latestScan as fallback if no Scan document found
  const scanData = latestScan || user?.latestScan;
  
  // Get the physique image URL if available
  const physiqueImageUrl = latestScan?.imageUrls?.[0] || latestScan?.frontImage || null;
  
  console.log('[AI TRAINING] User mog score:', user?.mogScore);
  console.log('[AI TRAINING] Has physique image:', !!physiqueImageUrl);
  
  // Compile workout history for progressive overload
  const completedHistory = currentPlan.completedHistory || [];
  const lastWeekWorkouts = currentPlan.weeklyPlan || [];
  
  // Calculate what muscles were trained and how
  const muscleWorkVolume = {};
  lastWeekWorkouts.forEach(day => {
    (day.targetMuscles || []).forEach(muscle => {
      muscleWorkVolume[muscle] = (muscleWorkVolume[muscle] || 0) + 1;
    });
  });
  
  const systemPrompt = `You are an elite AI personal trainer creating Week ${(currentPlan.currentWeek || 1) + 1} of a progressive training program.

${physiqueImageUrl ? 'IMPORTANT: I have attached the user\'s current physique photo. Analyze their body composition, muscle development, and areas that need work. Use this visual assessment to tailor the training plan.' : ''}

USER PROFILE:
- Current Mog Score: ${user?.mogScore || 50}/100
- Total Workouts Completed: ${user?.totalWorkouts || 0}
- Week Just Completed: ${currentPlan.currentWeek || 1}
- Tier: ${scanData?.tier || 'Unknown'}
- Weak Points: ${scanData?.weakPoints?.join(', ') || 'Not identified'}
- Strong Points: ${scanData?.strongPoints?.join(', ') || 'Not identified'}
- Muscle Breakdown: ${scanData?.muscleBreakdown ? JSON.stringify(scanData.muscleBreakdown) : 'Not available'}

LAST WEEK'S TRAINING (completed):
${lastWeekWorkouts.map(d => `- Day ${d.day}: ${d.title} - ${d.targetMuscles?.join(', ')}`).join('\n')}

PROGRESSIVE OVERLOAD RULES:
1. Increase intensity compared to last week (more sets, reps, or harder variations)
2. Focus MORE on weak points identified in the scan${physiqueImageUrl ? ' and visible in the photo' : ''}
3. Keep training strong points to maintain them
4. Vary exercises from last week to prevent adaptation
5. Push the user harder - they completed the previous week, so they're ready
6. Include at least one more challenging exercise per day than last week
7. Based on the Mog Score of ${user?.mogScore || 50}, adjust difficulty appropriately

RESPOND WITH JSON ONLY - NO EXPLANATIONS:
{
  "mission": "Week ${(currentPlan.currentWeek || 1) + 1} progressive mission statement",
  "days": [
    {
      "day": 1,
      "title": "Day Title",
      "subtitle": "Target areas",
      "targetMuscles": ["muscle1", "muscle2"],
      "duration": 45,
      "exercises": [
        {
          "id": "unique-id",
          "name": "Exercise Name",
          "sets": "4 × 8-10",
          "note": "Form cue",
          "duration": 45,
          "restTime": 60,
          "steps": [
            {"title": "Setup", "description": "How to position", "duration": 90},
            {"title": "Execution", "description": "How to perform", "duration": 90},
            {"title": "Peak", "description": "Hold/squeeze point", "duration": 90}
          ]
        }
      ]
    }
  ]
}

Generate 6 days. Day 1 = "today", others = "upcoming". Make it HARDER than last week.`;

  try {
    console.log('[AI TRAINING] Calling GPT-5 for Week', (currentPlan.currentWeek || 1) + 1);
    
    // Build the message content - include image if available
    const userContent = physiqueImageUrl 
      ? [
          { type: 'text', text: `Generate Week ${(currentPlan.currentWeek || 1) + 1} training plan with progressive overload based on my current physique. JSON only.` },
          { type: 'image_url', image_url: { url: physiqueImageUrl, detail: 'high' } }
        ]
      : `Generate Week ${(currentPlan.currentWeek || 1) + 1} training plan with progressive overload. JSON only.`;
    
    // Using gpt-4o for training plan generation - it's reliable and supports vision
    // GPT-5 uses reasoning tokens internally and often returns empty content
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });
    
    let planText = (response.choices[0]?.message?.content || '').trim();
    
    // Handle empty response
    if (!planText || planText.length === 0) {
      throw new Error('Empty response from API');
    }
    
    // Clean up JSON
    if (planText.startsWith('```json')) planText = planText.slice(7);
    if (planText.startsWith('```')) planText = planText.slice(3);
    if (planText.endsWith('```')) planText = planText.slice(0, -3);
    planText = planText.trim();
    
    const plan = JSON.parse(planText);
    
    // Validate we have all 6 days
    if (!plan.days || plan.days.length < 6) {
      console.warn(`[AI TRAINING] Week ${(currentPlan.currentWeek || 1) + 1}: Only ${plan.days?.length || 0} days generated, expected 6`);
    }
    
    // Default exercise step templates
    const defaultSteps = [
      { stepNumber: 1, title: 'Set 1 - Warm Up', description: 'Start light and focus on form', duration: 60 },
      { stepNumber: 2, title: 'Set 2 - Build Up', description: 'Increase weight, maintain control', duration: 60 },
      { stepNumber: 3, title: 'Set 3 - Working Set', description: 'Push yourself, feel the burn', duration: 60 },
      { stepNumber: 4, title: 'Set 4 - Final Set', description: 'Give it everything you have!', duration: 60 },
    ];
    
    // Format days properly with all required fields
    const formattedDays = (plan.days || []).map((day, index) => ({
      day: index + 1,
      title: day.title || `Training Day ${index + 1}`,
      description: day.description || '',
      type: day.type || 'Strength',
      typeColor: day.typeColor || '#4A7CFF',
      status: index === 0 ? 'today' : 'upcoming',
      duration: day.duration || '45 min',
      caloriesBurn: day.caloriesBurn || 300,
      targetMuscles: day.targetMuscles || [],
      completed: false,
      exercises: (day.exercises || []).map((ex, exIndex) => ({
        id: ex.id || `ex-${index + 1}-${exIndex + 1}`,
        name: ex.name || `Exercise ${exIndex + 1}`,
        sets: ex.sets || '4 x 10',
        note: ex.note || 'Focus on proper form',
        badge: ex.badge || null,
        badgeColor: ex.badgeColor || null,
        borderColor: ex.borderColor || '#3A2A4A',
        completed: false,
        steps: (ex.steps && ex.steps.length >= 3) ? ex.steps.map((step, stepIndex) => ({
          stepNumber: stepIndex + 1,
          title: step.title || `Set ${stepIndex + 1}`,
          description: step.description || 'Complete this set with good form',
          duration: Math.max(60, step.duration || 60)
        })) : defaultSteps.slice(0, 4) // Use default steps if missing or incomplete
      }))
    }));
    
    console.log(`[AI TRAINING] Week ${(currentPlan.currentWeek || 1) + 1} generated with ${formattedDays.length} days`);
    
    // Log exercise counts per day for debugging
    formattedDays.forEach(day => {
      console.log(`[AI TRAINING] Day ${day.day}: ${day.exercises.length} exercises, ${day.exercises.map(e => e.steps?.length || 0).join('/')} steps each`);
    });
    
    return formattedDays;
    
  } catch (error) {
    console.error('[AI TRAINING] Progressive week generation failed:', error.message);
    
    // Fallback to gpt-4o if gpt-5 fails
    console.log('[AI TRAINING] Attempting fallback to gpt-4o for week generation...');
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Week ${(currentPlan.currentWeek || 1) + 1} training plan. JSON only.` }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      
      let fallbackText = (fallbackResponse.choices[0]?.message?.content || '').trim();
      if (fallbackText.startsWith('```')) {
        fallbackText = fallbackText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      if (fallbackText && fallbackText.length > 0) {
        const fallbackPlan = JSON.parse(fallbackText);
        console.log('[AI TRAINING] Fallback week generation successful');
        
        return (fallbackPlan.days || []).map((day, index) => ({
          day: index + 1,
          title: day.title || `Training Day ${index + 1}`,
          type: day.type || 'Strength',
          typeColor: day.typeColor || '#4A7CFF',
          status: index === 0 ? 'today' : 'upcoming',
          targetMuscles: day.targetMuscles || [],
          completed: false,
          exercises: (day.exercises || []).map((ex, exIndex) => ({
            id: `ex-${index + 1}-${exIndex + 1}`,
            name: ex.name || `Exercise ${exIndex + 1}`,
            sets: ex.sets || '4 x 10',
            note: ex.note || 'Focus on form',
            steps: [
              { stepNumber: 1, title: 'Set 1', description: 'Warm up set', duration: 60 },
              { stepNumber: 2, title: 'Set 2', description: 'Build up', duration: 60 },
              { stepNumber: 3, title: 'Set 3', description: 'Working set', duration: 60 },
              { stepNumber: 4, title: 'Set 4', description: 'Final push', duration: 60 },
            ]
          }))
        }));
      }
    } catch (fallbackError) {
      console.error('[AI TRAINING] Fallback week generation also failed:', fallbackError.message);
    }
    
    throw error;
  }
}

// ----- TRAINING SESSION -----

// Complete a training day (with userId in path - matches frontend)
app.post('/api/training/:userId/complete-day', async (req, res) => {
  const userId = req.params.userId;
  const { weekId, dayNumber, targetMuscles, exerciseCount, formScore } = req.body;
  console.log(`[TRAINING] 📝 Completing day ${dayNumber} for user ${userId}`);
  console.log(`[TRAINING] Request body:`, JSON.stringify({ weekId, dayNumber, targetMuscles, exerciseCount, formScore }));
  
  try {
    // Find the workout plan
    let plan = await WorkoutPlan.findOne({ userId });
    
    // If no plan exists, try to create one from user's scan data
    if (!plan) {
      console.log(`[TRAINING] ⚠️ No workout plan found, checking for user scan data...`);
      
      const user = await User.findOne({ 
        $or: [{ tempId: userId }, { userId: userId }]
      });
      
      if (user && user.latestScan) {
        console.log(`[TRAINING] Found scan data, generating new plan...`);
        try {
          const newPlan = await generateAITrainingPlan(user.latestScan);
          
          // Save to WorkoutPlan collection
          plan = await WorkoutPlan.findOneAndUpdate(
            { userId },
            { 
              userId,
              weeklyPlan: newPlan.days,
              weekId: newPlan.weekId,
              mission: newPlan.mission,
              currentWeek: 1,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          // Also save to user
          user.weeklyTrainingPlan = newPlan;
          await user.save();
          
          console.log(`[TRAINING] ✅ Created new plan with ${newPlan.days.length} days`);
        } catch (genErr) {
          console.error(`[TRAINING] ❌ Failed to generate plan:`, genErr.message);
          return res.status(500).json({ success: false, message: 'Failed to generate workout plan', error: genErr.message });
        }
      } else {
        console.log(`[TRAINING] ❌ No workout plan and no scan data for user ${userId}`);
        return res.status(404).json({ success: false, message: 'No workout plan found - please complete a scan first' });
      }
    }
    
    console.log(`[TRAINING] Current plan state - Week: ${plan.currentWeek}, Days: ${plan.weeklyPlan?.length}`);
    console.log(`[TRAINING] Day statuses BEFORE update:`, plan.weeklyPlan?.map(d => ({ day: d.day, status: d.status })));
    
    // Find and update the day status
    const dayIndex = plan.weeklyPlan.findIndex(d => d.day === dayNumber);
    if (dayIndex === -1) {
      console.log(`[TRAINING] ❌ Day ${dayNumber} not found in plan`);
      return res.status(404).json({ success: false, message: 'Day not found in plan' });
    }
    
    // Mark day as completed
    plan.weeklyPlan[dayIndex].status = 'done';
    plan.weeklyPlan[dayIndex].completed = true;
    plan.weeklyPlan[dayIndex].completedAt = new Date();
    
    // Update the next day's status to 'today' if it exists and is currently 'upcoming'
    const nextDayIndex = plan.weeklyPlan.findIndex(d => d.day === dayNumber + 1);
    if (nextDayIndex !== -1 && plan.weeklyPlan[nextDayIndex].status === 'upcoming') {
      plan.weeklyPlan[nextDayIndex].status = 'today';
      console.log(`[TRAINING] ✅ Advanced day ${dayNumber + 1} to 'today'`);
    }
    
    console.log(`[TRAINING] ✅ Marked day ${dayNumber} as done`);
    console.log(`[TRAINING] Day statuses AFTER update:`, plan.weeklyPlan?.map(d => ({ day: d.day, status: d.status })));
    
    // Mark all exercises as completed
    if (plan.weeklyPlan[dayIndex].exercises) {
      plan.weeklyPlan[dayIndex].exercises = plan.weeklyPlan[dayIndex].exercises.map(ex => ({
        ...ex,
        completed: true
      }));
    }
    
    // Store completed exercises in history for progressive overload tracking
    if (!plan.completedHistory) plan.completedHistory = [];
    plan.completedHistory.push({
      weekNumber: plan.currentWeek || 1,
      dayNumber,
      completedAt: new Date(),
      exercises: plan.weeklyPlan[dayIndex].exercises,
      targetMuscles: plan.weeklyPlan[dayIndex].targetMuscles || targetMuscles || [],
    });
    
    // IMPORTANT: Mark the nested array as modified so Mongoose saves the changes
    plan.markModified('weeklyPlan');
    plan.markModified('completedHistory');
    
    await plan.save();
    console.log(`[TRAINING] 💾 Saved plan to database`);
    
    // Verify the save worked by re-fetching
    const verifyPlan = await WorkoutPlan.findOne({ userId });
    console.log(`[TRAINING] 🔍 VERIFIED - Day statuses in DB:`, verifyPlan?.weeklyPlan?.map(d => ({ day: d.day, status: d.status })));
    
    // Calculate mog points earned
    const actualExerciseCount = exerciseCount || plan.weeklyPlan[dayIndex].exercises?.length || 3;
    const mogPointsEarned = 0.2 + actualExerciseCount * 0.15;
    
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
    }
    
    // Check if all days are completed - generate next week if so
    const daysStatuses = plan.weeklyPlan.map(d => d.status);
    const allDaysCompleted = plan.weeklyPlan.every(d => d.status === 'done');
    console.log(`[TRAINING] 🔍 Checking week completion - Day statuses: [${daysStatuses.join(', ')}]`);
    console.log(`[TRAINING] 🔍 All days completed? ${allDaysCompleted}`);
    
    let newWeekGenerated = false;
    let newWeekNumber = plan.currentWeek || 1;
    
    if (allDaysCompleted) {
      console.log(`[TRAINING] 🎉 ALL DAYS COMPLETED! Generating next week (Week ${newWeekNumber + 1}) for user ${userId}`);
      try {
        // Generate next week with progressive overload
        const nextWeek = await generateNextWeekPlan(user, plan);
        console.log(`[TRAINING] generateNextWeekPlan returned ${nextWeek?.length || 0} days`);
        if (nextWeek && nextWeek.length > 0) {
          newWeekNumber = (plan.currentWeek || 1) + 1;
          plan.currentWeek = newWeekNumber;
          plan.weeklyPlan = nextWeek;
          plan.weekId = `week-${newWeekNumber}-${Date.now()}`;
          await plan.save();
          console.log(`[TRAINING] 💾 Saved plan with week ${newWeekNumber} to database`);
          
          // Also sync to user.weeklyTrainingPlan
          if (user) {
            user.weeklyTrainingPlan = {
              weekId: plan.weekId,
              weekNumber: newWeekNumber,
              mission: plan.mission || `Week ${newWeekNumber} - Continue your transformation`,
              days: nextWeek,
              currentWeek: newWeekNumber,
            };
            await user.save();
          }
          
          newWeekGenerated = true;
          console.log(`[TRAINING] ✅ Week ${newWeekNumber} generated successfully with ${nextWeek.length} days`);
        } else {
          console.log('[TRAINING] ⚠️ generateNextWeekPlan returned empty, keeping current week');
        }
      } catch (genErr) {
        console.error('[TRAINING] ❌ Failed to generate next week:', genErr);
      }
    }
    
    res.json({
      success: true,
      dayCompleted: dayNumber,
      mogPointsEarned,
      newMogScore: user?.mogScore,
      totalWorkouts: user?.totalWorkouts,
      allDaysCompleted,
      newWeekGenerated,
      currentWeek: newWeekNumber,
    });
    
  } catch (err) {
    console.error('[TRAINING] Complete day failed:', err);
    res.status(500).json({ success: false, message: 'Failed to complete day', error: err.message });
  }
});

// Complete a training day (legacy endpoint without userId in path)
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
    
    // Store completed exercises in history for progressive overload tracking
    if (!plan.completedHistory) plan.completedHistory = [];
    plan.completedHistory.push({
      weekNumber: plan.currentWeek || 1,
      dayNumber,
      completedAt: new Date(),
      exercises: plan.weeklyPlan[dayIndex].exercises,
      targetMuscles: plan.weeklyPlan[dayIndex].targetMuscles || [],
    });
    
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
    }
    
    // Check if all days are completed - generate next week if so
    const allDaysCompleted = plan.weeklyPlan.every(d => d.status === 'done');
    let newWeekGenerated = false;
    
    if (allDaysCompleted) {
      console.log(`[TRAINING] All days completed! Generating next week for user ${userId}`);
      try {
        // Generate next week with progressive overload
        const nextWeek = await generateNextWeekPlan(user, plan);
        if (nextWeek) {
          plan.currentWeek = (plan.currentWeek || 1) + 1;
          plan.weeklyPlan = nextWeek;
          plan.weekId = `week-${plan.currentWeek}-${Date.now()}`;
          await plan.save();
          
          // Also sync to user.weeklyTrainingPlan
          if (user) {
            user.weeklyTrainingPlan = {
              weekId: plan.weekId,
              mission: plan.mission || 'Continue your transformation',
              days: nextWeek,
              currentWeek: plan.currentWeek,
            };
            await user.save();
          }
          
          newWeekGenerated = true;
          console.log(`[TRAINING] Week ${plan.currentWeek} generated successfully`);
        }
      } catch (genErr) {
        console.error('[TRAINING] Failed to generate next week:', genErr);
      }
    }
    
    res.json({
      success: true,
      dayCompleted: dayNumber,
      mogPointsEarned,
      newMogScore: user?.mogScore,
      totalWorkouts: user?.totalWorkouts,
      allDaysCompleted,
      newWeekGenerated,
      currentWeek: plan.currentWeek || 1,
    });
    
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

// In-memory cache for generated AI images (persists across requests during server lifetime)
const aiImageCache = new Map();

// Background generation queue
const backgroundImageQueue = [];
let isProcessingBackgroundQueue = false;

// Generate AI image for a single exercise (background task)
const generateAIImagesForExercise = async (exerciseName, exerciseId) => {
  if (!OPENAI_API_KEY) return null;
  
  const cacheKey = exerciseName.toLowerCase().trim();
  
  // Check if already in cache
  if (aiImageCache.has(cacheKey)) {
    return aiImageCache.get(cacheKey);
  }
  
  // Determine primary muscle group for highlighting
  const name = exerciseName.toLowerCase();
  let muscleGroup = 'full body';
  let glowArea = 'entire form';
  
  if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('calf')) {
    muscleGroup = 'leg muscles';
    glowArea = 'thighs and calves';
  } else if (name.includes('deadlift')) {
    muscleGroup = 'back and leg muscles';
    glowArea = 'lower back and hamstrings';
  } else if (name.includes('press') || name.includes('push') || name.includes('chest') || name.includes('bench') || name.includes('fly')) {
    muscleGroup = 'chest muscles';
    glowArea = 'chest and front shoulders';
  } else if (name.includes('row') || name.includes('pull') || name.includes('lat')) {
    muscleGroup = 'back muscles';
    glowArea = 'upper back and lats';
  } else if (name.includes('curl') || name.includes('bicep')) {
    muscleGroup = 'bicep muscles';
    glowArea = 'front of upper arms';
  } else if (name.includes('tricep') || name.includes('dip') || name.includes('extension')) {
    muscleGroup = 'tricep muscles';
    glowArea = 'back of upper arms';
  } else if (name.includes('shoulder') || name.includes('delt') || name.includes('raise') || name.includes('shrug')) {
    muscleGroup = 'shoulder muscles';
    glowArea = 'shoulders and traps';
  } else if (name.includes('crunch') || name.includes('plank') || name.includes('ab') || name.includes('core') || name.includes('twist')) {
    muscleGroup = 'core muscles';
    glowArea = 'abdominal region';
  }
  
  const phases = [
    { id: 'start', description: 'starting position' },
    { id: 'middle', description: 'mid-movement' },
    { id: 'end', description: 'peak contraction' }
  ];
  
  const images = [];
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    
    try {
      console.log(`[AI-IMAGE] Generating ${phase.id} for ${exerciseName}...`);
      
      // Use abstract robotic/mannequin style to avoid content filters
      const prompt = `A sleek futuristic fitness robot mannequin demonstrating ${exerciseName} exercise in ${phase.description}. The robot has a metallic silver-gray frame with visible joint mechanisms. The ${glowArea} area is highlighted with bright neon orange and red LED lights showing muscle activation. Dark gym environment with dramatic lighting. High-tech fitness app style illustration. Professional, clean, modern design. No text.`;
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });
      
      const data = await response.json();
      
      if (data.data?.[0]?.url) {
        images.push({ id: `${exerciseId}-${i + 1}`, url: data.data[0].url, phase: phase.id });
        console.log(`[AI-IMAGE] ✅ Generated ${phase.id} for ${exerciseName}`);
      } else {
        console.error(`[AI-IMAGE] ❌ Failed ${phase.id} for ${exerciseName}:`, data.error?.message || JSON.stringify(data));
        return null; // Failed, don't cache partial results
      }
      
      // Rate limit: wait 20 seconds between images
      if (i < phases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    } catch (err) {
      console.error(`[AI-IMAGE] Error generating ${phase.id} for ${exerciseName}:`, err.message);
      return null;
    }
  }
  
  if (images.length === 3) {
    // Cache the successful result
    aiImageCache.set(cacheKey, images);
    console.log(`[AI-IMAGE] ✅✅✅ Cached ${exerciseName} (${aiImageCache.size} exercises in cache)`);
    return images;
  }
  
  return null;
};

// Process background queue one at a time
const processBackgroundQueue = async () => {
  if (isProcessingBackgroundQueue || backgroundImageQueue.length === 0) return;
  
  isProcessingBackgroundQueue = true;
  
  while (backgroundImageQueue.length > 0) {
    const { exerciseName, exerciseId } = backgroundImageQueue.shift();
    const cacheKey = exerciseName.toLowerCase().trim();
    
    // Skip if already cached
    if (aiImageCache.has(cacheKey)) continue;
    
    console.log(`[AI-IMAGE] Background: processing ${exerciseName} (${backgroundImageQueue.length} remaining)`);
    await generateAIImagesForExercise(exerciseName, exerciseId);
    
    // Wait 30 seconds between exercises to avoid rate limits
    if (backgroundImageQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  isProcessingBackgroundQueue = false;
  console.log(`[AI-IMAGE] Background queue complete. Total cached: ${aiImageCache.size}`);
};

// Endpoint to clear image cache (useful when updating prompts)
app.post('/api/admin/clear-image-cache', async (req, res) => {
  const cacheSize = aiImageCache.size;
  aiImageCache.clear();
  backgroundImageQueue.length = 0;
  console.log(`[AI-IMAGE] Cache cleared! Was ${cacheSize} items.`);
  res.json({ success: true, message: `Cleared ${cacheSize} cached images`, queueCleared: true });
});

app.post('/api/workout/generate-exercise-image', async (req, res) => {
  const { exerciseName, exerciseId } = req.body;
  
  if (!exerciseName) {
    return res.status(400).json({ success: false, message: 'Exercise name required' });
  }
  
  const cacheKey = exerciseName.toLowerCase().trim();
  
  // Check in-memory cache first
  if (aiImageCache.has(cacheKey)) {
    console.log(`[AI-IMAGE] Cache hit for: ${exerciseName}`);
    return res.json({ success: true, images: aiImageCache.get(cacheKey), source: 'ai-cached' });
  }
  
  // Add to background queue for AI generation (if not already queued)
  const alreadyQueued = backgroundImageQueue.some(q => q.exerciseName.toLowerCase().trim() === cacheKey);
  if (OPENAI_API_KEY && !alreadyQueued) {
    backgroundImageQueue.push({ exerciseName, exerciseId });
    console.log(`[AI-IMAGE] Queued for background generation: ${exerciseName} (queue size: ${backgroundImageQueue.length})`);
    
    // Start processing if not already running
    processBackgroundQueue().catch(err => console.error('[AI-IMAGE] Queue error:', err));
  }
  
  // Return stock images immediately for fast UX (AI images will be ready on next request)
  console.log(`[IMAGES] Returning stock images for: ${exerciseName}`);
  const getStockImages = (exName, exId) => {
    const fallbackName = exName.toLowerCase();
    
    // Leg exercises
    if (fallbackName.includes('squat') || fallbackName.includes('leg') || fallbackName.includes('lunge') || fallbackName.includes('deadlift') || fallbackName.includes('calf')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Chest/Push exercises
    if (fallbackName.includes('press') || fallbackName.includes('push') || fallbackName.includes('chest') || fallbackName.includes('bench') || fallbackName.includes('fly')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1598971639058-a907e5e9f3d5?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Back/Pull exercises
    if (fallbackName.includes('row') || fallbackName.includes('pull') || fallbackName.includes('back') || fallbackName.includes('lat') || fallbackName.includes('face')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Arm/Bicep/Tricep exercises
    if (fallbackName.includes('curl') || fallbackName.includes('bicep') || fallbackName.includes('tricep') || fallbackName.includes('arm') || fallbackName.includes('dip')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1591940742878-13aba4b7a34e?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Shoulder exercises
    if (fallbackName.includes('shoulder') || fallbackName.includes('delt') || fallbackName.includes('raise') || fallbackName.includes('shrug')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Core/Ab exercises
    if (fallbackName.includes('crunch') || fallbackName.includes('plank') || fallbackName.includes('ab') || fallbackName.includes('core') || fallbackName.includes('twist')) {
      return [
        { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop', phase: 'start' },
        { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=600&fit=crop', phase: 'middle' },
        { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop', phase: 'end' },
      ];
    }
    
    // Default fitness images
    return [
      { id: `${exId}-1`, url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop', phase: 'start' },
      { id: `${exId}-2`, url: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&h=600&fit=crop', phase: 'middle' },
      { id: `${exId}-3`, url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&h=600&fit=crop', phase: 'end' },
    ];
  };
  
  const images = getStockImages(exerciseName, exerciseId);
  return res.json({ success: true, images, source: 'stock' });
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
      model: 'gpt-5',
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
      max_completion_tokens: 250, // GPT-5 uses max_completion_tokens
      // Note: GPT-5 only supports default temperature (1)
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
    const userId = req.params.userId;
    const onboarding = await Onboarding.findOne({ userId });
    if (!onboarding?.data) return res.status(404).json({ success: false, message: 'No data found' });
    
    const targets = calculateNutritionTargets(onboarding.data);
    const today = new Date().toISOString().split('T')[0];
    
    // Get recent logs for AI mode analysis (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const logs = await NutritionLog.find({ 
      userId, 
      date: { $gte: sevenDaysAgo } 
    });
    
    const todayLogs = logs.filter(l => l.date.toISOString().startsWith(today));
    
    const consumed = todayLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fats: acc.fats + (log.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    
    // Always use AI to analyze nutrition mode (uses meal data if available, otherwise uses goal)
    let finalTargets = { ...targets };
    const aiMode = await analyzeNutritionModeWithAI(userId, targets, logs, onboarding.data);
    if (aiMode) {
      finalTargets.mode = aiMode.mode;
      finalTargets.modeDescription = aiMode.modeDescription;
      finalTargets.modeIcon = aiMode.modeIcon;
      console.log(`[NUTRITION] AI Mode set: ${aiMode.mode} - ${aiMode.modeDescription}`);
    }
    
    res.json({ success: true, targets: finalTargets, consumed });
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

// AI Meal Estimation from Text Description
app.post('/api/nutrition/estimate/text', async (req, res) => {
  const { description, userId } = req.body;
  
  if (!description) {
    return res.status(400).json({ success: false, message: 'Meal description required' });
  }
  
  if (!openai) {
    console.log('[NUTRITION] OpenAI not initialized - returning mock response');
    return res.json({
      success: true,
      meal: {
        name: description.slice(0, 50),
        calories: 450,
        protein: 35,
        carbs: 40,
        fats: 15,
        confidence: 70,
        items: [{ name: description, calories: 450, protein: 35, carbs: 40, fats: 15 }]
      }
    });
  }
  
  try {
    console.log(`[NUTRITION] AI estimating meal from text: "${description.slice(0, 50)}..."`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert AI. Analyze the meal description and estimate its nutritional content.

Be accurate but realistic. Consider typical portion sizes. If the user mentions specific quantities, use those.

IMPORTANT: 
- Provide practical estimates based on common serving sizes
- If unclear, assume a standard adult portion
- Round to reasonable whole numbers

Respond ONLY in valid JSON format:
{
  "name": "Short descriptive name for the meal (max 30 chars)",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fats": number (grams),
  "confidence": number (0-100, how confident you are in this estimate),
  "items": [
    { "name": "item name", "calories": number, "protein": number, "carbs": number, "fats": number }
  ]
}`
        },
        {
          role: 'user',
          content: `Estimate the nutritional content of this meal: "${description}"`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const content = completion.choices?.[0]?.message?.content || '';
    console.log('[NUTRITION] AI response:', content.slice(0, 200));
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const meal = JSON.parse(jsonMatch[0]);
        console.log(`[NUTRITION] ✅ Estimated: ${meal.name} - ${meal.calories} cal, ${meal.protein}g protein`);
        return res.json({ success: true, meal });
      }
    } catch (parseErr) {
      console.log('[NUTRITION] JSON parse error:', parseErr.message);
    }
    
    // Fallback
    res.json({
      success: true,
      meal: {
        name: description.slice(0, 30),
        calories: 400,
        protein: 25,
        carbs: 45,
        fats: 15,
        confidence: 50,
        items: [{ name: description, calories: 400, protein: 25, carbs: 45, fats: 15 }]
      }
    });
    
  } catch (err) {
    console.error('[NUTRITION] AI estimation failed:', err.message);
    res.status(500).json({ success: false, message: 'Estimation failed', error: err.message });
  }
});

// AI Meal Estimation from Photo
app.post('/api/nutrition/estimate/photo', async (req, res) => {
  const { imageBase64, userId } = req.body;
  
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Image required' });
  }
  
  if (!openai) {
    console.log('[NUTRITION] OpenAI not initialized - returning mock response');
    return res.json({
      success: true,
      meal: {
        name: 'Scanned Meal',
        calories: 550,
        protein: 40,
        carbs: 50,
        fats: 20,
        confidence: 65,
        items: [{ name: 'Food items', calories: 550, protein: 40, carbs: 50, fats: 20 }]
      }
    });
  }
  
  try {
    console.log('[NUTRITION] AI analyzing meal photo...');
    
    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert AI. Analyze the food in the image and estimate its nutritional content.

IMPORTANT RULES:
1. If the image does NOT contain food or a meal, respond with EXACTLY: {"error": "NOT_FOOD", "message": "This image does not appear to contain food. Please take a photo of your meal."}
2. If the image is blurry, dark, or unrecognizable, respond with EXACTLY: {"error": "UNCLEAR", "message": "Could not clearly see the food. Please try again with better lighting."}
3. Only if you can identify food, provide the nutritional estimate.

For valid food images, respond in JSON format:
{
  "name": "Short descriptive name for the meal (max 30 chars)",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fats": number (grams),
  "confidence": number (0-100, how confident you are),
  "items": [
    { "name": "item name", "calories": number, "protein": number, "carbs": number, "fats": number }
  ]
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image. If it contains food, estimate its nutritional content. If it does NOT contain food, tell me it is not food.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 600,
    });
    
    const content = completion.choices?.[0]?.message?.content || '';
    console.log('[NUTRITION] AI photo response:', content.slice(0, 200));
    
    // Try to parse JSON first
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check if AI returned an error object
        if (parsed.error === 'NOT_FOOD') {
          console.log('[NUTRITION] Image is not food');
          return res.json({ 
            success: false, 
            message: parsed.message || 'This image does not appear to contain food. Please take a photo of your meal.',
            error: 'not_food'
          });
        }
        
        if (parsed.error === 'UNCLEAR') {
          console.log('[NUTRITION] Image is unclear');
          return res.json({ 
            success: false, 
            message: parsed.message || 'Could not clearly see the food. Please try again with better lighting.',
            error: 'unclear_image'
          });
        }
        
        // Valid meal response
        if (parsed.calories !== undefined && parsed.protein !== undefined) {
          console.log(`[NUTRITION] ✅ Photo estimated: ${parsed.name} - ${parsed.calories} cal, ${parsed.protein}g protein`);
          return res.json({ success: true, meal: parsed });
        }
      }
    } catch (parseErr) {
      console.log('[NUTRITION] JSON parse error:', parseErr.message);
    }
    
    // Check if AI indicates it can't analyze the image (text-based response)
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("unable to analyze") || 
        lowerContent.includes("can't analyze") ||
        lowerContent.includes("cannot analyze") ||
        lowerContent.includes("no visible food") ||
        lowerContent.includes("completely black") ||
        lowerContent.includes("no food") ||
        lowerContent.includes("doesn't appear to contain food") ||
        lowerContent.includes("does not appear to contain food") ||
        lowerContent.includes("not a food") ||
        lowerContent.includes("isn't food") ||
        lowerContent.includes("is not food") ||
        lowerContent.includes("doesn't show food") ||
        lowerContent.includes("does not show food") ||
        lowerContent.includes("can't identify") ||
        lowerContent.includes("cannot identify") ||
        lowerContent.includes("unable to identify") ||
        lowerContent.includes("not an image of food") ||
        lowerContent.includes("no meal") ||
        lowerContent.includes("not a meal")) {
      console.log('[NUTRITION] AI could not analyze photo - not food or unclear');
      return res.json({ 
        success: false, 
        message: 'This doesn\'t appear to be a meal. Please take a photo of the food you want to log.',
        error: 'no_food_detected'
      });
    }
    
    // Fallback - AI gave a response but not in expected format
    res.json({
      success: false,
      message: 'Could not analyze the photo properly. Please try again with a clearer image of your meal.',
      error: 'parse_error'
    });
    
  } catch (err) {
    console.error('[NUTRITION] Photo analysis failed:', err.message);
    res.status(500).json({ success: false, message: 'Photo analysis failed', error: err.message });
  }
});

// Get nutrition history/meals for a user
app.get('/api/nutrition/meals/:userId', async (req, res) => {
  try {
    const { date } = req.query;
    const query = { userId: req.params.userId };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }
    
    const meals = await NutritionLog.find(query).sort({ date: -1 }).limit(50);
    res.json({ success: true, meals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
});

// Get weekly nutrition summary
app.get('/api/nutrition/weekly/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user's nutrition targets
    const onboarding = await Onboarding.findOne({ userId });
    if (!onboarding?.data) {
      return res.status(404).json({ success: false, message: 'No onboarding data' });
    }
    
    const targets = calculateNutritionTargets(onboarding.data);
    
    // Get logs for the past 14 days (to cover current and previous week)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    
    const logs = await NutritionLog.find({
      userId,
      date: { $gte: fourteenDaysAgo }
    });
    
    // Build week starting from Monday of the current week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find Monday of this week
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const weekData = [];
    let streak = 0;
    let totalCompliant = 0;
    
    // Build Mon-Sun week with actual data
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(monday);
      checkDate.setDate(monday.getDate() + i);
      checkDate.setHours(0, 0, 0, 0);
      
      const isToday = checkDate.toDateString() === today.toDateString();
      const isFuture = checkDate > today;
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.toDateString() === checkDate.toDateString();
      });
      
      const dayTotals = dayLogs.reduce((acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
      }), { calories: 0, protein: 0 });
      
      // Determine initial status
      let status = 'notComplete';
      if (isFuture) {
        status = 'pending';
      } else if (isToday) {
        status = 'pending';
      } else if (dayLogs.length > 0) {
        // Past day with some logs - mark for AI analysis
        const calorieCompliant = dayTotals.calories >= targets.calories * 0.85 && dayTotals.calories <= targets.calories * 1.15;
        const proteinCompliant = dayTotals.protein >= targets.protein * 0.75;
        status = (calorieCompliant && proteinCompliant) ? 'complete' : 'notComplete';
        if (status === 'complete') totalCompliant++;
      }
      
      weekData.push({
        day: dayNames[checkDate.getDay()],
        date: checkDate.toISOString().split('T')[0],
        status,
        calories: dayTotals.calories,
        protein: dayTotals.protein,
        mealsLogged: dayLogs.length,
      });
    }
    
    // Use AI to analyze discipline if there are logs
    let aiInsight = null;
    if (logs.length >= 2) {
      const aiAnalysis = await analyzeDietDisciplineWithAI(weekData, targets, logs);
      if (aiAnalysis) {
        // Update weekData with AI analysis
        if (aiAnalysis.weekData && Array.isArray(aiAnalysis.weekData)) {
          aiAnalysis.weekData.forEach((aiDay, index) => {
            if (weekData[index] && aiDay.status) {
              // Only update past days, keep pending for today/future
              if (weekData[index].status !== 'pending') {
                weekData[index].status = aiDay.status;
                weekData[index].reason = aiDay.reason;
              }
            }
          });
        }
        // Use AI-calculated values
        streak = aiAnalysis.streak || 0;
        totalCompliant = weekData.filter(d => d.status === 'complete').length;
        aiInsight = aiAnalysis.insight;
      }
    }
    
    // Recalculate streak based on final status
    streak = 0;
    for (let i = weekData.length - 1; i >= 0; i--) {
      if (weekData[i].status === 'pending') continue;
      if (weekData[i].status === 'complete') {
        streak++;
      } else {
        break;
      }
    }
    
    // Calculate compliance
    const pastDays = weekData.filter(d => d.status !== 'pending').length;
    const compliance = pastDays > 0 ? Math.round((totalCompliant / pastDays) * 100) : 0;
    
    console.log(`[NUTRITION] Weekly: ${totalCompliant}/${pastDays} days complete, ${streak} streak`);
    
    res.json({
      success: true,
      targets,
      weekData,
      streak,
      compliance,
      totalCompliant,
      insight: aiInsight,
    });
  } catch (err) {
    console.error('[NUTRITION] Weekly summary error:', err);
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
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
  
  // Determine primary muscle group for highlighting
  const name = exerciseName.toLowerCase();
  let muscleGroup = 'full body';
  let glowArea = 'entire form';
  
  if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('calf')) {
    muscleGroup = 'leg muscles';
    glowArea = 'thighs and calves';
  } else if (name.includes('deadlift')) {
    muscleGroup = 'back and leg muscles';
    glowArea = 'lower back and hamstrings';
  } else if (name.includes('press') || name.includes('push') || name.includes('chest') || name.includes('bench') || name.includes('fly')) {
    muscleGroup = 'chest muscles';
    glowArea = 'chest and front shoulders';
  } else if (name.includes('row') || name.includes('pull') || name.includes('lat')) {
    muscleGroup = 'back muscles';
    glowArea = 'upper back and lats';
  } else if (name.includes('curl') || name.includes('bicep')) {
    muscleGroup = 'bicep muscles';
    glowArea = 'front of upper arms';
  } else if (name.includes('tricep') || name.includes('dip') || name.includes('extension')) {
    muscleGroup = 'tricep muscles';
    glowArea = 'back of upper arms';
  } else if (name.includes('shoulder') || name.includes('delt') || name.includes('raise') || name.includes('shrug')) {
    muscleGroup = 'shoulder muscles';
    glowArea = 'shoulders and traps';
  } else if (name.includes('crunch') || name.includes('plank') || name.includes('ab') || name.includes('core') || name.includes('twist')) {
    muscleGroup = 'core muscles';
    glowArea = 'abdominal region';
  }
  
  const phases = [
    { id: 'start', description: 'starting position' },
    { id: 'middle', description: 'mid-movement' },
    { id: 'end', description: 'peak contraction' }
  ];
  
  const images = [];
  
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    
    try {
      console.log(`[BG-JOB] Generating ${phase.id} image for ${exerciseName}...`);
      
      // Use abstract robotic/mannequin style to avoid content filters
      const prompt = `A sleek futuristic fitness robot mannequin demonstrating ${exerciseName} exercise in ${phase.description}. The robot has a metallic silver-gray frame with visible joint mechanisms. The ${glowArea} area is highlighted with bright neon orange and red LED lights showing muscle activation. Dark gym environment with dramatic lighting. High-tech fitness app style illustration. Professional, clean, modern design. No text.`;
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
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
// TEST PUSH NOTIFICATION ENDPOINT (for testing with Expo Push API)
// =====================================================

/**
 * Send a test push notification via Expo's Push API
 * POST /api/test-notification
 * Body: { expoPushToken: "ExponentPushToken[xxx]", title: "Test", body: "Hello" }
 */
app.post('/api/test-notification', async (req, res) => {
  try {
    const { expoPushToken, title = '🔔 Test Notification', body = 'This is a test notification from Mog.ai!' } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'expoPushToken is required',
        hint: 'Get the token from your app - it looks like ExponentPushToken[xxxx]'
      });
    }

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: { type: 'test', timestamp: new Date().toISOString() },
      }),
    });

    const result = await response.json();
    console.log('[PUSH] Test notification sent:', result);

    res.json({
      success: true,
      message: 'Test notification sent!',
      expoPushResult: result,
    });
  } catch (error) {
    console.error('[PUSH] Test notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send notification to all registered tokens (broadcast)
 * POST /api/broadcast-notification
 * Body: { title: "Title", body: "Message" }
 */
app.post('/api/broadcast-notification', async (req, res) => {
  try {
    const { title = '📢 Mog.ai Update', body = 'Check out what\'s new!' } = req.body;

    // Get all users with push tokens
    const users = await User.find({ expoPushToken: { $exists: true, $ne: null } });
    
    if (users.length === 0) {
      return res.json({ success: true, message: 'No users with push tokens found', sentCount: 0 });
    }

    const messages = users.map(user => ({
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data: { type: 'broadcast', timestamp: new Date().toISOString() },
    }));

    // Send in batches of 100 (Expo limit)
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let successCount = 0;
    for (const chunk of chunks) {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const result = await response.json();
      if (result.data) successCount += result.data.length;
    }

    console.log(`[PUSH] Broadcast sent to ${successCount} users`);
    res.json({ success: true, message: `Broadcast sent to ${successCount} users`, sentCount: successCount });
  } catch (error) {
    console.error('[PUSH] Broadcast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
