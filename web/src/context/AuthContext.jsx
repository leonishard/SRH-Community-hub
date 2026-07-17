import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, getToken, setToken as persistToken } from '../api/client';
import { getMe, fetchMyStudentProfile, login as loginRequest, logout as logoutRequest } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [roleType, setRoleType] = useState('public');
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStudent(null);
      setRoleType('public');
      setLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me);
      try {
        const profile = await fetchMyStudentProfile();
        const { roleType: fetchedRoleType, ...studentFields } = profile;
        setStudent(studentFields);
        setRoleType(fetchedRoleType || 'authenticated');
      } catch (err) {
        // A 404 just means this account has no linked Student profile yet.
        if (!(err instanceof ApiError) || err.status !== 404) throw err;
        setStudent(null);
        setRoleType('authenticated');
      }
    } catch {
      persistToken(null);
      setUser(null);
      setStudent(null);
      setRoleType('public');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (identifier, password) => {
      await loginRequest(identifier, password);
      setLoading(true);
      await loadSession();
    },
    [loadSession]
  );

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
    setStudent(null);
    setRoleType('public');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        roleType,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
