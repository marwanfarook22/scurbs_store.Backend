import mongoose from "mongoose";

// بيانات المنتج المختار داخل الفاتورة
const billItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    productDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductDetail",
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      trim: true,
      default: "",
    },
    size: {
      type: String,
      trim: true,
      default: "",
    },
    primaryImageUrl: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "الكمية لا يمكن أن تقل عن 1"],
    },
  },
  { _id: false },
);

const billSchema = new mongoose.Schema(
  {
    // رقم الطلب لسهولة الإشارة إليه في رسالة الواتساب
    billNumber: {
      type: String,
      unique: true,
    },

    // المستخدم صاحب الطلب
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // معلومات العميل الأساسية
    customerInfo: {
      name: {
        type: String,
        required: [true, "اسم العميل مطلوب"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "البريد الإلكتروني مطلوب"],
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "رقم الهاتف مطلوب"],
        trim: true,
      },
      secondaryPhone: {
        type: String, // حقل اختياري (Optional)
        trim: true,
        default: "",
      },
    },

    // العنوان بالتفصيل والمحافظة
    shippingAddress: {
      governorate: {
        type: String,
        required: [true, "المحافظة مطلوبة"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "المدينة أو المنطقة مطلوبة"],
        trim: true,
      },
      detailedAddress: {
        type: String,
        required: [true, "العنوان بالتفصيل مطلوب"],
        trim: true,
      },
    },

    // المنتجات المختارة
    items: {
      type: [billItemSchema],
      validate: [
        (val) => val.length > 0,
        "يجب أن تحتوي الفاتورة على منتج واحد على الأقل",
      ],
    },

    // إجمالي المبلغ المطلوب
    totalAmount: {
      type: Number,
      required: true,
    },

    // اختيار طريقة الدفع فقط (يتم التنسيق والتأكيد عبر واتساب)
    paymentMethod: {
      type: String,
      enum: ["cod", "instapay", "wallet"],
      default: "cod",
      required: true,
    },

    // حالة الأوردر (معلق، في الطريق، تم التوصيل، ملغي)
    status: {
      type: String,
      enum: ["pending", "on_the_way", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// توليد رقم الطلب وحساب الإجمالي قبل التحقق من الحقول المطلوبة
billSchema.pre("validate", function () {
  if (!this.billNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.billNumber = `INV-${randomDigits}`;
  }

  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }
});

const Bill = mongoose.model("Bill", billSchema);
export default Bill;
