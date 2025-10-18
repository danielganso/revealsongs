import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, RefreshCw, User, Mail, Search, Filter, MessageSquare, Send, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SupportTicket, SupportMessage } from '../types/support';

export const AdminSupport: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [resolvingTickets, setResolvingTickets] = useState<Set<string>>(new Set());
  
  // New states for filtering
  const [emailFilter, setEmailFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New states for messaging
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [newMessages, setNewMessages] = useState<{ [ticketId: string]: string }>({});
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/support/get-tickets?isAdmin=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }

      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async (ticketId: string) => {
    const content = newMessages[ticketId]?.trim();
    if (!content) return;

    setSendingMessages(prev => new Set(prev).add(ticketId));

    try {
      const response = await fetch('/api/support/add-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ticketId, 
          content, 
          sender: 'admin' 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add message');
      }

      // Clear the message input
      setNewMessages(prev => ({ ...prev, [ticketId]: '' }));
      
      // Refresh tickets to show new message
      await fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticketId);
        return newSet;
      });
    }
  };

  const toggleTicketExpansion = (ticketId: string) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Not authenticated</h3>
          <p className="mt-1 text-sm text-gray-500">Please log in to access admin support.</p>
        </div>
      </div>
    );
  }

  const handleResolveTicket = async (ticketId: string) => {
    setResolvingTickets(prev => new Set(prev).add(ticketId));

    try {
      const response = await fetch('/api/support/resolve-ticket', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, resolvedBy: user?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve ticket');
      }

      // Refresh tickets after resolving
      await fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setResolvingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticketId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    let statusMatch = true;
    if (filter === 'open') statusMatch = ticket.status !== 'resolved';
    else if (filter === 'resolved') statusMatch = ticket.status === 'resolved';
    
    // Email filter
    const emailMatch = !emailFilter || 
      ticket.email.toLowerCase().includes(emailFilter.toLowerCase());
    
    // Date filters
    let dateMatch = true;
    if (startDate || endDate) {
      const ticketDate = new Date(ticket.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start) {
        start.setHours(0, 0, 0, 0);
        dateMatch = dateMatch && ticketDate >= start;
      }
      
      if (end) {
        end.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && ticketDate <= end;
      }
    }
    
    return statusMatch && emailMatch && dateMatch;
  });

  // Update tab counts to reflect filtered results
  const getFilteredCount = (statusFilter: 'all' | 'open' | 'resolved') => {
    return tickets.filter(ticket => {
      let statusMatch = true;
      if (statusFilter === 'open') statusMatch = ticket.status !== 'resolved';
      else if (statusFilter === 'resolved') statusMatch = ticket.status === 'resolved';
      
      const emailMatch = !emailFilter || 
        ticket.email.toLowerCase().includes(emailFilter.toLowerCase());
      
      let dateMatch = true;
      if (startDate || endDate) {
        const ticketDate = new Date(ticket.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start) {
          start.setHours(0, 0, 0, 0);
          dateMatch = dateMatch && ticketDate >= start;
        }
        
        if (end) {
          end.setHours(23, 59, 59, 999);
          dateMatch = dateMatch && ticketDate <= end;
        }
      }
      
      return statusMatch && emailMatch && dateMatch;
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Support</h1>
          <p className="text-gray-600">Manage customer support tickets</p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { key: 'all', label: 'All Tickets', count: getFilteredCount('all') },
            { key: 'open', label: 'Open', count: getFilteredCount('open') },
            { key: 'resolved', label: 'Resolved', count: getFilteredCount('resolved') }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Advanced Filters */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Email Filter */}
          <div>
            <label htmlFor="email-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="email-filter"
                type="text"
                placeholder="Enter email address..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Start Date Filter */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(emailFilter || startDate || endDate) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setEmailFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No support tickets available.' : `No ${filter} tickets found.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <li key={ticket.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(ticket.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {ticket.subject}
                        </p>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span className="truncate">{ticket.email}</span>
                          </div>
                          {ticket.user_id && (
                            <div className="flex items-center text-sm text-gray-500">
                              <User className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              <span className="truncate">ID: {ticket.user_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center space-x-3">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'resolved' 
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusText(ticket.status)}
                      </span>
                      {ticket.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveTicket(ticket.id)}
                          disabled={resolvingTickets.has(ticket.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {resolvingTickets.has(ticket.id) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            'Resolve'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p className="flex items-center">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {formatDate(ticket.updated_at)}
                      </p>
                    </div>
                  </div>
                  {ticket.message && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        {ticket.message}
                      </p>
                    </div>
                  )}
                  {ticket.message && (
                    <div className="mt-2 bg-gray-50 rounded-md p-3">
                      <p className="text-sm text-gray-700">
                        <strong>Message:</strong> {ticket.message}
                      </p>
                    </div>
                  )}

                  {/* Messages section - only show if ticket is expanded */}
                  {expandedTickets.has(ticket.id) && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Histórico de Mensagens
                      </h4>
                      
                      {/* Display existing messages */}
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {ticket.messages && ticket.messages.length > 0 ? (
                          ticket.messages.map((message: SupportMessage) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.sender === 'admin'
                                  ? 'bg-blue-50 border-l-4 border-blue-400 ml-4'
                                  : 'bg-gray-50 border-l-4 border-gray-400 mr-4'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-medium ${
                                  message.sender === 'admin' ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {message.sender === 'admin' ? 'Admin' : 'Usuário'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800">{message.content}</p>
                            </div>
                          ))
                        ) : (
                          // Fallback to old message format if no messages array
                          ticket.message && (
                            <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-400 mr-4">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-medium text-gray-700">Usuário</span>
                                <span className="text-xs text-gray-500">
                                  {formatMessageTime(ticket.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800">{ticket.message}</p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Add new message form */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessages[ticket.id] || ''}
                          onChange={(e) => setNewMessages(prev => ({ 
                            ...prev, 
                            [ticket.id]: e.target.value 
                          }))}
                          placeholder="Digite sua resposta..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddMessage(ticket.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddMessage(ticket.id)}
                          disabled={sendingMessages.has(ticket.id) || !newMessages[ticket.id]?.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {sendingMessages.has(ticket.id) ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Toggle expansion button */}
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => toggleTicketExpansion(ticket.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {expandedTickets.has(ticket.id) ? 'Ocultar mensagens' : 'Ver mensagens'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;