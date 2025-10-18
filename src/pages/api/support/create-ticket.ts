import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, subject, message, userId } = req.body;

    // Validate required fields
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create the support ticket
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId || null,
        email,
        subject,
        message,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating support ticket:', error);
      return res.status(500).json({ error: 'Failed to create support ticket' });
    }

    return res.status(201).json({ 
      success: true, 
      ticket: data,
      message: 'Support ticket created successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}