let ExpoSdk = null;

try {
  ExpoSdk = require("expo-server-sdk");
} catch (_error) {
  ExpoSdk = null;
}

function isExpoPushToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  if (ExpoSdk?.Expo?.isExpoPushToken) {
    return ExpoSdk.Expo.isExpoPushToken(token);
  }

  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

function shouldDebugPush() {
  return process.env.DEBUG_PUSH_NOTIFICATIONS === "1";
}

async function sendPushMessages({ user, messages, debugLabel }) {
  const existingTokens = Array.isArray(user?.pushTokens) ? user.pushTokens : [];
  const uniqueTokens = Array.from(new Set(existingTokens.filter((token) => typeof token === "string")));

  if (shouldDebugPush()) {
    console.log(
      `[push-debug] send start ${debugLabel} user=${String(user?._id || "")} tokens=${uniqueTokens.length}`
    );
  }

  if (!uniqueTokens.length) {
    if (shouldDebugPush()) {
      console.log(`[push-debug] send skipped reason=no_tokens user=${String(user?._id || "")}`);
    }
    return { attempted: false, sent: 0, removed: 0, invalid: 0 };
  }

  if (!ExpoSdk?.Expo) {
    if (shouldDebugPush()) {
      console.log("[push-debug] send skipped reason=expo_server_sdk_unavailable");
    }
    return { attempted: false, sent: 0, removed: 0, invalid: 0 };
  }

  const expo = new ExpoSdk.Expo();
  const validTokens = [];
  const invalidTokens = [];

  uniqueTokens.forEach((token) => {
    const normalized = token.trim();
    if (isExpoPushToken(normalized)) {
      validTokens.push(normalized);
    } else {
      invalidTokens.push(normalized);
    }
  });

  if (!validTokens.length) {
    if (invalidTokens.length) {
      user.pushTokens = [];
      await user.save();
    }

    if (shouldDebugPush()) {
      console.log(
        `[push-debug] send skipped reason=no_valid_tokens invalid=${invalidTokens.length} user=${String(user?._id || "")}`
      );
    }

    return {
      attempted: true,
      sent: 0,
      removed: invalidTokens.length,
      invalid: invalidTokens.length,
    };
  }

  const payloads = validTokens.map((token) => ({
    ...messages,
    to: token,
  }));

  const invalidFromReceipts = new Set();
  let sent = 0;
  let failed = 0;

  for (const chunk of expo.chunkPushNotifications(payloads)) {
    let tickets;

    try {
      tickets = await expo.sendPushNotificationsAsync(chunk);
    } catch (chunkError) {
      const isConflict =
        typeof chunkError?.message === "string" &&
        chunkError.message.includes("same project");

      if (!isConflict) {
        throw chunkError;
      }

      if (shouldDebugPush()) {
        console.log(
          `[push-debug] conflicting tokens detected, falling back to per-token send (${chunk.length} tokens)`
        );
      }

      // Send each token individually so valid ones still go through.
      for (const singlePayload of chunk) {
        try {
          const [singleTicket] = await expo.sendPushNotificationsAsync([singlePayload]);
          if (singleTicket?.status === "ok") {
            sent += 1;
          } else {
            failed += 1;
            if (shouldDebugPush()) {
              console.log(
                `[push-debug] per-token error to=${String(singlePayload?.to || "")} code=${String(singleTicket?.details?.error || singleTicket?.message || "unknown")}`
              );
            }
          }
        } catch (singleError) {
          failed += 1;
          // Token is from a different project — mark it for removal.
          if (typeof singlePayload?.to === "string") {
            invalidFromReceipts.add(singlePayload.to);
          }
          if (shouldDebugPush()) {
            console.log(
              `[push-debug] per-token throw to=${String(singlePayload?.to || "")} error=${singleError?.message || "unknown"}`
            );
          }
        }
      }
      continue;
    }

    const okCount = tickets.filter((ticket) => ticket.status === "ok").length;
    const errorTickets = tickets
      .map((ticket, index) => ({ ticket, index }))
      .filter(({ ticket }) => ticket?.status === "error");

    failed += errorTickets.length;

    if (shouldDebugPush()) {
      console.log(
        `[push-debug] expo chunk sent chunkSize=${chunk.length} ok=${okCount} errors=${errorTickets.length}`
      );

      errorTickets.forEach(({ ticket, index }) => {
        console.log(
          `[push-debug] expo ticket error to=${String(chunk[index]?.to || "")} code=${String(ticket?.details?.error || ticket?.message || "unknown")}`
        );
      });
    }
    sent += okCount;

    const receiptTokenMap = {};
    tickets.forEach((ticket, index) => {
      if (ticket?.id) {
        receiptTokenMap[ticket.id] = chunk[index]?.to;
      }
    });

    const receiptIds = Object.keys(receiptTokenMap);
    if (!receiptIds.length) {
      continue;
    }

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const receiptChunk of receiptIdChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(receiptChunk);
      Object.entries(receipts).forEach(([receiptId, receipt]) => {
        if (shouldDebugPush() && receipt?.status === "error") {
          console.log(
            `[push-debug] expo receipt error receiptId=${receiptId} code=${String(receipt?.details?.error || receipt?.message || "unknown")}`
          );
        }

        if (receipt?.status === "error" && receipt?.details?.error === "DeviceNotRegistered") {
          const targetToken = receiptTokenMap[receiptId];
          if (typeof targetToken === "string") {
            invalidFromReceipts.add(targetToken);
          }
        }
      });
    }
  }

  const allInvalid = new Set([...invalidTokens, ...invalidFromReceipts]);
  if (allInvalid.size) {
    user.pushTokens = uniqueTokens.filter((token) => !allInvalid.has(token.trim()));
    await user.save();
  }

  if (shouldDebugPush()) {
    console.log(
      `[push-debug] send complete ${debugLabel} sent=${sent} failed=${failed} invalid=${allInvalid.size}`
    );
  }

  return {
    attempted: true,
    sent,
    failed,
    removed: allInvalid.size,
    invalid: allInvalid.size,
  };
}

async function sendOrderStatusPush({ user, order }) {
  const rawName = String(user?.displayName || "").trim();
  const fallbackName = String(user?.email || "").split("@")[0] || "there";
  const greetingName = rawName || fallbackName;

  const messages = {
    sound: "default",
    title: "Order status update",
    body: `Hi ${greetingName}, your order has been ${order.status}.`,
    data: {
      type: "order-status",
      orderId: String(order._id),
      status: order.status,
      recipientFirebaseUid: String(user?.firebaseUid || ""),
      recipientEmail: String(user?.email || "").toLowerCase(),
    },
  };

  return sendPushMessages({
    user,
    messages,
    debugLabel: `order=${String(order?._id || "")}`,
  });
}

async function sendWishlistDiscountPush({ user, products, totalCount }) {
  const names = products.map((item) => item.name).filter(Boolean);
  const shown = names.slice(0, Math.max(1, names.length));
  const extraCount = Math.max(0, totalCount - shown.length);
  const subject = shown.join(", ") || "Wishlist items";

  const body =
    totalCount <= 1
      ? `${subject} is now on sale 🎉`
      : `${subject}${extraCount > 0 ? ` +${extraCount} more` : ""} are now on sale 🎉`;

  const messages = {
    sound: "default",
    title: "Wishlist update",
    body,
    data: {
      type: "wishlist-discount",
      productIds: products.map((item) => String(item.id || item._id || "")),
      count: totalCount,
      recipientFirebaseUid: String(user?.firebaseUid || ""),
      recipientEmail: String(user?.email || "").toLowerCase(),
    },
  };

  return sendPushMessages({
    user,
    messages,
    debugLabel: `wishlist user=${String(user?._id || "")}`,
  });
}

module.exports = {
  sendOrderStatusPush,
  sendWishlistDiscountPush,
};
