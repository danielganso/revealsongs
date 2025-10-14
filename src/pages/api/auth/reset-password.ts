import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email é obrigatório' });
  }

  try {
    // Obter a URL base do site (com fallback para localhost em desenvolvimento)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    console.log('🔄 Enviando email de recuperação para:', email);
    console.log('🔗 URL de redirecionamento:', `${siteUrl}/reset-password`);
    console.log('🌐 Site URL configurada:', siteUrl);
    console.log('🔧 Configurações do ambiente:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // Enviar email de recuperação de senha usando Supabase Auth
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
      // Adicionar configurações específicas para garantir que funcione
      captchaToken: undefined
    });

    console.log('📧 Resultado do envio:', { data, error });
    console.log('📧 Data completa:', JSON.stringify(data, null, 2));

    if (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      return res.status(400).json({ 
        message: error.message || 'Erro ao enviar email de recuperação' 
      });
    }

    console.log('✅ Email enviado com sucesso');
    return res.status(200).json({ 
      message: 'Email de recuperação enviado com sucesso' 
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}