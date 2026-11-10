import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon, Screen, s } from "../components/ui";
import Pressable from "../components/TouchTarget";
import { COLORS as C } from "../constants/theme";

export default function ReportChoiceScreen({ navigation }) {
  return (
    <Screen>
      <Text style={s.eyebrow}>LET YOUR CAMPUS HELP</Text>
      <Text style={s.heading}>What would you like to report?</Text>
      <Text style={s.body}>
        Choose one to start. We’ll guide you through the details.
      </Text>
      {[
        {
          type: "LOST",
          icon: "search-outline",
          title: "I lost something",
          body: "Describe what’s missing and where you last had it.",
        },
        {
          type: "FOUND",
          icon: "hand-left-outline",
          title: "I found something",
          body: "Share what you found so it can make its way home.",
        },
      ].map((choice) => (
        <Pressable
          key={choice.type}
          accessibilityRole="button"
          accessibilityLabel={choice.title}
          onPress={() =>
            navigation.navigate("CreateReport", { type: choice.type })
          }
          style={styles.choice}
        >
          <View style={styles.icon}>
            <Icon name={choice.icon} size={30} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.cardTitle}>{choice.title}</Text>
            <Text style={s.body}>{choice.body}</Text>
          </View>
          <Icon name="chevron-forward" />
        </Pressable>
      ))}
      <Text style={s.label}>
        A category and description are required. Adding a photo is optional.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  choice: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    minHeight: 144,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  icon: { backgroundColor: C.secondary, padding: 13, borderRadius: 20 },
});
