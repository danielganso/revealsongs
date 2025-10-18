import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, TrendingUp, Users, Download, CreditCard } from 'lucide-react';
import { translations, Language } from '../lib/translations';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { useAuth } from '../hooks/useAuth';
import CommissionModal from './CommissionModal';
import ErrorModal from './ErrorModal';
import { CommissionStatus } from '../types/database';

interface SaleData {
  id: string;
  partner_id: string;
  subscription_id: string;
  coupon_code: string;
  amount_paid_cents: number;
  commission_percentage: number;
  commission_amount_cents: number;
  currency: string;
  sale_type: string;
  commission_paid: CommissionStatus;
  created_at: string;
  user_email?: string;
  plan_id?: string;
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
  const [partnerCommission, setPartnerCommission] = useState<number>(0);
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
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionData, setCommissionData] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState({ title: '', message: '' });

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

      // Obter perfil do parceiro para pegar o ID e comissão
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, coupon_code, role, commission_percentage')
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

      // Armazenar a comissão do parceiro
      setPartnerCommission((profile as any).commission_percentage || 0);

      // Buscar vendas do parceiro na nova tabela partner_sales
      let query = (supabase as any)
        .from('partner_sales')
        .select(`
          id,
          partner_id,
          subscription_id,
          coupon_code,
          amount_paid_cents,
          commission_percentage,
          commission_amount_cents,
          currency,
          sale_type,
          commission_paid,
          created_at,
          subscriptions!inner(user_id, plan_id)
        `)
        .eq('partner_id', (profile as any).id)
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

      // Buscar emails dos usuários das subscriptions
      const userIds = Array.from(new Set((salesData as any)?.map((sale: any) => sale.subscriptions.user_id) || []));
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      // Mapear emails e plan_id para as vendas
      const salesWithEmails = (salesData as any)?.map((sale: any) => ({
        ...sale,
        user_email: (profiles as any)?.find((p: any) => p.user_id === sale.subscriptions.user_id)?.email || 'N/A',
        plan_id: sale.subscriptions.plan_id
      })) || [];



      setSales(salesWithEmails);

      // Calcular resumo
      const totalSales = salesWithEmails.length;
      const totalAmount = salesWithEmails.reduce((sum: number, sale: SaleData) => sum + (sale.amount_paid_cents || 0), 0);
      const totalCommission = salesWithEmails.reduce((sum: number, sale: SaleData) => sum + (sale.commission_amount_cents || 0), 0);
      const currency = salesWithEmails[0]?.currency || 'BRL';

      // Agrupar por mês
      const salesByMonth: { [key: string]: { count: number; amount: number } } = {};
      salesWithEmails.forEach((sale: SaleData) => {
        const month = new Date(sale.created_at).toISOString().substring(0, 7); // YYYY-MM
        if (!salesByMonth[month]) {
          salesByMonth[month] = { count: 0, amount: 0 };
        }
        salesByMonth[month].count++;
        salesByMonth[month].amount += sale.commission_amount_cents || 0; // Usar comissão em vez do valor total
      });

      setSummary({
        totalSales,
        totalAmount: totalCommission, // Mostrar total de comissões em vez do valor total das vendas
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
    const headers = [t.csvDate, t.csvCustomerEmail, t.csvPlan, t.csvPaidAmount, 'Comissão', 'Tipo de Venda'];
    const csvContent = [
      headers.join(','),
      ...sales.map((sale: SaleData) => [
        formatDate(sale.created_at),
        sale.user_email,
        sale.plan_id || sale.sale_type,
        formatCurrency(sale.amount_paid_cents, sale.currency),
        formatCurrency(sale.commission_amount_cents, sale.currency),
        sale.sale_type
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

  const handleGeneratePayment = async () => {
    try {
      console.log('🎯 [FRONTEND] Iniciando geração de pagamento...');
      setGeneratingPayment(true);
      setError(null);

      // Obter token de autenticação
      console.log('🔐 [FRONTEND] Obtendo token de autenticação...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ [FRONTEND] Usuário não autenticado');
        setErrorModalData({
          title: t.error || 'Erro',
          message: 'Usuário não autenticado'
        });
        setShowErrorModal(true);
        return;
      }

      console.log('✅ [FRONTEND] Token obtido, fazendo chamada para API...');

      const response = await fetch('/api/generate-commission-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📡 [FRONTEND] Resposta da API:', {
        status: response.status,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📊 [FRONTEND] Dados da resposta:', result);

      if (response.ok) {
        console.log('✅ [FRONTEND] Comissão gerada com sucesso');
        setCommissionData(result.commission);
        setShowCommissionModal(true);
        // Recarregar dados após gerar pagamento
        await loadPartnerSales();
      } else {
        console.error('❌ [FRONTEND] Erro na API:', result);
        setErrorModalData({
          title: t.error || 'Erro',
          message: result.message || t.commissionError
        });
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('💥 [FRONTEND] Erro ao gerar pagamento:', error);
      setErrorModalData({
        title: t.error || 'Erro',
        message: t.commissionError
      });
      setShowErrorModal(true);
    } finally {
      setGeneratingPayment(false);
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{t.partnerReportsTitle}</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleGeneratePayment}
            disabled={generatingPayment}
            className="flex items-center px-3 py-2 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm lg:text-base"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {generatingPayment ? t.generating : t.generatePayment}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-2 lg:px-4 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm lg:text-base"
          >
            <Download className="w-4 h-4 mr-2" />
            {t.exportCsv}
          </button>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-base lg:text-lg font-semibold mb-3">{t.filters}</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.startDate}
            </label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.endDate}
            </label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateFilter({ startDate: '', endDate: '' })}
              className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              {t.clear}
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.totalSales}</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{summary.totalSales}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.totalCommissions}</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalAmount, summary.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.averageCommission}</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {summary.totalSales > 0 
                  ? formatCurrency(summary.totalAmount / summary.totalSales, summary.currency)
                  : formatCurrency(0, summary.currency)
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">{t.yourCommission}</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{partnerCommission}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">{t.salesDetails}</h3>
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
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.date}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    {t.paymentStatus}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.type}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.value}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.commission}
                  </th>
                  <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    {t.percentage}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      <div className="lg:hidden">
                        {formatDate(sale.created_at).split(' ')[0]}
                      </div>
                      <div className="hidden lg:block">
                        {formatDate(sale.created_at)}
                      </div>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900 hidden sm:table-cell">
                      <div className="truncate max-w-[150px] lg:max-w-none">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.commission_paid === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : sale.commission_paid === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.commission_paid === 'paid' 
                            ? t.paid
                            : sale.commission_paid === 'pending'
                            ? t.awaitingPayment
                            : sale.commission_paid === 'false'
                            ? t.notRequested
                            : `${t.notRequested} (${sale.commission_paid})`
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.sale_type === 'subscription' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <span className="lg:hidden">
                          {sale.sale_type === 'subscription' ? 'Sub' : 'Cred'}
                        </span>
                        <span className="hidden lg:inline">
                          {sale.sale_type === 'subscription' ? 'Assinatura' : 'Créditos'}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                      <div className="font-medium">
                        {formatCurrency(sale.amount_paid_cents, sale.currency)}
                      </div>
                      <div className="sm:hidden text-xs text-gray-500 truncate">
                        {sale.user_email}
                      </div>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm font-semibold text-green-600">
                      <div>
                        {formatCurrency(sale.commission_amount_cents, sale.currency)}
                      </div>
                      <div className="lg:hidden text-xs text-gray-500">
                        {sale.commission_percentage}%
                      </div>
                    </td>
                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900 hidden lg:table-cell">
                      {sale.commission_percentage}%
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
                    {new Date(month + '-01').toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', { 
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
      
      {/* Modal de Comissão Personalizado */}
      <CommissionModal
        isOpen={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        commissionData={commissionData}
        language={language}
      />

      {/* Modal de Erro */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalData.title}
        message={errorModalData.message}
        language={language}
      />
    </div>
  );
}