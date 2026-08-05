import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  subscribeToBabyReadyAuth,
  type AuthState,
} from '../services/authService';

const defaultAuthState: AuthState = {
  status: 'loading',
  user: null,
  error: null,
};

const AuthContext = createContext<AuthState>(defaultAuthState);

export function BabyReadyAuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    const unsubscribe = subscribeToBabyReadyAuth(setAuthState);

    return () => unsubscribe?.();
  }, []);

  const value = useMemo(() => authState, [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useBabyReadyAuth(): AuthState {
  return useContext(AuthContext);
}
