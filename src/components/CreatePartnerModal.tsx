import * as React from 'react';
const { useState, useEffect } = React;
import { useTranslation } from 'next-i18next';
import { X, User, Mail, Lock, Tag, CreditCard, Users, Percent } from 'lucide-react';
import { PLANS_BR, PLANS_US, Plan } from '../lib/plans';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PARCEIRO' | 'USER';
  coupon_code?: string;
  commission_percentage?: number;
  created_at: string;
  subscription?: {
    id: string;
    plan_id: string;
    status: string;
    credits_remaining: number;
    songs_quantity: number;
    price_cents: number;
    currency: string;
    current_period_end: string;
    coupon_code?: string;
    paid_amount_cents: number;
    created_at: string;
  } | null;
}

interface CreatePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: User | null;
  onUserUpdated?: () => void;
}

export interface PartnerFormData {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'PARCEIRO' | 'USER';
  couponCode: string;
  discountPercent: number;
  commission: number;
  planId: string;
  creditsQuantity: number;
  subscriptionStatus: string;
  region: 'BR' | 'US';
}

export default function CreatePartnerModal({ isOpen, onClose, editingUser, onUserUpdated }: CreatePartnerModalProps) {
  const { t } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>({
    name: '',
    email: '',
    password: '',
    role: 'PARCEIRO',
    couponCode: '',
    discountPercent: 10,
    commission: 10,
    planId: '',
    creditsQuantity: 0,
    subscriptionStatus: 'active',
    region: 'BR'
  });

  const allPlans = [...PLANS_BR, ...PLANS_US];
  const currentPlans = formData.region === 'BR' ? PLANS_BR : PLANS_US;
  const isEditing = !!editingUser;

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: '', // Não preencher senha por segurança
        role: editingUser.role, // Manter a role original, incluindo ADMIN
        couponCode: editingUser.coupon_code || '',
        discountPercent: 10,
        commission: 10, // Valor padrão
        planId: editingUser.subscription?.plan_id || '',
        creditsQuantity: editingUser.subscription?.credits_remaining || 0,
        subscriptionStatus: editingUser.subscription?.status || 'active',
        region: editingUser.subscription?.currency === 'USD' ? 'US' : 'BR'
      });
    } else {
      // Resetar formulário para criação
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'PARCEIRO',
        couponCode: '',
        discountPercent: 10,
        commission: 10,
        planId: '',
        creditsQuantity: 0,
        subscriptionStatus: 'active',
        region: 'BR'
      });
    }
  }, [editingUser, isOpen]);

  const handleInputChange = (field: keyof PartnerFormData, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Se mudou o plano, atualizar a quantidade de créditos automaticamente
      if (field === 'planId') {
        const selectedPlan = allPlans.find(plan => plan.id === value);
        if (selectedPlan) {
          updated.creditsQuantity = selectedPlan.credits;
        }
      }
      
      // Se mudou a região, resetar o plano
      if (field === 'region') {
        updated.planId = '';
        updated.creditsQuantity = 0;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios - cupom só é obrigatório na criação
    if (!formData.name || !formData.email || (!isEditing && !formData.couponCode)) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar senha apenas para criação
    if (!isEditing && !formData.password) {
      alert('Por favor, informe uma senha.');
      return;
    }

    if (!isEditing && (!formData.planId || !formData.discountPercent)) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.discountPercent < 1 || formData.discountPercent > 100) {
      alert('A porcentagem de desconto deve estar entre 1% e 100%.');
      return;
    }

    setIsLoading(true);
    try {
      // Obter token do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Erro: Usuário não autenticado');
        return;
      }

      if (isEditing) {
        // Atualizar usuário existente
        const response = await fetch('/api/update-user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: editingUser!.user_id,
            profileId: editingUser!.id,
            subscriptionId: editingUser!.subscription?.id,
            ...formData
          })
        });

        const result = await response.json();

        if (response.ok) {
          alert('Usuário atualizado com sucesso!');
          onClose();
          if (onUserUpdated) {
            onUserUpdated();
          }
        } else {
          alert(`Erro ao atualizar usuário: ${result.error}`);
        }
      } else {
        // Criar novo parceiro
        const response = await fetch('/api/create-partner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
          alert('Parceiro criado com sucesso!');
          onClose();
          if (onUserUpdated) {
            onUserUpdated();
          }
          // Resetar formulário
          setFormData({
            name: '',
            email: '',
            password: '',
            role: 'PARCEIRO',
            couponCode: '',
            discountPercent: 10,
            commission: 10,
            planId: '',
            creditsQuantity: 0,
            subscriptionStatus: 'active',
            region: 'BR'
          });
        } else {
          alert(`Erro ao criar parceiro: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Erro ao processar usuário:', error);
      alert('Erro inesperado ao processar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar Usuário' : 'Criar Novo Parceiro'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome completo do parceiro"
              required
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o email do parceiro"
              required
              disabled={isLoading}
            />
          </div>

          {/* Senha */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Senha *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite uma senha segura"
                required
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Tipo de Usuário *
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              <option value="USER">Usuário</option>
              <option value="PARCEIRO">Parceiro</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Usuários têm acesso básico, Parceiros podem ter cupons e relatórios, Administradores têm acesso total
            </p>
          </div>

          {/* Cupom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-2" />
              Código do Cupom {!isEditing && '*'}
            </label>
            <input
              type="text"
              value={formData.couponCode}
              onChange={(e) => handleInputChange('couponCode', e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: PARCEIRO20"
              required={!isEditing}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Este será o cupom exclusivo do parceiro para rastrear vendas
            </p>
          </div>

          {/* Porcentagem de Desconto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Percent className="w-4 h-4 inline mr-2" />
              Porcentagem de Desconto *
            </label>
            <input
              type="number"
              value={formData.discountPercent}
              onChange={(e) => handleInputChange('discountPercent', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 20"
              required
              disabled={isLoading}
              min="1"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Porcentagem de desconto que será aplicada no cupom (1% a 100%)
            </p>
          </div>

          {/* Porcentagem de Comissão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Percent className="w-4 h-4 inline mr-2" />
              Porcentagem de Comissão *
            </label>
            <input
              type="number"
              value={formData.commission}
              onChange={(e) => handleInputChange('commission', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 10"
              required
              disabled={isLoading}
              min="1"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Porcentagem de comissão que o parceiro receberá sobre as vendas (1% a 100%)
            </p>
          </div>

          {/* Região */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Região *
            </label>
            <select
              value={formData.region}
              onChange={(e) => handleInputChange('region', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              <option value="BR">Brasil (BRL)</option>
              <option value="US">Estados Unidos (USD)</option>
            </select>
          </div>

          {/* Plano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 inline mr-2" />
              Plano Inicial *
            </label>
            <select
              value={formData.planId}
              onChange={(e) => handleInputChange('planId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            >
              <option value="">Selecione um plano</option>
              {currentPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.credits} créditos - {plan.currency} {plan.price}
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade de Créditos (editável) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Créditos {isEditing ? '(Editável)' : 'Iniciais'}
            </label>
            <input
              type="number"
              value={formData.creditsQuantity}
              onChange={(e) => handleInputChange('creditsQuantity', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isEditing ? 'Edite a quantidade de créditos do usuário' : 'Quantidade automática baseada no plano selecionado'}
            </p>
          </div>

          {/* Status da Subscription */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status da Assinatura
            </label>
            <select
              value={formData.subscriptionStatus}
              onChange={(e) => handleInputChange('subscriptionStatus', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="active">Ativo</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
              <option value="expired">Expirado</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {isEditing ? 'Status atual da assinatura do usuário' : 'Status inicial da assinatura do novo usuário'}
            </p>
          </div>

          {/* Resumo */}
          {formData.planId && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Resumo:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Parceiro: {formData.name || 'Nome não informado'}</li>
                <li>• Email: {formData.email || 'Email não informado'}</li>
                <li>• Cupom: {formData.couponCode || 'Cupom não informado'}</li>
                <li>• Plano: {currentPlans.find(p => p.id === formData.planId)?.name}</li>
                <li>• Créditos iniciais: {formData.creditsQuantity}</li>
                <li>• Região: {formData.region === 'BR' ? 'Brasil' : 'Estados Unidos'}</li>
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (isEditing ? 'Atualizando...' : 'Criando...') : (isEditing ? 'Atualizar Usuário' : 'Criar Parceiro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}