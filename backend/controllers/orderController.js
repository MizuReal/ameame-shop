const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const { sendError } = require("../utils/errorResponse");
const { getPaginationParams } = require("../utils/pagination");
const { createOrUpdateUserFromFirebase } = require("../utils/userSync");

function toOrderDto(order) {
  const normalizedOrder =
    order && typeof order.toObject === "function" ? order.toObject() : order;
  const normalizedStatus = normalizedOrder.status === "completed" ? "delivered" : normalizedOrder.status;

  return {
    id: String(normalizedOrder._id),
    user: String(normalizedOrder.user),
    items: (normalizedOrder.items || []).map((item) => {
      const normalizedItem =
        item && typeof item.toObject === "function" ? item.toObject() : item;

      return {
        ...normalizedItem,
        product: normalizedItem.product
          ? String(normalizedItem.product)
          : normalizedItem.product,
      };
    }),
    totalAmount: normalizedOrder.totalAmount,
    checkoutContact: normalizedOrder.checkoutContact || null,
    paymentMethod: normalizedOrder.paymentMethod,
    status: normalizedStatus,
    createdAt: normalizedOrder.createdAt,
    updatedAt: normalizedOrder.updatedAt,
  };
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCheckoutContact(payload) {
  const checkoutContact = payload && typeof payload === "object" ? payload : {};
  const fullName = readString(checkoutContact.fullName);
  const email = readString(checkoutContact.email).toLowerCase();
  const contactNumber = readString(checkoutContact.contactNumber);
  const addressLine1 = readString(checkoutContact.addressLine1);
  const city = readString(checkoutContact.city);
  const province = readString(checkoutContact.province);
  const postalCode = readString(checkoutContact.postalCode);

  const namePattern = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
  const emailPattern = /^(?!\.)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const phonePattern = /^(?:\+63|0)9\d{9}$/;
  const addressPattern = /^[A-Za-z0-9][A-Za-z0-9\s,.'#/-]{7,119}$/;
  const areaPattern = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;
  const postalPattern = /^\d{4}$/;

  if (!namePattern.test(fullName)) {
    const error = new Error("fullName is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!emailPattern.test(email)) {
    const error = new Error("email is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!phonePattern.test(contactNumber)) {
    const error = new Error("contactNumber is invalid. Expected PH mobile format.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!addressPattern.test(addressLine1)) {
    const error = new Error("addressLine1 is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!areaPattern.test(city)) {
    const error = new Error("city is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!areaPattern.test(province)) {
    const error = new Error("province is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!postalPattern.test(postalCode)) {
    const error = new Error("postalCode is invalid.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  return {
    fullName,
    email,
    contactNumber,
    addressLine1,
    city,
    province,
    postalCode,
  };
}

function parseQuantity(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error("quantity must be an integer greater than 0.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return parsed;
}

async function listOrders(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const { page, limit, skip } = getPaginationParams(req.query);
    const [orders, total] = await Promise.all([
      Order.find({ user: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ user: user._id }),
    ]);

    return res.status(200).json({
      orders: orders.map((order) => toOrderDto(order)),
      page,
      limit,
      total,
    });
  } catch (error) {
    return next(error);
  }
}

async function getOrder(req, res, next) {
  try {
    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "INVALID_ORDER_ID", "Invalid order id.");
    }

    const order = await Order.findOne({ _id: id, user: user._id }).lean();
    if (!order) {
      return sendError(res, 404, "ORDER_NOT_FOUND", "Order not found.");
    }

    return res.status(200).json({
      order: toOrderDto(order),
    });
  } catch (error) {
    return next(error);
  }
}

async function createOrder(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();

    const user = await createOrUpdateUserFromFirebase(req.firebaseUser);
    if (user.isActive === false) {
      return sendError(
        res,
        403,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated. Please contact an administrator."
      );
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      return sendError(res, 400, "VALIDATION_ERROR", "items must be a non-empty array.");
    }

    const quantityByProductId = new Map();
    for (const item of items) {
      const productId = item?.product || item?.productId;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return sendError(res, 400, "INVALID_PRODUCT_ID", "Invalid product id.");
      }

      const quantity = parseQuantity(item?.quantity);
      const normalizedProductId = String(productId);
      const nextQuantity = (quantityByProductId.get(normalizedProductId) || 0) + quantity;
      quantityByProductId.set(normalizedProductId, nextQuantity);
    }

    const paymentMethod = String(req.body?.paymentMethod || "cash_on_delivery").trim();
    if (paymentMethod !== "cash_on_delivery") {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Only cash_on_delivery is supported at this time."
      );
    }

    const checkoutContact = parseCheckoutContact(req.body?.checkoutContact);

    let createdOrder = null;
    await session.withTransaction(async () => {
      const lineItems = [];

      for (const [productId, quantity] of quantityByProductId.entries()) {
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            isActive: true,
            stock: { $gte: quantity },
          },
          {
            $inc: { stock: -quantity },
          },
          {
            session,
            returnDocument: "after",
          }
        ).lean();

        if (!updatedProduct) {
          const existingProduct = await Product.findById(productId)
            .select("name stock isActive")
            .session(session)
            .lean();

          if (!existingProduct || existingProduct.isActive === false) {
            const productError = new Error("Product not found.");
            productError.statusCode = 404;
            productError.code = "PRODUCT_NOT_FOUND";
            throw productError;
          }

          const stockError = new Error(
            `Insufficient stock for ${existingProduct.name || "this product"}.`
          );
          stockError.statusCode = 409;
          stockError.code = "INSUFFICIENT_STOCK";
          throw stockError;
        }

        const { isDiscountActive, computeDiscountedPrice } = require("../utils/discountUtils");
        const effectiveDiscountActive = isDiscountActive({
          discountValue: updatedProduct.discountValue,
          discountStartAt: updatedProduct.discountStartAt,
          discountEndAt: updatedProduct.discountEndAt,
        });
        const effectivePrice =
          effectiveDiscountActive && Number(updatedProduct.discountValue || 0) > 0
            ? computeDiscountedPrice({
                price: updatedProduct.price,
                discountType: updatedProduct.discountType,
                discountValue: updatedProduct.discountValue,
              })
            : updatedProduct.price;

        lineItems.push({
          product: updatedProduct._id,
          name: updatedProduct.name,
          price: effectivePrice,
          quantity,
          image: updatedProduct.image?.url || "",
        });
      }

      const totalAmount = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const [order] = await Order.create(
        [
          {
            user: user._id,
            items: lineItems,
            totalAmount,
            checkoutContact,
            paymentMethod,
          },
        ],
        { session }
      );

      createdOrder = order;
    });

    return res.status(201).json({
      order: toOrderDto(createdOrder),
    });
  } catch (error) {
    if (error?.statusCode && error?.code) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
};
