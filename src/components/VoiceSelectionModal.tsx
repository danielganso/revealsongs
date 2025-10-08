import { useState } from 'react';
import { X, Music, User } from 'lucide-react';
import { translations, Language } from '../lib/translations';

interface VoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vocalGender: 'male' | 'female') => void;
  language: Language;
  songTitle?: string;
}

export default function VoiceSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  language,
  songTitle 
}: VoiceSelectionModalProps) {
  const [selectedVoice, setSelectedVoice] = useState<'male' | 'female'>('male');
  const t = translations[language as keyof typeof translations];

  const voiceOptions = {
    male: {
      pt: { label: 'Masculina', description: 'Voz masculina para a música' },
      en: { label: 'Male', description: 'Male voice for the song' },
      es: { label: 'Masculina', description: 'Voz masculina para la canción' },
      fr: { label: 'Masculine', description: 'Voix masculine pour la chanson' },
      it: { label: 'Maschile', description: 'Voce maschile per la canzone' }
    },
    female: {
      pt: { label: 'Feminina', description: 'Voz feminina para a música' },
      en: { label: 'Female', description: 'Female voice for the song' },
      es: { label: 'Femenina', description: 'Voz femenina para la canción' },
      fr: { label: 'Féminine', description: 'Voix féminine pour la chanson' },
      it: { label: 'Femminile', description: 'Voce femminile per la canzone' }
    }
  };

  const modalTexts = {
    pt: {
      title: 'Gerar Música',
      subtitle: 'Escolha a voz que será utilizada na música',
      confirm: 'Gerar Música',
      cancel: 'Cancelar'
    },
    en: {
      title: 'Generate Music',
      subtitle: 'Choose the voice that will be used in the music',
      confirm: 'Generate Music',
      cancel: 'Cancel'
    },
    es: {
      title: 'Generar Música',
      subtitle: 'Elige la voz que se utilizará en la música',
      confirm: 'Generar Música',
      cancel: 'Cancelar'
    },
    fr: {
      title: 'Générer Musique',
      subtitle: 'Choisissez la voix qui sera utilisée dans la musique',
      confirm: 'Générer Musique',
      cancel: 'Annuler'
    },
    it: {
      title: 'Genera Musica',
      subtitle: 'Scegli la voce che verrà utilizzata nella musica',
      confirm: 'Genera Musica',
      cancel: 'Annulla'
    }
  };

  const texts = modalTexts[language] || modalTexts.pt;

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedVoice);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-baby-pink-400 to-baby-pink-500 rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-baby-pink-700">
                {texts.title}
              </h2>
              {songTitle && (
                <p className="text-sm text-baby-pink-500">
                  {songTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-baby-pink-600 mb-6 text-center">
            {texts.subtitle}
          </p>

          {/* Voice Options */}
          <div className="space-y-4">
            {(['male', 'female'] as const).map((voice) => (
              <div
                key={voice}
                onClick={() => setSelectedVoice(voice)}
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${selectedVoice === voice
                    ? 'border-baby-pink-400 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-200 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${selectedVoice === voice
                      ? 'border-baby-pink-400 bg-baby-pink-400'
                      : 'border-gray-300'
                    }
                  `}>
                    {selectedVoice === voice && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <User className={`w-5 h-5 ${
                    selectedVoice === voice ? 'text-baby-pink-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      selectedVoice === voice ? 'text-baby-pink-700' : 'text-gray-700'
                    }`}>
                      {voiceOptions[voice][language]?.label || voiceOptions[voice].pt.label}
                    </p>
                    <p className={`text-sm ${
                      selectedVoice === voice ? 'text-baby-pink-500' : 'text-gray-500'
                    }`}>
                      {voiceOptions[voice][language]?.description || voiceOptions[voice].pt.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {texts.cancel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-baby-pink-400 to-baby-pink-500 text-white rounded-lg hover:from-baby-pink-500 hover:to-baby-pink-600 transition-all duration-200 font-medium shadow-lg"
          >
            {texts.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}