import { X, AlertCircle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  language: 'pt' | 'en';
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title,
  message,
  language 
}: ErrorModalProps) {
  if (!isOpen) return null;

  const isPortuguese = language === 'pt';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50"></div>
        
        {/* Content */}
        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10 bg-white rounded-full shadow-md hover:shadow-lg transform hover:scale-110 duration-200"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
          </div>

          {/* Error message */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-800 text-center">
              {message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-red-400 to-orange-400 text-white py-3 px-6 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {isPortuguese ? 'Fechar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}