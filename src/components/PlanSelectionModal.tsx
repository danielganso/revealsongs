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

  if (!isOpen) return null;

  const plans = getPlansForRegion(currency as 'USD' | 'BRL');

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
  };

  const handleConfirm = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      await onSelectPlan(selectedPlan, couponCode.trim() || undefined);
    } catch (error) {
      console.error('Erro ao selecionar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {country === 'BR' ? 'Escolha seu Plano' : 'Choose Your Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-baby-pink-500 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-300'
                } ${plan.popular ? 'ring-2 ring-baby-pink-500' : ''}`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                      <Crown size={16} className="mr-1" />
                      {country === 'BR' ? 'Mais Popular' : 'Most Popular'}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-baby-pink-600">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {plan.credits} {country === 'BR' ? 'músicas' : 'songs'}
                  </p>

                  <ul className="space-y-3 mb-6">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <Check size={16} className="text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    )) || (
                      <li className="flex items-center text-sm text-gray-700">
                        <Check size={16} className="text-green-500 mr-2 flex-shrink-0" />
                        {plan.credits} {country === 'BR' ? 'músicas personalizadas' : 'custom songs'}
                      </li>
                    )}
                  </ul>

                  {selectedPlan?.id === plan.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-baby-pink-500 rounded-full flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Campo de Cupom */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Tag className="w-5 h-5 text-baby-pink-500" />
                <h3 className="font-semibold text-gray-700">
                  {country === 'BR' ? 'Código de Desconto' : 'Discount Code'}
                </h3>
              </div>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder={country === 'BR' ? 'Digite seu cupom (opcional)' : 'Enter your coupon (optional)'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baby-pink-500 focus:border-transparent transition-all"
              />
              <p className="text-sm text-gray-500 mt-2">
                {country === 'BR' 
                  ? '💡 Tem um cupom de desconto? Digite aqui para aplicar na sua compra!'
                  : '💡 Have a discount coupon? Enter it here to apply to your purchase!'
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {country === 'BR' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlan || loading}
              className="px-6 py-3 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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