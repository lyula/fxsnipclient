import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Fetch user profile if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getProfile().then((data) => {
        if (data && data.username) setUser(data);
        else setUser(null);
      });
    } else {
      setUser(null);
    }
  }, []);

  // Call this after login or profile update
  const refreshUser = async () => {
    const data = await getProfile();
    if (data && data.username) setUser(data);
    else setUser(null);
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