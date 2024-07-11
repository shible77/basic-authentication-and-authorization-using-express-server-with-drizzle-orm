import express, { Request, Response } from "express";
import { z } from 'zod';
import { db } from "../../db/setup";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
const jwt = require('jsonwebtoken')
import argon2 from 'argon2';
import dotenv from "dotenv";
dotenv.config();

const loginRouter = express.Router();

const loginReqBody = z.object({
    email: z.string(),
    password: z.string()
});

loginRouter.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password } = loginReqBody.parse(req.body);

        const user = await db.select().from(users).where(eq(users.email, email));

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const passwordMatch = await argon2.verify(user[0]?.password, password.toString());
        if (passwordMatch) {
            const token = jwt.sign({ user: user[0] }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, { 
                httpOnly: true,    // Prevents client-side JavaScript from accessing the cookie
                secure: true,      // Ensures the cookie is only sent over HTTPS
                sameSite: 'strict' // Helps prevent CSRF attacks
              });
            return res.status(200).json({
                success: true,
                message: "Login successful",
                token: token
            });
        } else {
            return res.status(401).json({ message: "Password doesn't match" });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                name: "Invalid data type.",
                message: JSON.parse(error.message),
            });
        }
        res.status(500).json({ message: "Internal server error", error });
    }
});

export default loginRouter;
