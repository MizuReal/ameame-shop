import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeftIcon } from "phosphor-react-native";

import Button from "@components/action/Button";
import Card from "@components/layout/Card";
import Screen from "@components/layout/Screen";
import NavBar from "@components/navigation/NavBar";
import TextInput from "@components/input/TextInput";
import { useColors } from "@colors/colorContext";
import { rgb } from "@styles/styleUtils";
import { makeTypeStyles } from "@typography/scale";
import { fonts } from "@typography/fonts";
import { useAuth } from "../../context/store/auth";
import { clearCartAfterCheckout } from "../../redux/actions/cartActions";
import { createOrder, clearCreateSuccessOrder } from "../../redux/slices/orderSlice";

const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const EMAIL_REGEX = /^(?!\.)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const ADDRESS_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s,.'#/-]{7,119}$/;
const AREA_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;
const POSTAL_REGEX = /^\d{4}$/;

function validateCheckoutForm(values) {
  const errors = {};

  if (!NAME_REGEX.test(values.fullName)) {
    errors.fullName = "Enter a valid full name.";
  }

  if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!PHONE_REGEX.test(values.contactNumber)) {
    errors.contactNumber = "Use +639XXXXXXXXX or 09XXXXXXXXX.";
  }

  if (!ADDRESS_REGEX.test(values.addressLine1)) {
    errors.addressLine1 = "Enter a complete street address.";
  }

  if (!AREA_REGEX.test(values.city)) {
    errors.city = "Enter a valid city.";
  }

  if (!AREA_REGEX.test(values.province)) {
    errors.province = "Enter a valid province.";
  }

  if (!POSTAL_REGEX.test(values.postalCode)) {
    errors.postalCode = "Postal code must be 4 digits.";
  }

  return errors;
}

function getCheckoutErrorMessage(error) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error?.error?.message === "string" && error.error.message.trim()) {
    return error.error.message;
  }

  return "Unable to place your order right now. Please try again in a moment.";
}

export default function CheckoutScreen({ navigation }) {
  const tokens = useColors();
  const ts = makeTypeStyles(tokens);
  const dispatch = useDispatch();
  const { currentUser, accountProfile, isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: currentUser?.email || "",
    contactNumber: "",
    addressLine1: accountProfile?.addressLine1 || "",
    city: accountProfile?.city || "",
    province: accountProfile?.province || "",
    postalCode: accountProfile?.postalCode || "",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!accountProfile && !currentUser) return;
    setFormValues((prev) => ({
      ...prev,
      addressLine1: prev.addressLine1 || accountProfile?.addressLine1 || "",
      city: prev.city || accountProfile?.city || "",
      province: prev.province || accountProfile?.province || "",
      postalCode: prev.postalCode || accountProfile?.postalCode || "",
    }));
  }, [accountProfile, currentUser]);

  const items = useSelector((state) => state.cart.items);

  const summary = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = items.reduce(
      (sum, item) => {
        const original = Number(item.originalPrice || item.price || 0);
        return sum + original * Number(item.quantity || 0);
      },
      0
    );
    const discountTotal = items.reduce((sum, item) => {
      const original = Number(item.originalPrice || item.price || 0);
      const effective = Number(item.price || 0);
      const savings = Math.max(0, original - effective);
      return sum + savings * Number(item.quantity || 0);
    }, 0);
    const total = Math.max(0, subtotal - discountTotal);

    return { itemCount, subtotal, discountTotal, total };
  }, [items]);

  const normalizedForm = useMemo(
    () => ({
      fullName: formValues.fullName.trim(),
      email: formValues.email.trim().toLowerCase(),
      contactNumber: formValues.contactNumber.trim(),
      addressLine1: formValues.addressLine1.trim(),
      city: formValues.city.trim(),
      province: formValues.province.trim(),
      postalCode: formValues.postalCode.trim(),
    }),
    [formValues]
  );

  const setFieldValue = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return {
        ...prev,
        [field]: "",
      };
    });
  };

  const completeCheckout = async () => {
    if (!isAuthenticated || !currentUser) {
      Alert.alert("Account required", "Please register or sign in before checkout.", [
        {
          text: "Sign in",
          onPress: () => navigation.replace("Auth"),
        },
      ]);
      return;
    }

    if (!items.length) {
      Alert.alert("No items", "Your cart is empty.");
      return;
    }

    const nextErrors = validateCheckoutForm(normalizedForm);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      Alert.alert("Incomplete form", "Please fix the highlighted checkout details.");
      return;
    }

    setSubmitting(true);
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
      }));

      const result = await dispatch(
        createOrder({
          firebaseUser: currentUser,
          items: orderItems,
          checkoutContact: normalizedForm,
        })
      ).unwrap();

      await dispatch(clearCartAfterCheckout());
      dispatch(clearCreateSuccessOrder());

      Alert.alert("Checkout complete", "Your cash-on-delivery order was placed.", [
        {
          text: "OK",
          onPress: () =>
            navigation.replace("OrderDetails", {
              id: result.id,
            }),
        },
      ]);
    } catch (error) {
      const message = getCheckoutErrorMessage(error);
      Alert.alert("Checkout failed", message);
      console.warn("[checkout] createOrder failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scrollable safeTop contentContainerStyle={s.content}>
      <View style={s.container}>
        <NavBar
          title="Checkout"
          leftSlot={(
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <ArrowLeftIcon size={20} color={rgb(tokens["--icon-neutral-primary"])} />
            </Pressable>
          )}
        />

        <Text
          style={[
            ts.bodySm,
            {
              color: rgb(tokens["--text-neutral-secondary"]),
              marginTop: 2,
            },
          ]}
        >
          Review your items and confirm delivery details.
        </Text>

        <Card variant="outlined" radius="lg" padding="md" style={s.sectionCard}>
          <Text style={[s.sectionTitle, { color: rgb(tokens["--text-neutral-primary"]) }]}>Order Review</Text>

          <View style={s.itemsWrap}>
            {items.map((item, index) => {
              const unitPrice = Number(item.price || 0);
              const originalUnitPrice = Number(item.originalPrice || unitPrice);
              const hasDiscount = originalUnitPrice > unitPrice;
              const lineTotal = unitPrice * Number(item.quantity || 0);
              const originalLineTotal = originalUnitPrice * Number(item.quantity || 0);
              return (
                <View
                  key={item.productId}
                  style={[
                    s.itemRow,
                    {
                      borderBottomColor: rgb(tokens["--border-neutral-weak"]),
                      borderBottomWidth: index === items.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <View style={s.itemThumbWrap}>
                    {item.imageUri ? (
                      <Image source={{ uri: item.imageUri }} style={s.itemThumb} resizeMode="cover" />
                    ) : (
                      <View
                        style={[
                          s.itemThumbFallback,
                          { backgroundColor: rgb(tokens["--surface-neutral-primary"]) },
                        ]}
                      >
                        <Text style={[s.itemThumbFallbackText, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>No image</Text>
                      </View>
                    )}
                  </View>

                  <View style={s.itemInfo}>
                    <Text style={[s.itemName, { color: rgb(tokens["--text-neutral-primary"]) }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[s.itemMeta, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
                      {`Qty ${item.quantity}`}
                    </Text>
                  </View>
                  <View style={s.priceStack}>
                    {hasDiscount ? (
                      <Text style={[s.itemPriceStriked, { color: rgb(tokens["--text-neutral-tertiary"]) }]}>
                        {`₱${originalLineTotal.toLocaleString("en-PH")}`}
                      </Text>
                    ) : null}
                    <Text style={[s.itemPrice, { color: rgb(tokens["--text-neutral-primary"]) }]}>
                      {`₱${lineTotal.toLocaleString("en-PH")}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[s.summaryCard, { borderColor: rgb(tokens["--border-neutral-secondary"]) }]}>
            <Text style={[s.summaryRow, { color: rgb(tokens["--text-neutral-secondary"]) }]}> 
              {`Total items: ${summary.itemCount}`}
            </Text>
            <Text style={[s.summaryRow, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {`Subtotal: ₱${summary.subtotal.toLocaleString("en-PH")}`}
            </Text>
            <Text style={[s.summaryRow, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
              {`Shipping: ₱500`}
            </Text>
            {summary.discountTotal > 0 ? (
              <Text style={[s.summaryRow, { color: rgb(tokens["--text-neutral-secondary"]) }]}>
                {`Discount: -₱${summary.discountTotal.toLocaleString("en-PH")}`}
              </Text>
            ) : null}
            <Text style={[s.summaryTotal, { color: rgb(tokens["--text-neutral-primary"]) }]}> 
              {`Amount due: ₱${(summary.total + 500).toLocaleString("en-PH")}`}
            </Text>
            <Text style={[s.summaryRow, { color: rgb(tokens["--text-neutral-secondary"]) }]}> 
              Payment method: Cash on Delivery
            </Text>
          </View>
        </Card>

        <Card variant="outlined" radius="lg" padding="md" style={s.sectionCard}>
          <Text style={[s.sectionTitle, { color: rgb(tokens["--text-neutral-primary"]) }]}>Delivery Details</Text>

          <View style={s.formGrid}>
            <TextInput
              label="Full Name"
              required
              placeholder="Juan Dela Cruz"
              value={formValues.fullName}
              onChangeText={(value) => setFieldValue("fullName", value)}
              error={formErrors.fullName}
              autoCapitalize="words"
            />

            <TextInput
              label="Email"
              required
              placeholder="you@example.com"
              value={formValues.email}
              onChangeText={(value) => setFieldValue("email", value)}
              error={formErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              label="Contact Number"
              required
              placeholder="09XXXXXXXXX"
              value={formValues.contactNumber}
              onChangeText={(value) => setFieldValue("contactNumber", value)}
              error={formErrors.contactNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <TextInput
              label="Street Address"
              required
              placeholder="Block/Lot, Street, Barangay"
              value={formValues.addressLine1}
              onChangeText={(value) => setFieldValue("addressLine1", value)}
              error={formErrors.addressLine1}
              autoCapitalize="words"
            />

            <TextInput
              label="City"
              required
              placeholder="Quezon City"
              value={formValues.city}
              onChangeText={(value) => setFieldValue("city", value)}
              error={formErrors.city}
              autoCapitalize="words"
            />

            <TextInput
              label="Province"
              required
              placeholder="Metro Manila"
              value={formValues.province}
              onChangeText={(value) => setFieldValue("province", value)}
              error={formErrors.province}
              autoCapitalize="words"
            />

            <TextInput
              label="Postal Code"
              required
              placeholder="1100"
              value={formValues.postalCode}
              onChangeText={(value) => setFieldValue("postalCode", value)}
              error={formErrors.postalCode}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
          </View>
        </Card>

        <Button
          label={submitting ? "Placing order..." : "Complete Checkout"}
          disabled={submitting || !items.length}
          fullWidth
          onPress={completeCheckout}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    paddingBottom: 20,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  sectionCard: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.ui.bold,
    fontSize: 15,
  },
  itemsWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  itemThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  itemThumb: {
    width: "100%",
    height: "100%",
  },
  itemThumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  itemThumbFallbackText: {
    fontFamily: fonts.ui.medium,
    fontSize: 10,
    textAlign: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.ui.bold,
    fontSize: 13,
  },
  itemMeta: {
    fontFamily: fonts.ui.medium,
    fontSize: 12,
  },
  itemPrice: {
    fontFamily: fonts.ui.bold,
    fontSize: 13,
  },
  priceStack: {
    alignItems: "flex-end",
    gap: 2,
  },
  itemPriceStriked: {
    fontFamily: fonts.ui.medium,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    fontFamily: fonts.ui.medium,
    fontSize: 13,
  },
  summaryTotal: {
    fontFamily: fonts.ui.bold,
    fontSize: 18,
  },
  formGrid: {
    gap: 10,
  },
});

