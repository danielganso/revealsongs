import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/router';

interface AuthButtonProps {
  regionInfo?: {
    country: string;
    currency: string;
    locale: string;
  };
  onSignUpClick?: () => void;
  className?: string;
}

export default function AuthButton({ regionInfo, onSignUpClick, className }: AuthButtonProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-24 rounded-md"></div>
    );
  }

  if (user) {
    return (
      <button
        onClick={() => router.push('/dashboard')}
        className={className || "bg-gradient-to-r from-baby-pink-500 to-baby-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition-all"}
      >
        {regionInfo?.country === 'BR' ? 'Ir para Dashboard' : 'Go to Dashboard'}
      </button>
    );
  }

  return (
    <button
      onClick={onSignUpClick}
      className={className || "btn-primary px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"}
    >
      {regionInfo?.country === 'BR' ? 'Cadastrar' : 'Sign Up'}
    </button>
  );
}