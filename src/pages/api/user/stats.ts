import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { getUserStats } from '../../../lib/database'
import type { Database } from '../../../types/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client
    const supabase = createPagesServerClient<Database>({ req, res })
    
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user stats
    const stats = await getUserStats(session.user.id)
    
    res.status(200).json({ stats })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}