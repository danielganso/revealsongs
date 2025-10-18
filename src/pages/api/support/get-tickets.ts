import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, isAdmin } = req.query;

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    // If not admin, filter by user_id
    if (!isAdmin && userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching support tickets:', error);
      return res.status(500).json({ error: 'Failed to fetch support tickets' });
    }

    return res.status(200).json({ 
      success: true, 
      tickets: data || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}