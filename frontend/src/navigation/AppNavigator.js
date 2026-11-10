import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
        backgroundColor: C.cardBg,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {back ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigation.goBack}
            style={{ padding: 10 }}
          >
            <Icon name="arrow-back" />
          </TouchableOpacity>
        ) : (
          <View
            style={{
              backgroundColor: C.secondary,
              padding: 11,
              borderRadius: 22,
            }}
          >
            <Icon name="scan-outline" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[s.cardTitle, { fontSize: route.name === "Feed" ? 23 : 19 }]}
          >
            {options.title || route.name}
          </Text>
          {route.name === "Feed" && (
            <Text style={[s.eyebrow, { marginTop: 3 }]}>YOUR CAMPUS · CUI</Text>
          )}
        </View>
        {user && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${count} unread`}
            onPress={() => navigation.navigate("Notifications")}
            style={{ padding: 10 }}
          >
            <Icon name="notifications-outline" />
            {count > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  backgroundColor: C.secondary,
                  borderRadius: 10,
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: C.primary, fontSize: 10 }}>
                  {count > 99 ? "99+" : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.cardBg,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 8,
          height: 72 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 10, paddingBottom: 8 },
        tabBarIcon: ({ focused }) => (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor:
                route.name === "Report"
                  ? C.secondary
                  : focused
                    ? C.primary
                    : C.cardBg,
            }}
          >
            <Icon
              name={icons[route.name]}
              color={
                focused && route.name !== "Report" ? C.background : C.primary
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
  const { user, loading, restoreError, restore, signOut } = useAuth();
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
        <Button
          title="Use another account"
          onPress={async () => {
            await signOut();
            await restore();
          }}
        />
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
