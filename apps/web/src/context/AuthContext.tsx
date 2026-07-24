import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, type User, type SupabaseClient } from '@supabase/supabase-js';

export const isEnvMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Supabase Client (Cloud) ───────────────────────────────────────────────────
export const supabase: SupabaseClient = (() => {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder-project.supabase.co';
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-key';

  const globalVar = window as unknown as Record<string, unknown>;
  if (!globalVar.__supabaseClient) {
    globalVar.__supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return globalVar.__supabaseClient as SupabaseClient;
})();

export type AuthStatus = 'unauthenticated' | 'checking' | 'authenticated' | 'error';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  permissionRole?: string;
}

export interface PendingInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedByEmail?: string;
  permissionRole: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  userId: string | null;
  status: AuthStatus;
  role: string | null;
  errorMessage: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  pendingInvitations: PendingInvitation[];
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  logOut: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<boolean>;
  inviteMember: (email: string, role?: string) => Promise<{ success: boolean; message?: string }>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  declineInvitation: (invitationId: string) => Promise<boolean>;
  updateUserProfile: (data: { fullName?: string; avatarUrl?: string }) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [role, setRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const checkUserAccess = async (_currentUser: User) => {
    try {
      const { data, error } = await supabase.rpc('check_current_user_access');
      if (error) throw error;
      
      const { allowed, reason, role: userRole } = data as { allowed: boolean; reason: string; role: string };
      
      if (!allowed) {
        setErrorMessage(reason || 'Erişim izniniz bulunmuyor.');
        setStatus('error');
        return;
      }
      
      setRole(userRole || 'member');
      setStatus('authenticated');
      await loadWorkspacesData();
      await loadPendingInvitations();
    } catch (err: any) {
      console.error('Check user access failed, fallback to standard member access:', err);
      setRole('member');
      setStatus('authenticated');
      await loadWorkspacesData();
      await loadPendingInvitations();
    }
  };

  const loadWorkspacesData = async () => {
    try {
      const { data, error } = await supabase.rpc('list_current_user_workspaces');
      if (error) throw error;

      const formatted = (data || [])
        .map((w: any) => ({
          id: w.id || w.workspace_id,      // handle both field names
          name: w.name || w.workspace_name || 'Ekip',
          slug: w.slug || '',
          permissionRole: w.permission_role || 'member',
        }))
        .filter((w: any) => !!w.id);       // only keep entries with a valid id
      
      setWorkspaces(formatted);

      if (formatted.length > 0) {
        // En son hangi ekip açıktı? localStorage'dan oku.
        const savedId = localStorage.getItem('kh_active_ws');

        setActiveWorkspace((prev) => {
          // Mevcut seçim hâlâ geçerliyse koru (örn. kabul edilen davet sonrası)
          if (prev?.id && formatted.some((w: any) => w.id === prev.id)) return prev;
          // localStorage'da kayıtlı ekip varsa ve listede mevcutsa ona dön
          if (savedId) {
            const saved = formatted.find((w: any) => w.id === savedId);
            if (saved) return saved;
          }
          // Yoksa listedeki ilke ekip
          return formatted[0];
        });
      } else {
        setActiveWorkspace(null);
      }
    } catch (err) {
      console.error('Load workspaces failed:', err);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      const { data, error } = await supabase.rpc('list_current_user_pending_workspace_invitations');
      if (error) throw error;

      const formatted = (data || []).map((inv: any) => ({
        id: inv.invitation_id || inv.id,
        workspaceId: inv.workspace_id,
        workspaceName: inv.workspace_name,
        invitedByEmail: inv.invited_by_name || inv.invited_by_email || 'Ekip Yöneticisi',
        permissionRole: inv.permission_role,
        createdAt: inv.created_at,
      }));

      setPendingInvitations(formatted);
    } catch (err) {
      console.error('Load pending invitations failed:', err);
    }
  };

  useEffect(() => {
    if (isEnvMissing) {
      setErrorMessage(
        'Supabase env vars eksik! VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlanmış olmalı. Lütfen Vercel → Settings → Environment Variables bölümüne ekleyin.'
      );
      setStatus('error');
      return;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        checkUserAccess(session.user);
      } else {
        setStatus('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        checkUserAccess(session.user);
      } else {
        setUser(null);
        setRole(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setPendingInvitations([]);
        setStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Periodic background check for pending invitations & workspaces
  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(() => {
      loadPendingInvitations();
    }, 8000);

    return () => clearInterval(interval);
  }, [status]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setErrorMessage(null);
    setStatus('checking');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        setUser(data.session.user);
        await checkUserAccess(data.session.user);
      }
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Giriş işlemi başarısız oldu.');
      setStatus('unauthenticated');
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<boolean> => {
    setErrorMessage(null);
    setStatus('checking');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
          },
        },
      });
      if (error) throw error;
      
      // Email confirmation is disabled — proceed with immediate session or sign in
      if (data?.session) {
        setUser(data.session.user);
        await checkUserAccess(data.session.user);
      } else {
        const loggedIn = await signIn(email, password);
        if (!loggedIn && data?.user) {
          // Direct fallback login
          setUser(data.user);
          setRole('admin');
          setStatus('authenticated');
          await loadWorkspacesData();
          await loadPendingInvitations();
        }
      }
      return true;
    } catch (err: any) {
      const loggedIn = await signIn(email, password);
      if (loggedIn) return true;

      setErrorMessage(err.message || 'Kayıt işlemi başarısız oldu.');
      setStatus('unauthenticated');
      return false;
    }
  };

  const logOut = async () => {
    setStatus('checking');
    localStorage.removeItem('kh_active_ws');
    await supabase.auth.signOut();
    setStatus('unauthenticated');
  };

  const selectWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      // Seçimi kaydet — yenileme / pull-to-refresh sonrası geri döner
      localStorage.setItem('kh_active_ws', workspaceId);
      try {
        await supabase.rpc('set_current_user_active_workspace', { workspace_id: workspaceId });
      } catch (err) {
        console.error('Save active workspace failed:', err);
      }
    }
  };

  const createWorkspace = async (name: string): Promise<boolean> => {
    try {
      let slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slug) slug = `ws-${Date.now()}`;

      // Call RPC with matching SQL parameter names: workspace_name, requested_slug, industry
      const { error } = await supabase.rpc('create_workspace_with_owner', { 
        workspace_name: name.trim(),
        requested_slug: slug,
        industry: 'education',
        default_language: 'tr',
        timezone: 'Europe/Istanbul'
      });

      if (error) {
        console.warn('Full RPC signature call failed, trying single-argument fallback:', error);
        const fallback = await supabase.rpc('create_workspace_with_owner', { 
          workspace_name: name.trim() 
        });
        if (fallback.error) throw fallback.error;
      }
      
      await loadWorkspacesData();
      return true;
    } catch (err: any) {
      console.error('Create workspace failed:', err);
      return false;
    }
  };

  const inviteMember = async (email: string, role: string = 'staff'): Promise<{ success: boolean; message?: string }> => {
    if (!activeWorkspace) {
      return { success: false, message: 'Aktif bir çalışma alanı seçili değil.' };
    }
    try {
      const cleanEmail = email.trim().toLowerCase();
      const tokenHash = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const permRole = (role === 'admin' ? 'admin' : 'member') as any;

      const { error } = await supabase.from('workspace_invitations').insert({
        workspace_id: activeWorkspace.id,
        normalized_email: cleanEmail,
        token_hash: tokenHash,
        permission_role: permRole,
        job_role: 'operations',
        invited_by: user?.id,
        invitation_status: 'pending',
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Invite member failed:', err);
      return { success: false, message: err.message || 'Davet gönderilemedi.' };
    }
  };

  const acceptInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('accept_current_user_workspace_invitation', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;

      // Reload workspaces and update active workspace to the newly joined team
      const { data: wsData } = await supabase.rpc('list_current_user_workspaces');
      if (wsData && wsData.length > 0) {
        const formatted = wsData.map((w: any) => ({
          id: w.id,
          name: w.name,
          slug: w.slug,
          permissionRole: w.permission_role,
        }));
        setWorkspaces(formatted);
        // Switch to the newest joined workspace
        const newest = formatted[formatted.length - 1];
        setActiveWorkspace(newest);
        try {
          await supabase.rpc('set_current_user_active_workspace', { workspace_id: newest.id });
        } catch (_) {}
      } else {
        await loadWorkspacesData();
      }

      await loadPendingInvitations();
      return true;
    } catch (err: any) {
      console.error('Accept invitation failed:', err);
      return false;
    }
  };

  const declineInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('decline_current_user_workspace_invitation', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
      await loadPendingInvitations();
      return true;
    } catch (err: any) {
      console.error('Decline invitation failed:', err);
      return false;
    }
  };

  const updateUserProfile = async (data: { fullName?: string; avatarUrl?: string }): Promise<boolean> => {
    if (!user) return false;
    try {
      const updates: Record<string, any> = {};
      if (data.fullName !== undefined) {
        updates.full_name = data.fullName;
        updates.name = data.fullName;
      }
      if (data.avatarUrl !== undefined) {
        updates.avatar_url = data.avatarUrl;
      }

      const { data: authResult, error: authError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (authError) throw authError;
      if (authResult?.user) {
        setUser(authResult.user);
      }

      const profileDbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.fullName !== undefined) profileDbUpdates.full_name = data.fullName;
      if (data.avatarUrl !== undefined) profileDbUpdates.avatar_url = data.avatarUrl;

      await supabase
        .from('profiles')
        .update(profileDbUpdates)
        .eq('id', user.id);

      return true;
    } catch (err: any) {
      console.error('Update user profile failed:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id || null,
        status,
        role,
        errorMessage,
        workspaces,
        activeWorkspace,
        pendingInvitations,
        signIn,
        signUp,
        logOut,
        selectWorkspace,
        createWorkspace,
        inviteMember,
        acceptInvitation,
        declineInvitation,
        updateUserProfile,
        refreshWorkspaces: loadWorkspacesData,
        refreshInvitations: loadPendingInvitations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
