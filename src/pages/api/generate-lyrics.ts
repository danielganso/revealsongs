import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getSongPrompt } from '../../lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const songData = req.body;
    
    // Validação básica - nova estrutura
    if (!songData.babies || !Array.isArray(songData.babies) || songData.babies.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um bebê deve ser informado' });
    }

    if (!songData.type) {
      return res.status(400).json({ error: 'Tipo de música não informado' });
    }

    // Verificar se pelo menos um bebê tem nome
    const hasValidBaby = songData.babies.some((baby: any) => baby.name && baby.name.trim());
    if (!hasValidBaby) {
      return res.status(400).json({ error: 'Pelo menos um bebê deve ter nome' });
    }

    // Gerar prompt baseado no tipo de música
    const prompt = getSongPrompt(
      songData.type, 
      songData.language || 'pt', 
      songData
    );

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um compositor especializado em músicas infantis e familiares. Crie letras emocionantes, carinhosas e adequadas para a ocasião."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const lyrics = completion.choices[0]?.message?.content;

    if (!lyrics) {
      throw new Error('Não foi possível gerar a letra');
    }

    // Parse do JSON retornado pela OpenAI
    let parsedLyrics;
    try {
      // Limpar a resposta da OpenAI antes de fazer o parse
      const cleanedLyrics = lyrics
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **texto**
        .replace(/\*(.*?)\*/g, '$1')     // Remove *texto*
        .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove __texto__
        .replace(/_(.*?)_/g, '$1')       // Remove _texto_
        .replace(/#{1,6}\s/g, '')        // Remove # headers
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove `código`
        .trim();
      
      parsedLyrics = JSON.parse(cleanedLyrics);
    } catch (parseError) {
      throw new Error('Resposta da OpenAI não está em formato JSON válido');
    }

    // Traduções para os títulos das partes
    const partTitles = {
      'pt': { part: 'PARTE', revelation: 'REVELAÇÃO' },
      'en': { part: 'PART', revelation: 'REVELATION' },
      'es': { part: 'PARTE', revelation: 'REVELACIÓN' },
      'fr': { part: 'PARTIE', revelation: 'RÉVÉLATION' },
      'it': { part: 'PARTE', revelation: 'RIVELAZIONE' }
    };

    const currentLanguage = songData.language || 'pt';
    const titles = partTitles[currentLanguage as keyof typeof partTitles] || partTitles['pt'];

    // Função para limpar formatação Markdown
    const cleanMarkdown = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **texto**
        .replace(/\*(.*?)\*/g, '$1')     // Remove *texto*
        .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove __texto__
        .replace(/_(.*?)_/g, '$1')       // Remove _texto_
        .replace(/#{1,6}\s/g, '')        // Remove # headers
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove `código`
        .trim();
    };

    // Formatar a letra para exibição (estrutura contínua sem refrão)
    const formatLyrics = (verses: any[]) => {
      return verses.map((verse: any, index: number) => {
        if (verse.type === 'verse') {
          // Limpar qualquer formatação Markdown das letras
          const cleanLyrics = cleanMarkdown(verse.lyrics);
          
          // Para o clímax final (parte 4), usar apenas o título da revelação
          if (verse.number === 4) {
            return `${titles.revelation}\n${cleanLyrics}`;
          }
          return `${titles.part} ${verse.number}\n${cleanLyrics}`;
        }
        return cleanMarkdown(verse.lyrics);
      }).join('\n\n');
    };

    // Retornar apenas o conteúdo das letras em formato de versos
    const lyricsContent = formatLyrics(parsedLyrics.verses || []);

    res.status(200).json({ 
      success: true, 
      lyrics: lyricsContent 
    });

  } catch (error) {
    console.error('Erro ao gerar letra:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao gerar letra',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}