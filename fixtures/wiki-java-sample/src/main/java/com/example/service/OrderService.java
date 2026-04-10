package com.example.service;

import com.example.model.Order;
import com.example.model.Order.OrderItem;
import com.example.model.Order.Status;
import com.example.repository.OrderRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Service layer for order business logic.
 *
 * Annotated with @Service in a real Spring Boot context.
 */
public class OrderService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.08");
    private static long idSequence = 1L;

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Returns all orders in the system.
     *
     * @return list of all orders
     */
    public List<Order> getOrders() {
        return orderRepository.findAll();
    }

    /**
     * Returns all orders for a specific customer.
     *
     * @param customerId the customer's primary key
     * @return list of orders belonging to that customer
     */
    public List<Order> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerId(customerId);
    }

    /**
     * Finds a single order by its primary key.
     *
     * @param id the order ID
     * @return the order, or null if not found
     */
    public Order findById(Long id) {
        return orderRepository.findById(id).orElse(null);
    }

    /**
     * Creates a new order for the given customer and persists it.
     *
     * @param customerId the ID of the placing customer
     * @param items      the line items to include
     * @return the persisted order with generated ID
     */
    public Order createOrder(Long customerId, List<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }

        Order order = new Order(idSequence++, customerId);
        items.forEach(order::addItem);
        return orderRepository.save(order);
    }

    /**
     * Calculates the pre-tax subtotal of an order.
     *
     * @param order the order to calculate
     * @return subtotal as BigDecimal
     */
    public BigDecimal calculateTotal(Order order) {
        return order.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates the tax-inclusive grand total of an order.
     *
     * @param order the order to calculate
     * @return grand total (subtotal + tax) as BigDecimal
     */
    public BigDecimal calculateGrandTotal(Order order) {
        BigDecimal subtotal = calculateTotal(order);
        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        return subtotal.add(tax);
    }

    /**
     * Transitions an order to a new status.
     *
     * @param id     the order ID
     * @param status the desired new status
     * @return the updated order, or null if not found
     */
    public Order updateStatus(Long id, Status status) {
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) return null;

        order.setStatus(status);
        return orderRepository.save(order);
    }
}
