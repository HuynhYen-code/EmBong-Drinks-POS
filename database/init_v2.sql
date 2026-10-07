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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE menu_item_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    size_name VARCHAR(50) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0,
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
    current_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0
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
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_cogs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    size_name VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    unit_cogs DECIMAL(12, 2) NOT NULL,
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

-- Bơm data mẫu để dev giao diện
INSERT INTO menu_items (id, category, name, image_url) VALUES 
(1, 'Món Bán Chạy', 'Rau má latte', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=400'),
(2, 'Món Bán Chạy', 'Olong lài sữa', 'https://images.unsplash.com/photo-1517705574632-0a373fc34c67?auto=format&fit=crop&q=80&w=400'),
(3, 'Món Bán Chạy', 'Trà dâu tây tươi', 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=400'),
(4, 'Rau Má', 'Rau Má Dừa', 'https://images.unsplash.com/photo-1626804475297-41609ea005eb?auto=format&fit=crop&q=80&w=400'),
(5, 'Trái Cây Tô', 'Trái Cây Tô Đặc Biệt', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400');

INSERT INTO menu_item_sizes (menu_item_id, size_name, price) VALUES 
(1, 'M', 20000), (1, 'L', 25000),
(2, 'M', 22000), (2, 'L', 27000),
(3, 'M', 22000), (3, 'L', 28000),
(4, '700ml', 16000), (4, '1000ml', 20000),
(5, 'Tiêu chuẩn', 35000);

INSERT INTO toppings (id, name, price) VALUES 
(1, 'Trân châu đen', 3000),
(2, 'Khúc bạch', 5000),
(3, 'Sương sáo', 4000);
