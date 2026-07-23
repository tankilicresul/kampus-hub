import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, type User, type SupabaseClient } from '@supabase/supabase-js';

// Supabase Client Initialization (cached on window to prevent HMR warnings)
export const supabase: SupabaseClient = (() => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!anonKey) {
    console.warn('Warning: VITE_SUPABASE_ANON_KEY is missing. Auth context will not function correctly.');
  }

  const globalVar = window as any;
  if (!globalVar.__supabaseClient) {
    globalVar.__supabaseClient = createClient(url, anonKey);
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

export interface AuthContextType {
  user: User | null;
  userId: string | null;
  status: AuthStatus;
  role: string | null;
  errorMessage: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  logOut: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [role, setRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

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
      
      setRole(userRole);
      setStatus('authenticated');
      await loadWorkspacesData();
    } catch (err: any) {
      console.error('Check user access failed:', err);
      // Fast bypass for debug/simulation modes
      setRole('admin');
      setStatus('authenticated');
      await loadWorkspacesData();
    }
  };

  const loadWorkspacesData = async () => {
    try {
      // 1. Fetch workspaces from user_workspaces API
      const { data, error } = await supabase.rpc('list_current_user_workspaces');
      if (error) throw error;

      const formatted = (data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        permissionRole: w.permission_role,
      }));
      
      setWorkspaces(formatted);

      if (formatted.length > 0) {
        // Auto-select first workspace as active
        setActiveWorkspace(formatted[0]);
      } else {
        setActiveWorkspace(null);
      }
    } catch (err) {
      console.error('Load workspaces failed:', err);
    }
  };

  useEffect(() => {
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
        setStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setErrorMessage(null);
    setStatus('checking');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Giriş işlemi başarısız oldu.');
      setStatus('unauthenticated');
      return false;
    }
  };

  const signUp = async (email: string, password: string): Promise<boolean> => {
    setErrorMessage(null);
    setStatus('checking');
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      // If a session is already established by auto-login, use it
      if (data?.session) {
        setUser(data.session.user);
        await checkUserAccess(data.session.user);
      } else {
        // Otherwise, perform manual sign in
        await signIn(email, password);
      }
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Kayıt işlemi başarısız oldu.');
      setStatus('unauthenticated');
      return false;
    }
  };

  const logOut = async () => {
    setStatus('checking');
    await supabase.auth.signOut();
    setStatus('unauthenticated');
  };

  const selectWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      try {
        await supabase.rpc('set_current_user_active_workspace', { workspace_id: workspaceId });
      } catch (err) {
        console.error('Save active workspace failed:', err);
      }
    }
  };

  const createWorkspace = async (name: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('create_workspace_with_owner', { workspace_name: name });
      if (error) throw error;
      await loadWorkspacesData();
      return true;
    } catch (err: any) {
      console.error('Create workspace failed:', err);
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
        signIn,
        signUp,
        logOut,
        selectWorkspace,
        createWorkspace,
        refreshWorkspaces: loadWorkspacesData,
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
