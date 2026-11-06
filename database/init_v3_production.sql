DROP DATABASE IF EXISTS pos_bom_db;
CREATE DATABASE pos_bom_db;
USE pos_bom_db;

CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    purchase_unit VARCHAR(50) NOT NULL,
    base_unit VARCHAR(50) NOT NULL,
    conversion_rate DECIMAL(10, 4) NOT NULL,
    current_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cost_per_base_unit DECIMAL(12, 4) NOT NULL DEFAULT 0,
    stock_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE preps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    yield_quantity DECIMAL(12, 4) NOT NULL,
    base_unit VARCHAR(50) NOT NULL,
    current_cost_per_unit DECIMAL(12, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE prep_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prep_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    FOREIGN KEY (prep_id) REFERENCES preps(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT
);

CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255) NOT NULL DEFAULT 'Khác',
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menu_item_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    size_name VARCHAR(50) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE menu_item_size_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_size_id INT NOT NULL,
    ingredient_type ENUM('material', 'prep') NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    FOREIGN KEY (menu_item_size_id) REFERENCES menu_item_sizes(id) ON DELETE CASCADE
);

CREATE TABLE toppings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE topping_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topping_id INT NOT NULL,
    ingredient_type ENUM('material', 'prep') NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL,
    FOREIGN KEY (topping_id) REFERENCES toppings(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subtotal_amount DECIMAL(12, 2) DEFAULT NULL,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    order_note VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_created_at (created_at)
);

CREATE TABLE order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    size_name VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    unit_cogs DECIMAL(12, 2) NOT NULL,
    note VARCHAR(255) DEFAULT NULL,
    INDEX idx_order_details_order_id (order_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

CREATE TABLE order_detail_toppings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_detail_id INT NOT NULL,
    topping_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    unit_cogs DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (order_detail_id) REFERENCES order_details(id) ON DELETE CASCADE,
    FOREIGN KEY (topping_id) REFERENCES toppings(id) ON DELETE RESTRICT
);

CREATE TABLE daily_cash (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    initial_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_manual_initial TINYINT(1) NOT NULL DEFAULT 0,
    actual_ending_cash DECIMAL(12, 2) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expenses_date (date)
);

CREATE TABLE shop_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Không có bất kỳ dữ liệu mẫu (Mock data) nào ở đây.
-- Database sạch 100% sẵn sàng cho Production!
