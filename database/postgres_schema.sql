-- PostgreSQL Relational Database Schema for VisionInspect AI

CREATE TYPE user_role AS ENUM ('quality_engineer', 'factory_supervisor', 'admin');
CREATE TYPE severity_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE inspection_result AS ENUM ('PASS', 'FAIL');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'quality_engineer',
    assigned_line VARCHAR(100) DEFAULT 'Assembly Line A1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    inspection_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100) NOT NULL,
    factory_line VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    processed_image_url TEXT,
    severity_score NUMERIC(5,2) NOT NULL,
    severity_level severity_level NOT NULL,
    pass_fail inspection_result NOT NULL,
    inspector_id INT REFERENCES users(id) ON DELETE SET NULL,
    inspector_name VARCHAR(255),
    comments TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE defects (
    id SERIAL PRIMARY KEY,
    inspection_id INT REFERENCES inspections(id) ON DELETE CASCADE,
    defect_type VARCHAR(100) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    size_score NUMERIC(5,2) NOT NULL,
    location_score NUMERIC(5,2) NOT NULL,
    bbox_x NUMERIC(5,2) NOT NULL,
    bbox_y NUMERIC(5,2) NOT NULL,
    bbox_width NUMERIC(5,2) NOT NULL,
    bbox_height NUMERIC(5,2) NOT NULL
);

CREATE INDEX idx_inspections_timestamp ON inspections(timestamp DESC);
CREATE INDEX idx_inspections_line ON inspections(factory_line);
