import { useState } from 'react';
import { X, Check, Crown, Tag } from 'lucide-react';

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
}

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPack: (pack: CreditPack, couponCode?: string) => void;
  currency: string;
  country: string;
}

const getCreditPacks = (currency: string): CreditPack[] => {
  if (currency === 'BRL') {
    return [
      { id: '2_credits_brl', credits: 2, price: 9.99, currency: 'BRL' },
      { id: '5_credits_brl', credits: 5, price: 19.99, currency: 'BRL', popular: true },
      { id: '8_credits_brl', credits: 8, price: 29.99, currency: 'BRL' },
    ];
  }
  
  return [
    { id: '2_credits_usd', credits: 2, price: 5.99, currency: 'USD' },
    { id: '5_credits_usd', credits: 5, price: 11.99, currency: 'USD', popular: true },
    { id: '8_credits_usd', credits: 8, price: 19.99, currency: 'USD' },
  ];
};

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

export default function AddCreditsModal({ 
  isOpen, 
  onClose, 
  onSelectPack, 
  currency, 
  country 
}: AddCreditsModalProps) {
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  const creditPacks = getCreditPacks(currency);

  const handleSelectPack = (pack: CreditPack) => {
    setSelectedPack(pack);
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
    if (!selectedPack) return;
    
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
      
      await onSelectPack(selectedPack, couponCode.trim() || undefined);
    } catch (error) {
      console.error('Erro ao selecionar pacote:', error);
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
            {country === 'BR' ? 'Comprar Créditos' : 'Buy Credits'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-8">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPack?.id === pack.id
                    ? 'border-baby-pink-500 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-300'
                } ${pack.popular ? 'ring-2 ring-baby-pink-500' : ''}`}
                onClick={() => handleSelectPack(pack)}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center">
                      <Crown size={16} className="mr-1" />
                      {country === 'BR' ? 'Popular' : 'Popular'}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-baby-pink-500 to-baby-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">{pack.credits}</span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {pack.credits} {country === 'BR' ? 'Créditos' : 'Credits'}
                  </h3>
                  
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-baby-pink-600">
                      {formatPrice(pack.price, pack.currency)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {country === 'BR' 
                      ? `${pack.credits} músicas para revelar` 
                      : `${pack.credits} songs to reveal`
                    }
                  </p>

                  {selectedPack?.id === pack.id && (
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

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">💳</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  {country === 'BR' ? 'Pagamento Seguro' : 'Secure Payment'}
                </h4>
                <p className="text-sm text-blue-700">
                  {country === 'BR' 
                    ? 'Processado pelo Stripe. Seus dados estão protegidos com criptografia de nível bancário.'
                    : 'Processed by Stripe. Your data is protected with bank-level encryption.'
                  }
                </p>
              </div>
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
              disabled={!selectedPack || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading 
                ? (country === 'BR' ? 'Processando...' : 'Processing...') 
                : (country === 'BR' ? 'Comprar Créditos' : 'Buy Credits')
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
              {country === 'BR' ? 'Créditos' : 'Credits'}
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
          {/* Pacotes em Lista Vertical Compacta */}
          <div className="space-y-3 mb-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`relative border rounded-xl p-3 cursor-pointer transition-all ${
                  selectedPack?.id === pack.id
                    ? 'border-baby-pink-500 bg-baby-pink-50 shadow-md'
                    : 'border-gray-200 hover:border-baby-pink-300'
                }`}
                onClick={() => handleSelectPack(pack)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-baby-pink-500 to-baby-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{pack.credits}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900">
                          {pack.credits} {country === 'BR' ? 'Créditos' : 'Credits'}
                        </h3>
                        {pack.popular && (
                          <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                            {country === 'BR' ? 'TOP' : 'TOP'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-baby-pink-600">
                          {formatPrice(pack.price, pack.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {selectedPack?.id === pack.id ? (
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

          {/* Info de Pagamento Compacta */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-500 text-sm">🔒</span>
              <p className="text-xs text-blue-700">
                {country === 'BR' 
                  ? 'Pagamento seguro via Stripe'
                  : 'Secure payment via Stripe'
                }
              </p>
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
              disabled={!selectedPack || loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading 
                ? '...' 
                : (country === 'BR' ? 'Comprar' : 'Buy')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { CreditPack };