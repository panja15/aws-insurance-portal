import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Initialize S3Client with region from environment.
// Credentials are automatically retrieved from the EC2 instance role in production,
// or from local AWS credentials/environment variables in development.
const region = process.env.AWS_REGION || 'ap-south-1';
const s3Client = new S3Client({ region });

// 10 MB maximum file size limit
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error: S3_BUCKET_NAME is not configured.',
        },
        { status: 500 }
      );
    }

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file presence
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided. Please select a file to upload.',
        },
        { status: 400 }
      );
    }

    // Validate non-empty file
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Uploaded file is empty.',
        },
        { status: 400 }
      );
    }

    // Validate file size (10 MB maximum)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'File size exceeds maximum allowed limit of 10 MB.',
        },
        { status: 400 }
      );
    }

    // Read file details
    const originalName = file.name || 'document';
    const mimeType = file.type || 'application/octet-stream';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a safe, collision-resistant S3 object key
    const sanitizedFileName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
    const uniqueId = crypto.randomUUID();
    const s3Key = `uploads/${uniqueId}-${sanitizedFileName}`;

    // Upload object to Amazon S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        fileName: originalName,
        s3Key: s3Key,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error occurred.';
    console.error('S3 Upload Error:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: 'File upload failed. ' + errorMessage,
      },
      { status: 500 }
    );
  }
}
