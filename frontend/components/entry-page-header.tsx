'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { Package } from 'lucide-react'

export function EntryPageHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src="/greyorange_logo.jpg" alt="GreyOrange" className="h-10 w-10 rounded-lg" />
          <span className="text-lg font-semibold">GreyOrange</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
