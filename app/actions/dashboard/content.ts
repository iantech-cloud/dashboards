// app/actions/dashboard/content.ts
'use server';

import { revalidatePath } from 'next/cache';
// [MIGRATION]: Replaced getServerSession and authOptions import
// We now assume the unified 'auth' function is exported from '@/auth'
import { auth } from '@/auth'; 
import { connectToDatabase, UserContent, Profile, AdminAuditLog } from '../../lib/models';
import { Types } from 'mongoose';

// =============================================================================
// TYPE DEFINITIONS - UPDATED TO MATCH MODELS.TS ENUMS
// =============================================================================

// Match the exact enum values from models.ts
export type ContentType = 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type PaymentStatus = 'pending' | 'paid' | 'rejected';

export interface ContentSubmission {
  _id: string;
  title: string;
  content_type: ContentType;
  content_text: string;
  status: ContentStatus;
  payment_status: PaymentStatus;
  payment_amount: number; // This is in KSH for display
  submission_date: string;
  task_category: string;
  admin_feedback?: string;
  revision_notes?: string;
  word_count?: number;
  tags?: string[];
  attachments?: string[];
  user_id: string;
  approved_at?: string;
  approved_by?: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
  };
}

export interface ContentStats {
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequested: number;
  totalEarned: number; // In KSH for display
  averageEarnings: number; // In KSH for display
}

export interface CreateContentData {
  title: string;
  content_type: ContentType;
  content_text: string;
  task_category: string;
  tags: string[];
  word_count: number;
  attachments: File[];
}

export interface UpdateContentData {
  title: string;
  content_type: ContentType;
  content_text: string;
  task_category: string;
  tags: string[];
  word_count: number;
}

// Admin actions interface
export interface AdminUpdateContentData {
  status: ContentStatus;
  payment_status: PaymentStatus;
  payment_amount: number; // In KSH for admin input
  admin_notes?: string;
  revision_notes?: string;
}

// Session type guard
interface SessionWithUser {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

function isValidSession(session: unknown): session is SessionWithUser {
  return (
    session !== null &&
    typeof session === 'object' &&
    'user' in session &&
    session.user !== null &&
    typeof session.user === 'object' &&
    'email' in session.user &&
    typeof session.user.email === 'string' &&
    session.user.email.length > 0
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper to get current user
async function getCurrentUser() {
  try {
    // [MIGRATION]: Replaced await getServerSession(authOptions) with await auth()
    const session = await auth(); 
    
    // FIX: Use type guard to properly check session structure
    if (!isValidSession(session)) {
      throw new Error('User not authenticated');
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ email: session.user.email });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is banned or suspended
    if (user.status === 'banned' || user.status === 'suspended') {
      throw new Error('Your account has been restricted. Please contact support.');
    }

    // Check if user is approved
    if (!user.is_approved || user.approval_status !== 'approved') {
      throw new Error('Your account is pending approval. Please wait for admin approval.');
    }

    // Check if user is active (both is_active AND status should be active)
    const isUserActive = user.is_active && user.status === 'active';

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.username,
      role: user.role,
      is_active: isUserActive,
      approval_status: user.approval_status,
      status: user.status
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('User not authenticated');
  }
}

// Helper to calculate word count from HTML content
function calculateWordCount(htmlContent: string): number {
  if (!htmlContent) return 0;
  
  // Remove HTML tags and trim
  const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

// Get minimum word count requirements based on content type
function getMinimumWordCount(contentType: ContentType): number {
  const minWordCounts = {
    blog_post: 400,
    social_media: 150,
    product_review: 150,
    video: 150,
    other: 150,
  };
  
  return minWordCounts[contentType];
}

// Helper to calculate payment amount (in cents)
function calculatePaymentAmount(wordCount: number, contentType: ContentType): number {
  const baseRate = 0.5; // KES per word
  const baseAmount = Math.floor(wordCount * baseRate);
  
  // Apply content type multipliers
  const typeMultipliers = {
    blog_post: 1.2,
    product_review: 1.1,
    video: 1.3,
    social_media: 0.8,
    other: 1.0,
  };

  const paymentAmount = Math.floor(baseAmount * typeMultipliers[contentType]);
  const minPayment = 50; // Minimum KES 0.50 (50 cents)
  const maxPayment = 5000; // Maximum KES 50.00 (5000 cents)

  return Math.max(minPayment, Math.min(maxPayment, paymentAmount));
}

// Convert cents to KSH for display
function centsToKsh(cents: number): number {
  return cents / 100;
}

// Convert KSH to cents for storage
function kshToCents(amount: number): number {
  return Math.round(amount * 100);
}

// Helper to serialize data
function serializeDocument(doc: any) {
  if (!doc) return null;

  const serialized = JSON.parse(JSON.stringify(doc));

  if (serialized._id && typeof serialized._id !== 'string') {
    serialized._id = serialized._id.toString();
  }
  if (serialized.user && serialized.user._id && typeof serialized.user._id !== 'string') {
    serialized.user._id = serialized.user._id.toString();
  }
  if (serialized.approved_by && serialized.approved_by._id && typeof serialized.approved_by._id !== 'string') {
    serialized.approved_by._id = serialized.approved_by._id.toString();
  }

  return serialized;
}

// Validate content type against enum
function isValidContentType(type: string): type is ContentType {
  return ['blog_post', 'social_media', 'product_review', 'video', 'other'].includes(type);
}

// Safe ObjectId creation - handles both string and ObjectId inputs
function safeObjectId(id: string | Types.ObjectId): Types.ObjectId {
  if (id instanceof Types.ObjectId) {
    return id;
  }
  if (Types.ObjectId.isValid(id)) {
    return new Types.ObjectId(id);
  }
  throw new Error(`Invalid ObjectId: ${id}`);
}

// =============================================================================
// CONTENT STATISTICS - FIXED OBJECTID ERROR
// =============================================================================

export async function getUserContentStats(): Promise<{
  success: boolean;
  data?: ContentStats;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    await connectToDatabase();

    // For inactive users (approved but not activated), return basic stats
    if (!user.is_active) {
      const basicStats: ContentStats = {
        totalSubmissions: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        revisionRequested: 0,
        totalEarned: 0,
        averageEarnings: 0,
      };
      return {
        success: true,
        data: basicStats,
      };
    }

    // FIX: Use string user ID directly in aggregation - MongoDB can handle string ObjectIds
    const stats = await (UserContent as any).aggregate([
      { $match: { user: user.id } }, // Use string ID directly
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          revisionRequested: {
            $sum: { $cond: [{ $eq: ['$status', 'revision_requested'] }, 1, 0] }
          },
          totalEarned: {
            $sum: {
              $cond: [
                { $eq: ['$payment_status', 'paid'] },
                '$payment_amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalSubmissions: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      revisionRequested: 0,
      totalEarned: 0
    };

    // Convert total earned from cents to KSH for display
    const totalEarnedKsh = centsToKsh(result.totalEarned);
    const averageEarnings = result.totalSubmissions > 0 
      ? Math.floor(totalEarnedKsh / result.totalSubmissions * 100) / 100 // Keep 2 decimal places
      : 0;

    const contentStats: ContentStats = {
      totalSubmissions: result.totalSubmissions,
      pending: result.pending,
      approved: result.approved,
      rejected: result.rejected,
      revisionRequested: result.revisionRequested,
      totalEarned: totalEarnedKsh,
      averageEarnings: averageEarnings,
    };

    return {
      success: true,
      data: contentStats,
    };
  } catch (error) {
    console.error('Error fetching content stats:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load content statistics',
    };
  }
}

// =============================================================================
// RECENT SUBMISSIONS
// =============================================================================

export async function getRecentSubmissions(limit: number = 5): Promise<{
  success: boolean;
  data?: ContentSubmission[];
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    await connectToDatabase();

    // For inactive users, return empty array
    if (!user.is_active) {
      return {
        success: true,
        data: [],
      };
    }

    const submissions = await (UserContent as any).find({ user: user.id })
      .populate('user', 'username name email phone_number')
      .populate('approved_by', 'username name email')
      .sort({ submission_date: -1 })
      .limit(limit)
      .lean();

    const serializedSubmissions = submissions.map((sub: any) => serializeDocument(sub));

    const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map((sub: any) => ({
      _id: sub._id,
      title: sub.title,
      content_type: sub.content_type,
      content_text: sub.content,
      status: sub.status,
      payment_status: sub.payment_status,
      payment_amount: centsToKsh(sub.payment_amount), // Convert to KSH for display
      submission_date: sub.submission_date,
      task_category: sub.task_category,
      admin_feedback: sub.admin_notes,
      revision_notes: sub.revision_notes,
      word_count: sub.word_count || calculateWordCount(sub.content),
      tags: sub.tags || [],
      attachments: sub.attachments || [],
      user_id: sub.user._id,
      approved_at: sub.approved_at,
      approved_by: sub.approved_by,
    }));

    return {
      success: true,
      data: formattedSubmissions,
    };
  } catch (error) {
    console.error('Error fetching recent submissions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load recent submissions',
    };
  }
}

// =============================================================================
// GET ALL SUBMISSIONS WITH FILTERS - FIXED OBJECTID ERROR
// =============================================================================

export async function getUserContentSubmissions(filters?: {
  status?: string;
  content_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: ContentSubmission[];
  message?: string;
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
}> {
  try {
    const user = await getCurrentUser();
    
    const {
      status = 'all',
      content_type = 'all',
      search = '',
      page = 1,
      limit = 10,
    } = filters || {};

    await connectToDatabase();

    // For inactive users, return empty results
    if (!user.is_active) {
      return {
        success: true,
        data: [],
        totalPages: 0,
        currentPage: page,
        totalCount: 0,
      };
    }

    // Build query - FIX: Use string user ID directly since it's already a valid ObjectId string
    const query: any = { user: user.id };

    if (status !== 'all' && status !== '') {
      query.status = status;
    }

    if (content_type !== 'all' && content_type !== '') {
      query.content_type = content_type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { task_category: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await (UserContent as any).countDocuments(query);

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated results
    const submissions = await (UserContent as any).find(query)
      .populate('user', 'username name email phone_number')
      .populate('approved_by', 'username name email')
      .sort({ submission_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serializedSubmissions = submissions.map((sub: any) => serializeDocument(sub));

    const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map((sub: any) => ({
      _id: sub._id,
      title: sub.title,
      content_type: sub.content_type,
      content_text: sub.content,
      status: sub.status,
      payment_status: sub.payment_status,
      payment_amount: centsToKsh(sub.payment_amount), // Convert to KSH for display
      submission_date: sub.submission_date,
      task_category: sub.task_category,
      admin_feedback: sub.admin_notes,
      revision_notes: sub.revision_notes,
      word_count: sub.word_count || calculateWordCount(sub.content),
      tags: sub.tags || [],
      attachments: sub.attachments || [],
      user_id: sub.user._id,
      approved_at: sub.approved_at,
      approved_by: sub.approved_by,
    }));

    return {
      success: true,
      data: formattedSubmissions,
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    console.error('Error fetching user content submissions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load content submissions',
    };
  }
}

// =============================================================================
// GET SINGLE SUBMISSION
// =============================================================================

export async function getContentSubmission(id: string): Promise<{
  success: boolean;
  data?: ContentSubmission;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    await connectToDatabase();

    if (!Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: 'Invalid content ID',
      };
    }

    // For inactive users, return not found
    if (!user.is_active) {
      return {
        success: false,
        message: 'Content submission not found',
      };
    }

    const submission = await (UserContent as any).findOne({
      _id: safeObjectId(id),
      user: user.id, // Use string ID directly
    })
    .populate('user', 'username name email phone_number')
    .populate('approved_by', 'username name email')
    .lean();

    if (!submission) {
      return {
        success: false,
        message: 'Content submission not found',
      };
    }

    const serializedSubmission = serializeDocument(submission);

    const formattedSubmission: ContentSubmission = {
      _id: serializedSubmission._id,
      title: serializedSubmission.title,
      content_type: serializedSubmission.content_type,
      content_text: serializedSubmission.content,
      status: serializedSubmission.status,
      payment_status: serializedSubmission.payment_status,
      payment_amount: centsToKsh(serializedSubmission.payment_amount), // Convert to KSH for display
      submission_date: serializedSubmission.submission_date,
      task_category: serializedSubmission.task_category,
      admin_feedback: serializedSubmission.admin_notes,
      revision_notes: serializedSubmission.revision_notes,
      word_count: serializedSubmission.word_count || calculateWordCount(serializedSubmission.content),
      tags: serializedSubmission.tags || [],
      attachments: serializedSubmission.attachments || [],
      user_id: serializedSubmission.user._id,
      approved_at: serializedSubmission.approved_at,
      approved_by: serializedSubmission.approved_by,
    };

    return {
      success: true,
      data: formattedSubmission,
    };
  } catch (error) {
    console.error('Error fetching content submission:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load submission',
    };
  }
}

// =============================================================================
// GET CONTENT SUBMISSION BY ID (NEW FUNCTION)
// =============================================================================

/**
 * Get a content submission by ID - Server-side implementation
 * This is a direct database query, not a fetch to an API endpoint
 */
export async function getContentSubmissionById(id: string): Promise<{
  success: boolean;
  data?: ContentSubmission;
  message?: string;
}> {
  try {
    const user = await getCurrentUser();
    await connectToDatabase();

    if (!Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: 'Invalid content ID',
      };
    }

    // For inactive users, return not found
    if (!user.is_active) {
      return {
        success: false,
        message: 'Content submission not found',
      };
    }

    const submission = await (UserContent as any).findOne({
      _id: safeObjectId(id),
      user: user.id, // Use string ID directly - ensures user can only access their own content
    })
    .populate('user', 'username name email phone_number')
    .populate('approved_by', 'username name email')
    .lean();

    if (!submission) {
      return {
        success: false,
        message: 'Content submission not found',
      };
    }

    const serializedSubmission = serializeDocument(submission);

    const formattedSubmission: ContentSubmission = {
      _id: serializedSubmission._id,
      title: serializedSubmission.title,
      content_type: serializedSubmission.content_type,
      content_text: serializedSubmission.content,
      status: serializedSubmission.status,
      payment_status: serializedSubmission.payment_status,
      payment_amount: centsToKsh(serializedSubmission.payment_amount), // Convert to KSH for display
      submission_date: serializedSubmission.submission_date,
      task_category: serializedSubmission.task_category,
      admin_feedback: serializedSubmission.admin_notes,
      revision_notes: serializedSubmission.revision_notes,
      word_count: serializedSubmission.word_count || calculateWordCount(serializedSubmission.content),
      tags: serializedSubmission.tags || [],
      attachments: serializedSubmission.attachments || [],
      user_id: serializedSubmission.user._id,
      approved_at: serializedSubmission.approved_at,
      approved_by: serializedSubmission.approved_by,
    };

    return {
      success: true,
      data: formattedSubmission,
    };
  } catch (error) {
    console.error('Error fetching submission by ID:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch submission',
    };
  }
}

// =============================================================================
// CREATE CONTENT SUBMISSION
// =============================================================================

export async function createContentSubmission(data: CreateContentData): Promise<{
  success: boolean;
  message: string;
  data?: { id: string };
}> {
  try {
    const user = await getCurrentUser();

    // Check if user is active (only active users can submit content)
    if (!user.is_active) {
      return {
        success: false,
        message: 'Your account needs to be activated before you can submit content. Please complete the activation process.',
      };
    }

    // Validate required fields
    if (!data.title?.trim()) {
      return {
        success: false,
        message: 'Title is required',
      };
    }

    if (!data.content_text?.trim() || data.content_text === '<p><br></p>') {
      return {
        success: false,
        message: 'Content is required',
      };
    }

    if (!data.task_category?.trim()) {
      return {
        success: false,
        message: 'Task category is required',
      };
    }

    // Validate content type
    if (!isValidContentType(data.content_type)) {
      return {
        success: false,
        message: 'Invalid content type selected',
      };
    }

    const wordCount = calculateWordCount(data.content_text);
    const minWordCount = getMinimumWordCount(data.content_type);
    
    if (wordCount < minWordCount) {
      return {
        success: false,
        message: `Content must be at least ${minWordCount} words for ${data.content_type.replace('_', ' ')}. Current count: ${wordCount} words.`,
      };
    }

    await connectToDatabase();

    // Calculate payment amount (in cents)
    const paymentAmount = calculatePaymentAmount(wordCount, data.content_type);

    // Create the content submission
    const newSubmission = new (UserContent as any)({
      user: user.id, // Use string ID directly
      title: data.title.trim(),
      content: data.content_text,
      content_type: data.content_type,
      task_category: data.task_category.trim(),
      payment_amount: paymentAmount, // Store in cents
      status: 'pending',
      payment_status: 'pending',
      submission_date: new Date(),
      word_count: wordCount,
      tags: data.tags || [],
      attachments: data.attachments.map(file => file.name), // Store file names
    });

    await newSubmission.save();

    // Update user's tasks completed count
    await (Profile as any).findByIdAndUpdate(user.id, {
      $inc: { tasks_completed: 1 }
    });

    // Revalidate the content list page
    revalidatePath('/dashboard/content');

    return {
      success: true,
      message: 'Content submitted successfully! It will be reviewed by our team.',
      data: { id: newSubmission._id.toString() },
    };
  } catch (error) {
    console.error('Error creating content submission:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit content. Please try again.',
    };
  }
}

// =============================================================================
// ADMIN CONTENT MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Admin function to update content submission status and payment
 */
export async function adminUpdateContentSubmission(
  contentId: string,
  data: AdminUpdateContentData
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // [MIGRATION]: Replaced await getServerSession(authOptions) with await auth()
    const session = await auth(); 
    
    // FIX: Use type guard for admin session checking
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    if (!Types.ObjectId.isValid(contentId)) {
      return { success: false, message: 'Invalid content ID' };
    }

    // Find the content submission
    const content = await (UserContent as any).findById(contentId);
    if (!content) {
      return { success: false, message: 'Content submission not found' };
    }

    // Prepare update data
    const updateData: any = {
      status: data.status,
      payment_status: data.payment_status,
      payment_amount: kshToCents(data.payment_amount), // Convert KSH to cents for storage
      admin_notes: data.admin_notes,
      updated_at: new Date(),
    };

    // Set approved_at and approved_by if status is being changed to approved
    if (data.status === 'approved' && content.status !== 'approved') {
      updateData.approved_at = new Date();
      updateData.approved_by = adminUser._id;
    }

    // Set revision notes if status is revision_requested
    if (data.status === 'revision_requested') {
      updateData.revision_notes = data.revision_notes;
    }

    // Update the content submission
    await (UserContent as any).findByIdAndUpdate(contentId, updateData);

    // Log admin action
    await (AdminAuditLog as any).create({
      actor_id: adminUser._id,
      action: 'UPDATE_USER_CONTENT',
      action_type: 'update',
      resource_type: 'user_content',
      target_type: 'UserContent',
      target_id: contentId,
      resource_id: contentId,
      changes: {
        status: data.status,
        payment_status: data.payment_status,
        payment_amount: data.payment_amount,
        previous_status: content.status,
        previous_payment_status: content.payment_status,
        previous_payment_amount: centsToKsh(content.payment_amount),
      },
      ip_address: 'server-action',
      user_agent: 'server-action',
    });

    // Revalidate admin and user content pages
    revalidatePath('/admin/user-content');
    revalidatePath('/dashboard/content');

    return {
      success: true,
      message: 'Content submission updated successfully',
    };
  } catch (error) {
    console.error('Error updating content submission as admin:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update content submission',
    };
  }
}

/**
 * Admin function to get all content submissions for management
 */
export async function adminGetContentSubmissions(filters?: {
  status?: string;
  content_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: ContentSubmission[];
  message?: string;
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
}> {
  try {
    // [MIGRATION]: Replaced await getServerSession(authOptions) with await auth()
    const session = await auth(); 
    
    // FIX: Use type guard for admin session checking
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const {
      status = 'all',
      content_type = 'all',
      search = '',
      page = 1,
      limit = 10,
    } = filters || {};

    // Build query
    const query: any = {};

    if (status !== 'all' && status !== '') {
      query.status = status;
    }

    if (content_type !== 'all' && content_type !== '') {
      query.content_type = content_type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { task_category: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { 'user.username': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await (UserContent as any).countDocuments(query);

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated results with user population
    const submissions = await (UserContent as any).find(query)
      .populate('user', 'username name email phone_number')
      .populate('approved_by', 'username name email')
      .sort({ submission_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serializedSubmissions = submissions.map((sub: any) => serializeDocument(sub));

    const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map((sub: any) => ({
      _id: sub._id,
      title: sub.title,
      content_type: sub.content_type,
      content_text: sub.content,
      status: sub.status,
      payment_status: sub.payment_status,
      payment_amount: centsToKsh(sub.payment_amount), // Convert to KSH for display
      submission_date: sub.submission_date,
      task_category: sub.task_category,
      admin_feedback: sub.admin_notes,
      revision_notes: sub.revision_notes,
      word_count: sub.word_count || calculateWordCount(sub.content),
      tags: sub.tags || [],
      attachments: sub.attachments || [],
      user_id: sub.user._id,
      approved_at: sub.approved_at,
      approved_by: sub.approved_by,
    }));

    return {
      success: true,
      data: formattedSubmissions,
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    console.error('Error fetching admin content submissions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load content submissions',
    };
  }
}

// =============================================================================
// DASHBOARD-SPECIFIC FUNCTIONS
// =============================================================================

export async function getDashboardStats(): Promise<{
  success: boolean;
  data?: ContentStats;
  message?: string;
}> {
  return getUserContentStats();
}

// =============================================================================
// UPDATE CONTENT SUBMISSION
// =============================================================================

export async function updateContentSubmission(
  id: string,
  data: UpdateContentData
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getCurrentUser();

    // Check if user is active
    if (!user.is_active) {
      return {
        success: false,
        message: 'Your account needs to be activated before you can update content.',
      };
    }

    // Validate required fields
    if (!data.title?.trim()) {
      return {
        success: false,
        message: 'Title is required',
      };
    }

    if (!data.content_text?.trim() || data.content_text === '<p><br></p>') {
      return {
        success: false,
        message: 'Content is required',
      };
    }

    if (!data.task_category?.trim()) {
      return {
        success: false,
        message: 'Task category is required',
      };
    }

    // Validate content type
    if (!isValidContentType(data.content_type)) {
      return {
        success: false,
        message: 'Invalid content type selected',
      };
    }

    const minWordCount = getMinimumWordCount(data.content_type);
    if (data.word_count < minWordCount) {
      return {
        success: false,
        message: `Content must be at least ${minWordCount} words for ${data.content_type.replace('_', ' ')}. Current count: ${data.word_count} words.`,
      };
    }

    await connectToDatabase();

    if (!Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: 'Invalid content ID',
      };
    }

    // Find the existing submission
    const existingSubmission = await (UserContent as any).findOne({
      _id: safeObjectId(id),
      user: user.id, // Use string ID directly
    });

    if (!existingSubmission) {
      return {
        success: false,
        message: 'Content submission not found',
      };
    }

    // Check if submission can be edited (only pending or revision_requested)
    if (!['pending', 'revision_requested'].includes(existingSubmission.status)) {
      return {
        success: false,
        message: 'This submission cannot be edited as it has already been processed.',
      };
    }

    // Recalculate payment amount if content changed significantly
    let paymentAmount = existingSubmission.payment_amount;
    const contentChanged = existingSubmission.content !== data.content_text;
    
    if (contentChanged) {
      paymentAmount = calculatePaymentAmount(data.word_count, data.content_type);
    }

    // Update the submission
    const updateData: any = {
      title: data.title.trim(),
      content: data.content_text,
      content_type: data.content_type,
      task_category: data.task_category.trim(),
      payment_amount: paymentAmount,
      word_count: data.word_count,
      status: 'pending', // Reset to pending when updated
      tags: data.tags || [],
    };

    // Clear revision notes if this was a revision request
    if (existingSubmission.status === 'revision_requested') {
      updateData.revision_notes = undefined;
    }

    await (UserContent as any).findByIdAndUpdate(
      safeObjectId(id),
      updateData
    );

    // Revalidate the content list and detail pages
    revalidatePath('/dashboard/content');
    revalidatePath(`/dashboard/content/${id}`);

    return {
      success: true,
      message: 'Content updated successfully! It has been sent for review again.',
    };
  } catch (error) {
    console.error('Error updating content submission:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update content. Please try again.',
    };
  }
}

// =============================================================================
// DELETE CONTENT SUBMISSION
// =============================================================================

export async function deleteContentSubmission(id: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getCurrentUser();
    await connectToDatabase();

    // Check if user is active
    if (!user.is_active) {
      return {
        success: false,
        message: 'Your account needs to be activated before you can delete content.',
      };
    }

    if (!Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: 'Invalid content ID',
      };
    }

    // Find the submission first to check if it can be deleted
    const submission = await (UserContent as any).findOne({
      _id: safeObjectId(id),
      user: user.id, // Use string ID directly
    });

    if (!submission) {
      return {
        success: false,
        message: 'Content submission not found or you do not have permission to delete it.',
      };
    }

    // Prevent deletion of approved or paid content
    if (submission.status === 'approved' || submission.payment_status === 'paid') {
      return {
        success: false,
        message: 'Cannot delete content that has been approved or paid.',
      };
    }

    // Delete the submission
    await (UserContent as any).findByIdAndDelete(safeObjectId(id));

    // Update user's tasks completed count (decrement)
    await (Profile as any).findByIdAndUpdate(user.id, {
      $inc: { tasks_completed: -1 }
    });

    // Revalidate the content list page
    revalidatePath('/dashboard/content');

    return {
      success: true,
      message: 'Content submission deleted successfully.',
    };
  } catch (error) {
    console.error('Error deleting content submission:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete content submission. Please try again.',
    };
  }
}

