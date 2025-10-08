import * as React from 'react';
const { useState, useEffect } = React;
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, TrendingUp, Users, Download, Filter, Tag } from 'lucide-react';
import { translations, Language } from '../lib/translations';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { useAuth } from '../hooks/useAuth';

interface SaleData {
  id: string;
  user_id: string;
  plan_id: string;
  coupon_code: string | null;
  paid_amount_cents: number;
  currency: string;
  created_at: string;
  status: string;
  user_email?: string;
  partner_name?: string;
}

interface SalesSummary {
  totalSales: number;
  totalAmount: number;
  salesWithCoupon: number;
  salesWithoutCoupon: number;
  currency: string;
  salesByMonth: { [key: string]: { count: number; amount: number } };
  salesByCoupon: { [key: string]: { count: number; amount: number; partnerName?: string } };
}

export default function AdminReports() {
  console.log('🚀 [AdminReports] Componente carregado!');
  
  // Use proper hooks for authentication and language
  const { user } = useAuth();
  const { language } = useUserLanguage(user?.id);
  const t = translations[language];
  
  const [sales, setSales] = useState<SaleData[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalAmount: 0,
    salesWithCoupon: 0,
    salesWithoutCoupon: 0,
    currency: 'BRL',
    salesByMonth: {},
    salesByCoupon: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    couponCode: '',
    showOnlyWithCoupon: false,
    showOnlyWithoutCoupon: false
  });

  useEffect(() => {
    console.log('🔄 [AdminReports] useEffect executado - iniciando loadAllSales');
    loadAllSales();
  }, [filters]);

  const loadAllSales = async () => {
    console.log('📊 [AdminReports] loadAllSales iniciado');
    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário é ADMIN
      console.log('🔐 [AdminReports] Verificando autenticação...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [AdminReports] Usuário não autenticado');
        setError('Usuário não autenticado');
        return;
      }
      console.log('✅ [AdminReports] Usuário autenticado:', user.id);

      console.log('👤 [AdminReports] Verificando perfil do usuário...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single() as { data: { role: string } | null; error: any };

      if (profileError || !profile || profile.role !== 'ADMIN') {
        setError('Acesso negado. Apenas administradores podem visualizar este relatório.');
        return;
      }

      // Construir query para buscar todas as vendas
      let query = supabase
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
        .eq('status', 'active')
        .not('paid_amount_cents', 'is', null)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }
      if (filters.couponCode) {
        query = query.eq('coupon_code', filters.couponCode);
      }
      if (filters.showOnlyWithCoupon) {
        query = query.not('coupon_code', 'is', null);
      }
      if (filters.showOnlyWithoutCoupon) {
        query = query.is('coupon_code', null);
      }

      const { data: salesData, error: salesError }: { data: SaleData[] | null; error: any } = await query;

      if (salesError) {
        console.error('Erro ao carregar vendas:', salesError);
        setError('Erro ao carregar dados de vendas');
        return;
      }

      // Buscar emails dos usuários
      const userIds = Array.from(new Set(salesData?.map((sale: any) => sale.user_id) || []));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      // Buscar informações dos parceiros (cupons)
      const couponCodes = Array.from(new Set((salesData as any)?.map((sale: any) => sale.coupon_code).filter(Boolean) || []));
      console.log('🔍 [AdminReports] Cupons encontrados nas vendas:', couponCodes);
      
      // Buscar parceiros via API route que usa service_role
      let partners: any[] = [];
      let partnersError: any = null;
      
      if (couponCodes.length > 0) {
        try {
          const response = await fetch('/api/admin/partners', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ couponCodes }),
          });
          
          const result = await response.json();
          
          if (response.ok) {
            partners = result.partners || [];
          } else {
            partnersError = result.error;
          }
        } catch (error) {
          partnersError = error;
        }
      }
      
      console.log('👥 [AdminReports] Parceiros encontrados:', partners);
      if (partnersError) {
        console.error('❌ [AdminReports] Erro ao buscar parceiros:', partnersError);
      }

      // Mapear dados completos
      console.log('🔍 [AdminReports] Iniciando mapeamento. Partners disponíveis:', partners);
      console.log('🔍 [AdminReports] Tipo do partners:', typeof partners, 'Array?', Array.isArray(partners));
      
      const salesWithDetails = (salesData as any)?.map((sale: any) => {
        console.log(`🔍 [AdminReports] Processando venda ${sale.id} com cupom: "${sale.coupon_code}"`);
        
        const partnerName = sale.coupon_code 
          ? (partners as any)?.find((p: any) => {
              console.log(`🔍 [AdminReports] Comparando "${p.coupon_code}" === "${sale.coupon_code}"`);
              return p.coupon_code === sale.coupon_code;
            })?.name || 'Parceiro não encontrado'
          : null;
        
        console.log(`🔗 [AdminReports] Venda ${sale.id}: cupom=${sale.coupon_code}, parceiro=${partnerName}`);
        
        return {
          ...sale,
          user_email: (profiles as any)?.find((p: any) => p.user_id === sale.user_id)?.email || 'N/A',
          partner_name: partnerName
        };
      }) || [];

      setSales(salesWithDetails);

      // Calcular resumo
      const totalSales = salesWithDetails.length;
      const totalAmount = salesWithDetails.reduce((sum: number, sale: SaleData) => sum + (sale.paid_amount_cents || 0), 0);
      const salesWithCoupon = salesWithDetails.filter((sale: SaleData) => sale.coupon_code).length;
      const salesWithoutCoupon = totalSales - salesWithCoupon;
      const currency = salesWithDetails[0]?.currency || 'BRL';

      // Agrupar por mês
      const salesByMonth: { [key: string]: { count: number; amount: number } } = {};
      salesWithDetails.forEach((sale: SaleData) => {
        const month = new Date(sale.created_at).toISOString().substring(0, 7);
        if (!salesByMonth[month]) {
          salesByMonth[month] = { count: 0, amount: 0 };
        }
        salesByMonth[month].count++;
        salesByMonth[month].amount += sale.paid_amount_cents || 0;
      });

      // Agrupar por cupom
      const salesByCoupon: { [key: string]: { count: number; amount: number; partnerName?: string } } = {};
      salesWithDetails.forEach((sale: SaleData) => {
        if (sale.coupon_code) {
          if (!salesByCoupon[sale.coupon_code]) {
            salesByCoupon[sale.coupon_code] = { 
              count: 0, 
              amount: 0, 
              partnerName: sale.partner_name || undefined 
            };
          }
          salesByCoupon[sale.coupon_code].count++;
          salesByCoupon[sale.coupon_code].amount += sale.paid_amount_cents || 0;
        }
      });

      setSummary({
        totalSales,
        totalAmount,
        salesWithCoupon,
        salesWithoutCoupon,
        currency,
        salesByMonth,
        salesByCoupon
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
    const headers = [t.csvDate, t.csvCustomerEmail, t.csvPlan, t.csvCoupon, t.csvPartner, t.csvPaidAmount, t.csvStatus];
    const csvContent = [
      headers.join(','),
      ...sales.map(sale => [
        formatDate(sale.created_at),
        sale.user_email,
        sale.plan_id,
        sale.coupon_code || t.noCoupon,
        sale.partner_name || 'N/A',
        formatCurrency(sale.paid_amount_cents, sale.currency),
        sale.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_admin_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      couponCode: '',
      showOnlyWithCoupon: false,
      showOnlyWithoutCoupon: false
    });
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
          onClick={loadAllSales}
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
        <h1 className="text-2xl font-bold text-gray-900">{t.adminReportsTitle}</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {t.exportCsv}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          {t.filters}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.startDate}
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.endDate}
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.specificCoupon}
            </label>
            <input
              type="text"
              placeholder={t.couponPlaceholder}
              value={filters.couponCode}
              onChange={(e) => setFilters(prev => ({ ...prev, couponCode: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t.couponFilters}
            </label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showOnlyWithCoupon}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    showOnlyWithCoupon: e.target.checked,
                    showOnlyWithoutCoupon: e.target.checked ? false : prev.showOnlyWithoutCoupon
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">{t.onlyWithCoupon}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showOnlyWithoutCoupon}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    showOnlyWithoutCoupon: e.target.checked,
                    showOnlyWithCoupon: e.target.checked ? false : prev.showOnlyWithCoupon
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">{t.onlyWithoutCoupon}</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            {t.clearFilters}
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Tag className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t.withCoupon}</p>
              <p className="text-2xl font-bold text-gray-900">{summary.salesWithCoupon}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t.withoutCoupon}</p>
              <p className="text-2xl font-bold text-gray-900">{summary.salesWithoutCoupon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendas por Cupom */}
      {Object.keys(summary.salesByCoupon).length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.salesByCoupon}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.coupon}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.partner}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.sales}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.totalAmount}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(summary.salesByCoupon)
                  .sort(([,a], [,b]) => b.amount - a.amount)
                  .map(([coupon, data]) => (
                    <tr key={coupon} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coupon}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.partnerName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data.amount, summary.currency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    {t.coupon}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t.partner}
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
                      {sale.coupon_code || (
                        <span className="text-gray-400 italic">{t.noCoupon}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.partner_name || (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
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
                    {new Date(month + '-01').toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{data.count} {t.sales.toLowerCase()}</div>
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