"use client"

import { useState } from "react"
import { ArrowDownToLine, ArrowUpFromLine, Download, Cloud, CheckCircle, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { fetchAllRecords, syncToCloud, syncToLocal } from "@/lib/api"
import * as XLSX from "xlsx"
import { format } from "date-fns"

interface DashboardHeaderProps {
  inboundCount: number
  outboundCount: number
}

export function DashboardHeader({ inboundCount, outboundCount }: DashboardHeaderProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isSyncingCloud, setIsSyncingCloud] = useState(false)
  const [isSyncingLocal, setIsSyncingLocal] = useState(false)
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null)
  const [lastLocalSync, setLastLocalSync] = useState<Date | null>(null)

  const handleDownloadExcel = async () => {
    setIsExporting(true)
    try {
      const records = await fetchAllRecords()
      
      const worksheetData = records.map((record) => ({
        "Record ID": record.id,
        "Item ID": record.itemId,
        "Timestamp": format(new Date(record.timestamp), "yyyy-MM-dd HH:mm:ss"),
        "Direction": record.direction,
        "Gate Location": record.gateLocation,
        "Quantity": record.quantity || 1,
        "Carrier": record.carrier || "",
        "Tracking Number": record.trackingNumber || "",
        "Receiver": record.receiver,
        "Intended For": record.intendedFor || "",
        "Ticket Number": record.ticketNumber || "",
        "Description": record.description || "",
        "Photos Count": record.photos.length,
        "Photo URLs": record.photos.join("; "),
      }))

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Scan Records")

      // Auto-size columns
      const columnWidths = [
        { wch: 36 }, // Record ID
        { wch: 20 }, // Item ID
        { wch: 20 }, // Timestamp
        { wch: 10 }, // Direction
        { wch: 12 }, // Gate Location
        { wch: 8 },  // Quantity
        { wch: 10 }, // Carrier
        { wch: 24 }, // Tracking Number
        { wch: 20 }, // Receiver
        { wch: 20 }, // Intended For
        { wch: 15 }, // Ticket Number
        { wch: 30 }, // Description
        { wch: 12 }, // Photos Count
        { wch: 50 }, // Photo URLs
      ]
      worksheet["!cols"] = columnWidths

      const filename = `warehouse_backup_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      console.error("Failed to export Excel:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true)
    try {
      await syncToCloud()
      setLastCloudSync(new Date())
    } catch (error) {
      console.error("Failed to sync to cloud:", error)
    } finally {
      setIsSyncingCloud(false)
    }
  }

  const handleSyncToLocal = async () => {
    setIsSyncingLocal(true)
    try {
      await syncToLocal()
      setLastLocalSync(new Date())
    } catch (error) {
      console.error("Failed to sync to local:", error)
    } finally {
      setIsSyncingLocal(false)
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <img src="/greyorange_logo.jpg" alt="GreyOrange" className="h-10 w-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">GreyOrange</h1>
              <p className="text-xs text-muted-foreground">Gate Tracking System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-inbound/10">
              <ArrowDownToLine className="h-4 w-4 text-inbound" />
            </div>
            <div className="text-sm">
              <p className="font-medium">{inboundCount}</p>
              <p className="text-xs text-muted-foreground">Inbound</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-outbound/10">
              <ArrowUpFromLine className="h-4 w-4 text-outbound" />
            </div>
            <div className="text-sm">
              <p className="font-medium">{outboundCount}</p>
              <p className="text-xs text-muted-foreground">Outbound</p>
            </div>
          </div>

          {/* Backup Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Backup</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Data Backup Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadExcel} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSyncToCloud} disabled={isSyncingCloud}>
                {isSyncingCloud ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : lastCloudSync ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Cloud className="mr-2 h-4 w-4" />
                )}
                <div className="flex flex-col">
                  <span>Sync to Cloud</span>
                  {lastCloudSync && (
                    <span className="text-xs text-muted-foreground">
                      Last: {format(lastCloudSync, "HH:mm:ss")}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSyncToLocal} disabled={isSyncingLocal}>
                {isSyncingLocal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : lastLocalSync ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                <div className="flex flex-col">
                  <span>Sync to Local Server</span>
                  {lastLocalSync && (
                    <span className="text-xs text-muted-foreground">
                      Last: {format(lastLocalSync, "HH:mm:ss")}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
