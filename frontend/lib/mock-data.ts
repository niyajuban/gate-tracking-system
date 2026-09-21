import type { ScanRecord, GateInfo, Carrier } from "./types"

// Gate configurations
export const gates: GateInfo[] = [
  { id: "gate-1", name: "Gate A", status: "active" },
  { id: "gate-2", name: "Gate B", status: "active" },
]

// Carrier options
const carriers: Carrier[] = ["FedEx", "UPS", "DHL", "USPS", "Amazon", "OnTrac", "Other"]

// Helper to generate random timestamps within the last 30 days
function randomTimestamp(): string {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * 30)
  const hoursAgo = Math.floor(Math.random() * 24)
  const minutesAgo = Math.floor(Math.random() * 60)
  const date = new Date(
    now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000 - minutesAgo * 60 * 1000
  )
  return date.toISOString()
}

// Helper to generate random tracking number
function generateTrackingNumber(carrier: Carrier): string | undefined {
  if (Math.random() > 0.6) return undefined // 40% chance of no tracking number
  
  const prefix = {
    FedEx: "7489",
    UPS: "1Z999AA",
    DHL: "JD01",
    USPS: "9400",
    Amazon: "TBA",
    OnTrac: "D100",
    Other: "TRK",
  }[carrier]
  
  return `${prefix}${Math.floor(Math.random() * 90000000) + 10000000}`
}

// Helper to generate random photos for inbound (1-5)
function generateInboundPhotos(seed: number): string[] {
  const photoCount = Math.floor(Math.random() * 5) + 1 // 1-5
  return Array.from({ length: photoCount }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/400/300`)
}

// Helper to generate random photos for outbound (1-10)
function generateOutboundPhotos(seed: number): string[] {
  const photoCount = Math.floor(Math.random() * 10) + 1 // 1-10
  return Array.from({ length: photoCount }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/400/300`)
}

// Sample data arrays
const receivers = ["John Smith", "Maria Garcia", "David Chen", "Sarah Johnson", "Michael Brown", "Emily Davis"]
const intendedForOptions = ["Warehouse A", "Production", "Quality Control", "Shipping", "Assembly Line", "Storage B"]
const descriptions = [
  "Electronic Components - PCB Boards",
  "Raw Materials - Steel Rods",
  "Packaging Supplies - Boxes",
  "Machine Parts - Bearings",
  "Chemical Supplies - Adhesives",
  "Office Equipment - Monitors",
  "Safety Gear - Helmets",
  "Spare Parts - Motors",
  "Cleaning Supplies",
  "Assembly Components - Screws",
]

// Generate mock inbound records (carrier is MANDATORY for inbound)
export const mockInboundRecords: ScanRecord[] = Array.from({ length: 50 }, (_, i) => {
  const carrier = carriers[Math.floor(Math.random() * carriers.length)]
  return {
    id: `inb-${String(i + 1).padStart(4, "0")}`,
    itemId: `BOX-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    timestamp: randomTimestamp(),
    gateLocation: gates[Math.floor(Math.random() * gates.length)].name,
    direction: "inbound" as const,
    receiver: receivers[Math.floor(Math.random() * receivers.length)],
    intendedFor: Math.random() > 0.3 ? intendedForOptions[Math.floor(Math.random() * intendedForOptions.length)] : undefined,
    description: Math.random() > 0.2 ? descriptions[Math.floor(Math.random() * descriptions.length)] : undefined,
    photos: generateInboundPhotos(i),
    ticketNumber: Math.random() > 0.4 ? `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}` : undefined,
    trackingNumber: generateTrackingNumber(carrier),
    carrier: carrier, // Mandatory for inbound
    quantity: Math.floor(Math.random() * 20) + 1,
  }
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

// Generate mock outbound records (carrier is OPTIONAL for outbound)
export const mockOutboundRecords: ScanRecord[] = Array.from({ length: 45 }, (_, i) => {
  const hasCarrier = Math.random() > 0.4 // 60% chance of having carrier
  const carrier = hasCarrier ? carriers[Math.floor(Math.random() * carriers.length)] : undefined
  return {
    id: `out-${String(i + 1).padStart(4, "0")}`,
    itemId: `BOX-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    timestamp: randomTimestamp(),
    gateLocation: gates[Math.floor(Math.random() * gates.length)].name,
    direction: "outbound" as const,
    receiver: receivers[Math.floor(Math.random() * receivers.length)],
    intendedFor: Math.random() > 0.3 ? intendedForOptions[Math.floor(Math.random() * intendedForOptions.length)] : undefined,
    description: Math.random() > 0.2 ? descriptions[Math.floor(Math.random() * descriptions.length)] : undefined,
    photos: generateOutboundPhotos(i + 100),
    ticketNumber: Math.random() > 0.4 ? `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}` : undefined,
    trackingNumber: carrier ? generateTrackingNumber(carrier) : undefined,
    carrier: carrier, // Optional for outbound
    quantity: Math.floor(Math.random() * 50) + 1,
  }
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

// API simulation functions (can be replaced with real API calls later)
export async function fetchInboundRecords(): Promise<ScanRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockInboundRecords
}

export async function fetchOutboundRecords(): Promise<ScanRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockOutboundRecords
}

export async function fetchAllRecords(): Promise<ScanRecord[]> {
  const [inbound, outbound] = await Promise.all([fetchInboundRecords(), fetchOutboundRecords()])
  return [...inbound, ...outbound].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
