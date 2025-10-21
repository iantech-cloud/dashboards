// app/actions/surveys.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Survey, SurveyResponse, SurveyAssignment, Profile, Transaction, Earning, Referral } from '@/app/lib/models';
import { Types } from 'mongoose';

// Import the Google Gen AI library
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
}) : null;

// --- Types (Keep these) ---
export interface SurveyQuestion {
  question_text: string;
  question_type: 'multiple_choice';
  options: Array<{
    text: string;
    is_correct: boolean;
  }>;
  correct_answer_index: number;
  required: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  topics: string[];
  payout_cents: number;
  duration_minutes: number;
  questions: SurveyQuestion[];
  status: string;
  scheduled_for?: Date;
  expires_at?: Date;
  current_responses: number;
  max_responses: number;
}

export interface SurveyCompletionResult {
  success: boolean;
  message: string;
  payout_cents?: number;
  balance_cents?: number;
  score?: number;
  all_correct?: boolean;
}

// Helper function to serialize MongoDB documents
function serializeDocument(doc: any) {
  if (!doc) return null;

  const serialized = JSON.parse(JSON.stringify(doc));

  if (serialized._id && typeof serialized._id !== 'string') {
    serialized._id = serialized._id.toString();
  }
  if (serialized.survey_id && typeof serialized.survey_id !== 'string') {
    serialized.survey_id = serialized.survey_id.toString();
  }
  if (serialized.user_id && typeof serialized.user_id !== 'string') {
    serialized.user_id = serialized.user_id.toString();
  }

  // Handle created_by population for admin surveys
  if (serialized.created_by && serialized.created_by._id) {
    serialized.created_by.id = serialized.created_by._id.toString();
    delete serialized.created_by._id;
  }

  return serialized;
}

/**
 * AI-generated survey creation using the Gemini API
 */
export async function generateAISurvey(
  topics: string[],
  category: string,
  questionCount: number = 5
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    if (!ai) {
      return { success: false, message: 'Gemini API key not configured.' };
    }

    const prompt = `
      Create a market research survey with the following specifications:
      - Topics: ${topics.join(', ')}
      - Category: ${category}
      - Number of questions: ${questionCount}
      - Question type: multiple choice only
      - Each question should have 4 options.
      - Questions should be relevant to the Kenyan market and consumers.
      - Make questions engaging and easy to understand.
      - Ensure the 'correct_answer_index' points to one of the 4 options (0, 1, 2, or 3).
    `;

    // Define the expected JSON schema for Gemini's response
    const surveySchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "A compelling title for the survey."
        },
        description: {
          type: Type.STRING,
          description: "A brief description of the survey."
        },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_text: {
                type: Type.STRING,
                description: "The main text of the question."
              },
              options: {
                type: Type.ARRAY,
                description: "A list of exactly 4 multiple-choice options (strings).",
                items: { type: Type.STRING }
              },
              correct_answer_index: {
                type: Type.NUMBER,
                description: "The zero-based index (0, 1, 2, or 3) of the correct option."
              }
            },
            required: ["question_text", "options", "correct_answer_index"]
          }
        }
      },
      required: ["title", "description", "questions"]
    };

    // Use the Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Great for fast, structured generation
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: surveySchema,
        temperature: 0.7,
      },
    });

    const responseText = response.text.trim();
    if (!responseText) {
      return { success: false, message: 'Failed to generate survey content from AI.' };
    }

    // Parse the JSON response
    const surveyData = JSON.parse(responseText);

    // Transform options to the required format (with is_correct flag)
    const questions = surveyData.questions.map((q: any, index: number) => ({
      question_text: q.question_text,
      question_type: 'multiple_choice' as const,
      options: q.options.map((opt: string, optIndex: number) => ({
        text: opt,
        is_correct: optIndex === q.correct_answer_index // Map correct_answer_index to is_correct
      })),
      correct_answer_index: q.correct_answer_index,
      required: true
    }));

    return {
      success: true,
      data: {
        title: surveyData.title,
        description: surveyData.description,
        questions: questions,
        category: category,
        topics: topics
      }
    };

  } catch (error: any) {
    console.error('Error generating AI survey:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate survey using AI.'
    };
  }
}
// --- Rest of the file (Keep these functions as they were) ---

/**
 * Create a new survey (Admin only)
 */
export async function createSurvey(surveyData: {
  title: string;
  description: string;
  category: string;
  topics: string[];
  questions: SurveyQuestion[];
  scheduled_for: Date;
}): Promise<{ success: boolean; message: string; surveyId?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    // Ensure scheduled time is Tuesday 2100 hrs EAT
    const scheduledDate = new Date(surveyData.scheduled_for);
    if (scheduledDate.getDay() !== 2) { // Tuesday is day 2
      return { success: false, message: 'Surveys must be scheduled for Tuesday.' };
    }

    if (scheduledDate.getHours() !== 21 || scheduledDate.getMinutes() !== 0) {
      return { success: false, message: 'Surveys must be scheduled for 2100 hrs EAT.' };
    }

    // Calculate expiration (5 minutes after activation)
    const expiresAt = new Date(scheduledDate);
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const survey = new Survey({
      ...surveyData,
      payout_cents: 5000, // KSH 50
      duration_minutes: 5,
      status: 'scheduled',
      scheduled_for: scheduledDate,
      expires_at: expiresAt,
      created_by: adminUser._id,
      ai_generated: true,
    });

    await survey.save();

    revalidatePath('/admin/surveys');
    return { 
      success: true, 
      message: 'Survey created successfully and scheduled for next Tuesday.',
      surveyId: survey._id.toString()
    };

  } catch (error: any) {
    console.error('Error creating survey:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to create survey.' 
    };
  }
}

/**
 * Get details for a specific survey and the user's response status.
 */
export async function getSurveyDetails(surveyId: string): Promise<{
  success: boolean;
  data?: Survey & { response_status?: string; response_id?: string; };
  message?: string;
}> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!Types.ObjectId.isValid(surveyId)) {
      return { success: false, message: 'Invalid survey ID.' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });

    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    const userId = user._id.toString();
    const surveyObjectId = new Types.ObjectId(surveyId);

    // 1. Check if user is assigned to this survey
    const assignment = await SurveyAssignment.findOne({
      survey_id: surveyObjectId,
      user_id: userId
    });

    if (!assignment) {
      return { success: false, message: 'You are not assigned to this survey.' };
    }

    // 2. Fetch the survey
    const surveyDoc = await Survey.findOne({ _id: surveyObjectId }).lean();

    if (!surveyDoc) {
      return { success: false, message: 'Survey not found.' };
    }

    // 3. Check for an existing response
    const existingResponse = await SurveyResponse.findOne({
      survey_id: surveyObjectId,
      user_id: userId
    }).lean();

    const serializedSurvey: Survey = serializeDocument(surveyDoc);
    const result: Survey & { response_status?: string; response_id?: string; } = serializedSurvey;
    
    // Attach response status and ID if it exists
    if (existingResponse) {
      result.response_status = existingResponse.status;
      result.response_id = existingResponse._id.toString();
    } else {
        result.response_status = 'not_started';
    }

    return {
      success: true,
      data: result
    };

  } catch (error: any) {
    console.error('Error fetching survey details:', error);
    return {
      success: false,
      message: error.message || 'Failed to load survey details.'
    };
  }
}

/**
 * Get available surveys for the current user
 */
export async function getAvailableSurveys(): Promise<{ 
  success: boolean; 
  data?: Survey[]; 
  message?: string 
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    const userId = user._id.toString();

    // Find surveys assigned to this user that are active and not completed
    const assignedSurveys = await SurveyAssignment.aggregate([
      {
        $match: { user_id: userId }
      },
      {
        $lookup: {
          from: 'surveys',
          let: { surveyId: '$survey_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$surveyId'] },
                status: 'active',
                expires_at: { $gt: new Date() }
              }
            }
          ],
          as: 'survey'
        }
      },
      {
        $unwind: '$survey'
      },
      {
        $lookup: {
          from: 'surveyresponses',
          let: { surveyId: '$survey_id', userId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$survey_id', '$$surveyId'] },
                    { $eq: ['$user_id', '$$userId'] }
                  ]
                }
              }
            }
          ],
          as: 'responses'
        }
      },
      {
        $match: {
          'responses.0': { $exists: false } // No existing responses
        }
      },
      {
        $project: {
          _id: 0,
          id: '$survey._id',
          title: '$survey.title',
          description: '$survey.description',
          category: '$survey.category',
          topics: '$survey.topics',
          payout_cents: '$survey.payout_cents',
          duration_minutes: '$survey.duration_minutes',
          questions: '$survey.questions',
          status: '$survey.status',
          expires_at: '$survey.expires_at',
          current_responses: '$survey.current_responses',
          max_responses: '$survey.max_responses',
          assigned_reason: '$assigned_reason'
        }
      }
    ]);

    const serializedSurveys = assignedSurveys.map(serializeDocument);

    return { 
      success: true, 
      data: serializedSurveys 
    };
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to load surveys. Please try again.' 
    };
  }
}

/**
 * Start a survey - creates response record and starts timer
 */
export async function startSurvey(surveyId: string): Promise<{ 
  success: boolean; 
  message: string;
  survey?: Survey;
  responseId?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!Types.ObjectId.isValid(surveyId)) {
      return { success: false, message: 'Invalid survey ID.' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    const userId = user._id.toString();
    const surveyObjectId = new Types.ObjectId(surveyId);

    // Check if survey exists and is active
    const survey = await Survey.findOne({
      _id: surveyObjectId,
      status: 'active',
      expires_at: { $gt: new Date() }
    });

    if (!survey) {
      return { success: false, message: 'Survey not available or expired.' };
    }

    // Check if user is assigned to this survey
    const assignment = await SurveyAssignment.findOne({
      survey_id: surveyObjectId,
      user_id: userId
    });

    if (!assignment) {
      return { success: false, message: 'You are not assigned to this survey.' };
    }

    // Check if user already started or completed this survey
    const existingResponse = await SurveyResponse.findOne({
      survey_id: surveyObjectId,
      user_id: userId
    });

    if (existingResponse) {
      if (existingResponse.status === 'completed') {
        return { success: false, message: 'You have already completed this survey.' };
      }
      
      // If in progress but expired, mark as timeout
      if (existingResponse.status === 'in_progress') {
        const timeElapsed = (Date.now() - existingResponse.started_at.getTime()) / 1000;
        if (timeElapsed > (survey.duration_minutes * 60)) {
          await SurveyResponse.updateOne(
            { _id: existingResponse._id },
            { 
              status: 'timeout',
              completed_at: new Date(),
              time_taken_seconds: Math.floor(timeElapsed)
            }
          );
          return { success: false, message: 'Survey time expired. Please start a new survey.' };
        }
        
        // Return existing response if still valid
        const surveyData: Survey = serializeDocument(survey);
        
        return { 
          success: true, 
          message: 'Resuming existing survey.',
          survey: surveyData,
          responseId: existingResponse._id.toString()
        };
      }
    }

    // Create new survey response
    const surveyResponse = new SurveyResponse({
      survey_id: surveyObjectId,
      user_id: userId,
      started_at: new Date(),
      status: 'in_progress'
    });

    await surveyResponse.save();

    const surveyData: Survey = serializeDocument(survey);

    return { 
      success: true, 
      message: 'Survey started. Timer is running.',
      survey: surveyData,
      responseId: surveyResponse._id.toString()
    };

  } catch (error: any) {
    console.error('Error starting survey:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to start survey.' 
    };
  }
}

/**
 * Submit survey answers with validation and timing
 */
export async function submitSurveyAnswers(
  responseId: string,
  answers: Array<{
    question_index: number;
    selected_option_index: number;
  }>
): Promise<SurveyCompletionResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!Types.ObjectId.isValid(responseId)) {
      return { success: false, message: 'Invalid response ID.' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    const userId = user._id.toString();
    const responseObjectId = new Types.ObjectId(responseId);

    // Start transaction
    const sessionMongo = await SurveyResponse.startSession();
    
    return await sessionMongo.withTransaction(async () => {
      // Get survey response with survey details
      const surveyResponse = await SurveyResponse.findOne({
        _id: responseObjectId,
        user_id: userId,
        status: 'in_progress'
      }).populate('survey_id').session(sessionMongo);

      if (!surveyResponse) {
        throw new Error('Survey response not found or already completed.');
      }

      const survey = surveyResponse.survey_id as any;

      // Check if survey is still active and within time
      const currentTime = new Date();
      const timeElapsed = (currentTime.getTime() - surveyResponse.started_at.getTime()) / 1000;
      const timeLimit = survey.duration_minutes * 60;

      if (timeElapsed > timeLimit) {
        await SurveyResponse.updateOne(
          { _id: responseObjectId },
          { 
            status: 'timeout',
            completed_at: currentTime,
            time_taken_seconds: Math.floor(timeElapsed)
          },
          { session: sessionMongo }
        );
        throw new Error('Survey time expired. Payment not credited.');
      }

      // Validate answers
      let allCorrect = true;
      let correctAnswers = 0;
      const validatedAnswers = [];

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        const question = survey.questions[answer.question_index];
        
        if (!question) {
          throw new Error(`Invalid question index: ${answer.question_index}`);
        }

        const isCorrect = answer.selected_option_index === question.correct_answer_index;
        if (!isCorrect) {
          allCorrect = false;
          // Close survey immediately if wrong answer
          await SurveyResponse.updateOne(
            { _id: responseObjectId },
            { 
              status: 'wrong_answer',
              completed_at: currentTime,
              time_taken_seconds: Math.floor(timeElapsed),
              answers: validatedAnswers
            },
            { session: sessionMongo }
          );
          throw new Error('Incorrect answer. Survey closed. Payment not credited.');
        }

        correctAnswers++;
        validatedAnswers.push({
          question_index: answer.question_index,
          selected_option_index: answer.selected_option_index,
          is_correct: isCorrect,
          answered_at: currentTime
        });
      }

      // Calculate score
      const score = (correctAnswers / survey.questions.length) * 100;

      // Update survey response
      await SurveyResponse.updateOne(
        { _id: responseObjectId },
        {
          answers: validatedAnswers,
          completed_at: currentTime,
          time_taken_seconds: Math.floor(timeElapsed),
          all_correct: allCorrect,
          score: score,
          status: 'completed'
        },
        { session: sessionMongo }
      );

      // Credit payment only if all answers correct and within time
      if (allCorrect && timeElapsed <= timeLimit) {
        // Update user balance
        await Profile.updateOne(
          { _id: userId },
          { 
            $inc: { 
              balance_cents: survey.payout_cents,
              total_earnings_cents: survey.payout_cents
            } 
          },
          { session: sessionMongo }
        );

        // Create transaction record
        const transaction = new Transaction({
          user_id: userId,
          amount_cents: survey.payout_cents,
          type: 'SURVEY',
          description: `Survey completion: ${survey.title}`,
          status: 'completed',
          metadata: {
            survey_id: survey._id.toString(),
            survey_response_id: responseObjectId.toString(),
            score: score,
            time_taken: Math.floor(timeElapsed)
          }
        });

        await transaction.save({ session: sessionMongo });

        // Create earning record
        const earning = new Earning({
          user_id: userId,
          amount_cents: survey.payout_cents,
          type: 'SURVEY',
          description: `Completed survey: ${survey.title} (Score: ${score}%)`
        });

        await earning.save({ session: sessionMongo });

        // Update survey response with payout credited
        await SurveyResponse.updateOne(
          { _id: responseObjectId },
          { payout_credited: true },
          { session: sessionMongo }
        );

        // Update survey stats
        await Survey.updateOne(
          { _id: survey._id },
          { 
            $inc: { 
              current_responses: 1,
              successful_responses: 1
            } 
          },
          { session: sessionMongo }
        );
      } else {
        // Update survey stats for failed attempt
        await Survey.updateOne(
          { _id: survey._id },
          { 
            $inc: { 
              current_responses: 1,
              failed_responses: 1
            } 
          },
          { session: sessionMongo }
        );
      }

      // Get updated balance
      const updatedProfile = await Profile.findById(userId).session(sessionMongo);

      // Revalidate paths
      revalidatePath('/dashboard/surveys');
      revalidatePath('/dashboard');

      return {
        success: true,
        message: allCorrect 
          ? `Survey completed successfully! KES ${(survey.payout_cents / 100).toFixed(2)} has been added to your balance.`
          : 'Survey completed but payment not credited due to incorrect answers.',
        payout_cents: allCorrect ? survey.payout_cents : 0,
        balance_cents: updatedProfile?.balance_cents || 0,
        score: score,
        all_correct: allCorrect
      };
    });
  } catch (error: any) {
    console.error('Error submitting survey:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to submit survey answers.' 
    };
  }
}

/**
 * Get user's survey history
 */
export async function getSurveyHistory(): Promise<{ 
  success: boolean; 
  data?: any[]; 
  message?: string 
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    const surveyHistory = await SurveyResponse.aggregate([
      {
        $match: { user_id: user._id.toString() }
      },
      {
        $lookup: {
          from: 'surveys',
          localField: 'survey_id',
          foreignField: '_id',
          as: 'survey'
        }
      },
      {
        $unwind: '$survey'
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          survey_title: '$survey.title',
          survey_category: '$survey.category',
          completed_at: 1,
          time_taken_seconds: 1,
          score: 1,
          all_correct: 1,
          status: 1,
          payout_credited: 1,
          payout_amount_cents: '$survey.payout_cents' // Use survey's payout
        }
      },
      {
        $sort: { completed_at: -1 }
      }
    ]);

    const serializedHistory = surveyHistory.map(serializeDocument);

    return { 
      success: true, 
      data: serializedHistory 
    };
  } catch (error: any) {
    console.error('Error fetching survey history:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to load survey history.' 
    };
  }
}

/**
 * Get all surveys for admin
 */
export async function getAdminSurveys(page: number = 1, limit: number = 10, search?: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const [surveys, total] = await Promise.all([
      Survey.find(query)
        .populate('created_by', 'username email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Survey.countDocuments(query)
    ]);

    const serializedSurveys = surveys.map(serializeDocument);

    return {
      success: true,
      data: serializedSurveys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: 'Surveys fetched successfully'
    };

  } catch (error: any) {
    console.error('Get admin surveys error:', error);
    return { success: false, message: 'Failed to fetch surveys' };
  }
}

// ----------------------------------------------------------------------
// NEW FUNCTION ADDED TO FIX THE EXPORT ERROR
// ----------------------------------------------------------------------

/**
 * Get all survey responses for admin with pagination and search.
 */
export async function getAdminSurveyResponses(
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const skip = (page - 1) * limit;
    const query: any = {};

    // A more complex query is needed to search across populated fields
    const pipeline: any[] = [
      // Populate survey and user first
      {
        $lookup: {
          from: 'surveys',
          localField: 'survey_id',
          foreignField: '_id',
          as: 'survey'
        }
      },
      {
        $unwind: { path: '$survey', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      }
    ];

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'survey.title': { $regex: searchRegex } },
            { 'user.username': { $regex: searchRegex } },
            { 'user.email': { $regex: searchRegex } },
            { status: { $regex: searchRegex } },
          ]
        }
      });
    }
    
    // Count total documents for pagination
    const totalCount = await SurveyResponse.aggregate([...pipeline, { $count: 'total' }]);
    const total = totalCount.length > 0 ? totalCount[0].total : 0;


    // Final projection and pagination
    pipeline.push(
      { $sort: { completed_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          id: '$_id',
          survey_title: '$survey.title',
          user_email: '$user.email',
          user_username: '$user.username',
          completed_at: 1,
          time_taken_seconds: 1,
          score: 1,
          all_correct: 1,
          status: 1,
          payout_credited: 1,
          payout_amount_cents: '$survey.payout_cents',
        }
      }
    );

    const responses = await SurveyResponse.aggregate(pipeline);
    
    const serializedResponses = responses.map(serializeDocument);

    return {
      success: true,
      data: serializedResponses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: 'Survey responses fetched successfully'
    };

  } catch (error: any) {
    console.error('Get admin survey responses error:', error);
    return { success: false, message: error.message || 'Failed to fetch survey responses' };
  }
}
