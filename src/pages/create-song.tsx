import { useState } from 'react';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Music, ArrowLeft, Sparkles, Baby, Heart, Star, Gift, PartyPopper } from 'lucide-react';

// Tipos para os diferentes tipos de música
type SongType = 'cha_revelacao' | 'aniversario';

interface BaseSongForm {
  childName: string;
  childGender: 'masculino' | 'feminino' | 'male' | 'female';
  musicalStyle: string;
  language: 'pt' | 'en';
}

interface ChaRevelacaoForm extends BaseSongForm {
  type: 'cha_revelacao';
  parentsStory: string;
}

interface AniversarioForm extends BaseSongForm {
  type: 'aniversario';
  birthdayTheme: string;
  storyToTell: string;
}

type SongForm = ChaRevelacaoForm | AniversarioForm;

export default function CreateSong() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<SongType | null>(null);
  const [form, setForm] = useState<SongForm | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<any>(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleTypeSelection = (type: SongType) => {
    setSelectedType(type);
    const baseForm = {
      childName: '',
      childGender: 'masculino' as const,
      musicalStyle: 'Pop',
      language: 'pt' as const,
    };

    if (type === 'cha_revelacao') {
      setForm({
        ...baseForm,
        type: 'cha_revelacao',
        parentsStory: '',
      });
    } else {
      setForm({
        ...baseForm,
        type: 'aniversario',
        birthdayTheme: '',
        storyToTell: '',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (!form) return;
    setForm(prev => ({ ...prev!, [field]: value }));
  };

  const generateSongLyrics = async () => {
    if (!form || !form.childName.trim()) {
      setError('Por favor, preencha o nome da criança');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar letra');
      }

      const data = await response.json();
      setGeneratedLyrics(data.lyrics);
    } catch (error) {
      console.error('Erro ao gerar letra:', error);
      setError('Erro ao gerar letra. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveLyrics = async () => {
    if (!generatedLyrics || !form) return;

    try {
      const response = await fetch('/api/save-lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          lyrics: generatedLyrics,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar letra');
      }

      alert('Letra salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar letra:', error);
      setError('Erro ao salvar letra. Tente novamente.');
    }
  };

  const useLyrics = () => {
    // Aqui será implementada a próxima etapa (criar música)
    alert('Próxima etapa: Criar música com esta letra!');
  };

  // Se nenhum tipo foi selecionado, mostrar opções
  if (!selectedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 to-baby-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-baby-pink-600 hover:text-baby-pink-800 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Voltar
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-baby-pink-700 mb-2 sm:mb-4 px-2">
              Criar Música Personalizada
            </h1>
            <p className="text-baby-pink-600 text-base sm:text-lg max-w-2xl mx-auto px-4">
              Escolha o tipo de música que você gostaria de criar
            </p>
          </div>

          {/* Opções de tipo de música */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Chá Revelação */}
            <div
              onClick={() => handleTypeSelection('cha_revelacao')}
              className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 cursor-pointer transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-baby-pink-300"
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-baby-pink-400 to-baby-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Baby className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-baby-pink-700 mb-3 sm:mb-4">
                  Chá Revelação
                </h3>
                <p className="text-baby-pink-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Crie uma música especial para revelar o sexo do seu bebê
                </p>
                <div className="text-left space-y-1 sm:space-y-2 text-xs sm:text-sm text-baby-pink-500">
                  <p>• Nome do bebê</p>
                  <p>• Sexo do bebê</p>
                  <p>• História dos pais</p>
                  <p>• Estilo musical</p>
                </div>
              </div>
            </div>

            {/* Aniversário */}
            <div
              onClick={() => handleTypeSelection('aniversario')}
              className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 cursor-pointer transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-baby-blue-300"
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-baby-blue-400 to-baby-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-baby-blue-700 mb-3 sm:mb-4">
                  Aniversário
                </h3>
                <p className="text-baby-blue-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Crie uma música personalizada para o aniversário da criança
                </p>
                <div className="text-left space-y-1 sm:space-y-2 text-xs sm:text-sm text-baby-blue-500">
                  <p>• Nome da criança</p>
                  <p>• Sexo da criança</p>
                  <p>• Tema do aniversário</p>
                  <p>• História a ser contada</p>
                  <p>• Estilo musical</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estilos musicais disponíveis
  const musicalStyles = [
    'Pop', 'Rock', 'Sertanejo', 'MPB', 'Infantil', 'Clássica', 
    'Jazz', 'Bossa Nova', 'Reggae', 'Folk', 'Acústica'
  ];

  // Formulário para o tipo selecionado
  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 to-baby-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <button
            onClick={() => setSelectedType(null)}
            className="inline-flex items-center text-baby-pink-600 hover:text-baby-pink-800 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Voltar às opções
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-baby-pink-700 mb-2 px-2">
            {selectedType === 'cha_revelacao' ? 'Chá Revelação' : 'Aniversário'}
          </h1>
          <p className="text-baby-pink-600 text-sm sm:text-base px-4">
            {selectedType === 'cha_revelacao' 
              ? 'Preencha as informações para criar uma música especial de revelação'
              : 'Preencha as informações para criar uma música de aniversário personalizada'
            }
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Formulário */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-baby-pink-700 mb-4 sm:mb-6">
                Informações da Música
              </h2>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Nome da criança */}
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    Nome da {selectedType === 'cha_revelacao' ? 'bebê' : 'criança'} *
                  </label>
                  <input
                    type="text"
                    value={form?.childName || ''}
                    onChange={(e) => handleInputChange('childName', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base"
                    placeholder={`Digite o nome da ${selectedType === 'cha_revelacao' ? 'bebê' : 'criança'}`}
                  />
                </div>

                {/* Sexo */}
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    Sexo *
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('childGender', 'masculino')}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                        form?.childGender === 'masculino'
                          ? 'border-baby-blue-400 bg-baby-blue-50 text-baby-blue-700'
                          : 'border-gray-200 hover:border-baby-blue-300'
                      }`}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('childGender', 'feminino')}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                        form?.childGender === 'feminino'
                          ? 'border-baby-pink-400 bg-baby-pink-50 text-baby-pink-700'
                          : 'border-gray-200 hover:border-baby-pink-300'
                      }`}
                    >
                      Feminino
                    </button>
                  </div>
                </div>

                {/* Campos específicos por tipo */}
                {selectedType === 'cha_revelacao' && form?.type === 'cha_revelacao' && (
                  <div>
                    <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                      História dos Pais *
                    </label>
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 Dica: Quanto mais detalhes você fornecer sobre a história de vocês (como se conheceram, avós, gostos, trabalho, histórias completas sobre o casal, etc.), melhor será a letra da música - mais rica em informações e personalizada!
                      </p>
                    </div>
                    <textarea
                      value={form.parentsStory}
                      onChange={(e) => handleInputChange('parentsStory', e.target.value)}
                      rows={4}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base resize-none"
                      placeholder="Conte um pouco sobre a história de vocês, como se conheceram, expectativas com o bebê..."
                    />
                  </div>
                )}

                {selectedType === 'aniversario' && form?.type === 'aniversario' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                        Tema do Aniversário *
                      </label>
                      <input
                        type="text"
                        value={form.birthdayTheme}
                        onChange={(e) => handleInputChange('birthdayTheme', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base"
                        placeholder="Ex: Princesas, Super-heróis, Unicórnios, Dinossauros..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                        História a ser Contada *
                      </label>
                      <textarea
                        value={form.storyToTell}
                        onChange={(e) => handleInputChange('storyToTell', e.target.value)}
                        rows={4}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base resize-none"
                        placeholder="Conte sobre a criança, suas qualidades, momentos especiais, o que ela gosta de fazer..."
                      />
                    </div>
                  </>
                )}

                {/* Estilo Musical */}
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    Estilo Musical *
                  </label>
                  <select
                    value={form?.musicalStyle || ''}
                    onChange={(e) => handleInputChange('musicalStyle', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base"
                  >
                    {musicalStyles.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    Idioma *
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('language', 'pt')}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                        form?.language === 'pt'
                          ? 'border-baby-pink-400 bg-baby-pink-50 text-baby-pink-700'
                          : 'border-gray-200 hover:border-baby-pink-300'
                      }`}
                    >
                      Português
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('language', 'en')}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                        form?.language === 'en'
                          ? 'border-baby-pink-400 bg-baby-pink-50 text-baby-pink-700'
                          : 'border-gray-200 hover:border-baby-pink-300'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Botão Gerar Letra */}
                <button
                  onClick={generateSongLyrics}
                  disabled={isGenerating || !form?.childName.trim()}
                  className="w-full bg-gradient-to-r from-baby-pink-500 to-baby-pink-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold hover:from-baby-pink-600 hover:to-baby-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center text-sm sm:text-base"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                      Gerando Letra...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Criar Letra
                    </>
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Área da Letra Gerada */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-baby-pink-700 mb-4 sm:mb-6">
                Letra da Música
              </h2>
              
              {!generatedLyrics ? (
                <div className="text-center py-8 sm:py-12 text-baby-pink-400">
                  <Music className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">A letra aparecerá aqui após a geração</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Letra */}
                  <div className="bg-baby-pink-50 p-3 sm:p-4 lg:p-6 rounded-lg">
                    {isEditing ? (
                      <textarea
                        value={typeof generatedLyrics === 'string' ? generatedLyrics : JSON.stringify(generatedLyrics, null, 2)}
                        onChange={(e) => setGeneratedLyrics(e.target.value)}
                        rows={10}
                        className="w-full p-3 sm:p-4 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm sm:text-base resize-none"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-baby-pink-800 font-medium leading-relaxed text-sm sm:text-base overflow-x-auto">
                        {typeof generatedLyrics === 'string' ? generatedLyrics : JSON.stringify(generatedLyrics, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex-1 bg-baby-blue-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:bg-baby-blue-600 transition-colors text-sm sm:text-base"
                    >
                      {isEditing ? 'Visualizar' : 'Editar'}
                    </button>
                    <button
                      onClick={saveLyrics}
                      className="flex-1 bg-green-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:bg-green-600 transition-colors text-sm sm:text-base"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={useLyrics}
                      className="flex-1 bg-gradient-to-r from-baby-pink-500 to-baby-pink-600 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:from-baby-pink-600 hover:to-baby-pink-700 transition-all text-sm sm:text-base"
                    >
                      Usar Letra
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'pt', ['common'])),
    },
  };
};