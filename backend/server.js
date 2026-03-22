const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const cors = require("cors");
const express = require("express");

const { connectToDatabase } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminCategoryRoutes = require("./routes/adminCategoryRoutes");
const adminReviewRoutes = require("./routes/adminReviewRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const { startWishlistNotificationProcessor } = require("./services/wishlistNotificationService");
const { resolveErrorPayload } = require("./utils/errorResponse");

const app = express();
const port = Number(process.env.PORT) || 4000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.status(200).send("API is running");
});

app.use("/api", authRoutes);
app.use("/api", adminUserRoutes);
app.use("/api", adminProductRoutes);
app.use("/api", adminCategoryRoutes);
app.use("/api", adminReviewRoutes);
app.use("/api", productRoutes);
app.use("/api", categoryRoutes);
app.use("/api", orderRoutes);
app.use("/api", reviewRoutes);
app.use("/api", userRoutes);
app.use("/api", wishlistRoutes);

app.use((error, _req, res, next) => {
  // Keep 4-arg signature for Express error middleware while satisfying lint.
  void next;
  const payload = resolveErrorPayload(error);
  res.status(payload.error.status).json(payload);
});

async function startServer() {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });

  startWishlistNotificationProcessor();
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start backend", error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
