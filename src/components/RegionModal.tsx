import { useState } from 'react';
import { X, Globe, Heart } from 'lucide-react';

interface RegionModalProps {
  onClose: () => void;
  onRegionSelect: (region: { country: string; locale: string; currency: string }) => void;
}

export default function RegionModal({ onClose, onRegionSelect }: RegionModalProps) {
  const [selectedCountry, setSelectedCountry] = useState('');

  const countries = [
    { code: 'BR', name: 'Brasil', flag: '🇧🇷', locale: 'pt-BR', currency: 'BRL' },
    { code: 'US', name: 'United States', flag: '🇺🇸', locale: 'en-US', currency: 'USD' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', locale: 'en-CA', currency: 'USD' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', locale: 'en-GB', currency: 'USD' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', locale: 'en-AU', currency: 'USD' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', locale: 'en-DE', currency: 'USD' },
    { code: 'FR', name: 'France', flag: '🇫🇷', locale: 'en-FR', currency: 'USD' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', locale: 'en-ES', currency: 'USD' },
  ];

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country.code);
    onRegionSelect({
      country: country.code,
      locale: country.locale,
      currency: country.currency
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-4 right-4 text-4xl animate-wiggle">🌍</div>
          <div className="absolute top-8 left-4 text-2xl animate-bounce-slow">✨</div>
          <div className="absolute bottom-4 left-8 text-3xl animate-pulse-slow">💫</div>
          <div className="absolute bottom-8 right-8 text-2xl animate-wiggle">🎵</div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-gradient-to-r from-baby-pink-400 to-baby-blue-400 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce-slow">🌟</div>
            <h2 className="text-3xl font-bold gradient-text mb-2">
              Choose Your Region
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Select your country to get the best experience
            </p>
            <div className="flex justify-center mt-3 space-x-1">
              <Heart className="w-4 h-4 text-baby-pink-400 animate-pulse-slow" />
              <Heart className="w-4 h-4 text-baby-blue-400 animate-pulse-slow" style={{animationDelay: '0.5s'}} />
              <Heart className="w-4 h-4 text-soft-purple-400 animate-pulse-slow" style={{animationDelay: '1s'}} />
            </div>
          </div>

          {/* Countries grid */}
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {countries.map((country, index) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 animate-float ${
                  selectedCountry === country.code
                    ? 'border-baby-pink-300 bg-gradient-to-r from-baby-pink-50 to-baby-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white/80 hover:border-baby-blue-300 hover:bg-baby-blue-50'
                }`}
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="text-3xl mb-2 animate-wiggle" style={{animationDelay: `${index * 0.2}s`}}>
                  {country.flag}
                </div>
                <div className="text-sm font-semibold text-gray-800 leading-tight">
                  {country.name}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
              <Globe className="w-4 h-4" />
              <span>We support multiple regions</span>
              <div className="text-lg animate-wiggle">🎶</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}