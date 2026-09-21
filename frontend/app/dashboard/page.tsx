"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { RecordsTable } from "@/components/records-table"
import { fetchInboundRecords, fetchOutboundRecords, connectDashboardSocket } from "@/lib/api"
import type { ScanRecord } from "@/lib/types"

export default function DashboardPage() {
  const [inboundRecords, setInboundRecords]   = useState<ScanRecord[]>([])
  const [outboundRecords, setOutboundRecords] = useState<ScanRecord[]>([])
  const [isLoadingInbound, setIsLoadingInbound]   = useState(true)
  const [isLoadingOutbound, setIsLoadingOutbound] = useState(true)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  // Prepend new scan received via WebSocket to the correct list
  const handleNewScan = useCallback((record: ScanRecord) => {
    if (record.direction === "inbound") {
      setInboundRecords((prev) => [record, ...prev])
    } else {
      setOutboundRecords((prev) => [record, ...prev])
    }
    setLastSynced(new Date())
  }, [])

  useEffect(() => {
    setMounted(true)
    setLastSynced(new Date())
    
    // Initial data load
    fetchInboundRecords()
      .then((data) => { setInboundRecords(data); setIsLoadingInbound(false) })
      .catch(() => setIsLoadingInbound(false))

    fetchOutboundRecords()
      .then((data) => { setOutboundRecords(data); setIsLoadingOutbound(false) })
      .catch(() => setIsLoadingOutbound(false))

    // Live updates via WebSocket
    const disconnect = connectDashboardSocket(handleNewScan)
    return disconnect
  }, [handleNewScan])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader
        inboundCount={inboundRecords.length}
        outboundCount={outboundRecords.length}
      />

      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="inbound" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="inbound" className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Inbound
            </TabsTrigger>
            <TabsTrigger value="outbound" className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              Outbound
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbound">
            <RecordsTable
              records={inboundRecords}
              title="Inbound Records"
              direction="inbound"
              isLoading={isLoadingInbound}
            />
          </TabsContent>

          <TabsContent value="outbound">
            <RecordsTable
              records={outboundRecords}
              title="Outbound Records"
              direction="outbound"
              isLoading={isLoadingOutbound}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border bg-card px-4 py-4 md:px-6">
        <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <span>GreyOrange Gate Tracking System</span>
          <span>Last synced: {mounted && lastSynced ? lastSynced.toLocaleTimeString() : '--:--:--'}</span>
        </div>
      </footer>
    </div>
  )
}
