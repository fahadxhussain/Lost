import React, { forwardRef, useState } from "react";
import { Platform, Pressable } from "react-native";
import { COLORS as C } from "../constants/theme";

let Haptics = null;
try {
  Haptics = require("expo-haptics");
} catch {}

// Keep feedback consistent for tabs, buttons, filters, and tappable cards.
const TouchTarget = forwardRef(function TouchTarget(
  {
    style,
    onPress,
    onHoverIn,
    onHoverOut,
    disabled,
    haptic = "selection",
    hoverEffect,
    pressOpacity,
    ...props
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...props}
      ref={ref}
      disabled={disabled}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      onPress={(event) => {
        if (disabled || !onPress) return;
        if (Platform.OS !== "web" && Haptics) {
          const feedback =
            haptic === "light"
              ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              : Haptics.selectionAsync();
          // Unsupported hardware or system settings must never block an action.
          feedback.catch(() => {});
        }
        return onPress(event);
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        !disabled &&
          hovered && {
            opacity: 0.86,
            ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
          },
        !disabled && state.pressed && { opacity: 0.7 },
      ]}
      android_ripple={props.android_ripple || { color: C.primary + "14" }}
    />
  );
});

export default TouchTarget;
