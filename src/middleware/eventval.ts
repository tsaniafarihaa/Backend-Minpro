import Joi from "joi";
import { Request, Response, NextFunction } from "express";

export const validateCreateEvent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const schema = Joi.object({
    title: Joi.string().required(),
    category: Joi.string()
      .valid("Music", "Orchestra", "Opera", "Other")
      .required(),
    location: Joi.string()
      .valid("Bandung", "Bali", "Surabaya", "Jakarta")
      .required(),
    venue: Joi.string().required(),
    description: Joi.string().required(),
    date: Joi.string().required(),
    time: Joi.string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    eventType: Joi.string().valid("free", "paid").required(),
    tickets: Joi.array()
      .items(
        Joi.object({
          category: Joi.string().required(),
          price: Joi.number().min(0).required(),
          quantity: Joi.number().min(1).required(),
        })
      )
      .custom((value, helpers) => {
        const eventType = (req.body as any).eventType;
        if (eventType === "free") {
          if (
            value.length !== 1 ||
            value[0].price !== 0 ||
            value[0].category !== "Free"
          ) {
            return helpers.error("any.invalid");
          }
        }
        return value;
      })
      .required(),
  });

  console.log("Received request body:", JSON.stringify(req.body, null, 2));

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    console.log("Validation error:", error.details);
    res.status(400).json({
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.context?.key,
        message: detail.message,
      })),
    });
    return;
  }

  next();
};
