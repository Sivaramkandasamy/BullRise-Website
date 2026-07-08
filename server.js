require("node:dns").setServers(["8.8.8.8", "1.1.1.1"]);

const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { protect, adminOnly } = require("./middleware/authMiddleware");

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());

// =========================
// CORS
// =========================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://bullrise.in",
  "https://www.bullrise.in"
];

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("Origin:", origin);

      // Allow Postman / Mobile Apps
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ],

    exposedHeaders: ["set-cookie"],

    optionsSuccessStatus: 200,
  })
);

// Handle OPTIONS
app.options("*", cors());

// =========================
// Root
// =========================

app.get("/", (req, res) => {
  res.send("Bullrise API Running...");
});

// =========================
// Debug Route
// =========================

app.get(
  "/api/debug/product-counts",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const Product = require("./models/Product");

      const counts = {
        total: await Product.countDocuments(),
        trending: await Product.countDocuments({
          isTrending: true,
        }),
        bestseller: await Product.countDocuments({
          isBestSeller: true,
        }),
        newArrival: await Product.countDocuments({
          isNewArrival: true,
        }),
      };

      res.json(counts);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// =========================
// Routes
// =========================

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/product-catalog", require("./routes/productCatalogRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/addresses", require("./routes/addressRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use(
  "/api/exclusive-banners",
  require("./routes/exclusiveBannerRoutes")
);
app.use(
  "/api/hero-banners",
  require("./routes/heroBannerRoutes")
);
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use(
  "/api/banner-sliders",
  require("./routes/Bannerslider.Routes")
);

// =========================
// Static Folder
// =========================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// =========================
// Error Middleware
// =========================

app.use(notFound);
app.use(errorHandler);

// =========================
// Server
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});