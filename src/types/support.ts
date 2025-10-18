export interface SupportMessage {
  id: string;
  content: string;
  sender: 'user' | 'admin';
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  user_id?: string;
  email: string;
  subject: string;
  message?: string; // Mantido para compatibilidade com dados antigos
  messages: SupportMessage[];
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
}