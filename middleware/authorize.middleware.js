
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // التحقق مما إذا كان دور المستخدم (الموجود في التوكن) ضمن الأدوار المسموح لها
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role: '${req.user.role}' is not allowed to access this resource.`
            });
        }

        // إذا كان أدمن (أو يحمل الصلاحية المطلوبة)، نسمح له بالمرور للـ Controller لتنفيذ الطلب
        next();
    };
};

export const authorizeUserUpdate = (req, res, next) => {
    const isUpdatingOwnAccount = req.user._id.toString() === req.params.id;
    const canManageOtherAccounts = ["admin", "moderator"].includes(req.user.role);

    if (!isUpdatingOwnAccount && !canManageOtherAccounts) {
        return res.status(403).json({
            success: false,
            message: "You can only update your own account.",
        });
    }

    next();
};