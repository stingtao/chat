import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/lib/cloudflare';
import {
  generateRandomString,
  sanitizeFileExtension,
  sanitizeStoragePathSegment,
} from '@/lib/utils';
import { authenticateNextRequestTypes } from '@/lib/session';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    const payload = await authenticateNextRequestTypes(request, ['client', 'host']);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Empty files are not allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = generateRandomString(20);
    const safeExtension = sanitizeFileExtension(file.name, file.type);
    const userSegment = sanitizeStoragePathSegment(payload.userId);
    const fileName = `${userSegment}/${timestamp}-${randomString}.${safeExtension}`;

    // Get R2 bucket from environment
    const storage = env?.STORAGE;
    if (!storage) {
      return NextResponse.json(
        { success: false, error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await storage.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    // Generate public URL
    const publicBaseUrl = env?.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL;
    if (!publicBaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Public storage URL not configured' },
        { status: 500 }
      );
    }
    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        fileName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
