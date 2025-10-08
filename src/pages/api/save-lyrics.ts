import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autenticação necessário' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    const { 
      type, 
      babies,
      musicalStyle, 
      vocalGender,
      language, 
      lyrics,
      parentsStory,
      birthdayTheme,
      storyToTell 
    } = req.body;

    // Validação básica
    if (!type || !babies || !Array.isArray(babies) || babies.length === 0 || !lyrics) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Validar estrutura dos bebês
    for (const baby of babies) {
      if (!baby.name || !baby.gender) {
        return res.status(400).json({ error: 'Cada bebê deve ter nome e gênero' });
      }
    }

    // Extrair arrays de nomes e gêneros
    const baby_names = babies.map((baby: any) => baby.name);
    const baby_genders = babies.map((baby: any) => baby.gender);
    const babies_count = babies.length;

    // Preparar dados para inserção
    const songData = {
      user_id: user.id, // Usar o ID real do usuário autenticado
      song_type: type,
      baby_names: baby_names,
      baby_genders: baby_genders,
      babies_count: babies_count,
      musical_style: musicalStyle,
      vocal_gender: vocalGender,
      language: language,
      lyrics: lyrics,
      parents_story: type === 'cha_revelacao' ? parentsStory : null,
      birthday_theme: type === 'aniversario' ? birthdayTheme : null,
      story_to_tell: type === 'aniversario' ? storyToTell : null,
      status: 'draft',
    };

    // Inserir na tabela letras_songs
    const { data, error } = await (supabaseAdmin as any)
      .from('letras_songs')
      .insert(songData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar letra:', error);
      return res.status(500).json({ error: 'Erro ao salvar letra no banco de dados' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Letra salva com sucesso',
      songId: data?.id 
    });

  } catch (error) {
    console.error('Erro interno ao salvar letra:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}