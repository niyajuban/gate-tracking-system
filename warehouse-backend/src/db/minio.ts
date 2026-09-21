import * as Minio from 'minio'

const BUCKET = process.env.MINIO_BUCKET || 'warehouse-photos'

export const minioClient = new Minio.Client({
  endPoint:  process.env.MINIO_ENDPOINT  || 'localhost',
  port:      parseInt(process.env.MINIO_PORT || '9000'),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
})

export async function initMinio(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1')
    console.log(`[MinIO] Created bucket: ${BUCKET}`)
  } else {
    console.log(`[MinIO] Bucket exists: ${BUCKET}`)
  }

  // Set public read policy so photos are accessible by the browser
  const policy = JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      },
    ],
  })
  await minioClient.setBucketPolicy(BUCKET, policy)
  console.log('[MinIO] Public read policy set')
}

export async function uploadPhoto(
  objectName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  })
  // Return the URL path that Nginx will proxy
  return `/photos/${objectName}`
}

export async function deletePhoto(objectName: string): Promise<void> {
  await minioClient.removeObject(BUCKET, objectName)
}

const BACKUP_BUCKET = process.env.MINIO_BACKUP_BUCKET || 'warehouse-backups'

export async function uploadBackupToCloud(
  objectName: string,
  buffer: Buffer
): Promise<string> {
  // Ensure backup bucket exists
  const exists = await minioClient.bucketExists(BACKUP_BUCKET)
  if (!exists) {
    await minioClient.makeBucket(BACKUP_BUCKET, 'us-east-1')
    console.log(`[MinIO] Created backup bucket: ${BACKUP_BUCKET}`)
  }

  await minioClient.putObject(BACKUP_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  
  console.log(`[MinIO] Backup uploaded: ${objectName}`)
  return `/${BACKUP_BUCKET}/${objectName}`
}
