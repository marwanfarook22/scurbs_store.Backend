import Bill from "../models/Bills.js";
import Product from "../models/Product.js";
import ProductDetail from "../models/ProductDetail.js";
import Usermodule from "../models/users.models.js";

// 1. إنشاء فاتورة / طلب جديد
export const createBill = async (req, res, next) => {
  try {
    const {
      shippingAddress,
      items,
      paymentMethod,
      secondaryPhone,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "السلة خالية من المنتجات" });
    }

    const userPhone = req.user.phone || req.body.phone;
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "يرجى إدخال رقم الهاتف لإتمام الطلب",
      });
    }

    if (!req.user.phone && req.body.phone) {
      try {
        await Usermodule.findByIdAndUpdate(
          req.user._id,
          { phoneNumber: req.body.phone },
          { new: true, runValidators: true },
        );
      } catch (error) {
        if (error.code === 11000 && error.keyPattern?.phoneNumber) {
          return res.status(409).json({
            success: false,
            code: "PHONE_ALREADY_REGISTERED",
            message: "رقم الهاتف مسجل بالفعل على حساب آخر",
          });
        }
        throw error;
      }
    }

    const customerInfo = {
      name: req.user.name,
      email: req.user.email,
      phone: userPhone,
      secondaryPhone: secondaryPhone || "", // اختياري (اختياري للعميل)
    };

    // التحقق من المخزون وتجهيز المنتجات بالأسعار الحالية
    const billItems = [];
    for (const item of items) {
      const productId = item.productId || item.product;
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "المنتج غير موجود" });
      }

      if (!item.productDetailId) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد مقاس ولون للمنتج قبل إتمام الطلب",
        });
      }

      const productDetail = await ProductDetail.findOne({
        _id: item.productDetailId,
        product: product._id,
      });
      if (!productDetail) {
        return res.status(404).json({
          success: false,
          message: "متغير المنتج غير موجود أو لا ينتمي لهذا المنتج",
        });
      }
      if (productDetail.quantityOnHand < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `الكمية المطلوبة غير متوفرة للمتغير: ${productDetail.size} / ${productDetail.color?.name} (المتاح: ${productDetail.quantityOnHand})`,
        });
      }

      const sourcePrice = productDetail;
      const effectivePrice =
        sourcePrice.salesPrice > 0 && sourcePrice.salesPrice < sourcePrice.price
          ? sourcePrice.salesPrice
          : sourcePrice.price;

      billItems.push({
        product: product._id,
        productId: product._id,
        productDetailId: productDetail?._id || null,
        name: product.name,
        color: productDetail.color?.name || "",
        size: productDetail.size || "",
        primaryImageUrl: productDetail.imagesList?.[0] || "",
        price: effectivePrice,
        quantity: item.quantity,
      });

      productDetail.quantityOnHand -= item.quantity;
      await productDetail.save();

      product.sold = (product.sold || 0) + item.quantity;
      await product.save();
    }

    // إنشاء الفاتورة الجديدة
    const bill = await Bill.create({
      user: req.user._id,
      customerInfo,
      shippingAddress,
      items: billItems,
      paymentMethod,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب بنجاح",
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

// 2. جلب فواتير المستخدم الحالي (أو كل الفواتير إذا كان المستخدم Admin)
export const getBills = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.role !== "moderator") {
      query.user = req.user._id;
    }

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    next(error);
  }
};

// 3. جلب تفاصيل فاتورة محددة برقمها أو الـ ID
export const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "الفاتورة غير موجودة" });
    }

    if (
      req.user.role !== "admin" &&
      req.user.role !== "moderator" &&
      bill.user._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "غير مصرح لك بعرض هذه الفاتورة" });
    }

    res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};

// 4. تحديث حالة الطلب (للأدمن والموديريتور)
export const updateBillStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "on_the_way", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "حالة الطلب غير صالحة" });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "الفاتورة غير موجودة" });
    }

    // إذا تحولت الحالة إلى "cancelled" ولم تكن ملغية من قبل، نعيد المنتجات للمخزون
    if (status === "cancelled" && bill.status !== "cancelled") {
      for (const item of bill.items) {
        const productId = item.productId || item.product;
        const product = await Product.findById(productId);
        if (product) {
          if (item.productDetailId) {
            const productDetail = await ProductDetail.findById(item.productDetailId);
            if (productDetail && String(productDetail.product) === String(product._id)) {
              productDetail.quantityOnHand += item.quantity;
              await productDetail.save();
            }
          }
          product.sold = Math.max(0, (product.sold || 0) - item.quantity);
          await product.save();
        }
      }
    }

    bill.status = status;
    await bill.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث حالة الطلب بنجاح",
      data: bill,
    });
  } catch (error) {
    next(error);
  }
};
