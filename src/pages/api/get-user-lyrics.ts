import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    // Buscar letras do usuário com informações das músicas geradas
    const { data: lyrics, error: lyricsError } = await supabaseAdmin
      .from('letras_songs')
      .select(`
        id,
        song_type,
        baby_names,
        baby_genders,
        babies_count,
        musical_style,
        language,
        parents_story,
        birthday_theme,
        story_to_tell,
        lyrics,
        status,
        created_at,
        updated_at,
        generated_music (
          id,
          suno_id,
          title,
          status,
          audio_url,
          audio2_url,
          video_url,
          error_message,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (lyricsError) {
      console.error('Erro ao buscar letras:', lyricsError);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    return res.status(200).json({ lyrics: lyrics || [] });

  } catch (error) {
    console.error('Erro na API get-user-lyrics:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}