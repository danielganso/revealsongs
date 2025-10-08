import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, metadata } = req.body

  console.log('🔧 API signup - Recebendo requisição:', { email, metadata });

  if (!email || !password) {
    console.error('🔧 API signup - Email ou senha não fornecidos');
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    console.log('🔧 API signup - Criando usuário com admin client...');

    // Criar usuário usando o cliente admin (bypassa confirmação de email)
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: metadata || {}
    })

    console.log('🔧 API signup - Resultado da criação:', { user: user?.user?.id, error: createError });

    if (createError) {
      console.error('🔧 API signup - Erro ao criar usuário:', createError)
      return res.status(400).json({ error: createError.message })
    }

    if (!user.user) {
      console.error('🔧 API signup - Usuário não foi criado');
      return res.status(400).json({ error: 'Failed to create user' })
    }

    console.log('🔧 API signup - Criando subscription pendente...');

    // Criar subscription pendente para o usuário
    try {
      // Determinar plano baseado na região/moeda do usuário
      const userRegion = metadata?.region || 'BR';
      const currency = metadata?.currency || (userRegion === 'BR' ? 'BRL' : 'USD');
      const planType = currency === 'BRL' ? '5_songs_brl' : '5_songs_usd'; // Plano padrão de 5 músicas
      
      console.log('🔧 API signup - Dados da subscription:', {
        user_id: user.user.id,
        userRegion,
        currency,
        planType
      });
      
      // Criar subscription com a nova estrutura da tabela
      const { data: subscriptionData, error: subscriptionError } = await (supabaseAdmin as any)
        .from('subscriptions')
        .insert({
          user_id: user.user.id,
          plan_id: planType, // String como '5_songs_brl' ou '5_songs_usd'
          status: 'pending' // O trigger auto_fill_subscription_plan_data vai preencher os outros campos
        })
        .select()
        .single()

      console.log('🔧 API signup - Resultado da criação da subscription:', {
        data: subscriptionData,
        error: subscriptionError
      });

      if (subscriptionError) {
        console.error('🔧 API signup - Erro ao criar subscription:', subscriptionError)
        // Não falha se a subscription não for criada, pois o usuário já existe
      } else {
        console.log('🔧 API signup - Subscription pendente criada com sucesso:', subscriptionData);
      }
    } catch (subscriptionError) {
      console.error('🔧 API signup - Erro inesperado ao criar subscription:', subscriptionError)
      // Continua mesmo se houver erro na subscription
    }

    console.log('🔧 API signup - Processo concluído com sucesso');

    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.user.id,
        email: user.user.email,
        email_confirmed_at: user.user.email_confirmed_at
      }
    })

  } catch (error) {
    console.error('🔧 API signup - Erro inesperado:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}