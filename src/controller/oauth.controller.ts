import prisma from "../prisma"; // Adjust the path as needed
import { Request, Response } from "express";
import { supabase } from "../supabase";
import { sign } from "jsonwebtoken";
import { randomBytes } from "crypto";

const base_url_fe = process.env.NEXT_PUBLIC_BASE_URL_FE;

if (!base_url_fe || !process.env.JWT_KEY) {
  throw new Error("Required environment variables are missing.");
}

interface OAuthCallbackRequest {
  access_token: string;
}

function isError(err: unknown): err is Error {
  return err instanceof Error;
}

export class OAuthController {
  /**
   * Initiate Google OAuth Login
   */
  async loginWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${base_url_fe}/callback`,
        },
      });

      if (error || !data?.url) {
        console.error("Error initiating Google login:", error?.message || error);
        res.status(400).json({ message: "Failed to initiate Google login", error });
        return;
      }

      res.status(200).json({ url: data.url });
    } catch (err: unknown) {
      if (isError(err)) {
        console.error("Error in loginWithGoogle:", err.message, err.stack);
      } else {
        console.error("Unknown error in loginWithGoogle:", err);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Handle Google OAuth Callback
   */
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { access_token } = req.query;

      if (!access_token) {
        res.status(400).json({ message: "Missing access token in the callback" });
        return;
      }

      const { data, error } = await supabase.auth.getUser(access_token as string);

      if (error || !data?.user) {
        res.status(400).json({ message: "Failed to retrieve user data", error });
        return;
      }

      const user = data.user;

      if (!user?.email) {
        res.status(400).json({ message: "Invalid user data from OAuth" });
        return;
      }

      let existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        existingUser = await prisma.user.create({
          data: {
            username: user.user_metadata?.full_name || user.email.split("@")[0],
            email: user.email,
            password: randomBytes(16).toString("hex"),
            isVerify: true,
          },
        });
      }

      const payload = { id: existingUser.id, email: existingUser.email, type: "user" };
      const jwtToken = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });

      res.redirect(`${base_url_fe}/callback#access_token=${jwtToken}`);
    } catch (err: unknown) {
      if (isError(err)) {
        console.error("Error in handleGoogleCallback:", err.message, err.stack);
      } else {
        console.error("Unknown error in handleGoogleCallback:", err);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * Process Access Token for User Info
   */
  async processAccessToken(req: Request<{}, {}, OAuthCallbackRequest>, res: Response): Promise<void> {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        res.status(400).json({ message: "Access token is missing." });
        return;
      }

      const userInfo = await fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch user info from Google API");
          }
          return response.json();
        })
        .catch((err) => {
          console.error("Error fetching user info:", err);
          res.status(400).json({ message: "Invalid token or user data." });
          throw err;
        });

      if (!userInfo?.email) {
        res.status(400).json({ message: "Invalid token or user data." });
        return;
      }

      let user = await prisma.user.findUnique({
        where: { email: userInfo.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: userInfo.name || userInfo.email.split("@")[0],
            email: userInfo.email,
            password: randomBytes(16).toString("hex"),
            isVerify: true,
          },
        });
      }

      const payload = { id: user.id, email: user.email, type: "user" };
      const jwtToken = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });

      res.status(200).json({
        message: "Access token processed successfully.",
        token: jwtToken,
      });
    } catch (err: unknown) {
      if (isError(err)) {
        console.error("Error in processAccessToken:", err.message, err.stack);
      } else {
        console.error("Unknown error in processAccessToken:", err);
      }
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
