// import Razorpay from "razorpay";
// import crypto from "crypto";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID || "test_key",
//   key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret"
// });

// export const createOrder = async (amount: number, currency = "INR", receipt?: string) => {
//   try {
//     const options = {
//       amount: Math.round(amount * 100), // Convert to paise
//       currency,
//       receipt: receipt || `order_${Date.now()}`,
//       payment_capture: 1
//     };

//     const order = await razorpay.orders.create(options);
//     return order;
//   } catch (error) {
//     console.error("Razorpay order creation error:", error);
//     throw error;
//   }
// };

// export const verifyPayment = (orderId: string, paymentId: string, signature: string) => {
//   const secret = process.env.RAZORPAY_KEY_SECRET || "test_secret";
//   const body = orderId + "|" + paymentId;
  
//   const expectedSignature = crypto
//     .createHmac("sha256", secret)
//     .update(body.toString())
//     .digest("hex");

//   return expectedSignature === signature;
// };

// export const createSubscription = async (planId: string, customerId: string, totalCount?: number) => {
//   try {
//     const subscription = await razorpay.subscriptions.create({
//       plan_id: planId,
//       total_count: totalCount || 12,
//       notify: 1
//     } as any);

//     return subscription;
//   } catch (error) {
//     console.error("Razorpay subscription creation error:", error);
//     throw error;
//   }
// };

// export const createCustomer = async (name: string, email: string, contact?: string) => {
//   try {
//     const customer = await razorpay.customers.create({
//       name,
//       email,
//       contact
//     });

//     return customer;
//   } catch (error) {
//     console.error("Razorpay customer creation error:", error);
//     throw error;
//   }
// };

// export const refundPayment = async (paymentId: string, amount?: number) => {
//   try {
//     const refund = await razorpay.payments.refund(paymentId, {
//       amount: amount ? Math.round(amount * 100) : undefined
//     });

//     return refund;
//   } catch (error) {
//     console.error("Razorpay refund error:", error);
//     throw error;
//   }
// };

// export const fetchPayment = async (paymentId: string) => {
//   try {
//     return await razorpay.payments.fetch(paymentId);
//   } catch (error) {
//     console.error("Razorpay payment fetch error:", error);
//     throw error;
//   }
// };

// export const generateQRCode = async (amount: number, description: string) => {
//   // Generate a base64 QR code for tickets
//   // This is a simplified implementation - in production, use a proper QR library
//   const qrData = JSON.stringify({
//     amount,
//     description,
//     timestamp: Date.now()
//   });
  
//   // Return a data URL for the QR code (in production, use actual QR generation)
//   return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
// };

// export default razorpay;

import Razorpay from "razorpay";
import crypto from "crypto";

// Ensure environment variables are loaded
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("Razorpay credentials not found in environment variables");
  throw new Error("Razorpay configuration missing");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createOrder = async (amount: number, currency = "INR", receipt?: string) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw error;
  }
};

export const verifyPayment = (orderId: string, paymentId: string, signature: string) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay key secret not found in environment variables");
  }
  
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body = orderId + "|" + paymentId;
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
};

export const createSubscription = async (planId: string, customerId: string, totalCount?: number) => {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount || 12,
      notify: 1
    } as any);

    return subscription;
  } catch (error) {
    console.error("Razorpay subscription creation error:", error);
    throw error;
  }
};

export const createCustomer = async (name: string, email: string, contact?: string) => {
  try {
    const customer = await razorpay.customers.create({
      name,
      email,
      contact
    });

    return customer;
  } catch (error) {
    console.error("Razorpay customer creation error:", error);
    throw error;
  }
};

export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined
    });

    return refund;
  } catch (error) {
    console.error("Razorpay refund error:", error);
    throw error;
  }
};

export const fetchPayment = async (paymentId: string) => {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error("Razorpay payment fetch error:", error);
    throw error;
  }
};

export const generateQRCode = async (amount: number, description: string) => {
  // Generate a base64 QR code for tickets
  // This is a simplified implementation - in production, use a proper QR library
  const qrData = JSON.stringify({
    amount,
    description,
    timestamp: Date.now()
  });
  
  // Return a data URL for the QR code (in production, use actual QR generation)
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
};

export default razorpay;
