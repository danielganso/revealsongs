import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { Check, Star, Music, Heart, Sparkles, Zap, Globe, Shield, Crown, Plus } from 'lucide-react';
import AuthButton from '../components/AuthButton';
import RegionModal from '../components/RegionModal';
import SignUpForm from '../components/SignUpForm';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

interface RegionInfo {
  country: string;
  currency: string;
  locale: string;
  language: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  credits: number;
  features: string[];
  stripeId: string;
  popular?: boolean;
}

export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user } = useAuth();
  const { subscription, creditsRemaining } = useSubscription(user?.id);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionInfo, setRegionInfo] = useState<RegionInfo>({
    country: 'US',
    currency: 'USD',
    locale: 'en',
    language: 'en'
  });
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Títulos alternantes em português
  const titlesPortuguese = [
    'Músicas Personalizadas para seu chá revelação',
    'Músicas Personalizadas para o Aniversario do seu filho',
    'Músicas Personalizadas para Seu Amor'
  ];

  // Títulos alternantes em inglês
  const titlesEnglish = [
    'Personalized Songs for your gender reveal',
    'Personalized Songs for your child\'s Birthday',
    'Personalized Songs for Your Love'
  ];

  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [rotatingTitle, setRotatingTitle] = useState(titlesPortuguese[0]);
  const [rotatingTitleEn, setRotatingTitleEn] = useState(titlesEnglish[0]);

  // Efeito para alternar títulos a cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTitleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % titlesPortuguese.length;
        setRotatingTitle(titlesPortuguese[nextIndex]);
        setRotatingTitleEn(titlesEnglish[nextIndex]);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Definir planos baseado na região
  const getPricingPlans = (): PricingPlan[] => {
    const isBrazil = regionInfo.country === 'BR';
    
    if (isBrazil) {
      return [
        {
          id: 'starter-br',
          name: '2 Músicas',
          price: 29.99,
          currency: 'BRL',
          credits: 2,
          features: [
            'Letras personalizadas com IA',
            'Música de alta qualidade',
            'Download em MP3',
            'Suporte por email'
          ],
          stripeId: 'price_starter_brl'
        },
        {
          id: 'family-br',
          name: '5 Músicas',
          price: 59.99,
          currency: 'BRL',
          credits: 5,
          features: [
            'Letras personalizadas com IA',
            'Música de alta qualidade',
            'Download em MP3 e WAV',
            'Múltiplos estilos musicais',
            'Suporte prioritário'
          ],
          stripeId: 'price_family_brl',
          popular: true
        },
        {
          id: 'premium-br',
          name: '8 Músicas',
          price: 79.99,
          currency: 'BRL',
          credits: 8,
          features: [
            'Letras personalizadas com IA',
            'Música premium de alta qualidade',
            'Todos os formatos de download',
            'Acesso antecipado a novos recursos',
            'Suporte VIP',
            'Personalização avançada'
          ],
          stripeId: 'price_premium_brl'
        }
      ];
    } else {
      return [
        {
          id: 'starter-us',
          name: '2 Songs',
          price: 19.99,
          currency: 'USD',
          credits: 2,
          features: [
            'AI-powered personalized lyrics',
            'High-quality music generation',
            'MP3 download',
            'Email support'
          ],
          stripeId: 'price_starter_usd'
        },
        {
          id: 'family-us',
          name: '5 Songs',
          price: 39.99,
          currency: 'USD',
          credits: 5,
          features: [
            'AI-powered personalized lyrics',
            'High-quality music generation',
            'MP3 and WAV download',
            'Multiple music styles',
            'Priority support'
          ],
          stripeId: 'price_family_usd',
          popular: true
        },
        {
          id: 'premium-us',
          name: '8 Songs',
          price: 69.99,
          currency: 'USD',
          credits: 8,
          features: [
            'AI-powered personalized lyrics',
            'Premium high-quality music',
            'All download formats',
            'Early access to new features',
            'VIP support',
            'Advanced customization'
          ],
          stripeId: 'price_premium_usd'
        }
      ];
    }
  };

  const pricingPlans = getPricingPlans();

  // Verificar região salva nos cookies
  useEffect(() => {
    const savedRegion = document.cookie
      .split('; ')
      .find(row => row.startsWith('selectedRegion='))
      ?.split('=')[1];

    if (savedRegion) {
      try {
        const regionData = JSON.parse(decodeURIComponent(savedRegion));
        setRegionInfo({
          ...regionData,
          language: regionData.language || (regionData.country === 'BR' ? 'pt' : 'en')
        });
        
        // Definir idioma baseado na região
        const targetLocale = regionData.country === 'BR' ? 'pt' : 'en';
        if (router.locale !== targetLocale) {
          router.push(router.asPath, router.asPath, { locale: targetLocale });
        }
      } catch (error) {
        // Se houver erro ao parsear o cookie, limpar e mostrar modal
        document.cookie = 'selectedRegion=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setShowRegionModal(true);
      }
    } else {
      setShowRegionModal(true);
    }
  }, [router]);

  // Função para forçar abertura do modal (para teste)
  const forceShowRegionModal = () => {
    document.cookie = 'selectedRegion=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setShowRegionModal(true);
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripeId,
          userId: user.id,
          planName: plan.name,
          credits: plan.credits,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      // Error handling for checkout session creation
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setShowSignUpForm(true);
  };

  const handleSignUpClick = () => {
    setShowSignUpForm(true);
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 via-white to-baby-blue-50 relative">
      {/* Floating Background Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1 w-32 h-32 bg-gradient-to-br from-baby-pink-200 to-baby-pink-100 rounded-full"></div>
        <div className="shape shape-2 w-24 h-24 bg-gradient-to-br from-baby-blue-200 to-baby-blue-100 rounded-full"></div>
        <div className="shape shape-3 w-40 h-40 bg-gradient-to-br from-soft-purple-200 to-soft-purple-100 rounded-full"></div>
        <div className="shape shape-4 w-28 h-28 bg-gradient-to-br from-baby-pink-200 to-baby-blue-200 rounded-full"></div>
        <div className="shape shape-5 w-36 h-36 bg-gradient-to-br from-baby-blue-200 to-soft-purple-200 rounded-full"></div>
        
        {/* Sparkles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="sparkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-baby-pink-100 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 animate-float">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm sm:text-lg">🎵</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold gradient-text">RevealSongs</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Credits Display for Logged Users */}
              {user && creditsRemaining > 0 && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-baby-pink-100 to-baby-blue-100 px-3 py-1 rounded-full border border-baby-pink-200">
                  <Music className="w-4 h-4 text-baby-pink-600" />
                  <span className="text-xs sm:text-sm font-semibold text-baby-pink-700">
                    {creditsRemaining} {regionInfo.country === 'BR' ? 'créditos' : 'credits'}
                  </span>
                </div>
              )}
              
              {/* Dashboard Button - Always visible for logged users */}
              {user && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 hover:from-baby-pink-600 hover:to-baby-blue-600 text-white font-semibold transition-all duration-200 rounded-2xl transform hover:scale-105"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{regionInfo.country === 'BR' ? 'Dashboard' : 'Dashboard'}</span>
                </button>
              )}
              
              <button
                onClick={forceShowRegionModal}
                className="text-xs sm:text-sm text-baby-pink-600 hover:text-baby-pink-800 underline transition-colors"
              >
                {regionInfo.country === 'BR' ? 'Alterar Região' : 'Change Region'}
              </button>
              {!user && (
                <button
                  onClick={handleLoginClick}
                  className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-baby-pink-600 hover:text-baby-pink-800 font-semibold transition-colors border border-baby-pink-300 rounded-2xl hover:bg-baby-pink-50"
                >
                  {regionInfo.country === 'BR' ? 'Entrar' : 'Sign In'}
                </button>
              )}
              {!user && (
                <button
                  onClick={handleSignUpClick}
                  className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm bg-baby-pink-600 hover:bg-baby-pink-700 text-white font-semibold transition-colors rounded-2xl"
                >
                  {regionInfo.country === 'BR' ? 'Cadastrar' : 'Sign Up'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-20">
          <div className="animate-bounce-slow mb-4 sm:mb-6">
            <div className="text-6xl sm:text-8xl mb-4">👶</div>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold gradient-text mb-4 sm:mb-6 animate-float px-2">
            {regionInfo.country === 'BR' 
              ? rotatingTitle 
              : rotatingTitleEn
            }
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4">
            {regionInfo.country === 'BR'
              ? 'Crie músicas únicas e especiais com inteligência artificial. Cada música é feita especialmente para sua família com muito amor e carinho.'
              : 'Create unique and special songs with artificial intelligence. Each song is made especially for your family with lots of love and care.'
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-12 px-4">
            {!user && (
              <AuthButton 
                regionInfo={regionInfo}
                onSignUpClick={handleSignUpClick}
                className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 animate-pulse-slow"
              />
            )}
            {user && (
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Show credits info if user has credits */}
                {creditsRemaining > 0 && (
                  <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl border border-baby-pink-200 shadow-lg">
                    <div className="w-10 h-10 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        {regionInfo.country === 'BR' ? 'Você tem' : 'You have'}
                      </p>
                      <p className="text-xl font-bold text-baby-pink-700">
                        {creditsRemaining} {regionInfo.country === 'BR' ? 'créditos disponíveis' : 'credits available'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Create Song Button */}
                <button
                  onClick={() => {
                    if (creditsRemaining > 0) {
                      router.push('/dashboard');
                    } else {
                      router.push('/dashboard');
                    }
                  }}
                  className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 flex items-center space-x-2"
                >
                  <Music className="w-5 h-5" />
                  <span>
                    {creditsRemaining > 0 
                      ? (regionInfo.country === 'BR' ? 'Criar Música' : 'Create Song')
                      : (regionInfo.country === 'BR' ? 'Comprar Créditos' : 'Buy Credits')
                    }
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Cute Icons */}
          <div className="flex justify-center space-x-4 sm:space-x-8 text-2xl sm:text-4xl mb-6 sm:mb-8">
            <span className="animate-bounce-slow" style={{animationDelay: '0s'}}>🎼</span>
            <span className="animate-bounce-slow" style={{animationDelay: '0.5s'}}>💝</span>
            <span className="animate-bounce-slow" style={{animationDelay: '1s'}}>🌟</span>
            <span className="animate-bounce-slow" style={{animationDelay: '1.5s'}}>🎵</span>
            <span className="animate-bounce-slow" style={{animationDelay: '2s'}}>💕</span>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-12 sm:mb-20">
          <div className="text-center mb-8 sm:mb-12">
            <div className="text-4xl sm:text-6xl mb-4 animate-wiggle">💰</div>
            <h2 className="text-2xl sm:text-4xl font-bold gradient-text mb-4 px-2">
              {regionInfo.country === 'BR' ? 'Planos Especiais' : 'Special Plans'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg px-4">
              {regionInfo.country === 'BR' 
                ? 'Escolha o plano perfeito para sua família'
                : 'Choose the perfect plan for your family'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4">
            {pricingPlans.map((plan, index) => (
              <div 
                key={plan.id} 
                className={`card relative transform hover:scale-105 transition-all duration-300 ${
                  plan.popular ? 'ring-4 ring-baby-pink-300 shadow-2xl' : ''
                } animate-float`}
                style={{animationDelay: `${index * 0.2}s`}}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse-slow">
                      <Crown className="w-4 h-4 inline mr-1" />
                      {regionInfo.country === 'BR' ? 'Mais Popular' : 'Most Popular'}
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <div className="text-3xl sm:text-4xl mb-3">
                    {index === 0 ? '🌟' : index === 1 ? '👨‍👩‍👧‍👦' : '👑'}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold gradient-text mb-2">{plan.name}</h3>
                  <div className="text-3xl sm:text-4xl font-bold text-gray-800 mb-1">
                    {plan.currency === 'BRL' ? 'R$' : '$'}{plan.price}
                  </div>
                  <div className="text-gray-500 text-sm sm:text-base">
                    {regionInfo.country === 'BR' ? '/mês' : '/month'}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                  className={`w-full py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base ${
                    plan.popular 
                      ? 'btn-primary shadow-xl' 
                      : 'btn-secondary'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{regionInfo.country === 'BR' ? 'Carregando...' : 'Loading...'}</span>
                    </div>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 inline mr-2" />
                      {regionInfo.country === 'BR' ? 'Escolher Plano' : 'Choose Plan'}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-12 sm:mb-20">
          <div className="text-center mb-8 sm:mb-12">
            <div className="text-4xl sm:text-6xl mb-4 animate-bounce-slow">✨</div>
            <h2 className="text-2xl sm:text-4xl font-bold gradient-text mb-4 px-2">
              {regionInfo.country === 'BR' ? 'Recursos Mágicos' : 'Magical Features'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed px-4">
              {regionInfo.country === 'BR' 
                ? 'Descubra todas as funcionalidades incríveis que temos para você'
                : 'Discover all the amazing features we have for you'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto px-4">
            {[
              {
                icon: '📖',
                title: regionInfo.country === 'BR' ? 'Letras Baseadas na Sua História' : 'Lyrics Based on Your Story',
                description: regionInfo.country === 'BR' 
                  ? 'Conte sua história e nossa IA criará letras únicas e personalizadas especialmente para você'
                  : 'Tell your story and our AI will create unique and personalized lyrics especially for you'
              },
              {
                icon: '🎵',
                title: regionInfo.country === 'BR' ? 'Criação Inteligente' : 'Smart Creation',
                description: regionInfo.country === 'BR' 
                  ? 'IA avançada para criar músicas únicas e personalizadas'
                  : 'Advanced AI to create unique and personalized songs'
              },
              {
                icon: '🎨',
                title: regionInfo.country === 'BR' ? 'Estilos Diversos' : 'Diverse Styles',
                description: regionInfo.country === 'BR'
                  ? 'Mais de 10 estilos musicais diferentes para escolher'
                  : 'Over 10 different musical styles to choose from'
              },
              {
                icon: '⚡',
                title: regionInfo.country === 'BR' ? 'Super Rápido' : 'Lightning Fast',
                description: regionInfo.country === 'BR'
                  ? 'Gere suas músicas em segundos, não em horas'
                  : 'Generate your songs in seconds, not hours'
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="card text-center transform hover:scale-105 transition-all duration-300 animate-float"
                style={{animationDelay: `${index * 0.3}s`}}
              >
                <div className="text-4xl sm:text-6xl mb-4 animate-wiggle">{feature.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold gradient-text mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-12 sm:mb-20">
          <div className="text-center mb-8 sm:mb-12">
            <div className="text-4xl sm:text-6xl mb-4 animate-pulse-slow">🪄</div>
            <h2 className="text-2xl sm:text-4xl font-bold gradient-text mb-4 px-2">
              {regionInfo.country === 'BR' ? 'Como Funciona a Magia' : 'How the Magic Works'}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed px-4">
              {regionInfo.country === 'BR' 
                ? 'Três passos simples para criar sua música dos sonhos'
                : 'Three simple steps to create your dream song'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4">
            {[
              {
                step: '1',
                emoji: '💭',
                title: regionInfo.country === 'BR' ? 'Descreva sua Ideia' : 'Describe Your Idea',
                description: regionInfo.country === 'BR'
                  ? 'Conte-nos sobre a música que você quer criar'
                  : 'Tell us about the song you want to create'
              },
              {
                step: '2',
                emoji: '🎭',
                title: regionInfo.country === 'BR' ? 'Escolha o Estilo' : 'Choose the Style',
                description: regionInfo.country === 'BR'
                  ? 'Selecione o gênero e o mood perfeito'
                  : 'Select the perfect genre and mood'
              },
              {
                step: '3',
                emoji: '🎉',
                title: regionInfo.country === 'BR' ? 'Receba sua Música' : 'Get Your Song',
                description: regionInfo.country === 'BR'
                  ? 'Sua música personalizada estará pronta!'
                  : 'Your personalized song will be ready!'
              }
            ].map((step, index) => (
              <div 
                key={index} 
                className="card text-center relative transform hover:scale-105 transition-all duration-300 animate-float"
                style={{animationDelay: `${index * 0.4}s`}}
              >
                <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg animate-bounce-slow">
                  {step.step}
                </div>
                <div className="text-4xl sm:text-6xl mb-4 animate-wiggle" style={{animationDelay: `${index * 0.2}s`}}>
                  {step.emoji}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold gradient-text mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl sm:rounded-2xl p-6 sm:p-12 text-white mx-4">
          <h2 className="text-xl sm:text-3xl font-bold mb-4">
            {regionInfo.country === 'BR' 
              ? 'Pronto para Criar Sua Primeira Música?' 
              : 'Ready to Create Your First Song?'
            }
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90">
            {regionInfo.country === 'BR'
              ? 'Junte-se a milhares de famílias que já criaram suas músicas especiais'
              : 'Join thousands of families who have already created their special songs'
            }
          </p>
          {!user && (
            <AuthButton 
              regionInfo={regionInfo}
              onSignUpClick={handleSignUpClick}
              className="bg-white text-purple-600 px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold hover:bg-gray-100 transition-all text-sm sm:text-base"
            />
          )}
          {user && (
            <AuthButton 
              regionInfo={regionInfo}
              onSignUpClick={handleSignUpClick}
              className="bg-white text-purple-600 px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold hover:bg-gray-100 transition-all text-sm sm:text-base"
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12 mt-12 sm:mt-20">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">RS</span>
            </div>
            <span className="text-lg sm:text-xl font-bold">RevealSongs</span>
          </div>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">
            {regionInfo.country === 'BR' 
              ? 'Criando memórias musicais para sua família'
              : 'Creating musical memories for your family'
            }
          </p>
          <div className="text-xs sm:text-sm text-gray-500">
            {regionInfo.country === 'BR' 
              ? `Região detectada: Brasil | Moeda: ${regionInfo.currency}`
              : `Detected region: International | Currency: ${regionInfo.currency}`
            }
          </div>
        </div>
      </footer>

      {/* Region Modal */}
      {showRegionModal && (
        <RegionModal 
          onClose={() => setShowRegionModal(false)}
          onRegionSelect={(region) => {
            setRegionInfo({
              ...region,
              language: region.country === 'BR' ? 'pt' : 'en'
            });
            setShowRegionModal(false);
          }}
        />
      )}

      {/* Sign Up Form */}
      {showSignUpForm && (
        <SignUpForm
          isOpen={showSignUpForm}
          onClose={() => setShowSignUpForm(false)}
          selectedPlan={selectedPlan}
          regionInfo={regionInfo}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSignUpClick={() => {
            setShowLoginModal(false);
            setShowSignUpForm(true);
          }}
          regionInfo={regionInfo}
        />
      )}
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'pt', ['common'])),
    },
  };
}