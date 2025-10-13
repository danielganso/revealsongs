// Prompts específicos para a API do Suno
// Este arquivo gera prompts otimizados para criação de música na plataforma Suno

export interface SunoSongData {
  lyrics: string;
  title: string;
  style: string;
  language: 'pt' | 'en' | 'es' | 'fr' | 'it';
  theme: 'cha_revelacao' | 'aniversario' | 'love';
  vocalGender: 'male' | 'female';
}

export interface SunoApiRequest {
  prompt: string;
  style: string;
  title: string;
  customMode: boolean;
  instrumental: boolean;
  model: string;
  vocalGender: string;
  styleWeight: number;
  weirdnessConstraint: number;
  audioWeight: number;
}

// Mapeamento de estilos musicais para o Suno
const SUNO_STYLE_MAPPING: { [key: string]: string } = {
  // Português
  'Pop': 'Pop',
  'Rock': 'Rock',
  'Sertanejo': 'Country Folk',
  'MPB': 'Brazilian Popular Music',
  'Forró': 'Brazilian Folk',
  'Pagode': 'Brazilian Samba',
  'Funk': 'Funk',
  'Reggae': 'Reggae',
  'Country': 'Country',
  'Folk': 'Folk',
  'Infantil': 'Children\'s Music',
  'Gospel': 'Gospel',
  'Acústico': 'Acoustic',
  'Folk Brasileiro': 'Brazilian Folk',
  
  // Inglês
  'R&B': 'R&B',
  'Hip Hop': 'Hip Hop',
  'Blues': 'Blues',
  'Jazz': 'Jazz',
  'Children\'s': 'Children\'s Music',
  'Acoustic': 'Acoustic',
  
  // Espanhol
  'Reggaeton': 'Reggaeton',
  'Salsa': 'Salsa',
  'Bachata': 'Bachata',
  'Merengue': 'Merengue',
  'Balada': 'Ballad',
  'Cumbia': 'Cumbia',
  
  // Francês
  'Chanson': 'French Chanson',
  'Acoustique': 'Acoustic',
  'Enfantine': 'Children\'s Music',
  
  // Italiano
  'Canzone': 'Italian Pop',
  'Acustico': 'Acoustic',
  'Per Bambini': 'Children\'s Music'
};

/**
 * Gera um prompt otimizado para a API do Suno
 */
// Prompt específico para chá revelação
const CHA_REVELACAO_PROMPT = `Crie uma música para chá revelação no estilo musical {estilo_musical} e com voz {voz}. A canção deve ter uma melodia suave e emocionante, transmitindo carinho e expectativa. A narrativa deve conduzir os ouvintes pela celebração e suspense do momento, criando um clima de ternura e alegria. Dê ênfase especial ao final, onde acontece a grande revelação do nome, trazendo intensidade e emoção para marcar esse instante único.`;

// Prompt específico para música de amor
const LOVE_PROMPT = `Crie uma música de amor no estilo musical {estilo_musical} e com voz {voz}. A canção deve transmitir paixão e uma história de esperança e amor, enfatizando os momentos passados juntos. A melodia deve ser romântica e envolvente, criando uma atmosfera íntima e emocional. Dê ênfase especial aos sentimentos profundos e à conexão entre as pessoas, trazendo calor e ternura para celebrar o amor verdadeiro.`;

export function generateSunoPrompt(data: SunoSongData): string {
  const estilo_musical = data.style; // Usar o estilo original sem mapeamento
  const voz = data.vocalGender === 'male' ? 'masculina' : 'feminina';
  
  if (data.theme === 'cha_revelacao') {
    return CHA_REVELACAO_PROMPT
      .replace('{estilo_musical}', estilo_musical)
      .replace('{voz}', voz);
  } else if (data.theme === 'love') {
    return LOVE_PROMPT
      .replace('{estilo_musical}', estilo_musical)
      .replace('{voz}', voz);
  } else {
    return `Crie uma música de aniversário infantil no estilo musical ${estilo_musical} e com voz ${voz}. A canção deve ter uma melodia alegre e festiva, transmitindo diversão e celebração. A narrativa deve conduzir os ouvintes pela festa de aniversário, criando um clima de alegria e comemoração. Dê ênfase especial aos momentos de celebração, trazendo energia e felicidade para marcar esse dia especial.`;
  }
}

/**
 * Mapeia o estilo musical para o formato do Suno
 */
export function mapStyleForSuno(style: string): string {
  return SUNO_STYLE_MAPPING[style] || style;
}

/**
 * Gera a requisição completa para a API do Suno
 */
export function generateSunoApiRequest(data: SunoSongData): SunoApiRequest {
  return {
    prompt: data.lyrics, // A letra vai no campo "prompt"
    style: generateSunoPrompt(data), // O prompt de estilo vai no campo "style"
    title: data.title,
    customMode: true,
    instrumental: false,
    model: "V5",
    vocalGender: data.vocalGender === 'male' ? 'm' : 'f',
    styleWeight: 0.65,
    weirdnessConstraint: 0.65,
    audioWeight: 0.65
  };
}

/**
 * Valida se os dados estão completos para gerar a música
 */
export function validateSunoData(data: Partial<SunoSongData>): data is SunoSongData {
  return !!(
    data.lyrics &&
    data.title &&
    data.style &&
    data.language &&
    data.theme &&
    data.vocalGender
  );
}