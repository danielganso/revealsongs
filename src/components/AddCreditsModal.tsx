import { useState } from 'react';
import { X, Check, Crown, Plus, Tag } from 'lucide-react';

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  currency: 'USD' | 'BRL';
  stripeId: string;
  popular?: boolean;
  couponCode?: string;
}

interface AddCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPack: (pack: CreditPack) => void;
  currency: 'USD' | 'BRL';
  country: string;
}

const getCreditPacks = (currency: 'USD' | 'BRL'): CreditPack[] => {
  if (currency === 'BRL') {
    return [
      {
        id: '2_credits_brl',
        credits: 2,
        price: 9.99,
        currency: 'BRL',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_2_SONGS_BRL_AVULSO || 'price_1SEhd6LdwkupxKFBQfl5SlQ1'
      },
      {
        id: '5_credits_brl',
        credits: 5,
        price: 19.99,
        currency: 'BRL',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_SONGS_BRL_AVULSO || 'price_1SEhcdLdwkupxKFBZ2hLRaYS',
        popular: true
      },
      {
        id: '8_credits_brl',
        credits: 8,
        price: 29.99,
        currency: 'BRL',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_8_SONGS_BRL_AVULSO || 'price_1SEheyLdwkupxKFB96BTNsLr'
      }
    ];
  } else {
    return [
      {
        id: '2_credits_usd',
        credits: 2,
        price: 5.99,
        currency: 'USD',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_2_SONGS_USD_AVULSO || 'price_1SEhYrLdwkupxKFBE7EYWdzL'
      },
      {
        id: '5_credits_usd',
        credits: 5,
        price: 11.99,
        currency: 'USD',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_SONGS_USD_AVULSO || 'price_1SEhZNLdwkupxKFBlVaKLtqr',
        popular: true
      },
      {
        id: '8_credits_usd',
        credits: 8,
        price: 19.99,
        currency: 'USD',
        stripeId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_8_SONGS_USD_AVULSO || 'price_1SEha4LdwkupxKFB3yJNOBjv'
      }
    ];
  }
};

const formatPrice = (price: number, currency: 'USD' | 'BRL'): string => {
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
      
      // Passar o cupom junto com o pacote selecionado
      await onSelectPack({ ...selectedPack, couponCode: couponCode.trim() || undefined });
    } catch (error) {
      console.error('Erro ao selecionar pacote de créditos:', error);
      setCouponError(country === 'BR' ? 'Erro ao validar cupom' : 'Error validating coupon');
    } finally {
      setLoading(false);
    }
  };

  const getValuePerCredit = (pack: CreditPack) => {
    const valuePerCredit = pack.price / pack.credits;
    return formatPrice(valuePerCredit, pack.currency);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center">
              <Plus className="mr-2 text-baby-pink-500" size={20} />
              {country === 'BR' ? 'Adicionar Créditos' : 'Add Credits'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {country === 'BR' 
                ? 'Escolha um pacote de créditos para criar mais músicas' 
                : 'Choose a credit pack to create more songs'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`relative border-2 rounded-2xl p-4 sm:p-6 cursor-pointer transition-all ${
                  selectedPack?.id === pack.id
                    ? 'border-baby-pink-500 bg-baby-pink-50'
                    : 'border-gray-200 hover:border-baby-pink-300'
                } ${pack.popular ? 'ring-2 ring-baby-pink-500' : ''}`}
                onClick={() => handleSelectPack(pack)}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-2 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold flex items-center">
                      <Crown size={12} className="mr-1 sm:w-4 sm:h-4" />
                      {country === 'BR' ? 'Mais Popular' : 'Most Popular'}
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="mb-3 sm:mb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="text-lg sm:text-2xl font-bold text-white">{pack.credits}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                      {pack.credits} {country === 'BR' ? 'Créditos' : 'Credits'}
                    </h3>
                  </div>
                  
                  <div className="mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl font-bold text-baby-pink-600">
                      {formatPrice(pack.price, pack.currency)}
                    </span>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {getValuePerCredit(pack)} {country === 'BR' ? 'por crédito' : 'per credit'}
                    </p>
                  </div>

                  <ul className="space-y-1 sm:space-y-2 mb-4 sm:mb-6 text-left">
                    <li className="flex items-center text-xs sm:text-sm text-gray-700">
                      <Check size={14} className="text-green-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4" />
                      {pack.credits} {country === 'BR' ? 'músicas personalizadas' : 'custom songs'}
                    </li>
                    <li className="flex items-center text-xs sm:text-sm text-gray-700">
                      <Check size={14} className="text-green-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4" />
                      {country === 'BR' ? 'Créditos nunca expiram' : 'Credits never expire'}
                    </li>
                    <li className="flex items-center text-xs sm:text-sm text-gray-700">
                      <Check size={14} className="text-green-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4" />
                      {country === 'BR' ? 'Pagamento seguro via Stripe' : 'Secure payment via Stripe'}
                    </li>
                  </ul>

                  {selectedPack?.id === pack.id && (
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-baby-pink-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Campo de cupom */}
          <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6">
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
              className={`w-full px-3 py-2 sm:px-4 sm:py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-baby-pink-500 focus:border-transparent transition-all text-sm sm:text-base ${
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

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-gray-600 text-center">
              {country === 'BR' 
                ? '💳 Pagamentos processados com segurança pelo Stripe. Seus créditos serão adicionados automaticamente após a confirmação do pagamento.'
                : '💳 Payments securely processed by Stripe. Your credits will be added automatically after payment confirmation.'
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 rounded-full text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {country === 'BR' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPack || loading}
              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-full text-sm sm:text-base font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (country === 'BR' ? 'Processando...' : 'Processing...') 
                : (country === 'BR' ? 'Comprar Créditos' : 'Buy Credits')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { CreditPack };