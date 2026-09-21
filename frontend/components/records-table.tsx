"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { Search, Filter, ChevronDown, ChevronUp, Image as ImageIcon, ExternalLink, Package } from "lucide-react"
import type { ScanRecord } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type SortField = "timestamp" | "itemId" | "gateLocation" | "receiver" | "intendedFor" | "quantity" | "carrier"
type SortDirection = "asc" | "desc"

interface RecordsTableProps {
  records: ScanRecord[]
  title: string
  direction: "inbound" | "outbound"
  isLoading?: boolean
}

export function RecordsTable({ records, title, direction, isLoading }: RecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [gateFilter, setGateFilter] = useState<string>("all")
  const [carrierFilter, setCarrierFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Get unique gates for filter
  const uniqueGates = useMemo(() => {
    const gates = new Set(records.map((r) => r.gateLocation))
    return Array.from(gates).sort()
  }, [records])

  // Get unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    const carriers = new Set(records.map((r) => r.carrier).filter(Boolean))
    return Array.from(carriers).sort()
  }, [records])

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let result = records

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (record) =>
          record.itemId.toLowerCase().includes(query) ||
          record.receiver.toLowerCase().includes(query) ||
          (record.intendedFor && record.intendedFor.toLowerCase().includes(query)) ||
          (record.description && record.description.toLowerCase().includes(query)) ||
          (record.ticketNumber && record.ticketNumber.toLowerCase().includes(query)) ||
          (record.trackingNumber && record.trackingNumber.toLowerCase().includes(query)) ||
          (record.carrier && record.carrier.toLowerCase().includes(query))
      )
    }

    // Apply gate filter
    if (gateFilter !== "all") {
      result = result.filter((record) => record.gateLocation === gateFilter)
    }

    // Apply carrier filter
    if (carrierFilter !== "all") {
      result = result.filter((record) => record.carrier === carrierFilter)
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "timestamp":
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case "itemId":
          comparison = a.itemId.localeCompare(b.itemId)
          break
        case "gateLocation":
          comparison = a.gateLocation.localeCompare(b.gateLocation)
          break
        case "receiver":
          comparison = a.receiver.localeCompare(b.receiver)
          break
        case "intendedFor":
          comparison = (a.intendedFor || "").localeCompare(b.intendedFor || "")
          break
        case "quantity":
          comparison = (a.quantity || 0) - (b.quantity || 0)
          break
        case "carrier":
          comparison = (a.carrier || "").localeCompare(b.carrier || "")
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [records, searchQuery, gateFilter, carrierFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    )
  }

  const directionColor = direction === "inbound" ? "bg-inbound text-inbound-foreground" : "bg-outbound text-outbound-foreground"

  return (
    <div className="flex flex-col gap-4">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge className={directionColor}>{filteredRecords.length} records</Badge>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, tracking, carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>

          <Select value={gateFilter} onValueChange={setGateFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Gates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gates</SelectItem>
              {uniqueGates.map((gate) => (
                <SelectItem key={gate} value={gate}>
                  {gate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {uniqueCarriers.length > 0 && (
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <Package className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {uniqueCarriers.map((carrier) => (
                  <SelectItem key={carrier} value={carrier as string}>
                    {carrier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>
                <button
                  onClick={() => handleSort("itemId")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Item ID
                  <SortIcon field="itemId" />
                </button>
              </TableHead>
              <TableHead>Ticket #</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("quantity")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Qty
                  <SortIcon field="quantity" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("carrier")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Carrier
                  <SortIcon field="carrier" />
                </button>
              </TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("timestamp")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Timestamp
                  <SortIcon field="timestamp" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("gateLocation")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Gate
                  <SortIcon field="gateLocation" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("receiver")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Receiver
                  <SortIcon field="receiver" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("intendedFor")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Intended For
                  <SortIcon field="intendedFor" />
                </button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Photos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-muted-foreground">Loading records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm font-medium">{record.itemId}</TableCell>
                  <TableCell className="text-sm">
                    {record.ticketNumber ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {record.ticketNumber}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {record.quantity || 1}
                  </TableCell>
                  <TableCell className="text-sm">
                    {record.carrier ? (
                      <Badge variant="outline" className="text-xs">
                        {record.carrier}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {record.trackingNumber ? (
                      <span className="text-xs">{record.trackingNumber}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span>{format(new Date(record.timestamp), "MMM d, yyyy")}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(record.timestamp), "HH:mm:ss")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {record.gateLocation}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{record.receiver}</TableCell>
                  <TableCell className="text-sm">
                    {record.intendedFor ? record.intendedFor : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-sm" title={record.description || ""}>
                    {record.description ? record.description : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {record.photos.length > 0 ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ImageIcon className="h-4 w-4 text-primary" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Photos - {record.itemId} ({record.photos.length})</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-3">
                            {record.photos.map((photo, idx) => (
                              <div key={idx} className="overflow-hidden rounded-md group relative">
                                <img
                                  src={photo}
                                  alt={`Photo ${idx + 1} for ${record.itemId}`}
                                  className="h-48 w-full object-cover"
                                  crossOrigin="anonymous"
                                />
                                <a
                                  href={photo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hidden group-hover:flex absolute top-2 right-2 h-8 w-8 items-center justify-center rounded bg-black/50 hover:bg-black/70 text-white"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {!isLoading && filteredRecords.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} records
        </div>
      )}
    </div>
  )
}
