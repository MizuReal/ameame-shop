import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  UserIcon,
  MapPinIcon,
  BellIcon,
  CameraIcon,
  ShareNetworkIcon,
  SignOutIcon,
  PencilSimpleIcon,
  ShoppingBagIcon,
  HeartIcon,
  ArrowRightIcon,
} from "phosphor-react-native";
import { updateProfile } from "firebase/auth";

import { useColors, useTheme } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";

import Screen from "@components/layout/Screen";
import Avatar from "@shared/components/display/Avatar";
import SectionHeader from "@shared/components/display/SectionHeader";
import Accordion from "@shared/components/utility/Accordion";
import ToggleSwitch from "@shared/components/input/ToggleSwitch";
import Button from "@shared/components/action/Button";
import TextInput from "@shared/components/input/TextInput";
import Dropdown from "@shared/components/input/Dropdown";
import Checkbox from "@shared/components/input/Checkbox";
import { useAuth } from "../../context/store/auth";
import { auth } from "@modules/firebase/client";
import { showToast } from "@utils/toastBus";
import { getMyOrdersCount, updateMyProfile } from "@utils/authSession";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_PAD = 16;
const DISPLAY_NAME_REGEX = /^(?=.{2,50}$)[A-Za-z0-9](?:[A-Za-z0-9 .,'-]*[A-Za-z0-9])?$/;
const ADDRESS_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s,.'#/-]{7,119}$/;
const AREA_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;
const POSTAL_REGEX = /^\d{4}$/;
const AVATAR_MIME_REGEX = /^image\/(jpeg|png|webp)$/i;
const AVATAR_EXTENSION_REGEX = /\.(jpe?g|png|webp)$/i;
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

// Hardcoded theme palette definitions.
// Using actual theme primitive colors from the theme system (converted to RGB hex)
const THEMES = [
  {
    key: "default",
    label: "Default",
    top: "rgb(109, 188, 92)",   // accent.base (green)
    bot: "rgb(18, 143, 247)",   // brand.base (blue)
  },
  {
    key: "warm",
    label: "Warm",
    top: "rgb(189, 145, 40)",   // accent.base (amber)
    bot: "rgb(196, 118, 49)",   // brand.base (brown)
  },
  {
    key: "cyan",
    label: "Cyan",
    top: "rgb(73, 148, 202)",    // accent.base (cyan)
    bot: "rgb(78, 188, 188)",    // brand.base (cyan)
  },
  {
    key: "magenta",
    label: "Magenta",
    top: "rgb(151, 68, 193)",   // accent.base (magenta)
    bot: "rgb(199, 61, 158)",   // brand.base (magenta)
  },
  {
    key: "tako",
    label: "Tako",
    top: "rgb(242, 154, 48)",   // accent.base (amber)
    bot: "rgb(87, 80, 104)",    // brand.base (purple)
  },
];


// ─── Sub-components ───────────────────────────────────────────────────────────

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label, icon }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);

  return (
    <View
      style={[
        s.statPill,
        { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
      ]}
    >
      {icon}
      <Text
        style={[
          ts.h3,
          { fontSize: 17, letterSpacing: -0.4, marginTop: 2 },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          ts.overline,
          { fontSize: 9, marginTop: 1 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Section header using manga-style vertical bar accent ──────────────────────
function MangaSectionHeader({ title }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);

  return (
    <View style={[s.mangaSecHd, { paddingHorizontal: SCREEN_PAD }]}>
      <View
        style={[
          s.mangaSecBar,
          { backgroundColor: rgb(tokens["--surface-neutral-strong"]) },
        ]}
      />
      <Text style={[ts.label, { letterSpacing: -0.2 }]}>{title}</Text>
    </View>
  );
}

// ── Accordion row with icon square ────────────────────────────────────────────
function SettingsRow({ icon, title, children, open, onToggle }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);

  return (
    <Accordion
      title={
        <View style={s.settingsRowTitle}>
          <View
            style={[
              s.settingsIcon,
              {
                backgroundColor: rgb(tokens["--surface-neutral-primary"]),
                borderColor: rgb(tokens["--border-neutral-secondary"]),
              },
            ]}
          >
            {icon}
          </View>
          <Text style={ts.label}>{title}</Text>
        </View>
      }
      controlled={{ open, onToggle }}
      style={[
        s.settingsAccordion,
        { borderBottomColor: rgb(tokens["--border-neutral-secondary"]) },
      ]}
    >
      {children}
    </Accordion>
  );
}

// ── Theme swatch ──────────────────────────────────────────────────────────────
function ThemeSwatch({ theme, active, onSelect }) {
  const tokens = useColors();

  // The active underline uses the live brand primary token so it shifts
  // with whichever theme is currently applied — the brand token is the
  // source of truth, not a hardcoded hex.
  const underlineColor = rgb(tokens["--text-brand-primary"]);

  return (
    <View style={s.themeSwatchWrap}>
      <Pressable
        onPress={() => onSelect(theme.key)}
        style={s.themeSwatchPressable}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${theme.label} theme`}
      >
        {/* Swatch: top 25% accent, bottom 75% brand */}
        <View style={[s.themeSwatch, { overflow: "hidden", borderRadius: 6 }]}>
          <View style={[s.themeSwatchTop, { backgroundColor: theme.top }]} />
          <View style={[s.themeSwatchBot, { backgroundColor: theme.bot }]} />
        </View>

        {/* Active indicator — uses live brand token */}
        {active && (
          <View
            style={[s.themeSwatchUnderline, { backgroundColor: underlineColor }]}
          />
        )}
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const tokens = useColors();
  const { resolvedScheme, setScheme, setTheme } = useTheme();
  const { currentUser, accountProfile, signOutUser, refreshAccountProfile } = useAuth();
  const isAdmin = accountProfile?.role === 1;
  const roleLabel = isAdmin ? "Admin" : currentUser ? "User" : "Not signed in";
  const ts = makeTypeStyles(tokens);

  // ── User data (with guest fallback) ───────────────────────────────────────────
  const user = useMemo(() => ({
    displayName: accountProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Guest',
    email: currentUser?.email || '',
    photoURL: accountProfile?.photoURL || currentUser?.photoURL,
    orderCount: accountProfile?.orderCount || 0,
    wishlistCount: accountProfile?.wishlistCount || 0,
    addressLine1: accountProfile?.addressLine1 || '',
    city: accountProfile?.city || '',
    province: accountProfile?.province || '',
    postalCode: accountProfile?.postalCode || '',
    displayNameRoman: accountProfile?.displayNameRoman || roleLabel,
  }), [currentUser, accountProfile, roleLabel]);

  const isAuthenticated = !!currentUser;

  // ── Local state ────────────────────────────────────────────────────────────
  const [openSection, setOpenSection] = useState(null);
  const [darkMode, setDarkMode] = useState(resolvedScheme === "dark");
  const [activeTheme, setActiveTheme] = useState("default");

  // Sync dark mode state with resolved scheme
  useEffect(() => {
    setDarkMode(resolvedScheme === "dark");
  }, [resolvedScheme]);

  useEffect(() => {
    if (!accountProfile && !currentUser) return;
    if (addressBusy) return;
    setAddressLine1(accountProfile?.addressLine1 || "");
    setCity(accountProfile?.city || "");
    setProvince(accountProfile?.province || "");
    setPostalCode(accountProfile?.postalCode || "");
  }, [accountProfile, addressBusy, currentUser]);
  const displayNameRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState(null);
  const [displayNameOverride, setDisplayNameOverride] = useState(null);
  const [orderCount, setOrderCount] = useState(null);
  const [displayNameError, setDisplayNameError] = useState("");
  const [addressErrors, setAddressErrors] = useState({});
  const [addressBusy, setAddressBusy] = useState(false);

  // Settings accordion form state
  const [displayName, setDisplayName] = useState(user?.displayName ?? "Yamada Hanako");
  const [email, setEmail] = useState(user?.email ?? "yamada@example.com");
  const [addressLine1, setAddressLine1] = useState(user?.addressLine1 ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [province, setProvince] = useState(user?.province ?? "");
  const [postalCode, setPostalCode] = useState(user?.postalCode ?? "");
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);

  const validateDisplayName = useCallback((value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      return "Display name is required.";
    }
    if (!DISPLAY_NAME_REGEX.test(trimmed)) {
      return "Use 2-50 chars: letters, numbers, spaces, . , ' - only.";
    }
    return "";
  }, []);

  const validateAddressFields = useCallback((values) => {
    const errors = {};
    const addr = (values.addressLine1 || "").trim();
    const city = (values.city || "").trim();
    const prov = (values.province || "").trim();
    const post = (values.postalCode || "").trim();

    if (addr && !ADDRESS_REGEX.test(addr)) {
      errors.addressLine1 = "Enter a complete street address.";
    }
    if (city && !AREA_REGEX.test(city)) {
      errors.city = "Enter a valid city.";
    }
    if (prov && !AREA_REGEX.test(prov)) {
      errors.province = "Enter a valid province.";
    }
    if (post && !POSTAL_REGEX.test(post)) {
      errors.postalCode = "Postal code must be 4 digits.";
    }
    return errors;
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const iconColor = rgb(tokens["--icon-neutral-primary"]);
  const iconColorSm = rgb(tokens["--icon-neutral-secondary"]);
  const iconSize = 15;
  const resolvedDisplayName = displayNameOverride ?? user?.displayName;
  const resolvedPhotoURL = avatarOverride ?? user?.photoURL;
  const resolvedOrderCount = Number.isFinite(orderCount) ? orderCount : user?.orderCount ?? 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSection = useCallback(
    (key) => setOpenSection((prev) => (prev === key ? null : key)),
    []
  );

  const handleDarkMode = useCallback(
    (val) => {
      setDarkMode(val);
      setScheme?.(val ? "dark" : "light");
    },
    [setScheme]
  );

  const handleThemeSelect = useCallback(
    (key) => {
      setActiveTheme(key);
      setTheme?.(key);
    },
    [setTheme]
  );

  const handleSignOut = useCallback(() => {
    signOutUser?.();
  }, [signOutUser]);

  const handleEditProfile = useCallback(() => {
    setOpenSection("profile");
    setTimeout(() => {
      displayNameRef.current?.focus?.();
    }, 250);
  }, []);

  useEffect(() => {
    let active = true;

    const loadOrderCount = async () => {
      if (!currentUser) {
        setOrderCount(null);
        return;
      }

      try {
        const total = await getMyOrdersCount(currentUser);
        if (active) {
          setOrderCount(total);
        }
      } catch {
        if (active) {
          setOrderCount(null);
        }
      }
    };

    loadOrderCount();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const handleChangeAvatar = useCallback(async () => {
    const firebaseUser = auth.currentUser || currentUser;
    if (!firebaseUser) {
      showToast("Sign in to update your profile photo.", "error");
      return;
    }

    setAvatarBusy(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Photo library permission is required.", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const [asset] = result.assets;
      const mimeType = asset.mimeType || "";
      const fileName = asset.fileName || "";
      const hasAcceptedMime = mimeType ? AVATAR_MIME_REGEX.test(mimeType) : false;
      const hasAcceptedExtension = fileName ? AVATAR_EXTENSION_REGEX.test(fileName) : false;

      if (!hasAcceptedMime && !hasAcceptedExtension) {
        showToast("Please choose a JPG, PNG, or WEBP image.", "error");
        return;
      }

      if (Number.isFinite(asset.fileSize) && asset.fileSize > MAX_AVATAR_FILE_SIZE) {
        showToast("Image is too large. Max size is 5MB.", "error");
        return;
      }

      const updatedUser = await updateMyProfile(
        firebaseUser,
        {},
        {
          uri: asset.uri,
          name: asset.fileName || `avatar-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        }
      );
      await updateProfile(firebaseUser, { photoURL: updatedUser.photoURL || "" }).catch(() => null);
      await refreshAccountProfile?.(firebaseUser);
      setAvatarOverride(updatedUser.photoURL || "");
      showToast("Profile photo updated.", "success");
    } catch (error) {
      showToast(error?.message || "Unable to update profile photo.", "error");
    } finally {
      setAvatarBusy(false);
    }
  }, [currentUser, refreshAccountProfile]);

  const handleSaveProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser || currentUser;
    if (!firebaseUser) {
      showToast("Sign in to update your profile.", "error");
      return;
    }

    const trimmed = displayName.trim();
    const nextDisplayNameError = validateDisplayName(trimmed);
    if (nextDisplayNameError) {
      setDisplayNameError(nextDisplayNameError);
      showToast(nextDisplayNameError, "error");
      return;
    }

    setDisplayNameError("");

    setProfileBusy(true);

    try {
      const updatedUser = await updateMyProfile(firebaseUser, { displayName: trimmed });
      await updateProfile(firebaseUser, { displayName: updatedUser.displayName || trimmed }).catch(() => null);
      await refreshAccountProfile?.(firebaseUser);
      setDisplayNameOverride(updatedUser.displayName || trimmed);
      showToast("Profile updated.", "success");
    } catch (error) {
      showToast(error?.message || "Unable to update profile.", "error");
    } finally {
      setProfileBusy(false);
    }
  }, [currentUser, displayName, refreshAccountProfile, validateDisplayName]);

  const handleSaveAddress = useCallback(async () => {
    const firebaseUser = auth.currentUser || currentUser;
    if (!firebaseUser) {
      showToast("Sign in to update your address.", "error");
      return;
    }

    const nextErrors = validateAddressFields({
      addressLine1,
      city,
      province,
      postalCode,
    });
    setAddressErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setAddressBusy(true);
    try {
      await updateMyProfile(firebaseUser, {
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
      });
      await refreshAccountProfile?.(firebaseUser);
      showToast("Address saved.", "success");
    } catch (error) {
      showToast(error?.message || "Unable to save address.", "error");
    } finally {
      setAddressBusy(false);
    }
  }, [
    addressLine1,
    city,
    currentUser,
    postalCode,
    province,
    refreshAccountProfile,
    validateAddressFields,
  ]);

  const handleSignIn = useCallback(() => {
    navigation?.navigate?.('login');
  }, [navigation]);

  // ── Icon helpers ───────────────────────────────────────────────────────────
  const userIcon = useMemo(() => <UserIcon size={iconSize} color={iconColorSm} />, [iconColorSm]);
  const addressIcon = useMemo(() => <MapPinIcon size={iconSize} color={iconColorSm} />, [iconColorSm]);
  const bellIcon = useMemo(() => <BellIcon size={iconSize} color={iconColorSm} />, [iconColorSm]);
  const bagIcon = useMemo(() => <ShoppingBagIcon size={18} color={iconColorSm} />, [iconColorSm]);
  const heartIcon = useMemo(() => <HeartIcon size={18} color={iconColorSm} />, [iconColorSm]);

  // ── Screen-tone overlay (shared decorative element from manga UI kit) ──────
  const screenToneStyle = {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.035,
  };

  // ── Avatar initials fallback ───────────────────────────────────────────────
  const initials = (user?.displayName ?? "Yamada Hanako")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Screen style={s.safe} edges={["left", "right", "bottom"]} safeTop={false}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ────────────────────────────────────────────────────────────
            ① HERO — identity
        ──────────────────────────────────────────────────────────── */}
        <LinearGradient
          style={[
            s.hero,
            {
              borderBottomColor: rgb(tokens["--border-neutral-secondary"]),
            },
          ]}
          colors={[
            rgb(tokens["--surface-brand-primary-pressed"]),
            rgb(tokens["--surface-brand-primary"]),
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Screen-tone halftone texture (manga aesthetic) */}
          <View
            pointerEvents="none"
            style={[
              screenToneStyle,
              {
                backgroundImage: undefined, // RN: use pattern view below
              },
            ]}
          />

          <View style={s.heroInner}>
            {/* Avatar */}
            <Pressable
              onPress={handleChangeAvatar}
              disabled={avatarBusy}
              style={({ pressed }) => [s.avatarPressable,
              pressed && !avatarBusy && { opacity: 0.7 },
              avatarBusy && { opacity: 0.6 },
              ]}
            >
              <Avatar
                size="lg"
                image={resolvedPhotoURL ?? undefined}
                initials={initials}
                colorScheme="dark"
              />
              <View
                pointerEvents="none"
                style={[
                  s.avatarCameraBadge,
                  { backgroundColor: rgb(tokens["--base-canvas"]) },
                ]}
              >
                <CameraIcon size={11} color={rgb(tokens["--icon-neutral-primary"])} />
              </View>
            </Pressable>

            {/* Name block */}
            <View style={s.heroNames}>
              <Text
                style={[
                  ts.h2,
                  {
                    color: rgb(tokens["--text-neutral-inverted"]),
                    letterSpacing: -0.5,
                    lineHeight: 26,
                  },
                ]}
                numberOfLines={1}
              >
                {resolvedDisplayName ?? "Yamada Hanako"}
              </Text>
              <Text
                style={[
                  ts.caption,
                  {
                    color: rgb(tokens["--text-neutral-inverted"]),
                    opacity: 0.55,
                    letterSpacing: 1,
                    marginTop: 2,
                  },
                ]}
              >
                {user?.displayNameRoman ?? "YAMADA HANAKO"}
              </Text>
            </View>

            {/* Edit button - only show for authenticated users */}
            {isAuthenticated ? (
              <Pressable
                onPress={handleEditProfile}
                style={[
                  s.editBtn,
                  {
                    borderColor: rgb(tokens["--text-neutral-inverted"]),
                  },
                ]}
                accessibilityLabel="Edit profile"
              >
                <PencilSimpleIcon
                  size={14}
                  color={rgb(tokens["--text-neutral-inverted"])}
                />
              </Pressable>
            ) : null}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatPill
              value={resolvedOrderCount}
              label="ORDERS"
              icon={<ShoppingBagIcon size={14} color={rgb(tokens["--text-neutral-secondary"])} />}
            />
            <View
              style={[
                s.statsDivider,
                { backgroundColor: rgb(tokens["--border-neutral-secondary"]) },
              ]}
            />
            <StatPill
              value={user?.wishlistCount ?? 8}
              label="WISHLIST"
              icon={<HeartIcon size={14} color={rgb(tokens["--text-neutral-secondary"])} />}
            />
          </View>
        </LinearGradient>

        <View style={s.body}>
          {/* ──────────────────────────────────────────────────────────
              ② SETTINGS — Accordion rows (only for authenticated users)
          ────────────────────────────────────────────────────────── */}
          {isAuthenticated ? (
            <>
              <MangaSectionHeader title="Settings" />

              <View
                style={[
                  s.settingsCard,
                  {
                    backgroundColor: rgb(tokens["--base-canvas"]),
                    borderColor: rgb(tokens["--border-neutral-secondary"]),
                  },
                ]}
              >

                {/* Profile info */}
                <SettingsRow
                  icon={userIcon}
                  title="Profile Info"
                  open={openSection === "profile"}
                  onToggle={() => toggleSection("profile")}
                >
                  <View style={s.accordionBody}>
                    <TextInput
                      ref={displayNameRef}
                      label="Display Name"
                      required
                      value={displayName}
                      onChangeText={(value) => {
                        setDisplayName(value);
                        if (displayNameError) {
                          setDisplayNameError(validateDisplayName(value));
                        }
                      }}
                      placeholder="Your name"
                      error={displayNameError}
                    />
                    <View style={{ marginTop: 16 }}>
                      <Button
                        label="Save Changes"
                        onPress={handleSaveProfile}
                        size="sm"
                        loading={profileBusy}
                        disabled={!isAuthenticated}
                      />
                    </View>
                  </View>
                </SettingsRow>

                {/* Addresses */}
                <SettingsRow
                  icon={addressIcon}
                  title="Addresses"
                  open={openSection === "addresses"}
                  onToggle={() => toggleSection("addresses")}
                >
                  <View style={s.accordionBody}>
                    <TextInput
                      label="Street Address"
                      placeholder="Block/Lot, Street, Barangay"
                      value={addressLine1}
                      onChangeText={(value) => {
                        setAddressLine1(value);
                        if (addressErrors.addressLine1) {
                          setAddressErrors((prev) => ({ ...prev, addressLine1: "" }));
                        }
                      }}
                      error={addressErrors.addressLine1}
                      autoCapitalize="words"
                      style={{ marginTop: 12 }}
                    />
                    <TextInput
                      label="City"
                      placeholder="Quezon City"
                      value={city}
                      onChangeText={(value) => {
                        setCity(value);
                        if (addressErrors.city) {
                          setAddressErrors((prev) => ({ ...prev, city: "" }));
                        }
                      }}
                      error={addressErrors.city}
                      autoCapitalize="words"
                      style={{ marginTop: 12 }}
                    />
                    <TextInput
                      label="Province"
                      placeholder="Metro Manila"
                      value={province}
                      onChangeText={(value) => {
                        setProvince(value);
                        if (addressErrors.province) {
                          setAddressErrors((prev) => ({ ...prev, province: "" }));
                        }
                      }}
                      error={addressErrors.province}
                      autoCapitalize="words"
                      style={{ marginTop: 12 }}
                    />
                    <TextInput
                      label="Postal Code"
                      placeholder="1100"
                      value={postalCode}
                      onChangeText={(value) => {
                        setPostalCode(value);
                        if (addressErrors.postalCode) {
                          setAddressErrors((prev) => ({ ...prev, postalCode: "" }));
                        }
                      }}
                      error={addressErrors.postalCode}
                      keyboardType="numeric"
                      autoCapitalize="none"
                      style={{ marginTop: 12 }}
                    />
                    <View style={{ marginTop: 16 }}>
                      <Button
                        label={addressBusy ? "Saving..." : "Save Address"}
                        onPress={handleSaveAddress}
                        size="sm"
                        loading={addressBusy}
                        disabled={!isAuthenticated || addressBusy}
                      />
                    </View>
                  </View>
                </SettingsRow>

                {/* Notifications */}
                <SettingsRow
                  icon={bellIcon}
                  title="Notifications"
                  open={openSection === "notifications"}
                  onToggle={() => toggleSection("notifications")}
                >
                  <View style={[s.accordionBody, { gap: 0 }]}>
                    <ToggleSwitch
                      value={notifOrders}
                      onValueChange={setNotifOrders}
                      label="Order updates"
                      sublabel="Shipping, delivery, and returns"
                    />
                    <ToggleSwitch
                      value={notifPromo}
                      onValueChange={setNotifPromo}
                      label="Promotions"
                      sublabel="Sales, new arrivals, and offers"
                    />
                  </View>
                </SettingsRow>

              </View>
            </>
          ) : (
            /* Guest fallback */
            <View
              style={[
                s.guestCard,
                {
                  backgroundColor: rgb(tokens["--base-canvas"]),
                  borderColor: rgb(tokens["--border-neutral-secondary"]),
                },
              ]}
            >
              <View style={s.guestContent}>
                <UserIcon size={32} color={rgb(tokens["--icon-neutral-tertiary"])} />
                <Text
                  style={[
                    ts.h3,
                    {
                      color: rgb(tokens["--text-neutral-primary"]),
                      marginTop: 12,
                      textAlign: "center",
                    },
                  ]}
                >
                  Sign in to access your profile
                </Text>
                <Text
                  style={[
                    ts.bodySm,
                    {
                      color: rgb(tokens["--text-neutral-secondary"]),
                      marginTop: 8,
                      textAlign: "center",
                      lineHeight: 20,
                    },
                  ]}
                >
                  Save your preferences, view order history, and manage your account settings
                </Text>
                <Button
                  label="Sign In"
                  onPress={handleSignIn}
                  style={{ marginTop: 20, width: "100%" }}
                  leftIcon={<ArrowRightIcon size={16} color={rgb(tokens["--shared-text-on-filled"])} />}
                />
              </View>
            </View>
          )}

          {/* ──────────────────────────────────────────────────────────
              ③ PREFERENCES — dark mode + theme selector (available to all)
          ────────────────────────────────────────────────────────── */}
          <MangaSectionHeader title="Preferences" />
          <View
            style={[
              s.prefCard,
              {
                backgroundColor: rgb(tokens["--base-canvas"]),
                borderColor: rgb(tokens["--border-neutral-secondary"]),
              },
            ]}
          >
            {/* Dark mode toggle */}
            <ToggleSwitch
              value={darkMode}
              onValueChange={handleDarkMode}
              label="Dark Mode"
            />

            {/* Divider */}
            <View
              style={[
                s.prefDivider,
                { backgroundColor: rgb(tokens["--border-neutral-secondary"]) },
              ]}
            />

            {/* Theme selector */}
            <View style={s.themeRow}>
              <Text
                style={[
                  ts.label,
                  { fontSize: 13, marginBottom: 12 },
                ]}
              >
                Theme
              </Text>

              <View style={s.themeSwatches}>
                {THEMES.map((t) => (
                  <ThemeSwatch
                    key={t.key}
                    theme={t}
                    active={activeTheme === t.key}
                    onSelect={handleThemeSelect}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* ──────────────────────────────────────────────────────────
              ④ FOOTER — sign out only (conditional)
          ────────────────────────────────────────────────────────── */}
          {isAuthenticated && (
            <View style={s.footer}>
              <Button
                variant="danger"
                label="Sign Out"
                leftIcon={
                  <SignOutIcon
                    size={15}
                    color={rgb(tokens["--shared-text-on-filled"])}
                  />
                }
                onPress={handleSignOut}
                style={{ flex: 1 }}
              />
            </View>
          )}

        </View>
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SWATCH_SIZE = 44;
const SWATCH_TOP_H = SWATCH_SIZE * 0.25;  // 25% accent
const SWATCH_BOT_H = SWATCH_SIZE * 0.75;  // 75% brand

const s = StyleSheet.create({

  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 0,  // Removed extra top padding
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,  // Added top margin for spacing
    marginBottom: 20,
  },
  heroNames: {
    flex: 1,
    paddingTop: 2,
  },
  avatarPressable: {
    position: "relative",
  },
  avatarCameraBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 0,
    marginHorizontal: -SCREEN_PAD,  // bleed to card edges
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 3,
  },
  statsDivider: {
    width: 1,
    marginVertical: 10,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    paddingTop: 24,
    gap: 6,
  },

  // ── Manga section header ──────────────────────────────────────────────────
  mangaSecHd: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    gap: 0,
  },
  mangaSecBar: {
    width: 3,
    height: 14,
    borderRadius: 0,
    marginRight: 8,
  },

  // ── Settings card ─────────────────────────────────────────────────────────
  settingsCard: {
    marginHorizontal: SCREEN_PAD,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  settingsAccordion: {
    borderBottomWidth: 1,
    paddingHorizontal: SCREEN_PAD,
  },
  settingsRowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: SCREEN_PAD,  // Added horizontal padding
  },
  settingsIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  accordionBody: {
    paddingBottom: 16,
    paddingHorizontal: SCREEN_PAD,
    gap: 4,
  },

  // ── Preferences card ──────────────────────────────────────────────────────
  prefCard: {
    marginHorizontal: SCREEN_PAD,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 4,
    marginBottom: 24,
  },
  prefDivider: {
    height: 1,
    marginVertical: 4,
    marginHorizontal: -SCREEN_PAD,
  },
  themeRow: {
    paddingVertical: 14,
  },
  themeSwatches: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },

  // ── Theme swatch ──────────────────────────────────────────────────────────────
  themeSwatchWrap: {
    alignItems: "center",
    width: SWATCH_SIZE, // Fixed width matching swatch size
  },
  themeSwatchPressable: {
    alignItems: "center",
    gap: 6, // Space between swatch and underline
  },
  themeSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
  },
  themeSwatchTop: {
    height: SWATCH_TOP_H,
  },
  themeSwatchBot: {
    height: SWATCH_BOT_H,
  },
  themeSwatchLabel: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  themeSwatchUnderline: {
    width: SWATCH_SIZE,
    height: 2,
    borderRadius: 1,
  },

  // ── Guest card ─────────────────────────────────────────────────────────────
  guestCard: {
    marginHorizontal: SCREEN_PAD,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    paddingVertical: 32,
    paddingHorizontal: SCREEN_PAD,
  },
  guestContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: SCREEN_PAD,
  },
  footerBtn: {
    flex: 1,
  },
});
