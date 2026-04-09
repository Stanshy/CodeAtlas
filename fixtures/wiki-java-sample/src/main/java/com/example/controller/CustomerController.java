package com.example.controller;

import com.example.model.Customer;
import com.example.service.CustomerService;

import java.util.List;
import java.util.Map;

/**
 * REST controller for customer endpoints.
 *
 * In a real Spring Boot application this class would carry:
 *   @RestController
 *   @RequestMapping("/customers")
 */
public class CustomerController {

    private final CustomerService customerService;

    /** @Autowired */
    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    /**
     * GET /customers
     *
     * Returns the full list of registered customers.
     *
     * @return response map with 'data' list and 'total' count
     */
    public Map<String, Object> listCustomers() {
        List<Customer> customers = customerService.findAll();
        return Map.of("data", customers, "total", customers.size());
    }

    /**
     * GET /customers/{id}
     *
     * Returns a single customer by ID.
     *
     * @param id the customer primary key
     * @return response map with 'data' customer or 'error' message
     */
    public Map<String, Object> getCustomer(Long id) {
        Customer customer = customerService.findById(id);
        if (customer == null) {
            return Map.of("error", "Customer " + id + " not found", "status", 404);
        }
        return Map.of("data", customer, "status", 200);
    }

    /**
     * POST /customers
     *
     * Registers a new customer account.
     *
     * @param requestBody map containing 'email', 'fullName', and optional 'phoneNumber'
     * @return response map with created customer or validation error
     */
    public Map<String, Object> registerCustomer(Map<String, String> requestBody) {
        String email = requestBody.get("email");
        String fullName = requestBody.get("fullName");
        String phone = requestBody.getOrDefault("phoneNumber", "");

        if (email == null || email.isBlank()) {
            return Map.of("error", "'email' is required", "status", 400);
        }
        if (fullName == null || fullName.isBlank()) {
            return Map.of("error", "'fullName' is required", "status", 400);
        }

        try {
            Customer created = customerService.register(email, fullName, phone);
            return Map.of("data", created, "status", 201);
        } catch (IllegalArgumentException ex) {
            return Map.of("error", ex.getMessage(), "status", 409);
        }
    }

    /**
     * DELETE /customers/{id}
     *
     * Soft-deletes a customer account.
     *
     * @param id the customer ID to deactivate
     * @return response map with success flag or error
     */
    public Map<String, Object> deactivateCustomer(Long id) {
        boolean deactivated = customerService.deactivate(id);
        if (!deactivated) {
            return Map.of("error", "Customer " + id + " not found", "status", 404);
        }
        return Map.of("message", "Customer deactivated", "status", 200);
    }
}
