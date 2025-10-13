import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
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
      id,
      type, 
      babies,
      musicalStyle, 
      vocalGender,
      language, 
      lyrics,
      parentsStory,
      birthdayTheme,
      storyToTell,
      coupleNames,
      loveStory
    } = req.body;

    // Validação básica
    if (!id || !type || !lyrics) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Validação específica por tipo
    if (type === 'love') {
      if (!coupleNames) {
        return res.status(400).json({ error: 'Nomes do casal são obrigatórios para músicas de amor' });
      }
    } else {
      if (!babies || !Array.isArray(babies) || babies.length === 0) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }
      
      // Validar estrutura dos bebês
      for (const baby of babies) {
        if (!baby.name || !baby.gender) {
          return res.status(400).json({ error: 'Cada bebê deve ter nome e gênero' });
        }
      }
    }

    // Extrair arrays de nomes e gêneros baseado no tipo
    let baby_names, baby_genders, babies_count;
    
    if (type === 'love') {
      // Para músicas de amor, salvar os nomes do casal no campo baby_names
      baby_names = [coupleNames];
      baby_genders = ['masculino']; // Valor padrão
      babies_count = 1;
    } else {
      baby_names = babies.map((baby: any) => baby.name);
      baby_genders = babies.map((baby: any) => baby.gender);
      babies_count = babies.length;
    }

    // Preparar dados para atualização
    const updateData = {
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
      story_to_tell: type === 'aniversario' ? storyToTell : (type === 'love' ? loveStory : null),
      updated_at: new Date().toISOString(),
    };

    // Atualizar na tabela letras_songs
    const { data, error } = await (supabaseAdmin as any)
      .from('letras_songs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que o usuário só pode atualizar suas próprias letras
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar letra:', error);
      return res.status(500).json({ error: 'Erro ao atualizar letra no banco de dados' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Letra não encontrada ou você não tem permissão para editá-la' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Letra atualizada com sucesso',
      songId: data?.id 
    });

  } catch (error) {
    console.error('Erro interno ao atualizar letra:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}