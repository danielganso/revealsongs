import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, TrendingUp, Users, Download } from 'lucide-react';
import { translations, Language } from '../lib/translations';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { useAuth } from '../hooks/useAuth';

interface SaleData {
  id: string;
  user_id: string;
  plan_id: string;
  coupon_code: string;
  paid_amount_cents: number;
  currency: string;
  created_at: string;
  status: string;
  user_email?: string;
}

interface SalesSummary {
  totalSales: number;
  totalAmount: number;
  currency: string;
  salesByMonth: { [key: string]: { count: number; amount: number } };
}

export default function PartnerReports() {
  console.log('🚀 [PartnerReports] Componente carregado!');
  
  // Use proper hooks for authentication and language
  const { user } = useAuth();
  const { language } = useUserLanguage(user?.id);
  const t = translations[language];
  
  const [sales, setSales] = useState<SaleData[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalAmount: 0,
    currency: 'BRL',
    salesByMonth: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadPartnerSales();
  }, [dateFilter]);

  const loadPartnerSales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Obter perfil do parceiro para pegar o cupom
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('coupon_code, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        setError(t.errorLoadingUserProfile);
        return;
      }

      if ((profile as any).role !== 'PARCEIRO') {
        setError(t.accessDeniedPartner);
        return;
      }

      if (!(profile as any).coupon_code) {
        setError(t.noCouponAssociated);
        return;
      }

      // Construir query para buscar vendas com o cupom do parceiro
      let query = (supabase as any)
        .from('subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          coupon_code,
          paid_amount_cents,
          currency,
          created_at,
          status
        `)
        .eq('coupon_code', (profile as any)?.coupon_code)
        .eq('status', 'active')
        .not('paid_amount_cents', 'is', null)
        .order('created_at', { ascending: false });

      // Aplicar filtros de data se fornecidos
      if (dateFilter.startDate) {
        query = query.gte('created_at', dateFilter.startDate);
      }
      if (dateFilter.endDate) {
        query = query.lte('created_at', dateFilter.endDate + 'T23:59:59');
      }

      const { data: salesData, error: salesError } = await query;

      if (salesError) {
        console.error(language === 'en' ? 'Error loading sales:' : 'Erro ao carregar vendas:', salesError);
        setError(t.errorLoadingSalesData);
        return;
      }

      // Buscar emails dos usuários
      const userIds = Array.from(new Set((salesData as any)?.map((sale: any) => sale.user_id) || []));
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      // Mapear emails para as vendas
      const salesWithEmails = (salesData as any)?.map((sale: any) => ({
        ...sale,
        user_email: (profiles as any)?.find((p: any) => p.user_id === sale.user_id)?.email || 'N/A'
      })) || [];

      setSales(salesWithEmails);

      // Calcular resumo
      const totalSales = salesWithEmails.length;
      const totalAmount = salesWithEmails.reduce((sum: number, sale: SaleData) => sum + (sale.paid_amount_cents || 0), 0);
      const currency = salesWithEmails[0]?.currency || 'BRL';

      // Agrupar por mês
      const salesByMonth: { [key: string]: { count: number; amount: number } } = {};
      salesWithEmails.forEach((sale: SaleData) => {
        const month = new Date(sale.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!salesByMonth[month]) {
          salesByMonth[month] = { count: 0, amount: 0 };
        }
        salesByMonth[month].count++;
        salesByMonth[month].amount += sale.paid_amount_cents || 0;
      });

      setSummary({
        totalSales,
        totalAmount,
        currency,
        salesByMonth
      });

    } catch (error) {
      console.error(language === 'en' ? 'Unexpected error:' : 'Erro inesperado:', error);
      setError(t.unexpectedErrorLoadingReport);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const exportToCSV = () => {
    const headers = [t.csvDate, t.csvCustomerEmail, t.csvPlan, t.csvPaidAmount, t.csvStatus];
    const csvContent = [
      headers.join(','),
      ...sales.map((sale: SaleData) => [
        formatDate(sale.created_at),
        sale.user_email,
        sale.plan_id,
        formatCurrency(sale.paid_amount_cents, sale.currency),
        sale.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_parceiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t.loadingReport}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={loadPartnerSales}
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.partnerReportsTitle}</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {t.exportCsv}
        </button>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-3">{t.filters}</h3>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.startDate}
            </label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.endDate}
            </label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateFilter({ startDate: '', endDate: '' })}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              {t.clear}
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t.totalSales}</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t.totalAmount}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalAmount, summary.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t.averageTicket}</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalSales > 0 
                  ? formatCurrency(summary.totalAmount / summary.totalSales, summary.currency)
                  : formatCurrency(0, summary.currency)
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t.salesDetails}</h3>
        </div>
        
        {sales.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {t.noSalesFound}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.date}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.customerEmail}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.plan}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.paidAmount}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.status}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.plan_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(sale.paid_amount_cents, sale.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendas por Mês */}
      {Object.keys(summary.salesByMonth).length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.salesByMonth}</h3>
          <div className="space-y-3">
            {Object.entries(summary.salesByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, data]) => (
                <div key={month} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">
                    {new Date(month + '-01').toLocaleDateString('pt-BR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{data.count} {t.sales}</div>
                    <div className="font-semibold">
                      {formatCurrency(data.amount, summary.currency)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}