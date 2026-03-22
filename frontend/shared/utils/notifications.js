import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

let notificationConfigured = false;
const PUSH_DEBUG_ENABLED = process.env.EXPO_PUBLIC_DEBUG_PUSH_NOTIFICATIONS === "1";

async function clearLastHandledNotificationResponse() {
  if (typeof Notifications.clearLastNotificationResponseAsync !== "function") {
    return;
  }

  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch (error) {
    logPushDebug("clear last notification response failed", {
      message: error?.message || "Unknown error",
    });
  }
}

function logPushDebug(message, extra = undefined) {
  if (!PUSH_DEBUG_ENABLED) {
    return;
  }

  if (typeof extra === "undefined") {
    console.log(`[push-debug][frontend] ${message}`);
    return;
  }

  console.log(`[push-debug][frontend] ${message}`, extra);
}

function readOrderId(data) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const raw = data.orderId ?? data.id ?? data.order_id;
  return typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
}

function readNotificationType(data) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const raw = data.type;
  return typeof raw === "string" ? raw.trim() : "";
}

function readRecipientFirebaseUid(data) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const raw = data.recipientFirebaseUid;
  return typeof raw === "string" ? raw.trim() : "";
}

function readRecipientEmail(data) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const raw = data.recipientEmail;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function buildNotificationContext(data) {
  return {
    orderId: readOrderId(data),
    type: readNotificationType(data),
    recipientFirebaseUid: readRecipientFirebaseUid(data),
    recipientEmail: readRecipientEmail(data),
  };
}

export function configureNotificationBehavior() {
  if (notificationConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationConfigured = true;
}

export async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    logPushDebug("permission existing", { status });

    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
      logPushDebug("permission requested", { status });
    }

    if (status !== "granted") {
      logPushDebug("token skipped: permission not granted", { status });
      return "";
    }

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      undefined;

    logPushDebug("project id resolved", {
      hasProjectId: Boolean(projectId),
      source:
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim()
          ? "env"
          : Constants.expoConfig?.extra?.eas?.projectId
            ? "expoConfig.extra.eas.projectId"
            : Constants.easConfig?.projectId
              ? "easConfig.projectId"
              : "none",
    });

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const token = tokenResponse?.data || "";
    logPushDebug("token generated", {
      hasToken: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 16)}...` : "",
    });

    return token;
  } catch (error) {
    logPushDebug("token generation failed", {
      message: error?.message || "Unknown error",
    });
    return "";
  }
}

export function subscribeToOrderNotificationPress(onOrderPress) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    const context = buildNotificationContext(data);
    const { type, orderId } = context;
    if (type && type !== "order-status") {
      return;
    }

    if (orderId && typeof onOrderPress === "function") {
      onOrderPress(context);
      void clearLastHandledNotificationResponse();
    }
  });

  return () => {
    subscription.remove();
  };
}

export async function handleInitialOrderNotification(onOrderPress) {
  const response = await Notifications.getLastNotificationResponseAsync();
  const data = response?.notification?.request?.content?.data;
  const context = buildNotificationContext(data);
  const { type, orderId } = context;

  if (type && type !== "order-status") {
    return;
  }

  if (orderId && typeof onOrderPress === "function") {
    onOrderPress(context);
    await clearLastHandledNotificationResponse();
  }
}

export function subscribeToWishlistNotificationPress(onWishlistPress) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data;
    const context = buildNotificationContext(data);
    const { type } = context;

    if (type !== "wishlist-discount") {
      return;
    }
    if (typeof onWishlistPress === "function") {
      onWishlistPress(context);
      void clearLastHandledNotificationResponse();
    }
  });

  return () => {
    subscription.remove();
  };
}

export async function handleInitialWishlistNotification(onWishlistPress) {
  const response = await Notifications.getLastNotificationResponseAsync();
  const data = response?.notification?.request?.content?.data;
  const context = buildNotificationContext(data);
  const { type } = context;

  if (type !== "wishlist-discount") {
    return;
  }

  if (typeof onWishlistPress === "function") {
    onWishlistPress(context);
    await clearLastHandledNotificationResponse();
  }
}
