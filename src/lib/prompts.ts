// Prompts da OpenAI para geração de letras de músicas
// Este arquivo permite fácil edição dos prompts sem alterar o código principal

export interface Baby {
  name: string;
  gender: 'masculino' | 'feminino' | 'male' | 'female';
}

export interface SongData {
  babies?: Baby[]; // Array de bebês (máximo 3) - opcional para love songs
  coupleNames?: string; // Para músicas de amor
  loveStory?: string; // Para músicas de amor
  musicalStyle: string;
  language: 'pt' | 'en' | 'es' | 'fr' | 'it';
  parentsStory?: string; // Para Chá Revelação
  birthdayTheme?: string; // Para Aniversário
  storyToTell?: string; // Para Aniversário
}

export const SONG_PROMPTS = {
  // Prompt para Chá Revelação
  cha_revelacao: (data: SongData) => {
    const languageInstructions = {
      'pt': 'Crie a letra da música em PORTUGUÊS',
      'en': 'Create the song lyrics in ENGLISH',
      'es': 'Crea la letra de la canción en ESPAÑOL',
      'fr': 'Créez les paroles de la chanson en FRANÇAIS',
      'it': 'Crea il testo della canzone in ITALIANO'
    };

    return `
Você é um compositor especializado em músicas emocionantes para chás de revelação.


${languageInstructions[data.language]} no estilo ${data.musicalStyle} para um chá de revelação com as seguintes informações:


Informações dos bebês:
${data.babies.map((baby, index) => '- Bebê ' + (index + 1) + ': ' + baby.name).join('\n')}


História dos pais:
${data.parentsStory}


Estrutura obrigatória da música:
- A canção deve ser uma HISTÓRIA CONTÍNUA, sem refrão, dividida em EXATAMENTE 8 partes (verses).
- PARTE 1: Como os pais se conheceram e início da história de amor (detalhes sensoriais e cenas concretas).
- PARTE 2: Sonhos e expectativas do casal para o futuro, seus planos em comum.
- PARTE 3: Como será a vida com ${data.babies.length > 1 ? 'as crianças' : 'a criança'}; rotinas, aventuras e gestos de carinho, usando elementos da história dos pais.
- PARTE 4: Símbolos, lugares, hábitos e memórias marcantes que definem o casal (expanda imagens e atmosferas).
- PARTE 5: Aproximação do grande momento; crie tensão terna e expectativa com naturalidade.
- PARTE 6: Pré-clímax — silêncios, respirações, olhares; ainda sem nomes.
- PARTE 7 (CLÍMAX): AQUI é onde você REVELA ${data.babies.length > 1 ? 'os nomes' : 'o nome'} ${data.babies.map(b => '"' + b.name + '"').join(' e ')} com pausa e impacto emocional (ênfase máxima).
- PARTE 8 (FINAL): Conclusão tocante sobre amor incondicional, alegria da chegada e como ${data.babies.length > 1 ? 'os bebês completarão' : 'o bebê completará'} a família.


Regras de conteúdo e linguagem:
- Jamais mencione sexo/gênero do bebê (evite “ele/ela”, “menino/menina”, “príncipe/princesa”, “filho/filha”).
- Use somente linguagem neutra: “o bebê”, “a criança”, “nosso tesouro”, “nossa alegria”, “este ser especial”.
- ${data.babies.length > 1 ? 'Os nomes' : 'O nome'} ${data.babies.map(b => '"' + b.name + '"').join(' e ')} só podem aparecer na PARTE 7 (clímax).
- Foque em detalhes específicos da história dos pais, com imagens sensoriais (sons, cheiros, luzes, texturas) e cenas do cotidiano.
- Varie o vocabulário e o ritmo das frases; versos e estrofes longas; evite repetições literais.
- Mantenha tom alegre e celebrativo e linguagem calorosa e familiar.


Extensão mínima (obrigatória):
- A música deve cumprir pelo menos um destes critérios:
- Duração-alvo: escrita para sustentar ≥ 5 minutos de performance;
- Comprimento textual: alvo 3.000 palavras, nunca menos de 2.500 caracteres.
- Para garantir densidade:
- Partes 1–6: versos longos;
- Parte 7 (clímax): a mais longa de todas;
- Parte 8: conclusão robusta (sem nomes novos).


Formato de resposta (APENAS JSON válido, sem Markdown e sem comentários):
- Não use asteriscos/sublinhados ou qualquer formatação Markdown nas letras.
- Retorne somente este JSON:


{
"verses": [
{ "type": "verse", "number": 1, "lyrics": "Letra da primeira parte (história inicial dos pais; cenas ricas e detalhes sensoriais)." },
{ "type": "verse", "number": 2, "lyrics": "Letra da segunda parte (sonhos e expectativas; planos concretos do casal)." },
{ "type": "verse", "number": 3, "lyrics": "Letra da terceira parte (vida com ${data.babies.length > 1 ? 'as crianças' : 'a criança'}; rotinas, aventuras, afeto; baseado na história dos pais)." },
{ "type": "verse", "number": 4, "lyrics": "Letra da quarta parte (símbolos, lugares e hábitos do casal; memórias e atmosferas)." },
{ "type": "verse", "number": 5, "lyrics": "Letra da quinta parte (aproximação do clímax; ternura e expectativa crescendo)." },
{ "type": "verse", "number": 6, "lyrics": "Letra da sexta parte (pré-clímax; silêncio, respirações, olhares; ainda sem revelar nomes)." },
{ "type": "verse", "number": 7, "lyrics": "CLÍMAX COM PAUSA: revelar ${data.babies.map(b => '"' + b.name + '"').join(' e ')} com grande ênfase e impacto emocional; ecoe significados e a história do casal." },
{ "type": "verse", "number": 8, "lyrics": "Letra final de conclusão (amor da família, alegria da chegada e futuro luminoso; sem introduzir nomes novos)." }
],
"style": "${data.musicalStyle}",
"theme": "cha_revelacao",
"language": "${data.language}",
"constraints": {
"target_minutes_min": 5,
"target_words_total": 3000,
"min_chars_total": 2500,
"names_only_in_verse": 7,
"no_gender_language": true,
"no_markdown_in_lyrics": true
}
}
`.trim();
},

  // Prompt para Aniversário
  aniversario: (data: SongData) => {
    const languageInstructions = {
      'pt': 'Crie a letra da música em PORTUGUÊS',
      'en': 'Create the song lyrics in ENGLISH',
      'es': 'Crea la letra de la canción en ESPAÑOL',
      'fr': 'Créez les paroles de la chanson en FRANÇAIS',
      'it': 'Crea il testo della canzone in ITALIANO'
    };

    return `
Você é um compositor especializado em músicas alegres para aniversários infantis.

${languageInstructions[data.language]} no estilo ${data.musicalStyle} para um aniversário com as seguintes informações:

**Informações da criança:**
- Nome: ${data.babies[0]?.name || 'Criança'}
- Sexo: ${data.babies[0]?.gender || 'masculino'}

**Tema do aniversário:**
${data.birthdayTheme}

**História a ser contada:**
${data.storyToTell}

**Instruções:**
1. A música deve ser alegre e festiva
2. Inclua o nome da criança na letra
3. Incorpore o tema do aniversário
4. Conte a história fornecida de forma musical
5. Use linguagem adequada para crianças
6. A música deve ter NO MÁXIMO 8 partes (entre estrofes e refrões)
7. Mantenha o tom divertido e celebrativo
8. Inclua elementos de festa e comemoração
9. **IMPORTANTE**: A letra deve ser escrita no idioma ${data.language === 'pt' ? 'português' : data.language === 'en' ? 'inglês' : data.language === 'es' ? 'espanhol' : data.language === 'fr' ? 'francês' : 'italiano'}
10. **TÍTULO**: Crie um título criativo e divertido para a música que reflita o tema do aniversário e o nome ${data.babies.map(baby => `"${baby.name}"`).join(' e ')}
11. **OBRIGATÓRIO**: A letra da música deve ter NO MÍNIMO 2.000 caracteres para garantir uma música completa e rica em detalhes.
12. **LIMITE DE PARTES**: A música deve ter NO MÁXIMO 8 partes no total. Você pode usar entre 3 a 8 partes conforme necessário, mas NUNCA exceder 8 partes.

**Formato de resposta:**
Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "title": "Título criativo e divertido da música (máximo 60 caracteres)",
  "verses": [
    {
      "type": "verse",
      "number": 1,
      "lyrics": "Letra da primeira estrofe"
    },
    {
      "type": "chorus",
      "lyrics": "Letra do refrão"
    },
    {
      "type": "verse",
      "number": 2,
      "lyrics": "Letra da segunda estrofe"
    }
  ],
  "style": "${data.musicalStyle}",
  "theme": "aniversario"
}
`;
  },

  // Prompt para Música de Amor
  love: (data: SongData) => {
    const languageInstructions = {
      'pt': 'Crie a letra da música em PORTUGUÊS',
      'en': 'Create the song lyrics in ENGLISH',
      'es': 'Crea la letra de la canción en ESPAÑOL',
      'fr': 'Créez les paroles de la chanson en FRANÇAIS',
      'it': 'Crea il testo della canzone in ITALIANO'
    };

    return `
Você é um compositor especializado em músicas românticas e emocionantes.

${languageInstructions[data.language]} no estilo ${data.musicalStyle} para uma música de amor com as seguintes informações:

**Nomes do casal ou pessoa amada:**
${data.coupleNames}

**História de amor:**
${data.loveStory}

**Instruções:**
1. A música deve ser romântica e emocionante
2. Inclua os nomes fornecidos na letra
3. Conte a história de amor de forma musical e poética
4. Use linguagem carinhosa e apaixonada
5. A música deve ter NO MÁXIMO 8 partes (entre estrofes e refrões)
6. Mantenha o tom romântico e envolvente
7. Inclua elementos de paixão, carinho e conexão emocional
8. **IMPORTANTE**: A letra deve ser escrita no idioma ${data.language === 'pt' ? 'português' : data.language === 'en' ? 'inglês' : data.language === 'es' ? 'espanhol' : data.language === 'fr' ? 'francês' : 'italiano'}
9. **TÍTULO**: Crie um título romântico e tocante para a música que reflita a história de amor
10. **OBRIGATÓRIO**: A letra da música deve ter NO MÍNIMO 2.000 caracteres para garantir uma música completa e rica em detalhes.
11. **LIMITE DE PARTES**: A música deve ter NO MÁXIMO 8 partes no total. Você pode usar entre 3 a 8 partes conforme necessário, mas NUNCA exceder 8 partes.

**Formato de resposta:**
Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "title": "Título romântico da música (máximo 60 caracteres)",
  "verses": [
    {
      "type": "verse",
      "number": 1,
      "lyrics": "Letra da primeira estrofe"
    },
    {
      "type": "chorus",
      "lyrics": "Letra do refrão"
    },
    {
      "type": "verse",
      "number": 2,
      "lyrics": "Letra da segunda estrofe"
    }
  ],
  "style": "${data.musicalStyle}",
  "theme": "love"
}
`;
  }
};

// Estilos musicais disponíveis
export const MUSICAL_STYLES = {
  pt: [
    'Pop',
    'Rock',
    'Sertanejo',
    'MPB',
    'Forró',
    'Pagode',
    'Funk',
    'Reggae',
    'Country',
    'Folk',
    'Infantil',
    'Gospel',
    'Acústico',
    'Folk Brasileiro'
  ],
  en: [
    'Pop',
    'Rock',
    'Country',
    'Folk',
    'R&B',
    'Hip Hop',
    'Reggae',
    'Blues',
    'Jazz',
    'Gospel',
    'Children\'s',
    'Acoustic'
  ],
  es: [
    'Pop',
    'Rock',
    'Reggaeton',
    'Salsa',
    'Bachata',
    'Merengue',
    'Folk',
    'Balada',
    'Cumbia',
    'Infantil'
  ],
  fr: [
    'Pop',
    'Rock',
    'Chanson',
    'Folk',
    'Jazz',
    'Reggae',
    'Acoustique',
    'Enfantine'
  ],
  it: [
    'Pop',
    'Rock',
    'Folk',
    'Jazz',
    'Canzone',
    'Acustico',
    'Per Bambini'
  ]
};

// Função helper para obter o prompt correto
export function getSongPrompt(
  songType: 'cha_revelacao' | 'aniversario' | 'love',
  language: 'pt' | 'en' | 'es' | 'fr' | 'it',
  data: SongData
): string {
  return SONG_PROMPTS[songType](data);
}