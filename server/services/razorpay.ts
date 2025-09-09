import Razorpay from "razorpay";
import crypto from "crypto";

// Lazy initialization of Razorpay instance
let razorpay: Razorpay | null = null;

// Payment status tracking
const paymentStatus = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt: Date;
  orderId: string;
  planId: string;
}>();

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Timeout configuration
const TIMEOUT_CONFIG = {
  orderCreation: 30000, // 30 seconds
  paymentVerification: 45000, // 45 seconds
  paymentFetch: 15000 // 15 seconds
};

const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("Razorpay credentials not found in environment variables. Payment features will be disabled.");
      throw new Error("Payment service is not configured. Please contact support.");
    }

    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID.trim(),
        key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
      });
    } catch (error) {
      console.error("Failed to initialize Razorpay:", error);
      throw new Error("Payment service initialization failed. Please try again later.");
    }
  }
  return razorpay;
};

// Utility function for retry logic with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`${operationName} attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors
      if (error.message?.includes('Authentication failed') ||
          error.message?.includes('Invalid key') ||
          error.message?.includes('Bad request')) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelay
        );
        console.log(`Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Utility function for timeout handling
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const createOrder = async (amount: number, currency = "INR", receipt?: string) => {
  try {
    const razorpayInstance = getRazorpayInstance();

    // Validate input parameters
    if (amount <= 0) {
      throw new Error("Invalid amount: must be greater than 0");
    }

    if (!['INR', 'USD', 'EUR'].includes(currency.toUpperCase())) {
      throw new Error("Invalid currency: must be INR, USD, or EUR");
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      receipt: receipt || `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payment_capture: 1
    };

    console.log(`Creating Razorpay order: ${JSON.stringify(options)}`);

    const order = await retryWithBackoff(
      () => withTimeout(
        razorpayInstance.orders.create(options),
        TIMEOUT_CONFIG.orderCreation,
        'Order creation'
      ),
      'Order creation'
    );

    console.log(`Order created successfully: ${order.id}`);
    return order;
  } catch (error: any) {
    console.error("Razorpay order creation error:", {
      error: error.message,
      amount,
      currency,
      receipt,
      stack: error.stack
    });

    // Provide user-friendly error messages
    if (error.message?.includes('timed out')) {
      throw new Error("Payment service is currently slow. Please try again in a few moments.");
    } else if (error.message?.includes('Authentication failed')) {
      throw new Error("Payment service configuration error. Please contact support.");
    } else if (error.message?.includes('Invalid amount')) {
      throw new Error("Invalid payment amount. Please try again.");
    } else {
      throw new Error("Unable to create payment order. Please try again or contact support if the problem persists.");
    }
  }
};

export const verifyPayment = (orderId: string, paymentId: string, signature: string) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay key secret not found in environment variables");
    }

    if (!orderId || !paymentId || !signature) {
      throw new Error("Missing required payment verification parameters");
    }

    const secret = process.env.RAZORPAY_KEY_SECRET.trim();
    const body = orderId + "|" + paymentId;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === signature;

    console.log(`Payment verification for order ${orderId}: ${isValid ? 'SUCCESS' : 'FAILED'}`);

    return isValid;
  } catch (error: any) {
    console.error("Payment verification error:", {
      orderId,
      paymentId,
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

// Enhanced payment verification with status tracking
export const verifyPaymentWithTracking = async (
  orderId: string,
  paymentId: string,
  signature: string,
  planId: string
) => {
  const trackingKey = `${orderId}_${paymentId}`;

  try {
    // Initialize tracking if not exists
    if (!paymentStatus.has(trackingKey)) {
      paymentStatus.set(trackingKey, {
        status: 'processing',
        attempts: 0,
        lastAttempt: new Date(),
        orderId,
        planId
      });
    }

    const tracking = paymentStatus.get(trackingKey)!;
    tracking.attempts++;
    tracking.lastAttempt = new Date();

    console.log(`Payment verification attempt ${tracking.attempts} for order ${orderId}`);

    // First, verify the signature
    const isSignatureValid = verifyPayment(orderId, paymentId, signature);
    if (!isSignatureValid) {
      tracking.status = 'failed';
      throw new Error("Payment signature verification failed");
    }

    // Then, fetch payment details from Razorpay to confirm status
    const paymentDetails = await retryWithBackoff(
      () => withTimeout(
        fetchPayment(paymentId),
        TIMEOUT_CONFIG.paymentFetch,
        'Payment fetch'
      ),
      'Payment fetch'
    );

    // Check payment status
    if (paymentDetails.status === 'captured' || paymentDetails.status === 'authorized') {
      tracking.status = 'completed';
      console.log(`Payment ${paymentId} successfully verified and captured`);
      return {
        success: true,
        paymentDetails,
        tracking
      };
    } else if (paymentDetails.status === 'failed') {
      tracking.status = 'failed';
      throw new Error(`Payment failed: ${paymentDetails.error_description || 'Unknown error'}`);
    } else {
      // Payment is still processing
      tracking.status = 'processing';
      console.log(`Payment ${paymentId} is still processing (status: ${paymentDetails.status})`);
      return {
        success: false,
        paymentDetails,
        tracking,
        message: "Payment is still being processed. Please wait..."
      };
    }

  } catch (error: any) {
    const tracking = paymentStatus.get(trackingKey);
    if (tracking) {
      tracking.status = 'failed';
    }

    console.error("Payment verification with tracking failed:", {
      orderId,
      paymentId,
      planId,
      error: error.message,
      attempts: tracking?.attempts || 1
    });

    throw error;
  }
};

export const createSubscription = async (planId: string, customerId: string, totalCount?: number) => {
  try {
    const razorpayInstance = getRazorpayInstance();
    const subscription = await razorpayInstance.subscriptions.create({
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
    const razorpayInstance = getRazorpayInstance();
    const customer = await razorpayInstance.customers.create({
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
    const razorpayInstance = getRazorpayInstance();
    const refund = await razorpayInstance.payments.refund(paymentId, {
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
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    const razorpayInstance = getRazorpayInstance();

    console.log(`Fetching payment details for: ${paymentId}`);

    const payment = await retryWithBackoff(
      () => withTimeout(
        razorpayInstance.payments.fetch(paymentId),
        TIMEOUT_CONFIG.paymentFetch,
        'Payment fetch'
      ),
      'Payment fetch'
    );

    console.log(`Payment ${paymentId} fetched successfully: ${payment.status}`);
    return payment;
  } catch (error: any) {
    console.error("Razorpay payment fetch error:", {
      paymentId,
      error: error.message,
      stack: error.stack
    });

    // Provide user-friendly error messages
    if (error.message?.includes('timed out')) {
      throw new Error("Payment service is currently slow. Please try again in a few moments.");
    } else if (error.message?.includes('not found')) {
      throw new Error("Payment not found. Please contact support if you were charged.");
    } else {
      throw new Error("Unable to fetch payment details. Please try again or contact support.");
    }
  }
};

// Payment status management functions
export const getPaymentStatus = (orderId: string, paymentId: string) => {
  const trackingKey = `${orderId}_${paymentId}`;
  return paymentStatus.get(trackingKey);
};

export const clearPaymentStatus = (orderId: string, paymentId: string) => {
  const trackingKey = `${orderId}_${paymentId}`;
  paymentStatus.delete(trackingKey);
};

export const getAllPaymentStatuses = () => {
  const statuses: Array<{
    key: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    lastAttempt: Date;
    orderId: string;
    planId: string;
  }> = [];

  paymentStatus.forEach((value, key) => {
    statuses.push({
      key,
      ...value
    });
  });

  return statuses;
};

// Cleanup old payment statuses (older than 1 hour)
export const cleanupOldPaymentStatuses = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const keysToDelete: string[] = [];

  paymentStatus.forEach((tracking, key) => {
    if (tracking.lastAttempt < oneHourAgo) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => paymentStatus.delete(key));

  console.log(`Cleaned up old payment statuses. Remaining: ${paymentStatus.size}`);
};

// Run cleanup every 30 minutes
setInterval(cleanupOldPaymentStatuses, 30 * 60 * 1000);

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
