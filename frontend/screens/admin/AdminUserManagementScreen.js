import { useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@modules/firebase/client";
import { useColors } from "@colors/colorContext";
import { rgb } from "@shared/styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import Button from "@components/action/Button";
import Screen from "@components/layout/Screen";
import Card from "@components/layout/Card";
import Divider from "@components/layout/Divider";
import SearchBar from "@components/input/SearchBar";
import Dropdown from "@components/input/Dropdown";
import ToggleSwitch from "@components/input/ToggleSwitch";
import SectionHeader from "@components/display/SectionHeader";
import Badge from "@components/display/Badge";
import Alert from "@components/statusFeedback/Alert";
import Spinner from "@components/statusFeedback/Spinner";
import { adminListUsers, adminUpdateUser, syncAuthSession } from "@utils/authSession";

const ROLE_OPTIONS = [
  { label: "User", value: "0" },
  { label: "Admin", value: "1" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Active Only", value: "active" },
  { label: "Inactive Only", value: "inactive" },
];

function UserRow({
  user,
  isSelf,
  busy,
  message,
  onRoleChange,
  onActiveChange,
  onSave,
}) {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  return (
    <Card variant="outlined" radius="md" padding="md" style={s.rowCard}>
      <View style={s.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>{user.displayName || user.email}</Text>
          <Text style={[type.caption, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            {user.email}
          </Text>
        </View>
        <View style={s.rowHeaderActions}>
          {isSelf && <Badge label="You" variant="brand-subtle" size="sm" />}
          <Button
            label={busy ? "Saving..." : "Save Changes"}
            onPress={() => onSave(user.id)}
            disabled={busy || isSelf}
            loading={busy}
            variant={isSelf ? "ghost" : "primary"}
            size="sm"
          />
        </View>
      </View>

      <Divider spacing="sm" />

      <Dropdown
        label="Account Role"
        value={String(user.role)}
        options={ROLE_OPTIONS}
        onChange={(nextRole) => onRoleChange(user.id, Number(nextRole))}
        disabled={busy || isSelf}
      />

      <View style={s.statusRow}>
        <View style={{ flex: 1 }}>
          <ToggleSwitch
            label="Account Status"
            sublabel={user.isActive ? "Active" : "Deactivated"}
            value={Boolean(user.isActive)}
            onValueChange={(nextActive) => onActiveChange(user.id, nextActive)}
            disabled={busy || isSelf}
          />
          {isSelf ? (
            <Text style={[type.caption, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              Your own account cannot be modified here.
            </Text>
          ) : null}
        </View>
      </View>

      {message ? (
        <Alert
          variant={message.type === "error" ? "error" : "success"}
          body={message.text}
        />
      ) : null}
    </Card>
  );
}

export default function AdminUserManagementScreen() {
  const tokens = useColors();
  const type = useMemo(() => makeTypeStyles(tokens), [tokens]);

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [rowBusy, setRowBusy] = useState({});
  const [rowMessage, setRowMessage] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadUsers = async (signedInUser, { asRefresh = false } = {}) => {
    if (!signedInUser) {
      return;
    }

    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setScreenError("");

    try {
      const profile = await syncAuthSession(signedInUser);
      if (profile.role !== 1 || profile.isActive === false) {
        setScreenError("You do not have permission to manage users.");
        setUsers([]);
        setCurrentProfile(profile);
        return;
      }

      const nextUsers = await adminListUsers(signedInUser);
      setCurrentProfile(profile);
      setUsers(nextUsers);
    } catch (error) {
      setScreenError(error.message || "Unable to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      setFirebaseUser(user || null);
      setRowMessage({});

      if (!user) {
        setCurrentProfile(null);
        setUsers([]);
        setLoading(false);
        setScreenError("You must sign in as an admin.");
        return;
      }

      await loadUsers(user);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const updateUserDraft = (userId, changes) => {
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, ...changes } : item)));
    setRowMessage((prev) => ({ ...prev, [userId]: null }));
  };

  const onSave = async (userId) => {
    if (!firebaseUser) {
      return;
    }

    const targetUser = users.find((item) => item.id === userId);
    if (!targetUser) {
      return;
    }

    setRowBusy((prev) => ({ ...prev, [userId]: true }));
    setRowMessage((prev) => ({ ...prev, [userId]: null }));

    try {
      const updatedUser = await adminUpdateUser(firebaseUser, userId, {
        role: targetUser.role,
        isActive: Boolean(targetUser.isActive),
      });

      setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updatedUser } : item)));
      setRowMessage((prev) => ({
        ...prev,
        [userId]: { type: "success", text: "User updated successfully." },
      }));
    } catch (error) {
      setRowMessage((prev) => ({
        ...prev,
        [userId]: { type: "error", text: error.message || "Failed to update user." },
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const isAuthorizedAdmin = currentProfile?.role === 1 && currentProfile?.isActive !== false;
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (user) => {
      const name = String(user.displayName || "").toLowerCase();
      const email = String(user.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    };

    return users.filter((user) => {
      if (query && !matchesSearch(user)) {
        return false;
      }
      if (statusFilter === "active") {
        return Boolean(user.isActive);
      }
      if (statusFilter === "inactive") {
        return !user.isActive;
      }
      return true;
    });
  }, [searchQuery, statusFilter, users]);

  return (
    <Screen
      edges={["left", "right"]}
      safeTop={false}
      scrollable
      style={s.safe}
      contentContainerStyle={s.content}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(firebaseUser, { asRefresh: true })}
          />
        ),
      }}
    >
      <SectionHeader
        title="Admin User Management"
        subtitle="USER ACCOUNTS"
        variant="bar"
      />

      {!loading && !screenError && isAuthorizedAdmin ? (
        <View style={s.searchWrap}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or email..."
            onClear={() => setSearchQuery("")}
            returnKeyType="search"
          />
          <Dropdown
            label="Status Filter"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={setStatusFilter}
          />
        </View>
      ) : null}

      {loading ? (
        <View style={s.centreState}>
          <Spinner size="sm" />
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            Loading users…
          </Text>
        </View>
      ) : null}

      {screenError ? (
        <Alert variant="error" title="Access denied" body={screenError} />
      ) : null}

      {!loading && !screenError && isAuthorizedAdmin && filteredUsers.length === 0 ? (
        <View style={s.centreState}>
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {searchQuery.trim() ? "No users match your search." : "No users found."}
          </Text>
        </View>
      ) : null}

      {!loading && !screenError && isAuthorizedAdmin
        ? filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.firebaseUid && user.firebaseUid === firebaseUser?.uid}
              busy={Boolean(rowBusy[user.id])}
              message={rowMessage[user.id]}
              onRoleChange={(userId, role) => updateUserDraft(userId, { role })}
              onActiveChange={(userId, isActive) => updateUserDraft(userId, { isActive })}
              onSave={onSave}
            />
          ))
        : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 48,
    gap: 16,
  },
  searchWrap: {
    paddingTop: 2,
    gap: 12,
  },
  rowCard: {
    gap: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  centreState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
});
