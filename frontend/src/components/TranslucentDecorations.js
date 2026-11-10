import React, { memo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

// Exactly 4 floating translucent elements randomly spread across the canvas (never in a line).
const DECORATIONS = [
  // 1. Top-left (just below the header) - equal to key size
  {
    id: "1",
    icon: "laptop-outline",
    x: W * 0.08,
    y: H * 0.13,
    size: 36,
    rotate: "12deg",
    color: "rgba(255, 255, 255, 0.14)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
  // 2. Top-right (just below the header)
  {
    id: "2",
    icon: "glasses-outline",
    x: W * 0.78,
    y: H * 0.13,
    size: 36,
    rotate: "-15deg",
    color: "rgba(255, 255, 255, 0.14)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
  // 3. Mid-left
  {
    id: "3",
    icon: "key-outline",
    x: W * 0.07,
    y: H * 0.42,
    size: 36,
    rotate: "-18deg",
    color: "rgba(255, 255, 255, 0.14)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
  // 4. Lower-mid right
  {
    id: "4",
    icon: "wallet-outline",
    x: W * 0.84,
    y: H * 0.65,
    size: 30,
    rotate: "16deg",
    color: "rgba(255, 255, 255, 0.14)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
];

function TranslucentDecorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {DECORATIONS.map((el) => (
        <View
          key={el.id}
          style={[
            styles.badge,
            {
              left: el.x,
              top: el.y,
              backgroundColor: el.bg,
              borderColor: el.color,
              transform: [{ rotate: el.rotate }],
            },
          ]}
        >
          <Ionicons name={el.icon} size={el.size} color={el.color} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    padding: 9,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(TranslucentDecorations);
