package com.example.controller;

import com.example.model.Order;
import com.example.model.Order.OrderItem;
import com.example.model.Order.Status;
import com.example.service.OrderService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * REST controller for order endpoints.
 *
 * In a real Spring Boot application this class would carry:
 *   @RestController
 *   @RequestMapping("/orders")
 */
public class OrderController {

    private final OrderService orderService;

    /** @Autowired */
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /**
     * GET /orders
     *
     * Returns all orders in the system.
     *
     * @return response map with 'data' list and 'total' count
     */
    public Map<String, Object> listOrders() {
        List<Order> orders = orderService.getOrders();
        return Map.of("data", orders, "total", orders.size());
    }

    /**
     * GET /orders/{id}
     *
     * Returns a single order by ID, including its grand total.
     *
     * @param id the order primary key
     * @return response map with order data and computed totals, or error
     */
    public Map<String, Object> getOrder(Long id) {
        Order order = orderService.findById(id);
        if (order == null) {
            return Map.of("error", "Order " + id + " not found", "status", 404);
        }

        BigDecimal subtotal = orderService.calculateTotal(order);
        BigDecimal grandTotal = orderService.calculateGrandTotal(order);

        return Map.of(
            "data", order,
            "subtotal", subtotal,
            "grandTotal", grandTotal,
            "status", 200
        );
    }

    /**
     * POST /orders
     *
     * Creates a new order for a customer.
     *
     * @param customerId the placing customer's ID
     * @param items      list of order items
     * @return response map with created order or validation error
     */
    public Map<String, Object> createOrder(Long customerId, List<OrderItem> items) {
        if (customerId == null) {
            return Map.of("error", "'customerId' is required", "status", 400);
        }

        try {
            Order created = orderService.createOrder(customerId, items);
            return Map.of("data", created, "status", 201);
        } catch (IllegalArgumentException ex) {
            return Map.of("error", ex.getMessage(), "status", 422);
        }
    }

    /**
     * PATCH /orders/{id}/status
     *
     * Transitions an order to a new status.
     *
     * @param id     the order ID
     * @param status the desired new Status enum value
     * @return response map with updated order or error
     */
    public Map<String, Object> updateOrderStatus(Long id, Status status) {
        Order updated = orderService.updateStatus(id, status);
        if (updated == null) {
            return Map.of("error", "Order " + id + " not found", "status", 404);
        }
        return Map.of("data", updated, "status", 200);
    }
}
