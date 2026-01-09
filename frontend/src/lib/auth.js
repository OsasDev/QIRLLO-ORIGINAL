import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qirllo_token');
    const savedUser = localStorage.getItem('qirllo_user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('qirllo_token');
        localStorage.removeItem('qirllo_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('qirllo_token', access_token);
    localStorage.setItem('qirllo_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await authApi.register(data);
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('qirllo_token', access_token);
    localStorage.setItem('qirllo_user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('qirllo_token');
    localStorage.removeItem('qirllo_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
