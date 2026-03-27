import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AxiosError } from "axios";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuthStore } from "@/store/auth-store";
import { colors, spacing } from "@/utils/theme";

const getApiErrorMessage = (error: AxiosError) => {
  if (!error.response) {
    return "Cannot reach the Faceme server. Make sure the backend is running on your computer and your phone is on the same Wi-Fi.";
  }

  const payload = error.response.data;

  if (typeof payload === "object" && payload && "issues" in payload) {
    const issues = payload.issues as {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
    const fieldMessage = Object.values(issues.fieldErrors ?? {}).flat().find(Boolean);
    const formMessage = issues.formErrors?.find(Boolean);

    if (fieldMessage) {
      return fieldMessage;
    }

    if (formMessage) {
      return formMessage;
    }
  }

  if (typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return "We could not create your account. Check your details and try again.";
};

export default function RegisterScreen() {
  const signUp = useAuthStore((state) => state.signUp);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signUp({
        firstName: firstName.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace("/(tabs)");
    } catch (error) {
      if (error instanceof AxiosError) {
        setErrorMessage(getApiErrorMessage(error));
      } else {
        setErrorMessage("We could not create your account. Check your details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <BrandLockup />
        <Text style={styles.title}>Create your Faceme identity</Text>
        <Text style={styles.subtitle}>
          Join with one identity that moves naturally across chat, reels, status, pages, and community spaces.
        </Text>
      </View>
      <Input label="First name" value={firstName} onChangeText={setFirstName} />
      <Input label="Username" value={username} onChangeText={setUsername} placeholder="facemehandle" />
      <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Create password"
        secureTextEntry
      />
      <Button label={isSubmitting ? "Creating account..." : "Create account"} onPress={handleSubmit} />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
