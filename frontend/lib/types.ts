export type Direction = "inbound" | "outbound"

export type Carrier = "FedEx" | "UPS" | "DHL" | "USPS" | "Amazon" | "OnTrac" | "Other"

export interface ScanRecord {
  id: string
  itemId: string
  timestamp: string
  gateLocation: "Gate A" | "Gate B"
  direction: Direction
  receiver: string
  intendedFor?: string
  description?: string
  photos: string[]
  ticketNumber?: string
  trackingNumber?: string
  carrier?: Carrier
  quantity: number
}

export interface GateInfo {
  id: string
  name: "Gate A" | "Gate B"
  status: "active" | "inactive"
}
