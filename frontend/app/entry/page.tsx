import { Suspense } from 'react'
import { EntryPageHeader } from '@/components/entry-page-header'
import { EntryForm } from '@/components/entry-form'

export default function EntryPage() {
  return (
    <div className="min-h-screen bg-background">
      <EntryPageHeader />
      <main className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl">
          {/* Suspense required because EntryForm uses useSearchParams() */}
          <Suspense fallback={<div className="text-center text-muted-foreground">Loading…</div>}>
            <EntryForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
