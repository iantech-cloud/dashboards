// app/api/content/submissions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ContentSubmission from '@/models/ContentSubmission';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // Find the submission and populate approved_by if it exists
    const submission = await ContentSubmission.findOne({
      _id: submissionId,
      user_id: session.user.id
    }).populate('approved_by', 'username name email');

    if (!submission) {
      return NextResponse.json(
        { success: false, message: 'Submission not found' },
        { status: 404 }
      );
    }

    // Format the response
    const submissionData = {
      _id: submission._id.toString(),
      title: submission.title,
      content_type: submission.content_type,
      content_text: submission.content_text,
      status: submission.status,
      payment_status: submission.payment_status,
      payment_amount: submission.payment_amount,
      submission_date: submission.submission_date.toISOString(),
      task_category: submission.task_category,
      admin_feedback: submission.admin_feedback,
      revision_notes: submission.revision_notes,
      word_count: submission.word_count,
      tags: submission.tags || [],
      attachments: submission.attachments || [],
      user_id: submission.user_id,
      approved_at: submission.approved_at?.toISOString(),
      approved_by: submission.approved_by ? {
        _id: submission.approved_by._id.toString(),
        username: submission.approved_by.username,
        name: submission.approved_by.name,
        email: submission.approved_by.email
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: submissionData
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
