import { NextApiRequest, NextApiResponse } from 'next';
import { generateSunoApiRequest, validateSunoData, SunoSongData } from '../../lib/sunoPrompts';
import { supabaseAdmin } from '../../lib/supabase';

interface SunoApiResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    audio_url?: string;
    video_url?: string;
    title: string;
    style: string;
    prompt: string;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    // Obter dados do corpo da requisição
    const { lyric_id, lyrics, title, style, language, theme, vocalGender, childName, musicalStyle, songType } = req.body;
    
    let songData: SunoSongData;
    let finalLyricId = lyric_id;
    
    if (lyric_id) {
      // Caso 1: Gerar música a partir de uma letra salva
      // Buscar dados da letra na tabela letras_songs
      const { data: lyricData, error: lyricError } = await (supabaseAdmin as any)
        .from('letras_songs')
        .select('*')
      .eq('id', lyric_id)
      .eq('user_id', user.id) // Garantir que o usuário só acesse suas próprias letras
      .single();

      if (lyricError || !lyricData) {
        return res.status(404).json({ 
          error: 'Letra não encontrada ou não pertence ao usuário' 
        });
      }

      // Verificar se a letra tem vocal_gender definido
      if (!lyricData.vocal_gender) {
        return res.status(400).json({ 
          error: 'Vocal gender não definido para esta letra. Por favor, edite a letra e defina o gênero vocal.' 
        });
      }

      // Montar dados para o Suno baseado na letra encontrada
      songData = {
        lyrics: lyricData.lyrics,
        title: `Música para ${lyricData.baby_names?.[0] || 'Criança'}`, // Título baseado no primeiro nome do bebê
        style: lyricData.musical_style,
        language: lyricData.language || 'pt', // Usar português como padrão se não especificado
        theme: lyricData.song_type,
        vocalGender: lyricData.vocal_gender
      };
    } else {
      // Caso 2: Gerar música a partir de dados fornecidos diretamente
      console.log('Dados recebidos:', { lyrics, title, style, vocalGender });
      
      if (!lyrics || !title || !style || !vocalGender) {
        console.log('Dados faltando:', {
          lyrics: !!lyrics,
          title: !!title,
          style: !!style,
          vocalGender: !!vocalGender
        });
        return res.status(400).json({ 
          error: 'Dados obrigatórios faltando: lyrics, title, style, vocalGender' 
        });
      }

      // Extrair dados adicionais do corpo da requisição
      const { 
        baby_names, 
        baby_genders, 
        babies_count, 
        song_type, 
        musical_style,
        parents_story,
        birthday_theme,
        story_to_tell
      } = req.body;

      // Primeiro, verificar se já existe uma letra com os mesmos dados para este usuário
      const { data: existingLyric, error: searchError } = await (supabaseAdmin as any)
        .from('letras_songs')
        .select('*')
        .eq('user_id', user.id)
        .eq('lyrics', lyrics)
        .eq('musical_style', musical_style || musicalStyle || style)
        .eq('song_type', song_type || songType || theme || 'personalizada')
        .single();

      if (existingLyric && !searchError) {
        // Se encontrou uma letra existente, usar ela
        finalLyricId = existingLyric.id;
        console.log('Usando letra existente:', finalLyricId);
        
        // Atualizar dados se necessário (preservar história dos pais, nomes, etc.)
        const { error: updateError } = await (supabaseAdmin as any)
          .from('letras_songs')
          .update({
            baby_names: baby_names || existingLyric.baby_names || [childName || 'Criança'],
            baby_genders: baby_genders || existingLyric.baby_genders || ['masculino'],
            babies_count: babies_count || existingLyric.babies_count || 1,
            parents_story: parents_story || existingLyric.parents_story,
            birthday_theme: birthday_theme || existingLyric.birthday_theme,
            story_to_tell: story_to_tell || existingLyric.story_to_tell,
            vocal_gender: vocalGender,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLyric.id);

        if (updateError) {
          console.error('Erro ao atualizar letra existente:', updateError);
        }
      } else {
        // Se não encontrou, criar uma nova letra
        const { data: savedLyric, error: saveError } = await (supabaseAdmin as any)
          .from('letras_songs')
          .insert({
            user_id: user.id,
            baby_names: baby_names || [childName || 'Criança'],
            baby_genders: baby_genders || ['masculino'],
            babies_count: babies_count || 1,
            song_type: song_type || songType || theme || 'personalizada',
            musical_style: musical_style || musicalStyle || style,
            language: language || 'pt',
            vocal_gender: vocalGender,
            lyrics: lyrics,
            parents_story: parents_story,
            birthday_theme: birthday_theme,
            story_to_tell: story_to_tell,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) {
          console.error('Erro ao salvar letra:', saveError);
          return res.status(500).json({ 
            error: 'Erro ao salvar letra antes de gerar música',
            details: saveError.message 
          });
        }

        finalLyricId = savedLyric?.id;
        console.log('Nova letra criada:', finalLyricId);
      }

      songData = {
        lyrics,
        title,
        style,
        language: language || 'pt',
        theme: theme || 'personalizada',
        vocalGender
      };
    }
    
    if (!validateSunoData(songData)) {
      return res.status(400).json({ 
        error: 'Dados da letra incompletos para geração de música' 
      });
    }

    // Gerar requisição para Suno
    const sunoRequest = generateSunoApiRequest(songData);
    
    // Log detalhado dos dados que serão enviados
    console.log('=== DADOS PARA SUNO ===');
    console.log('songData:', JSON.stringify(songData, null, 2));
    console.log('sunoRequest:', JSON.stringify(sunoRequest, null, 2));
    console.log('======================');
    
    // Verificar se existe token do Suno nas variáveis de ambiente
    const sunoToken = process.env.SUNO_API_KEY;
    if (!sunoToken) {
      return res.status(500).json({ error: 'Token da API Suno não configurado' });
    }

    // Fazer requisição para a API do Suno
    const requestBody = {
      ...sunoRequest,
      callBackUrl: `${process.env.NEXTAUTH_URL}/api/suno-callback`
    };
    
    console.log('=== REQUISIÇÃO COMPLETA PARA SUNO ===');
    console.log('URL:', 'https://api.sunoapi.org/api/v1/generate');
    console.log('Headers:', {
      'Authorization': `Bearer ${sunoToken.substring(0, 10)}...`,
      'Content-Type': 'application/json',
    });
    console.log('Body:', JSON.stringify(requestBody, null, 2));
    console.log('====================================');
    
    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('=== RESPOSTA DA SUNO ===');
    console.log('Status:', sunoResponse.status);
    console.log('StatusText:', sunoResponse.statusText);
    
    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error('Erro na API Suno:', errorText);
      console.log('========================');
      return res.status(500).json({ 
        error: 'Erro ao comunicar com a API Suno',
        details: errorText
      });
    }

    const sunoData = await sunoResponse.json();
    console.log('Resposta JSON:', JSON.stringify(sunoData, null, 2));
    console.log('========================');
    
    // Salvar informações da música no banco de dados
    // Extrair taskId da resposta da Suno baseado no formato fornecido
    let taskId = null;
    if (sunoData.data && sunoData.data.taskId) {
      taskId = sunoData.data.taskId;
    } else if (sunoData.taskId) {
      taskId = sunoData.taskId;
    } else if (sunoData.id) {
      taskId = sunoData.id;
    } else if (sunoData.data && sunoData.data.id) {
      taskId = sunoData.data.id;
    }

    const { data: musicRecord, error: dbError } = await (supabaseAdmin as any)
      .from('generated_music')
      .insert({
        user_id: user.id,
        lyric_id: finalLyricId, // Vincular com a letra salva
        suno_id: taskId, // Usar taskId da resposta da Suno
        title: songData.title,
        style: songData.style,
        language: songData.language,
        theme: songData.theme,
        vocal_gender: songData.vocalGender, // Já vem como 'male' ou 'female'
        lyrics: songData.lyrics,
        prompt: sunoRequest.prompt,
        status: 'generating',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      return res.status(500).json({ 
        error: 'Erro ao salvar informações da música',
        details: dbError.message || dbError
      });
    }

    // Retornar resposta de sucesso
    res.status(200).json({
      success: true,
      data: {
        id: musicRecord?.id,
        suno_id: musicRecord?.suno_id,
        status: 'generating',
        title: songData.title,
        style: songData.style,
        prompt: sunoRequest.prompt
      }
    });

  } catch (error) {
    console.error('Erro na geração de música:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}