import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import Pressable from "./TouchTarget";
import { COLORS as C } from "../constants/theme";

export default function AnimatedTabButton({ children, style, ...props }) {
  const selected = !!props["aria-selected"];
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
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
    if (reduceMotion) {
      progress.setValue(selected ? 1 : 0);
      return;
    }
    const animation = Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      damping: 17,
      stiffness: 210,
      mass: 0.7,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, reduceMotion, progress]);
  return (
    <Pressable {...props} style={[style, styles.target]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.arc,
          {
            opacity: progress,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          alignItems: "center",
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -6],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.06],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { justifyContent: "center", overflow: "visible" },
  arc: {
    position: "absolute",
    top: -7,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: C.secondary,
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    backgroundColor: C.soft,
  },
});
