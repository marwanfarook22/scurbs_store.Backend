import express from "express";
import {
  createBill,
  getBills,
  getBillById,
  updateBillStatus,
} from "../Controllers/bill.controller.js";
import TokenAuth from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";

const router = express.Router();

// جميع مسارات الفواتير تتطلب تسجيل الدخول
router.use(TokenAuth);

router.route("/").post(createBill).get(getBills);

router.route("/:id").get(getBillById);

// تحديث حالة الطلب متاح للأدمن والموديريتور فقط
router
  .route("/:id/status")
  .patch(authorizeRoles("admin", "moderator"), updateBillStatus);

export default router;
