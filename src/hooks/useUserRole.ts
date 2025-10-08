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

      console.log('🔍 [useUserRole] Carregando perfil para userId:', userId);

      // Primeiro, vamos tentar buscar sem .single() para ver se há resultados
      const { data: allData, error: allError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId);

      console.log('📊 [useUserRole] Consulta sem .single():', { allData, allError, count: allData?.length });

      const { data, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📊 [useUserRole] Resultado da consulta com .single():', { data, profileError });

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile não encontrado, criar um novo com role USER
          // Profile não encontrado, criando novo
          console.log('⚠️ [useUserRole] Perfil não encontrado, criando novo');
          await createUserProfile();
        } else {
          console.error('❌ [useUserRole] Erro ao carregar perfil:', profileError);
          setError('Erro ao carregar perfil do usuário');
        }
        return;
      }

      setProfile(data);
      if (data) {
        console.log('✅ [useUserRole] Perfil carregado com sucesso:', {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          coupon_code: data.coupon_code
        });
        setRole(data.role);
        console.log('🎯 [useUserRole] Role definida como:', data.role);
      }

    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
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
        console.error('Erro ao criar perfil:', createError);
        setError('Erro ao criar perfil do usuário');
        return;
      }

      setProfile(data);
      if (data) {
        setRole(data.role);
      }

    } catch (error) {
      console.error('Erro inesperado ao criar perfil:', error);
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
        console.error('Erro ao atualizar role:', updateError);
        return false;
      }

      setProfile(data);
      if (data) {
        setRole(data.role);
      }
      return true;

    } catch (error) {
      console.error('Erro inesperado ao atualizar role:', error);
      return false;
    }
  };

  const isAdmin = role === 'ADMIN';
  const isPartner = role === 'PARCEIRO';
  const isUser = role === 'USER';

  console.log('🔧 [useUserRole] Estados calculados:', {
    role,
    isAdmin,
    isPartner,
    isUser,
    loading,
    profileExists: !!profile
  });

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