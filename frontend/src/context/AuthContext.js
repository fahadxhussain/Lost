import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authApi,
  TOKEN_KEY,
  setUnauthorizedHandler,
  errorMessage,
  userError,
} from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      throw userError(
        "We could not clear your saved sign-in on this device. Please try signing out again.",
      );
    }
    setUser(null);
    setToken(null);
    setRestoreError("");
  };
  const restore = async () => {
    setLoading(true);
    setRestoreError("");
    try {
      const saved = await AsyncStorage.getItem(TOKEN_KEY);
      if (saved) {
        const response = await authApi.getMe();
        const current = response.data?.data?.user;
        if (!current?.id)
          throw userError(
            "We could not restore your account details. Try again, or use another account.",
          );
        if (current.status !== "ACTIVE") await signOut();
        else {
          setToken(saved);
          setUser(current);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        try {
          await signOut();
        } catch (storageError) {
          setRestoreError(errorMessage(storageError));
        }
      } else setRestoreError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setSessionNotice(
        "Your session expired. Please sign in again to continue.",
      );
      setUser(null);
      setToken(null);
      try {
        await signOut();
      } catch (error) {
        setRestoreError(errorMessage(error));
      }
    });
    restore();
    return () => setUnauthorizedHandler(undefined);
  }, []);
  const acceptSession = async (session) => {
    if (
      typeof session?.token !== "string" ||
      !session.token.trim() ||
      !session?.user?.id ||
      session.user.status !== "ACTIVE"
    )
      throw userError(
        "We could not complete sign in. Please sign in to your verified account again.",
      );
    try {
      await AsyncStorage.setItem(TOKEN_KEY, session.token);
    } catch {
      throw userError(
        "We could not save your sign-in on this device. Check that device storage is available, then try again.",
      );
    }
    setSessionNotice("");
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
        sessionNotice,
        useAnotherAccount: async () => {
          try {
            await signOut();
            await restore();
          } catch (error) {
            setRestoreError(errorMessage(error));
          }
        },
        restore,
        acceptSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
