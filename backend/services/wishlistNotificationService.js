const Wishlist = require("../models/Wishlist");
const WishlistDiscountEvent = require("../models/WishlistDiscountEvent");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendWishlistDiscountPush } = require("./pushNotificationService");
const {
  computeDiscountPercent,
  isDiscountActive,
} = require("../utils/discountUtils");

function parseEnvNumber(name, fallback, { min = 0 } = {}) {
  const raw = Number(process.env[name]);
  if (Number.isFinite(raw) && raw >= min) {
    return raw;
  }
  return fallback;
}

const BATCH_MINUTES = parseEnvNumber("WISHLIST_NOTIFY_BATCH_MINUTES", 10, { min: 1 });
const COOLDOWN_HOURS = parseEnvNumber("WISHLIST_NOTIFY_COOLDOWN_HOURS", 6, { min: 0 });
const MAX_ITEMS = parseEnvNumber("WISHLIST_NOTIFY_MAX_ITEMS", 3, { min: 1 });
const DEDUP_HOURS = parseEnvNumber("WISHLIST_NOTIFY_DEDUP_HOURS", 24, { min: 0 });

function shouldDebug() {
  return process.env.DEBUG_PUSH_NOTIFICATIONS === "1";
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function enqueueWishlistDiscountEvents(product) {
  if (!product?._id) return;

  const cutoff = DEDUP_HOURS > 0 ? hoursAgo(DEDUP_HOURS) : null;
  const wishlists = await Wishlist.find({ product: product._id }).lean();

  const entries = wishlists.filter((entry) => {
    if (!cutoff) return true;
    return !entry.lastNotifiedDiscountAt || entry.lastNotifiedDiscountAt < cutoff;
  });

  if (!entries.length) return;

  const discountPercent = computeDiscountPercent({
    price: product.price,
    discountType: product.discountType,
    discountValue: product.discountValue,
    discountedPrice: product.discountedPrice,
  });
  const discountedPrice = Number(product.discountedPrice || 0);

  const events = entries.map((entry) => ({
    user: entry.user,
    product: entry.product,
    discountPercent,
    discountedPrice,
  }));

  await WishlistDiscountEvent.insertMany(events, { ordered: false }).catch(() => null);
}

async function processWishlistDiscountQueue() {
  const events = await WishlistDiscountEvent.find({
    processedAt: null,
  })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();

  if (!events.length) {
    return;
  }

  const userIds = Array.from(new Set(events.map((e) => String(e.user))));
  const productIds = Array.from(new Set(events.map((e) => String(e.product))));

  const [users, products, wishlists] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select("pushTokens isActive lastWishlistNotificationAt firebaseUid email displayName"),
    Product.find({ _id: { $in: productIds } })
      .select("name discountType discountValue discountStartAt discountEndAt discountedPrice price")
      .lean(),
    Wishlist.find({ user: { $in: userIds }, product: { $in: productIds } }).lean(),
  ]);

  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const wishlistMap = new Map(
    wishlists.map((entry) => [`${String(entry.user)}:${String(entry.product)}`, entry])
  );

  const eventsByUser = new Map();
  events.forEach((event) => {
    const key = String(event.user);
    if (!eventsByUser.has(key)) {
      eventsByUser.set(key, []);
    }
    eventsByUser.get(key).push(event);
  });

  const now = new Date();
  const cooldownCutoff = COOLDOWN_HOURS > 0 ? hoursAgo(COOLDOWN_HOURS) : null;
  const dedupCutoff = DEDUP_HOURS > 0 ? hoursAgo(DEDUP_HOURS) : null;

  for (const [userId, userEvents] of eventsByUser.entries()) {
    const user = userMap.get(userId);
    if (!user || user.isActive === false) {
      await markEvents(userEvents, "user_inactive");
      continue;
    }

    if (cooldownCutoff && user.lastWishlistNotificationAt && user.lastWishlistNotificationAt > cooldownCutoff) {
      await markEvents(userEvents, "cooldown");
      continue;
    }

    if (!Array.isArray(user.pushTokens) || user.pushTokens.length === 0) {
      await markEvents(userEvents, "no_push_tokens");
      continue;
    }

    const validEvents = [];
    for (const event of userEvents) {
      const product = productMap.get(String(event.product));
      if (!product) {
        continue;
      }

      const effectiveDiscountActive = isDiscountActive({
        discountValue: product.discountValue,
        discountStartAt: product.discountStartAt,
        discountEndAt: product.discountEndAt,
      });

      if (!effectiveDiscountActive) {
        continue;
      }

      const wishlistKey = `${String(event.user)}:${String(event.product)}`;
      const wishlistEntry = wishlistMap.get(wishlistKey);
      if (!wishlistEntry) {
        continue;
      }

      if (dedupCutoff && wishlistEntry.lastNotifiedDiscountAt && wishlistEntry.lastNotifiedDiscountAt > dedupCutoff) {
        continue;
      }

      validEvents.push({ event, product, wishlistEntry });
    }

    if (!validEvents.length) {
      await markEvents(userEvents, "no_valid_events");
      continue;
    }

    validEvents.sort((a, b) => {
      const pctDiff = Number(b.event.discountPercent || 0) - Number(a.event.discountPercent || 0);
      if (pctDiff !== 0) return pctDiff;
      return new Date(b.event.createdAt).getTime() - new Date(a.event.createdAt).getTime();
    });

    const selected = validEvents.slice(0, MAX_ITEMS);
    const productsForMessage = selected.map((item) => ({
      id: item.product._id,
      name: item.product.name,
    }));

    const totalCount = validEvents.length;

    try {
      await sendWishlistDiscountPush({
        user,
        products: productsForMessage,
        totalCount,
      });

      const eventIds = userEvents.map((event) => event._id);
      await WishlistDiscountEvent.updateMany(
        { _id: { $in: eventIds } },
        { $set: { processedAt: now } }
      );

      await User.updateOne(
        { _id: userId },
        { $set: { lastWishlistNotificationAt: now } }
      );

      const wishlistUpdates = selected.map((item) => ({
        updateOne: {
          filter: { _id: item.wishlistEntry._id },
          update: {
            $set: {
              lastNotifiedDiscountAt: now,
              lastNotifiedDiscountPercent: Number(item.event.discountPercent || 0),
            },
          },
        },
      }));

      if (wishlistUpdates.length) {
        await Wishlist.bulkWrite(wishlistUpdates);
      }
    } catch (sendError) {
      console.error(
        `[wishlist-push] failed for user=${userId} products=${productsForMessage.map((p) => p.name).join(",")}`,
        sendError?.message || sendError
      );
      await markEvents(userEvents, "send_error");
    }
  }
}

async function markEvents(events, reason) {
  if (!events.length) return;
  const ids = events.map((event) => event._id);
  await WishlistDiscountEvent.updateMany(
    { _id: { $in: ids } },
    { $set: { processedAt: new Date(), skippedReason: reason } }
  );
}

function startWishlistNotificationProcessor() {
  const intervalMs = Math.max(1, BATCH_MINUTES) * 60 * 1000;
  const run = async () => {
    try {
      await processWishlistDiscountQueue();
    } catch (error) {
      if (shouldDebug()) {
        console.error("[push-debug] wishlist queue error", error);
      }
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  return () => clearInterval(timer);
}

module.exports = {
  enqueueWishlistDiscountEvents,
  processWishlistDiscountQueue,
  startWishlistNotificationProcessor,
};
