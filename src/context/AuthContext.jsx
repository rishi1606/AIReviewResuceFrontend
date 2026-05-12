import React, { createContext, useContext, useState, useEffect } from "react";
import { loginUser, getMe, registerUser } from "../api/apiClient";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("rr_token");
      if (token) {
        try {
          const res = await getMe();
          setCurrentUser(res.data);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem("rr_token");
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await loginUser(email, password);
    localStorage.setItem("rr_token", res.data.token);
    setCurrentUser(res.data.user);
    setIsAuthenticated(true);
    return res.data.user;
  };

  const register = async (body) => {
    const res = await registerUser(body);
    localStorage.setItem("rr_token", res.data.token);
    setCurrentUser(res.data.user);
    setIsAuthenticated(true);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("rr_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (fields) => {
    setCurrentUser(prev => ({ ...prev, ...fields }));
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
