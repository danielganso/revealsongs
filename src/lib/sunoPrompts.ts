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

// Mapeamento de estilos musicais com descrições detalhadas para o Suno
const STYLE_DESCRIPTIONS: { [key: string]: { style: string; description: string } } = {
  // Estilos principais com descrições detalhadas
  'Pop': {
    style: 'Pop',
    description: 'Som moderno, melódico e cativante; bateria eletrônica, sintetizadores e voz expressiva.'
  },
  'Rock': {
    style: 'Rock',
    description: 'Energia e atitude; guitarras elétricas, baixo e bateria marcante.'
  },
  'Sertanejo': {
    style: 'Country Folk',
    description: 'Calor humano e emoção; violão, sanfona e percussão leve com toque country.'
  },
  'MPB': {
    style: 'Brazilian Popular Music',
    description: 'Clássico e sofisticado; violão, percussão suave e letras poéticas.'
  },
  'Clássica': {
    style: 'Classical',
    description: 'Orquestral e emocional; cordas, piano e harmonia complexa.'
  },
  'Jazz': {
    style: 'Jazz',
    description: 'Improvisado e elegante; saxofone, contrabaixo acústico, piano e bateria leve.'
  },
  'Bossa Nova': {
    style: 'Bossa Nova',
    description: 'Suave e intimista; violão, piano, leve toque de percussão e voz calma.'
  },
  'Reggae': {
    style: 'Reggae',
    description: 'Ritmo descontraído e positivo; guitarra com contratempo, baixo pulsante e bateria leve.'
  },
  'Folk': {
    style: 'Folk',
    description: 'Natural e storytelling; violão, gaita e vocais suaves.'
  },
  'Acoustic': {
    style: 'Acoustic',
    description: 'Simples e emocional; voz em destaque com violão limpo e timbres suaves.'
  },
  'Acústico': {
    style: 'Acoustic',
    description: 'Simples e emocional; voz em destaque com violão limpo e timbres suaves.'
  },
  'Infantil Animado': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  },
  'Infantil': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  },
  
  // Outros estilos existentes mantidos para compatibilidade
  'Forró': {
    style: 'Brazilian Folk',
    description: 'Tradicional nordestino; sanfona, zabumba e triângulo com ritmo dançante.'
  },
  'Pagode': {
    style: 'Brazilian Samba',
    description: 'Descontraído e alegre; cavaquinho, pandeiro e percussão brasileira.'
  },
  'Funk': {
    style: 'Funk',
    description: 'Batida marcante e groove; baixo pulsante e ritmo dançante.'
  },
  'Country': {
    style: 'Country',
    description: 'Narrativo e emocional; violão, banjo e harmônica com toque rural.'
  },
  'Gospel': {
    style: 'Gospel',
    description: 'Espiritual e elevado; coro, piano e órgão com mensagem inspiradora.'
  },
  'Folk Brasileiro': {
    style: 'Brazilian Folk',
    description: 'Raízes brasileiras; instrumentos regionais e melodias tradicionais.'
  },
  
  // Estilos internacionais
  'R&B': {
    style: 'R&B',
    description: 'Suave e soul; vocais expressivos, baixo groove e bateria laid-back.'
  },
  'Hip Hop': {
    style: 'Hip Hop',
    description: 'Urbano e ritmado; beats marcantes, samples e flow vocal.'
  },
  'Blues': {
    style: 'Blues',
    description: 'Melancólico e expressivo; guitarra slide, harmônica e vocais emotivos.'
  },
  'Children\'s': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  },
  'Animated Children\'s': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  },
  
  // Estilos latinos
  'Reggaeton': {
    style: 'Reggaeton',
    description: 'Urbano e dançante; batida dembow, sintetizadores e vocais ritmados.'
  },
  'Salsa': {
    style: 'Salsa',
    description: 'Tropical e festivo; trompetes, piano e percussão latina vibrante.'
  },
  'Bachata': {
    style: 'Bachata',
    description: 'Romântico e sensual; guitarra líder, bongôs e vocais apaixonados.'
  },
  'Merengue': {
    style: 'Merengue',
    description: 'Rápido e alegre; acordeão, saxofone e ritmo acelerado dançante.'
  },
  'Balada': {
    style: 'Ballad',
    description: 'Romântico e emocional; piano, cordas e vocais expressivos.'
  },
  'Cumbia': {
    style: 'Cumbia',
    description: 'Tradicional e festivo; acordeão, tambores e ritmo contagiante.'
  },
  
  // Estilos franceses
  'Chanson': {
    style: 'French Chanson',
    description: 'Poético e elegante; acordeão, piano e vocais narrativos franceses.'
  },
  'Acoustique': {
    style: 'Acoustic',
    description: 'Simples e emocional; voz em destaque com violão limpo e timbres suaves.'
  },
  'Enfantine': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  },
  
  // Estilos italianos
  'Canzone': {
    style: 'Italian Pop',
    description: 'Melódico e expressivo; piano, cordas e vocais apaixonados italianos.'
  },
  'Acustico': {
    style: 'Acoustic',
    description: 'Simples e emocional; voz em destaque com violão limpo e timbres suaves.'
  },
  'Per Bambini': {
    style: 'Children\'s Music',
    description: 'Alegre e divertido; instrumentos coloridos como xilofone, ukulele e palmas, com ritmo animado e voz carismática.'
  }
};

// Mapeamento de estilos musicais para o Suno (mantido para compatibilidade)
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
  'Animated Children\'s': 'Children\'s Music',
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
const CHA_REVELACAO_PROMPT = `Crie uma música para chá revelação no estilo musical {estilo_musical} ({descricao_estilo}) e com voz {voz}. A canção deve ter uma melodia suave e emocionante, transmitindo carinho e expectativa. A narrativa deve conduzir os ouvintes pela celebração e suspense do momento, criando um clima de ternura e alegria. Dê ênfase especial ao final, onde acontece a grande revelação do nome, trazendo intensidade e emoção para marcar esse instante único.`;

// Prompt específico para música de amor
const LOVE_PROMPT = `Crie uma música de amor no estilo musical {estilo_musical} ({descricao_estilo}) e com voz {voz}. A canção deve transmitir paixão e uma história de esperança e amor, enfatizando os momentos passados juntos. A melodia deve ser romântica e envolvente, criando uma atmosfera íntima e emocional. Dê ênfase especial aos sentimentos profundos e à conexão entre as pessoas, trazendo calor e ternura para celebrar o amor verdadeiro.`;

// Prompt específico para aniversário
const ANIVERSARIO_PROMPT = `Crie uma música de aniversário infantil no estilo musical {estilo_musical} ({descricao_estilo}) e com voz {voz}. A canção deve ter uma melodia alegre e festiva, transmitindo diversão e celebração. A narrativa deve conduzir os ouvintes pela festa de aniversário, criando um clima de alegria e comemoração. Dê ênfase especial aos momentos de celebração, trazendo energia e felicidade para marcar esse dia especial.`;

export function generateSunoPrompt(data: SunoSongData): string {
  // Buscar informações do estilo com descrição detalhada
  const styleInfo = STYLE_DESCRIPTIONS[data.style];
  const estilo_musical = styleInfo ? styleInfo.style : data.style;
  const descricao_estilo = styleInfo ? styleInfo.description : '';
  const voz = data.vocalGender === 'male' ? 'masculina' : 'feminina';
  
  if (data.theme === 'cha_revelacao') {
    return CHA_REVELACAO_PROMPT
      .replace('{estilo_musical}', estilo_musical)
      .replace('{descricao_estilo}', descricao_estilo)
      .replace('{voz}', voz);
  } else if (data.theme === 'love') {
    return LOVE_PROMPT
      .replace('{estilo_musical}', estilo_musical)
      .replace('{descricao_estilo}', descricao_estilo)
      .replace('{voz}', voz);
  } else {
    return ANIVERSARIO_PROMPT
      .replace('{estilo_musical}', estilo_musical)
      .replace('{descricao_estilo}', descricao_estilo)
      .replace('{voz}', voz);
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