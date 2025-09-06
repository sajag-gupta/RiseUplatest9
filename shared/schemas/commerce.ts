import { z } from "zod";
import { ObjectIdType } from "./common";

// -----------------------------
// 🔹 Order Schema
// -----------------------------
export const orderSchema = z.object({
  _id: ObjectIdType,
  userId: ObjectIdType,  // Reference to User
  type: z.enum(["MERCH", "TICKET", "MIXED"]),
  items: z.array(z.object({
    merchId: ObjectIdType.optional(),  // Reference to Merch
    eventId: ObjectIdType.optional(),  // Reference to Event
    qty: z.number(),
    unitPrice: z.number()
  })),
  totalAmount: z.number(),
  currency: z.string().default("INR"),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).default("PENDING"),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  shippingAddress: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    phone: z.string()
  }).optional(),
  qrTicketUrl: z.string().optional(),
  invoiceUrl: z.string().optional(),
  createdAt: z.date().default(() => new Date())
});

export const insertOrderSchema = orderSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Subscription Schema
// -----------------------------
export const subscriptionSchema = z.object({
  _id: ObjectIdType,
  fanId: ObjectIdType,    // Reference to User (role=fan)
  artistId: ObjectIdType, // Reference to User (role=artist)
  tier: z.enum(["BRONZE", "SILVER", "GOLD"]),
  amount: z.number(),
  currency: z.string().default("INR"),
  startDate: z.date(),
  endDate: z.date(),
  active: z.boolean().default(true),
  razorpaySubId: z.string().optional(),
  createdAt: z.date().default(() => new Date())
});

export const insertSubscriptionSchema = subscriptionSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Promo Code Schema
// -----------------------------
export const promoCodeSchema = z.object({
  _id: ObjectIdType,
  code: z.string().toUpperCase(),
  description: z.string(),
  discountType: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  discountValue: z.number(),
  minimumOrderAmount: z.number().optional(),
  maximumDiscount: z.number().optional(),
  usageLimit: z.number().optional(), // Total usage limit
  usageCount: z.number().default(0),
  userUsageLimit: z.number().optional(), // Per user limit
  validFrom: z.date(),
  validUntil: z.date(),
  applicableCategories: z.array(z.string()).optional(), // Specific categories
  applicableProducts: z.array(ObjectIdType).optional(), // Specific products
  isActive: z.boolean().default(true),
  createdBy: ObjectIdType, // Reference to User (admin)
  createdAt: z.date().default(() => new Date())
});

export const insertPromoCodeSchema = promoCodeSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Order Tracking Schema
// -----------------------------
export const orderTrackingSchema = z.object({
  _id: ObjectIdType,
  orderId: ObjectIdType, // Reference to Order
  status: z.enum([
    "ORDER_PLACED", "PAYMENT_CONFIRMED", "PROCESSING", "PACKED",
    "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"
  ]),
  description: z.string(),
  location: z.string().optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDelivery: z.date().optional(),
  updatedBy: ObjectIdType, // Reference to User
  createdAt: z.date().default(() => new Date())
});

export const insertOrderTrackingSchema = orderTrackingSchema.omit({ _id: true, createdAt: true });

// -----------------------------
// 🔹 Return/Refund Schema
// -----------------------------
export const returnRequestSchema = z.object({
  _id: ObjectIdType,
  orderId: ObjectIdType, // Reference to Order
  userId: ObjectIdType, // Reference to User
  items: z.array(z.object({
    merchId: ObjectIdType, // Reference to Merch
    quantity: z.number(),
    reason: z.string(),
    condition: z.enum(["NEW", "USED", "DAMAGED"])
  })),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
  refundAmount: z.number().optional(),
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "STORE_CREDIT"]).optional(),
  reason: z.string(),
  adminNotes: z.string().optional(),
  images: z.array(z.string()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export const insertReturnRequestSchema = returnRequestSchema.omit({ _id: true, createdAt: true, updatedAt: true });

// -----------------------------
// 🔹 Type Exports
// -----------------------------
export type Order = z.infer<typeof orderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type PromoCode = z.infer<typeof promoCodeSchema>;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type OrderTracking = z.infer<typeof orderTrackingSchema>;
export type InsertOrderTracking = z.infer<typeof insertOrderTrackingSchema>;
export type ReturnRequest = z.infer<typeof returnRequestSchema>;
export type InsertReturnRequest = z.infer<typeof insertReturnRequestSchema>;
