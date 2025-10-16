import { X, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

interface CommissionData {
  id: string;
  totalAmount: number;
  subscriptionAmount: number;
  creditAmount: number;
  currency: string;
  salesCount: number;
  subscriptionSalesCount: number;
  creditSalesCount: number;
  requestDate: string;
}

interface CommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  commissionData: CommissionData | null;
  language: 'pt' | 'en';
}

export default function CommissionModal({ 
  isOpen, 
  onClose, 
  commissionData,
  language 
}: CommissionModalProps) {
  if (!isOpen || !commissionData) return null;

  const isPortuguese = language === 'pt';

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(isPortuguese ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50 opacity-50"></div>
        
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
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isPortuguese ? 'Comissão Solicitada' : 'Commission Requested'}
            </h2>
            <p className="text-gray-600">
              {isPortuguese 
                ? 'Sua solicitação de comissão foi processada com sucesso'
                : 'Your commission request has been processed successfully'
              }
            </p>
          </div>

          {/* Commission Details */}
          <div className="space-y-4 mb-6">
            {/* Total de Subscription */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      {isPortuguese ? 'Total de Subscription' : 'Subscription Total'}
                    </p>
                    <p className="text-xs text-blue-600">
                      {commissionData.subscriptionSalesCount} {isPortuguese ? 'vendas' : 'sales'}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(commissionData.subscriptionAmount, commissionData.currency)}
                </p>
              </div>
            </div>

            {/* Total de Créditos */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">
                      {isPortuguese ? 'Total de Créditos' : 'Credits Total'}
                    </p>
                    <p className="text-xs text-purple-600">
                      {commissionData.creditSalesCount} {isPortuguese ? 'vendas' : 'sales'}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-800">
                  {formatCurrency(commissionData.creditAmount, commissionData.currency)}
                </p>
              </div>
            </div>

            {/* Total a Receber */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {isPortuguese ? 'Total a Receber' : 'Total to Receive'}
                    </p>
                    <p className="text-xs text-green-600">
                      {commissionData.salesCount} {isPortuguese ? 'vendas totais' : 'total sales'}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(commissionData.totalAmount, commissionData.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Info message */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-700 text-center">
              {isPortuguese 
                ? 'Sua comissão será processada pelo administrador em até 5 dias úteis.'
                : 'Your commission will be processed by the administrator within 5 business days.'
              }
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-green-400 to-blue-400 text-white py-3 px-6 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {isPortuguese ? 'Fechar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}