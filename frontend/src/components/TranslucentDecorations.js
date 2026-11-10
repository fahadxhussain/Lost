import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Floating translucent elements symbolizing lost campus items, community care, and compassion.
// The upper header area has exactly two subtle elements placed randomly; the rest are distributed below.
const ELEMENTS = [
  // Upper header area (exactly two random subtle elements)
  { id: "h1", icon: "sparkles", top: "8%", right: "8%", size: 22, rotate: "24deg", color: "rgba(185, 241, 47, 0.18)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "h2", icon: "key-outline", top: "18%", right: "6%", size: 26, rotate: "-18deg", color: "rgba(255, 255, 255, 0.13)", bg: "rgba(255, 255, 255, 0.05)" },

  // Mid & lower canvas elements
  { id: "3", icon: "phone-portrait-outline", top: "28%", left: "5%", size: 28, rotate: "12deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "4", icon: "shield-checkmark-outline", top: "33%", right: "12%", size: 26, rotate: "-10deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "5", icon: "laptop-outline", top: "39%", left: "8%", size: 30, rotate: "-15deg", color: "rgba(185, 241, 47, 0.14)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "6", icon: "heart", top: "43%", right: "7%", size: 24, rotate: "20deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "7", icon: "watch-outline", top: "48%", left: "16%", size: 26, rotate: "28deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "8", icon: "glasses-outline", top: "52%", right: "16%", size: 30, rotate: "-14deg", color: "rgba(185, 241, 47, 0.15)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "9", icon: "card-outline", top: "57%", left: "6%", size: 26, rotate: "-22deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "10", icon: "bag-outline", top: "62%", right: "8%", size: 28, rotate: "16deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "11", icon: "heart-outline", top: "67%", left: "14%", size: 24, rotate: "10deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "12", icon: "headset-outline", top: "71%", right: "14%", size: 30, rotate: "-25deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "13", icon: "book-outline", top: "76%", left: "7%", size: 26, rotate: "-8deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "14", icon: "wallet-outline", top: "80%", right: "7%", size: 26, rotate: "20deg", color: "rgba(185, 241, 47, 0.14)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "15", icon: "umbrella-outline", top: "85%", left: "16%", size: 28, rotate: "12deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "16", icon: "hand-left-outline", top: "88%", right: "18%", size: 24, rotate: "-15deg", color: "rgba(185, 241, 47, 0.15)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "17", icon: "gift-outline", top: "92%", left: "8%", size: 26, rotate: "22deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "18", icon: "people-outline", top: "96%", right: "10%", size: 28, rotate: "-6deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.07)" },
];

function TranslucentDecorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {ELEMENTS.map((el) => {
        const posStyle = {
          position: "absolute",
          top: el.top,
          left: el.left,
          right: el.right,
          transform: [{ rotate: el.rotate }],
        };
        return (
          <View
            key={el.id}
            style={[
              posStyle,
              styles.badge,
              {
                backgroundColor: el.bg,
                borderColor: el.color,
              },
            ]}
          >
            <Ionicons name={el.icon} size={el.size} color={el.color} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    padding: 9,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
});

export default memo(TranslucentDecorations);
