module.exports = {
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en', 'es'],
    localeDetection: true,
  },
  fallbackLng: {
    default: ['pt'],
  },
  debug: process.env.NODE_ENV === 'development',
}