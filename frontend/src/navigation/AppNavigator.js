import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Pressable from "../components/TouchTarget";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../services/api";
import {
  Button,
  ErrorNotice,
  Icon,
  Screen,
  SkeletonList,
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
import FloatingTabBar from "../components/FloatingTabBar";
import ReportChoiceScreen from "../screens/ReportChoiceScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";

const navigationRef = createNavigationContainerRef();
const TAB_ITEMS = [
  { name: "Feed", options: { title: "Lost & Found", tabBarLabel: "Feed" } },
  {
    name: "Watchlist",
    options: { title: "Active watches", tabBarLabel: "Watchlist" },
  },
  { name: "Messages", options: { title: "Messages" } },
  {
    name: "MyItems",
    options: { title: "My Reports", tabBarLabel: "My Reports" },
  },
  { name: "Profile", options: { title: "Profile" } },
];
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
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      {/* Subtle lost item accents in header background */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -8,
          top: -8,
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="key-outline"
          size={24}
          color="rgba(255, 255, 255, 0.16)"
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "44%",
          bottom: -14,
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.07)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="wallet-outline"
          size={20}
          color="rgba(255, 255, 255, 0.14)"
        />
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
function MainTabs({ navigation }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          header: (props) => <Header {...props} />,
          headerStyle: { backgroundColor: C.primary },
          sceneStyle: { backgroundColor: C.background },
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 84 + Math.max(insets.bottom, 8),
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
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
          name="Messages"
          component={ConversationsScreen}
          options={{ title: "Messages" }}
        />
        <Tabs.Screen
          name="MyItems"
          component={MyItemsScreen}
          options={{ title: "My Reports", tabBarLabel: "My Reports" }}
        />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
      {!keyboardVisible && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Report"
          haptic="light"
          onPress={() => navigation.navigate("Report")}
          style={[navStyles.fab, { bottom: 100 + Math.max(insets.bottom, 8) }]}
        >
          <Icon name="add" size={24} />
          <Text style={navStyles.fabText}>Report</Text>
        </Pressable>
      )}
    </View>
  );
}
export default function AppNavigator() {
  const { user, loading, restoreError, restore, useAnotherAccount } = useAuth();
  if (loading)
    return (
      <Screen>
        <SkeletonList count={6} variant="report" />
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
      ref={navigationRef}
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
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{
            header: (props) => <Header {...props} />,
            headerStyle: { backgroundColor: C.primary },
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
                name="Report"
                component={ReportChoiceScreen}
                options={{ title: "Report" }}
              />
              <Stack.Screen
                name="CreateReport"
                component={ReportScreen}
                options={({ route }) => ({
                  title:
                    route.params?.type === "LOST"
                      ? "Report a lost item"
                      : "Report a found item",
                })}
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
                  title: route.params?.name || "Conversation",
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
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ title: "Reset password" }}
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
        {user && <StackTabBar navigationRef={navigationRef} />}
      </View>
    </NavigationContainer>
  );
}
// Shows the same floating tab bar on every screen outside the tab navigator.
function StackTabBar({ navigationRef }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState({ screen: "Main", tab: 0 });
  useEffect(() => {
    const update = () => {
      if (navigationRef.isReady && !navigationRef.isReady()) return;
      const root = navigationRef.getRootState?.();
      if (!root) return;
      const main = root.routes.find((route) => route.name === "Main");
      setCurrent({
        screen: root.routes[root.index]?.name,
        tab: main?.state?.index ?? 0,
      });
    };
    update();
    return navigationRef.addListener?.("state", update);
  }, [navigationRef]);
  if (current.screen === "Main") return null;
  const state = {
    index: current.tab,
    routes: TAB_ITEMS.map(({ name }) => ({ key: name, name })),
  };
  const descriptors = Object.fromEntries(
    TAB_ITEMS.map(({ name, options }) => [name, { options }]),
  );
  const tabNavigation = {
    emit: () => ({ defaultPrevented: false }),
    navigate: (name) => navigationRef.navigate("Main", { screen: name }),
  };
  return (
    <View
      style={{ height: 84 + Math.max(insets.bottom, 8) }}
      pointerEvents="box-none"
    >
      <FloatingTabBar
        state={state}
        descriptors={descriptors}
        navigation={tabNavigation}
      />
    </View>
  );
}
const navStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 28,
    backgroundColor: C.secondary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 6,
    boxShadow: "0px 4px 14px #0B304825",
  },
  fabText: { color: C.primary, fontSize: 15, fontWeight: "700" },
});
