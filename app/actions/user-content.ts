// app/actions/user-content.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase, UserContent, Profile, Transaction, BlogPost, AdminAuditLog } from '../lib/models';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ContentType = 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
export type ContentStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type PaymentStatus = 'pending' | 'paid' | 'rejected';

export interface ContentUser {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
    phone_number?: string;
}

export interface ContentSubmission {
    _id: string;
    title: string;
    content_type: ContentType;
    content_text: string;
    status: ContentStatus;
    payment_status: PaymentStatus;
    payment_amount: number;
    submission_date: string;
    task_category: string;
    admin_feedback?: string;
    revision_notes?: string;
    word_count?: number;
    tags?: string[];
    attachments?: string[];
    user_id: string;
    user?: ContentUser;
    approved_at?: string;
    approved_by?: ContentUser;
    bonus_amount?: number;
}

export interface ContentStats {
    totalSubmissions: number;
    pending: number;
    approved: number;
    rejected: number;
    revisionRequested: number;
    totalEarned: number;
    averageEarnings: number;
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

export interface AdminUpdateContentData {
    status: ContentStatus;
    payment_status: PaymentStatus;
    payment_amount: number;
    bonus_amount?: number;
    admin_notes?: string;
    revision_notes?: string;
}

interface CurrentUser {
    id: string;
    email: string;
    name: string;
    username?: string;
    role: string;
    is_active: boolean;
    approval_status: string;
    status: string;
}

interface ApiResponse<T = void> {
    success: boolean;
    data?: T;
    message?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T> {
    totalPages?: number;
    currentPage?: number;
    totalCount?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_CONTENT_AMOUNT = 50;
const MIN_CONTENT_AMOUNT = 0;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getCurrentUser(): Promise<CurrentUser> {
    try {
        const session = await auth();
        
        if (!session?.user?.email) {
            throw new Error('User not authenticated');
        }

        await connectToDatabase();
        const user: any = await Profile.findOne({ email: session.user.email });
        
        if (!user) {
            throw new Error('User profile not found');
        }

        if (user.status === 'banned') {
            throw new Error('Your account has been permanently banned. Please contact support.');
        }

        if (user.status === 'suspended') {
            throw new Error('Your account has been temporarily suspended. Please contact support.');
        }

        if (!user.is_approved || user.approval_status !== 'approved') {
            throw new Error('Your account is pending approval. Please wait for admin approval before submitting content.');
        }

        const isUserActive = user.is_active && user.status === 'active';

        return {
            id: user._id.toString(),
            email: user.email,
            name: user.username || user.name || user.email,
            username: user.username,
            role: user.role,
            is_active: isUserActive,
            approval_status: user.approval_status,
            status: user.status
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Authentication failed. Please try logging in again.');
    }
}

async function checkAdminAccess(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (user.role !== 'admin') {
        console.warn(`Unauthorized admin access attempt by user: ${user.email} (role: ${user.role})`);
        throw new Error('Access Denied: Administrator privileges required');
    }
    return user;
}

const USER_POPULATION_FIELDS = 'username name email phone_number profile_image status';
const ADMIN_POPULATION_FIELDS = 'username name email';

function calculateWordCount(htmlContent: string): number {
    if (!htmlContent) return 0;
    const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
}

function getMinimumWordCount(contentType: ContentType): number {
    const minWordCounts: Record<ContentType, number> = {
        blog_post: 400,
        social_media: 150,
        product_review: 150,
        video: 150,
        other: 150,
    };
    
    return minWordCounts[contentType];
}

// Calculate payment amount in KSH (not cents)
function calculatePaymentAmount(wordCount: number, contentType: ContentType): number {
    const baseRate = 0.5; // KES per word
    const baseAmount = wordCount * baseRate;
    
    const typeMultipliers: Record<ContentType, number> = {
        blog_post: 1.2,
        product_review: 1.1,
        video: 1.3,
        social_media: 0.8,
        other: 1.0,
    };

    const paymentAmount = baseAmount * typeMultipliers[contentType];
    const minPayment = 0.5; // Minimum KES 0.50
    const maxPayment = 50; // Maximum KES 50.00

    // Round to 2 decimal places for KSH
    return Math.round(Math.max(minPayment, Math.min(maxPayment, paymentAmount)) * 100) / 100;
}

// Convert KSH to cents for storage
function kshToCents(amount: number): number {
    return Math.round(amount * 100);
}

// Convert cents to KSH for display
function centsToKsh(cents: number): number {
    return cents / 100;
}

function validateAdminPaymentAmount(paymentAmount: number, bonusAmount: number = 0): { isValid: boolean; message?: string } {
    if (paymentAmount > MAX_CONTENT_AMOUNT) {
        return {
            isValid: false,
            message: `Content payment amount cannot exceed Ksh ${MAX_CONTENT_AMOUNT}. Use bonus amount for additional payments.`
        };
    }
    
    if (paymentAmount < MIN_CONTENT_AMOUNT) {
        return {
            isValid: false,
            message: `Content payment amount cannot be less than Ksh ${MIN_CONTENT_AMOUNT}.`
        };
    }
    
    if (bonusAmount < 0) {
        return {
            isValid: false,
            message: 'Bonus amount cannot be negative.'
        };
    }
    
    return { isValid: true };
}

function calculateTotalPaymentAmount(contentAmount: number, bonusAmount: number = 0): number {
    return contentAmount + bonusAmount;
}

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function serializeDocument(doc: any): any {
    if (!doc) return null;

    const serialized = JSON.parse(JSON.stringify(doc));

    if (serialized._id && typeof serialized._id !== 'string') {
        serialized._id = serialized._id.toString();
    }
    
    if (serialized.user) {
        if (serialized.user._id && typeof serialized.user._id !== 'string') {
            serialized.user._id = serialized.user._id.toString();
        }
        if (!serialized.user.username && serialized.user.email) {
            serialized.user.username = serialized.user.email.split('@')[0];
        }
    }
    
    if (serialized.approved_by) {
        if (serialized.approved_by._id && typeof serialized.approved_by._id !== 'string') {
            serialized.approved_by._id = serialized.approved_by._id.toString();
        }
    }

    return serialized;
}

// Properly handle amount conversion for display
function formatContentSubmission(sub: any): ContentSubmission {
    // Convert stored cents to KSH for display
    const baseAmount = centsToKsh(sub.payment_amount || 0);
    const bonusAmount = centsToKsh(sub.bonus_amount || 0);
    const totalAmount = baseAmount + bonusAmount;

    return {
        _id: sub._id,
        title: sub.title,
        content_type: sub.content_type,
        content_text: sub.content,
        status: sub.status,
        payment_status: sub.payment_status,
        payment_amount: totalAmount, // Total amount in KSH for display
        submission_date: sub.submission_date,
        task_category: sub.task_category,
        admin_feedback: sub.admin_notes,
        revision_notes: sub.revision_notes,
        word_count: sub.word_count || calculateWordCount(sub.content),
        tags: sub.tags || [],
        attachments: sub.attachments || [],
        user_id: sub.user?._id?.toString() || 'unknown-user',
        user: sub.user ? {
            _id: sub.user._id?.toString() || 'unknown-user',
            username: sub.user.username,
            name: sub.user.name,
            email: sub.user.email,
            phone_number: sub.user.phone_number
        } : undefined,
        approved_at: sub.approved_at,
        approved_by: sub.approved_by ? {
            _id: sub.approved_by._id?.toString(),
            username: sub.approved_by.username,
            name: sub.approved_by.name,
            email: sub.approved_by.email
        } : undefined,
        bonus_amount: bonusAmount,
    };
}

function isValidContentType(type: string): type is ContentType {
    return ['blog_post', 'social_media', 'product_review', 'video', 'other'].includes(type);
}

// Simply return the string ID as-is for UUIDs
function safeId(id: string): string {
    if (!id || typeof id !== 'string') {
        throw new Error(`Invalid ID: ${id}`);
    }
    return id;
}

async function createBlogPostFromSubmission(submission: any, adminUser: CurrentUser): Promise<void> {
    try {
        const slug = generateSlug(submission.title);
        const wordCount = calculateWordCount(submission.content);
        const readTime = Math.max(1, Math.ceil(wordCount / 200));
        
        const textContent = submission.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const excerpt = textContent.length > 150 ? textContent.substring(0, 150) + '...' : textContent;
        
        const existingBlogPost: any = await BlogPost.findOne({ 
            source_submission_id: submission._id 
        });
        
        if (existingBlogPost) {
            existingBlogPost.title = submission.title;
            existingBlogPost.content = submission.content;
            existingBlogPost.excerpt = excerpt;
            existingBlogPost.read_time = readTime;
            existingBlogPost.tags = submission.tags || [];
            existingBlogPost.updated_at = new Date();
            await existingBlogPost.save();
        } else {
            const blogPost = new BlogPost({
                title: submission.title,
                slug: slug,
                content: submission.content,
                excerpt: excerpt,
                author: submission.user,
                status: 'published',
                featured_image: submission.attachments?.[0] || null,
                tags: submission.tags || [],
                category: submission.task_category,
                read_time: readTime,
                published_at: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
                source_submission_id: submission._id,
                metadata: {
                    submitted_via: 'user_content',
                    original_submission_date: submission.submission_date,
                    payment_amount: submission.payment_amount,
                    bonus_amount: submission.bonus_amount,
                    approved_by: adminUser.id,
                }
            });
            
            await blogPost.save();
        }
        
        console.log(`Blog post created/updated for submission: ${submission.title}`);
    } catch (error) {
        console.error('Error creating blog post from submission:', error);
    }
}

// =============================================================================
// USER/DASHBOARD CONTENT ACTIONS
// =============================================================================

export async function getUserContentStats(): Promise<ApiResponse<ContentStats>> {
    try {
        const user = await getCurrentUser();
        await connectToDatabase();

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

        const stats = await UserContent.aggregate([
            { $match: { user: safeId(user.id) } },
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
                                { $add: ['$payment_amount', { $ifNull: ['$bonus_amount', 0] }] },
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
            ? Math.round((totalEarnedKsh / result.totalSubmissions) * 100) / 100
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

export async function getRecentSubmissions(limit: number = 5): Promise<ApiResponse<ContentSubmission[]>> {
    try {
        const user = await getCurrentUser();
        await connectToDatabase();

        if (!user.is_active) {
            return {
                success: true,
                data: [],
            };
        }

        const submissions = await UserContent.find({ user: safeId(user.id) })
            .populate('user', USER_POPULATION_FIELDS)
            .populate('approved_by', ADMIN_POPULATION_FIELDS)
            .sort({ submission_date: -1 })
            .limit(limit)
            .lean();

        const serializedSubmissions = submissions.map(sub => serializeDocument(sub));
        const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map(formatContentSubmission);

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

export async function getUserContentSubmissions(filters?: {
    status?: string;
    content_type?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<PaginatedResponse<ContentSubmission[]>> {
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

        if (!user.is_active) {
            return {
                success: true,
                data: [],
                totalPages: 0,
                currentPage: page,
                totalCount: 0,
            };
        }

        const query: any = { user: safeId(user.id) };

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

        const totalCount = await UserContent.countDocuments(query);
        const skip = (page - 1) * limit;
        const totalPages = Math.ceil(totalCount / limit);

        const submissions = await UserContent.find(query)
            .populate('user', USER_POPULATION_FIELDS)
            .populate('approved_by', ADMIN_POPULATION_FIELDS)
            .sort({ submission_date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const serializedSubmissions = submissions.map(sub => serializeDocument(sub));
        const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map(formatContentSubmission);

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

export async function getContentSubmission(id: string): Promise<ApiResponse<ContentSubmission>> {
    try {
        const user = await getCurrentUser();
        await connectToDatabase();

        if (!id) {
            return {
                success: false,
                message: 'Invalid content ID',
            };
        }

        if (!user.is_active) {
            return {
                success: false,
                message: 'Content submission not found',
            };
        }

        const submission = await UserContent.findOne({
            _id: safeId(id),
            user: safeId(user.id),
        })
        .populate('user', USER_POPULATION_FIELDS)
        .populate('approved_by', ADMIN_POPULATION_FIELDS)
        .lean();

        if (!submission) {
            return {
                success: false,
                message: 'Content submission not found',
            };
        }

        const serializedSubmission = serializeDocument(submission);
        const formattedSubmission = formatContentSubmission(serializedSubmission);

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

export async function createContentSubmission(data: CreateContentData): Promise<ApiResponse<{ id: string }>> {
    try {
        const user = await getCurrentUser();

        if (!user.is_active) {
            return {
                success: false,
                message: 'Your account needs to be activated before you can submit content. Please complete the activation process.',
            };
        }

        if (!data.title?.trim()) {
            return { success: false, message: 'Title is required' };
        }
        if (!data.content_text?.trim() || data.content_text === '<p><br></p>') {
            return { success: false, message: 'Content is required' };
        }
        if (!data.task_category?.trim()) {
            return { success: false, message: 'Task category is required' };
        }

        if (!isValidContentType(data.content_type)) {
            return { success: false, message: 'Invalid content type selected' };
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

        // Calculate payment amount in KSH, then convert to cents for storage
        const paymentAmountKsh = calculatePaymentAmount(wordCount, data.content_type);
        const paymentAmountCents = kshToCents(paymentAmountKsh);

        const newSubmission = new UserContent({
            user: safeId(user.id),
            title: data.title.trim(),
            content: data.content_text,
            content_type: data.content_type,
            task_category: data.task_category.trim(),
            payment_amount: paymentAmountCents, // Store in cents
            status: 'pending',
            payment_status: 'pending',
            submission_date: new Date(),
            word_count: wordCount,
            tags: data.tags || [],
            attachments: data.attachments.map(file => file.name),
        });

        await newSubmission.save();

        await Profile.findByIdAndUpdate(safeId(user.id), {
            $inc: { tasks_completed: 1 }
        });

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

export async function updateContentSubmission(
    id: string,
    data: UpdateContentData
): Promise<ApiResponse> {
    try {
        const user = await getCurrentUser();

        if (!user.is_active) {
            return {
                success: false,
                message: 'Your account needs to be activated before you can update content.',
            };
        }

        if (!data.title?.trim()) { return { success: false, message: 'Title is required' }; }
        if (!data.content_text?.trim() || data.content_text === '<p><br></p>') { return { success: false, message: 'Content is required' }; }
        if (!data.task_category?.trim()) { return { success: false, message: 'Task category is required' }; }

        if (!isValidContentType(data.content_type)) {
            return { success: false, message: 'Invalid content type selected' };
        }

        const minWordCount = getMinimumWordCount(data.content_type);
        if (data.word_count < minWordCount) {
            return {
                success: false,
                message: `Content must be at least ${minWordCount} words for ${data.content_type.replace('_', ' ')}. Current count: ${data.word_count} words.`,
            };
        }

        await connectToDatabase();

        if (!id) {
            return { success: false, message: 'Invalid content ID' };
        }

        const existingSubmission: any = await UserContent.findOne({
            _id: safeId(id),
            user: safeId(user.id),
        });

        if (!existingSubmission) { return { success: false, message: 'Content submission not found' }; }

        if (!['pending', 'revision_requested'].includes(existingSubmission.status)) {
            return { success: false, message: 'This submission cannot be edited as it has already been processed.' };
        }

        let paymentAmount = existingSubmission.payment_amount;
        const contentChanged = existingSubmission.content !== data.content_text;
        
        if (contentChanged) {
            // Calculate in KSH, then convert to cents
            const paymentAmountKsh = calculatePaymentAmount(data.word_count, data.content_type);
            paymentAmount = kshToCents(paymentAmountKsh);
        }

        const updateData: any = {
            title: data.title.trim(),
            content: data.content_text,
            content_type: data.content_type,
            task_category: data.task_category.trim(),
            payment_amount: paymentAmount,
            word_count: data.word_count,
            status: 'pending',
            tags: data.tags || [],
            updated_at: new Date(),
        };

        if (existingSubmission.status === 'revision_requested') {
            updateData.revision_notes = undefined;
        }

        await UserContent.findByIdAndUpdate(
            safeId(id),
            updateData
        );

        revalidatePath('/dashboard/content');
        revalidatePath(`/dashboard/content/${id}`);

        return { success: true, message: 'Content updated successfully! It has been sent for review again.' };
    } catch (error) {
        console.error('Error updating content submission:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update content. Please try again.',
        };
    }
}

export async function deleteContentSubmission(id: string): Promise<ApiResponse> {
    try {
        const user = await getCurrentUser();
        await connectToDatabase();

        if (!user.is_active) {
            return {
                success: false,
                message: 'Your account needs to be activated before you can delete content.',
            };
        }

        if (!id) {
            return { success: false, message: 'Invalid content ID' };
        }

        const submission: any = await UserContent.findOne({
            _id: safeId(id),
            user: safeId(user.id),
        });

        if (!submission) {
            return {
                success: false,
                message: 'Content submission not found or you do not have permission to delete it.',
            };
        }

        if (submission.status === 'approved' || submission.payment_status === 'paid') {
            return {
                success: false,
                message: 'Cannot delete content that has been approved or paid. Please contact support if you need assistance.',
            };
        }

        await UserContent.findOneAndDelete({
            _id: safeId(id),
            user: safeId(user.id),
        });

        await Profile.findByIdAndUpdate(safeId(user.id), {
            $inc: { tasks_completed: -1 }
        });

        revalidatePath('/dashboard/content');

        return { success: true, message: 'Content submission deleted successfully.' };
    } catch (error) {
        console.error('Error deleting content submission:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete content submission. Please try again.',
        };
    }
}

// =============================================================================
// ADMIN CONTENT ACTIONS
// =============================================================================

export async function getAllUserContentSubmissions(filters?: {
  status?: string;
  content_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ContentSubmission[]>> {
  try {
    const admin = await checkAdminAccess();
    
    const {
      status = 'all',
      content_type = 'all',
      search = '',
      page = 1,
      limit = 10,
    } = filters || {};

    await connectToDatabase();

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
        { 'user.name': { $regex: search, $options: 'i' } },
      ];
    }

    const totalCount = await UserContent.countDocuments(query);
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    const submissions = await UserContent.find(query)
      .populate('user', USER_POPULATION_FIELDS)
      .populate('approved_by', ADMIN_POPULATION_FIELDS)
      .sort({ submission_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serializedSubmissions = submissions.map(sub => serializeDocument(sub));
    const formattedSubmissions: ContentSubmission[] = serializedSubmissions.map(formatContentSubmission);

    return {
      success: true,
      data: formattedSubmissions,
      totalPages,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    console.error('Error fetching all user content submissions:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load content submissions',
    };
  }
}

export async function getAdminContentStats(): Promise<ApiResponse<{
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequested: number;
  totalPaid: number;
}>> {
  try {
    await checkAdminAccess();
    await connectToDatabase();

    const stats = await UserContent.aggregate([
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
          totalPaid: {
            $sum: {
              $cond: [
                { $eq: ['$payment_status', 'paid'] },
                { $add: ['$payment_amount', { $ifNull: ['$bonus_amount', 0] }] },
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
      totalPaid: 0
    };

    // Convert total paid from cents to KSH for display
    const totalPaidKsh = centsToKsh(result.totalPaid);

    return {
      success: true,
      data: {
        totalSubmissions: result.totalSubmissions,
        pending: result.pending,
        approved: result.approved,
        rejected: result.rejected,
        revisionRequested: result.revisionRequested,
        totalPaid: totalPaidKsh
      },
    };
  } catch (error) {
    console.error('Error fetching admin content stats:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load content statistics',
    };
  }
}

export async function getUserContentById(id: string): Promise<ApiResponse<ContentSubmission>> {
    try {
        const admin = await checkAdminAccess();

        if (!id) {
            return { success: false, message: 'Invalid submission ID' };
        }

        await connectToDatabase();

        const submission = await UserContent.findById(safeId(id))
            .populate('user', USER_POPULATION_FIELDS)
            .populate('approved_by', ADMIN_POPULATION_FIELDS)
            .lean();

        if (!submission) {
            return { success: false, message: 'Content submission not found' };
        }

        const serializedSubmission = serializeDocument(submission);
        const formattedSubmission = formatContentSubmission(serializedSubmission);

        return {
            success: true,
            data: formattedSubmission,
        };
    } catch (error) {
        console.error('Error fetching content submission for admin:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to load submission',
        };
    }
}

export async function approveUserContent(id: string, adminNotes: string, bonusAmount: number = 0): Promise<ApiResponse> {
    try {
        const admin = await checkAdminAccess();
        await connectToDatabase();

        if (!id) { 
            return { success: false, message: 'Invalid submission ID' }; 
        }

        const submission: any = await UserContent.findOne({
            _id: safeId(id),
            status: { $in: ['pending', 'revision_requested'] }
        });

        if (!submission) { 
            return { success: false, message: 'Submission not found or already processed.' }; 
        }

        // Convert stored cents to KSH for validation
        const contentAmountKsh = centsToKsh(submission.payment_amount);
        const validation = validateAdminPaymentAmount(contentAmountKsh, bonusAmount);
        if (!validation.isValid) {
            return { success: false, message: validation.message! };
        }

        submission.status = 'approved';
        submission.payment_status = 'paid';
        submission.bonus_amount = kshToCents(bonusAmount);
        submission.admin_notes = adminNotes || undefined;
        submission.revision_notes = undefined;
        submission.approved_by = safeId(admin.id);
        submission.approved_at = new Date();
        submission.updated_at = new Date();

        await submission.save();

        if (submission.content_type === 'blog_post') {
            await createBlogPostFromSubmission(submission, admin);
        }

        const totalPaymentAmount = submission.payment_amount + submission.bonus_amount;

        const transaction = new Transaction({
            user_id: submission.user,
            amount_cents: totalPaymentAmount,
            type: 'TASK_PAYMENT',
            description: `Payment for content submission: ${submission.title}${bonusAmount > 0 ? ` (including Ksh ${bonusAmount} bonus)` : ''}`,
            status: 'completed',
            metadata: {
                content_id: submission._id,
                content_title: submission.title,
                content_amount: submission.payment_amount,
                bonus_amount: submission.bonus_amount,
                approved_by: admin.id,
            },
        });

        await transaction.save();

        await Profile.findByIdAndUpdate(submission.user, {
            $inc: { 
                balance_cents: totalPaymentAmount,
                total_earnings_cents: totalPaymentAmount
            }
        });

        await AdminAuditLog.create({
            actor_id: safeId(admin.id),
            action: 'UPDATE_BLOG_POST',
            action_type: 'approve',
            resource_type: 'blog_post',
            target_type: 'UserContent',
            target_id: id,
            resource_id: id,
            changes: {
                status: 'approved',
                payment_status: 'paid',
                bonus_amount: bonusAmount,
                previous_status: submission.status,
                previous_payment_status: submission.payment_status,
            },
            ip_address: 'server-action',
            user_agent: 'server-action',
        });

        revalidatePath('/admin/user-content');
        revalidatePath(`/admin/user-content/${id}`);
        revalidatePath('/dashboard/content');
        revalidatePath('/blog');

        const bonusMessage = bonusAmount > 0 ? ` with Ksh ${bonusAmount} bonus` : '';
        return { success: true, message: `Content approved${bonusMessage}, payment processed, and blog post published successfully.` };
    } catch (error) {
        console.error('Error approving content:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to approve content.' };
    }
}

export async function rejectUserContent(id: string, rejectionReason: string): Promise<ApiResponse> {
    try {
        const admin = await checkAdminAccess();
        await connectToDatabase();

        if (!id) { return { success: false, message: 'Invalid submission ID' }; }
        if (!rejectionReason.trim()) { return { success: false, message: 'Rejection reason is required.' }; }

        const submission: any = await UserContent.findOne({
            _id: safeId(id),
            status: { $in: ['pending', 'revision_requested'] }
        });

        if (!submission) { return { success: false, message: 'Submission not found or already processed.' }; }

        submission.status = 'rejected';
        submission.payment_status = 'rejected';
        submission.bonus_amount = 0;
        submission.admin_notes = rejectionReason;
        submission.revision_notes = undefined;
        submission.approved_by = safeId(admin.id);
        submission.approved_at = new Date();
        submission.updated_at = new Date();

        await submission.save();

        await Profile.findByIdAndUpdate(submission.user, { $inc: { tasks_completed: -1 } });

        await AdminAuditLog.create({
            actor_id: safeId(admin.id),
            action: 'UPDATE_BLOG_POST',
            action_type: 'reject',
            resource_type: 'blog_post',
            target_type: 'UserContent',
            target_id: id,
            resource_id: id,
            changes: {
                status: 'rejected',
                payment_status: 'rejected',
                previous_status: submission.status,
                previous_payment_status: submission.payment_status,
            },
            ip_address: 'server-action',
            user_agent: 'server-action',
        });
        
        revalidatePath('/admin/user-content');
        revalidatePath(`/admin/user-content/${id}`);
        revalidatePath('/dashboard/content');

        return { success: true, message: 'Content rejected.' };
    } catch (error) {
        console.error('Error rejecting content:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to reject content.' };
    }
}

export async function requestContentRevision(id: string, revisionNotes: string): Promise<ApiResponse> {
    try {
        const admin = await checkAdminAccess();
        await connectToDatabase();

        if (!id) { return { success: false, message: 'Invalid submission ID' }; }
        if (!revisionNotes.trim()) { return { success: false, message: 'Revision instructions are required.' }; }

        const submission: any = await UserContent.findOne({
            _id: safeId(id),
            status: { $in: ['pending', 'revision_requested'] }
        });

        if (!submission) { return { success: false, message: 'Submission not found or already processed.' }; }

        submission.status = 'revision_requested';
        submission.payment_status = 'pending';
        submission.bonus_amount = 0;
        submission.revision_notes = revisionNotes;
        submission.admin_notes = undefined;
        submission.approved_by = undefined;
        submission.approved_at = undefined;
        submission.updated_at = new Date();

        await submission.save();

        await AdminAuditLog.create({
            actor_id: safeId(admin.id),
            action: 'UPDATE_BLOG_POST',
            action_type: 'update',
            resource_type: 'blog_post',
            target_type: 'UserContent',
            target_id: id,
            resource_id: id,
            changes: {
                status: 'revision_requested',
                revision_notes: revisionNotes,
                previous_status: submission.status,
            },
            ip_address: 'server-action',
            user_agent: 'server-action',
        });

        revalidatePath('/admin/user-content');
        revalidatePath(`/admin/user-content/${id}`);
        revalidatePath('/dashboard/content');

        return { success: true, message: 'Revision requested successfully.' };
    } catch (error) {
        console.error('Error requesting revision:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Failed to request revision.' };
    }
}

export async function adminUpdateContentSubmission(
    contentId: string,
    data: AdminUpdateContentData
): Promise<ApiResponse> {
    try {
        const admin = await checkAdminAccess();

        if (!contentId) {
            return { success: false, message: 'Invalid content ID' };
        }

        const validation = validateAdminPaymentAmount(data.payment_amount, data.bonus_amount);
        if (!validation.isValid) {
            return { success: false, message: validation.message! };
        }

        await connectToDatabase();

        const content: any = await UserContent.findById(safeId(contentId));
        if (!content) {
            return { success: false, message: 'Content submission not found' };
        }

        const updateData: any = {
            status: data.status,
            payment_status: data.payment_status,
            payment_amount: kshToCents(data.payment_amount),
            bonus_amount: data.bonus_amount ? kshToCents(data.bonus_amount) : 0,
            admin_notes: data.admin_notes,
            updated_at: new Date(),
        };

        if (data.status === 'approved' && content.status !== 'approved') {
            updateData.approved_at = new Date();
            updateData.approved_by = safeId(admin.id);
        }

        if (data.status === 'revision_requested') {
            updateData.revision_notes = data.revision_notes;
        }

        await UserContent.findByIdAndUpdate(safeId(contentId), updateData);

        await AdminAuditLog.create({
            actor_id: safeId(admin.id),
            action: 'UPDATE_BLOG_POST',
            action_type: 'update',
            resource_type: 'blog_post',
            target_type: 'UserContent',
            target_id: contentId,
            resource_id: contentId,
            changes: {
                status: data.status,
                payment_status: data.payment_status,
                payment_amount: data.payment_amount,
                bonus_amount: data.bonus_amount,
                previous_status: content.status,
                previous_payment_status: content.payment_status,
                previous_payment_amount: centsToKsh(content.payment_amount),
                previous_bonus_amount: centsToKsh(content.bonus_amount || 0),
            },
            ip_address: 'server-action',
            user_agent: 'server-action',
        });

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
