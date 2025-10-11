import * as React from 'react';
const { useState, useEffect } = React;
import { Edit, Trash2, Plus, Users, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  coupon_code: string;
  commission_percentage: number | null;
  created_at: string;
  subscription?: {
    id: string;
    coupon_code: string;
    status: string;
    credits: number;
    price_cents: number;
    currency: string;
  };
}

interface PartnersTableProps {
  language: string;
  onCreatePartner: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  refreshTrigger?: number; // Adicionar prop para forçar atualização
}

export default function PartnersTable({ language, onCreatePartner, onEditUser, onDeleteUser, refreshTrigger }: PartnersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Usuário não autenticado');
        return;
      }

      const response = await fetch('/api/list-users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setError(result.error || 'Erro ao carregar usuários');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar usuários:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]); // Adicionar refreshTrigger como dependência

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.coupon_code && user.coupon_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (cents: number, currency: string) => {
    const value = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(value);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'PARCEIRO':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Gerenciar Usuários
          </h2>
        </div>
        <button
          onClick={onCreatePartner}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Parceiro</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou cupom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os Tipos</option>
            <option value="ADMIN">Administradores</option>
            <option value="PARCEIRO">Parceiros</option>
            <option value="USER">Usuários</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cupom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Créditos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.coupon_code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.commission_percentage ? `${user.commission_percentage}%` : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.subscription ? (
                    <div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.subscription.status)}`}>
                        {user.subscription.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatCurrency(user.subscription.price_cents, user.subscription.currency)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sem subscription</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {user.subscription?.credits || 0}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar usuário"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteUser(user)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || roleFilter !== 'all' 
                ? 'Nenhum usuário encontrado com os filtros aplicados.' 
                : 'Nenhum usuário encontrado.'}
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
        <span>
          Mostrando {filteredUsers.length} de {users.length} usuários
        </span>
        <button
          onClick={fetchUsers}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}