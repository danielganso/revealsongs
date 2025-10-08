import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';

interface LoginModalProps {
  onClose: () => void;
  regionInfo: {
    country: string;
    currency: string;
    locale: string;
  };
}

export default function LoginModal({ onClose, regionInfo }: LoginModalProps) {
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError(regionInfo.country === 'BR' ? 'Por favor, preencha todos os campos' : 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmail(formData.email, formData.password);
      // Redirecionamento será feito automaticamente pelo useAuth
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
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
              {isPortuguese ? 'Entrar' : 'Sign In'}
            </h2>
            <p className="text-gray-600">
              {isPortuguese ? 'Acesse sua conta para criar músicas incríveis!' : 'Access your account to create amazing songs!'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl mb-6 text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-baby-pink-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={isPortuguese ? 'Seu email' : 'Your email'}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-baby-pink-300 focus:outline-none transition-colors text-gray-700 placeholder-gray-400"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-baby-pink-400" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={isPortuguese ? 'Sua senha' : 'Your password'}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-baby-pink-300 focus:outline-none transition-colors text-gray-700 placeholder-gray-400"
                required
              />
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
                  <span>{isPortuguese ? 'Entrando...' : 'Signing in...'}</span>
                </div>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>{isPortuguese ? 'Entrar' : 'Sign In'}</span>
                  <span className="text-xl">🚀</span>
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              {isPortuguese ? 'Não tem uma conta?' : "Don't have an account?"}{' '}
              <button
                onClick={onClose}
                className="text-baby-pink-500 hover:text-baby-pink-600 font-semibold underline"
              >
                {isPortuguese ? 'Criar conta' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}