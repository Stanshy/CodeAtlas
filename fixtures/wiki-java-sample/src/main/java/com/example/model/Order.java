package com.example.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a customer order containing one or more line items.
 */
public class Order {

    public enum Status { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    private Long id;
    private Long customerId;
    private List<OrderItem> items;
    private Status status;
    private BigDecimal totalAmount;
    private LocalDateTime placedAt;
    private LocalDateTime updatedAt;

    public Order() {
        this.items = new ArrayList<>();
        this.status = Status.PENDING;
        this.totalAmount = BigDecimal.ZERO;
        this.placedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Order(Long id, Long customerId) {
        this();
        this.id = id;
        this.customerId = customerId;
    }

    public void addItem(OrderItem item) {
        this.items.add(item);
        recalculateTotal();
        this.updatedAt = LocalDateTime.now();
    }

    private void recalculateTotal() {
        this.totalAmount = items.stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public List<OrderItem> getItems() { return items; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public LocalDateTime getPlacedAt() { return placedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @Override
    public String toString() {
        return "Order{id=" + id + ", customerId=" + customerId
            + ", status=" + status + ", total=" + totalAmount + "}";
    }

    /**
     * Embedded line-item value object.
     */
    public static class OrderItem {
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;

        public OrderItem(String productName, int quantity, BigDecimal unitPrice) {
            this.productName = productName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
        }

        public String getProductName() { return productName; }
        public int getQuantity() { return quantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
    }
}
