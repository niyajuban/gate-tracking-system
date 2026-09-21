'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PhotoUpload } from '@/components/photo-upload'
import { AlertCircle, CheckCircle, Plus } from 'lucide-react'
import { submitScan } from '@/lib/api'
import type { ScanRecord, Carrier } from '@/lib/types'

const CARRIERS: Carrier[] = ["FedEx", "UPS", "DHL", "USPS", "Amazon", "OnTrac", "Other"]

export function EntryForm() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newRecordId, setNewRecordId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound')

  // Gate is derived from URL query param — operators never pick it manually
  const gateParam = searchParams.get('gate')
  const gate: 'Gate A' | 'Gate B' =
    gateParam?.toUpperCase() === 'B' ? 'Gate B' : 'Gate A'

  const maxPhotos = direction === 'inbound' ? 5 : 10
  const minPhotos = 1

  const [formData, setFormData] = useState({
    itemId: '',
    receiver: '',
    ticketNumber: '',
    intendedFor: '',
    description: '',
    trackingNumber: '',
    carrier: '' as Carrier | '',
    quantity: '',
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.itemId.trim()) {
      newErrors.itemId = 'Barcode/Item ID is required'
    }
    if (!formData.receiver.trim()) {
      newErrors.receiver = 'Receiver name is required'
    }
    if (!formData.quantity.trim() || parseInt(formData.quantity) < 1) {
      newErrors.quantity = 'Quantity is required and must be at least 1'
    }
    // Carrier is mandatory for inbound
    if (direction === 'inbound' && !formData.carrier) {
      newErrors.carrier = 'Carrier is required for inbound shipments'
    }
    if (photos.length < minPhotos) {
      newErrors.photos = `At least ${minPhotos} photo is required`
    }
    if (photos.length > maxPhotos) {
      newErrors.photos = `Maximum ${maxPhotos} photos allowed`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('itemId', formData.itemId)
      fd.append('receiver', formData.receiver)
      fd.append('gateLocation', gate)
      fd.append('direction', direction)
      fd.append('quantity', formData.quantity)
      if (formData.ticketNumber) fd.append('ticketNumber', formData.ticketNumber)
      if (formData.intendedFor)  fd.append('intendedFor',  formData.intendedFor)
      if (formData.description)  fd.append('description',  formData.description)
      if (formData.trackingNumber) fd.append('trackingNumber', formData.trackingNumber)
      if (formData.carrier) fd.append('carrier', formData.carrier)
      photos.forEach((photo) => fd.append('photos', photo))

      const record: ScanRecord = await submitScan(fd)

      setNewRecordId(record.id)
      setSuccess(true)
      setFormData({ 
        itemId: '', 
        receiver: '', 
        ticketNumber: '', 
        intendedFor: '', 
        description: '',
        trackingNumber: '',
        carrier: '',
        quantity: '',
      })
      setPhotos([])
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Upload Successful
              </h3>
              <p className="mt-2 text-sm text-green-700 dark:text-green-200">
                Record ID: <span className="font-mono font-semibold">{newRecordId}</span>
              </p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-300">
                {gate} · {direction === 'inbound' ? 'Inbound' : 'Outbound'}
              </p>
            </div>
            <Button
              onClick={() => {
                setSuccess(false)
                setDirection('inbound')
              }}
              className="w-full gap-2 text-base"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              New Scan Entry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">New Scan Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="direction" className="text-sm font-medium">
                Direction
              </label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'inbound' | 'outbound')}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Receiving (Inbound)</SelectItem>
                  <SelectItem value="outbound">Shipping (Outbound)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gate is read-only — auto-set from URL ?gate=A or ?gate=B */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gate Location</label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-base text-muted-foreground">
                {gate}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="itemId" className="text-sm font-medium">
              Barcode / Item ID *
            </label>
            <Input
              id="itemId"
              placeholder="Scan barcode here"
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
              disabled={loading}
              autoFocus
              className="text-base"
            />
            {errors.itemId && <p className="text-xs text-destructive">{errors.itemId}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium">
                Quantity *
              </label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                disabled={loading}
                className="text-base"
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="carrier" className="text-sm font-medium">
                Carrier {direction === 'inbound' ? '*' : ''}
              </label>
              <Select 
                value={formData.carrier} 
                onValueChange={(v) => setFormData({ ...formData, carrier: v as Carrier })}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.carrier && <p className="text-xs text-destructive">{errors.carrier}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="trackingNumber" className="text-sm font-medium">
              Tracking Number
            </label>
            <Input
              id="trackingNumber"
              placeholder="e.g., 1Z999AA10123456784"
              value={formData.trackingNumber}
              onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
              disabled={loading}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="receiver" className="text-sm font-medium">
              Receiver Name *
            </label>
            <Input
              id="receiver"
              placeholder="Enter receiver name"
              value={formData.receiver}
              onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
              disabled={loading}
              className="text-base"
            />
            {errors.receiver && <p className="text-xs text-destructive">{errors.receiver}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="ticketNumber" className="text-sm font-medium">
              Ticket Number
            </label>
            <Input
              id="ticketNumber"
              placeholder="e.g., TKT-1234"
              value={formData.ticketNumber}
              onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })}
              disabled={loading}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="intendedFor" className="text-sm font-medium">
              Intended For
            </label>
            <Input
              id="intendedFor"
              placeholder="e.g., Warehouse A, Production"
              value={formData.intendedFor}
              onChange={(e) => setFormData({ ...formData, intendedFor: e.target.value })}
              disabled={loading}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Material description or special notes"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              className="resize-none text-base"
              rows={3}
            />
          </div>

          {errors.photos && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.photos}</AlertDescription>
            </Alert>
          )}

          <PhotoUpload
            maxPhotos={maxPhotos}
            direction={direction}
            onPhotosChange={setPhotos}
          />

          <Button
            type="submit"
            disabled={loading || photos.length === 0}
            className="w-full text-base"
            size="lg"
          >
            {loading ? 'Submitting…' : 'Submit Scan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
