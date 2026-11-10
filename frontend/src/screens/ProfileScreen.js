import React, { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import {
  Button,
  ErrorNotice,
  SuccessNotice,
  Field,
  Icon,
  Notice,
  Screen,
  s,
} from "../components/ui";
import Pressable from "../components/TouchTarget";
import { authApi, errorMessage, userError } from "../services/api";
import { useSubmission } from "../hooks/useSubmission";
import { LIMITS, photoError } from "../utils/validation";
import { COLORS as C } from "../constants/theme";

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const [name, setName] = useState(user.name || "");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [failedAvatar, setFailedAvatar] = useState(null);
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [retryAt]);
  const { busy, run } = useSubmission();
  const dirty = name.trim() !== (user.name || "") || !!photo;
  const uri = photo?.uri || user.avatarUrl;
  async function pickPhoto() {
    return run(async () => {
      setError("");
      setNotice("");
      setSettings(false);
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setSettings(true);
          throw userError(
            "Allow photo access in device settings to choose a profile photo.",
          );
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (result.canceled) return;
        const asset = result.assets?.[0];
        const invalid = photoError(asset, Platform.OS);
        if (invalid) throw userError(invalid);
        setPhoto(asset);
      } catch (err) {
        setError(
          err.userFacing
            ? err.message
            : "We could not open that photo. Try choosing it again.",
        );
      }
    });
  }
  async function save() {
    if (!name.trim() || name.trim().length > LIMITS.name)
      return setNameError("Enter a username between 1 and 100 characters.");
    if (!dirty) return;
    return run(async () => {
      setError("");
      setNotice("");
      try {
        let payload = { name: name.trim() };
        if (photo) {
          payload = new FormData();
          payload.append("name", name.trim());
          payload.append(
            "avatar",
            Platform.OS === "web"
              ? photo.file
              : {
                  uri: photo.uri,
                  name:
                    photo.fileName ||
                    `avatar.${photo.mimeType === "image/png" ? "png" : photo.mimeType === "image/webp" ? "webp" : "jpg"}`,
                  type: photo.mimeType,
                },
          );
        }
        const response = await authApi.updateProfile(payload);
        const updated = response.data?.data?.user;
        if (updated?.id !== user.id)
          throw userError(
            "We could not confirm the update. Refresh your profile before saving again.",
          );
        updateUser(updated);
        setName(updated.name || "");
        setPhoto(null);
        setNotice("Profile updated successfully! Your changes are live.");
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  async function sendResetLink() {
    if (Date.now() < retryAt) return;
    return run(async () => {
      setError("");
      try {
        await authApi.forgotPassword(user.email);
        setResetSent(true);
        setRetryAt(Date.now() + 60000);
        setRemaining(60);
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen contentStyle={{ paddingBottom: 112 }}>
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          disabled={busy}
          onPress={pickPhoto}
          style={styles.avatar}
        >
          {uri && failedAvatar !== uri ? (
            <Image
              source={uri}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setFailedAvatar(uri)}
            />
          ) : (
            <Text style={styles.initial}>
              {(user.name || "S").slice(0, 1).toUpperCase()}
            </Text>
          )}
          <View style={styles.camera}>
            <Icon name="camera" size={17} />
          </View>
        </Pressable>
        <Text style={styles.heroName}>{user.name || "Your profile"}</Text>
        <Text style={styles.heroSubtitle}>Your campus. Your identity.</Text>
        <Button
          title={uri ? "Change photo" : "Add profile photo"}
          secondary
          disabled={busy}
          onPress={pickPhoto}
        />
      </View>
      <Text style={s.eyebrow}>PERSONAL DETAILS</Text>
      <Field
        label="Username"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setNameError("");
          setNotice("");
        }}
        error={nameError}
        hint="This is the name other students see on your profile."
        maxLength={LIMITS.name}
        editable={!busy}
        autoComplete="name"
      />
      <Field
        label="Registration number"
        value={user.rollNumber || "Not provided"}
        editable={false}
        hint="Your university registration number stays fixed."
      />
      <Field
        label="Campus email"
        value={user.email}
        editable={false}
        hint="Your verified student email stays fixed."
      />
      {photo && (
        <Button
          title="Discard selected photo"
          secondary
          disabled={busy}
          onPress={() => setPhoto(null)}
        />
      )}
      {notice ? (
        <SuccessNotice message={notice} />
      ) : null}
      <Button
        title="Save profile"
        busy={busy}
        disabled={!dirty}
        onPress={save}
      />
      <View style={styles.security}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Icon name="shield-checkmark-outline" />
          <Text style={s.cardTitle}>Account security</Text>
        </View>
        <Text style={s.body}>
          Change your password using a secure link sent to your verified campus
          email.
        </Text>
        <Button
          title={
            remaining
              ? `Send again in ${remaining}s`
              : resetSent
                ? "Send another reset link"
                : "Send password reset link"
          }
          secondary
          disabled={busy || remaining > 0}
          onPress={sendResetLink}
        />
        {resetSent && (
          <Notice title="Check your inbox">
            If your account is active, a reset link will be sent. Check spam
            too. The link expires in 15 minutes and works once. After changing
            your password, sign in again on all your devices.
          </Notice>
        )}
      </View>
      <ErrorNotice message={error} />
      {settings && (
        <Button
          title="Open device settings"
          secondary
          onPress={async () => {
            try {
              await Linking.openSettings();
            } catch {
              setError(
                "Open your device settings and allow photo access for this app.",
              );
            }
          }}
        />
      )}
      <Button
        title="Sign out"
        disabled={busy}
        onPress={() =>
          run(async () => {
            setError("");
            try {
              await signOut();
            } catch (err) {
              setError(errorMessage(err));
            }
          })
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 28,
    padding: 26,
    gap: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  initial: { color: C.primary, fontSize: 38, fontWeight: "700" },
  camera: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: C.secondary,
    padding: 7,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.primary,
  },
  heroName: { color: C.cardBg, fontSize: 24, fontWeight: "700" },
  heroSubtitle: { color: C.border, fontSize: 13 },
  security: {
    backgroundColor: C.cardBg,
    padding: 20,
    borderRadius: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
});
