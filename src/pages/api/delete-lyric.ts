import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Obter o ID da letra a ser deletada
    const { lyric_id } = req.body;

    if (!lyric_id) {
      return res.status(400).json({ error: 'ID da letra é obrigatório' });
    }

    // Verificar se a letra pertence ao usuário
    const { data: lyricData, error: lyricError } = await supabaseAdmin
      .from('letras_songs')
      .select('id')
      .eq('id', lyric_id)
      .eq('user_id', user.id)
      .single();

    if (lyricError || !lyricData) {
      return res.status(404).json({ 
        error: 'Letra não encontrada ou não pertence ao usuário' 
      });
    }

    // Primeiro, deletar todas as músicas geradas associadas à letra
    const { error: musicDeleteError } = await supabaseAdmin
      .from('generated_music')
      .delete()
      .eq('lyric_id', lyric_id)
      .eq('user_id', user.id);

    if (musicDeleteError) {
      console.error('Erro ao deletar músicas geradas:', musicDeleteError);
      return res.status(500).json({ 
        error: 'Erro ao deletar músicas associadas',
        details: musicDeleteError.message 
      });
    }

    // Depois, deletar a letra
    const { error: lyricDeleteError } = await supabaseAdmin
      .from('letras_songs')
      .delete()
      .eq('id', lyric_id)
      .eq('user_id', user.id);

    if (lyricDeleteError) {
      console.error('Erro ao deletar letra:', lyricDeleteError);
      return res.status(500).json({ 
        error: 'Erro ao deletar letra',
        details: lyricDeleteError.message 
      });
    }

    // Retornar sucesso
    res.status(200).json({
      success: true,
      message: 'Letra e músicas associadas deletadas com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}