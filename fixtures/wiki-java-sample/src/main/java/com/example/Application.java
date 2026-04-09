package com.example;

import com.example.controller.CustomerController;
import com.example.controller.OrderController;
import com.example.service.CustomerService;
import com.example.service.OrderService;

/**
 * Application entry point.
 *
 * In a real Spring Boot application this would be annotated with:
 *   @SpringBootApplication
 * and the main method would call SpringApplication.run(Application.class, args).
 *
 * For static-analysis fixture purposes the wiring is shown explicitly.
 */
public class Application {

    private final CustomerController customerController;
    private final OrderController orderController;

    public Application(CustomerController customerController, OrderController orderController) {
        this.customerController = customerController;
        this.orderController = orderController;
    }

    /**
     * Prints a startup banner listing the registered controllers.
     */
    public void printBanner() {
        System.out.println("=== wiki-java-sample ===");
        System.out.println("Controllers registered:");
        System.out.println("  - CustomerController (/customers)");
        System.out.println("  - OrderController    (/orders)");
    }

    /**
     * Application entry point.
     *
     * @param args command-line arguments (unused)
     */
    public static void main(String[] args) {
        // Fixture wiring — no IoC container needed for static analysis
        System.out.println("wiki-java-sample: static analysis fixture, not a runnable app.");
    }
}
