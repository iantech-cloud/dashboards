// app/api/upload/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
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
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP.' },
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
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const baseName = `${timestamp}-${randomStr}-${originalName}`;
    const webpName = baseName.replace(/\.[^.]+$/, '.webp');
    const jpgName = baseName.replace(/\.[^.]+$/, '.jpg');

    // Ensure upload directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'blog-images');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Optimize and convert to WebP (primary format for web)
    const optimizedWebP = await sharp(imageBuffer)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    const webpPath = join(uploadsDir, webpName);
    await writeFile(webpPath, optimizedWebP);

    // Also create a JPEG fallback (for older browsers)
    const optimizedJpg = await sharp(imageBuffer)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    const jpgPath = join(uploadsDir, jpgName);
    await writeFile(jpgPath, optimizedJpg);

    // Create thumbnail for preview (300x200)
    const thumbnailName = baseName.replace(/\.[^.]+$/, '-thumb.webp');
    const thumbnail = await sharp(imageBuffer)
      .resize(300, 200, {
        fit: 'cover',
      })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbPath = join(uploadsDir, thumbnailName);
    await writeFile(thumbPath, thumbnail);

    // Return URLs
    const baseUrl = `/uploads/blog-images`;
    const webpUrl = `${baseUrl}/${webpName}`;
    const jpgUrl = `${baseUrl}/${jpgName}`;
    const thumbUrl = `${baseUrl}/${thumbnailName}`;

    return NextResponse.json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: {
        url: webpUrl,
        jpgUrl: jpgUrl,
        thumbnailUrl: thumbUrl,
        altText: altText,
        html: `
          <picture>
            <source srcset="${webpUrl}" type="image/webp">
            <img src="${jpgUrl}" alt="${altText.replace(/"/g, '&quot;')}" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;">
          </picture>
        `,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
