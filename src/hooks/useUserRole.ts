import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'PARCEIRO' | 'USER';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
}

export function useUserRole(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('USER');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Primeiro, vamos tentar buscar sem .single() para ver se há resultados
      const { data: allData, error: allError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId);

      const { data, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile não encontrado, criar um novo com role USER
          // Profile não encontrado, criando novo
          await createUserProfile();
        } else {
          // Error loading profile
          setError('Erro ao carregar perfil do usuário');
        }
        return;
      }

      setProfile(data);
      if (data) {
        setRole(data.role);
      }

    } catch (error) {
      // Unexpected error loading profile
      setError('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    try {
      // Obter dados do usuário do auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      const { data, error: createError } = await (supabase as any)
        .from('profiles')
        .insert({
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'USER'
        })
        .select()
        .single();

      if (createError) {
        // Error creating profile
        setError('Erro ao criar perfil do usuário');
        return;
      }

      setProfile(data);
      if (data) {
        setRole(data.role);
      }

    } catch (error) {
      // Unexpected error creating profile
      setError('Erro inesperado ao criar perfil');
    }
  };

  const updateRole = async (newRole: UserRole) => {
    if (!profile) return false;

    try {
      const { data, error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        // Error updating role
        return false;
      }

      setProfile(data);
      setRole(newRole);
      return true;

    } catch (error) {
      // Unexpected error updating role
      return false;
    }
  };

  const isAdmin = role === 'ADMIN';
  const isPartner = role === 'PARCEIRO';
  const isUser = role === 'USER';



  return {
    profile,
    role,
    loading,
    error,
    isAdmin,
    isPartner,
    isUser,
    updateRole,
    refetch: loadUserProfile
  };
}