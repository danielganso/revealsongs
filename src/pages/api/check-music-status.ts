import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== CHECK MUSIC STATUS API ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers.authorization ? 'Bearer token present' : 'No auth header');

  if (req.method !== 'GET') {
    console.log('ERROR: Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ERROR: No authorization header');
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted, length:', token.length);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('ERROR: Auth error:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('User authenticated:', user.id);

    // Obter ID da música
    const { musicId } = req.query;
    if (!musicId || typeof musicId !== 'string') {
      console.log('ERROR: Invalid musicId:', musicId);
      return res.status(400).json({ error: 'ID da música é obrigatório' });
    }

    console.log('Music ID:', musicId);

    // Buscar informações da música no banco
    const { data: musicRecord, error: dbError }: { data: any | null; error: any } = await supabaseAdmin
      .from('generated_music')
      .select('*')
      .eq('id', musicId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !musicRecord) {
      console.log('ERROR: Database error or music not found:', dbError);
      return res.status(404).json({ error: 'Música não encontrada' });
    }

    console.log('Music record found:', {
      id: musicRecord.id,
      status: musicRecord.status,
      suno_id: musicRecord.suno_id,
      has_audio_url: !!musicRecord.audio_url
    });

    // Se já está completa, retornar dados salvos
    if (musicRecord.status === 'completed' && musicRecord.audio_url) {
      return res.status(200).json({
        success: true,
        data: {
          id: musicRecord.id,
          status: 'completed',
          audio_url: musicRecord.audio_url,
          video_url: musicRecord.video_url,
          title: musicRecord.title,
          style: musicRecord.style,
          created_at: musicRecord.created_at
        }
      });
    }

    // Se ainda está gerando, verificar status no Suno
    if (musicRecord.status === 'generating' && musicRecord.suno_id) {
      console.log('Checking status with Suno API for suno_id:', musicRecord.suno_id);
      
      const sunoToken = process.env.SUNO_API_KEY;
      if (!sunoToken) {
        console.log('ERROR: SUNO_API_TOKEN not configured');
        return res.status(500).json({ error: 'Token da API Suno não configurado' });
      }

      console.log('SUNO_API_TOKEN present, length:', sunoToken.length);

      try {
        // Verificar status no Suno
        console.log('Making GET request to Suno API for suno_id:', musicRecord.suno_id);
        
        const sunoResponse = await fetch(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${musicRecord.suno_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sunoToken}`,
            'Content-Type': 'application/json',
          }
        });

        console.log('Suno API response status:', sunoResponse.status);
        // console.log('Suno API response headers:', Object.fromEntries(Array.from(sunoResponse.headers.entries())));

        if (!sunoResponse.ok) {
          const errorText = await sunoResponse.text();
          console.error('ERROR: Suno API error response:', errorText);
          return res.status(200).json({
            success: true,
            data: {
              id: musicRecord.id,
              status: 'generating',
              title: musicRecord.title,
              style: musicRecord.style
            }
          });
        }

        const sunoData: any = await sunoResponse.json();
        console.log('Suno API response data:', JSON.stringify(sunoData, null, 2));
        
        // Verificar se a resposta tem a estrutura correta conforme documentação oficial
        if (!sunoData.data || !sunoData.data.response || !sunoData.data.response.sunoData || sunoData.data.response.sunoData.length === 0) {
          console.error('ERROR: Invalid Suno API response structure:', sunoData);
          return res.status(200).json({
            success: true,
            data: {
              id: musicRecord.id,
              status: 'generating',
              title: musicRecord.title,
              style: musicRecord.style
            }
          });
        }
        
        console.log('Suno API response structure is valid');
        console.log('Task status:', sunoData.data.status);
        console.log('SunoData array length:', sunoData.data.response.sunoData.length);
        
        // Log all music versions returned
        sunoData.data.response.sunoData.forEach((music: any, index: number) => {
          console.log(`Music version ${index + 1}:`, {
            id: music.id,
            audioUrl: music.audioUrl,
            streamAudioUrl: music.streamAudioUrl,
            imageUrl: music.imageUrl,
            title: music.title,
            tags: music.tags,
            duration: music.duration
          });
        });
        
        // Verificar se o status da task é SUCCESS
        if (sunoData.data.status !== 'SUCCESS') {
          console.log('Task not completed yet, status:', sunoData.data.status);
          return res.status(200).json({
            success: true,
            data: {
              id: musicRecord.id,
              status: 'generating',
              title: musicRecord.title,
              style: musicRecord.style,
              progress: 50
            }
          });
        }
        
        // Verificar se temos pelo menos uma música com audioUrl
        const completedMusics = sunoData.data.response.sunoData.filter((music: any) => music.audioUrl);
        
        if (completedMusics.length === 0) {
          console.log('No completed music versions found yet');
          return res.status(200).json({
            success: true,
            data: {
              id: musicRecord.id,
              status: 'generating',
              title: musicRecord.title,
              style: musicRecord.style,
              progress: 75 // Progresso maior pois já temos resposta da API
            }
          });
        }
        
        console.log(`Found ${completedMusics.length} completed music version(s)`);
        
        // Pegar a primeira versão completa (ou todas se quisermos salvar múltiplas)
        const primaryMusic: any = completedMusics[0];
        const secondaryMusic: any = completedMusics.length > 1 ? completedMusics[1] : null;
        
        // Verificar se a música está pronta - se tem audioUrl significa que está completa
        if (primaryMusic.audioUrl) {
          console.log('Music generation completed successfully - audioUrl found');
          console.log(`Saving primary music version: ${primaryMusic.title || musicRecord.title}`);
          if (secondaryMusic) {
            console.log(`Secondary music version also available: ${secondaryMusic.title || musicRecord.title}`);
          }
          
          // Atualizar banco de dados com URLs da música (primária e secundária se disponível)
          const updateData: any = {
            status: 'completed',
            audio_url: primaryMusic.audioUrl,
            updated_at: new Date().toISOString()
          };

          // Adicionar segunda URL de áudio se disponível
          if (secondaryMusic && secondaryMusic.audioUrl) {
            updateData.audio2_url = secondaryMusic.audioUrl;
            console.log('Salvando segunda versão de áudio:', secondaryMusic.audioUrl);
          }

          const { data: updatedRecord, error: updateError } = await (supabaseAdmin as any)
            .from('generated_music')
            .update(updateData)
            .eq('id', musicId)
            .select()
            .single();

          if (updateError) {
            console.error('Erro ao atualizar status:', updateError);
            return res.status(500).json({
              success: false,
              error: 'Erro ao atualizar status da música'
            });
          } else {
            console.log('Música atualizada com sucesso, decrementando créditos...');
            // Diminuir 1 crédito da subscription do usuário (independente do status)
            try {
              // Primeiro, buscar a subscription atual para obter o valor de créditos
              // Removendo filtro por status - permite decrementar créditos mesmo se subscription estiver cancelled
              const { data: currentSub, error: fetchError }: { data: any | null; error: any } = await supabaseAdmin
                .from('subscriptions')
                .select('id, credits_remaining, status')
                .eq('user_id', user.id)
                .gt('credits_remaining', 0)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (fetchError || !currentSub) {
                console.error('Erro ao buscar subscription atual:', fetchError);
                throw new Error('Subscription não encontrada ou sem créditos');
              }

              console.log('Subscription encontrada:', {
                id: currentSub.id,
                status: currentSub.status,
                credits_remaining: currentSub.credits_remaining
              });

              // Agora decrementar 1 crédito (independente do status da subscription)
              const newCredits = currentSub.credits_remaining - 1;
              const { data: creditData, error: creditError } = await (supabaseAdmin as any)
                .from('subscriptions')
                .update({
                  credits_remaining: newCredits,
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentSub.id)
                .select();

              if (creditError) {
                console.error('Erro ao decrementar créditos:', creditError);
              } else {
                console.log('Crédito decrementado com sucesso para o usuário:', user.id);
                console.log('Dados da atualização de créditos:', creditData);
              }
            } catch (creditDecrementError) {
              console.error('Erro ao processar decremento de créditos:', creditDecrementError);
            }
          }

          return res.status(200).json({
            success: true,
            data: {
              id: musicRecord.id,
              status: 'completed',
              audio_url: primaryMusic.audioUrl,
              // Removendo video_url da resposta para não mostrar na tabela
              title: musicRecord.title,
              style: musicRecord.style,
              created_at: musicRecord.created_at,
              // Informações adicionais sobre as versões disponíveis
              versions_available: completedMusics.length,
              primary_version: {
                id: primaryMusic.id,
                title: primaryMusic.title,
                tags: primaryMusic.tags,
                duration: primaryMusic.duration
              },
              ...(secondaryMusic && {
                secondary_version: {
                  id: secondaryMusic.id,
                  title: secondaryMusic.title,
                  tags: secondaryMusic.tags,
                  duration: secondaryMusic.duration,
                  audio_url: secondaryMusic.audioUrl
                }
              })
            }
          });
        }

        // Se chegou até aqui, não há versões completas ainda
        console.log('No completed versions available yet');
        return res.status(200).json({
          success: true,
          data: {
            id: musicRecord.id,
            status: 'generating',
            title: musicRecord.title,
            style: musicRecord.style,
            progress: 75
          }
        });

      } catch (sunoError) {
        console.error('ERROR: Failed to communicate with Suno API:', sunoError);
        console.error('Suno error details:', {
          message: (sunoError as any).message,
          stack: (sunoError as any).stack
        });
        
        // Retornar status atual sem erro para não quebrar o polling
        return res.status(200).json({
          success: true,
          data: {
            id: musicRecord.id,
            status: 'generating',
            title: musicRecord.title,
            style: musicRecord.style
          }
        });
      }
    }

    console.log('Returning current music status');
    
    // Retornar status atual
    return res.status(200).json({
      success: true,
      data: {
        id: musicRecord.id,
        status: musicRecord.status,
        title: musicRecord.title,
        style: musicRecord.style,
        audio_url: musicRecord.audio_url,
        video_url: musicRecord.video_url,
        created_at: musicRecord.created_at
      }
    });

  } catch (error) {
    console.error('ERROR: Unexpected error in check-music-status API:', error);
    console.error('Error details:', {
      message: (error as any).message,
      stack: (error as any).stack
    });
    
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
}