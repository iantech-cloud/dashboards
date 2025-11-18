import { NextResponse } from 'next/server';
import { connectToDatabase, BlogPost } from '@/app/lib/models';

export async function POST() {
  try {
    await connectToDatabase();
    
    const posts = await BlogPost.find({});
    let fixedCount = 0;
    
    for (const post of posts) {
      let content = post.content;
      let hasChanges = false;
      
      // Remove empty anchors
      const originalContent = content;
      content = content.replace(/<a\s+(?![^>]*href\s*=\s*["'][^"']+["'])[^>]*>(.*?)<\/a>/gi, '$1');
      
      // Fix target="_new"
      content = content.replace(/target=["']_new["']/gi, 'target="_blank"');
      
      // Remove data-start and data-end
      content = content.replace(/\s*data-start=["'][^"']*["']/gi, '');
      content = content.replace(/\s*data-end=["'][^"']*["']/gi, '');
      
      // Remove cursor-pointer
      content = content.replace(/\s*class=["'][^"']*cursor-pointer[^"']*["']/gi, '');
      
      hasChanges = content !== originalContent;
      
      if (hasChanges) {
        post.content = content;
        await post.save();
        fixedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${fixedCount} out of ${posts.length} blog posts`
    });
  } catch (error) {
    console.error('Error fixing links:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fix links'
    }, { status: 500 });
  }
}
