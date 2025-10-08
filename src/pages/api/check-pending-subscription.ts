import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Buscar subscriptions com status 'pending'
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao verificar subscription pendente:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    // Se encontrou pelo menos uma subscription com status 'pending'
    const hasPending = subscriptions && subscriptions.length > 0;
    const subscription = hasPending ? subscriptions[0] : null;

    return res.status(200).json({ 
      hasPending,
      subscription: subscription
    });

  } catch (error) {
    console.error('❌ Erro na API check-pending-subscription:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}