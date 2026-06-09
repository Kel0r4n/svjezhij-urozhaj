-- PostgreSQL: начальная схема (ONREZA: nrz db migrate apply)
CREATE TYPE orderstatus AS ENUM ('created', 'confirmed', 'delivered', 'cancelled');

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(128) NOT NULL,
    chart_color VARCHAR(7) DEFAULT '#A8B5A0',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    patronymic VARCHAR(128),
    phone VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    telegram_username VARCHAR(64),
    hashed_password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE delivery_addresses (
    id SERIAL PRIMARY KEY,
    address VARCHAR(512) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE delivery_dates (
    id SERIAL PRIMARY KEY,
    delivery_date DATE NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(64) DEFAULT 'fruits',
    stock INTEGER DEFAULT 0,
    image_url VARCHAR(512),
    image_bg_color VARCHAR(7) DEFAULT '#E6E0D4',
    image_zoom DOUBLE PRECISION DEFAULT 1.0,
    image_pan_x DOUBLE PRECISION DEFAULT 0.0,
    image_pan_y DOUBLE PRECISION DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);
CREATE INDEX ix_products_name ON products (name);
CREATE INDEX ix_products_category ON products (category);

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER DEFAULT 1
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status orderstatus DEFAULT 'created',
    delivery_address_id INTEGER REFERENCES delivery_addresses(id),
    delivery_date_id INTEGER REFERENCES delivery_dates(id),
    address VARCHAR(512) NOT NULL,
    delivery_date DATE NOT NULL,
    total DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) DEFAULT 'fruits',
    price DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL
);
