import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AxiosError } from "axios";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { GuestGuard } from "@/hooks/use-auth-guard";
import { useAuthStore } from "@/store/auth-store";
import { colors, spacing } from "@/utils/theme";

const getApiErrorMessage = (error: AxiosError) => {
  if (!error.response) {
    return "Cannot reach the Faceme server right now. Check your internet connection and try again in a moment.";
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

  return "We could not log you in. Check your credentials and try again.";
};

export default function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
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
      await signIn({ email: email.trim().toLowerCase(), password });
      router.replace("/(tabs)");
    } catch (error) {
      if (error instanceof AxiosError) {
        setErrorMessage(getApiErrorMessage(error));
      } else {
        setErrorMessage("We could not log you in. Check your credentials and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <Screen scroll>
        <View style={styles.header}>
          <BrandLockup />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Log in to your people, conversations, reels, and shared spaces.
          </Text>
        </View>
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />
        <Button label={isSubmitting ? "Logging in..." : "Log in"} onPress={handleSubmit} />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Link href="/(auth)/register">
          <Text style={styles.link}>Create a new account</Text>
        </Link>
      </Screen>
    </GuestGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
