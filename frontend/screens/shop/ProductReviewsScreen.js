import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeftIcon, StarIcon } from "phosphor-react-native";
import { useDispatch, useSelector } from "react-redux";

import Screen from "@components/layout/Screen";
import NavBar from "@components/navigation/NavBar";
import Dropdown from "@components/input/Dropdown";
import Tag from "@components/utility/Tag";
import ReviewCard from "@components/display/ReviewCard";
import ConfirmDialog from "@components/overlay/ConfirmDialog";
import ReviewActionsMenu from "@components/overlay/ReviewActionsMenu";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { showToast } from "@utils/toastBus";
import { useAuth } from "../../context/store/auth";
import {
  deleteReview,
  fetchMyReviewForProduct,
  fetchProductReviews,
} from "../../redux/slices/reviewSlice";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Highest rating", value: "highest" },
];

const RATING_FILTERS = [5, 4, 3, 2, 1];

export default function ProductReviewsScreen({ navigation, route }) {
  const tokens = useColors();
  const type = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser } = useAuth();

  const productId = route?.params?.productId || "";
  const productName = route?.params?.productName || "Reviews";

  const [sort, setSort] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const productState = useSelector(
    (state) => state.reviews.productReviews[productId]
  );
  const myReview = useSelector(
    (state) => state.reviews.myReviewByProductId[productId]
  );
  const deleting = useSelector((state) => state.reviews.deleting);

  const reviews = productState?.items || [];
  const loading = productState?.loading;
  const page = productState?.page || 1;
  const limit = productState?.limit || 20;
  const total = productState?.total || 0;

  const hasMore = reviews.length < total;

  const loadReviews = useCallback(
    (nextPage = 1) => {
      if (!productId) return;
      dispatch(
        fetchProductReviews({
          productId,
          page: nextPage,
          limit,
          sort,
          rating: ratingFilter || "",
        })
      );
    },
    [dispatch, limit, productId, ratingFilter, sort]
  );

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews, sort, ratingFilter]);

  useEffect(() => {
    if (currentUser && productId) {
      dispatch(fetchMyReviewForProduct({ firebaseUser: currentUser, productId }));
    }
  }, [currentUser, dispatch, productId]);

  const mergedReviews = useMemo(() => {
    if (myReview?.id && myReview?.isActive) {
      const remaining = reviews.filter((item) => item.id !== myReview.id);
      return [myReview, ...remaining];
    }
    return reviews;
  }, [myReview, reviews]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadReviews(page + 1);
  }, [hasMore, loadReviews, loading, page]);

  const handleDelete = useCallback(async () => {
    if (!currentUser || !confirmDelete?.id) {
      setConfirmDelete(null);
      return;
    }

    try {
      await dispatch(
        deleteReview({
          firebaseUser: currentUser,
          reviewId: confirmDelete.id,
        })
      ).unwrap();
      showToast("Review deleted.", "success");
      loadReviews(1);
    } catch (error) {
      showToast(error?.message || "Failed to delete review.", "error");
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete, currentUser, dispatch, loadReviews]);

  return (
    <Screen safeTop contentContainerStyle={s.content}>
      <NavBar
        title="Reviews"
        leftSlot={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />
          </Pressable>
        }
      />

      <View style={s.header}>
        <Text style={[type.h3, { color: rgb(tokens["--text-neutral-primary"]) }]}>
          {productName}
        </Text>
        <Text style={[s.subTitle, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
          {`${total} review${total === 1 ? "" : "s"}`}
        </Text>
      </View>

      <View style={s.filters}>
        <View style={s.sortWrap}>
          <Dropdown
            label="Sort"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(value) => setSort(value)}
          />
        </View>
        <View style={s.ratingRow}>
          {RATING_FILTERS.map((star) => (
            <Tag
              key={star}
              label={`${star}`}
              icon={<StarIcon size={12} weight="fill" color={"rgb(255, 223, 0)"} />}
              active={Number(ratingFilter) === star}
              onPress={() => {
                const next = Number(ratingFilter) === star ? "" : String(star);
                setRatingFilter(next);
              }}
              size="sm"
            />
          ))}
        </View>
      </View>

      {loading && reviews.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
        </View>
      ) : (
        <FlatList
          data={mergedReviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={mergedReviews.length ? s.list : s.emptyList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => {
            const isMine = myReview?.id === item.id && item.isActive;
            return (
              <View
                style={[
                  s.reviewWrap,
                  isMine && { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                ]}
              >
                <ReviewCard
                  author={item.authorName || "Customer"}
                  rating={Number(item.rating || 0)}
                  date={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                  body={item.comment}
                  verified
                  rightSlot={
                    isMine ? (
                      <ReviewActionsMenu
                        onEdit={() =>
                          navigation.navigate("ReviewEditor", {
                            productId,
                            productName,
                          })
                        }
                        onDelete={() => setConfirmDelete(item)}
                      />
                    ) : null
                  }
                />
                {isMine ? (
                  <Text style={[s.mineBadge, { color: rgb(tokens["--text-brand-primary"]) }]}>
                    You reviewed this item
                  </Text>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={[s.emptyText, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                No reviews yet.
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <View style={s.footer}>
                <ActivityIndicator size="small" color={rgb(tokens["--icon-neutral-secondary"])} />
              </View>
            ) : null
          }
        />
      )}

      <ConfirmDialog
        visible={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete review?"
        body="This review will be removed from the product page."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 4,
  },
  subTitle: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  sortWrap: {
    width: "100%",
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  reviewWrap: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mineBadge: {
    fontFamily: fonts.ui.bold,
    fontSize: 10,
    marginLeft: 4,
    marginBottom: 6,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  emptyText: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
