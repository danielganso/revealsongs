import { useState } from 'react';
import { X, CreditCard, Clock, AlertCircle } from 'lucide-react';

interface PaymentPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingPayment: any;
  onRetryPayment: () => void;
  language: 'pt' | 'en';
}

export default function PaymentPendingModal({ 
  isOpen, 
  onClose, 
  pendingPayment, 
  onRetryPayment,
  language 
}: PaymentPendingModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isOpen) return null;

  const isPortuguese = language === 'pt';

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    try {
      await onRetryPayment();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-baby-pink-50 to-baby-blue-50 opacity-50"></div>
        
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
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isPortuguese ? 'Pagamento Pendente' : 'Payment Pending'}
            </h2>
            <p className="text-gray-600">
              {isPortuguese 
                ? 'Seu pagamento ainda está sendo processado'
                : 'Your payment is still being processed'
              }
            </p>
          </div>

          {/* Status message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  {isPortuguese 
                    ? 'Seu pagamento pode levar alguns minutos para ser confirmado. Você receberá um email de confirmação assim que o pagamento for processado.'
                    : 'Your payment may take a few minutes to be confirmed. You will receive a confirmation email once the payment is processed.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              disabled={isRetrying}
              className="w-full bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 text-white py-3 px-6 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>
                {isRetrying 
                  ? (isPortuguese ? 'Processando...' : 'Processing...')
                  : (isPortuguese ? 'Tentar Novamente' : 'Try Again')
                }
              </span>
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
            >
              {isPortuguese ? 'Aguardar' : 'Wait'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}