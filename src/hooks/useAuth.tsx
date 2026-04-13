import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { getCurrentUserAsync, getCurrentUserId, type AppUser, initSession } from "@/lib/auth";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refresh: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    initSession();
    const id = getCurrentUserId();
    if (!id) {
      setUser(null);
      setLoading(false);
      return;
    }
    getCurrentUserAsync().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
