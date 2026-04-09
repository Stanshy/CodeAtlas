package com.example.repository;

import com.example.model.Order;
import com.example.model.Order.Status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Order persistence operations.
 * In a real Spring Boot application this would extend JpaRepository.
 */
public interface OrderRepository {

    /**
     * Persists a new order or updates an existing one.
     *
     * @param order the order entity to save
     * @return the saved order (with generated ID if new)
     */
    Order save(Order order);

    /**
     * Retrieves an order by its primary key.
     *
     * @param id the order ID
     * @return an Optional containing the order, or empty if not found
     */
    Optional<Order> findById(Long id);

    /**
     * Returns all orders belonging to a specific customer.
     *
     * @param customerId the customer's ID
     * @return list of orders for that customer
     */
    List<Order> findByCustomerId(Long customerId);

    /**
     * Returns all orders that match a given status.
     *
     * @param status the status to filter by
     * @return list of matching orders
     */
    List<Order> findByStatus(Status status);

    /**
     * Returns orders placed within the specified time window.
     *
     * @param from start of the time window (inclusive)
     * @param to   end of the time window (inclusive)
     * @return list of orders within range
     */
    List<Order> findByPlacedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * Returns all orders in the system.
     *
     * @return list of all orders
     */
    List<Order> findAll();

    /**
     * Removes an order by ID.
     *
     * @param id the order ID to delete
     */
    void deleteById(Long id);
}
