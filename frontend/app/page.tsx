'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to entry page by default
    router.push('/entry?gate=A&direction=inbound')
  }, [router])

  return null
}

