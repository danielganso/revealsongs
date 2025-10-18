import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId, content, sender } = req.body;

    // Validate required fields
    if (!ticketId || !content || !sender) {
      return res.status(400).json({ error: 'Ticket ID, content, and sender are required' });
    }

    if (!['user', 'admin'].includes(sender)) {
      return res.status(400).json({ error: 'Sender must be either "user" or "admin"' });
    }

    // Get current ticket to retrieve existing messages and status
    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('messages, status')
      .eq('id', ticketId)
      .single();

    if (fetchError) {
      console.error('Error fetching support ticket:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch support ticket' });
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Create new message object
    const newMessage = {
      id: uuidv4(),
      content,
      sender,
      timestamp: new Date().toISOString()
    };

    // Get existing messages or initialize empty array
    const existingMessages = ticket.messages || [];
    const updatedMessages = [...existingMessages, newMessage];

    // Prepare update object
    const updateData: any = {
      messages: updatedMessages,
      updated_at: new Date().toISOString()
    };

    // If user is sending a message and ticket is resolved, reopen it
    if (sender === 'user' && ticket.status === 'resolved') {
      updateData.status = 'open';
      updateData.resolved_at = null;
      updateData.resolved_by = null;
    }

    // Update the support ticket with new message
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error adding message to support ticket:', error);
      return res.status(500).json({ error: 'Failed to add message to support ticket' });
    }

    return res.status(200).json({ 
      success: true, 
      ticket: data,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}