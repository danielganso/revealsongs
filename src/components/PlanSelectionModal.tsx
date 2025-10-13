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

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setLoading(true);
    setCouponError('');
    
    try {
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
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      setCouponError(country === 'BR' ? 'Erro ao validar cupom' : 'Error validating coupon');
    } finally {
      setLoading(false);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Design Desktop - Original */}
      <div className="hidden md:block bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-baby-pink-500 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-300'
                } ${plan.popular ? 'ring-2 ring-baby-pink-500' : ''}`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center">
                      <Crown size={16} className="mr-1" />
                      {country === 'BR' ? 'Popular' : 'Popular'}
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
                  <p className="text-base text-gray-600 mb-6">
                    {plan.credits} {country === 'BR' ? 'músicas' : 'songs'}
                  </p>

                  <ul className="space-y-3 mb-6">
                    {(plan.features || []).map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <Check size={16} className="text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-left">{feature}</span>
                      </li>
                    )) || (
                      <li className="flex items-center text-sm text-gray-700">
                        <Check size={16} className="text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-left">{plan.credits} {country === 'BR' ? 'músicas' : 'songs'}</span>
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

          <div className="mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Tag className="w-5 h-5 text-baby-pink-500" />
                <h3 className="text-base font-semibold text-gray-700">
                  {country === 'BR' ? 'Cupom de Desconto' : 'Discount Coupon'}
                </h3>
              </div>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  placeholder={country === 'BR' ? 'Digite o código do cupom' : 'Enter coupon code'}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-pink-500 focus:border-transparent transition-all text-base ${
                    couponError ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
              </div>
              {couponError && (
                <p className="text-sm text-red-500 mt-2">
                  ❌ {couponError}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-full text-base text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {country === 'BR' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlan || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading 
                ? (country === 'BR' ? 'Processando...' : 'Processing...') 
                : (country === 'BR' ? 'Continuar' : 'Continue')
              }
            </button>
          </div>
        </div>
      </div>

      {/* Design Mobile - Completamente Novo e Compacto */}
      <div className="md:hidden bg-white rounded-2xl max-w-sm w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header Mobile Minimalista */}
        <div className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">
              {country === 'BR' ? 'Planos' : 'Plans'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Planos em Lista Vertical Compacta */}
          <div className="space-y-3 mb-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative border rounded-xl p-3 cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-baby-pink-500 bg-baby-pink-50 shadow-md'
                    : 'border-gray-200 hover:border-baby-pink-300'
                }`}
                onClick={() => handleSelectPlan(plan)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
                      {plan.popular && (
                        <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                          {country === 'BR' ? 'TOP' : 'TOP'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg font-bold text-baby-pink-600">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="text-xs text-gray-500">
                        /{country === 'BR' ? 'mês' : 'month'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {plan.credits} {country === 'BR' ? 'músicas' : 'songs'}
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    {selectedPlan?.id === plan.id ? (
                      <div className="w-5 h-5 bg-baby-pink-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Campo de Cupom Minimalista */}
          <div className="mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-baby-pink-500" />
                <span className="text-xs font-medium text-gray-700">
                  {country === 'BR' ? 'Cupom' : 'Coupon'}
                </span>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  placeholder={country === 'BR' ? 'Código' : 'Code'}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-pink-500 focus:border-transparent transition-all text-xs ${
                    couponError ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
              </div>
              {couponError && (
                <p className="text-xs text-red-500 mt-1">
                  {couponError}
                </p>
              )}
            </div>
          </div>

          {/* Botões Mobile Compactos */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {country === 'BR' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlan || loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading 
                ? '...' 
                : (country === 'BR' ? 'Continuar' : 'Continue')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}