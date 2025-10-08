/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config')

const nextConfig = {
  i18n: {
    ...i18n,
    localeDetection: false, // Desabilitando para usar nosso middleware customizado
  },
  images: {
    domains: ['supabase.co'],
  },
}

module.exports = nextConfig