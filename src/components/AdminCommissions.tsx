import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, Users, Check, Clock, Filter, Search } from 'lucide-react';
import { translations, Language } from '../lib/translations';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { useAuth } from '../hooks/useAuth';

interface CommissionData {
  id: string;
  profile_id: string;
  partner_name: string;
  coupon_code: string;
  commission_amount: number;
  sales_count: number;
  request_date: string;
  admin_payment_date?: string;
  status: 'pending' | 'paid';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CommissionsSummary {
  totalPending: number;
  totalPaid: number;
  pendingAmount: number;
  paidAmount: number;
  currency: string;
}

export default function AdminCommissions() {
  const { user } = useAuth();
  const { language } = useUserLanguage(user?.id);
  const t = translations[language];
  
  const [commissions, setCommissions] = useState<CommissionData[]>([]);
  const [summary, setSummary] = useState<CommissionsSummary>({
    totalPending: 0,
    totalPaid: 0,
    pendingAmount: 0,
    paidAmount: 0,
    currency: 'BRL'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    loadCommissions();
  }, [statusFilter, searchTerm]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar comissões via API
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/commissions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar comissões');
      }

      const { commissions: commissionsData } = await response.json();
      setCommissions(commissionsData || []);

      // Calcular resumo
      const pending = commissionsData?.filter((c: CommissionData) => c.status === 'pending') || [];
      const paid = commissionsData?.filter((c: CommissionData) => c.status === 'paid') || [];

      setSummary({
        totalPending: pending.length,
        totalPaid: paid.length,
        pendingAmount: pending.reduce((sum: number, c: CommissionData) => sum + c.commission_amount, 0),
        paidAmount: paid.reduce((sum: number, c: CommissionData) => sum + c.commission_amount, 0),
        currency: 'BRL'
      });

    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      setError((error as Error).message || 'Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (commissionId: string) => {
    try {
      setProcessingPayment(commissionId);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch('/api/admin/commissions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          commissionId,
          action: 'mark_as_paid'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao marcar comissão como paga');
      }

      // Recarregar as comissões
      await loadCommissions();
      
    } catch (error) {
      console.error('Erro ao marcar comissão como paga:', error);
      setError((error as Error).message || 'Erro ao processar pagamento');
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadCommissions}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {t.tryAgain}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{t.adminCommissions}</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Search className="w-4 h-4 inline mr-1" />
              {t.search}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por parceiro ou cupom..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.commissionPending}</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{summary.totalPending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Check className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.commissionPaid}</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{summary.totalPaid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-red-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.pendingAmount}</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {formatCurrency(summary.pendingAmount, summary.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.paidAmount}</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {formatCurrency(summary.paidAmount, summary.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Comissões */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">{t.commissions}</h3>
        </div>
        
        {commissions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhuma comissão encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.partnerName}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.coupon}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.commissionAmount}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.salesCount}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.requestDate}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-medium text-gray-900">
                      {commission.partner_name}
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {commission.coupon_code}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-semibold text-green-600">
                      {formatCurrency(commission.commission_amount, summary.currency)}
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      {commission.sales_count}
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      {formatDate(commission.request_date)}
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        commission.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {commission.status === 'paid' ? t.commissionPaid : t.commissionPending}
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm">
                      {commission.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsPaid(commission.id)}
                          disabled={processingPayment === commission.id}
                          className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {processingPayment === commission.id ? t.processing : t.markAsPaid}
                        </button>
                      )}
                      {commission.status === 'paid' && commission.admin_payment_date && (
                        <span className="text-xs text-gray-500">
                          {t.paidOn} {formatDate(commission.admin_payment_date)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}