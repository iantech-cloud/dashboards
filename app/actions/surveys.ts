"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { authOptions } from "@/auth"
import {
  connectToDatabase,
  Survey,
  SurveyResponse,
  SurveyAssignment,
  Profile,
  Transaction,
  Earning,
} from "@/app/lib/models"
import { Types, Query } from "mongoose"

// Import the Google Gen AI library
import { GoogleGenAI, Type } from "@google/genai"

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null

// --- Core Data Interfaces (Lean results) ---
export interface SurveyQuestion {
  question_text: string
  question_type: "multiple_choice"
  options: Array<{
    text: string
    is_correct: boolean
  }>
  correct_answer_index: number
  required: boolean
}

export interface AdminSurvey {
  id: string
  title: string
  description: string
  category: string
  topics: string[]
  payout_cents: number
  duration_minutes: number
  questions: SurveyQuestion[]
  status: string
  scheduled_for?: Date
  expires_at?: Date
  current_responses: number
  max_responses: number
  is_manually_enabled?: boolean
  created_by: {
    id: string
    username: string
    email: string
  }
}

export interface SurveyCompletionResult {
  success: boolean
  message: string
  payout_cents?: number
  balance_cents?: number
  score?: number
  all_correct?: boolean
}

// Interfaces for Mongoose Lean Results
interface IProfileLean {
  _id: string
  username: string
  email: string
  role: string
  balance_cents: number
  total_earnings_cents: number
  survey_accuracy_rate?: number
  total_surveys_completed?: number
  correct_surveys_count?: number
  [key: string]: any
}

interface ISurveyLean {
  _id: Types.ObjectId
  title: string
  description: string
  category: string
  topics: string[]
  payout_cents: number
  duration_minutes: number
  questions: SurveyQuestion[]
  status: string
  scheduled_for: Date
  expires_at: Date
  current_responses: number
  max_responses: number
  is_manually_enabled: boolean
  created_by: string | { _id: string; username: string; email: string }
  ai_generated: boolean
  target_percentage: number
  priority_new_users: boolean
  priority_top_referrers: boolean
  successful_responses: number
  failed_responses: number
  completion_rate: number
  average_score: number
  average_completion_time: number
  difficulty: string
  estimated_completion_rate: number
  quality_score: number
  tags: string[]
  [key: string]: any
}

interface ISurveyResponseLean {
  _id: Types.ObjectId
  survey_id: Types.ObjectId
  user_id: string
  status: string
  started_at: Date
  completed_at?: Date
  time_taken_seconds?: number
  answers?: Array<any>
  all_correct?: boolean
  score?: number
  payout_credited?: boolean
  revoked?: boolean
  revoked_at?: Date
  revoked_by?: string
  revoke_reason?: string
  [key: string]: any
}

interface ISurveyAssignmentLean {
  _id: Types.ObjectId
  survey_id: Types.ObjectId
  user_id: string
  assigned_at: Date
  assigned_reason: string
  [key: string]: any
}

interface ISurveyResponsePopulated extends Omit<ISurveyResponseLean, 'survey_id'> {
  survey_id: ISurveyLean
}

// --- Helper Functions ---

async function executeLeanQuery<T>(query: Query<T | null, any>): Promise<T | null> {
  const result = await (query as any).lean().exec()
  return result as T | null
}

async function executeQuery<T>(query: Query<T | null, any>): Promise<T | null> {
  const result = await (query as any).exec()
  return result as T | null
}

async function findProfileByEmail(email: string): Promise<IProfileLean | null> {
  const query = Profile.findOne({ email }) as Query<IProfileLean | null, any>
  return executeLeanQuery<IProfileLean>(query)
}

async function findSurveyById(id: Types.ObjectId): Promise<ISurveyLean | null> {
  const query = Survey.findOne({ _id: id }) as Query<ISurveyLean | null, any>
  return executeLeanQuery<ISurveyLean>(query)
}

async function findSurveyResponseById(id: Types.ObjectId): Promise<ISurveyResponseLean | null> {
  const query = SurveyResponse.findOne({ _id: id }) as Query<ISurveyResponseLean | null, any>
  return executeLeanQuery<ISurveyResponseLean>(query)
}

async function findSurveyAssignment(
  surveyId: Types.ObjectId,
  userId: string,
): Promise<ISurveyAssignmentLean | null> {
  const query = SurveyAssignment.findOne({
    survey_id: surveyId,
    user_id: userId,
  }) as Query<ISurveyAssignmentLean | null, any>
  return executeLeanQuery<ISurveyAssignmentLean>(query)
}

function serializeDocument(doc: any): Record<string, any> | null {
  if (!doc) return null

  const serialized = JSON.parse(JSON.stringify(doc)) as Record<string, any>

  if (serialized._id && typeof serialized._id !== "string") {
    serialized._id = serialized._id.toString()
  }
  if (serialized.survey_id && typeof serialized.survey_id !== "string") {
    serialized.survey_id = serialized.survey_id.toString()
  }
  if (serialized.user_id && typeof serialized.user_id !== "string") {
    serialized.user_id = serialized.user_id.toString()
  }

  if (serialized.created_by && typeof serialized.created_by === "object" && serialized.created_by._id) {
    serialized.created_by.id = serialized.created_by._id.toString()
    delete serialized.created_by._id
  }

  return serialized
}

/**
 * Automatically assign users to a survey
 * If active users > 20, assign 15% of active users
 * If active users <= 20, assign all active users
 */
async function assignUsersToSurvey(surveyId: Types.ObjectId, targetPercentage: number = 15): Promise<number> {
  try {
    await connectToDatabase();
    
    // Count total active users
    const totalUsers = await Profile.countDocuments({
      $or: [
        { status: 'active' },
        { status: { $exists: false } } // Assume active if no status field
      ]
    });
    
    console.log(`[ASSIGNMENT] Total active users: ${totalUsers}`);
    
    // Calculate target user count
    let targetUserCount: number;
    
    if (totalUsers > 20) {
      // If more than 20 users, assign target percentage
      targetUserCount = Math.max(1, Math.ceil(totalUsers * (targetPercentage / 100)));
    } else {
      // If 20 or fewer users, assign all users
      targetUserCount = totalUsers;
    }
    
    console.log(`[ASSIGNMENT] Target users for survey ${surveyId}: ${targetUserCount}`);
    
    // Get users who are not already assigned to this survey
    const alreadyAssignedUsers = await SurveyAssignment.find({ 
      survey_id: surveyId 
    }).select('user_id').lean();
    
    const alreadyAssignedUserIds = alreadyAssignedUsers.map(a => a.user_id);
    console.log(`[ASSIGNMENT] Already assigned users: ${alreadyAssignedUserIds.length}`);
    
    // Calculate how many more users we need to assign
    const neededAssignments = Math.max(0, targetUserCount - alreadyAssignedUserIds.length);
    
    if (neededAssignments === 0) {
      console.log(`[ASSIGNMENT] Survey ${surveyId} already has enough assignments`);
      return 0;
    }
    
    console.log(`[ASSIGNMENT] Need to assign ${neededAssignments} more users`);
    
    // Get eligible users (not already assigned, active)
    const eligibleUsers = await Profile.aggregate([
      {
        $match: {
          _id: { $nin: alreadyAssignedUserIds },
          $or: [
            { status: 'active' },
            { status: { $exists: false } }
          ]
        }
      },
      { $sample: { size: neededAssignments } },
      { $project: { _id: 1 } }
    ]);
    
    console.log(`[ASSIGNMENT] Found ${eligibleUsers.length} eligible users`);
    
    if (eligibleUsers.length === 0) {
      console.log(`[ASSIGNMENT] No eligible users found for assignment`);
      return 0;
    }
    
    // Create assignments with VALID enum values
    const assignments = eligibleUsers.map(user => ({
      survey_id: surveyId,
      user_id: user._id,
      assigned_at: new Date(),
      assigned_reason: "random" // Use the valid enum value
    }));
    
    const result = await SurveyAssignment.insertMany(assignments);
    console.log(`[ASSIGNMENT] Successfully assigned ${result.length} users to survey ${surveyId}`);
    
    return result.length;
    
  } catch (error: any) {
    console.error('[ASSIGNMENT] Error assigning users to survey:', error);
    // Log the specific validation error details
    if (error.errors) {
      console.error('[ASSIGNMENT] Validation errors:', error.errors);
    }
    return 0;
  }
}

/**
 * Update user's survey accuracy rate
 */
async function updateUserAccuracyRate(userId: string, wasCorrect: boolean) {
  try {
    const user = await Profile.findById(userId)
    if (!user) return

    const totalCompleted = (user.total_surveys_completed || 0) + 1
    const correctCount = (user.correct_surveys_count || 0) + (wasCorrect ? 1 : 0)
    const accuracyRate = totalCompleted > 0 ? (correctCount / totalCompleted) * 100 : 0

    await Profile.updateOne(
      { _id: userId },
      {
        total_surveys_completed: totalCompleted,
        correct_surveys_count: correctCount,
        survey_accuracy_rate: Math.round(accuracyRate * 100) / 100, // Round to 2 decimals
      }
    )
  } catch (error) {
    console.error("Error updating user accuracy rate:", error)
  }
}

/**
 * Check if surveys are enabled (either manually or by schedule)
 */
async function areSurveysEnabled(): Promise<boolean> {
  await connectToDatabase()
  
  // Check if any survey is manually enabled and active
  const manuallyEnabledCount = await Survey.countDocuments({
    $or: [
      { 
        is_manually_enabled: true,
        status: 'active',
        expires_at: { $gt: new Date() }
      },
      { 
        is_manually_enabled: true,
        status: 'scheduled',
        scheduled_for: { $lte: new Date() },
        expires_at: { $gt: new Date() }
      }
    ]
  })
  
  if (manuallyEnabledCount > 0) {
    return true
  }
  
  // Check if it's Tuesday 21:00-23:59 EAT (UTC+3)
  const now = new Date()
  
  // Convert to EAT (UTC+3) - Africa/Nairobi
  const eatTimeString = now.toLocaleString('en-US', { 
    timeZone: 'Africa/Nairobi',
    hour12: false
  })
  
  const eatDate = new Date(eatTimeString)
  const dayOfWeek = eatDate.getDay() // 0 = Sunday, 2 = Tuesday
  const hour = eatDate.getHours()
  
  // Surveys available on Tuesday from 21:00 to 23:59 EAT
  const isTuesdayTime = dayOfWeek === 2 && hour >= 21 && hour < 24
  
  return isTuesdayTime
}

/**
 * Submit survey answers with validation and timing
 */
export async function submitSurveyAnswers(
  responseId: string,
  answers: Array<{
    question_index: number
    selected_option_index: number
  }>,
): Promise<SurveyCompletionResult> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(responseId)) {
      return { success: false, message: "Invalid response ID." }
    }

    await connectToDatabase()
    const user = await findProfileByEmail(session.user.email)

    if (!user) {
      return { success: false, message: "User profile not found." }
    }

    const userId = user._id
    const responseObjectId = new Types.ObjectId(responseId)

    const sessionMongo = await (SurveyResponse.startSession() as Promise<any>)

    return await sessionMongo.withTransaction(async () => {
      const surveyResponseQuery = SurveyResponse.findOne({
        _id: responseObjectId,
        user_id: userId,
        status: "in_progress",
      }).populate("survey_id") as Query<ISurveyResponsePopulated | null, any>
      
      const surveyResponse = await executeQuery<ISurveyResponsePopulated>(surveyResponseQuery.session(sessionMongo))

      if (!surveyResponse) {
        throw new Error("Survey response not found or already completed.")
      }

      const survey = surveyResponse.survey_id

      const currentTime = new Date()
      const timeElapsed = (currentTime.getTime() - new Date(surveyResponse.started_at).getTime()) / 1000
      const timeLimit = survey.duration_minutes * 60

      if (timeElapsed > timeLimit) {
        await (SurveyResponse.updateOne(
          { _id: responseObjectId },
          {
            status: "timeout",
            completed_at: currentTime,
            time_taken_seconds: Math.floor(timeElapsed),
          },
          { session: sessionMongo },
        ) as Query<any, any>)
        
        // Update user accuracy rate for timeout
        await updateUserAccuracyRate(userId, false)
        throw new Error("Survey time expired. Payment not credited.")
      }

      // Validate answers
      let allCorrect = true
      let correctAnswers = 0
      const validatedAnswers: any[] = []

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i]
        const question = survey.questions[answer.question_index]

        if (!question) {
          throw new Error(`Invalid question index: ${answer.question_index}`)
        }

        const isCorrect = answer.selected_option_index === question.correct_answer_index
        if (!isCorrect) {
          allCorrect = false
          await (SurveyResponse.updateOne(
            { _id: responseObjectId },
            {
              status: "wrong_answer",
              completed_at: currentTime,
              time_taken_seconds: Math.floor(timeElapsed),
              answers: validatedAnswers,
            },
            { session: sessionMongo },
          ) as Query<any, any>)
          
          // Update user accuracy rate for wrong answer
          await updateUserAccuracyRate(userId, false)
          throw new Error("Incorrect answer. Survey closed. Payment not credited.")
        }

        correctAnswers++
        validatedAnswers.push({
          question_index: answer.question_index,
          selected_option_index: answer.selected_option_index,
          is_correct: isCorrect,
          answered_at: currentTime,
        })
      }

      const score = (correctAnswers / survey.questions.length) * 100

      await (SurveyResponse.updateOne(
        { _id: responseObjectId },
        {
          answers: validatedAnswers,
          completed_at: currentTime,
          time_taken_seconds: Math.floor(timeElapsed),
          all_correct: allCorrect,
          score: score,
          status: "completed",
        },
        { session: sessionMongo },
      ) as Query<any, any>)

      if (allCorrect && timeElapsed <= timeLimit) {
        await (Profile.updateOne(
          { _id: userId },
          {
            $inc: {
              balance_cents: survey.payout_cents,
              total_earnings_cents: survey.payout_cents,
            },
          },
          { session: sessionMongo },
        ) as Query<any, any>)

        const transaction = new Transaction({
          user_id: userId,
          amount_cents: survey.payout_cents,
          type: "SURVEY",
          description: `Survey completion: ${survey.title}`,
          status: "completed",
          metadata: {
            survey_id: survey._id.toString(),
            survey_response_id: responseObjectId.toString(),
            score: score,
            time_taken: Math.floor(timeElapsed),
          },
        })

        await transaction.save({ session: sessionMongo })

        const earning = new Earning({
          user_id: userId,
          amount_cents: survey.payout_cents,
          type: "SURVEY",
          description: `Completed survey: ${survey.title} (Score: ${score}%)`,
        })

        await earning.save({ session: sessionMongo })

        await (SurveyResponse.updateOne({ _id: responseObjectId }, { payout_credited: true }, { session: sessionMongo }) as Query<any, any>)

        await (Survey.updateOne(
          { _id: survey._id },
          {
            $inc: {
              current_responses: 1,
              successful_responses: 1,
            },
          },
          { session: sessionMongo },
        ) as Query<any, any>)
        
        // Update user accuracy rate for correct answer
        await updateUserAccuracyRate(userId, true)
      } else {
        await (Survey.updateOne(
          { _id: survey._id },
          {
            $inc: {
              current_responses: 1,
              failed_responses: 1,
            },
          },
          { session: sessionMongo },
        ) as Query<any, any>)
        
        // Update user accuracy rate for failed survey
        await updateUserAccuracyRate(userId, false)
      }

      const updatedProfileQuery = Profile.findById(userId).session(sessionMongo) as Query<IProfileLean | null, any>
      const updatedProfile = await executeLeanQuery<IProfileLean>(updatedProfileQuery)

      revalidatePath("/dashboard/surveys")
      revalidatePath("/dashboard")

      return {
        success: true,
        message: allCorrect
          ? `Survey completed successfully! KES ${(survey.payout_cents / 100).toFixed(2)} has been added to your balance.`
          : "Survey completed but payment not credited due to incorrect answers.",
        payout_cents: allCorrect ? survey.payout_cents : 0,
        balance_cents: updatedProfile?.balance_cents || 0,
        score: score,
        all_correct: allCorrect,
      }
    })
  } catch (error: any) {
    console.error("Error submitting survey:", error)
    return {
      success: false,
      message: error.message || "Failed to submit survey answers.",
    }
  }
}

/**
 * Get user's survey history
 */
export async function getSurveyHistory(): Promise<{
  success: boolean
  data?: any[]
  message?: string
}> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const user = await findProfileByEmail(session.user.email)

    if (!user) {
      return { success: false, message: "User profile not found." }
    }

    const surveyHistory = (await (SurveyResponse.aggregate([
      {
        $match: { user_id: user._id },
      },
      {
        $lookup: {
          from: "surveys",
          localField: "survey_id",
          foreignField: "_id",
          as: "survey",
        },
      },
      {
        $unwind: "$survey",
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          survey_title: "$survey.title",
          survey_category: "$survey.category",
          completed_at: 1,
          time_taken_seconds: 1,
          score: 1,
          all_correct: 1,
          status: 1,
          payout_credited: 1,
          payout_amount_cents: "$survey.payout_cents",
          revoked: 1,
        },
      },
      {
        $sort: { completed_at: -1 },
      },
    ]) as Query<any, any>).exec()) as any[]

    const serializedHistory = surveyHistory.map(serializeDocument)

    return {
      success: true,
      data: serializedHistory,
    }
  } catch (error: any) {
    console.error("Error fetching survey history:", error)
    return {
      success: false,
      message: error.message || "Failed to load survey history.",
    }
  }
}

/**
 * Get all surveys for admin
 */
export async function getAdminSurveys(page = 1, limit = 10, search?: string) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    const skip = (page - 1) * limit
    const query: any = {}

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ]
    }

    const totalPromise = (Survey.countDocuments(query) as Query<number, any>).exec()
    
    const surveysPromise = (Survey.find(query)
      .populate("created_by", "username email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as Promise<any[]>)

    const [surveys, total] = await Promise.all([surveysPromise, totalPromise])

    const serializedSurveys = surveys.map(serializeDocument)

    return {
      success: true,
      data: serializedSurveys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      message: "Surveys fetched successfully",
    }
  } catch (error: any) {
    console.error("Get admin surveys error:", error)
    return { success: false, message: "Failed to fetch surveys" }
  }
}

/**
 * Get all survey responses for admin with pagination and search.
 */
export async function getAdminSurveyResponses(page = 1, limit = 10, search?: string) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    const skip = (page - 1) * limit
    const pipeline: any[] = [
      {
        $lookup: {
          from: "surveys",
          localField: "survey_id",
          foreignField: "_id",
          as: "survey",
        },
      },
      {
        $unwind: { path: "$survey", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "profiles",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
    ]

    if (search) {
      const searchRegex = new RegExp(search, "i")
      pipeline.push({
        $match: {
          $or: [
            { "survey.title": { $regex: searchRegex } },
            { "user.username": { $regex: searchRegex } },
            { "user.email": { $regex: searchRegex } },
            { status: { $regex: searchRegex } },
          ],
        },
      })
    }

    const totalCount = (await (SurveyResponse.aggregate([...pipeline, { $count: "total" }]) as Query<any, any>).exec()) as any[]
    const total = totalCount.length > 0 ? totalCount[0].total : 0

    pipeline.push(
      { $sort: { completed_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          id: "$_id",
          survey_title: "$survey.title",
          user_email: "$user.email",
          user_username: "$user.username",
          user_accuracy_rate: "$user.survey_accuracy_rate",
          completed_at: 1,
          time_taken_seconds: 1,
          score: 1,
          all_correct: 1,
          status: 1,
          payout_credited: 1,
          payout_amount_cents: "$survey.payout_cents",
          revoked: 1,
          revoke_reason: 1,
        },
      },
    )

    const responses = (await (SurveyResponse.aggregate(pipeline) as Query<any, any>).exec()) as any[]

    const serializedResponses = responses.map(serializeDocument)

    return {
      success: true,
      data: serializedResponses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      message: "Survey responses fetched successfully",
    }
  } catch (error: any) {
    console.error("Get admin survey responses error:", error)
    return { success: false, message: error.message || "Failed to fetch survey responses" }
  }
}

/**
 * AI-generated survey creation using the Gemini API
 */
export async function generateAISurvey(
  topics: string[],
  category: string,
  questionCount = 5,
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    if (!ai) {
      return { success: false, message: "Gemini API key not configured." }
    }

    const prompt = `
      Create a market research survey with the following specifications:
      - Topics: ${topics.join(", ")}
      - Category: ${category}
      - Number of questions: ${questionCount}
      - Question type: multiple choice only
      - Each question should have 4 options.
      - Questions should be relevant to the Kenyan market and consumers.
      - Make questions engaging and easy to understand.
      - Ensure the 'correct_answer_index' points to one of the 4 options (0, 1, 2, or 3).
    `

    const surveySchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "A compelling title for the survey.",
        },
        description: {
          type: Type.STRING,
          description: "A brief description of the survey.",
        },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_text: {
                type: Type.STRING,
                description: "The main text of the question.",
              },
              options: {
                type: Type.ARRAY,
                description: "A list of exactly 4 multiple-choice options (strings).",
                items: { type: Type.STRING },
              },
              correct_answer_index: {
                type: Type.NUMBER,
                description: "The zero-based index (0, 1, 2, or 3) of the correct option.",
              },
            },
            required: ["question_text", "options", "correct_answer_index"],
          },
        },
      },
      required: ["title", "description", "questions"],
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: surveySchema,
        temperature: 0.7,
      },
    })

    if (!response.text) {
      return { success: false, message: "Failed to generate survey content from AI." }
    }

    const responseText = response.text.trim()
    if (!responseText) {
      return { success: false, message: "Failed to generate survey content from AI." }
    }

    const surveyData = JSON.parse(responseText) as any

    const questions = surveyData.questions.map((q: any) => ({
      question_text: q.question_text,
      question_type: "multiple_choice" as const,
      options: q.options.map((opt: string, optIndex: number) => ({
        text: opt,
        is_correct: optIndex === q.correct_answer_index,
      })),
      correct_answer_index: q.correct_answer_index,
      required: true,
    }))

    return {
      success: true,
      data: {
        title: surveyData.title,
        description: surveyData.description,
        questions: questions,
        category: category,
        topics: topics,
      },
    }
  } catch (error: any) {
    console.error("Error generating AI survey:", error)
    return {
      success: false,
      message: error.message || "Failed to generate survey using AI.",
    }
  }
}

/**
 * Create a new survey (Admin only) - UPDATED with automatic assignment and all required fields
 */
export async function createSurvey(surveyData: {
  title: string
  description: string
  category: string
  topics: string[]
  questions: SurveyQuestion[]
  scheduled_for: Date
}): Promise<{ success: boolean; message: string; surveyId?: string }> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    const scheduledDate = new Date(surveyData.scheduled_for)
    
    // Validate Tuesday at 21:00 EAT
    const eatString = scheduledDate.toLocaleString('en-US', { 
      timeZone: 'Africa/Nairobi',
      hour12: false 
    })
    const eatDate = new Date(eatString)
    
    if (eatDate.getDay() !== 2) {
      return { success: false, message: "Surveys must be scheduled for Tuesday." }
    }

    if (eatDate.getHours() !== 21 || eatDate.getMinutes() !== 0) {
      return { success: false, message: "Surveys must be scheduled for 21:00 hrs EAT." }
    }

    // Calculate expiration (2 hours after activation for Tuesday schedule)
    const expiresAt = new Date(scheduledDate)
    expiresAt.setHours(expiresAt.getHours() + 2)

    // Create survey with ALL required fields
    const survey = new Survey({
      // Basic info
      title: surveyData.title,
      description: surveyData.description,
      category: surveyData.category,
      topics: surveyData.topics,
      
      // Questions
      questions: surveyData.questions,
      
      // Payout and timing
      payout_cents: 5000, // KSH 50
      duration_minutes: 5,
      
      // Selection criteria
      target_percentage: 15,
      priority_new_users: true,
      priority_top_referrers: true,
      
      // Scheduling
      status: "scheduled",
      scheduled_for: scheduledDate,
      expires_at: expiresAt,
      
      // Manual override
      is_manually_enabled: false,
      
      // Stats (initialize to 0)
      max_responses: 1000,
      current_responses: 0,
      successful_responses: 0,
      failed_responses: 0,
      completion_rate: 0,
      average_score: 0,
      average_completion_time: 0,
      
      // Additional fields
      created_by: adminUser._id,
      ai_generated: true,
      difficulty: "medium",
      estimated_completion_rate: 0,
      quality_score: 0,
      tags: [],
    })

    await survey.save()

    // AUTOMATICALLY ASSIGN USERS TO THE NEW SURVEY
    const assignedCount = await assignUsersToSurvey(survey._id, 15);
    
    console.log(`[SURVEY CREATION] Created survey "${survey.title}" and assigned ${assignedCount} users`);

    revalidatePath("/admin/surveys")
    return {
      success: true,
      message: `Survey created successfully and assigned to ${assignedCount} users. Scheduled for next Tuesday.`,
      surveyId: survey._id.toString(),
    }
  } catch (error: any) {
    console.error("Error creating survey:", error)
    return {
      success: false,
      message: error.message || "Failed to create survey.",
    }
  }
}

/**
 * Toggle survey manual availability (Admin only) - UPDATED with correct enum value
 */
export async function toggleSurveyAvailability(surveyId: string): Promise<{
  success: boolean
  message: string
  isEnabled?: boolean
}> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(surveyId)) {
      return { success: false, message: "Invalid survey ID." }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    const survey = await Survey.findById(surveyId)
    if (!survey) {
      return { success: false, message: "Survey not found." }
    }

    const newStatus = !survey.is_manually_enabled

    // When enabling manually, set expiration to 24 hours from now and ensure status is active
    const updates: any = {
      is_manually_enabled: newStatus,
    }

    if (newStatus) {
      updates.status = 'active'
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)
      updates.expires_at = expiresAt
      
      // If this is the first time enabling, ensure users are assigned
      const existingAssignments = await SurveyAssignment.countDocuments({ survey_id: survey._id });
      if (existingAssignments === 0) {
        await assignUsersToSurvey(survey._id, 15); // This now uses "random" as the reason
      }
    } else {
      // When disabling, revert to scheduled status if it was originally scheduled
      const now = new Date();
      if (survey.scheduled_for && new Date(survey.scheduled_for) > now) {
        updates.status = 'scheduled'
        updates.expires_at = null;
      } else {
        // If the scheduled time has passed, mark as completed
        updates.status = 'completed'
        updates.expires_at = null;
      }
    }

    await Survey.updateOne({ _id: surveyId }, updates)

    revalidatePath("/admin/surveys")
    revalidatePath("/dashboard/surveys")
    return {
      success: true,
      message: `Survey ${newStatus ? 'enabled' : 'disabled'} successfully.`,
      isEnabled: newStatus,
    }
  } catch (error: any) {
    console.error("Error toggling survey availability:", error)
    return {
      success: false,
      message: error.message || "Failed to toggle survey availability.",
    }
  }
}

/**
 * Revoke a survey response (Admin only)
 */
export async function revokeSurveyResponse(
  responseId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(responseId)) {
      return { success: false, message: "Invalid response ID." }
    }

    await connectToDatabase()
    const adminUser = await findProfileByEmail(session.user.email)

    if (!adminUser?.role || adminUser.role !== "admin") {
      return { success: false, message: "Admin access required" }
    }

    const responseObjectId = new Types.ObjectId(responseId)
    const sessionMongo = await (SurveyResponse.startSession() as Promise<any>)

    return await sessionMongo.withTransaction(async () => {
      const response = await SurveyResponse.findOne({
        _id: responseObjectId,
      }).populate("survey_id").session(sessionMongo)

      if (!response) {
        throw new Error("Survey response not found.")
      }

      if (response.revoked) {
        throw new Error("This response has already been revoked.")
      }

      // If payout was credited, reverse it
      if (response.payout_credited) {
        const survey = response.survey_id as any
        
        await Profile.updateOne(
          { _id: response.user_id },
          {
            $inc: {
              balance_cents: -survey.payout_cents,
              total_earnings_cents: -survey.payout_cents,
            },
          },
          { session: sessionMongo }
        )

        // Create reversal transaction
        const transaction = new Transaction({
          user_id: response.user_id,
          amount_cents: -survey.payout_cents,
          type: "SURVEY_REVOKE",
          description: `Survey payment revoked: ${survey.title}`,
          status: "completed",
          metadata: {
            survey_id: survey._id.toString(),
            survey_response_id: responseObjectId.toString(),
            revoke_reason: reason,
          },
        })
        await transaction.save({ session: sessionMongo })
      }

      // Mark response as revoked
      await SurveyResponse.updateOne(
        { _id: responseObjectId },
        {
          revoked: true,
          revoked_at: new Date(),
          revoked_by: adminUser._id,
          revoke_reason: reason,
          payout_credited: false,
        },
        { session: sessionMongo }
      )

      revalidatePath("/admin/surveys")
      return {
        success: true,
        message: "Survey response revoked successfully.",
      }
    })
  } catch (error: any) {
    console.error("Error revoking survey response:", error)
    return {
      success: false,
      message: error.message || "Failed to revoke survey response.",
    }
  }
}

/**
 * Get details for a specific survey and the user's response status.
 */
export async function getSurveyDetails(surveyId: string): Promise<{
  success: boolean
  data?: AdminSurvey & { response_status?: string; response_id?: string }
  message?: string
}> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(surveyId)) {
      return { success: false, message: "Invalid survey ID." }
    }

    await connectToDatabase()
    const user = await findProfileByEmail(session.user.email)

    if (!user) {
      return { success: false, message: "User profile not found." }
    }

    const userId = user._id
    const surveyObjectId = new Types.ObjectId(surveyId)

    // Check if user is assigned to this survey
    const assignment = await findSurveyAssignment(surveyObjectId, userId)

    if (!assignment) {
      return { success: false, message: "You are not assigned to this survey." }
    }

    const surveyDoc = await findSurveyById(surveyObjectId)

    if (!surveyDoc) {
      return { success: false, message: "Survey not found." }
    }

    const existingResponseQuery = SurveyResponse.findOne({
      survey_id: surveyObjectId,
      user_id: userId,
    }) as Query<ISurveyResponseLean | null, any>
    const existingResponse = await executeLeanQuery<ISurveyResponseLean>(existingResponseQuery)

    const serializedSurvey: AdminSurvey = serializeDocument(surveyDoc) as AdminSurvey
    const result: AdminSurvey & { response_status?: string; response_id?: string } = serializedSurvey

    if (existingResponse) {
      result.response_status = existingResponse.status
      result.response_id = existingResponse._id?.toString()
    } else {
      result.response_status = "not_started"
    }

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error("Error fetching survey details:", error)
    return {
      success: false,
      message: error.message || "Failed to load survey details.",
    }
  }
}

/**
 * Get available surveys for the current user
 */
export async function getAvailableSurveys(): Promise<{
  success: boolean
  data?: AdminSurvey[]
  message?: string
}> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    await connectToDatabase()
    const user = await findProfileByEmail(session.user.email)

    if (!user) {
      return { success: false, message: "User profile not found." }
    }

    const userId = user._id
    const now = new Date()

    // Check if surveys are enabled (either manually or by schedule)
    const surveysEnabled = await areSurveysEnabled()
    
    if (!surveysEnabled) {
      return {
        success: true,
        data: [],
        message: "Surveys are currently not available. Check back on Tuesday at 9:00 PM EAT or when admin enables them.",
      }
    }

    // Build query for available surveys
    const surveyQuery: any = {
      status: "active",
      expires_at: { $gt: now },
      $or: [
        { is_manually_enabled: true },
        { 
          scheduled_for: { $lte: now },
          is_manually_enabled: { $ne: false } // Include surveys that are not explicitly disabled
        }
      ]
    }

    const assignedSurveys = (await (SurveyAssignment.aggregate([
      {
        $match: { user_id: userId },
      },
      {
        $lookup: {
          from: "surveys",
          let: { surveyId: "$survey_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$surveyId"] },
                ...surveyQuery,
              },
            },
          ],
          as: "survey",
        },
      },
      {
        $unwind: "$survey",
      },
      {
        $lookup: {
          from: "surveyresponses",
          let: { surveyId: "$survey_id", userId: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$survey_id", "$$surveyId"] }, 
                    { $eq: ["$user_id", "$$userId"] }
                  ],
                },
              },
            },
          ],
          as: "responses",
        },
      },
      {
        $match: {
          "responses.0": { $exists: false }, // No existing responses
        },
      },
      {
        $project: {
          _id: 0,
          id: "$survey._id",
          title: "$survey.title",
          description: "$survey.description",
          category: "$survey.category",
          topics: "$survey.topics",
          payout_cents: "$survey.payout_cents",
          duration_minutes: "$survey.duration_minutes",
          questions: "$survey.questions",
          status: "$survey.status",
          expires_at: "$survey.expires_at",
          current_responses: "$survey.current_responses",
          max_responses: "$survey.max_responses",
          is_manually_enabled: "$survey.is_manually_enabled",
          scheduled_for: "$survey.scheduled_for",
          assigned_reason: "$assigned_reason",
        },
      },
    ]) as Query<any, any>).exec()) as any[]

    const serializedSurveys = assignedSurveys.map(serializeDocument)

    return {
      success: true,
      data: serializedSurveys,
    }
  } catch (error: any) {
    console.error("Error fetching surveys:", error)
    return {
      success: false,
      message: error.message || "Failed to load surveys. Please try again.",
    }
  }
}

/**
 * Start a survey - creates response record and starts timer
 */
export async function startSurvey(surveyId: string): Promise<{
  success: boolean
  message: string
  survey?: AdminSurvey
  responseId?: string
}> {
  try {
    const session = (await getServerSession(authOptions)) as Session | null

    if (!session?.user?.email) {
      return { success: false, message: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(surveyId)) {
      return { success: false, message: "Invalid survey ID." }
    }

    await connectToDatabase()
    const user = await findProfileByEmail(session.user.email)

    if (!user) {
      return { success: false, message: "User profile not found." }
    }

    const userId = user._id
    const surveyObjectId = new Types.ObjectId(surveyId)

    const survey = await findSurveyById(surveyObjectId)

    if (!survey || survey.status !== "active" || new Date(survey.expires_at) <= new Date()) {
      return { success: false, message: "Survey not available or expired." }
    }

    const assignment = await findSurveyAssignment(surveyObjectId, userId)

    if (!assignment) {
      return { success: false, message: "You are not assigned to this survey." }
    }

    const existingResponseQuery = SurveyResponse.findOne({
      survey_id: surveyObjectId,
      user_id: userId,
    }) as Query<ISurveyResponseLean | null, any>
    const existingResponse = await executeLeanQuery<ISurveyResponseLean>(existingResponseQuery)

    if (existingResponse) {
      if (existingResponse.status === "completed") {
        return { success: false, message: "You have already completed this survey." }
      }

      if (existingResponse.status === "in_progress") {
        const timeElapsed = (Date.now() - new Date(existingResponse.started_at).getTime()) / 1000
        if (timeElapsed > survey.duration_minutes * 60) {
          await (SurveyResponse.updateOne(
            { _id: existingResponse._id },
            {
              status: "timeout",
              completed_at: new Date(),
              time_taken_seconds: Math.floor(timeElapsed),
            },
          ) as Query<any, any>)
          return { success: false, message: "Survey time expired. Please start a new survey." }
        }

        const surveyData: AdminSurvey = serializeDocument(survey) as AdminSurvey

        return {
          success: true,
          message: "Resuming existing survey.",
          survey: surveyData,
          responseId: existingResponse._id.toString(),
        }
      }
    }

    const surveyResponse = new SurveyResponse({
      survey_id: surveyObjectId,
      user_id: userId,
      started_at: new Date(),
      status: "in_progress",
    })

    await surveyResponse.save()

    const surveyData: AdminSurvey = serializeDocument(survey) as AdminSurvey

    return {
      success: true,
      message: "Survey started. Timer is running.",
      survey: surveyData,
      responseId: surveyResponse._id.toString(),
    }
  } catch (error: any) {
    console.error("Error starting survey:", error)
    return {
      success: false,
      message: error.message || "Failed to start survey.",
    }
  }
}
