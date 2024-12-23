import express from "express";
import cookieParser from "cookie-parser";
import { AuthRouter } from "./router/auth.router";
import { UserRouter } from "./router/user.router";
import { PromotorRouter } from "./router/promotor.router";
import { eventRouter } from "./router/createevent.router";
import { eventDetailRouter } from "./router/detail.router";
import { PaymentRouter } from "./router/payment.router"; // Add this import
import cors from "cors";
import "dotenv/config";

const PORT: number = 8000;

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

const authRouter = new AuthRouter();
const userRouter = new UserRouter();
const promotorRouter = new PromotorRouter();
const paymentRouter = new PaymentRouter(); // Add this line

app.use("/api/auth", authRouter.getRouter());
app.use("/api/users", userRouter.getRouter());
app.use("/api/promotors", promotorRouter.getRouter());
app.use("/api/events", eventDetailRouter.getRouter());
app.use("/api/events", eventRouter.getRouter());
app.use("/api/payment", paymentRouter.getRouter()); // Add this line

app.get("/api", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});
