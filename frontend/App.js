import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cardBg} />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
