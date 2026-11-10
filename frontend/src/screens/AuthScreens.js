import React, { useEffect, useState } from "react";
import {
  StatusBar,
  Text,
  TextInput,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorNotice, Field, Icon, Screen, s } from "../components/ui";
import { COLORS as C } from "../constants/theme";
import { authApi, errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function WelcomeScreen({ navigation }) {
  const [email, setEmail] = useState("");
  return (
    <SafeAreaView style={styles.welcome}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <ScrollView contentContainerStyle={styles.hero}>
        <View style={styles.mark}>
          <Icon name="scan-outline" size={32} />
        </View>
        <Text style={styles.kicker}>CAMPUS, CONNECTED</Text>
        <Text style={styles.title}>{"Lost things.\nFound together."}</Text>
        <Text style={styles.subtitle}>
          {"A little help from AI.\nA lot of help from your campus."}
        </Text>
        <View style={styles.steps}>
          {[
            ["camera-outline", "Snap it"],
            ["sparkles-outline", "Match it"],
            ["heart-outline", "Return it"],
          ].map(([icon, text]) => (
            <View key={text} style={{ alignItems: "center", gap: 10 }}>
              <Icon name={icon} color={C.secondary} />
              <Text style={{ color: C.cardBg }}>{text}</Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 14 }}>
          <View style={styles.emailRow}>
            <Icon name="mail-outline" color={C.border} />
            <TextInput
              accessibilityLabel="Student email"
              placeholder="e.g. fa25-bcs-000@isbstudent.comsats.edu.pk"
              placeholderTextColor={C.border + "99"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, color: C.cardBg, fontSize: 14 }}
            />
          </View>
          <Button
            title="Get started"
            style={{ backgroundColor: C.background }}
            secondary
            onPress={() => navigation.navigate("Register", { email })}
          />
          <Text style={{ color: C.border, fontSize: 11 }}>
            Your campus email. A password. A safer return.
          </Text>
          <Button
            title="I already have an account"
            onPress={() => navigation.navigate("Login", { email })}
          />
        </View>
        <Text style={{ color: C.border, fontSize: 12 }}>
          Recover what’s lost, securely.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
export function AuthScreen({ navigation, route }) {
  const register = route.name === "Register";
  const { acceptSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(route.params?.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@isbstudent\.comsats\.edu\.pk$/.test(normalized))
      return setError("Use your @isbstudent.comsats.edu.pk email.");
    if (!password || (register && password.length < 8))
      return setError(
        "Enter a password" + (register ? " of at least 8 characters." : "."),
      );
    if (register && !name.trim()) return setError("Enter your name.");
    setBusy(true);
    setError("");
    try {
      const response = register
        ? await authApi.register({
            name: name.trim(),
            email: normalized,
            password,
          })
        : await authApi.login({ email: normalized, password });
      setPassword("");
      if (register)
        navigation.navigate("VerifyOtp", {
          userId: response.data.data.userId,
          email: normalized,
        });
      else await acceptSession(response.data.data);
    } catch (err) {
      if (err.response?.data?.details?.needsVerification)
        navigation.navigate("VerifyOtp", err.response.data.details);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={s.eyebrow}>CUI · ISLAMABAD</Text>
      <Text style={s.heading}>
        {register ? "Join your campus." : "Welcome back."}
      </Text>
      <Text style={s.body}>Lost things are better found together.</Text>
      <View>
        {register && (
          <Field
            label="Your name"
            placeholder="e.g. Alex Khan"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <Field
          label="Student email"
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. fa25-bcs-000@isbstudent.comsats.edu.pk"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Field
          label="Password"
          placeholder={
            register
              ? "Choose a password (8+ characters)"
              : "Enter your password"
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={register ? "new-password" : "current-password"}
          onSubmitEditing={submit}
        />
        <ErrorNotice message={error} />
        <Button
          title={register ? "Create account" : "Sign in"}
          onPress={submit}
          busy={busy}
        />
        <Button
          title={
            register
              ? "Already registered? Sign in"
              : "New here? Create an account"
          }
          secondary
          onPress={() => navigation.replace(register ? "Login" : "Register")}
        />
      </View>
    </Screen>
  );
}
export function OtpScreen({ navigation, route }) {
  const { userId, email } = route.params;
  const { acceptSession } = useAuth();
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => {
    const timer = setInterval(
      () => setCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  async function verify() {
    if (!/^\d{6}$/.test(otp))
      return setError("Enter the six-digit code from your email.");
    setBusy(true);
    setError("");
    try {
      const response = await authApi.verifyOtp({ userId, email, otp });
      if (response.data.data.token) await acceptSession(response.data.data);
      else navigation.replace("Login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      await authApi.resendOtp({ userId, email });
      setCooldown(30);
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Icon name="mail-outline" size={42} />
      <Text style={s.heading}>Check your campus email.</Text>
      <Text style={s.body}>Enter the verification code sent to {email}.</Text>
      <Field
        label="Verification code"
        placeholder="Enter 6-digit code"
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
        maxLength={6}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <ErrorNotice message={error} />
      {notice ? <Text style={s.body}>{notice}</Text> : null}
      <Button title="Verify email" onPress={verify} busy={busy} />
      <Button
        title={cooldown ? `Resend code in ${cooldown}s` : "Resend code"}
        onPress={resend}
        disabled={cooldown > 0 || busy}
        secondary
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: C.primary },
  hero: { padding: 24, paddingTop: 70, gap: 24 },
  mark: {
    backgroundColor: C.secondary,
    padding: 15,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  kicker: {
    color: C.secondary,
    backgroundColor: C.primaryLight,
    padding: 8,
    borderRadius: 14,
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
  },
  title: { color: C.cardBg, fontSize: 38, fontWeight: "700", lineHeight: 44 },
  subtitle: { color: C.border, fontSize: 16, lineHeight: 24 },
  steps: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  emailRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.primaryLight,
    borderRadius: 26,
    padding: 16,
  },
});
