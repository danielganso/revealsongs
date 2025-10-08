import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { CheckCircle, ArrowRight, Music } from 'lucide-react';

interface SuccessPageProps {
  sessionId?: string;
}

export default function Success({ sessionId }: SuccessPageProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-pink-50 to-baby-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('paymentSuccess')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('paymentSuccessDescription')}
          </p>

          {/* Session Info */}
          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">{t('transactionId')}</p>
              <p className="text-xs font-mono text-gray-700 break-all">
                {sessionId}
              </p>
            </div>
          )}

          {/* Credits Info */}
          <div className="bg-gradient-to-r from-baby-pink-50 to-baby-blue-50 rounded-lg p-6 mb-8">
            <Music className="w-8 h-8 text-baby-pink-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 mb-2">
              {t('creditsAdded')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('creditsAddedDescription')}
            </p>
          </div>

          {/* Auto Redirect Info */}
          <div className="text-sm text-gray-500 mb-6">
            {t('redirectingIn')} {countdown} {t('seconds')}...
          </div>

          {/* Manual Navigation */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <span>{t('goToDashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => router.push('/create-song')}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <Music className="w-4 h-4" />
              <span>{t('createFirstSong')}</span>
            </button>
          </div>

          {/* Support Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {t('needHelp')}{' '}
              <a href="mailto:support@revealsongs.com" className="text-baby-pink-500 hover:underline">
                {t('contactSupport')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query, locale }) => {
  const sessionId = query.session_id as string;

  return {
    props: {
      sessionId: sessionId || null,
      ...(await serverSideTranslations(locale ?? 'pt', ['common'])),
    },
  };
};