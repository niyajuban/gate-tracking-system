import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// Use memory storage — files are forwarded to MinIO, not stored on disk
const storage = multer.memoryStorage()

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG and PNG are allowed.`))
  }
}

// Accept up to 10 files (outbound max); route handlers enforce direction-specific limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10,
  },
})
