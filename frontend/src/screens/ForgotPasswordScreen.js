import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  Button,
  ErrorNotice,
  Field,
  Icon,
  Notice,
  Screen,
  s,
} from "../components/ui";
import { authApi, errorMessage } from "../services/api";
import { useSubmission } from "../hooks/useSubmission";
import { emailError, LIMITS, normalizeEmail } from "../utils/validation";

export default function ForgotPasswordScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || "");
  const [error, setError] = useState("");
  const [invalidEmail, setInvalidEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const { busy, run } = useSubmission();
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [retryAt]);
  async function submit() {
    if (Date.now() < retryAt) return;
    const invalid = emailError(email);
    setInvalidEmail(invalid || "");
    if (invalid) return;
    return run(async () => {
      setError("");
      try {
        await authApi.forgotPassword(normalizeEmail(email));
        setSent(true);
        setRetryAt(Date.now() + 60000);
        setRemaining(60);
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }
  return (
    <Screen>
      <Icon name="key-outline" size={38} />
      <Text style={s.heading}>Let’s get you back in.</Text>
      <Text style={s.body}>
        Enter your verified student email. We’ll send a link so you can choose a
        new password safely.
      </Text>
      <Field
        label="Student email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setInvalidEmail("");
          setError("");
          setSent(false);
        }}
        error={invalidEmail}
        placeholder="e.g. fa25-bcs-000@isbstudent.comsats.edu.pk"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={LIMITS.email}
        editable={!busy}
        onSubmitEditing={submit}
      />
      {sent && (
        <Notice title="Check your inbox">
          If an active account exists for this email, a reset link will be sent.
          Check your spam folder too. The link expires in 15 minutes and works
          once.
        </Notice>
      )}
      <ErrorNotice message={error} />
      <Button
        title={
          remaining
            ? `Send again in ${remaining}s`
            : sent
              ? "Send another link"
              : "Send reset link"
        }
        onPress={submit}
        busy={busy}
        disabled={remaining > 0}
      />
      <Button
        title="Back to sign in"
        secondary
        disabled={busy}
        onPress={() =>
          navigation.navigate("Login", { email: normalizeEmail(email) })
        }
      />
    </Screen>
  );
}
