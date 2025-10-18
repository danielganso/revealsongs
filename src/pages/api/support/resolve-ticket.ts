import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId, resolvedBy } = req.body;

    // Validate required fields
    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    // Update the support ticket status
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy || null
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error resolving support ticket:', error);
      return res.status(500).json({ error: 'Failed to resolve support ticket' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.status(200).json({ 
      success: true, 
      ticket: data,
      message: 'Support ticket resolved successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}