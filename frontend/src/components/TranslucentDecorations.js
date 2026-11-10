import React, { memo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

// Floating translucent background elements with explicit pixel coordinates.
// Strictly NO clutter at the top status bar/header area: only 2 subtle elements in the upper quadrant,
// and the rest tastefully placed along the sides to frame the centered content.
const DECORATIONS = [
  // Upper area (subtle accents away from the center logo)
  { id: "1", icon: "sparkles", x: W * 0.84, y: H * 0.08, size: 20, rotate: "22deg", color: "rgba(185, 241, 47, 0.22)", bg: "rgba(185, 241, 47, 0.08)" },
  { id: "2", icon: "key-outline", x: W * 0.08, y: H * 0.14, size: 22, rotate: "-20deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },

  // Mid canvas (framing the content on left & right margins)
  { id: "3", icon: "laptop-outline", x: W * 0.06, y: H * 0.28, size: 26, rotate: "15deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "4", icon: "phone-portrait-outline", x: W * 0.86, y: H * 0.32, size: 24, rotate: "-15deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "5", icon: "heart", x: W * 0.07, y: H * 0.44, size: 20, rotate: "10deg", color: "rgba(185, 241, 47, 0.18)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "6", icon: "glasses-outline", x: W * 0.85, y: H * 0.46, size: 24, rotate: "-18deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "7", icon: "shield-checkmark-outline", x: W * 0.07, y: H * 0.58, size: 22, rotate: "16deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "8", icon: "watch-outline", x: W * 0.85, y: H * 0.60, size: 22, rotate: "-12deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "9", icon: "headset-outline", x: W * 0.06, y: H * 0.72, size: 24, rotate: "-20deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "10", icon: "bag-outline", x: W * 0.86, y: H * 0.74, size: 24, rotate: "15deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "11", icon: "card-outline", x: W * 0.10, y: H * 0.86, size: 20, rotate: "10deg", color: "rgba(255, 255, 255, 0.10)", bg: "rgba(255, 255, 255, 0.04)" },
  { id: "12", icon: "heart-outline", x: W * 0.82, y: H * 0.88, size: 20, rotate: "-10deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.06)" },
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
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(TranslucentDecorations);
