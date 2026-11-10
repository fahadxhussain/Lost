import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS as C } from "../constants/theme";
import { formatDate } from "../utils/reports";

export function Icon({ name, size = 22, color = C.primary }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({ title, onPress, busy, disabled, secondary, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(busy || disabled) }}
      disabled={busy || disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        (busy || disabled) && { opacity: 0.5 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? C.primary : C.cardBg} />
      ) : (
        <Text style={[s.buttonText, secondary && { color: C.primary }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
export function Field({ label, style, ...props }) {
  return (
    <View style={[{ gap: 6, marginBottom: 14 }, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.textMuted}
        style={[
          s.input,
          props.multiline && { minHeight: 94, textAlignVertical: "top" },
        ]}
        {...props}
      />
    </View>
  );
}
export function Chips({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 5 }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[s.chip, value === option.value && s.chipActive]}
        >
          <Text
            style={[s.chipText, value === option.value && { color: C.cardBg }]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
export function Segments({ options, value, onChange }) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.track,
        borderRadius: 10,
        padding: 4,
      }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: value === option.value ? C.cardBg : C.track,
          }}
        >
          <Text
            style={{
              color: value === option.value ? C.text : C.textMuted,
              fontSize: 13,
              fontWeight: value === option.value ? "700" : "400",
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
export function Notice({ title, children, dark }) {
  return (
    <View style={[s.notice, dark && { backgroundColor: C.primary }]}>
      <Text style={[s.cardTitle, dark && { color: C.secondary }]}>{title}</Text>
      <Text style={[s.body, dark && { color: C.background }]}>{children}</Text>
    </View>
  );
}
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={s.notice}>
      <Text style={{ color: C.danger }}>{message}</Text>
      {onRetry && <Button title="Try again" onPress={onRetry} secondary />}
    </View>
  );
}
export function Empty({
  title,
  body,
  action,
  onAction,
  icon = "search-outline",
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={38} />
      </View>
      <Text style={s.heading}>{title}</Text>
      <Text style={[s.body, { textAlign: "center" }]}>{body}</Text>
      {action && <Button title={action} onPress={onAction} />}
    </View>
  );
}
export function Screen({ children, scroll = true }) {
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}
export function Photo({ uri, style }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      style={[s.photo, style]}
      onError={() => setFailed(true)}
    />
  ) : (
    <View style={[s.photo, s.placeholder, style]}>
      <Icon name="image-outline" size={32} />
      <Text style={s.label}>No photo</Text>
    </View>
  );
}
export function ReportCard({ report, onPress, compact, children }) {
  return (
    <View style={s.card}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPress}
        style={compact ? s.row : undefined}
      >
        <Photo
          uri={report.imageUrl}
          style={
            compact
              ? { width: 96, height: 96, borderRadius: 12 }
              : { height: 155 }
          }
        />
        <View style={{ flex: 1, gap: 7, padding: compact ? 0 : 14 }}>
          <Text style={s.eyebrow}>
            {report.type} · {report.status || "ACTIVE"}
          </Text>
          <Text style={s.cardTitle}>{report.title}</Text>
          <Text style={s.label}>
            {report.incidentLocation || "Location not specified"} ·{" "}
            {formatDate(report.incidentDate)}
          </Text>
        </View>
      </TouchableOpacity>
      {children}
    </View>
  );
}
export function Loading() {
  return (
    <ActivityIndicator style={{ margin: 32 }} size="large" color={C.primary} />
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.background },
  content: { padding: 24, gap: 16, paddingBottom: 32 },
  heading: { fontSize: 26, fontWeight: "700", color: C.text },
  body: { color: C.textMuted, fontSize: 14, lineHeight: 21 },
  label: { color: C.textMuted, fontSize: 12 },
  eyebrow: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  input: {
    backgroundColor: C.cardBg,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
  },
  button: {
    backgroundColor: C.primary,
    borderRadius: 26,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 8,
  },
  secondary: { backgroundColor: C.secondary },
  buttonText: { color: C.background, fontSize: 15, fontWeight: "700" },
  chip: {
    backgroundColor: C.soft,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 18,
  },
  chipActive: { backgroundColor: C.primary },
  chipText: { color: C.text, fontSize: 12, fontWeight: "600" },
  notice: { padding: 18, gap: 8, borderRadius: 20, backgroundColor: C.soft },
  empty: { alignItems: "center", gap: 16, paddingVertical: 36 },
  emptyIcon: { backgroundColor: C.soft, padding: 24, borderRadius: 32 },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: C.soft,
  },
  placeholder: { justifyContent: "center", alignItems: "center", gap: 6 },
});
