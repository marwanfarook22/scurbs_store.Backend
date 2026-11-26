import { aj } from "../config/arcjet.js";

const arcjetMiddleware = async (req, res, next) => {
    try {
        const decision = await aj.protect(req, { requested: 1 });

        if (decision.isDenied()) {
            // 1. التحقق من تجاوز الحد المسموح للطلبات (Rate Limiting)
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({
                    success: false,
                    error: "Rate limit exceeded | Too many requests. Please try again later."
                });
            }

            // 2. التحقق مما إذا كان الطلب قادماً من بوت غير مصرح به (Bot Protection)
            if (decision.reason.isBot()) {
                return res.status(403).json({
                    success: false,
                    error: "Automated bot detected | Access denied."
                });
            }

            // 3. التحقق من وجود محاولة اختراق أو بيانات خبيثة (Arcjet Shield)
            if (decision.reason.isShield()) {
                return res.status(403).json({
                    success: false,
                    error: "Suspicious activity detected | Request blocked for security."
                });
            }

            // 4. رسالة افتراضية لأي سبب رفض آخر
            return res.status(403).json({
                success: false,
                error: "Access Denied"
            });
        }

        // إذا كان الطلب سليماً تماماً، يمر للخطوة التالية
        next();

    } catch (error) {
        console.log(`Arcjet Middleware Error: ${error.message}`);
        next(error);
    }
}

export default arcjetMiddleware;