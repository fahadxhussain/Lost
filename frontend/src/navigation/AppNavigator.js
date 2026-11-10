import React, { useEffect, useState } from "react";
import { StatusBar, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Pressable from "../components/TouchTarget";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../services/api";
import {
  Button,
  ErrorNotice,
  Icon,
  Loading,
  Screen,
  s,
} from "../components/ui";
import { COLORS as C } from "../constants/theme";
import { AuthScreen, OtpScreen, WelcomeScreen } from "../screens/AuthScreens";
import FeedScreen from "../screens/FeedScreen";
import ReportScreen from "../screens/ReportScreen";
import {
  DetailsScreen,
  MatchesScreen,
  MyItemsScreen,
} from "../screens/ItemScreens";
import NotificationsScreen from "../screens/NotificationsScreen";
import { ChatScreen, ConversationsScreen } from "../screens/ChatScreens";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
function Header({ navigation, route, options, back }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const update = async () => {
      try {
        const response = await notificationsApi.getUnreadCount();
        if (active) setCount(response.data.data.unreadCount);
      } catch {
        /* Screen handles recoverable errors. */
      }
    };
    update();
    const timer = setInterval(update, 30000);
    const focus = navigation.addListener("focus", update);
    return () => {
      active = false;
      clearInterval(timer);
      focus();
    };
  }, [user, navigation]);
  return (
    <View
      style={{
        backgroundColor: C.primary,
        paddingTop: insets.top + 10,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Exactly two translucent decorative elements in the header */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -10,
          top: -10,
          width: 76,
          height: 76,
          borderRadius: 38,
          backgroundColor: "rgba(255, 255, 255, 0.06)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.10)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="sparkles" size={28} color="rgba(185, 241, 47, 0.18)" />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "42%",
          bottom: -16,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "rgba(185, 241, 47, 0.05)",
          borderWidth: 1,
          borderColor: "rgba(185, 241, 47, 0.10)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="heart" size={20} color="rgba(185, 241, 47, 0.15)" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigation.goBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFEFA" />
          </Pressable>
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.secondary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="scan-outline" size={20} color={C.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              s.cardTitle,
              {
                color: "#FFFEFA",
                fontSize: route.name === "Feed" ? 22 : 18,
                fontWeight: "700",
              },
            ]}
          >
            {options.title || route.name}
          </Text>
          {route.name === "Feed" && (
            <Text
              style={[
                s.eyebrow,
                { color: C.secondary, marginTop: 2, letterSpacing: 0.8 },
              ]}
            >
              YOUR CAMPUS · CUI
            </Text>
          )}
        </View>
        {user && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${count} unread`}
            onPress={() => navigation.navigate("Notifications")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFEFA" />
            {count > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: 2,
                  top: 2,
                  backgroundColor: C.secondary,
                  borderRadius: 9,
                  minWidth: 16,
                  height: 16,
                  paddingHorizontal: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: C.primary,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  {count > 99 ? "99+" : count}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
function MainTabs() {
  const insets = useSafeAreaInsets();
  const icons = {
    Feed: "grid-outline",
    Watchlist: "radio-outline",
    Report: "add",
    MyItems: "file-tray-outline",
    Profile: "person-outline",
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        header: (props) => <Header {...props} />,
        sceneStyle: { backgroundColor: C.background },
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <Pressable {...props} />,
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.cardBg,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 76 + Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIconStyle: { width: 48, height: 34 },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, marginTop: 4 },
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: 48,
              height: 34,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              backgroundColor:
                route.name === "Report"
                  ? C.secondary
                  : focused
                    ? C.primary
                    : "transparent",
            }}
          >
            <Icon
              name={icons[route.name]}
              size={22}
              color={
                route.name === "Report"
                  ? C.primary
                  : focused
                    ? C.background
                    : color
              }
            />
          </View>
        ),
      })}
    >
      <Tabs.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: "Lost & Found", tabBarLabel: "Feed" }}
      />
      <Tabs.Screen
        name="Watchlist"
        component={MyItemsScreen}
        options={{ title: "Active watches", tabBarLabel: "Watchlist" }}
      />
      <Tabs.Screen
        name="Report"
        component={ReportScreen}
        options={{ title: "Report an item" }}
      />
      <Tabs.Screen
        name="MyItems"
        component={MyItemsScreen}
        options={{ title: "My items" }}
      />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
export default function AppNavigator() {
  const { user, loading, restoreError, restore, useAnotherAccount } = useAuth();
  if (loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (restoreError)
    return (
      <Screen>
        <ErrorNotice message={restoreError} onRetry={restore} />
        <Button title="Use another account" onPress={useAnotherAccount} />
      </Screen>
    );
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: C.background,
          primary: C.primary,
          card: C.cardBg,
          text: C.text,
          border: C.border,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          header: (props) => <Header {...props} />,
          contentStyle: { backgroundColor: C.background },
        }}
      >
        {user ? (
          <Stack.Group navigationKey="student">
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Details"
              component={DetailsScreen}
              options={{ title: "Item details" }}
            />
            <Stack.Screen
              name="EditReport"
              component={ReportScreen}
              options={{ title: "Edit report" }}
            />
            <Stack.Screen
              name="Matches"
              component={MatchesScreen}
              options={{ title: "Potential matches" }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen
              name="Conversations"
              component={ConversationsScreen}
              options={{ title: "Messages" }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params.name || "Conversation",
              })}
            />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey="guest">
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={AuthScreen}
              options={{ title: "Create account" }}
            />
            <Stack.Screen
              name="Login"
              component={AuthScreen}
              options={{ title: "Sign in" }}
            />
            <Stack.Screen
              name="VerifyOtp"
              component={OtpScreen}
              options={{ title: "Verify your email" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
