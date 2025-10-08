import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { couponCodes } = req.body;

    if (!couponCodes || !Array.isArray(couponCodes)) {
      return res.status(400).json({ error: 'couponCodes array is required' });
    }

    // Usar service_role para contornar RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: partners, error } = couponCodes.length > 0 
      ? await supabaseAdmin
          .from('profiles')
          .select('coupon_code, name')
          .in('coupon_code', couponCodes)
          .eq('role', 'PARCEIRO')
      : { data: [], error: null };

    if (error) {
      console.error('Erro ao buscar parceiros:', error);
      return res.status(500).json({ error: 'Erro ao buscar parceiros' });
    }

    return res.status(200).json({ partners });
  } catch (error) {
    console.error('Erro na API de parceiros:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}