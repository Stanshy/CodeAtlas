package com.example.service;

import com.example.model.Customer;
import com.example.repository.CustomerRepository;

import java.util.List;
import java.util.Optional;

/**
 * Service layer for customer business logic.
 *
 * Annotated with @Service in a real Spring Boot context.
 */
public class CustomerService {

    private final CustomerRepository customerRepository;
    private static long idSequence = 1L;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    /**
     * Returns all customers currently registered in the system.
     *
     * @return list of all customers
     */
    public List<Customer> findAll() {
        return customerRepository.findAll();
    }

    /**
     * Looks up a single customer by primary key.
     *
     * @param id the customer ID
     * @return the customer, or null if not found
     */
    public Customer findById(Long id) {
        return customerRepository.findById(id).orElse(null);
    }

    /**
     * Registers a new customer account after validating uniqueness.
     *
     * @param email       the customer's email address
     * @param fullName    the customer's display name
     * @param phoneNumber optional phone number
     * @return the newly created customer
     * @throws IllegalArgumentException if the email is already taken
     */
    public Customer register(String email, String fullName, String phoneNumber) {
        Optional<Customer> existing = customerRepository.findByEmail(email);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Email already registered: " + email);
        }

        Customer customer = new Customer(idSequence++, email, fullName, phoneNumber);
        return customerRepository.save(customer);
    }

    /**
     * Updates a customer's full name.
     *
     * @param id      the customer ID
     * @param newName the replacement name
     * @return the updated customer, or null if not found
     */
    public Customer updateName(Long id, String newName) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) return null;

        customer.setFullName(newName);
        return customerRepository.save(customer);
    }

    /**
     * Soft-deletes a customer by marking them inactive.
     *
     * @param id the customer ID
     * @return true if the customer was found and deactivated
     */
    public boolean deactivate(Long id) {
        Customer customer = customerRepository.findById(id).orElse(null);
        if (customer == null) return false;

        customer.setActive(false);
        customerRepository.save(customer);
        return true;
    }
}
