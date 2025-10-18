import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertCircle, CheckCircle, RefreshCw, MessageSquare, Send, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserLanguage } from '../hooks/useUserLanguage';
import { SupportModal } from './SupportModal';
import { SupportTicket, SupportMessage } from '../types/support';
import { translations, Language } from '../lib/translations';

interface UserSupportProps {
  language: Language;
}

export const UserSupport: React.FC<UserSupportProps> = ({ language }) => {
  const { user } = useAuth();
  const { currency } = useUserLanguage(user?.id);
  const t = translations[language];
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New states for messaging
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  const [newMessages, setNewMessages] = useState<{ [ticketId: string]: string }>({});
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTickets();
  }, [user?.id]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/support/get-tickets?userId=${user.id}&isAdmin=false`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tickets');
      }

      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // New functions for messaging
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
          sender: 'user'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Clear the message input
      setNewMessages(prev => ({ ...prev, [ticketId]: '' }));
      
      // Refresh tickets to get updated messages
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
    const locale = currency === 'USD' ? 'en-US' : 'pt-BR';
    return new Date(timestamp).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        return t.ticketOpen;
      case 'in_progress':
        return t.inProgress;
      case 'resolved':
        return t.ticketResolved;
      default:
        return t.unknown;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTicketCreated = () => {
    fetchTickets();
    setIsModalOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t.userNotAuthenticated}</h3>
          <p className="mt-1 text-sm text-gray-500">{t.loginToAccessSupport}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.support}</h1>
          <p className="text-gray-600">{t.supportDescription}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t.newTicket}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{t.unexpectedError}</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t.noTicketsFound}</h3>
            <p className="mt-1 text-sm text-gray-500">{t.startByCreatingTicket}</p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.newTicket}
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(ticket.status)}
                      <p className="ml-2 text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'resolved' 
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusText(ticket.status)}
                      </p>
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
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {ticket.message}
                      </p>
                    </div>
                  )}

                  {/* Messages section - only show if ticket is expanded */}
                  {expandedTickets.has(ticket.id) && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {t.messageHistory}
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
                                  {message.sender === 'admin' ? t.support : t.you}
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
                                <span className="text-xs font-medium text-gray-700">{t.you}</span>
                                <span className="text-xs text-gray-500">
                                  {formatMessageTime(ticket.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800">{ticket.message}</p>
                            </div>
                          )
                        )}
                      </div>

                      {/* Add new message form - always show */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessages[ticket.id] || ''}
                          onChange={(e) => setNewMessages(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                          placeholder={t.sendMessagePlaceholder}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !sendingMessages.has(ticket.id)) {
                              handleAddMessage(ticket.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddMessage(ticket.id)}
                          disabled={sendingMessages.has(ticket.id) || !newMessages[ticket.id]?.trim()}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

                  {/* Toggle messages button */}
                  <div className="mt-3">
                    <button
                      onClick={() => toggleTicketExpansion(ticket.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {expandedTickets.has(ticket.id) ? t.hideMessages : t.viewMessages}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
};

export default UserSupport;