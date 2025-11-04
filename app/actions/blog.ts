'use server';

import { revalidatePath } from 'next/cache';
// V5 Update: Importing 'auth' function directly instead of getServerSession and authOptions
import { auth } from '@/auth'; 
import { connectToDatabase, BlogPost, Profile, AdminAuditLog, UserContent } from '../lib/models';
import { slugify } from '../lib/utils';
import { Types } from 'mongoose';

/**
 * Serializes a Mongoose document to a plain JavaScript object,
 * ensuring all IDs are converted to strings for Next.js compatibility.
 * @param doc The Mongoose document or lean object.
 * @returns The serialized object or null.
 */
function serializeDocument(doc: any) {
	if (!doc) return null;

	// Use JSON stringify/parse to deeply convert Mongoose objects
	const serialized = JSON.parse(JSON.stringify(doc));

	// Explicitly ensure top-level and populated IDs are strings
	if (serialized._id && typeof serialized._id !== 'string') {
		serialized._id = serialized._id.toString();
	}
	if (serialized.author && serialized.author._id && typeof serialized.author._id !== 'string') {
		serialized.author._id = serialized.author._id.toString();
	}
	if (serialized.source_submission_id && typeof serialized.source_submission_id !== 'string') {
		serialized.source_submission_id = serialized.source_submission_id.toString();
	}

	return serialized;
}

/**
 * Converts KSH amount to cents for storage
 * @param amount - Amount in KSH (e.g., 1.08)
 * @returns Amount in cents (e.g., 108)
 */
function kshToCents(amount: number): number {
	return Math.round(amount * 100);
}

/**
 * Converts cents to KSH for display
 * @param cents - Amount in cents (e.g., 108)
 * @returns Amount in KSH (e.g., 1.08)
 */
function centsToKsh(cents: number): number {
	return cents / 100;
}

/**
 * Calculates read time based on word count
 * @param content - Blog post content
 * @returns Read time in minutes
 */
function calculateReadTime(content: string): number {
	const wordsPerMinute = 200;
	const text = content.replace(/<[^>]*>/g, ' '); // Strip HTML tags
	const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
	return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Generates an excerpt from HTML content
 * @param htmlContent - HTML content to extract excerpt from
 * @param maxLength - Maximum length of excerpt (default 160 characters)
 * @returns Generated excerpt
 */
function generateExcerpt(htmlContent: string, maxLength: number = 160): string {
	// Remove LaTeX/Math formulas first (both inline and display)
	let text = htmlContent.replace(/\$\$[\s\S]*?\$\$/g, ' '); // Display math $...$
	text = text.replace(/\$[^$\n]+?\$/g, ' '); // Inline math $...$
	text = text.replace(/\\\[[\s\S]*?\\\]/g, ' '); // Display math \[...\]
	text = text.replace(/\\\([\s\S]*?\\\)/g, ' '); // Inline math \(...\)
	
	// Remove math equation div/span wrappers
	text = text.replace(/<[^>]*math-equation[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
	
	// Remove HTML tags
	text = text.replace(/<[^>]*>/g, ' ');
	
	// Decode HTML entities
	text = text.replace(/&amp;/g, '&');
	text = text.replace(/&lt;/g, '<');
	text = text.replace(/&gt;/g, '>');
	text = text.replace(/&quot;/g, '"');
	text = text.replace(/&#39;/g, "'");
	text = text.replace(/&nbsp;/g, ' ');
	
	// Remove any remaining special characters and extra whitespace
	text = text.replace(/[\\{}[\]]/g, ' '); // Remove LaTeX special chars
	text = text.replace(/\s+/g, ' ').trim(); // Normalize whitespace
	
	// If text is too short after cleaning, return empty to trigger fallback
	if (text.length < 30) {
		return '';
	}
	
	// Truncate to maxLength
	if (text.length <= maxLength) {
		return text;
	}
	
	// Find last complete word within maxLength
	const truncated = text.substring(0, maxLength);
	const lastSpace = truncated.lastIndexOf(' ');
	return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Generates a meta description for SEO
 * @param content - Blog post content
 * @param excerpt - Optional excerpt
 * @param title - Blog post title
 * @returns Generated meta description (max 160 characters)
 */
function generateMetaDescription(content: string, excerpt: string, title: string): string {
	// Priority 1: Use excerpt if provided and valid
	if (excerpt && excerpt.trim().length > 10) {
		let cleanExcerpt = excerpt.trim();
		
		// Clean LaTeX and HTML entities from excerpt
		cleanExcerpt = cleanExcerpt.replace(/\$\$[\s\S]*?\$\$/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/\$[^$\n]+?\$/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/\\\[[\s\S]*?\\\]/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/\\\([\s\S]*?\\\)/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/<[^>]*>/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/&amp;/g, '&');
		cleanExcerpt = cleanExcerpt.replace(/&[a-z]+;/gi, ' ');
		cleanExcerpt = cleanExcerpt.replace(/[\\{}[\]]/g, ' ');
		cleanExcerpt = cleanExcerpt.replace(/\s+/g, ' ').trim();
		
		if (cleanExcerpt.length > 30) {
			return cleanExcerpt.length > 160 
				? cleanExcerpt.substring(0, 157) + '...' 
				: cleanExcerpt;
		}
	}
	
	// Priority 2: Generate from content
	if (content && content.trim().length > 0) {
		const contentExcerpt = generateExcerpt(content, 160);
		if (contentExcerpt.length > 30) {
			return contentExcerpt;
		}
	}
	
	// Priority 3: Fallback to title-based description
	// Clean the title too in case it has LaTeX
	let cleanTitle = title.replace(/\$[^$]+?\$/g, '').replace(/[\\{}[\]]/g, '').trim();
	return `Read about ${cleanTitle} on Hustle Hub Africa. Discover insights, tips, and opportunities for digital earning.`;
}

/**
 * Validates and parses payment amount from form data
 * @param paymentAmount - Payment amount string from form
 * @returns Amount in cents or null if invalid
 */
function parsePaymentAmount(paymentAmount: string | null): number | null {
	if (!paymentAmount) return null;
	
	const amount = parseFloat(paymentAmount);
	if (isNaN(amount) || amount < 0) return null;
	
	return kshToCents(amount);
}

/**
 * Creates a new blog post.
 * Requires admin privileges.
 * @param formData - FormData containing blog post fields.
 * @returns A success or failure object.
 */
export async function createBlogPost(formData: FormData) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const title = formData.get('title') as string;
		const content = formData.get('content') as string;
		let excerpt = formData.get('excerpt') as string;
		const status = formData.get('status') as 'draft' | 'published' | 'archived';
		const meta_title = formData.get('meta_title') as string;
		let meta_description = formData.get('meta_description') as string;
		const featured_image = formData.get('featured_image') as string;
		const category = formData.get('category') as string;
		const tags = (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];
		
		// User Content Integration Fields
		const source_submission_id = formData.get('source_submission_id') as string;
		const submitted_via = formData.get('submitted_via') as string || 'user_content';
		const content_type = formData.get('content_type') as string;
		const task_category = formData.get('task_category') as string;
		const payment_amount = formData.get('payment_amount') as string;

		if (!title || !content) {
			return { success: false, message: 'Title and content are required' };
		}

		const slug = slugify(title);
		const existingPost = await (BlogPost as any).findOne({ slug });
		if (existingPost) {
			return { success: false, message: 'A blog post with this title already exists' };
		}

		// Validate source_submission_id if provided
		if (source_submission_id && !Types.ObjectId.isValid(source_submission_id)) {
			return { success: false, message: 'Invalid source submission ID' };
		}

		// Auto-generate excerpt if not provided
		if (!excerpt || excerpt.trim().length === 0) {
			excerpt = generateExcerpt(content, 160);
			console.log('Auto-generated excerpt:', excerpt);
		}

		// Auto-generate meta description if not provided
		if (!meta_description || meta_description.trim().length === 0) {
			meta_description = generateMetaDescription(content, excerpt, title);
			console.log('Auto-generated meta description:', meta_description);
		} else {
			// Validate and truncate if too long
			if (meta_description.length > 160) {
				meta_description = meta_description.substring(0, 157) + '...';
				console.log('Truncated meta description to 160 characters');
			}
		}

		// Parse and validate payment amount
		const paymentAmountCents = parsePaymentAmount(payment_amount);

		const blogPostData: any = {
			title,
			slug,
			content,
			excerpt,
			author: adminUser._id,
			status,
			meta_title: meta_title || title,
			meta_description,
			featured_image,
			category: category || 'General',
			tags,
			read_time: calculateReadTime(content),
			published_at: status === 'published' ? new Date() : undefined
		};

		// Add user content integration fields if provided
		if (source_submission_id) {
			blogPostData.source_submission_id = new Types.ObjectId(source_submission_id);
			blogPostData.metadata = {
				submitted_via,
				original_submission_date: new Date(),
				content_type,
				task_category,
				payment_amount: paymentAmountCents
			};
		}

		const blogPost = await (BlogPost as any).create(blogPostData);

		// If this was created from a user content submission, update the UserContent record
		if (source_submission_id) {
			await (UserContent as any).findByIdAndUpdate(source_submission_id, {
				blog_post_id: blogPost._id,
				status: 'approved',
				approved_at: new Date(),
				approved_by: adminUser._id,
				// Update payment status if payment amount is provided
				...(paymentAmountCents && {
					payment_amount: paymentAmountCents,
					payment_status: 'paid'
				})
			});
		}

		// Log creation action
		await (AdminAuditLog as any).create({
			actor_id: adminUser._id,
			action: 'CREATE_BLOG_POST',
			action_type: 'create',
			resource_type: 'blog_post',
			target_type: 'BlogPost',
			target_id: blogPost._id.toString(),
			resource_id: blogPost._id.toString(),
			changes: { 
				title, 
				status,
				has_auto_excerpt: !formData.get('excerpt'),
				has_auto_meta_description: !formData.get('meta_description'),
				source_submission_id: source_submission_id || undefined,
				payment_amount: paymentAmountCents ? centsToKsh(paymentAmountCents) : undefined
			},
			ip_address: 'server-action',
			user_agent: 'server-action'
		});

		revalidatePath('/admin/blogs');
		revalidatePath('/blog');
		
		return { 
			success: true, 
			message: 'Blog post created successfully',
			data: { 
				id: blogPost._id.toString(),
				auto_generated: {
					excerpt: !formData.get('excerpt'),
					meta_description: !formData.get('meta_description')
				}
			}
		};

	} catch (error) {
		console.error('Create blog post error:', error);
		return { success: false, message: 'Failed to create blog post' };
	}
}

/**
 * Updates an existing blog post.
 * Requires admin privileges.
 * @param postId - The ID of the post to update.
 * @param formData - FormData containing updated fields.
 * @returns A success or failure object.
 */
export async function updateBlogPost(postId: string, formData: FormData) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const title = formData.get('title') as string;
		const content = formData.get('content') as string;
		let excerpt = formData.get('excerpt') as string;
		const status = formData.get('status') as 'draft' | 'published' | 'archived';
		const meta_title = formData.get('meta_title') as string;
		let meta_description = formData.get('meta_description') as string;
		const featured_image = formData.get('featured_image') as string;
		const category = formData.get('category') as string;
		const tags = (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(tag => tag) || [];

		if (!title || !content) {
			return { success: false, message: 'Title and content are required' };
		}

		const existingPost = await (BlogPost as any).findById(postId);
		if (!existingPost) {
			return { success: false, message: 'Blog post not found' };
		}

		const slug = slugify(title);
		// Check for duplicate slug, excluding the current post
		const duplicatePost = await (BlogPost as any).findOne({ slug, _id: { $ne: postId } });
		if (duplicatePost) {
			return { success: false, message: 'A blog post with this title already exists' };
		}

		// Auto-generate excerpt if not provided
		if (!excerpt || excerpt.trim().length === 0) {
			excerpt = generateExcerpt(content, 160);
			console.log('Auto-generated excerpt for update:', excerpt);
		}

		// Auto-generate meta description if not provided
		if (!meta_description || meta_description.trim().length === 0) {
			meta_description = generateMetaDescription(content, excerpt, title);
			console.log('Auto-generated meta description for update:', meta_description);
		} else {
			// Validate and truncate if too long
			if (meta_description.length > 160) {
				meta_description = meta_description.substring(0, 157) + '...';
				console.log('Truncated meta description to 160 characters');
			}
		}

		const updateData: any = {
			title,
			slug,
			content,
			excerpt,
			status,
			meta_title: meta_title || title,
			meta_description,
			featured_image,
			category: category || 'General',
			tags,
			read_time: calculateReadTime(content),
			updated_at: new Date()
		};

		// Set published_at if status changes to 'published' and it wasn't published before
		if (status === 'published' && existingPost.status !== 'published') {
			updateData.published_at = new Date();
		}

		// Clear published_at if status changes from published to draft/archived
		if (status !== 'published' && existingPost.status === 'published') {
			updateData.published_at = undefined;
		}

		const updatedPost = await (BlogPost as any).findByIdAndUpdate(postId, updateData, { new: true });

		// Log update action
		await (AdminAuditLog as any).create({
			actor_id: adminUser._id,
			action: 'UPDATE_BLOG_POST',
			action_type: 'update',
			resource_type: 'blog_post',
			target_type: 'BlogPost',
			target_id: postId,
			resource_id: postId,
			changes: { 
				title, 
				status,
				category,
				read_time: updateData.read_time,
				has_auto_excerpt: !formData.get('excerpt'),
				has_auto_meta_description: !formData.get('meta_description'),
				tags_updated: tags.length !== existingPost.tags?.length
			},
			ip_address: 'server-action',
			user_agent: 'server-action'
		});

		revalidatePath('/admin/blogs');
		revalidatePath('/blog');
		revalidatePath(`/blog/${updatedPost.slug}`);

		return { 
			success: true, 
			message: 'Blog post updated successfully',
			data: {
				auto_generated: {
					excerpt: !formData.get('excerpt'),
					meta_description: !formData.get('meta_description')
				}
			}
		};

	} catch (error) {
		console.error('Update blog post error:', error);
		return { success: false, message: 'Failed to update blog post' };
	}
}

/**
 * Deletes a blog post.
 * Requires admin privileges.
 * @param postId - The ID of the post to delete.
 * @returns A success or failure object.
 */
export async function deleteBlogPost(postId: string) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const post = await (BlogPost as any).findById(postId);
		if (!post) {
			return { success: false, message: 'Blog post not found' };
		}

		// If this blog post was created from a user content submission, unlink it
		if (post.source_submission_id) {
			await (UserContent as any).findByIdAndUpdate(post.source_submission_id, {
				$unset: { blog_post_id: 1 },
				status: 'approved' // Keep it approved but unlinked
			});
		}

		await (BlogPost as any).findByIdAndDelete(postId);

		// Log deletion action
		await (AdminAuditLog as any).create({
			actor_id: adminUser._id,
			action: 'DELETE_BLOG_POST',
			action_type: 'delete',
			resource_type: 'blog_post',
			target_type: 'BlogPost',
			target_id: postId,
			resource_id: postId,
			changes: { 
				title: post.title,
				had_source_submission: !!post.source_submission_id
			},
			ip_address: 'server-action',
			user_agent: 'server-action'
		});

		revalidatePath('/admin/blogs');
		revalidatePath('/blog');

		return { success: true, message: 'Blog post deleted successfully' };

	} catch (error) {
		console.error('Delete blog post error:', error);
		return { success: false, message: 'Failed to delete blog post' };
	}
}

/**
 * Fetches a list of blog posts for admin view with pagination and optional search.
 * Requires admin privileges.
 */
export async function getBlogPosts(page: number = 1, limit: number = 10, search?: string, status?: string) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const skip = (page - 1) * limit;
		const query: any = {};

		if (search) {
			// Case-insensitive search across title, content, and tags
			query.$or = [
				{ title: { $regex: search, $options: 'i' } },
				{ content: { $regex: search, $options: 'i' } },
				{ excerpt: { $regex: search, $options: 'i' } },
				{ tags: { $in: [new RegExp(search, 'i')] } },
				{ category: { $regex: search, $options: 'i' } }
			];
		}

		if (status && status !== 'all') {
			query.status = status;
		}

		const [posts, total] = await Promise.all([
			(BlogPost as any).find(query)
				.populate('author', 'username email')
				.populate('source_submission_id', 'title user content_type') // Populate source submission
				.sort({ created_at: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			(BlogPost as any).countDocuments(query)
		]);

		// Convert payment amounts from cents to KSH for display
		const serializedPosts = posts.map((post: any) => {
			const serialized = serializeDocument(post);
			if (serialized.metadata?.payment_amount) {
				serialized.metadata.payment_amount = centsToKsh(serialized.metadata.payment_amount);
			}
			return serialized;
		});

		return {
			success: true,
			data: serializedPosts,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			},
			message: 'Blog posts fetched successfully'
		};

	} catch (error) {
		console.error('Get blog posts error:', error);
		return { success: false, message: 'Failed to fetch blog posts' };
	}
}

/**
 * Fetches a single blog post by ID for admin editing.
 * Requires admin privileges.
 */
export async function getBlogPostById(postId: string) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const post = await (BlogPost as any).findById(postId)
			.populate('author', 'username email')
			.populate('source_submission_id', 'title user content_type task_category') // Populate source submission details
			.lean();
			
		if (!post) {
			return { success: false, message: 'Blog post not found' };
		}
		
		// Convert payment amounts from cents to KSH for display
		const serializedPost = serializeDocument(post);
		if (serializedPost.metadata?.payment_amount) {
			serializedPost.metadata.payment_amount = centsToKsh(serializedPost.metadata.payment_amount);
		}

		return { success: true, data: serializedPost, message: 'Blog post fetched successfully' };

	} catch (error) {
		console.error('Get blog post error:', error);
		return { success: false, message: 'Failed to fetch blog post' };
	}
}

/**
 * Fetches published blog posts for public view with pagination and optional filtering.
 * No authentication required.
 */
export async function getPublishedBlogPosts(page: number = 1, limit: number = 10, category?: string, tag?: string) {
	try {
		await connectToDatabase();

		const skip = (page - 1) * limit;
		const query: any = { 
			status: 'published',
			published_at: { $lte: new Date() }
		};

		if (category) {
			query.category = category;
		}

		if (tag) {
			query.tags = tag;
		}

		const [posts, total] = await Promise.all([
			(BlogPost as any).find(query)
				.populate('author', 'username')
				.select('-content') // Don't include full content in list view
				.sort({ published_at: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			(BlogPost as any).countDocuments(query)
		]);

		const serializedPosts = posts.map(serializeDocument);

		return {
			success: true,
			data: serializedPosts,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			},
			message: 'Published blog posts fetched successfully'
		};

	} catch (error) {
		console.error('Get published blog posts error:', error);
		return { success: false, message: 'Failed to fetch blog posts' };
	}
}

/**
 * Fetches a single published blog post by slug for public view.
 * No authentication required.
 */
export async function getPublishedBlogPostBySlug(slug: string) {
	try {
		await connectToDatabase();

		const post = await (BlogPost as any).findOne({ 
			slug, 
			status: 'published',
			published_at: { $lte: new Date() }
		})
		.populate('author', 'username')
		.populate('source_submission_id', 'title user content_type') // Populate source for attribution
		.lean();
			
		if (!post) {
			return { success: false, message: 'Blog post not found' };
		}
		
		const serializedPost = serializeDocument(post);

		return { success: true, data: serializedPost, message: 'Blog post fetched successfully' };

	} catch (error) {
		console.error('Get published blog post error:', error);
		return { success: false, message: 'Failed to fetch blog post' };
	}
}

/**
 * Archives a blog post (soft delete).
 * Requires admin privileges.
 */
export async function archiveBlogPost(postId: string) {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const post = await (BlogPost as any).findByIdAndUpdate(
			postId, 
			{ 
				status: 'archived',
				updated_at: new Date()
			}, 
			{ new: true }
		);

		if (!post) {
			return { success: false, message: 'Blog post not found' };
		}

		// Log archiving action
		await (AdminAuditLog as any).create({
			actor_id: adminUser._id,
			action: 'UPDATE_BLOG_POST',
			action_type: 'update',
			resource_type: 'blog_post',
			target_type: 'BlogPost',
			target_id: postId,
			resource_id: postId,
			changes: { 
				status: 'archived',
				title: post.title
			},
			ip_address: 'server-action',
			user_agent: 'server-action'
		});

		revalidatePath('/admin/blogs');
		revalidatePath('/blog');

		return { success: true, message: 'Blog post archived successfully' };

	} catch (error) {
		console.error('Archive blog post error:', error);
		return { success: false, message: 'Failed to archive blog post' };
	}
}

/**
 * Gets blog post statistics for admin dashboard.
 * Requires admin privileges.
 */
export async function getBlogStats() {
	try {
		// V5 Update: Use the 'auth' function to get the session
		const session = await auth();
		
		if (!session?.user?.email) {
			return { success: false, message: 'Unauthorized' };
		}

		await connectToDatabase();
		const adminUser = await (Profile as any).findOne({ email: session.user.email });
		
		if (adminUser?.role !== 'admin') {
			return { success: false, message: 'Admin access required' };
		}

		const stats = await (BlogPost as any).aggregate([
			{
				$group: {
					_id: '$status',
					count: { $sum: 1 }
				}
			}
		]);

		const totalPosts = await (BlogPost as any).countDocuments();
		const publishedPosts = await (BlogPost as any).countDocuments({ status: 'published' });
		const postsThisMonth = await (BlogPost as any).countDocuments({
			created_at: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
		});

		const categories = await (BlogPost as any).aggregate([
			{ $match: { category: { $exists: true, $ne: '' } } },
			{ $group: { _id: '$category', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
			{ $limit: 10 }
		]);

		return {
			success: true,
			data: {
				total: totalPosts,
				published: publishedPosts,
				draft: stats.find((s: any) => s._id === 'draft')?.count || 0,
				archived: stats.find((s: any) => s._id === 'archived')?.count || 0,
				thisMonth: postsThisMonth,
				categories
			},
			message: 'Blog stats fetched successfully'
		};

	} catch (error) {
		console.error('Get blog stats error:', error);
		return { success: false, message: 'Failed to fetch blog statistics' };
	}
}

