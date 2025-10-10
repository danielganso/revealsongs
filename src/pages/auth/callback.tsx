import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function AuthCallback() {
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          // Error handling for auth callback
          router.push('/?error=auth_error');
          return;
        }

        if (data.session) {
          // Redirect to dashboard on successful authentication
          router.push('/dashboard');
        } else {
          // No session found, redirect to home
          router.push('/');
        }
      } catch (error) {
        // Error handling for auth callback
        router.push('/?error=auth_error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-baby-pink-50 to-baby-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baby-pink-500 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('authenticating')}</p>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'pt', ['common'])),
    },
  };
};