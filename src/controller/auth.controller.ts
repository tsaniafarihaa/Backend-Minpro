import dotenv from "dotenv"
dotenv.config()
import { Request, Response } from "express";
import prisma from "../prisma";
import { genSalt, hash, compare } from "bcrypt";
import { findUser } from "../services/user.service";
import { sign, verify } from "jsonwebtoken";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";
import { generateReferalCode } from "../utils/generateReferalCode";
import { transporter } from "../services/mailer";
import { findPromotor } from "../services/promotor.service";
import { addMonths } from "date-fns";

const base_url_fe = process.env.BASE_URL_FE;

export class AuthController {
  async loginUser(req: Request, res: Response) {
    try {
      const { data, password } = req.body;
      const user = await findUser(data, data);

      if (!user) throw { message: "User not found!" };
      if (!user.isVerify) throw { message: "User not verified!" };

      const isValidPass = await compare(password, user.password);
      if (!isValidPass) throw { message: "Incorrect password!" };

      const payload = { id: user.id, type: "user" };
      const token = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });
      console.log("Generated Token:", token);
      console.log("Token Payload:", payload);

      res.status(200).send({
        message: "Login successful",
        token,
      });
    } catch (err) {
      console.error(err);
      res.status(400).send({
        message: "Please check your username and password",
      });
    }
  }

  //Register User

  async registerUser(req: Request, res: Response) {
    try {
      const { username, email, password, confirmPassword, refCode } = req.body;
  
      if (password !== confirmPassword)
        throw { message: "Passwords do not match!" };
  
      const user = await findUser(username, email);
      if (user) throw { message: "Username or email has already been used" };
  
      const salt = await genSalt(10);
      const hashPassword = await hash(password, salt);
  
      const newUserData: any = {
        username,
        email,
        password: hashPassword,
        refCode: generateReferalCode(),
      };
  
      // Check if a referral code was provided
      if (refCode) {
        const referer = await prisma.user.findUnique({
          where: { refCode },
        });
        if (!referer) throw { message: "Invalid referral code" };
  
        // Save the referer's ID for later point and coupon assignment during verification
        newUserData.refCodeBy = referer.id;
      }
  
      // Create the new user
      const newUser = await prisma.user.create({ data: newUserData });
  
      const payload = { id: newUser.id };
      const token = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });
      const linkUser = `${base_url_fe}/verifyuser/${token}`;
  
      const templatePath = path.join(
        __dirname,
        "../templates",
        "verifyUser.hbs"
      );
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateSource);
      const html = compiledTemplate({
        username,
        linkUser,
        refCode: newUser.refCode,
      });
  
      // Mailer transport
      await transporter.sendMail({
        from: "dattariqf@gmail.com",
        to: email,
        subject: "Welcome To TIKO",
        html,
      });
  
      res.status(201).json({ message: "Registration Successful" });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: "Please check again username and email has been used" });
    }
  }
  

  async verifyUser(req: Request, res: Response):Promise<void> {
    try {
      const { token } = req.params;
      const verifiedUser: any = verify(token, process.env.JWT_KEY!);
    
      // Fetch the user to check if already verified
      const user = await prisma.user.findUnique({
        where: { id: verifiedUser.id },
      });
    
      if (!user) {
         res.status(404).send({ message: "User not found!" });
      }
    
      if (user?.isVerify) {
         res.status(400).send({ message: "Account is already verified!" });
      }
    
      // Update the user to mark them as verified
      const updatedUser = await prisma.user.update({
        data: { isVerify: true },
        where: { id: verifiedUser.id },
      });
    
      // Check if the user was referred by someone
      if (updatedUser.refCodeBy) {
        // Increment points for the referer
        await prisma.user.update({
          where: { id: updatedUser.refCodeBy },
          data: { points: { increment: 10000 } },
        });
    
        // Log the referral points for tracking
        await prisma.refLog.create({
          data: {
            pointGet: 10000,
            expiredAt: addMonths(new Date(), 3),
            isUsed: false,
            user: {
              connect: { id: updatedUser.refCodeBy },
            },
          },
        });
    
        // Create a coupon for the new user
        const coupon = await prisma.userCoupon.create({
          data: {
            percentage: 10,
            isRedeem: false,
            expiredAt: addMonths(new Date(), 3),
          },
        });
    
        // Assign the coupon to the verified user
        await prisma.user.update({
          where: { id: updatedUser.id },
          data: {
            userCouponId: coupon.id,
            percentage: coupon.percentage,
          },
        });
      }
    
      res.status(200).send({ message: "Verified successfully, points granted, and coupon issued!" });
    } catch (err) {
      console.error(err);
      res.status(400).send({ message: "Verification failed", error: err });
    }
    
  }
  

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////   PROMOTOR   /////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async registerPromotor(req: Request, res: Response) {
    try {
      const { name, email, password, confirmPassword } = req.body;
      if (password != confirmPassword)
        throw { massage: "Password Not Match !" };

      const promotor = await findPromotor(name, email);
      if (promotor) throw { massage: "Name or Email has been used" };

      const salt = await genSalt(10);
      const hashPassword = await hash(password, salt);

      const newPromotor = await prisma.promotor.create({
        data: {
          name,
          email,
          password: hashPassword,
        },
      });

      const payload = { id: newPromotor.id };

      const token = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });
      const linkPromotor = `${base_url_fe}/verifypromotor/${token}`;

      const templatePath = path.join(
        __dirname,
        "../templates",
        "verifyPromotor.hbs"
      );
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateSource);
      const html = compiledTemplate({ name, linkPromotor });

      await transporter.sendMail({
        from: "dattariqf@gmail.com",
        to: email,
        subject: "Welcome To TIKO",
        html,
      });

      res.status(201).json({ massage: "Registration Succes" });
    } catch (err) {
      console.error(err);
      res.status(400).json({ massage: "Please check the username and email has been used" });
    }
  }

  async loginPromotor(req: Request, res: Response): Promise<void> {
    try {
      const { data, password } = req.body;

      if (!data || !password) {
        res
          .status(400)
          .send({ success: false, message: "Data and password are required!" });
        return;
      }

      // Find promotor by name or email
      const promotor = await prisma.promotor.findFirst({
        where: {
          OR: [{ name: data }, { email: data }],
        },
      });

      if (!promotor) {
        res
          .status(404)
          .send({ success: false, message: "Promotor not found!" });
        return;
      }

      if (!promotor.isVerify) {
        res
          .status(403)
          .send({ success: false, message: "Promotor is not verified!" });
        return;
      }

      const isValidPass = await compare(password, promotor.password);
      if (!isValidPass) {
        res
          .status(401)
          .send({ success: false, message: "Incorrect password!" });
        return;
      }

      const payload = { id: promotor.id, type: "promotor" }; // ada tipecdcd
      const token = sign(payload, process.env.JWT_KEY!, { expiresIn: "1d" });

      res.status(200).json({
        success: true,
        message: "Login successful!",
        token,
      });
    } catch (err: any) {
      console.error("Error during promotor login:", {
        error: err.message,
        data: req.body.data,
      });
      res.status(500).send({
        success: false,
        message: "An unexpected error occurred.",
      });
    }
  }

  async verifyPromotor(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const verifiedPromotor: any = verify(token, process.env.JWT_KEY!);
      await prisma.promotor.update({
        data: { isVerify: true },
        where: { id: verifiedPromotor.id },
      });
      res.status(200).send({ message: "Verify Successfully" });
    } catch (err) {
      console.log(err);
      res.status(400).send(err);
    }
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      // Retrieve token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send({ message: "Unauthorized: No token provided" });
        return;
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        res.status(401).send({ message: "Unauthorized: Token missing" });
        return;
      }

      // Verify token
      const decoded = verify(token, process.env.JWT_KEY!) as {
        id: string;
        type: string;
      };

      if (!decoded || !decoded.type) {
        res.status(403).send({ message: "Forbidden: Invalid token" });
        return;
      }

      // Handle different user types
      if (decoded.type === "promotor") {
        const promotor = await prisma.promotor.findUnique({
          where: { id: decoded.id },
        });

        if (!promotor) {
          res.status(404).send({ message: "Promotor not found" });
          return;
        }

        res.status(200).send({
          id: promotor.id,
          type: "promotor",
          name: promotor.name,
          email: promotor.email,
          avatar: promotor.avatar || null,
        });
      } else if (decoded.type === "user") {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            createdAt: true,
            points: true,
            refCode: true,
            updatedAt: true,
            isVerify: true,
            percentage: true,
            usercoupon: {
              select: {
                expiredAt: true,
              },
            },
          },
        });

        if (!user) {
          res.status(404).send({ message: "User not found" });
          return;
        }

        res.status(200).json({
          id: user.id,
          type: "user",
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          points: user.points,
          refCode: user.refCode,
          percentage: user.percentage,
          expiredAt : user.usercoupon?.expiredAt,
        });
      } else {
        res.status(403).json({ message: "Forbidden: Unknown token type" });
      }
    } catch (err) {
      console.error("Error fetching session:");
      res
        .status(401)
        .send({ message: "Unauthorized: Invalid or expired token" });
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////   EXTENSION FOR ALL AUTH   /////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async forgotPasswordUser(req: Request, res: Response) {
    try {
      const { email } = req.body;

      // Check if the email exists in the database
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(404).send({ message: "Email not found!" });
        return;
      }

      // Generate a password reset token
      const payload = { id: user.id, email: user.email };
      const resetToken = sign(payload, process.env.JWT_KEY!, {
        expiresIn: "1h", // Token valid for 1 hour
      });

      // Create the password reset link
      const resetLink = `${base_url_fe}/login/loginuser/resetpassworduser/${resetToken}`;

      // Prepare the email template
      const templatePath = path.join(
        __dirname,
        "../templates",
        "forgotPassword.hbs"
      );
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateSource);
      const html = compiledTemplate({ username: user.username, resetLink });

      // Send the email
      await transporter.sendMail({
        from: "dattariqf@gmail.com",
        to: email,
        subject: "Password Reset Request",
        html,
      });

      res
        .status(200)
        .send({ message: "Password reset link sent to your email!" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .send({ message: "An error occurred while sending the reset link." });
    }
  }

  async resetPasswordUser(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      console.log("Request body:", req.body);

      if (!token) {
        res.status(400).send({ message: "Token is required!" });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).send({ message: "Passwords do not match!" });
        return;
      }

      // Verify the reset token
      let decoded: any;
      try {
        decoded = verify(token, process.env.JWT_KEY!);
      } catch (err) {
        console.error("Token verification failed:", err);
        res.status(400).send({ message: "Invalid or expired token!" });
        return;
      }

      console.log("Token decoded:", decoded);

      // Check if the user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        res.status(404).send({ message: "User not found!" });
        return;
      }

      // Hash the new password
      const salt = await genSalt(10);
      const hashedPassword = await hash(newPassword, salt);

      // Update the user's password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res
        .status(200)
        .send({ message: "Password has been reset successfully!" });
    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).send({ message: "An internal server error occurred!" });
    }
  }

  async forgotPasswordPromotor(req: Request, res: Response) {
    try {
      const { email } = req.body;

      // Check if the email exists in the database
      const promotor = await prisma.promotor.findUnique({
        where: { email },
      });

      if (!promotor) {
        res.status(404).send({ message: "Email not found!" });
        return;
      }

      // Generate a password reset token
      const payload = { id: promotor.id, email: promotor.email };
      const resetToken = sign(payload, process.env.JWT_KEY!, {
        expiresIn: "1h", // Token valid for 1 hour
      });

      // Create the password reset link
      const resetLink = `${base_url_fe}/login/loginpromotor/resetpasswordpromotor/${resetToken}`;

      // Prepare the email template
      const templatePath = path.join(
        __dirname,
        "../templates",
        "forgotPassword.hbs"
      );
      const templateSource = fs.readFileSync(templatePath, "utf-8");
      const compiledTemplate = handlebars.compile(templateSource);
      const html = compiledTemplate({ username: promotor.name, resetLink });

      // Send the email
      await transporter.sendMail({
        from: "dattariqf@gmail.com",
        to: email,
        subject: "Password Reset Request",
        html,
      });

      res
        .status(200)
        .send({ message: "Password reset link sent to your email!" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .send({ message: "An error occurred while sending the reset link." });
    }
  }

  async resetPasswordPromotor(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      console.log("Request body:", req.body);

      if (!token) {
        res.status(400).send({ message: "Token is required!" });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).send({ message: "Passwords do not match!" });
        return;
      }

      // Verify the reset token
      let decoded: any;
      try {
        decoded = verify(token, process.env.JWT_KEY!);
      } catch (err) {
        console.error("Token verification failed:", err);
        res.status(400).send({ message: "Invalid or expired token!" });
        return;
      }

      console.log("Token decoded:", decoded);

      // Check if the promotor exists
      const promotor = await prisma.promotor.findUnique({
        where: { id: decoded.id },
      });

      if (!promotor) {
        res.status(404).send({ message: "Promotor not found!" });
        return;
      }

      // Hash the new password
      const salt = await genSalt(10);
      const hashedPassword = await hash(newPassword, salt);

      // Update the promotor's password
      await prisma.promotor.update({
        where: { id: promotor.id },
        data: { password: hashedPassword },
      });

      res
        .status(200)
        .send({ message: "Password has been reset successfully!" });
    } catch (err) {
      console.error("Error resetting password:", err);
      res.status(500).send({ message: "An internal server error occurred!" });
    }
  }
}
