import React, { memo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

// Exactly 4 floating translucent elements randomly spread across the canvas (never in a line).
const DECORATIONS = [
  // 1. Top-right quadrant
  {
    id: "1",
    icon: "glasses-outline",
    x: W * 0.80,
    y: H * 0.13,
    size: 26,
    rotate: "-15deg",
    color: "rgba(255, 255, 255, 0.13)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
  // 2. Upper-mid left quadrant
  {
    id: "2",
    icon: "key-outline",
    x: W * 0.08,
    y: H * 0.32,
    size: 26,
    rotate: "-18deg",
    color: "rgba(255, 255, 255, 0.13)",
    bg: "rgba(255, 255, 255, 0.05)",
  },
  // 3. Lower-mid right quadrant
  {
    id: "3",
    icon: "heart",
    x: W * 0.85,
    y: H * 0.58,
    size: 22,
    rotate: "14deg",
    color: "rgba(185, 241, 47, 0.18)",
    bg: "rgba(185, 241, 47, 0.07)",
  },
  // 4. Bottom left quadrant
  {
    id: "4",
    icon: "laptop-outline",
    x: W * 0.14,
    y: H * 0.80,
    size: 28,
    rotate: "-12deg",
    color: "rgba(255, 255, 255, 0.12)",
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
