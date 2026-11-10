import React, { useEffect, useRef, useState } from "react";
import {
  StatusBar,
  Text,
  TextInput,
  View,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, ErrorNotice, Field, Icon, Screen, s } from "../components/ui";
import Pressable from "../components/TouchTarget";
import TranslucentDecorations from "../components/TranslucentDecorations";
import { COLORS as C } from "../constants/theme";
import { authApi, errorMessage, userError } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSubmission } from "../hooks/useSubmission";
import { authErrors, LIMITS, normalizeEmail } from "../utils/validation";

export function WelcomeScreen({ navigation }) {
  const { sessionNotice } = useAuth();
  return (
    <SafeAreaView style={styles.welcome}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <TranslucentDecorations />
      <ScrollView
        contentContainerStyle={styles.hero}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Brand Mark & Header */}
        <View style={styles.centerSection}>
          <View style={styles.brandBadge}>
            <Ionicons name="scan-outline" size={32} color={C.primary} />
          </View>

          <View style={styles.kickerBadge}>
            <Text style={styles.kickerText}>CAMPUS, CONNECTED</Text>
          </View>

          <Text style={styles.title}>{"Lost things.\nFound together."}</Text>

          <Text style={styles.subtitle}>
            Intelligent AI matching paired with your campus community.
          </Text>
        </View>

        {/* Clean 3-Step Feature Cards */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepIconWrap}>
              <Ionicons name="camera-outline" size={20} color={C.cardBg} />
            </View>
            <Text style={styles.stepTitle}>Snap it</Text>
            <Text style={styles.stepDesc}>Report in seconds</Text>
          </View>

          <View style={[styles.stepCard, styles.stepCardFeatured]}>
            <View style={[styles.stepIconWrap, styles.stepIconWrapFeatured]}>
              <Ionicons name="sparkles" size={20} color={C.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: C.secondary }]}>
              AI Match
            </Text>
            <Text style={[styles.stepDesc, { color: "#C6D8E3" }]}>
              Smart pairing
            </Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepIconWrap}>
              <Ionicons name="heart-outline" size={20} color={C.cardBg} />
            </View>
            <Text style={styles.stepTitle}>Return it</Text>
            <Text style={styles.stepDesc}>Safe handover</Text>
          </View>
        </View>

        {/* Trust Banner */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={14} color={C.secondary} />
          <Text style={styles.trustBadgeText}>
            Your campus email · A password · A safer return
          </Text>
        </View>

        {/* Action Area */}
        <View style={styles.ctaArea}>
          {sessionNotice && (
            <Text
              accessibilityRole="alert"
              style={{ color: C.cardBg, textAlign: "center", fontSize: 13 }}
            >
              {sessionNotice}
            </Text>
          )}
          <Button
            title="Get started"
            style={{
              backgroundColor: C.secondary,
              minHeight: 52,
              borderRadius: 26,
            }}
            textStyle={{ color: C.primary, fontSize: 16, fontWeight: "700" }}
            rightIcon={
              <Ionicons name="arrow-forward" size={19} color={C.primary} />
            }
            onPress={() => navigation.navigate("Register")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
            onPress={() => navigation.navigate("Login")}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkHighlight}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
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
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fields = useRef({});
  const { busy, run } = useSubmission();
  const [error, setError] = useState("");
  function change(field, setter) {
    return (value) => {
      setter(value);
      setFieldErrors((old) => ({ ...old, [field]: undefined }));
      setError("");
    };
  }
  async function submit() {
    const errors = authErrors(
      { name, email, password, confirmation },
      register,
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please check the highlighted fields.");
      fields.current[Object.keys(errors)[0]]?.focus();
      return;
    }
    const normalized = normalizeEmail(email);
    setError("");
    return run(async () => {
      try {
        const response = register
          ? await authApi.register({
              name: name.trim(),
              email: normalized,
              password,
            })
          : await authApi.login({ email: normalized, password });
        if (register) {
          if (!response.data?.data?.userId)
            throw userError(
              "We could not confirm registration. Try signing in with your student email before registering again.",
            );
          navigation.navigate("VerifyOtp", {
            userId: response.data.data.userId,
            email: normalized,
          });
        } else await acceptSession(response.data?.data);
        setPassword("");
        setConfirmation("");
      } catch (err) {
        if (err.response?.data?.details?.needsVerification)
          navigation.navigate("VerifyOtp", {
            ...err.response.data.details,
            email: normalized,
          });
        else setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen>
      <Text style={s.eyebrow}>CUI · ISLAMABAD</Text>
      <Text style={s.heading}>
        {register ? "Join your campus." : "Welcome back."}
      </Text>
      <Text style={s.body}>Lost things are better found together.</Text>
      {route.params?.verified && (
        <Text accessibilityLiveRegion="polite" style={s.body}>
          Your email is verified. Sign in to get started.
        </Text>
      )}
      <View>
        {register && (
          <Field
            label="Your name"
            ref={(node) => {
              fields.current.name = node;
            }}
            error={fieldErrors.name}
            maxLength={LIMITS.name}
            editable={!busy}
            placeholder="e.g. Fahad Hussain"
            value={name}
            onChangeText={change("name", setName)}
            autoComplete="name"
          />
        )}
        <Field
          label="Student email"
          ref={(node) => {
            fields.current.email = node;
          }}
          error={fieldErrors.email}
          hint="Use your @isbstudent.comsats.edu.pk student email."
          maxLength={LIMITS.email}
          editable={!busy}
          value={email}
          onChangeText={change("email", setEmail)}
          placeholder="e.g. sp23-bse-011@isbstudent.comsats.edu.pk"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <Field
          label="Password"
          ref={(node) => {
            fields.current.password = node;
          }}
          error={fieldErrors.password}
          hint={
            register
              ? "Use at least 8 characters. Your password is case-sensitive."
              : "Your password is case-sensitive."
          }
          editable={!busy}
          placeholder={
            register
              ? "Minimum 8 characters"
              : "Enter your password"
          }
          value={password}
          onChangeText={change("password", setPassword)}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={register ? "new-password" : "current-password"}
          rightAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              onPress={() => setShowPassword((old) => !old)}
              style={{ padding: 6 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={C.textMuted}
              />
            </Pressable>
          }
          onSubmitEditing={
            register ? () => fields.current.confirmation?.focus() : submit
          }
        />
        {register && (
          <Field
            label="Confirm password"
            ref={(node) => {
              fields.current.confirmation = node;
            }}
            value={confirmation}
            onChangeText={change("confirmation", setConfirmation)}
            placeholder="Re-enter your password"
            error={fieldErrors.confirmation}
            secureTextEntry={!showConfirmation}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            autoComplete="new-password"
            rightAccessory={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmation
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                onPress={() => setShowConfirmation((old) => !old)}
                style={{ padding: 6 }}
              >
                <Ionicons
                  name={showConfirmation ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={C.textMuted}
                />
              </Pressable>
            }
            onSubmitEditing={submit}
          />
        )}
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
          disabled={busy}
          onPress={() => navigation.replace(register ? "Login" : "Register")}
        />
      </View>
    </Screen>
  );
}
export function OtpScreen({ navigation, route }) {
  const { userId, email } = route.params || {};
  const hasAccount = !!(userId || email);
  const { acceptSession } = useAuth();
  const [otp, setOtp] = useState("");
  const { busy, run } = useSubmission();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendAt, setResendAt] = useState(() => Date.now() + 30000);
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => {
    const timer = setInterval(
      () => setCooldown(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [resendAt]);
  async function verify() {
    if (!hasAccount)
      return setError(
        "Start with sign in or registration so we know which email to verify.",
      );
    if (!/^\d{6}$/.test(otp))
      return setError("Enter the six-digit code from your email.");
    setError("");
    setNotice("");
    return run(async () => {
      try {
        const response = await authApi.verifyOtp({ userId, email, otp });
        if (response.data.data.token) await acceptSession(response.data.data);
        else navigation.replace("Login", { email, verified: true });
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  async function resend() {
    if (!hasAccount || Date.now() < resendAt) return;
    setError("");
    setNotice("");
    return run(async () => {
      try {
        await authApi.resendOtp({ userId, email });
        setResendAt(Date.now() + 30000);
        setCooldown(30);
        setOtp("");
        setNotice(
          "A new code is on its way. Use the latest email; older codes no longer work.",
        );
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen>
      <Icon name="mail-outline" size={42} />
      <Text style={s.heading}>Check your campus email.</Text>
      <Text style={s.body}>
        {email
          ? `Enter the verification code sent to ${email}.`
          : hasAccount
            ? "Enter the code sent to your student email."
            : "Please sign in or register before verifying your email."}
      </Text>
      <Text style={s.body}>
        Check your spam or junk folder too. If the code expires, request a new
        one below.
      </Text>
      <Field
        label="Verification code"
        placeholder="Enter 6-digit code"
        value={otp}
        onChangeText={(v) => {
          setOtp(v.replace(/\D/g, "").slice(0, 6));
          setError("");
        }}
        editable={!busy && hasAccount}
        maxLength={6}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <ErrorNotice message={error} />
      {notice ? <Text style={s.body}>{notice}</Text> : null}
      <Button
        title="Verify email"
        onPress={verify}
        busy={busy}
        disabled={!hasAccount}
      />
      <Button
        title={cooldown ? `Resend code in ${cooldown}s` : "Resend code"}
        onPress={resend}
        disabled={cooldown > 0 || busy || !hasAccount}
        secondary
      />
      <Button
        title="Use another email"
        secondary
        disabled={busy}
        onPress={() => navigation.replace("Register")}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: C.primary },
  hero: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 22,
  },
  centerSection: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  brandBadge: {
    backgroundColor: C.secondary,
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 4,
  },
  kickerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(185, 241, 47, 0.12)",
    borderColor: "rgba(185, 241, 47, 0.28)",
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  kickerText: {
    color: C.secondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: C.cardBg,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#B0C4DE",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  stepsContainer: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "space-between",
  },
  stepCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  stepCardFeatured: {
    backgroundColor: "rgba(185, 241, 47, 0.09)",
    borderColor: "rgba(185, 241, 47, 0.32)",
    borderWidth: 1,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconWrapFeatured: {
    backgroundColor: C.secondary,
  },
  stepTitle: {
    color: C.cardBg,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  stepDesc: {
    color: "#8FA3B0",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
  },
  trustBadgeText: {
    color: "#D0DCE3",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  ctaArea: {
    width: "100%",
    gap: 10,
  },
  loginLink: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  loginLinkText: {
    color: "#D0DCE3",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  loginLinkHighlight: {
    color: C.secondary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
