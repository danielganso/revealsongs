import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validar se a requisição vem do Suno (opcional - implementar verificação de assinatura se necessário)
    const callbackData = req.body;
    
    if (!callbackData.id) {
      return res.status(400).json({ error: 'ID da música é obrigatório' });
    }

    // Buscar música no banco pelo suno_id
    const { data: musicRecord, error: findError } = await supabaseAdmin
      .from('generated_music')
      .select('*')
      .eq('suno_id', callbackData.id)
      .single();

    if (findError || !musicRecord) {
      console.error('Música não encontrada para callback:', callbackData.id);
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    // Atualizar status baseado no callback
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (callbackData.status === 'completed' || callbackData.status === 'success') {
      updateData.status = 'completed';
      updateData.audio_url = callbackData.audio_url;
      updateData.video_url = callbackData.video_url;
    } else if (callbackData.status === 'failed' || callbackData.status === 'error') {
      updateData.status = 'failed';
      updateData.error_message = callbackData.error || 'Erro na geração da música';
    } else {
      updateData.status = 'generating';
    }

    // Atualizar no banco de dados
    const { error: updateError } = await (supabaseAdmin as any)
      .from('generated_music')
      .update(updateData)
      .eq('suno_id', callbackData.id);

    if (updateError) {
      console.error('Erro ao atualizar música via callback:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar música' });
    }

    console.log(`Callback processado para música ${callbackData.id}: ${callbackData.status}`);
    
    // Retornar sucesso para o Suno
    res.status(200).json({ success: true, message: 'Callback processado com sucesso' });

  } catch (error) {
    console.error('Erro no callback do Suno:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}