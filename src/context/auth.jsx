import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // NEW: Loading state

  // Fetch user profile if token exists
  // This ensures persistent login for PWA/mobile: if a valid token exists, user stays logged in until logout
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoading(true);
    
    if (token) {
      getProfile()
        .then((data) => {
          if (data && data.username) {
            setUser(data);
          } else {
            setUser(null);
            // Invalid token, remove it
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          setUser(null);
          // Error fetching profile, remove token
          localStorage.removeItem("token");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Call this after login or profile update
  const refreshUser = async () => {
    const data = await getProfile();
    if (data && data.username) {
      setUser(data);
    } else {
      setUser(null);
      localStorage.removeItem("token");
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastDashboardRoute");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser, 
      refreshUser, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
