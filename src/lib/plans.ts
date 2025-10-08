export interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
  popular?: boolean;
  features?: string[];
}

export const PLANS_BR: Plan[] = [
  {
    id: '2_songs_brl',
    name: '2 Músicas',
    credits: 2,
    price: 29.99,
    currency: 'BRL',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_BR || '',
    features: ['2 músicas personalizadas', 'Qualidade HD', 'Download ilimitado'],
  },
  {
    id: '5_songs_brl',
    name: '5 Músicas',
    credits: 5,
    price: 59.99,
    currency: 'BRL',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BR || '',
    popular: true,
    features: ['5 músicas personalizadas', 'Qualidade HD', 'Download ilimitado', 'Suporte prioritário'],
  },
  {
    id: '8_songs_brl',
    name: '8 Músicas',
    credits: 8,
    price: 79.99,
    currency: 'BRL',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_BR || '',
    features: ['8 músicas personalizadas', 'Qualidade HD', 'Download ilimitado', 'Suporte prioritário', 'Acesso antecipado'],
  },
];

export const PLANS_US: Plan[] = [
  {
    id: '2_songs_usd',
    name: '2 Songs',
    credits: 2,
    price: 19.99,
    currency: 'USD',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER_US || '',
    features: ['2 custom songs', 'HD quality', 'Unlimited downloads'],
  },
  {
    id: '5_songs_usd',
    name: '5 Songs',
    credits: 5,
    price: 39.99,
    currency: 'USD',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_US || '',
    popular: true,
    features: ['5 custom songs', 'HD quality', 'Unlimited downloads', 'Priority support'],
  },
  {
    id: '8_songs_usd',
    name: '8 Songs',
    credits: 8,
    price: 69.99,
    currency: 'USD',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_US || '',
    features: ['8 custom songs', 'HD quality', 'Unlimited downloads', 'Priority support', 'Early access'],
  },
];

export function getPlansForRegion(region: 'BR' | 'US' | 'BRL' | 'USD'): Plan[] {
  // Aceita tanto código do país quanto moeda
  const isBrazil = region === 'BR' || region === 'BRL';
  return isBrazil ? PLANS_BR : PLANS_US;
}

export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

export function getPlanById(planId: string): Plan | undefined {
  const allPlans = [...PLANS_BR, ...PLANS_US];
  return allPlans.find(plan => plan.id === planId);
}