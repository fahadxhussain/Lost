import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authApi,
  TOKEN_KEY,
  setUnauthorizedHandler,
  errorMessage,
} from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const signOut = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };
  const restore = async () => {
    setLoading(true);
    setRestoreError("");
    try {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) {
        const response = await authApi.getMe();
        const current = response.data.data.user;
        if (current.status !== "ACTIVE") await signOut();
        else {
          setToken(saved);
          setUser(current);
        }
      }
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) await signOut();
      else setRestoreError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    restore();
    return () => setUnauthorizedHandler(undefined);
  }, []);
  const acceptSession = async (session) => {
    if (!session.token || !session.user)
      throw new Error("Please sign in to your verified account.");
    await AsyncStorage.setItem(TOKEN_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        restoreError,
        restore,
        acceptSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
