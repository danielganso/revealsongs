import { useState, useEffect } from 'react';
import { Music, Sparkles, Baby, Gift, Heart, ArrowLeft, Plus, X, Cake } from 'lucide-react';
import { translations, Language } from '../lib/translations';
import { supabase } from '../lib/supabase';
import MusicGenerationModal from './MusicGenerationModal';
import UserLyricsTable from './UserLyricsTable';

// Tipos para os diferentes tipos de música
type SongType = 'cha_revelacao' | 'aniversario' | 'love';

interface Baby {
  name: string;
  gender: 'masculino' | 'feminino';
}

interface BaseSongForm {
  babies: Baby[];
  musicalStyle: string;
  vocalGender: 'male' | 'female';
  language: 'pt' | 'en' | 'es' | 'fr' | 'it';
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

interface LoveForm {
  type: 'love';
  coupleNames: string;
  loveStory: string;
  musicalStyle: string;
  vocalGender: 'male' | 'female';
  language: 'pt' | 'en' | 'es' | 'fr' | 'it';
}

type SongForm = ChaRevelacaoForm | AniversarioForm | LoveForm;

interface CreateSongComponentProps {
  onBack?: () => void;
  language: Language;
  editingLyricData?: any;
  subscriptionData?: any;
  creditsRemaining?: number;
  onShowCreditsModal?: () => void;
}

export default function CreateSongComponent({ onBack, language, editingLyricData, subscriptionData, creditsRemaining = 0, onShowCreditsModal }: CreateSongComponentProps) {
  const t = translations[language as keyof typeof translations];
  const [selectedType, setSelectedType] = useState<SongType | null>(null);
  const [form, setForm] = useState<SongForm | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<any>(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingLyricId, setEditingLyricId] = useState<string | null>(null);
  
  // Estados para os novos modais
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [currentMusicId, setCurrentMusicId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Estados para atualização global de músicas
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  // useEffect para processar dados de edição vindos do dashboard
  useEffect(() => {
    if (editingLyricData) {
      // Configurar o tipo baseado na letra selecionada
      setSelectedType(editingLyricData.song_type);
      
      // Armazenar o ID da letra sendo editada
      setEditingLyricId(editingLyricData.id);
      
      // Reconstruir o formulário baseado nos dados da letra
      const baseForm = {
          babies: editingLyricData.baby_names ? editingLyricData.baby_names.map((name: string, index: number) => ({
            name,
            gender: editingLyricData.baby_genders?.[index] || 'masculino'
          })) : [{ name: '', gender: 'masculino' }],
          musicalStyle: editingLyricData.musical_style,
          vocalGender: editingLyricData.vocal_gender || 'male',
          language: language as 'pt' | 'en' | 'es' | 'fr' | 'it',
      };

      if (editingLyricData.song_type === 'cha_revelacao') {
        setForm({
          ...baseForm,
          type: 'cha_revelacao',
          parentsStory: editingLyricData.parents_story || '',
        });
      } else {
        setForm({
          ...baseForm,
          type: 'aniversario',
          birthdayTheme: editingLyricData.birthday_theme || '',
          storyToTell: editingLyricData.story_to_tell || '',
        });
      }

      // Definir a letra gerada e modo de edição
      setGeneratedLyrics(editingLyricData.lyrics);
      setIsEditing(true);
    }
  }, [editingLyricData]);

  const handleTypeSelection = (type: SongType) => {
    setSelectedType(type);
    
    // Traduzir "Infantil Animado" baseado no idioma para o padrão
    const infantilAnimadoDefault = language === 'en' ? 'Animated Children\'s' : 
                                  'Infantil Animado'; // português (padrão)
    
    const baseForm = {
      babies: [{ name: '', gender: 'masculino' as const }],
      musicalStyle: 'Pop', // Definindo Pop como padrão para todos os tipos
      vocalGender: 'male' as const,
      language: 'pt' as const,
    };

    if (type === 'cha_revelacao') {
      setForm({
        ...baseForm,
        type: 'cha_revelacao',
        parentsStory: '',
      });
    } else if (type === 'aniversario') {
      setForm({
        ...baseForm,
        type: 'aniversario',
        birthdayTheme: '',
        storyToTell: '',
      });
    } else {
      // Definir "Acústica / Romântica" como padrão para Love
      const acusticaRomanticaDefault = language === 'en' ? 'Acoustic / Romantic' : 'Acústica / Romântica';
      
      setForm({
        type: 'love',
        coupleNames: '',
        loveStory: '',
        musicalStyle: acusticaRomanticaDefault,
        vocalGender: 'male' as const,
        language: 'pt' as const,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (!form) return;
    setForm(prev => ({ ...prev!, [field]: value }));
  };

  const handleBabyChange = (index: number, field: 'name' | 'gender', value: string) => {
    if (!form || form.type === 'love') return;
    if ('babies' in form) {
      const updatedBabies = [...form.babies];
      updatedBabies[index] = { ...updatedBabies[index], [field]: value };
      setForm(prev => ({ ...prev!, babies: updatedBabies }));
    }
  };

  const addBaby = () => {
    if (!form || form.type === 'love') return;
    if ('babies' in form && form.babies.length < 3) {
      const newBaby: Baby = { name: '', gender: 'masculino' };
      setForm(prev => {
        if (prev && 'babies' in prev) {
          return { ...prev, babies: [...prev.babies, newBaby] };
        }
        return prev;
      });
    }
  };

  const removeBaby = (index: number) => {
    if (!form || form.type === 'love') return;
    if ('babies' in form && form.babies.length > 1) {
      const updatedBabies = form.babies.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev!, babies: updatedBabies }));
    }
  };

  const generateSongLyrics = async () => {
    if (!form) {
      setError('Por favor, preencha os campos obrigatórios');
      return;
    }
    
    // Validação específica por tipo
    if (form.type === 'love') {
      if (!('coupleNames' in form) || !form.coupleNames?.trim()) {
        setError('Por favor, preencha os nomes do casal');
        return;
      }
    } else {
      if (!('babies' in form) || !form.babies.some((baby: Baby) => baby.name.trim())) {
        setError('Por favor, preencha pelo menos um nome de bebê/criança');
        return;
      }
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
      // Agora a API retorna apenas o conteúdo das letras como string
      setGeneratedLyrics(data.lyrics);
      setIsFormCollapsed(true); // Recolher formulário após gerar letra
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
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Determinar se é uma atualização ou criação
      const isUpdate = editingLyricId !== null;
      const endpoint = isUpdate ? '/api/update-lyrics' : '/api/save-lyrics';
      const method = isUpdate ? 'PUT' : 'POST';

      const requestBody = {
        ...form,
        lyrics: typeof generatedLyrics === 'string' ? generatedLyrics : generatedLyrics.content,
        ...(isUpdate && { id: editingLyricId })
      };

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(isUpdate ? 'Erro ao atualizar letra' : 'Erro ao salvar letra');
      }

      const message = isUpdate ? t.lyricsUpdatedSuccess : t.lyricsSavedSuccess;
      setSuccessMessage(message);
      setShowSuccessModal(true);
      
      // Se foi uma atualização, limpar o estado de edição
      if (isUpdate) {
        setIsEditing(false);
        setEditingLyricId(null);
      }
    } catch (error) {
      console.error('Erro ao salvar/atualizar letra:', error);
      const errorMessage = editingLyricId ? 'Erro ao atualizar letra. Tente novamente.' : 'Erro ao salvar letra. Tente novamente.';
      setError(errorMessage);
    }
  };

  // Função para atualizar todas as músicas
  const handleUpdateAllMusic = async () => {
    try {
      setIsUpdatingAll(true);

      // Buscar todas as músicas do usuário que estão em status 'generating'
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Erro: Usuário não autenticado');
        return;
      }

      const { data: generatingMusic, error: fetchError } = await supabase
        .from('generated_music')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'generating');

      if (fetchError) {
        console.error('Erro ao buscar músicas:', fetchError);
        return;
      }

      if (!generatingMusic || generatingMusic.length === 0) {
        alert(language === 'pt' ? 'Nenhuma música em geração para atualizar' : 'No music generating to update');
        return;
      }

      // Atualizar cada música individualmente
      const updatePromises = generatingMusic.map(async (music: any) => {
        try {
          const response = await fetch(`/api/check-music-status?musicId=${music.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            const result = await response.json();
            return { success: true, musicId: music.id, data: result };
          } else {
            return { success: false, musicId: music.id, error: 'Erro na requisição' };
          }
        } catch (error) {
          return { success: false, musicId: music.id, error: error };
        }
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      
      alert(language === 'pt' 
        ? `Atualização concluída: ${successCount}/${generatingMusic.length} músicas verificadas`
        : `Update completed: ${successCount}/${generatingMusic.length} songs checked`
      );
      
      // Recarregar a página para mostrar as atualizações
      window.location.reload();

    } catch (error) {
      console.error('Erro ao atualizar músicas:', error);
      alert(language === 'pt' ? 'Erro ao atualizar músicas' : 'Error updating music');
    } finally {
      setIsUpdatingAll(false);
    }
  };

  // Função para gerar música a partir de uma letra salva
  const generateMusicFromLyric = async (lyricId: string) => {
    try {
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer requisição para gerar música usando o lyric_id
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lyric_id: lyricId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentMusicId(result.data.id);
        setShowMusicModal(true);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao gerar música:', error);
      setError('Erro ao iniciar geração de música. Tente novamente.');
    }
  };

  const useLyrics = () => {
    // Mostrar modal de confirmação em vez de window.confirm
    setShowConfirmModal(true);
  };

  // Função para gerar música
  const handleMusicGeneration = async () => {
    // Verificação de segurança: verificar se tem pelo menos 1 crédito
    if (creditsRemaining < 1) {
      if (onShowCreditsModal) {
        onShowCreditsModal();
      } else {
        setError('Você não tem créditos suficientes para gerar música. Compre mais créditos para continuar.');
      }
      return;
    }

    if (!generatedLyrics || !form) return;
    
    try {
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados completos do formulário
      const musicData = {
        lyrics: generatedLyrics,
        title: 'Music',
        style: form.musicalStyle,
        language: form.language,
        theme: form.type,
        vocalGender: form.vocalGender,
        // Dados adicionais do formulário
        baby_names: 'babies' in form ? form.babies.map((baby: Baby) => baby.name) : [],
        baby_genders: 'babies' in form ? form.babies.map((baby: Baby) => baby.gender) : [],
        babies_count: 'babies' in form ? form.babies.length : 0,
        song_type: form.type,
        musical_style: form.musicalStyle,
        // Dados específicos por tipo de música
        ...(form.type === 'cha_revelacao' && {
          parents_story: form.parentsStory
        }),
        ...(form.type === 'aniversario' && {
          birthday_theme: form.birthdayTheme,
          story_to_tell: form.storyToTell
        }),
        ...(form.type === 'love' && {
          couple_names: form.coupleNames,
          love_story: form.loveStory
        })
      };

      // Fazer requisição para gerar música
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(musicData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCurrentMusicId(result.data.id);
        setShowMusicModal(true);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao gerar música:', error);
      setError('Erro ao iniciar geração de música. Tente novamente.');
    }
  };

  // Função para editar uma letra existente
  const handleEditLyric = (lyric: any) => {
    // Configurar o tipo baseado na letra selecionada
    setSelectedType(lyric.song_type);
    
    // Armazenar o ID da letra sendo editada
    setEditingLyricId(lyric.id);
    
    // Reconstruir o formulário baseado nos dados da letra
    const baseForm = {
        babies: lyric.baby_names ? lyric.baby_names.map((name: string, index: number) => ({
          name,
          gender: lyric.baby_genders?.[index] || 'masculino'
        })) : [{ name: '', gender: 'masculino' }],
        musicalStyle: lyric.musical_style,
        vocalGender: lyric.vocal_gender || 'male',
        language: language as 'pt' | 'en' | 'es' | 'fr' | 'it',
    };

    if (lyric.song_type === 'cha_revelacao') {
      setForm({
        ...baseForm,
        type: 'cha_revelacao',
        parentsStory: lyric.parents_story || '',
      });
    } else {
      setForm({
        ...baseForm,
        type: 'aniversario',
        birthdayTheme: lyric.birthday_theme || '',
        storyToTell: lyric.story_to_tell || '',
      });
    }

    // Definir a letra gerada e modo de edição
    setGeneratedLyrics(lyric.lyrics);
    setIsEditing(true);
  };

  // Função chamada quando a música estiver pronta
  const handleMusicReady = (musicData: any) => {
    // Fechar o modal
    setShowMusicModal(false);
    setCurrentMusicId(null);
    
    // Redirecionar para a página de criar música (recarregar a página para mostrar a tabela atualizada)
    window.location.reload();
  };

  const resetToSelection = () => {
    setSelectedType(null);
    setForm(null);
    setGeneratedLyrics(null);
    setError('');
    setIsEditing(false);
  };

  // Se nenhum tipo foi selecionado, mostrar opções
  if (!selectedType) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-pink-600 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-pink-700 mb-4 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t.backToOptions}
            </button>
          )}
          <h2 className="text-3xl font-bold text-baby-pink-700 mb-4">
            {t.createSongTitle}
          </h2>
          <p className="text-baby-pink-600 text-lg">
            {t.createSongSubtitle}
          </p>
        </div>

        {/* Opções de tipo de música */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-4 lg:gap-6 mb-3 sm:mb-6 lg:mb-8">
          <div
            onClick={() => handleTypeSelection('cha_revelacao')}
            className="bg-white rounded-md sm:rounded-xl lg:rounded-2xl shadow-lg p-1 sm:p-4 lg:p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-baby-pink-300"
          >
            <div className="text-center">
              <div className="mb-1 sm:mb-3 lg:mb-4">
                <Baby className="mx-auto h-5 w-5 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-baby-pink-500" />
              </div>
              <h3 className="text-xs sm:text-lg lg:text-xl font-semibold text-gray-800 mb-0.5 sm:mb-2">
                {t.genderRevealTitle}
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                {t.genderRevealDescription}
              </p>
            </div>
          </div>

          <div
            onClick={() => handleTypeSelection('aniversario')}
            className="bg-white rounded-md sm:rounded-xl lg:rounded-2xl shadow-lg p-1 sm:p-4 lg:p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-baby-blue-300"
          >
            <div className="text-center">
              <div className="mb-1 sm:mb-3 lg:mb-4">
                <Cake className="mx-auto h-5 w-5 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-baby-blue-500" />
              </div>
              <h3 className="text-xs sm:text-lg lg:text-xl font-semibold text-gray-800 mb-0.5 sm:mb-2">
                {t.birthdayTitle}
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                {t.birthdayDescription}
              </p>
            </div>
          </div>

          <div
            onClick={() => handleTypeSelection('love')}
            className="bg-white rounded-md sm:rounded-2xl shadow-lg p-1 sm:p-4 lg:p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-red-300"
          >
            <div className="text-center">
              <div className="mb-1 sm:mb-3 lg:mb-4">
                <Heart className="mx-auto h-5 w-5 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-500" />
              </div>
              <h3 className="text-xs sm:text-lg lg:text-xl font-semibold text-gray-800 mb-0.5 sm:mb-2">
                {t.loveTitle}
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">
                {t.loveDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Botão Atualizar Global */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleUpdateAllMusic}
            disabled={isUpdatingAll}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
              isUpdatingAll 
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isUpdatingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{language === 'pt' ? 'Atualizando...' : 'Updating...'}</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>{language === 'pt' ? 'Atualizar' : 'Update'}</span>
              </>
            )}
          </button>
        </div>

        {/* Tabela de letras criadas */}
        <UserLyricsTable 
          onEditLyric={handleEditLyric}
          onGenerateMusic={generateMusicFromLyric}
          language={language}
        />
      </div>
    );
  }

  // Estilos musicais disponíveis por tipo
  const getMusicalStyles = (type: SongType) => {
    const baseStyles = ['Pop', 'Rock', 'Sertanejo', 'MPB', 'Clássica', 'Jazz', 'Bossa Nova', 'Reggae', 'Folk'];
    
    // Traduzir "Acústica" baseado no idioma
    const acustica = language === 'en' ? 'Acoustic' : 'Acústica';
    
    if (type === 'aniversario') {
      // Traduzir "Infantil Animado" baseado no idioma
      const infantilAnimado = language === 'en' ? 'Animated Children\'s' : 
                             'Infantil Animado'; // português (padrão)
      
      return [...baseStyles, infantilAnimado, acustica];
    } else if (type === 'cha_revelacao') {
      return [...baseStyles, acustica];
    } else if (type === 'love') {
      // Traduzir "Acústica / Romântica" baseado no idioma
      const acusticaRomantica = language === 'en' ? 'Acoustic / Romantic' : 'Acústica / Romântica';
      return [...baseStyles, acusticaRomantica];
    }
    
    return baseStyles;
  };

  const musicalStyles = getMusicalStyles(selectedType);

  // Formulário para o tipo selecionado
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <button
          onClick={resetToSelection}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-pink-600 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-pink-700 mb-4 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t.backToOptions}
        </button>
        <h2 className="text-2xl font-bold text-baby-pink-700 mb-2">
          {selectedType === 'cha_revelacao' ? t.genderRevealTitle : 
           selectedType === 'aniversario' ? t.birthdayTitle : 
           t.loveTitle}
        </h2>
        <p className="text-baby-pink-600">
          {selectedType === 'cha_revelacao' 
            ? t.genderRevealDescription
            : selectedType === 'aniversario'
            ? t.birthdayDescription
            : t.loveDescription
          }
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className={`bg-white rounded-2xl shadow-lg p-6 transition-all duration-300 ${isFormCollapsed ? 'lg:col-span-1 order-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-baby-pink-700">
              {t.formMusicInfo}
            </h3>
            {generatedLyrics && (
              <button
                onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                className="text-baby-pink-600 hover:text-baby-pink-800 transition-colors p-2 rounded-lg hover:bg-baby-pink-50"
                title={isFormCollapsed ? 'Mostrar Formulário' : 'Ocultar Formulário'}
              >
                {isFormCollapsed ? '⬇️' : '⬆️'}
              </button>
            )}
          </div>
          
          {!isFormCollapsed && (
            <div className="space-y-4">
            {/* Bebês - apenas para cha_revelacao e aniversario */}
            {selectedType !== 'love' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-baby-pink-700">
                    {t.formBabies} *
                  </label>
                  {form && 'babies' in form && form.babies.length < 3 && (
                    <button
                      type="button"
                      onClick={addBaby}
                      className="inline-flex items-center px-3 py-1 text-sm bg-baby-pink-100 text-baby-pink-700 rounded-lg hover:bg-baby-pink-200 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t.formAddBaby}
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {form && 'babies' in form && form.babies.map((baby, index) => (
                    <div key={index} className="border border-baby-pink-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-baby-pink-700">
                          {t.formBabyName} {index + 1}
                        </h4>
                        {form.babies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBaby(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {/* Nome */}
                        <div>
                          <label className="block text-xs font-medium text-baby-pink-600 mb-1">
                            {t.formBabyName}
                          </label>
                          <input
                            type="text"
                            value={baby.name}
                            onChange={(e) => handleBabyChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent text-sm"
                            placeholder={t.formBabyNamePlaceholder}
                          />
                        </div>
                        
                        {/* Sexo */}
                        <div>
                          <label className="block text-xs font-medium text-baby-pink-600 mb-2">
                            {t.formGender} *
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleBabyChange(index, 'gender', 'masculino')}
                              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                                baby.gender === 'masculino'
                                  ? 'border-baby-blue-400 bg-baby-blue-50 text-baby-blue-700'
                                  : 'border-gray-200 hover:border-baby-blue-300'
                              }`}
                            >
                              {t.formMale}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBabyChange(index, 'gender', 'feminino')}
                              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                                baby.gender === 'feminino'
                                  ? 'border-baby-pink-400 bg-baby-pink-50 text-baby-pink-700'
                                  : 'border-gray-200 hover:border-baby-pink-300'
                              }`}
                            >
                              {t.formFemale}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campos específicos por tipo */}
            {selectedType === 'cha_revelacao' && form?.type === 'cha_revelacao' && (
              <div>
                <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                  {t.formParentsStory} *
                </label>
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {t.formParentsStoryHelpText}
                  </p>
                </div>
                <div className="relative">
                  <textarea
                    value={form.parentsStory}
                    onChange={(e) => handleInputChange('parentsStory', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
                    placeholder={t.formParentsStoryPlaceholder}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-gray-500">
                      {form.parentsStory?.length || 0} {t.characterCount}
                    </div>
                    <div className="text-xs text-blue-600">
                      {t.characterCountGuidance}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'aniversario' && form?.type === 'aniversario' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    {t.formBirthdayTheme} *
                  </label>
                  <input
                    type="text"
                    value={form.birthdayTheme}
                    onChange={(e) => handleInputChange('birthdayTheme', e.target.value)}
                    className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
                    placeholder={t.formBirthdayThemePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    {t.formStoryToTell} *
                  </label>
                  <div className="relative">
                    <textarea
                      value={form.storyToTell}
                      onChange={(e) => handleInputChange('storyToTell', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
                      placeholder={t.formStoryToTellPlaceholder}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm text-gray-500">
                        {form.storyToTell?.length || 0} {t.characterCount}
                      </div>
                      <div className="text-xs text-blue-600">
                        {t.characterCountGuidance}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedType === 'love' && form?.type === 'love' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    {t.formCoupleNames} *
                  </label>
                  <input
                    type="text"
                    value={form.coupleNames}
                    onChange={(e) => handleInputChange('coupleNames', e.target.value)}
                    className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
                    placeholder={t.formCoupleNamesPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                    {t.formLoveStory} *
                  </label>
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      {t.formLoveStoryHelpText}
                    </p>
                  </div>
                  <div className="relative">
                    <textarea
                      value={form.loveStory}
                      onChange={(e) => handleInputChange('loveStory', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
                      placeholder={t.formLoveStoryPlaceholder}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm text-gray-500">
                        {form.loveStory?.length || 0} {t.characterCount}
                      </div>
                      <div className="text-xs text-blue-600">
                        {t.characterCountGuidance}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Estilo Musical */}
            <div>
              <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                {t.formMusicalStyle} *
              </label>
              <select
                value={form?.musicalStyle || ''}
                onChange={(e) => handleInputChange('musicalStyle', e.target.value)}
                className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
              >
                {musicalStyles.map((style) => {
                  let displayStyle = style;
                  
                  // Adicionar estrela apenas para estilos favoritos específicos por tipo
                  const infantilAnimadoTranslated = language === 'en' ? 'Animated Children\'s' : 
                                                   'Infantil Animado';
                  
                  const acusticaTranslated = language === 'en' ? 'Acoustic' : 'Acústica';
                  const acusticaRomanticaTranslated = language === 'en' ? 'Acoustic / Romantic' : 'Acústica / Romântica';
                  
                  if (selectedType === 'aniversario' && style === infantilAnimadoTranslated) {
                    displayStyle = `⭐ ${style}`;
                  } else if (selectedType === 'cha_revelacao' && style === acusticaTranslated) {
                    displayStyle = `⭐ ${style}`;
                  } else if (selectedType === 'love' && style === acusticaRomanticaTranslated) {
                    displayStyle = `⭐ ${style}`;
                  }
                  
                  return (
                    <option key={style} value={style}>
                      {displayStyle}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Tipo de Voz */}
            <div>
              <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                {t.formVoiceType} *
              </label>
              <select
                value={form?.vocalGender || 'male'}
                onChange={(e) => handleInputChange('vocalGender', e.target.value)}
                className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
              >
                <option value="male">{t.formMaleVoice}</option>
                <option value="female">{t.formFemaleVoice}</option>
              </select>
            </div>

            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium text-baby-pink-700 mb-2">
                {t.formLanguage} *
              </label>
              <select
                value={form?.language || ''}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-4 py-3 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent"
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
              </select>
            </div>

            {/* Botão Gerar Letra */}
            <button
              onClick={generateSongLyrics}
              disabled={isGenerating || (
                selectedType === 'love' 
                  ? !form || !('coupleNames' in form) || !form.coupleNames?.trim()
                  : !form || !('babies' in form) || !form.babies.some(baby => baby.name.trim())
              )}
              className="w-full bg-gradient-to-r from-baby-pink-500 to-baby-pink-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-baby-pink-600 hover:to-baby-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t.generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t.generateLyrics}
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Área da Letra Gerada */}
        <div className={`bg-white rounded-2xl shadow-lg p-6 ${isFormCollapsed ? 'lg:col-span-2 order-1' : ''}`}>
          <h3 className="text-xl font-bold text-baby-pink-700 mb-4">
              {t.formSongLyrics}
            </h3>
          
          {!generatedLyrics ? (
            <div className="text-center py-12 text-baby-pink-400">
              <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t.formLyricsWillAppear}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Letra */}
              <div className="bg-baby-pink-50 p-4 rounded-lg">
                {isEditing ? (
                  <textarea
                    value={typeof generatedLyrics === 'string' ? generatedLyrics : JSON.stringify(generatedLyrics, null, 2)}
                    onChange={(e) => setGeneratedLyrics(e.target.value)}
                    rows={isFormCollapsed ? 20 : 12}
                    className="w-full p-4 border border-baby-pink-200 rounded-lg focus:ring-2 focus:ring-baby-pink-400 focus:border-transparent resize-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-baby-pink-800 font-medium leading-relaxed text-sm max-h-96 overflow-y-auto">
                    {typeof generatedLyrics === 'string' ? generatedLyrics : JSON.stringify(generatedLyrics, null, 2)}
                  </pre>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col gap-3">
                {/* Primeira linha com Editar e Salvar */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex-1 bg-baby-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-baby-blue-600 transition-colors text-sm"
                  >
                    {isEditing ? t.view : t.edit}
                  </button>
                  <button
                    onClick={saveLyrics}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors text-sm"
                  >
                    {t.save}
                  </button>
                </div>
                
                {/* Segunda linha com o botão Gerar Música mais destacado */}
                <button
                  onClick={useLyrics}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <Music className="w-6 h-6" />
                  {t.useLyrics}
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <MusicGenerationModal
        isOpen={showMusicModal}
        onClose={() => {
          setShowMusicModal(false);
          setCurrentMusicId(null);
        }}
        musicId={currentMusicId}
        language={form?.language || 'pt'}
        onMusicReady={handleMusicReady}
      />

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-600 mb-4">
                {t.success}
              </h3>
              <p className="text-gray-600 mb-8">
                {successMessage}
              </p>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-2xl font-bold text-baby-pink-700 mb-4">
                {t.generateMusic}
              </h3>
              <p className="text-gray-600 mb-8">
                {t.generateMusicConfirm}
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleMusicGeneration();
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  {t.generateMusic}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}