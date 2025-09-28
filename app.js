const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const chatRoutes = require("./routes/chatRoutes");
const { handlePaystackWebhook } = require("./controllers/paymentController");

dotenv.config({ path: "./config.env" });

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set up view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.post("/webhooks/paystack", handlePaystackWebhook);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.render("index");
});

app.use(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

module.exports = app;
