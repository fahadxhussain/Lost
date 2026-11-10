import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardVisible } from "../hooks/useKeyboardVisible";
import Pressable from "./TouchTarget";
import { Icon } from "./ui";
import { COLORS as C } from "../constants/theme";

const ICONS = {
  Feed: ["grid-outline", "grid"],
  Watchlist: ["radio-outline", "radio"],
  Messages: ["chatbubbles-outline", "chatbubbles"],
  MyItems: ["file-tray-outline", "file-tray"],
  Profile: ["person-outline", "person"],
};
const CUTOUT_SIZE = 82;

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const position = useRef(new Animated.Value(0)).current;
  const previousWidth = useRef(0);
  const usableWidth = Math.max(0, width - insets.left - insets.right);
  const target =
    insets.left +
    (usableWidth / state.routes.length) * (state.index + 0.5) -
    CUTOUT_SIZE / 2;
  const activeRoute = state.routes[state.index];

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!width) return;
    // Snap on first layout or rotation; animate subsequent tab changes only.
    if (reduceMotion || previousWidth.current !== width) {
      previousWidth.current = width;
      position.setValue(target);
      return;
    }
    const animation = Animated.spring(position, {
      toValue: target,
      damping: 22,
      stiffness: 240,
      mass: 0.85,
      overshootClamping: true,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [target, width, reduceMotion, position]);

  if (keyboardVisible) return null;
  return (
    <View
      testID="floating-tab-bar"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          height: 84 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View pointerEvents="none" style={styles.background} />
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          testID="floating-tab-cutout"
          style={[styles.cutout, { transform: [{ translateX: position }] }]}
        />
      )}
      <View
        style={[
          styles.row,
          { paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title || route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              testID={options.tabBarButtonTestID}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={styles.tab}
            >
              <View
                style={[
                  styles.iconSlot,
                  focused && width > 0 && { opacity: 0 },
                ]}
              >
                <Icon
                  name={ICONS[route.name]?.[0] || "ellipse-outline"}
                  color={C.textMuted}
                  size={23}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, focused && styles.activeLabel]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="floating-tab-selector"
          style={[
            styles.selectorTrack,
            { transform: [{ translateX: position }] },
          ]}
        >
          <View style={styles.bubble}>
            <Icon
              name={ICONS[activeRoute.name]?.[1] || "ellipse"}
              color={C.primary}
              size={25}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.background,
    overflow: "visible",
    zIndex: 100,
    elevation: 8,
  },
  background: {
    position: "absolute",
    top: 12,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: "0px -4px 16px rgba(11, 48, 72, 0.08)",
  },
  cutout: {
    position: "absolute",
    left: 0,
    top: -19,
    width: CUTOUT_SIZE,
    height: CUTOUT_SIZE,
    borderRadius: CUTOUT_SIZE / 2,
    backgroundColor: C.background,
  },
  row: { flex: 1, flexDirection: "row", paddingTop: 20 },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconSlot: { height: 26, alignItems: "center", justifyContent: "center" },
  label: {
    color: C.textMuted,
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 2,
    fontWeight: "500",
  },
  activeLabel: { color: C.primary, fontWeight: "700" },
  selectorTrack: {
    position: "absolute",
    left: 0,
    top: -6,
    width: CUTOUT_SIZE,
    alignItems: "center",
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.secondary,
    borderWidth: 3,
    borderColor: C.primary,
    elevation: 5,
    boxShadow: "0px 4px 10px #0B30482B",
  },
});
