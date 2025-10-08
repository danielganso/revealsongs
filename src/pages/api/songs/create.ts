import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { createSong } from '../../../lib/database'
import type { Database, VoiceType, MusicLanguage } from '../../../types/database'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    const { baby_names, babies_count, story, style, voice, language } = req.body

    // Validate required fields
    if (!baby_names || !Array.isArray(baby_names) || baby_names.length === 0) {
      return res.status(400).json({ error: 'Baby names are required' })
    }

    if (!voice || !language) {
      return res.status(400).json({ error: 'Voice and language are required' })
    }

    // Create song in database
    const song = await createSong({
      user_id: session.user.id,
      baby_names,
      babies_count: babies_count || 1,
      story: story || null,
      style: style || null,
      voice: voice as VoiceType,
      language: language as MusicLanguage
    })

    res.status(201).json({ song })
  } catch (error) {
    console.error('Error creating song:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}