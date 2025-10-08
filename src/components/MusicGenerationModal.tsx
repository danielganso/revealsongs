import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';

interface MusicGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  musicId: string | null;
  language: 'pt' | 'en' | 'es' | 'fr' | 'it';
  onMusicReady: (musicData: any) => void;
}

interface MusicStatus {
  id: string;
  status: 'generating' | 'completed' | 'failed';
  title: string;
  style: string;
  audio_url?: string;
  audio2_url?: string;
  video_url?: string;
  error_message?: string;
  progress?: number;
}

const MusicGenerationModal: React.FC<MusicGenerationModalProps> = ({
  isOpen,
  onClose,
  musicId,
  language,
  onMusicReady
}) => {
  const [musicStatus, setMusicStatus] = useState<MusicStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Textos traduzidos
  const texts = {
    pt: {
      title: 'Gerando sua música...',
      subtitle: 'Isso pode levar alguns minutos',
      generating: 'Criando sua música personalizada',
      processing: 'Processando áudio...',
      almostReady: 'Quase pronto!',
      completed: 'Música pronta!',
      failed: 'Erro na geração',
      close: 'Fechar',
      playMusic: 'Reproduzir Música',
      downloadAudio: 'Baixar Áudio',
      downloadVideo: 'Baixar Vídeo',
      tryAgain: 'Tentar Novamente',
      generatingSteps: [
        'Analisando a letra...',
        'Criando a melodia...',
        'Ajustando o estilo musical...',
        'Processando a voz...',
        'Finalizando a música...'
      ]
    },
    en: {
      title: 'Generating your music...',
      subtitle: 'This may take a few minutes',
      generating: 'Creating your personalized music',
      processing: 'Processing audio...',
      almostReady: 'Almost ready!',
      completed: 'Music ready!',
      failed: 'Generation error',
      close: 'Close',
      playMusic: 'Play Music',
      downloadAudio: 'Download Audio',
      downloadVideo: 'Download Video',
      tryAgain: 'Try Again',
      generatingSteps: [
        'Analyzing lyrics...',
        'Creating melody...',
        'Adjusting musical style...',
        'Processing voice...',
        'Finalizing music...'
      ]
    },
    es: {
      title: 'Generando tu música...',
      subtitle: 'Esto puede tomar algunos minutos',
      generating: 'Creando tu música personalizada',
      processing: 'Procesando audio...',
      almostReady: '¡Casi listo!',
      completed: '¡Música lista!',
      failed: 'Error en la generación',
      close: 'Cerrar',
      playMusic: 'Reproducir Música',
      downloadAudio: 'Descargar Audio',
      downloadVideo: 'Descargar Video',
      tryAgain: 'Intentar de Nuevo',
      generatingSteps: [
        'Analizando letra...',
        'Creando melodía...',
        'Ajustando estilo musical...',
        'Procesando voz...',
        'Finalizando música...'
      ]
    },
    fr: {
      title: 'Génération de votre musique...',
      subtitle: 'Cela peut prendre quelques minutes',
      generating: 'Création de votre musique personnalisée',
      processing: 'Traitement audio...',
      almostReady: 'Presque prêt!',
      completed: 'Musique prête!',
      failed: 'Erreur de génération',
      close: 'Fermer',
      playMusic: 'Lire la Musique',
      downloadAudio: 'Télécharger Audio',
      downloadVideo: 'Télécharger Vidéo',
      tryAgain: 'Réessayer',
      generatingSteps: [
        'Analyse des paroles...',
        'Création de la mélodie...',
        'Ajustement du style musical...',
        'Traitement de la voix...',
        'Finalisation de la musique...'
      ]
    },
    it: {
      title: 'Generando la tua musica...',
      subtitle: 'Questo può richiedere alcuni minuti',
      generating: 'Creando la tua musica personalizzata',
      processing: 'Elaborazione audio...',
      almostReady: 'Quasi pronto!',
      completed: 'Musica pronta!',
      failed: 'Errore nella generazione',
      close: 'Chiudi',
      playMusic: 'Riproduci Musica',
      downloadAudio: 'Scarica Audio',
      downloadVideo: 'Scarica Video',
      tryAgain: 'Riprova',
      generatingSteps: [
        'Analizzando il testo...',
        'Creando la melodia...',
        'Regolando lo stile musicale...',
        'Elaborando la voce...',
        'Finalizzando la musica...'
      ]
    }
  };

  const t = texts[language] || texts.pt;

  // Função para verificar status da música
  const checkMusicStatus = async () => {
    if (!musicId) return;

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        setError('Sessão expirada');
        return;
      }

      const response = await fetch(`/api/check-music-status?musicId=${musicId}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar status');
      }

      const result = await response.json();
      
      if (result.success) {
        setMusicStatus(result.data);
        
        if (result.data.status === 'completed') {
          setIsPolling(false);
          
          // Verificar se tem pelo menos uma URL de áudio disponível
          const hasAudioUrl = !!result.data.audio_url;
          const hasAudio2Url = !!result.data.audio2_url;
          
          if (hasAudioUrl || hasAudio2Url) {
            // Música completa com pelo menos uma URL, fechar modal e redirecionar
            // Música completada com sucesso, fechando modal e redirecionando para dashboard
            onClose();
            // Redirecionar para a página de dashboard (tabela de músicas)
            window.location.href = '/dashboard';
            return;
          }
          
          // Fallback: se não tem nenhuma URL mas status é completed
          onMusicReady(result.data);
        } else if (result.data.status === 'failed') {
          setIsPolling(false);
          setError(result.data.error_message || 'Erro na geração da música');
        }
      } else {
        setError(result.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setError('Erro de conexão');
    }
  };

  // Iniciar polling quando o modal abrir
  useEffect(() => {
    if (isOpen && musicId && !isPolling) {
      setIsPolling(true);
      setError(null);
      checkMusicStatus();
    }
  }, [isOpen, musicId]);

  // Polling a cada 5 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling && musicId) {
      interval = setInterval(checkMusicStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, musicId]);

  // Simular progresso baseado no tempo
  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    if (isPolling && musicStatus?.status === 'generating') {
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % t.generatingSteps.length);
      }, 3000);
      
      return () => clearInterval(stepInterval);
    }
  }, [isPolling, musicStatus?.status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {musicStatus?.status === 'completed' ? t.completed : 
             musicStatus?.status === 'failed' ? t.failed : t.title}
          </h2>
          {musicStatus?.status === 'generating' && (
            <p className="text-gray-600">{t.subtitle}</p>
          )}
        </div>

        {/* Conteúdo baseado no status */}
        {error ? (
          <div className="mb-6">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsPolling(true);
                checkMusicStatus();
              }}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              {t.tryAgain}
            </button>
          </div>
        ) : musicStatus?.status === 'completed' ? (
          <div className="mb-6">
            <div className="text-green-500 text-6xl mb-4">🎵</div>
            <h3 className="text-lg font-semibold mb-4">{musicStatus.title}</h3>
            <div className="space-y-3">
              {musicStatus.audio_url && (
                <div>
                  <audio controls className="w-full mb-3">
                    <source src={musicStatus.audio_url} type="audio/mpeg" />
                  </audio>
                  <a
                    href={musicStatus.audio_url}
                    download
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors mr-2"
                  >
                    {t.downloadAudio}
                  </a>
                </div>
              )}
              {musicStatus.video_url && (
                <a
                  href={musicStatus.video_url}
                  download
                  className="inline-block bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  {t.downloadVideo}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            {/* Animação de loading */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto mb-4">
                <div className="w-full h-full border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              
              {/* Barra de progresso simulada */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((currentStep + 1) * 20, 90)}%` }}
                ></div>
              </div>
              
              {/* Etapa atual */}
              <p className="text-gray-700 font-medium">
                {t.generatingSteps[currentStep]}
              </p>
            </div>

            {/* Informações da música */}
            {musicStatus && (
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Título:</strong> {musicStatus.title}</p>
                <p><strong>Estilo:</strong> {musicStatus.style}</p>
              </div>
            )}
          </div>
        )}

        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default MusicGenerationModal;