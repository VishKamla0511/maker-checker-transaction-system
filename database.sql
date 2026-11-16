-- Create Database
CREATE DATABASE IF NOT EXISTS maker_checker_transaction_system;

-- create tables
CREATE TABLE `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL,
  `total_count` int DEFAULT '0',
  `valid_count` int DEFAULT '0',
  `invalid_count` int DEFAULT '0',
  `status` enum('PENDING','AUTHORIZED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `errors` json DEFAULT NULL,
  PRIMARY KEY (`id`)
)


CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('PENDING','AUTHORIZED') DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`)
) 


CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `performed_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
)