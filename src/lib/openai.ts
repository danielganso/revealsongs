import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface LyricGenerationParams {
  babyNames: string[]
  babiesCount: number
  story: string
  style: string
  language: 'pt_br' | 'en_us' | 'es_es'
}

export async function generateLyrics(params: LyricGenerationParams): Promise<string> {
  const { babyNames, babiesCount, story, style, language } = params

  const languagePrompts = {
    pt_br: {
      system: "Você é um compositor especializado em criar letras de músicas personalizadas para bebês e crianças. Crie letras carinhosas, doces e adequadas para a idade.",
      prompt: `Crie uma letra de música personalizada com as seguintes informações:
- Nome(s) do(s) bebê(s): ${babyNames.join(', ')}
- Quantidade de bebês: ${babiesCount}
- História/contexto: ${story}
- Estilo musical: ${style}

A letra deve ser:
- Carinhosa e doce
- Adequada para bebês/crianças
- Com rimas simples
- Entre 2-3 estrofes
- Incluir os nomes dos bebês naturalmente na letra
- Transmitir amor e carinho dos pais`
    },
    en_us: {
      system: "You are a songwriter specialized in creating personalized song lyrics for babies and children. Create loving, sweet lyrics appropriate for their age.",
      prompt: `Create a personalized song lyric with the following information:
- Baby name(s): ${babyNames.join(', ')}
- Number of babies: ${babiesCount}
- Story/context: ${story}
- Musical style: ${style}

The lyrics should be:
- Loving and sweet
- Appropriate for babies/children
- With simple rhymes
- 2-3 verses
- Include the baby names naturally in the lyrics
- Convey parents' love and affection`
    },
    es_es: {
      system: "Eres un compositor especializado en crear letras de canciones personalizadas para bebés y niños. Crea letras cariñosas, dulces y apropiadas para su edad.",
      prompt: `Crea una letra de canción personalizada con la siguiente información:
- Nombre(s) del/de los bebé(s): ${babyNames.join(', ')}
- Cantidad de bebés: ${babiesCount}
- Historia/contexto: ${story}
- Estilo musical: ${style}

La letra debe ser:
- Cariñosa y dulce
- Apropiada para bebés/niños
- Con rimas simples
- 2-3 estrofas
- Incluir los nombres de los bebés naturalmente en la letra
- Transmitir amor y cariño de los padres`
    }
  }

  const { system, prompt } = languagePrompts[language]

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error generating lyrics:', error)
    throw new Error('Failed to generate lyrics')
  }
}

export default openai