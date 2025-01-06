"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const bcrypt_1 = require("bcrypt");
const user_service_1 = require("../services/user.service");
const jsonwebtoken_1 = require("jsonwebtoken");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const handlebars_1 = __importDefault(require("handlebars"));
const generateReferalCode_1 = require("../utils/generateReferalCode");
const mailer_1 = require("../services/mailer");
const promotor_service_1 = require("../services/promotor.service");
const date_fns_1 = require("date-fns");
const base_url_fe = process.env.NEXT_PUBLIC_BASE_URL_FE;
class AuthController {
    loginUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, password } = req.body;
                const user = yield (0, user_service_1.findUser)(data, data);
                if (!user)
                    throw { message: "User not found!" };
                if (!user.isVerify)
                    throw { message: "User not verified!" };
                const isValidPass = yield (0, bcrypt_1.compare)(password, user.password);
                if (!isValidPass)
                    throw { message: "Incorrect password!" };
                const payload = { id: user.id, type: "user" };
                const token = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                console.log("Generated Token:", token);
                console.log("Token Payload:", payload);
                res.status(200).send({
                    message: "Login successful",
                    token,
                });
            }
            catch (err) {
                console.error(err);
                res.status(400).send({
                    message: "Login failed",
                });
            }
        });
    }
    //Register User
    registerUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { username, email, password, confirmPassword, refCode } = req.body;
                if (password !== confirmPassword)
                    throw { message: "Passwords do not match!" };
                const user = yield (0, user_service_1.findUser)(username, email);
                if (user)
                    throw { message: "Username or email has already been used" };
                const salt = yield (0, bcrypt_1.genSalt)(10);
                const hashPassword = yield (0, bcrypt_1.hash)(password, salt);
                const newUserData = {
                    username,
                    email,
                    password: hashPassword,
                    refCode: (0, generateReferalCode_1.generateReferalCode)(),
                };
                // Cek si Reveral Code nya
                if (refCode) {
                    const referer = yield prisma_1.default.user.findUnique({
                        where: { refCode },
                    });
                    if (!referer)
                        throw { message: "Invalid referral code" };
                    //plus point jika si reveral dipakai
                    yield prisma_1.default.user.update({
                        where: { id: referer.id },
                        data: { points: { increment: 10000 } },
                    });
                    // persentase si kupon jika dipakai
                    const coupon = yield prisma_1.default.userCoupon.create({
                        data: {
                            percentage: 10,
                            isRedeem: false,
                            expiredAt: (0, date_fns_1.addMonths)(new Date(), 3),
                        },
                    });
                    newUserData.percentage = coupon.percentage;
                    newUserData.userCouponId = coupon.id;
                    newUserData.refCodeBy = referer.id;
                    //log untuk melihat hasil si referal dari siapa
                    yield prisma_1.default.refLog.create({
                        data: {
                            pointGet: 10000,
                            expiredAt: (0, date_fns_1.addMonths)(new Date(), 3),
                            isUsed: false,
                            user: {
                                connect: { id: referer.id },
                            },
                        },
                    });
                }
                // buat user baru dari hasil data
                const newUser = yield prisma_1.default.user.create({ data: newUserData });
                const payload = { id: newUser.id };
                const token = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                const linkUser = `${base_url_fe}/verifyuser/${token}`;
                const templatePath = path_1.default.join(__dirname, "../templates", "verifyUser.hbs");
                const templateSource = fs_1.default.readFileSync(templatePath, "utf-8");
                const compiledTemplate = handlebars_1.default.compile(templateSource);
                const html = compiledTemplate({
                    username,
                    linkUser,
                    refCode: newUser.refCode,
                });
                // Mailer transport
                yield mailer_1.transporter.sendMail({
                    from: "dattariqf@gmail.com",
                    to: email,
                    subject: "Welcome To TIKO",
                    html,
                });
                res.status(201).json({ massage: "Registration Succesfull" });
            }
            catch (err) {
                console.error(err);
                res.status(400).json({ massage: "Internal server error" });
            }
        });
    }
    verifyUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token } = req.params;
                const verifiedUser = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
                yield prisma_1.default.user.update({
                    data: { isVerify: true },
                    where: { id: verifiedUser.id },
                });
                res.status(200).send({ message: "Verify Successfully" });
            }
            catch (err) {
                console.log(err);
                res.status(400).send(err);
            }
        });
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////   PROMOTOR   /////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    registerPromotor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, email, password, confirmPassword } = req.body;
                if (password != confirmPassword)
                    throw { massage: "Password Not Match !" };
                const promotor = yield (0, promotor_service_1.findPromotor)(name, email);
                if (promotor)
                    throw { massage: "Name or Email has been used" };
                const salt = yield (0, bcrypt_1.genSalt)(10);
                const hashPassword = yield (0, bcrypt_1.hash)(password, salt);
                const newPromotor = yield prisma_1.default.promotor.create({
                    data: {
                        name,
                        email,
                        password: hashPassword,
                    },
                });
                const payload = { id: newPromotor.id };
                const token = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                const linkPromotor = `${base_url_fe}/verifypromotor/${token}`;
                const templatePath = path_1.default.join(__dirname, "../templates", "verifyPromotor.hbs");
                const templateSource = fs_1.default.readFileSync(templatePath, "utf-8");
                const compiledTemplate = handlebars_1.default.compile(templateSource);
                const html = compiledTemplate({ name, linkPromotor });
                yield mailer_1.transporter.sendMail({
                    from: "dattariqf@gmail.com",
                    to: email,
                    subject: "Welcome To TIKO",
                    html,
                });
                res.status(201).json({ massage: "Registration Succes" });
            }
            catch (err) {
                console.error(err);
                res.status(400).json({ massage: "Registration Failed" });
            }
        });
    }
    loginPromotor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, password } = req.body;
                if (!data || !password) {
                    res
                        .status(400)
                        .send({ success: false, message: "Data and password are required!" });
                    return;
                }
                // Find promotor by name or email
                const promotor = yield prisma_1.default.promotor.findFirst({
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
                const isValidPass = yield (0, bcrypt_1.compare)(password, promotor.password);
                if (!isValidPass) {
                    res
                        .status(401)
                        .send({ success: false, message: "Incorrect password!" });
                    return;
                }
                const payload = { id: promotor.id, type: "promotor" }; // ada tipecdcd
                const token = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, { expiresIn: "1d" });
                res.status(200).json({
                    success: true,
                    message: "Login successful!",
                    token,
                });
            }
            catch (err) {
                console.error("Error during promotor login:", {
                    error: err.message,
                    data: req.body.data,
                });
                res.status(500).send({
                    success: false,
                    message: "An unexpected error occurred.",
                });
            }
        });
    }
    verifyPromotor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token } = req.params;
                const verifiedPromotor = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
                yield prisma_1.default.promotor.update({
                    data: { isVerify: true },
                    where: { id: verifiedPromotor.id },
                });
                res.status(200).send({ message: "Verify Successfully" });
            }
            catch (err) {
                console.log(err);
                res.status(400).send(err);
            }
        });
    }
    getSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                const decoded = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
                if (!decoded || !decoded.type) {
                    res.status(403).send({ message: "Forbidden: Invalid token" });
                    return;
                }
                // Handle different user types
                if (decoded.type === "promotor") {
                    const promotor = yield prisma_1.default.promotor.findUnique({
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
                }
                else if (decoded.type === "user") {
                    const user = yield prisma_1.default.user.findUnique({
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
                        expiredAt: (_a = user.usercoupon) === null || _a === void 0 ? void 0 : _a.expiredAt,
                    });
                }
                else {
                    res.status(403).json({ message: "Forbidden: Unknown token type" });
                }
            }
            catch (err) {
                console.error("Error fetching session:");
                res
                    .status(401)
                    .send({ message: "Unauthorized: Invalid or expired token" });
            }
        });
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////   EXTENSION FOR ALL AUTH   /////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    forgotPasswordUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                // Check if the email exists in the database
                const user = yield prisma_1.default.user.findUnique({
                    where: { email },
                });
                if (!user) {
                    res.status(404).send({ message: "Email not found!" });
                    return;
                }
                // Generate a password reset token
                const payload = { id: user.id, email: user.email };
                const resetToken = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, {
                    expiresIn: "1h", // Token valid for 1 hour
                });
                // Create the password reset link
                const resetLink = `${base_url_fe}/login/loginuser/resetpassworduser/${resetToken}`;
                // Prepare the email template
                const templatePath = path_1.default.join(__dirname, "../templates", "forgotPassword.hbs");
                const templateSource = fs_1.default.readFileSync(templatePath, "utf-8");
                const compiledTemplate = handlebars_1.default.compile(templateSource);
                const html = compiledTemplate({ username: user.username, resetLink });
                // Send the email
                yield mailer_1.transporter.sendMail({
                    from: "dattariqf@gmail.com",
                    to: email,
                    subject: "Password Reset Request",
                    html,
                });
                res
                    .status(200)
                    .send({ message: "Password reset link sent to your email!" });
            }
            catch (err) {
                console.error(err);
                res
                    .status(500)
                    .send({ message: "An error occurred while sending the reset link." });
            }
        });
    }
    resetPasswordUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                let decoded;
                try {
                    decoded = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
                }
                catch (err) {
                    console.error("Token verification failed:", err);
                    res.status(400).send({ message: "Invalid or expired token!" });
                    return;
                }
                console.log("Token decoded:", decoded);
                // Check if the user exists
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: decoded.id },
                });
                if (!user) {
                    res.status(404).send({ message: "User not found!" });
                    return;
                }
                // Hash the new password
                const salt = yield (0, bcrypt_1.genSalt)(10);
                const hashedPassword = yield (0, bcrypt_1.hash)(newPassword, salt);
                // Update the user's password
                yield prisma_1.default.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword },
                });
                res
                    .status(200)
                    .send({ message: "Password has been reset successfully!" });
            }
            catch (err) {
                console.error("Error resetting password:", err);
                res.status(500).send({ message: "An internal server error occurred!" });
            }
        });
    }
    forgotPasswordPromotor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                // Check if the email exists in the database
                const promotor = yield prisma_1.default.promotor.findUnique({
                    where: { email },
                });
                if (!promotor) {
                    res.status(404).send({ message: "Email not found!" });
                    return;
                }
                // Generate a password reset token
                const payload = { id: promotor.id, email: promotor.email };
                const resetToken = (0, jsonwebtoken_1.sign)(payload, process.env.JWT_KEY, {
                    expiresIn: "1h", // Token valid for 1 hour
                });
                // Create the password reset link
                const resetLink = `${base_url_fe}/login/loginpromotor/resetpasswordpromotor/${resetToken}`;
                // Prepare the email template
                const templatePath = path_1.default.join(__dirname, "../templates", "forgotPassword.hbs");
                const templateSource = fs_1.default.readFileSync(templatePath, "utf-8");
                const compiledTemplate = handlebars_1.default.compile(templateSource);
                const html = compiledTemplate({ username: promotor.name, resetLink });
                // Send the email
                yield mailer_1.transporter.sendMail({
                    from: "dattariqf@gmail.com",
                    to: email,
                    subject: "Password Reset Request",
                    html,
                });
                res
                    .status(200)
                    .send({ message: "Password reset link sent to your email!" });
            }
            catch (err) {
                console.error(err);
                res
                    .status(500)
                    .send({ message: "An error occurred while sending the reset link." });
            }
        });
    }
    resetPasswordPromotor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                let decoded;
                try {
                    decoded = (0, jsonwebtoken_1.verify)(token, process.env.JWT_KEY);
                }
                catch (err) {
                    console.error("Token verification failed:", err);
                    res.status(400).send({ message: "Invalid or expired token!" });
                    return;
                }
                console.log("Token decoded:", decoded);
                // Check if the promotor exists
                const promotor = yield prisma_1.default.promotor.findUnique({
                    where: { id: decoded.id },
                });
                if (!promotor) {
                    res.status(404).send({ message: "Promotor not found!" });
                    return;
                }
                // Hash the new password
                const salt = yield (0, bcrypt_1.genSalt)(10);
                const hashedPassword = yield (0, bcrypt_1.hash)(newPassword, salt);
                // Update the promotor's password
                yield prisma_1.default.promotor.update({
                    where: { id: promotor.id },
                    data: { password: hashedPassword },
                });
                res
                    .status(200)
                    .send({ message: "Password has been reset successfully!" });
            }
            catch (err) {
                console.error("Error resetting password:", err);
                res.status(500).send({ message: "An internal server error occurred!" });
            }
        });
    }
}
exports.AuthController = AuthController;
