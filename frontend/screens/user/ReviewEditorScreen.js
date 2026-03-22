import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeftIcon, StarIcon } from "phosphor-react-native";
import { useDispatch, useSelector } from "react-redux";

import Screen from "@components/layout/Screen";
import NavBar from "@components/navigation/NavBar";
import Button from "@components/action/Button";
import TextInput from "@components/input/TextInput";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { showToast } from "@utils/toastBus";
import { useAuth } from "../../context/store/auth";
import {
  createReview,
  fetchMyReviewForProduct,
  fetchMyReviews,
  fetchProductReviews,
  updateReview,
} from "../../redux/slices/reviewSlice";

function StarInput({ value, onChange }) {
  const tokens = useColors();
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={s.starRow}>
      {stars.map((star) => {
        const active = value >= star;
        return (
          <Pressable
            key={star}
            onPress={() => onChange?.(star)}
            style={({ pressed }) => [s.starButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <StarIcon
              size={22}
              weight={active ? "fill" : "regular"}
              color={rgb(tokens["--text-neutral-primary"])}
              style={{ opacity: active ? 1 : 0.25 }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ReviewEditorScreen({ navigation, route }) {
  const tokens = useColors();
  const type = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const productId = route?.params?.productId || "";
  const productName = route?.params?.productName || "Product";

  const { myReviewByProductId, submitting } = useSelector((state) => state.reviews);
  const existingReview = productId ? myReviewByProductId[productId] : null;

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (currentUser && productId) {
      dispatch(fetchMyReviewForProduct({ firebaseUser: currentUser, productId }));
    }
  }, [currentUser, dispatch, productId]);

  useEffect(() => {
    if (!hydratedRef.current && existingReview) {
      setRating(existingReview.rating || 0);
      setComment(existingReview.comment || "");
      hydratedRef.current = true;
    }
  }, [existingReview]);

  const handleSubmit = useCallback(async () => {
    if (!currentUser) {
      showToast("Please sign in to review this product.", "warning");
      return;
    }

    if (!productId) {
      showToast("Missing product.", "error");
      return;
    }

    if (!rating || rating < 1) {
      showToast("Please select a star rating.", "warning");
      return;
    }

    try {
      if (existingReview?.id && existingReview?.isActive) {
        await dispatch(
          updateReview({
            firebaseUser: currentUser,
            reviewId: existingReview.id,
            payload: { rating, comment },
          })
        ).unwrap();
        showToast("Review updated.", "success");
      } else {
        await dispatch(
          createReview({
            firebaseUser: currentUser,
            payload: { productId, rating, comment },
          })
        ).unwrap();
        showToast("Review submitted.", "success");
      }

      dispatch(fetchMyReviews({ firebaseUser: currentUser }));
      dispatch(fetchProductReviews({ productId, page: 1, limit: 3, sort: "newest" }));
      navigation.goBack();
    } catch (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : typeof error?.message === "string"
            ? error.message
            : "Failed to submit review.";
      showToast(errorMessage, "error");
    }
  }, [
    comment,
    currentUser,
    dispatch,
    existingReview,
    navigation,
    productId,
    rating,
  ]);

  const backIcon = useMemo(
    () => <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />,
    [tokens]
  );

  return (
    <Screen safeTop={false} contentContainerStyle={s.content} scrollable>
      <NavBar
        title="Write Review"
        leftSlot={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            {backIcon}
          </Pressable>
        }
      />

      <View style={s.container}>
        <Text style={[type.h3, { color: rgb(tokens["--text-neutral-primary"]) }]}>
          {productName}
        </Text>

        <View style={s.section}>
          <Text style={[s.label, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
            Star Rating
          </Text>
          <StarInput value={rating} onChange={setRating} />
          <Text style={[s.ratingLabel, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
            {rating ? `${rating}/5` : "Select a rating"}
          </Text>
        </View>

        <View style={s.section}>
          <TextInput
            label="Comment"
            placeholder="Share details about your experience..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
          />
        </View>

        <Button
          label={existingReview?.id && existingReview?.isActive ? "Update Review" : "Submit Review"}
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 18,
  },
  section: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.ui.bold,
    fontSize: 12,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starButton: {
    padding: 2,
  },
  ratingLabel: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
});
