import { useState } from 'react';
import { X, Check, Crown, Tag } from 'lucide-react';
import { getPlansForRegion, formatPrice, type Plan } from '../lib/plans';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Plan, couponCode?: string) => void;
  currency: string;
  country: string;
}

export default function PlanSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectPlan, 
  currency, 
  country 
}: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  const plans = getPlansForRegion(currency as 'USD' | 'BRL');

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleConfirm = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    setCouponError('');
    
    try {
      // Validar cupom se fornecido
      if (couponCode.trim()) {
        const response = await fetch('/api/validate-coupon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ couponCode: couponCode.trim() }),
        });

        const result = await response.json();
        
        if (!response.ok || !result.valid) {
          setCouponError(country === 'BR' ? 'Cupom inválido ou expirado' : 'Invalid or expired coupon');
          setLoading(false);
          return;
        }
      }
      
      await onSelectPlan(selectedPlan, couponCode.trim() || undefined);
    } catch (error) {
      console.error('Erro ao selecionar plano:', error);
      setCouponError(country === 'BR' ? 'Erro ao validar cupom' : 'Error validating coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            {country === 'BR' ? 'Escolha seu Plano' : 'Choose Your Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border-2 rounded-2xl p-4 sm:p-6 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-baby-pink-500 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-300'
                } ${plan.popular ? 'ring-2 ring-baby-pink-500' : ''}`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center">
                      <Crown size={14} className="mr-1 sm:w-4 sm:h-4" />
                      {country === 'BR' ? 'Mais Popular' : 'Most Popular'}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl font-bold text-baby-pink-600">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    {plan.credits} {country === 'BR' ? 'músicas' : 'songs'}
                  </p>

                  <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-center text-xs sm:text-sm text-gray-700">
                        <Check size={14} className="text-green-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4" />
                        <span className="text-left">{feature}</span>
                      </li>
                    )) || (
                      <li className="flex items-center text-xs sm:text-sm text-gray-700">
                        <Check size={14} className="text-green-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4" />
                        <span className="text-left">{plan.credits} {country === 'BR' ? 'músicas personalizadas' : 'custom songs'}</span>
                      </li>
                    )}
                  </ul>

                  {selectedPlan?.id === plan.id && (
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-baby-pink-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Campo de Cupom */}
          <div className="mb-4 sm:mb-6">
            <div className="bg-gray-50 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-baby-pink-500" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-700">
                  {country === 'BR' ? 'Código de Desconto' : 'Discount Code'}
                </h3>
              </div>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError(''); // Limpar erro quando usuário digita
                }}
                placeholder={country === 'BR' ? 'Digite seu cupom (opcional)' : 'Enter your coupon (optional)'}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-baby-pink-500 focus:border-transparent transition-all text-sm sm:text-base ${
                  couponError ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {couponError && (
                <p className="text-xs sm:text-sm text-red-500 mt-2">
                  ❌ {couponError}
                </p>
              )}
              {!couponError && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  {country === 'BR' 
                    ? '💡 Tem um cupom de desconto? Digite aqui para aplicar na sua compra!'
                    : '💡 Have a discount coupon? Enter it here to apply to your purchase!'
                  }
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              {country === 'BR' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlan || loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading 
                ? (country === 'BR' ? 'Processando...' : 'Processing...') 
                : (country === 'BR' ? 'Continuar' : 'Continue')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}