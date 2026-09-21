'use client'

import { useCallback, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoUploadProps {
  maxPhotos: number
  onPhotosChange: (files: File[]) => void
  direction: 'inbound' | 'outbound'
}

export function PhotoUpload({ maxPhotos, onPhotosChange, direction }: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isDragActive, setIsDragActive] = useState(false)

  const generatePreviews = useCallback((fileArray: File[]) => {
    const newPreviews: string[] = []
    fileArray.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === fileArray.length) {
          setPreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const newFiles = Array.from(fileList)
      const combined = [...files, ...newFiles].slice(0, maxPhotos)
      setFiles(combined)
      generatePreviews(combined)
      onPhotosChange(combined)
    },
    [files, maxPhotos, generatePreviews, onPhotosChange]
  )

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removePhoto = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
    onPhotosChange(newFiles)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Photos ({direction === 'inbound' ? '1-5' : '1-10'} required)
        </label>
        <span className="text-xs text-muted-foreground">
          {files.length} / {maxPhotos}
        </span>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          disabled={files.length >= maxPhotos}
          className="hidden"
          id="photo-input"
        />
        <label
          htmlFor="photo-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {files.length >= maxPhotos
                ? `Maximum ${maxPhotos} photos reached`
                : 'Drag photos here or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground">
              {files.length >= maxPhotos ? 'Remove photos to add more' : 'JPEG, PNG up to 10MB each'}
            </p>
          </div>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-4 w-4 text-white" />
                <span className="text-xs text-white">Delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          No photos yet. Upload at least 1 to continue.
        </p>
      )}
    </div>
  )
}
