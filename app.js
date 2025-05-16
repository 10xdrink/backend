// Load environment variables from .env
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const logger = require("./utils/logger");
const { uploadImage } = require("./services/cloudinaryService");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const expressAsyncErrors = require("express-async-errors"); // To handle async errors

// Conditionally load Redis dependencies
let redisClient = null;
let RedisStore = null;
let redisStore = null;

try {
  // Try to connect to Redis if available
  redisClient = require("./config/redis");
  RedisStore = require("connect-redis").default;
  
  redisClient.on("connect", () => {
    logger.info("Connected to Redis successfully");
  });

  redisClient.on("error", (err) => {
    logger.warn(`Redis connection error: ${err.message}. Continuing without Redis...`);
    redisClient = null;
  });
  
  if (redisClient) {
    // Initialize Redis store if Redis is connected
    redisStore = new RedisStore({
      client: redisClient,
      prefix: "session:",
    });
    logger.info("Redis store configured successfully");
  }
} catch (error) {
  logger.warn(`Failed to initialize Redis: ${error.message}. Continuing without Redis...`);
}

// Middleware imports
const errorMiddleware = require("./middleware/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const blogRoutes = require("./routes/blogRoutes");
const faqRoutes = require("./routes/faqRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const reportRoutes = require("./routes/reportRoutes");
const contactRoutes = require("./routes/contactRoutes");
const cartRoutes = require("./routes/cartRoutes");
const validateConfig = require("./utils/validateConfig");
const setupGoogleStrategy = require("./services/googleOAuthService");
const emailListRoutes = require("./routes/emailListRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const tagRoutes = require("./routes/tagRoutes");
const billDeskRoutes = require("./routes/billDeskRoutes");
const testRoutes = require("./routes/testRoutes");
const paymentRoutes = require('./routes/paymentRoutes');
const influencerRoutes = require('./routes/influencerRoutes');
const influencerUserRoutes = require('./routes/influencerUserRoutes');
const phoneVerificationRoutes = require('./routes/phoneVerificationRoutes');

// Body parser setup
const { json, urlencoded } = express;

// Validate Configuration
validateConfig();

// Initialize Express App
const app = express();

// Security Middleware
app.use(helmet());

// CORS Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
  : [process.env.FRONTEND_URL, process.env.ADMIN_URL, process.env.INFLUENCER_URL, 'http://localhost:5175', process.env.INFLUENCER_PANEL_URL, 'http://localhost:8080'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body Parsing Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Rate Limiting Middleware
const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS)
    : 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  headers: true,
});
// app.use("/api/", apiLimiter); // Rate limiter disabled

// Logging Middleware
app.use(morgan("combined", { stream: logger.stream }));

// Serve static files from the 'public' directory with caching
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d', // Adjust as needed
  etag: false
}));

// Session Configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // true in production
    httpOnly: true,
    sameSite: 'lax', // adjust based on requirements
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
};

// Add Redis store to session if available
if (redisStore) {
  sessionConfig.store = redisStore;
}

app.use(session(sessionConfig));

// Initialize Passport for authentication strategies
app.use(passport.initialize());
app.use(passport.session());
setupGoogleStrategy();

// File Upload Middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Cloudinary Configuration Logging
logger.info(
  `Cloudinary configured with Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`
);

// Image Upload Route Example
app.post("/api/upload", upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    const result = await uploadImage(req.file.path);
    res.status(200).json({ success: true, url: result.secure_url });
  } catch (error) {
    next(error);
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/email-list", emailListRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payments/billdesk", billDeskRoutes);
app.use("/api/test", testRoutes);
app.use("/api/influencers", influencerRoutes);
app.use("/api/influencer", influencerUserRoutes);
app.use("/api/verification/phone", phoneVerificationRoutes);

// Serve an HTML file on the root route to indicate the server is running
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ServerRunning.html"));
});

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is healthy." });
  logger.info("Health check passed");
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Resource not found" });
});

// Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
