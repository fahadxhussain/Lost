import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 20 floating translucent elements symbolizing lost campus items, community care, and compassion.
const ELEMENTS = [
  { id: "1", icon: "heart", top: "4%", left: "8%", size: 26, rotate: "-15deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.08)" },
  { id: "2", icon: "key-outline", top: "7%", right: "12%", size: 28, rotate: "25deg", color: "rgba(255, 255, 255, 0.13)", bg: "rgba(255, 255, 255, 0.06)" },
  { id: "3", icon: "phone-portrait-outline", top: "14%", left: "4%", size: 30, rotate: "10deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "4", icon: "laptop-outline", top: "18%", right: "6%", size: 34, rotate: "-20deg", color: "rgba(185, 241, 47, 0.14)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "5", icon: "sparkles", top: "25%", left: "14%", size: 22, rotate: "45deg", color: "rgba(185, 241, 47, 0.20)", bg: "rgba(185, 241, 47, 0.08)" },
  { id: "6", icon: "shield-checkmark-outline", top: "28%", right: "16%", size: 28, rotate: "-8deg", color: "rgba(255, 255, 255, 0.14)", bg: "rgba(255, 255, 255, 0.06)" },
  { id: "7", icon: "watch-outline", top: "35%", left: "7%", size: 28, rotate: "30deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "8", icon: "glasses-outline", top: "39%", right: "8%", size: 32, rotate: "-15deg", color: "rgba(185, 241, 47, 0.15)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "9", icon: "card-outline", top: "45%", left: "18%", size: 26, rotate: "-25deg", color: "rgba(255, 255, 255, 0.13)", bg: "rgba(255, 255, 255, 0.06)" },
  { id: "10", icon: "bag-outline", top: "49%", right: "18%", size: 30, rotate: "18deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "11", icon: "heart-outline", top: "54%", left: "5%", size: 26, rotate: "12deg", color: "rgba(185, 241, 47, 0.18)", bg: "rgba(185, 241, 47, 0.08)" },
  { id: "12", icon: "headset-outline", top: "58%", right: "5%", size: 32, rotate: "-30deg", color: "rgba(255, 255, 255, 0.13)", bg: "rgba(255, 255, 255, 0.06)" },
  { id: "13", icon: "book-outline", top: "64%", left: "12%", size: 28, rotate: "-10deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "14", icon: "wallet-outline", top: "68%", right: "14%", size: 28, rotate: "22deg", color: "rgba(185, 241, 47, 0.14)", bg: "rgba(185, 241, 47, 0.06)" },
  { id: "15", icon: "umbrella-outline", top: "73%", left: "6%", size: 30, rotate: "15deg", color: "rgba(255, 255, 255, 0.12)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "16", icon: "hand-left-outline", top: "78%", right: "8%", size: 26, rotate: "-18deg", color: "rgba(185, 241, 47, 0.16)", bg: "rgba(185, 241, 47, 0.07)" },
  { id: "17", icon: "gift-outline", top: "83%", left: "16%", size: 28, rotate: "25deg", color: "rgba(255, 255, 255, 0.13)", bg: "rgba(255, 255, 255, 0.06)" },
  { id: "18", icon: "water-outline", top: "87%", right: "20%", size: 24, rotate: "-12deg", color: "rgba(255, 255, 255, 0.11)", bg: "rgba(255, 255, 255, 0.05)" },
  { id: "19", icon: "people-outline", top: "92%", left: "8%", size: 30, rotate: "-5deg", color: "rgba(185, 241, 47, 0.17)", bg: "rgba(185, 241, 47, 0.08)" },
  { id: "20", icon: "sparkles-outline", top: "95%", right: "10%", size: 26, rotate: "35deg", color: "rgba(255, 255, 255, 0.15)", bg: "rgba(255, 255, 255, 0.06)" },
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
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
});

export default memo(TranslucentDecorations);
