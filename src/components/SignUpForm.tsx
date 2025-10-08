import { useState } from 'react';
import { X, Mail, User, Lock, CreditCard, Check, Crown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getPlansForRegion, formatPrice, type Plan } from '../lib/plans';

interface RegionInfo {
  country: string;
  currency: string;
  language: string;
}

interface SignUpFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: Plan | null;
  regionInfo: RegionInfo;
}

export default function SignUpForm({ onClose, selectedPlan, regionInfo }: SignUpFormProps) {
  const { signUp, signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSelectedPlan, setCurrentSelectedPlan] = useState(selectedPlan);

  const getPricingPlans = (): Plan[] => {
    return getPlansForRegion(regionInfo.currency as 'USD' | 'BRL');
  };

  const pricingPlans = getPricingPlans();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentSelectedPlan) {
      setError(regionInfo.country === 'BR' ? 'Por favor, selecione um plano' : 'Please select a plan');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(regionInfo.country === 'BR' ? 'As senhas não coincidem' : 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError(regionInfo.country === 'BR' ? 'A senha deve ter pelo menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      console.log('🔧 SignUpForm - Chamando API signup diretamente...');
      
      // Chamar a API signup diretamente
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          metadata: {
            name: formData.name,
            selectedPlan: currentSelectedPlan,
            region: regionInfo.country,
            currency: regionInfo.currency,
            couponCode: undefined
          }
        }),
      });

      const result = await response.json();
      console.log('🔧 SignUpForm - Resultado da API:', result);

      if (response.ok && result.success) {
        console.log('✅ SignUpForm - Usuário criado com sucesso');
        
        // Aguardar um pouco para garantir que o usuário foi criado no Supabase Auth
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fazer login automático do usuário usando o hook
        const loginResult = await signIn(formData.email, formData.password);
        
        if (loginResult.data?.user) {
          console.log('✅ SignUpForm - Login automático realizado');
          // Redirecionar para dashboard
          const dashboardUrl = regionInfo.currency === 'BRL' ? '/dashboard' : '/dashboard';
          window.location.href = dashboardUrl;
        } else {
          console.log('⚠️ SignUpForm - Falha no login automático, redirecionando mesmo assim');
          // Redirecionar mesmo se o login automático falhar
          const dashboardUrl = regionInfo.currency === 'BRL' ? '/dashboard' : '/dashboard';
          window.location.href = dashboardUrl;
        }
      } else {
        console.error('❌ SignUpForm - Erro na API:', result);
        setError(result.error || (regionInfo.country === 'BR' ? 'Erro inesperado ao criar conta' : 'Unexpected error creating account'));
      }
    } catch (err: any) {
      console.error('💥 Erro geral no cadastro:', err);
      setError(err.message || (regionInfo.country === 'BR' ? 'Erro ao criar conta' : 'Error creating account'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const isPortuguese = regionInfo.country === 'BR';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Floating shapes background */}
      <div className="floating-shapes">
        <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-br from-baby-pink-200 to-baby-pink-300 rounded-full opacity-60 animate-float"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-gradient-to-br from-baby-blue-200 to-baby-blue-300 rounded-full opacity-60 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-32 w-24 h-24 bg-gradient-to-br from-soft-purple-200 to-soft-purple-300 rounded-full opacity-60 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
        {/* Sparkle effects */}
        <div className="sparkle">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full opacity-70"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10 bg-white rounded-full shadow-md hover:shadow-lg transform hover:scale-110 duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-slow">🎵</div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              {isPortuguese ? 'Criar Conta' : 'Create Account'}
            </h2>
            
            {/* Plan Selection or Display */}
            {!currentSelectedPlan ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  {isPortuguese ? 'Escolha seu plano:' : 'Choose your plan:'}
                </h3>
                <div className="space-y-3">
                  {pricingPlans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setCurrentSelectedPlan(plan)}
                      className="relative cursor-pointer border-2 border-gray-200 rounded-2xl p-4 hover:border-baby-pink-300 transition-all duration-200 hover:shadow-lg"
                    >
                      {plan.popular && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            {isPortuguese ? 'Mais Popular' : 'Most Popular'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            {plan.popular && <Crown className="w-4 h-4 text-baby-pink-500" />}
                            <h4 className="font-bold text-gray-800">{plan.name}</h4>
                          </div>
                          <div className="text-2xl font-bold gradient-text">
                            {formatPrice(plan.price, plan.currency)}
                            <span className="text-sm text-gray-500">
                              /{isPortuguese ? 'mês' : 'month'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {plan.credits} {isPortuguese ? 'músicas' : 'songs'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-baby-pink-100 to-baby-blue-100 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-baby-pink-500" />
                      <span className="font-semibold text-gray-700">
                        {isPortuguese ? 'Plano Selecionado:' : 'Selected Plan:'} {currentSelectedPlan.name}
                      </span>
                    </div>
                    <div className="text-2xl font-bold gradient-text mt-2">
                      {formatPrice(currentSelectedPlan.price, currentSelectedPlan.currency)}
                      <span className="text-sm text-gray-500">
                        /{isPortuguese ? 'mês' : 'month'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentSelectedPlan(null)}
                    className="text-baby-pink-500 hover:text-baby-pink-600 text-sm underline"
                  >
                    {isPortuguese ? 'Alterar' : 'Change'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={isPortuguese ? 'Seu email' : 'Your email'}
                  className="input-field pl-12 w-full"
                  required
                />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={isPortuguese ? 'Seu nome completo' : 'Your full name'}
                  className="input-field pl-12 w-full"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isPortuguese ? 'Sua senha' : 'Your password'}
                  className="input-field pl-12 w-full"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder={isPortuguese ? 'Confirme sua senha' : 'Confirm your password'}
                  className="input-field pl-12 w-full"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isPortuguese ? 'Criando conta...' : 'Creating account...'}</span>
                </div>
              ) : (
                isPortuguese ? 'Criar Conta' : 'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isPortuguese 
              ? 'Ao criar sua conta, você será redirecionado para o pagamento seguro via Stripe'
              : 'By creating your account, you will be redirected to secure payment via Stripe'
            }
          </p>
        </div>
      </div>
    </div>
  );
}