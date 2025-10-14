import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPortuguese, setIsPortuguese] = useState(true);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);

  useEffect(() => {
    // Detectar idioma baseado na URL ou localStorage
    const locale = localStorage.getItem('locale') || 'pt';
    setIsPortuguese(locale === 'pt');

    const verifySession = async () => {
      console.log('🔍 Iniciando verificação de sessão...');
      console.log('🌐 URL completa:', window.location.href);
      console.log('🔗 Search params:', window.location.search);
      console.log('🏷️ Hash:', window.location.hash);
      
      // Aguardar mais tempo para o Supabase processar a URL automaticamente
      console.log('⏳ Aguardando processamento automático do Supabase (3 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar se o Supabase detectou automaticamente a sessão
      const { data: { session: autoSession } } = await supabase.auth.getSession();
      console.log('🎯 Sessão detectada automaticamente:', autoSession);
      
      if (autoSession) {
        console.log('✅ Sessão detectada automaticamente pelo Supabase');
        setSessionValid(true);
        setLoading(false);
        return;
      }

      // Tentar diferentes formatos de captura de tokens
      const urlParams = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.substring(1));
      
      // Verificar tanto query params quanto fragment
      let accessToken = urlParams.get('access_token') || fragment.get('access_token');
      let refreshToken = urlParams.get('refresh_token') || fragment.get('refresh_token');
      let type = urlParams.get('type') || fragment.get('type');
      const error = urlParams.get('error') || fragment.get('error');
      const errorDescription = urlParams.get('error_description') || fragment.get('error_description');
      
      // Tentar também formatos alternativos que o Supabase pode usar
      if (!accessToken) {
        accessToken = urlParams.get('token') || fragment.get('token');
      }
      
      // Verificar se há um token de confirmação (usado em alguns casos)
      const confirmationToken = urlParams.get('token_hash') || fragment.get('token_hash');
      
      console.log('🔗 Parâmetros da URL (detalhado):', {
        accessToken: accessToken ? `presente (${accessToken.substring(0, 20)}...)` : 'ausente',
        refreshToken: refreshToken ? `presente (${refreshToken.substring(0, 20)}...)` : 'ausente',
        confirmationToken: confirmationToken ? `presente (${confirmationToken.substring(0, 20)}...)` : 'ausente',
        type,
        error,
        errorDescription,
        fullUrl: window.location.href,
        search: window.location.search,
        hash: window.location.hash,
        allSearchParams: Object.fromEntries(urlParams.entries()),
        allHashParams: Object.fromEntries(fragment.entries()),
        // Debug adicional
        hasSearchParams: window.location.search.length > 0,
        hasHash: window.location.hash.length > 0,
        searchLength: window.location.search.length,
        hashLength: window.location.hash.length
      });

      // Se há erro na URL, tratar especificamente
      if (error) {
        console.error('❌ Erro na URL:', error, errorDescription);
        
        // Tratar especificamente links expirados
        if (error === 'access_denied' && errorDescription?.includes('expired')) {
          console.log('🕐 Link de reset expirado detectado');
          setError(isPortuguese 
            ? 'O link de redefinição de senha expirou. Por favor, solicite um novo link.'
            : 'The password reset link has expired. Please request a new link.'
          );
        } else {
          setError(isPortuguese 
            ? `Erro no link de recuperação: ${errorDescription || error}`
            : `Recovery link error: ${errorDescription || error}`
          );
        }
        
        setSessionValid(false);
        setLoading(false);
        return;
      }

      // Tentar diferentes abordagens baseadas nos parâmetros disponíveis
      if (confirmationToken) {
        console.log('🔄 Tentando verificar com token de confirmação...');
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: confirmationToken,
            type: 'recovery'
          });
          
          console.log('📝 Resultado da verificação OTP:', { data, error });
          
          if (error) {
            console.error('❌ Erro ao verificar OTP:', error);
            setSessionValid(false);
          } else if (data.session) {
            console.log('✅ Sessão criada via OTP');
            setSessionValid(true);
          } else {
            console.log('⚠️ Verificação OTP não criou sessão');
            setSessionValid(false);
          }
        } catch (err) {
          console.error('💥 Erro inesperado ao verificar OTP:', err);
          setSessionValid(false);
        }
      } else if (type === 'recovery' && accessToken && refreshToken) {
        console.log('🔄 Tentando definir sessão com tokens...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          console.log('📝 Resultado da definição de sessão:', { data, error });
          
          if (error) {
            console.error('❌ Erro ao definir sessão:', error);
            setSessionValid(false);
          } else if (data.session) {
            console.log('✅ Sessão definida com sucesso');
            setSessionValid(true);
          } else {
            console.log('⚠️ Sessão não foi criada');
            setSessionValid(false);
          }
        } catch (err) {
          console.error('💥 Erro inesperado ao definir sessão:', err);
          setSessionValid(false);
        }
      } else if (accessToken && !refreshToken) {
        console.log('🔄 Tentando com apenas access token (formato alternativo)...');
        try {
          // Algumas implementações do Supabase podem usar apenas access token
          const { data, error } = await supabase.auth.getUser(accessToken);
          
          console.log('📝 Resultado da verificação de usuário:', { data, error });
          
          if (error) {
            console.error('❌ Erro ao verificar usuário:', error);
            setSessionValid(false);
          } else if (data.user) {
            console.log('✅ Usuário verificado com access token');
            setSessionValid(true);
          } else {
            console.log('⚠️ Usuário não encontrado');
            setSessionValid(false);
          }
        } catch (err) {
          console.error('💥 Erro inesperado ao verificar usuário:', err);
          setSessionValid(false);
        }
      } else {
        console.log('❌ Parâmetros necessários não encontrados ou tipo incorreto');
        console.log('💡 Possíveis causas:');
        console.log('   - Link do email expirado');
        console.log('   - Configuração incorreta do Supabase');
        console.log('   - URL de redirecionamento incorreta');
        console.log('   - Formato de link diferente do esperado');
        
        // Última tentativa: verificar se há alguma sessão ativa após aguardar
        console.log('🔄 Última tentativa: verificando sessão após aguardar...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          console.log('✅ Sessão encontrada na última tentativa');
          setSessionValid(true);
        } else {
          console.log('❌ Nenhuma sessão encontrada');
          setSessionValid(false);
        }
      }
      
      setLoading(false);
    };

    verifySession();

    // Adicionar listener para mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session);
        
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          console.log('✅ Sessão de recuperação detectada via listener');
          setSessionValid(true);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token atualizado, verificando se é sessão de recovery');
          setSessionValid(true);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError(isPortuguese ? 'Por favor, preencha todos os campos' : 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError(isPortuguese ? 'As senhas não coincidem' : 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(isPortuguese ? 'A senha deve ter pelo menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error: any) {
      setError(isPortuguese ? 'Erro ao redefinir senha' : 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    setError('');
    
    try {
      // Tentar obter o email do localStorage ou solicitar ao usuário
      const savedEmail = localStorage.getItem('resetEmail');
      let email = savedEmail;
      
      if (!email) {
        email = prompt(isPortuguese 
          ? 'Digite seu email para reenviar o link de recuperação:'
          : 'Enter your email to resend the recovery link:'
        );
      }
      
      if (!email) {
        setError(isPortuguese ? 'Email é obrigatório' : 'Email is required');
        return;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        setError(error.message);
      } else {
        setEmailResent(true);
        localStorage.setItem('resetEmail', email);
        setTimeout(() => setEmailResent(false), 5000);
      }
    } catch (error: any) {
      setError(isPortuguese 
        ? 'Erro ao reenviar email' 
        : 'Error resending email'
      );
    } finally {
      setResendingEmail(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 via-baby-blue-50 to-soft-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isPortuguese ? 'Senha Redefinida!' : 'Password Reset!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isPortuguese 
              ? 'Sua senha foi redefinida com sucesso. Você será redirecionado em alguns segundos...'
              : 'Your password has been reset successfully. You will be redirected in a few seconds...'
            }
          </p>
          <div className="w-8 h-8 border-4 border-baby-pink-200 border-t-baby-pink-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Mostrar loading enquanto verifica a sessão
  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 via-baby-blue-50 to-soft-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-8 h-8 border-4 border-baby-pink-200 border-t-baby-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isPortuguese ? 'Verificando sessão...' : 'Verifying session...'}
          </p>
        </div>
      </div>
    );
  }

  // Mostrar erro se a sessão não for válida
  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 via-baby-blue-50 to-soft-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isPortuguese ? 'Link Inválido ou Expirado' : 'Invalid or Expired Link'}
          </h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {emailResent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-700 text-sm">
                {isPortuguese 
                  ? 'Email de recuperação reenviado com sucesso!'
                  : 'Recovery email resent successfully!'
                }
              </p>
            </div>
          )}
          
          <p className="text-gray-600 mb-6">
            {isPortuguese 
              ? 'O link de redefinição de senha expirou ou é inválido. Você pode solicitar um novo link ou voltar à página inicial.'
              : 'The password reset link has expired or is invalid. You can request a new link or return to the home page.'
            }
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              className="w-full bg-baby-pink-500 hover:bg-baby-pink-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center"
            >
              {resendingEmail ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isPortuguese ? 'Reenviando...' : 'Resending...'}
                </>
              ) : (
                isPortuguese ? 'Reenviar Email de Recuperação' : 'Resend Recovery Email'
              )}
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
            >
              {isPortuguese ? 'Voltar ao Início' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 via-baby-blue-50 to-soft-purple-50 flex items-center justify-center p-4">
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

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-slow">🔐</div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              {isPortuguese ? 'Nova Senha' : 'New Password'}
            </h2>
            <p className="text-gray-600">
              {isPortuguese 
                ? 'Digite sua nova senha para continuar'
                : 'Enter your new password to continue'
              }
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl mb-6 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-baby-pink-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isPortuguese ? 'Nova senha' : 'New password'}
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:border-baby-pink-300 focus:outline-none transition-colors text-gray-700 placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-baby-pink-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isPortuguese ? 'Confirmar nova senha' : 'Confirm new password'}
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-2xl focus:border-baby-pink-300 focus:outline-none transition-colors text-gray-700 placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 text-white font-bold py-4 px-6 rounded-2xl hover:from-baby-pink-500 hover:to-baby-blue-500 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isPortuguese ? 'Redefinindo...' : 'Resetting...'}</span>
                </div>
              ) : (
                <span>{isPortuguese ? 'Redefinir Senha' : 'Reset Password'}</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-baby-pink-500 hover:text-baby-pink-600 font-semibold underline"
            >
              {isPortuguese ? 'Voltar ao início' : 'Back to home'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}