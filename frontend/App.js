import React from "react";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants/theme";

export default function App() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: COLORS.background,
        }}
      >
        {fontError ? (
          <Text style={{ color: COLORS.danger }}>
            Unable to load app icons. Please restart the app.
          </Text>
        ) : (
          <ActivityIndicator
            color={COLORS.primary}
            accessibilityLabel="Loading app icons"
          />
        )}
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <KeyboardProvider preload={false} statusBarTranslucent>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
