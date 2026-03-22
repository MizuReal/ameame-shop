import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
} from "react-native";

import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Button from "@components/action/Button";
import Screen from "@components/layout/Screen";
import Login from "../user/Login";
import Register from "../user/Register";
import TabNav from "@shared/components/navigation/TabNav";
import Card from "@shared/components/layout/Card";
import Alert from "@shared/components/statusFeedback/Alert";
import { useAuth } from "../../context/store/auth";

const MODE_TABS = [
  { key: "login", label: "Login" },
  { key: "register", label: "Register" },
];

function AuthCard({ mode, onModeChange }) {
  return (
    <Card variant="elevated" radius="lg" padding="md" style={s.cardStack}>
      <TabNav tabs={MODE_TABS} activeKey={mode} onChange={onModeChange} />

      {mode === "login" ? (
        <Login onSwitchToRegister={() => onModeChange("register")} />
      ) : (
        <Register onSwitchToLogin={() => onModeChange("login")} />
      )}
    </Card>
  );
}

export default function AuthScreen({
  onOpenShop,
  onOpenAdmin,
  route,
  notificationAccessMessage,
  onDismissNotificationAccessMessage,
  onNotificationAuthResolved,
}) {
  const [mode, setMode] = useState("login");
  const {
    currentUser,
    accountProfile,
    roleBusy,
  } = useAuth();

  useEffect(() => {
    const nextMode = route?.params?.mode;
    if (nextMode === "login" || nextMode === "register") {
      setMode(nextMode);
    }
  }, [route?.params?.mode]);

  useEffect(() => {
    if (notificationAccessMessage) {
      return;
    }

    if (!currentUser || roleBusy || !accountProfile) {
      return;
    }

    if (accountProfile.role === 1) {
      onOpenAdmin?.();
    } else {
      onOpenShop?.();
    }
  }, [
    accountProfile,
    currentUser,
    notificationAccessMessage,
    onOpenAdmin,
    onOpenShop,
    roleBusy,
  ]);

  useEffect(() => {
    if (!notificationAccessMessage || !currentUser || roleBusy) {
      return;
    }

    onNotificationAuthResolved?.();
  }, [currentUser, notificationAccessMessage, onNotificationAuthResolved, roleBusy]);

  return (
    <Screen
      edges={["top", "left", "right"]}
      style={s.safe}
      scrollable
      contentContainerStyle={s.content}
    >
      {notificationAccessMessage ? (
        <Alert
          variant="warning"
          title="Sign in required"
          body={notificationAccessMessage}
          onClose={onDismissNotificationAccessMessage}
        />
      ) : null}

      <AuthCard
        mode={mode}
        onModeChange={setMode}
      />
    </Screen>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },
  cardStack: { gap: 12 },
});
