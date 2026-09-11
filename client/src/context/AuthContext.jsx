import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, getMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await loginUser(username, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return res.user;
  };

  const switchRoleAccount = async (username) => {
    const distinctPasswords = {
      admin: 'admin123',
      op_intake: 'intake123',
      op_process: 'process123',
      op_dom_gard: 'domestic123',
      op_treatment: 'treatment123',
      manager: 'viewer123'
    };
    const pass = distinctPasswords[username] || 'admin123';
    return await login(username, pass);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRoleAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
