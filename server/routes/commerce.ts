import type { Express } from "express";
import { storage } from "../storage";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { createOrder, verifyPayment, generateQRCode } from "../services/razorpay";
import { sendOrderConfirmation, sendTicketEmail } from "../services/email";
import { insertOrderSchema } from "../../shared/schemas";

export function setupCommerceRoutes(app: Express) {
  // Cart routes
  app.get("/api/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For now, we'll use session-based cart (could be moved to user schema)
      const cart = req.session.cart || {
        items: [],
        summary: { subtotal: 0, discount: 0, tax: 0, total: 0 },
      };
      res.json(cart);
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/cart/add", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { type, id, quantity = 1 } = req.body;

      if (!req.session.cart) {
        req.session.cart = {
          items: [],
          summary: { subtotal: 0, discount: 0, tax: 0, total: 0 },
        };
      }

      let itemData;
      let price: number = 0;

      if (type === "merch") {
        itemData = await storage.getMerch(id);
        price = itemData?.price || 0;
      } else if (type === "event") {
        itemData = await storage.getEvent(id);
        price = itemData?.ticketPrice || 0;
      }

      if (!itemData) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check if item already exists in cart
      const existingItemIndex = req.session.cart.items.findIndex(
        (item: any) => item.id === id && item.type === type,
      );

      if (existingItemIndex > -1) {
        // Update quantity
        req.session.cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        req.session.cart.items.push({
          _id: `cart_${Date.now()}`,
          type,
          id,
          name:
            type === "merch"
              ? (itemData as any).name
              : (itemData as any).title,
          price,
          quantity,
          image: type === "merch" ? (itemData as any).images?.[0] : undefined,
        });
      }

      // Recalculate totals
      const subtotal = req.session.cart.items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;

      req.session.cart.summary = { subtotal, discount: 0, tax, total };

      res.json({ message: "Item added to cart", cart: req.session.cart });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/cart/update", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { itemId, quantity } = req.body;

      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      const itemIndex = req.session.cart.items.findIndex(
        (item: any) => item._id === itemId,
      );

      if (itemIndex > -1) {
        if (quantity <= 0) {
          req.session.cart.items.splice(itemIndex, 1);
        } else {
          req.session.cart.items[itemIndex].quantity = quantity;
        }

        // Recalculate totals
        const subtotal = req.session.cart.items.reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0,
        );
        const tax = subtotal * 0.18;
        const total = subtotal + tax;

        req.session.cart.summary = { subtotal, discount: 0, tax, total };
      }

      res.json({ message: "Cart updated", cart: req.session.cart });
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/cart/remove", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { itemId } = req.body;

      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      req.session.cart.items = req.session.cart.items.filter(
        (item: any) => item._id !== itemId,
      );

      // Recalculate totals
      const subtotal = req.session.cart.items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      req.session.cart.summary = { subtotal, discount: 0, tax, total };

      res.json({ message: "Item removed from cart", cart: req.session.cart });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/cart/promo", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { code } = req.body;

      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Calculate current subtotal
      const subtotal = req.session.cart.items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );

      // Validate promo code using the new system
      const validation = await storage.validatePromoCode(code, req.user!.id, subtotal);

      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      // Apply discount
      const discountAmount = validation.discount;
      const tax = (subtotal - discountAmount) * 0.18;
      const total = subtotal - discountAmount + tax;

      req.session.cart.summary = {
        subtotal,
        discount: discountAmount,
        tax,
        total,
      };

      // Store applied promo code in session
      req.session.cart.appliedPromoCode = code;

      res.json({
        message: validation.message,
        cart: req.session.cart,
        discount: discountAmount
      });
    } catch (error) {
      console.error("Apply promo error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove promo code from cart
  app.delete("/api/cart/promo", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Recalculate totals without discount
      const subtotal = req.session.cart.items.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      req.session.cart.summary = { subtotal, discount: 0, tax, total };
      delete req.session.cart.appliedPromoCode;

      res.json({ message: "Promo code removed", cart: req.session.cart });
    } catch (error) {
      console.error("Remove promo error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clear entire cart
  app.delete("/api/cart/clear", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.session.cart) {
        req.session.cart = {
          items: [],
          summary: { subtotal: 0, discount: 0, tax: 0, total: 0 },
        };
      }

      res.json({ message: "Cart cleared", cart: req.session.cart });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order routes
  app.post("/api/orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Determine order type based on cart items
      let orderType = "MERCH";
      if (req.session.cart && req.session.cart.items.length > 0) {
        const hasTickets = req.session.cart.items.some(
          (item: any) => item.type === "event",
        );
        const hasMerch = req.session.cart.items.some(
          (item: any) => item.type === "merch",
        );

        if (hasTickets && hasMerch) {
          orderType = "MIXED";
        } else if (hasTickets) {
          orderType = "TICKET";
        } else {
          orderType = "MERCH";
        }
      }

      // Transform cart items to match order schema
      const transformedItems =
        req.session.cart?.items?.map((item: any) => ({
          merchId: item.type === "merch" ? item.id : undefined,
          eventId: item.type === "event" ? item.id : undefined,
          qty: item.quantity,
          unitPrice: item.price,
        })) || [];

      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user!.id,
        type: req.body.type || orderType,
        status: "PENDING",
        currency: "INR",
        items: transformedItems,
        totalAmount: req.session.cart?.summary?.total || 0,
      });

      const order = await storage.createOrder(orderData);

      // Create Razorpay order
      const razorpayOrder = await createOrder(
        order.totalAmount,
        order.currency,
        order._id,
      );

      await storage.updateOrder(order._id, {
        razorpayOrderId: razorpayOrder.id,
      });

      res.json({
        order,
        razorpayOrder,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/payments/verify", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId, paymentId, signature, orderDbId } = req.body;

      const isValid = verifyPayment(orderId, paymentId, signature);

      if (!isValid) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Update order status
      const order = await storage.updateOrder(orderDbId, {
        status: "PAID",
        razorpayPaymentId: paymentId,
      });

      if (order) {
        // Send confirmation email (non-blocking)
        sendOrderConfirmation(req.user!.email, order).catch((error) => {
          console.warn("Failed to send order confirmation:", error.message);
        });

        // Generate QR code for tickets
        if (order.type === "TICKET") {
          const qrCode = await generateQRCode(
            order.totalAmount,
            `Ticket for ${order._id}`,
          );
          await storage.updateOrder(order._id, { qrTicketUrl: qrCode });

          // Send ticket email (non-blocking)
          sendTicketEmail(
            req.user!.email,
            {
              eventTitle: "Event", // You'd fetch the actual event details
              date: new Date(),
              location: "Venue",
              ticketId: order._id,
            },
            qrCode,
          ).catch((error) => {
            console.warn("Failed to send ticket email:", error.message);
          });
        }
      }

      res.json({ message: "Payment verified successfully", order });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orders = await storage.getOrdersByUser(req.user!.id);
      res.json(orders);
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user owns this order
      if (order.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription routes
  app.get("/api/subscriptions/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscriptions = await storage.getSubscriptionsByUser(
        req.user!.id,
      );
      res.json(subscriptions);
    } catch (error) {
      console.error("Get user subscriptions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subscriptions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { artistId, plan, amount } = req.body;

      const subscription = await storage.createSubscription({
        fanId: req.user!.id,
        artistId,
        tier: plan || "BRONZE",
        amount,
        currency: "INR",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        active: true,
      });

      res.json(subscription);
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order Tracking routes
  app.get("/api/orders/:orderId/tracking", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId } = req.params;

      // Verify order ownership
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tracking = await storage.getOrderTracking(orderId);
      res.json(tracking);
    } catch (error) {
      console.error("Get order tracking error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin route to create order tracking update
  app.post("/api/orders/:orderId/tracking", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId } = req.params;
      const { status, description, location, trackingNumber, carrier, estimatedDelivery } = req.body;

      // Verify order exists
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // TODO: Add admin role check here
      // For now, allowing any authenticated user (should be admin only)

      const tracking = await storage.createOrderTracking({
        orderId,
        status,
        description,
        location,
        trackingNumber,
        carrier,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        updatedBy: req.user!.id
      });

      // Update order status if tracking status indicates completion
      if (status === "DELIVERED") {
        await storage.updateOrder(orderId, { status: "DELIVERED" });
      } else if (status === "SHIPPED") {
        await storage.updateOrder(orderId, { status: "SHIPPED" });
      }

      res.json(tracking);
    } catch (error) {
      console.error("Create order tracking error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Return Request routes
  app.get("/api/returns/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const returns = await storage.getReturnRequestsByUser(req.user!.id);
      res.json(returns);
    } catch (error) {
      console.error("Get user returns error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/returns", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { orderId, items, reason, refundMethod } = req.body;

      // Verify order ownership
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Calculate refund amount
      let refundAmount = 0;
      for (const returnItem of items) {
        const orderItem = order.items.find(item =>
          (item.merchId === returnItem.merchId) || (item.eventId === returnItem.eventId)
        );
        if (orderItem) {
          refundAmount += orderItem.unitPrice * returnItem.quantity;
        }
      }

      const returnRequest = await storage.createReturnRequest({
        orderId,
        userId: req.user!.id,
        items,
        status: "REQUESTED",
        refundAmount,
        refundMethod: refundMethod || "ORIGINAL_PAYMENT",
        reason,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.json(returnRequest);
    } catch (error) {
      console.error("Create return request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Promo Code management routes (admin)
  app.get("/api/admin/promo-codes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // TODO: Add admin role check
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Get promo codes error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/promo-codes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // TODO: Add admin role check
      const promoCode = await storage.createPromoCode({
        ...req.body,
        createdBy: req.user!.id
      });
      res.json(promoCode);
    } catch (error) {
      console.error("Create promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/promo-codes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // TODO: Add admin role check
      const { id } = req.params;
      const updated = await storage.updatePromoCode(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // TODO: Add admin role check
      const { id } = req.params;
      const deleted = await storage.deletePromoCode(id);
      if (!deleted) {
        return res.status(404).json({ message: "Promo code not found" });
      }
      res.json({ message: "Promo code deleted" });
    } catch (error) {
      console.error("Delete promo code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics route
  app.post("/api/analytics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const analyticsData = {
        ...req.body,
        userId: req.user!.id,
      };

      await storage.logAnalytics(analyticsData);
      res.json({ message: "Analytics logged" });
    } catch (error) {
      console.error("Log analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
