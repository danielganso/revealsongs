import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { useUserRole } from '../hooks/useUserRole';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Music, Plus, User, LogOut, CreditCard, Menu, X, Settings, AlertCircle, Zap, Home, Star, Users, BarChart3, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { translations, Language } from '../lib/translations';
import PlanSelectionModal from '../components/PlanSelectionModal';
import CreateSongComponent from '../components/CreateSongComponent';
import UserLyricsTable from '../components/UserLyricsTable';
import AddCreditsModal from '../components/AddCreditsModal';
import CreatePartnerModal from '../components/CreatePartnerModal';
import PartnersTable from '../components/PartnersTable';
import PartnerReports from '../components/PartnerReports';
import AdminReports from '../components/AdminReports';
import AdminCommissions from '../components/AdminCommissions';
import { type Plan } from '../lib/plans';
import { useSubscription } from '../hooks/useSubscription';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { language, currency, hasSubscription, loading: languageLoading } = useUserLanguage(user?.id);
  const { profile, role, isAdmin, isPartner, loading: roleLoading } = useUserRole(user?.id);
  const { subscription, creditsRemaining, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription(user?.id);
  const router = useRouter();
  
  // Get translations for current language
  const t = translations[language];
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showCreatePartnerModal, setShowCreatePartnerModal] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'create-song' | 'partner-reports' | 'admin-reports' | 'admin-commissions' | 'manage-partners' | 'settings'>('dashboard');
  
  // Estados para edição de letras
  const [isEditingLyric, setIsEditingLyric] = useState(false);
  const [editingLyricData, setEditingLyricData] = useState<any>(null);

  // Estados para gerenciamento de parceiros
  const [editingUser, setEditingUser] = useState<any>(null);
  const [refreshPartnersTable, setRefreshPartnersTable] = useState(0); // Contador para forçar refresh

  // Estados para configurações
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Estados para atualização global de músicas
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);

  useEffect(() => {
    if (loading || languageLoading) return

    if (!user) {
      router.push('/')
      return
    }

    // Load user data
    const loadUserData = async () => {
      if (user) {
        // Usuário logado
      }
      
      try {
        // Verificar se há pagamento pendente na tabela subscriptions
        const checkPendingPayment = async () => {
          try {
            const response = await fetch('/api/check-pending-subscription', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId: user.id }),
            });
            
            if (response.ok) {
              const result = await response.json();
              setHasPendingPayment(result.hasPending);
            }
          } catch (error) {
            // Erro silencioso
          }
        };

        await checkPendingPayment();
      } catch (error) {
        // Erro silencioso
      }
    }

    loadUserData()
  }, [user, loading, router])

  const handleFinalizePayment = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/check-pending-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.hasPending) {
          setShowPlanModal(true);
        }
      }
    } catch (error) {
      // Erro silencioso
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      // Erro silencioso
    }
  };

  const handlePlanSelection = async (selectedPlan: Plan, couponCode?: string) => {
    try {
      setPaymentLoading(true);
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Atualizar a subscription com o novo plano
      const updateResponse = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription?.id,
          planId: selectedPlan.id,
          currency: selectedPlan.currency,
          credits: selectedPlan.credits,
          price: selectedPlan.price
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Erro ao atualizar subscription');
      }

      // Criar sessão de checkout com o novo plano
      const checkoutResponse = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          couponCode: couponCode
        }),
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await checkoutResponse.json();
      
      if (url) {
        // Fechar modal e redirecionar para checkout
        setShowPlanModal(false);
        window.location.href = url;
      }
    } catch (error) {
      // Error handling for selected plan processing
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Função para processar seleção de pacote de créditos
  const handleCreditPackSelection = async (pack: any, couponCode?: string) => {
    try {
      console.log('🔧 handleCreditPackSelection - Iniciando:', { pack, couponCode });
      setPaymentLoading(true);
      
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      console.log('✅ Token de autenticação obtido');

      // Criar sessão de checkout para recarga de créditos
      const requestBody = {
        packId: pack.id,
        couponCode: couponCode
      };

      console.log('🔧 Enviando requisição para API:', requestBody);

      const checkoutResponse = await fetch('/api/create-credits-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔧 Resposta da API:', { 
        status: checkoutResponse.status, 
        ok: checkoutResponse.ok 
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        console.error('❌ Erro na API:', errorData);
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const responseData = await checkoutResponse.json();
      console.log('✅ Dados da resposta:', responseData);
      
      const { url } = responseData;
      
      if (url) {
        console.log('🔧 Redirecionando para:', url);
        // Fechar modal e redirecionar para checkout
        setShowCreditsModal(false);
        window.location.href = url;
      } else {
        console.error('❌ URL não encontrada na resposta');
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error) {
      console.error('❌ Erro em handleCreditPackSelection:', error);
      // Error handling for credits package processing
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Função para editar uma letra existente
  const handleEditLyric = (lyric: any) => {
    setEditingLyricData(lyric);
    setIsEditingLyric(true);
    setCurrentView('create-song');
  };

  // Função para duplicar uma letra existente
  const handleDuplicateLyric = async (lyric: any) => {
    try {
      // Criar uma nova entrada na tabela letras_songs com os dados do usuário
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const duplicatedLyric = {
        user_id: user.id,
        song_type: lyric.song_type,
        baby_names: lyric.baby_names,
        baby_genders: lyric.baby_genders,
        babies_count: lyric.babies_count,
        musical_style: lyric.musical_style,
        vocal_gender: 'female', // Default value since it's required
        language: lyric.language,
        lyrics: lyric.lyrics,
        parents_story: lyric.parents_story,
        birthday_theme: lyric.birthday_theme,
        story_to_tell: lyric.story_to_tell,
        status: 'completed'
      };

      const { data, error } = await (supabase as any)
        .from('letras_songs')
        .insert([duplicatedLyric])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Redirecionar para editar a nova letra duplicada
      setEditingLyricData(data);
      setIsEditingLyric(true);
      setCurrentView('create-song');
      
      alert('Letra duplicada com sucesso! Você pode agora fazer alterações e criar uma nova música.');
    } catch (error) {
      // Error handling for lyric duplication
      alert('Erro ao duplicar letra. Tente novamente.');
    }
  };

  // Função para gerar música a partir de uma letra salva
  const generateMusicFromLyric = async (lyricId: string) => {
    try {
      // Obter o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer requisição para gerar música usando o lyric_id
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lyric_id: lyricId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta da API:', errorData);
        throw new Error(errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Redirecionar para a seção de criar música para acompanhar o progresso
        setCurrentView('create-song');
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }

    } catch (error) {
      console.error('Erro ao gerar música:', error);
      alert('Erro ao iniciar geração de música. Tente novamente.');
    }
  };

  const handleCreateSongClick = () => {
    // Nova lógica: priorizar créditos sobre status da assinatura
    
    // 1. Se tem créditos, permite acesso independente do status da assinatura
    if (creditsRemaining > 0) {
      // Tem créditos, mudar para a view de criar música
      setCurrentView('create-song');
      return;
    }

    // 2. Se não tem créditos, verifica o status da assinatura
    if (!subscription || subscription.status !== 'active') {
      // Não tem créditos E (não tem assinatura OU assinatura não está ativa/pendente/cancelada)
      // Mostra modal de assinatura
      setShowPlanModal(true);
      return;
    }

    // 3. Se tem assinatura ativa mas não tem créditos
    // Mostra modal de comprar créditos
    setShowCreditsModal(true);
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Erro: Usuário não autenticado');
        return;
      }

      const response = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: user.user_id,
          profileId: user.id,
          couponCode: user.coupon_code
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('Usuário excluído com sucesso!');
        // Recarregar a página ou atualizar a lista
        window.location.reload();
      } else {
        alert(`Erro ao excluir usuário: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  // Função para atualizar todas as músicas
  const handleUpdateAllMusic = async () => {
    if (!user) return;

    try {
      setIsUpdatingAll(true);

      // Buscar todas as músicas do usuário que estão em status 'generating'
      const { data: generatingMusic, error: fetchError } = await supabase
        .from('generated_music')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'generating');

      if (fetchError) {
        console.error('Erro ao buscar músicas:', fetchError);
        return;
      }

      if (!generatingMusic || generatingMusic.length === 0) {
        alert(t.noMusicToUpdate || 'Nenhuma música em geração para atualizar');
        return;
      }

      // Atualizar cada música individualmente
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Erro: Usuário não autenticado');
        return;
      }

      const updatePromises = generatingMusic.map(async (music: any) => {
        try {
          const response = await fetch(`/api/check-music-status?musicId=${music.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            const result = await response.json();
            return { success: true, musicId: music.id, data: result };
          } else {
            return { success: false, musicId: music.id, error: 'Erro na requisição' };
          }
        } catch (error) {
          return { success: false, musicId: music.id, error: error };
        }
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      
      alert(`Atualização concluída: ${successCount}/${generatingMusic.length} músicas verificadas`);
      
      // Recarregar a página para mostrar as atualizações
      window.location.reload();

    } catch (error) {
      console.error('Erro ao atualizar músicas:', error);
      alert('Erro ao atualizar músicas');
    } finally {
      setIsUpdatingAll(false);
    }
  };

  // Funções para configurações
  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setSettingsError('Nome não pode estar vazio');
      return;
    }

    try {
      setSettingsLoading(true);
      setSettingsError('');

      const { error } = await (supabase as any)
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('id', user!.id);

      if (error) {
        throw error;
      }

      alert('Nome atualizado com sucesso!');
      // Recarregar dados do perfil
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      setSettingsError('Erro ao atualizar nome: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setSettingsError('Preencha todos os campos de senha');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setSettingsLoading(true);
      setSettingsError('');

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      alert('Senha atualizada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      setSettingsError('Erro ao atualizar senha: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) {
      setSettingsError('Nenhuma assinatura ativa encontrada');
      return;
    }

    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você manterá seus créditos atuais.')) {
      return;
    }

    try {
      setSettingsLoading(true);
      setSettingsError('');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar assinatura');
      }

      alert('Assinatura cancelada com sucesso! Seus créditos foram mantidos.');
      // Recarregar dados da assinatura
      refetchSubscription();
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      setSettingsError('Erro ao cancelar assinatura: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSettingsLoading(false);
    }
  };

  // Carregar dados do usuário quando entrar na seção de configurações
  useEffect(() => {
    if (currentView === 'settings' && profile) {
      setNewName(profile.name || '');
    }
  }, [currentView, profile]);

  if (loading || languageLoading) {
    return (
      <div className="min-h-screen bg-baby-gradient flex items-center justify-center">
        <div className="text-baby-pink-600 text-xl font-semibold">{t.loading}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-baby-gradient flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-baby-pink-100/90 to-baby-blue-100/90 backdrop-blur-md transition-transform duration-300 ease-in-out border-r border-baby-pink-200 flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-baby-pink-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Music className="w-8 h-8 text-baby-pink-500" />
            <span className="text-xl font-bold text-baby-pink-700">RevealSongs</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-baby-pink-600 hover:text-baby-pink-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="p-4 space-y-3 flex-1 overflow-y-auto min-h-0">
          <button 
            onClick={() => {
              setCurrentView('dashboard');
              setSidebarOpen(false); // Fecha o menu mobile
            }}
            className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
              currentView === 'dashboard' 
                ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>{t.dashboard}</span>
          </button>
          
          <button 
            onClick={() => {
              handleCreateSongClick();
              setSidebarOpen(false); // Fecha o menu mobile
            }}
            className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
              currentView === 'create-song' 
                ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>{t.createSong}</span>
          </button>

          {/* Menu para ADMIN - Gerenciar Parceiros */}
          {isAdmin && (
            <button 
              onClick={() => {
                setCurrentView('manage-partners');
                setSidebarOpen(false); // Fecha o menu mobile
              }}
              className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
                currentView === 'manage-partners' 
                  ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                  : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>{language === 'pt' ? 'Gerenciar Parceiros' : t.managePartners}</span>
            </button>
          )}

          {/* Menu para PARCEIRO - Relatórios */}
          {isPartner && (
            <button 
              onClick={() => {
                setCurrentView('partner-reports');
                setSidebarOpen(false); // Fecha o menu mobile
              }}
              className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
                currentView === 'partner-reports' 
                  ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                  : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>{language === 'pt' ? 'Meus Relatórios' : t.myReports}</span>
            </button>
          )}

          {/* Menu para ADMIN - Relatórios */}
          {isAdmin && (
            <button 
              onClick={() => {
                setCurrentView('admin-reports');
                setSidebarOpen(false); // Fecha o menu mobile
              }}
              className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
                currentView === 'admin-reports' 
                  ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                  : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>{language === 'pt' ? 'Relatórios' : t.reports}</span>
            </button>
          )}

          {/* Menu para ADMIN - Comissões */}
          {isAdmin && (
            <button 
              onClick={() => {
                setCurrentView('admin-commissions');
                setSidebarOpen(false); // Fecha o menu mobile
              }}
              className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
                currentView === 'admin-commissions' 
                  ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                  : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>{t.adminCommissions}</span>
            </button>
          )}
          
          <button 
            onClick={() => {
              setCurrentView('settings');
              setSidebarOpen(false); // Fecha o menu mobile
            }}
            className={`flex items-center space-x-3 w-full text-left rounded-lg p-3 transition-colors ${
              currentView === 'settings' 
                ? 'text-baby-pink-700 bg-baby-pink-200/50' 
                : 'text-baby-blue-600 hover:text-baby-blue-800 hover:bg-baby-blue-100/50'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>{t.settings}</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-baby-pink-200 flex-shrink-0">
          {/* Créditos Remanescentes */}
          {subscription && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-baby-pink-100 to-baby-blue-100 rounded-lg p-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-baby-pink-700 font-semibold text-sm">
                  {subscriptionLoading ? '...' : subscription.credits_remaining || 0} {language === 'pt' ? 'créditos' : 'credits'}
                </span>
              </div>
              
              {/* Mostrar botão de comprar créditos apenas para status 'active' ou 'cancelled' */}
              {subscription.status && ['active', 'cancelled'].includes(subscription.status) && (
                <button
                  onClick={() => setShowCreditsModal(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 hover:from-baby-pink-600 hover:to-baby-blue-600 text-white rounded-lg p-2 transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="w-3 h-3" />
                  <span className="text-xs font-medium">
                    {language === 'pt' ? 'Comprar Créditos' : 'Buy Credits'}
                  </span>
                </button>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p 
                className="text-baby-pink-700 font-medium truncate text-xs" 
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 text-baby-pink-600 hover:text-baby-pink-800 hover:bg-baby-pink-100/50 rounded-lg p-2 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">{t.logout}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col h-screen">
        {/* Header */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-baby-pink-200 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-baby-pink-600 hover:text-baby-pink-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-baby-pink-700">
                {currentView === 'dashboard' && t.dashboard}
                {currentView === 'create-song' && t.createSong}
                {currentView === 'partner-reports' && (language === 'pt' ? 'Meus Relatórios' : t.myReports)}
                {currentView === 'admin-reports' && (language === 'pt' ? 'Relatórios' : t.reports)}
                {currentView === 'admin-commissions' && t.adminCommissions}
                {currentView === 'manage-partners' && (language === 'pt' ? 'Gerenciar Parceiros' : t.managePartners)}
                {currentView === 'settings' && t.settings}
              </h1>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {currentView === 'dashboard' ? (
            <>
              {/* Botão Finalizar Pagamento - Aparece apenas se há pagamento pendente */}
              {hasPendingPayment && (
                <div className="mb-6 sm:mb-8 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-red-700 mb-1">
                          {t.paymentPending}
                        </h3>
                        <p className="text-red-600 text-xs sm:text-sm">
                          {t.paymentPendingDescription}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        handleFinalizePayment();
                      }}
                      disabled={paymentLoading}
                      className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>
                        {paymentLoading ? t.processing : t.finalizePayment}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Welcome Message */}
              <div className="card mb-6 sm:mb-8">
                <div className="text-center py-6 sm:py-8">
                  <Music className="w-12 h-12 sm:w-16 sm:h-16 text-baby-pink-400 mx-auto mb-3 sm:mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold text-baby-pink-700 mb-2">{t.welcome}</h2>
                  <p className="text-sm sm:text-base text-baby-pink-600 px-2">{t.welcomeDescription}</p>
                </div>
              </div>

              {/* Botão Atualizar Global */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleUpdateAllMusic}
                  disabled={isUpdatingAll}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    isUpdatingAll 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isUpdatingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t.updating}</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>{t.updateAll || 'Atualizar'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tabela de Músicas */}
              <UserLyricsTable 
                onEditLyric={handleEditLyric} 
                onGenerateMusic={generateMusicFromLyric}
                onDuplicateLyric={handleDuplicateLyric}
                language={language} 
              />
            </>
          ) : currentView === 'create-song' ? (
            <CreateSongComponent 
              language={language} 
              editingLyricData={isEditingLyric ? editingLyricData : null}
              subscriptionData={subscription}
              creditsRemaining={creditsRemaining}
              onShowCreditsModal={() => setShowCreditsModal(true)}
              onBack={() => {
                setCurrentView('dashboard');
                setIsEditingLyric(false);
                setEditingLyricData(null);
              }}
            />
          ) : currentView === 'partner-reports' ? (
            <PartnerReports />
          ) : currentView === 'admin-reports' ? (
            <AdminReports />
          ) : currentView === 'admin-commissions' ? (
            <AdminCommissions />
          ) : currentView === 'manage-partners' ? (
            <PartnersTable 
              language={language}
              onCreatePartner={() => {
                setEditingUser(null);
                setShowCreatePartnerModal(true);
              }}
              onEditUser={(user) => {
                setEditingUser(user);
                setShowCreatePartnerModal(true);
              }}
              onDeleteUser={handleDeleteUser}
              refreshTrigger={refreshPartnersTable}
            />
          ) : currentView === 'settings' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Erro */}
              {settingsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{settingsError}</p>
                </div>
              )}

              {/* Informações do Perfil */}
              <div className="card">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-baby-pink-700">{language === 'pt' ? 'Perfil do Usuário' : t.userProfile}</h2>
                    <p className="text-baby-pink-600">{user?.email}</p>
                  </div>
                </div>

                {/* Alterar Nome */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-baby-pink-700 mb-3">{language === 'pt' ? 'Alterar Nome' : t.changeName}</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={language === 'pt' ? 'Novo nome' : 'New name'}
                      className="flex-1 px-4 py-2 border border-baby-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-pink-500"
                      disabled={settingsLoading}
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={settingsLoading || !newName.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {settingsLoading ? (language === 'pt' ? 'Salvando...' : t.saving) : (language === 'pt' ? 'Salvar Nome' : t.saveName)}
                    </button>
                  </div>
                </div>

                {/* Alterar Senha */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-baby-pink-700 mb-3">{language === 'pt' ? 'Alterar Senha' : t.changePassword}</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={language === 'pt' ? 'Nova senha (mínimo 6 caracteres)' : t.newPassword}
                      className="w-full px-4 py-2 border border-baby-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-pink-500"
                      disabled={settingsLoading}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={language === 'pt' ? 'Confirmar nova senha' : t.confirmPassword}
                      className="w-full px-4 py-2 border border-baby-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-baby-pink-500"
                      disabled={settingsLoading}
                    />
                    <button
                      onClick={handleUpdatePassword}
                      disabled={settingsLoading || !newPassword || !confirmPassword}
                      className="px-6 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {settingsLoading ? (language === 'pt' ? 'Atualizando...' : t.updating) : (language === 'pt' ? 'Atualizar Senha' : t.updatePassword)}
                    </button>
                  </div>
                </div>
              </div>

              {/* Informações da Assinatura */}
              {subscription && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-baby-pink-700 mb-4">{language === 'pt' ? 'Assinatura' : t.subscription}</h3>
                  <div className="bg-baby-pink-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-baby-pink-600">{language === 'pt' ? 'Status' : t.status}</p>
                        <p className="font-semibold text-baby-pink-700 capitalize">{subscription.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-baby-pink-600">{language === 'pt' ? 'Créditos Restantes' : t.remainingCredits}</p>
                        <p className="font-semibold text-baby-pink-700">{subscription.credits_remaining}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm text-baby-pink-600">{language === 'pt' ? 'Plano' : t.plan}</p>
                        <p className="font-semibold text-baby-pink-700">
                          {subscription.plan_id === '2_songs_brl' ? '2 Músicas' :
                           subscription.plan_id === '5_songs_brl' ? '5 Músicas' :
                           subscription.plan_id === '10_songs_brl' ? '10 Músicas' :
                           subscription.plan_id === '20_songs_brl' ? '20 Músicas' :
                           subscription.plan_id === '2_songs_usd' ? '2 Songs' :
                           subscription.plan_id === '5_songs_usd' ? '5 Songs' :
                           subscription.plan_id === '10_songs_usd' ? '10 Songs' :
                           subscription.plan_id === '20_songs_usd' ? '20 Songs' :
                           subscription.plan_id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {subscription.status === 'active' && subscription.stripe_subscription_id && (
                    <div className="space-y-3">
                      {/* Informação sobre não perder créditos */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-blue-700 font-medium">{language === 'pt' ? 'Importante:' : t.important}</p>
                            <p className="text-sm text-blue-600">
                              {language === 'pt' ? (
                                <>
                                  Ao cancelar sua assinatura, você <strong>não perderá os créditos vigentes</strong>. 
                                  Poderá continuar usando seus créditos restantes normalmente até que se esgotem.
                                </>
                              ) : (
                                t.cancelSubscriptionInfo
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleCancelSubscription}
                        disabled={settingsLoading}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {settingsLoading ? (language === 'pt' ? 'Cancelando...' : t.cancelling) : (language === 'pt' ? 'Cancelar Assinatura' : t.cancelSubscription)}
                      </button>
                    </div>
                  )}

                  {/* Botão Assinar para status pending ou cancelled */}
                  {(subscription.status === 'pending' || subscription.status === 'cancelled') && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowPlanModal(true)}
                        className="px-6 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-blue-600 transition-all font-semibold"
                      >
                        {language === 'pt' ? 'Assinar' : 'Subscribe'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Botão Assinar quando não há assinatura */}
              {!subscription && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-baby-pink-700 mb-4">{language === 'pt' ? 'Assinatura' : 'Subscription'}</h3>
                  <div className="bg-baby-pink-50 rounded-lg p-4 mb-4">
                    <p className="text-baby-pink-600 mb-4">
                      {language === 'pt' 
                        ? 'Você ainda não possui uma assinatura ativa. Assine um plano para começar a criar suas músicas!'
                        : 'You don\'t have an active subscription yet. Subscribe to a plan to start creating your songs!'
                      }
                    </p>
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="px-6 py-2 bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white rounded-lg hover:from-baby-pink-600 hover:to-baby-blue-600 transition-all font-semibold"
                    >
                      {language === 'pt' ? 'Assinar' : 'Subscribe'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onSelectPlan={handlePlanSelection}
        currency={currency}
        country={language === 'pt' ? 'BR' : 'US'}
      />
      
      {/* Add Credits Modal */}
      <AddCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onSelectPack={handleCreditPackSelection}
        currency={currency}
        country={language === 'pt' ? 'BR' : 'US'}
      />

      {/* Create Partner Modal */}
      <CreatePartnerModal
        isOpen={showCreatePartnerModal}
        onClose={() => {
          setShowCreatePartnerModal(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
        onUserUpdated={() => {
          // Refresh the partners table if needed
          setShowCreatePartnerModal(false);
          setEditingUser(null);
          setRefreshPartnersTable(prev => prev + 1); // Incrementar para forçar refresh
        }}
      />
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};