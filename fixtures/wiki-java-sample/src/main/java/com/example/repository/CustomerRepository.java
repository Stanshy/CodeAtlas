package com.example.repository;

import com.example.model.Customer;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Customer persistence operations.
 * In a real Spring Boot application this would extend JpaRepository.
 */
public interface CustomerRepository {

    /**
     * Persists a new customer or updates an existing one.
     *
     * @param customer the customer entity to save
     * @return the saved customer (with generated ID if new)
     */
    Customer save(Customer customer);

    /**
     * Retrieves a customer by its primary key.
     *
     * @param id the customer ID
     * @return an Optional containing the customer, or empty if not found
     */
    Optional<Customer> findById(Long id);

    /**
     * Retrieves a customer by email address.
     *
     * @param email the email to search by
     * @return an Optional containing the customer, or empty if not found
     */
    Optional<Customer> findByEmail(String email);

    /**
     * Returns all active customers.
     *
     * @return list of active customers
     */
    List<Customer> findAllActive();

    /**
     * Returns every customer regardless of active status.
     *
     * @return list of all customers
     */
    List<Customer> findAll();

    /**
     * Removes a customer by ID.
     *
     * @param id the customer ID to delete
     */
    void deleteById(Long id);

    /**
     * Returns the total number of customers.
     *
     * @return count of customer records
     */
    long count();
}
