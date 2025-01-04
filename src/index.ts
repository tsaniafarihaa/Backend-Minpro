import express from "express";
import cookieParser from "cookie-parser";
import { AuthRouter } from "./router/auth.router";
import { UserRouter } from "./router/user.router";
import { PromotorRouter } from "./router/promotor.router";
import { eventRouter } from "./router/createevent.router";
import { eventDetailRouter } from "./router/detail.router";
import cors from "cors";
import "dotenv/config";
import { OAuthRouter } from "./router/oauth.router";

const PORT: number = 8000;
const base_url_fe = process.env.NEXT_PUBLIC_BASE_URL_FE

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000", 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
  })
);

const authRouter = new AuthRouter();
const userRouter = new UserRouter();
const promotorRouter = new PromotorRouter();
const oauthRouter = new OAuthRouter()

app.use("/api/auth", authRouter.getRouter());
app.use("/api/oauth",oauthRouter.getRouter())
app.use("/api/users", userRouter.getRouter());
app.use("/api/promotors", promotorRouter.getRouter());
app.use("/api/events", eventDetailRouter.getRouter());
app.use("/api/events", eventRouter.getRouter());
app.get("/api", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});
