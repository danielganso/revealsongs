import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface LyricData {
  id: string;
  song_type: 'cha_revelacao' | 'aniversario';
  baby_names: string[];
  baby_genders: string[];
  babies_count: number;
  musical_style: string;
  language: string;
  parents_story?: string;
  birthday_theme?: string;
  story_to_tell?: string;
  lyrics: any;
  status: string;
  created_at: string;
  updated_at: string;
  // Dados das músicas geradas
  generated_music?: {
    id: string;
    suno_id: string;
    title: string;
    status: 'generating' | 'completed' | 'failed';
    audio_url?: string;
    audio2_url?: string;
    video_url?: string;
    error_message?: string;
    created_at: string;
  }[];
}

interface UserLyricsTableProps {
  onEditLyric: (lyric: LyricData) => void;
  onGenerateMusic?: (lyricId: string) => void;
  language: string;
}

const UserLyricsTable: React.FC<UserLyricsTableProps> = ({ onEditLyric, onGenerateMusic, language }) => {
  const [lyrics, setLyrics] = useState<LyricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingMusic, setUpdatingMusic] = useState<string | null>(null); // ID da música sendo atualizada
  const [downloadingMusic, setDownloadingMusic] = useState<string | null>(null); // ID da música sendo baixada
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [musicToDelete, setMusicToDelete] = useState<string | null>(null);
  const [showDeleteLyricModal, setShowDeleteLyricModal] = useState(false);
  const [lyricToDelete, setLyricToDelete] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const { user } = useAuth();

  const translations = {
    pt: {
      title: 'Músicas e Letras Criadas',
      noLyrics: 'Nenhuma letra encontrada',
      songType: 'Tipo',
      babyNames: 'Nomes',
      style: 'Estilo',
      created: 'Criado em',
      actions: 'Ações',
      edit: 'Editar',
      chaRevelacao: 'Chá Revelação',
      aniversario: 'Aniversário',
      loading: 'Carregando...',
      error: 'Erro ao carregar letras',
      musicStatus: 'Status da Música',
      musicActions: 'Ações da Música',
      generating: 'Gerando...',
      completed: 'Concluída',
      failed: 'Falhou',
      play: 'Reproduzir',
      download: 'Download',
      audioVersion: 'Versão Áudio',
      audioVersion1: 'Áudio 1',
      audioVersion2: 'Áudio 2',
      noMusic: 'Nenhuma música gerada',
      updateStatus: 'Atualizar',
      updating: 'Atualizando...',
      delete: 'Excluir',
      confirmDelete: 'Tem certeza que deseja excluir esta música?',
      deleteSuccess: 'Música excluída com sucesso',
      deleteError: 'Erro ao excluir música',
      deleteLyric: 'Excluir Tudo',
      confirmDeleteLyric: 'Tem certeza que deseja excluir esta letra e todas as músicas associadas?',
      deleteLyricSuccess: 'Letra excluída com sucesso',
      deleteLyricError: 'Erro ao excluir letra',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      success: 'Sucesso',
      errorMessage: 'Erro',
      ok: 'OK'
    },
    en: {
      title: 'Created Music and Lyrics',
      noLyrics: 'No lyrics found',
      songType: 'Type',
      babyNames: 'Names',
      style: 'Style',
      created: 'Created',
      actions: 'Actions',
      edit: 'Edit',
      chaRevelacao: 'Gender Reveal',
      aniversario: 'Birthday',
      loading: 'Loading...',
      error: 'Error loading lyrics',
      musicStatus: 'Music Status',
      musicActions: 'Music Actions',
      generating: 'Generating...',
      completed: 'Completed',
      failed: 'Failed',
      play: 'Play',
      download: 'Download',
      audioVersion: 'Audio Version',
      audioVersion1: 'Audio 1',
      audioVersion2: 'Audio 2',
      noMusic: 'No music generated',
      updateStatus: 'Update',
      updating: 'Updating...',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this music?',
      deleteSuccess: 'Music deleted successfully',
      deleteError: 'Error deleting music',
      deleteLyric: 'Delete All',
      confirmDeleteLyric: 'Are you sure you want to delete this lyric and all associated music?',
      deleteLyricSuccess: 'Lyric deleted successfully',
      deleteLyricError: 'Error deleting lyric',
      cancel: 'Cancel',
      confirm: 'Confirm',
      success: 'Success',
      errorMessage: 'Error',
      ok: 'OK'
    },
    es: {
      title: 'Música y Letras Creadas',
      noLyrics: 'No se encontraron letras',
      songType: 'Tipo',
      babyNames: 'Nombres',
      style: 'Estilo',
      created: 'Creado',
      actions: 'Acciones',
      edit: 'Editar',
      chaRevelacao: 'Revelación de Género',
      aniversario: 'Cumpleaños',
      loading: 'Cargando...',
      error: 'Error al cargar letras',
      musicStatus: 'Estado de la Música',
      musicActions: 'Acciones de Música',
      generating: 'Generando...',
      completed: 'Completada',
      failed: 'Falló',
      play: 'Reproducir',
      download: 'Descargar',
      audioVersion: 'Versión Audio',
      audioVersion1: 'Audio 1',
      audioVersion2: 'Audio 2',
      noMusic: 'Ninguna música generada',
      updateStatus: 'Actualizar',
      updating: 'Actualizando...',
      delete: 'Eliminar',
      confirmDelete: '¿Estás seguro de que quieres eliminar esta música?',
      deleteSuccess: 'Música eliminada exitosamente',
      deleteError: 'Error al eliminar música',
      deleteLyric: 'Eliminar Letra',
      confirmDeleteLyric: '¿Estás seguro de que quieres eliminar esta letra y toda la música asociada?',
      deleteLyricSuccess: 'Letra eliminada exitosamente',
      deleteLyricError: 'Error al eliminar letra',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      success: 'Éxito',
      errorMessage: 'Error',
      ok: 'OK'
    },
    fr: {
      title: 'Musique et Paroles Créées',
      noLyrics: 'Aucune parole trouvée',
      songType: 'Type',
      babyNames: 'Noms',
      style: 'Style',
      created: 'Créé',
      actions: 'Actions',
      edit: 'Modifier',
      chaRevelacao: 'Révélation du Sexe',
      aniversario: 'Anniversaire',
      loading: 'Chargement...',
      error: 'Erreur lors du chargement',
      musicStatus: 'Statut de la Musique',
      musicActions: 'Actions Musicales',
      generating: 'Génération...',
      completed: 'Terminé',
      failed: 'Échoué',
      play: 'Jouer',
      download: 'Télécharger',
      audioVersion: 'Version Audio',
      audioVersion1: 'Audio 1',
      audioVersion2: 'Audio 2',
      noMusic: 'Aucune musique générée',
      updateStatus: 'Mettre à jour',
      updating: 'Mise à jour...',
      delete: 'Supprimer',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer cette musique?',
      deleteSuccess: 'Musique supprimée avec succès',
      deleteError: 'Erreur lors de la suppression de la musique',
      deleteLyric: 'Supprimer Paroles',
      confirmDeleteLyric: 'Êtes-vous sûr de vouloir supprimer ces paroles et toute la musique associée?',
      deleteLyricSuccess: 'Paroles supprimées avec succès',
      deleteLyricError: 'Erreur lors de la suppression des paroles',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      success: 'Succès',
      errorMessage: 'Erreur',
      ok: 'OK'
    },
    it: {
      title: 'Musica e Testi Creati',
      noLyrics: 'Nessun testo trovato',
      songType: 'Tipo',
      babyNames: 'Nomi',
      style: 'Stile',
      created: 'Creato',
      actions: 'Azioni',
      edit: 'Modifica',
      chaRevelacao: 'Rivelazione del Sesso',
      aniversario: 'Compleanno',
      loading: 'Caricamento...',
      error: 'Errore nel caricamento',
      musicStatus: 'Stato della Musica',
      musicActions: 'Azioni Musicali',
      generating: 'Generazione...',
      completed: 'Completato',
      failed: 'Fallito',
      play: 'Riproduci',
      download: 'Scarica',
      audioVersion: 'Versione Audio',
      audioVersion1: 'Audio 1',
      audioVersion2: 'Audio 2',
      noMusic: 'Nessuna musica generata',
      updateStatus: 'Aggiorna',
      updating: 'Aggiornamento...',
      delete: 'Elimina',
      confirmDelete: 'Sei sicuro di voler eliminare questa musica?',
      deleteSuccess: 'Musica eliminata con successo',
      deleteError: 'Errore nell\'eliminazione della musica',
      deleteLyric: 'Elimina Testo',
      confirmDeleteLyric: 'Sei sicuro di voler eliminare questo testo e tutta la musica associata?',
      deleteLyricSuccess: 'Testo eliminato con successo',
      deleteLyricError: 'Errore nell\'eliminazione del testo',
      cancel: 'Annulla',
      confirm: 'Conferma',
      success: 'Successo',
      errorMessage: 'Errore',
      ok: 'OK'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.pt;

  useEffect(() => {
    if (user) {
      fetchUserLyrics();
    }
  }, [user]);

  const fetchUserLyrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        setError('Usuário não autenticado');
        return;
      }

      const response = await fetch('/api/get-user-lyrics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar letras');
      }

      const data = await response.json();
      setLyrics(data.lyrics || []);
    } catch (err) {
      console.error('Erro ao buscar letras:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'pt' ? 'pt-BR' : language);
  };

  const getSongTypeLabel = (type: string) => {
    return type === 'cha_revelacao' ? t.chaRevelacao : t.aniversario;
  };

  const getMusicStatusLabel = (status: string) => {
    switch (status) {
      case 'generating':
        return t.generating;
      case 'completed':
        return t.completed;
      case 'failed':
        return t.failed;
      default:
        return status;
    }
  };

  const handlePlayMusic = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownloadMusic = async (url: string, filename: string, musicId: string) => {
    try {
      setDownloadingMusic(musicId);
      
      // Fazer fetch da URL do áudio
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao baixar: ${response.status}`);
      }
      
      // Converter para blob
      const blob = await response.blob();
      
      // Criar URL temporária para o blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Criar link temporário e fazer download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpar recursos
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error) {
      console.error('Erro ao baixar música:', error);
      // Fallback para o método antigo se der erro
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingMusic(null);
    }
  };

  // Função para excluir uma música específica
  const handleDeleteMusic = async (musicId: string) => {
    setMusicToDelete(musicId);
    setShowDeleteModal(true);
  };

  // Função para confirmar a exclusão
  const confirmDeleteMusic = async () => {
    if (!musicToDelete) return;

    try {
      setUpdatingMusic(musicToDelete);
      setShowDeleteModal(false);
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer requisição para excluir a música
      const response = await fetch(`/api/delete-music`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ musicId: musicToDelete }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Atualizar a lista de letras para refletir a exclusão
        await fetchUserLyrics();
        setModalMessage(t.deleteSuccess);
        setShowSuccessModal(true);
      } else {
        console.error('Erro ao excluir música:', result.error);
        setModalMessage(t.deleteError);
        setShowErrorModal(true);
      }

    } catch (error) {
      console.error('Erro ao excluir música:', error);
      setModalMessage(t.deleteError);
      setShowErrorModal(true);
    } finally {
      setUpdatingMusic(null);
      setMusicToDelete(null);
    }
  };

  // Função para atualizar o status de uma música específica
  const handleUpdateMusicStatus = async (musicId: string) => {
    try {
      setUpdatingMusic(musicId);
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer requisição para verificar o status da música
      const response = await fetch(`/api/check-music-status?musicId=${musicId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Atualizar a lista de letras para refletir o novo status
        await fetchUserLyrics();
      } else {
        console.error('Erro ao verificar status:', result.error);
      }

    } catch (error) {
      console.error('Erro ao atualizar status da música:', error);
    } finally {
      setUpdatingMusic(null);
    }
  };

  // Função para excluir uma letra completa (letras_songs e generated_music)
  const handleDeleteLyric = async (lyricId: string) => {
    setLyricToDelete(lyricId);
    setShowDeleteLyricModal(true);
  };

  // Função para confirmar a exclusão da letra completa
  const confirmDeleteLyric = async () => {
    if (!lyricToDelete) return;

    try {
      setUpdatingMusic(lyricToDelete);
      setShowDeleteLyricModal(false);
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer requisição para excluir a letra completa
      const response = await fetch(`/api/delete-lyric`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lyric_id: lyricToDelete }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Atualizar a lista de letras para refletir a exclusão
        await fetchUserLyrics();
        setModalMessage(t.deleteLyricSuccess);
        setShowSuccessModal(true);
      } else {
        console.error('Erro ao excluir letra:', result.error);
        setModalMessage(t.deleteLyricError);
        setShowErrorModal(true);
      }

    } catch (error) {
      console.error('Erro ao excluir letra:', error);
      setModalMessage(t.deleteLyricError);
      setShowErrorModal(true);
    } finally {
      setUpdatingMusic(null);
      setLyricToDelete(null);
    }
  };

  const renderMusicActions = (music: any) => {
    const isUpdating = updatingMusic === music.id;
    
    // Se está atualizando, mostrar indicador
    if (isUpdating) {
      return (
        <span className="text-blue-600 text-sm flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
          {t.updating}
        </span>
      );
    }
    
    // Se não está completa ou não tem URL de áudio, mostrar status e botão de atualizar
    if (music.status !== 'completed' || (!music.audio_url && !music.audio2_url)) {
      return (
        <div className="flex flex-col space-y-1">
          <span className="text-gray-500 text-sm">
            {music.status === 'failed' ? t.failed : t.generating}
          </span>
          {music.status === 'generating' && (
            <button
              onClick={() => handleUpdateMusicStatus(music.id)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
              title={t.updateStatus}
            >
              🔄 {t.updateStatus}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-1">
        {music.audio_url && (
          <div className="flex space-x-1">
            <button
              onClick={() => handlePlayMusic(music.audio_url)}
              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
              title={`${t.play} ${t.audioVersion1}`}
            >
              ▶️ {t.audioVersion1}
            </button>
            <button
              onClick={() => handleDownloadMusic(music.audio_url, `${music.title}_audio1.mp3`, music.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
              title={`${t.download} ${t.audioVersion1}`}
              disabled={downloadingMusic === music.id}
            >
              {downloadingMusic === music.id ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-2 w-2 border-b border-white mr-1"></div>
                  ⬇️
                </div>
              ) : (
                '⬇️'
              )}
            </button>
          </div>
        )}
        {music.audio2_url && (
          <div className="flex space-x-1">
            <button
              onClick={() => handlePlayMusic(music.audio2_url)}
              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
              title={`${t.play} ${t.audioVersion2}`}
            >
              ▶️ {t.audioVersion2}
            </button>
            <button
              onClick={() => handleDownloadMusic(music.audio2_url, `${music.title}_audio2.mp3`, music.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
              title={`${t.download} ${t.audioVersion2}`}
              disabled={downloadingMusic === music.id}
            >
              {downloadingMusic === music.id ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-2 w-2 border-b border-white mr-1"></div>
                  ⬇️
                </div>
              ) : (
                '⬇️'
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{t.title}</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{t.title}</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">{t.title}</h3>
      
      {lyrics.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">{t.noLyrics}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.songType}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.babyNames}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.style}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.created}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.musicStatus}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.musicActions}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lyrics.map((lyric) => (
                  <tr key={lyric.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getSongTypeLabel(lyric.song_type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lyric.baby_names?.join(', ') || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lyric.musical_style}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lyric.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lyric.generated_music && lyric.generated_music.length > 0 ? (
                        <div className="space-y-1">
                          {lyric.generated_music.map((music, index) => (
                            <div key={music.id} className="text-xs">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                music.status === 'completed' ? 'bg-green-100 text-green-800' :
                                music.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {getMusicStatusLabel(music.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">{t.noMusic}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {lyric.generated_music && lyric.generated_music.length > 0 ? (
                        <div className="space-y-2">
                          {lyric.generated_music.map((music, index) => (
                            <div key={music.id}>
                              {renderMusicActions(music)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => onEditLyric(lyric)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleDeleteLyric(lyric.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
                          title={t.deleteLyric}
                        >
                          🗑️ {t.deleteLyric}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {lyrics.map((lyric) => (
              <div key={lyric.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {getSongTypeLabel(lyric.song_type)}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(lyric.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => onEditLyric(lyric)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => handleDeleteLyric(lyric.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                      title={t.deleteLyric}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{t.babyNames}:</span>
                    <span className="ml-2 text-gray-600">{lyric.baby_names?.join(', ') || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t.style}:</span>
                    <span className="ml-2 text-gray-600">{lyric.musical_style}</span>
                  </div>
                </div>

                {/* Music Status */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="mb-2">
                    <span className="font-medium text-gray-700 text-sm">{t.musicStatus}:</span>
                  </div>
                  {lyric.generated_music && lyric.generated_music.length > 0 ? (
                    <div className="space-y-2">
                      {lyric.generated_music.map((music, index) => (
                        <div key={music.id} className="bg-white rounded p-2 border">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              music.status === 'completed' ? 'bg-green-100 text-green-800' :
                              music.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getMusicStatusLabel(music.status)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {renderMusicActions(music)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">{t.noMusic}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t.confirm}</h3>
            <p className="text-gray-600 mb-6">{t.confirmDelete}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmDeleteMusic}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão da Letra */}
      {showDeleteLyricModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t.confirm}</h3>
            <p className="text-gray-600 mb-6">{t.confirmDeleteLyric}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteLyricModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmDeleteLyric}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-green-600">{t.success}</h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">{t.error}</h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLyricsTable;