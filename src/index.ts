import express from "express";
import cookieParser from "cookie-parser";
import { AuthRouter } from "./router/auth.router"; 
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { UserRouter } from "./router/user.router";
import { PromotorRouter } from "./router/promotor.router";
dotenv.config(); 

const PORT: number = 8000;
const base_url_fe = process.env.NEXT_PUBLIC_BASE_URL_FE

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: `${base_url_fe}`, 
    credentials: true, 
  })
);

const authRouter = new AuthRouter();
const userRouter = new UserRouter()
const promotorRouter = new PromotorRouter()

app.use("/api/auth", authRouter.getRouter());
app.use("/api/users",userRouter.getRouter())
app.use("/api/promotors", promotorRouter.getRouter() )

// Test route
app.get("/api", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});
