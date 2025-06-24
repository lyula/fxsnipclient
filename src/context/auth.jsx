import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Fetch user profile on mount (or after login)
  useEffect(() => {
    getProfile().then((data) => {
      if (data && data.username) setUser(data);
    });
  }, []);

  // Provide a way to refresh user data after profile update
  const refreshUser = async () => {
    const data = await getProfile();
    if (data && data.username) setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}