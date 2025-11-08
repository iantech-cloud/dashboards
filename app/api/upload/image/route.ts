// app/api/upload/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = (formData.get('altText') as string) || 'Image';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-').substring(0, 50);
    
    // Optimize and convert to WebP
    const optimizedWebP = await sharp(imageBuffer)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    const webpName = `${timestamp}-${randomStr}-${sanitizedName.replace(/\.[^.]+$/, '.webp')}`;

    // Upload to Vercel Blob
    const blob = await put(webpName, optimizedWebP, {
      access: 'public',
      contentType: 'image/webp',
    });

    // Create JPG fallback
    const optimizedJpg = await sharp(imageBuffer)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    const jpgName = `${timestamp}-${randomStr}-${sanitizedName.replace(/\.[^.]+$/, '.jpg')}`;
    const jpgBlob = await put(jpgName, optimizedJpg, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    // Create thumbnail
    const thumbnail = await sharp(imageBuffer)
      .resize(300, 200, {
        fit: 'cover',
      })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbName = `${timestamp}-${randomStr}-thumb.webp`;
    const thumbBlob = await put(thumbName, thumbnail, {
      access: 'public',
      contentType: 'image/webp',
    });

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: {
        url: blob.url,
        jpgUrl: jpgBlob.url,
        thumbnailUrl: thumbBlob.url,
        altText: altText,
        html: `
          <picture>
            <source srcset="${blob.url}" type="image/webp">
            <img src="${jpgBlob.url}" alt="${altText.replace(/"/g, '&quot;')}" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;">
          </picture>
        `,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to upload image',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
