import React, { memo, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HeaderHeightContext } from "@react-navigation/elements";
import { COLORS as C } from "../constants/theme";
import { formatDate } from "../utils/reports";
import Pressable from "./TouchTarget";

export function Icon({ name, size = 22, color = C.primary }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  busy,
  disabled,
  secondary,
  style,
  textStyle,
  rightIcon,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(busy || disabled) }}
      disabled={busy || disabled}
      onPress={onPress}
      haptic="light"
      style={[
        s.button,
        secondary && s.secondary,
        (busy || disabled) && { opacity: 0.5 },
        style,
      ]}
      android_ripple={{ color: secondary ? C.soft : C.primaryLight }}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? C.primary : C.cardBg} />
      ) : rightIcon ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Text
            style={[s.buttonText, secondary && { color: C.primary }, textStyle]}
          >
            {title}
          </Text>
          {rightIcon}
        </View>
      ) : (
        <Text
          style={[s.buttonText, secondary && { color: C.primary }, textStyle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export const Field = React.forwardRef(function Field(
  {
    label,
    style,
    inputStyle,
    error,
    hint,
    rightAccessory,
    placeholderTextColor,
    ...props
  },
  ref,
) {
  const resolvedPlaceholderColor = placeholderTextColor || C.placeholder;
  return (
    <View style={[{ gap: 6, marginBottom: 14 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      {rightAccessory ? (
        <View
          style={[
            s.input,
            {
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: Platform.OS === "ios" ? 12 : 6,
              paddingRight: 10,
            },
            error && { borderColor: C.danger },
            inputStyle,
          ]}
        >
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            accessibilityHint={error || hint}
            aria-invalid={!!error}
            placeholderTextColor={resolvedPlaceholderColor}
            style={[
              {
                flex: 1,
                color: C.text,
                fontSize: 14,
                paddingVertical: Platform.OS === "ios" ? 2 : 6,
              },
              props.multiline && { minHeight: 94, textAlignVertical: "top" },
            ]}
            {...props}
          />
          {rightAccessory}
        </View>
      ) : (
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          aria-invalid={!!error}
          placeholderTextColor={resolvedPlaceholderColor}
          style={[
            s.input,
            props.multiline && { minHeight: 94, textAlignVertical: "top" },
            error && { borderColor: C.danger },
            inputStyle,
          ]}
          {...props}
        />
      )}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[s.label, { color: C.danger }]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={s.label}>{hint}</Text>
      ) : null}
    </View>
  );
});
export function Chips({ options, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 5 }}
    >
      {options.map((option) => (
        <Pressable
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
        </Pressable>
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
        <Pressable
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
        </Pressable>
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
export function SuccessNotice({ message }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={s.successNotice}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="checkmark-circle" size={20} color={C.success} />
        <Text style={[s.cardTitle, { color: C.success, flex: 1 }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={s.errorNotice}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="alert-circle" size={20} color={C.danger} />
        <Text style={[s.cardTitle, { color: C.danger, flex: 1 }]}>
          {message}
        </Text>
      </View>
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
export function Screen({
  children,
  scroll = true,
  contentInsetAdjustmentBehavior = "automatic",
  keyboardVerticalOffset,
  contentStyle,
}) {
  const headerHeight = React.useContext(HeaderHeightContext) || 0;
  return (
    <KeyboardAvoidingView
      style={s.page}
      // Android's resize mode already supplies the keyboard-sized viewport.
      enabled={Platform.OS === "ios"}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? (keyboardVerticalOffset ?? headerHeight) : 0
      }
    >
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}
// A native modal needs its own inset measurements, independent of the stack header.
export function ModalScreen({ children }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.page} edges={["top", "bottom", "left", "right"]}>
        <Screen
          contentInsetAdjustmentBehavior="never"
          keyboardVerticalOffset={0}
        >
          {children}
        </Screen>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
export function ListSeparator() {
  return <View style={s.listSeparator} />;
}
export function CompactSeparator() {
  return <View style={s.compactSeparator} />;
}
export const itemKey = (item) => item.id;
export const matchKey = (item) => item.matchId;
export const DataList = React.forwardRef(function DataList(
  {
    estimatedItemSize = 140,
    ListHeaderComponent,
    ListFooterComponent,
    ...props
  },
  ref,
) {
  return (
    <View style={s.listFrame}>
      <FlashList
        ref={ref}
        estimatedItemSize={estimatedItemSize}
        keyExtractor={itemKey}
        contentContainerStyle={s.listContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          ListHeaderComponent ? (
            <View style={s.listHeader}>{ListHeaderComponent}</View>
          ) : null
        }
        ListFooterComponent={
          ListFooterComponent ? (
            <View style={s.listFooter}>{ListFooterComponent}</View>
          ) : null
        }
        {...props}
      />
    </View>
  );
});
export const Photo = memo(function Photo({ uri, style }) {
  const [failedUri, setFailedUri] = React.useState(null);
  const handleError = useCallback(() => setFailedUri(uri), [uri]);
  return uri && failedUri !== uri ? (
    <Image
      source={uri}
      recyclingKey={uri}
      cachePolicy="memory-disk"
      contentFit="cover"
      style={[s.photo, style]}
      onError={handleError}
    />
  ) : (
    <View style={[s.photo, s.placeholder, style]}>
      <Icon name="image-outline" size={32} />
      <Text style={s.label}>No photo</Text>
    </View>
  );
});
export function reportCardProps(report) {
  return {
    id: report.id,
    type: report.type,
    status: report.status || "ACTIVE",
    title: report.title,
    imageUrl: report.imageUrl,
    incidentLocation: report.incidentLocation,
    incidentDate: report.incidentDate,
  };
}
export const ReportCard = memo(function ReportCard({
  id,
  type,
  status,
  title,
  imageUrl,
  incidentLocation,
  incidentDate,
  onPress,
  compact,
  children,
}) {
  const handlePress = useCallback(() => onPress(id), [id, onPress]);
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        style={compact ? s.row : undefined}
      >
        <Photo uri={imageUrl} style={compact ? s.compactPhoto : s.cardPhoto} />
        <View style={compact ? s.compactCardBody : s.cardBody}>
          <Text style={s.eyebrow}>
            {type} · {status}
          </Text>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.label}>
            {incidentLocation || "Location not specified"} ·{" "}
            {formatDate(incidentDate)}
          </Text>
        </View>
      </Pressable>
      {children}
    </View>
  );
});
export function Loading() {
  return (
    <ActivityIndicator style={{ margin: 32 }} size="large" color={C.primary} />
  );
}
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.background },
  content: { padding: 24, gap: 16, paddingBottom: 32 },
  listFrame: { flex: 1, minHeight: 2 },
  listContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 108 },
  listHeader: { marginBottom: 16 },
  listFooter: { marginTop: 16 },
  listSeparator: { height: 16 },
  compactSeparator: { height: 12 },
  compactPhoto: { width: 96, height: 96, borderRadius: 12 },
  cardPhoto: { height: 155 },
  compactCardBody: { flex: 1, gap: 7 },
  cardBody: { flex: 1, gap: 7, padding: 14 },
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
  successNotice: {
    padding: 16,
    gap: 6,
    borderRadius: 16,
    backgroundColor: C.successBg,
    borderWidth: 1,
    borderColor: C.success,
  },
  errorNotice: {
    padding: 16,
    gap: 6,
    borderRadius: 16,
    backgroundColor: "#FDEAED",
    borderWidth: 1,
    borderColor: C.danger,
  },
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
