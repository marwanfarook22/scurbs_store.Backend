import { JWT_SECRET } from "../config/env.js";
import jwt from "jsonwebtoken";
import Usermodule from "../models/users.models.js"; // تم إضافة الاستدعاء الناقص (تأكد من المسار)

const TokenAuth = async (req, res, next) => { // تم إضافة async
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        } // تم إضافة قوس الإغلاق الناقص هنا

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await Usermodule.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        req.user = user;
        next(); // تم إضافة دالة المرور للسماح بإكمال الطلب

    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
            error: error.message
        });
    }
};

export default TokenAuth;