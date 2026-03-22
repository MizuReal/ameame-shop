import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeftIcon, StarIcon } from "phosphor-react-native";
import { useDispatch, useSelector } from "react-redux";

import Screen from "@components/layout/Screen";
import NavBar from "@components/navigation/NavBar";
import Button from "@components/action/Button";
import Badge from "@components/display/Badge";
import ConfirmDialog from "@components/overlay/ConfirmDialog";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { showToast } from "@utils/toastBus";
import { useAuth } from "../../context/store/auth";
import {
  deleteAdminReview,
  fetchAdminReviewDetail,
  updateAdminReview,
} from "../../redux/slices/adminReviewSlice";

export default function ReviewDetailScreen({ route, navigation }) {
  const tokens = useColors();
  const type = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const reviewId = route?.params?.reviewId || "";
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { detail, loadingDetail, updating, deleting } = useSelector(
    (state) => state.adminReviews
  );

  useEffect(() => {
    if (!currentUser || !reviewId) return;
    dispatch(fetchAdminReviewDetail({ firebaseUser: currentUser, reviewId }));
  }, [currentUser, dispatch, reviewId]);

  const handleToggleActive = useCallback(async () => {
    if (!currentUser || !detail?.id) return;
    try {
      await dispatch(
        updateAdminReview({
          firebaseUser: currentUser,
          reviewId: detail.id,
          updates: { isActive: !detail.isActive },
        })
      ).unwrap();
      showToast(detail.isActive ? "Review hidden." : "Review restored.", "success");
    } catch (error) {
      showToast(error?.message || "Failed to update review.", "error");
    }
  }, [currentUser, detail, dispatch]);

  const handleDelete = useCallback(async () => {
    if (!currentUser || !detail?.id) return;
    try {
      await dispatch(
        deleteAdminReview({
          firebaseUser: currentUser,
          reviewId: detail.id,
        })
      ).unwrap();
      showToast("Review deleted permanently.", "success");
      navigation.goBack();
    } catch (error) {
      showToast(error?.message || "Failed to delete review.", "error");
    }
  }, [currentUser, detail, dispatch, navigation]);

  return (
    <Screen safeTop scrollable contentContainerStyle={s.content}>
      <NavBar
        title="Review Detail"
        leftSlot={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />
          </Pressable>
        }
      />

      {loadingDetail ? (
        <View style={s.center}>
          <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
        </View>
      ) : !detail ? (
        <View style={s.center}>
          <Text style={[type.bodySm, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            Review not found.
          </Text>
        </View>
      ) : (
        <View style={s.container}>
          <Text style={type.h2}>Review Detail</Text>

          <View style={s.metaBlock}>
            <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              Product
            </Text>
            <Text style={[s.value, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              {detail.product?.name || "Product"}
            </Text>
            <Text style={[s.subValue, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {detail.product?.category || ""}
            </Text>
          </View>

          <View style={s.metaBlock}>
            <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              Customer
            </Text>
            <Text style={[s.value, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              {detail.user?.displayName || "Customer"}
            </Text>
            <Text style={[s.subValue, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
              {detail.user?.email || ""}
            </Text>
          </View>

          <View style={s.metaBlock}>
            <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              Rating
            </Text>
            <View style={s.ratingRow}>
              <Text style={[s.value, { color: rgb(tokens["--text-neutral-primary"]) }]}>
                {Number(detail.rating || 0).toFixed(1)}
              </Text>
              <StarIcon size={14} weight="fill" color={rgb(tokens["--text-neutral-primary"])} />
            </View>
            <View style={s.badgeRow}>
              {detail.verified ? <Badge label="Verified" variant="success" size="sm" /> : null}
              {!detail.isActive ? <Badge label="Deleted" variant="muted" size="sm" /> : null}
            </View>
          </View>

          <View style={s.commentBlock}>
            <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              Review
            </Text>
            <Text style={[s.comment, { color: rgb(tokens["--text-neutral-primary"]) }]}>
              {detail.comment || "No comment provided."}
            </Text>
          </View>

          <View style={s.actions}>
            <Button
              label={detail.isActive ? "Soft Delete" : "Restore Review"}
              variant={detail.isActive ? "danger" : "secondary"}
              onPress={handleToggleActive}
              loading={updating}
              fullWidth
            />
            <Button
              label="Hard Delete"
              variant="danger"
              onPress={() => setConfirmDelete(true)}
              fullWidth
            />
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete review permanently?"
        body="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },
  metaBlock: {
    gap: 4,
  },
  label: {
    fontFamily: fonts.ui.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  value: {
    fontFamily: fonts.ui.bold,
    fontSize: 14,
  },
  subValue: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  commentBlock: {
    gap: 6,
  },
  comment: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
});
