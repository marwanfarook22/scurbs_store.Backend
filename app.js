import express from "express";
import { CORS_ORIGINS, FRONTEND_URL, PORT } from "./config/env.js";
import usersRouter from "./Routes/users.routes.js";
import authRouter from "./Routes/auth.routes.js";
import productRouter from "./Routes/proudect.routes.js";
import categoriesRouter from "./Routes/categories.routes.js";
import connectDB from "./database/mongodb.js";
import errormiddleware from "./middleware/error.middleware.js";
import cookieParser from "cookie-parser";
import arcjetMiddleware from "./middleware/arcjet.middleware.js";
import cors from "cors";
import billRoutes from "./Routes/bill.routes.js";
import instagramPostRouter from "./Routes/instagramPost.routes.js";

// أسفل باقي الـ routes:
const app = express();

const allowedOrigins = new Set([
  FRONTEND_URL,
  "https://scurbs-store.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(arcjetMiddleware);
app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/bills", billRoutes);
app.use("/api/v1/instagram-posts", instagramPostRouter);

app.use(errormiddleware);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT} http://localhost:${PORT}`);

  // Connect to MongoDB when the server starts
  // that is the name we export from the mongodb.js file (connectDB)
  await connectDB();
});
// for testing purposes, you can uncomment the following code to create a user in the database
//User.create({
//    name: 'John Doe', email: 'johndoe@example.com', password: 'password123'
//});

export default app;
