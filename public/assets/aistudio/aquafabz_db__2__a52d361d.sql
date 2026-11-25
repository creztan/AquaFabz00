-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 24, 2026 at 05:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `aquafabz_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` varchar(64) NOT NULL,
  `timestamp` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `user_name` varchar(150) NOT NULL,
  `user_role` varchar(30) NOT NULL,
  `action` varchar(150) NOT NULL,
  `details` text NOT NULL,
  `category` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_meta`
--

CREATE TABLE `app_meta` (
  `meta_key` varchar(64) NOT NULL,
  `meta_value` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `compliance_logs`
--

CREATE TABLE `compliance_logs` (
  `id` varchar(64) NOT NULL,
  `date` varchar(30) NOT NULL,
  `log_type` varchar(50) NOT NULL,
  `parameter_name` varchar(200) NOT NULL,
  `recorded_value` varchar(200) NOT NULL,
  `inspector_or_staff` varchar(150) NOT NULL,
  `status` varchar(30) NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `containers`
--

CREATE TABLE `containers` (
  `id` varchar(64) NOT NULL,
  `date` varchar(64) NOT NULL,
  `customer_id` varchar(64) DEFAULT NULL,
  `customer_name` varchar(150) NOT NULL,
  `container_type` varchar(60) NOT NULL,
  `action_type` varchar(30) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `deposit_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(30) NOT NULL,
  `notes` text DEFAULT NULL,
  `staff_name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `contact_number` varchar(50) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `customer_type` varchar(50) NOT NULL,
  `primary_address` varchar(255) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `coordinates_json` text NOT NULL,
  `delivery_notes` text DEFAULT NULL,
  `containers_held` int(11) NOT NULL DEFAULT 0,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `total_spent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `registered_date` varchar(30) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `additional_locations_json` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` varchar(64) NOT NULL,
  `order_number` varchar(64) NOT NULL,
  `date` varchar(30) NOT NULL,
  `time` varchar(30) NOT NULL,
  `customer_id` varchar(64) DEFAULT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_phone` varchar(50) NOT NULL,
  `delivery_address` varchar(255) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `coordinates_json` text NOT NULL,
  `delivery_notes` text DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(30) NOT NULL,
  `payment_status` varchar(30) NOT NULL,
  `order_type` varchar(30) NOT NULL,
  `status` varchar(40) NOT NULL,
  `assigned_personnel` varchar(150) DEFAULT NULL,
  `delivery_vehicle` varchar(100) DEFAULT NULL,
  `requested_schedule` varchar(100) NOT NULL,
  `estimated_delivery_time` varchar(50) DEFAULT NULL,
  `delivered_at` varchar(64) DEFAULT NULL,
  `containers_to_return_count` int(11) NOT NULL DEFAULT 0,
  `containers_returned_count` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` varchar(64) NOT NULL,
  `order_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(30) NOT NULL,
  `is_water` tinyint(1) NOT NULL DEFAULT 0,
  `requires_container_swap` tinyint(1) NOT NULL DEFAULT 0,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` varchar(64) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `min_stock` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(30) NOT NULL,
  `is_water` tinyint(1) NOT NULL DEFAULT 0,
  `description` text NOT NULL,
  `requires_container_swap` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` varchar(64) NOT NULL,
  `transaction_number` varchar(64) NOT NULL,
  `date` varchar(30) NOT NULL,
  `time` varchar(30) NOT NULL,
  `customer_id` varchar(64) DEFAULT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_type` varchar(50) DEFAULT NULL,
  `order_type` varchar(30) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `container_deposit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `change_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(30) NOT NULL,
  `payment_status` varchar(30) NOT NULL,
  `staff_name` varchar(150) NOT NULL,
  `is_vending_machine_consolidated` tinyint(1) NOT NULL DEFAULT 0,
  `vending_machine_id` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` varchar(64) NOT NULL,
  `sale_id` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(30) NOT NULL,
  `is_water` tinyint(1) NOT NULL DEFAULT 0,
  `requires_container_swap` tinyint(1) NOT NULL DEFAULT 0,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` varchar(50) NOT NULL,
  `station_name` varchar(150) NOT NULL,
  `tagline` varchar(255) NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `coordinates_json` text NOT NULL,
  `contact_number` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `business_permit_no` varchar(100) NOT NULL,
  `doh_accreditation_no` varchar(100) NOT NULL,
  `currency_symbol` varchar(10) NOT NULL DEFAULT '₱',
  `default_delivery_fee` decimal(10,2) NOT NULL DEFAULT 15.00,
  `default_container_deposit` decimal(10,2) NOT NULL DEFAULT 200.00,
  `tax_rate_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `water_source_description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` varchar(64) NOT NULL,
  `date` varchar(64) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `movement_type` varchar(30) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `previous_stock` int(11) NOT NULL DEFAULT 0,
  `new_stock` int(11) NOT NULL DEFAULT 0,
  `reference_no` varchar(100) DEFAULT NULL,
  `supplier_or_party` varchar(150) DEFAULT NULL,
  `staff_name` varchar(150) NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `customer_id` varchar(64) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `avatar` text DEFAULT NULL,
  `last_login` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vending_machines`
--

CREATE TABLE `vending_machines` (
  `id` varchar(64) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `location_name` varchar(200) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `coordinates_json` text NOT NULL,
  `water_capacity_liters` int(11) NOT NULL DEFAULT 500,
  `current_water_level_liters` int(11) NOT NULL DEFAULT 500,
  `coin_capacity` decimal(10,2) NOT NULL DEFAULT 5000.00,
  `current_coin_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `price_per_liter` decimal(10,2) NOT NULL DEFAULT 2.00,
  `total_lifetime_sales` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'operational',
  `last_serviced` varchar(30) NOT NULL,
  `last_collection_date` varchar(30) NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vending_sales`
--

CREATE TABLE `vending_sales` (
  `id` varchar(64) NOT NULL,
  `machine_id` varchar(64) NOT NULL,
  `machine_name` varchar(150) NOT NULL,
  `date` varchar(30) NOT NULL,
  `coins_collected` decimal(10,2) NOT NULL DEFAULT 0.00,
  `water_dispensed_liters` int(11) NOT NULL DEFAULT 0,
  `meter_reading_start` int(11) DEFAULT NULL,
  `meter_reading_end` int(11) DEFAULT NULL,
  `water_refilled_liters` int(11) DEFAULT NULL,
  `recorded_by` varchar(150) NOT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `app_meta`
--
ALTER TABLE `app_meta`
  ADD PRIMARY KEY (`meta_key`);

--
-- Indexes for table `compliance_logs`
--
ALTER TABLE `compliance_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `containers`
--
ALTER TABLE `containers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order_id` (`order_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_number` (`transaction_number`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale_items_sale_id` (`sale_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `vending_machines`
--
ALTER TABLE `vending_machines`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `vending_sales`
--
ALTER TABLE `vending_sales`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
