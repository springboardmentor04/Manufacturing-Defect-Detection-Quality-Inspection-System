-- SQL DDL for visioninspect_db
-- Note: Database visioninspect_db must exist prior to executing these statements.

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Seed default roles
INSERT INTO roles (role_name) VALUES ('admin'), ('quality_engineer'), ('factory_supervisor')
ON CONFLICT (role_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    uploaded_by INTEGER REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    upload_source VARCHAR(50) DEFAULT 'manual',
    status VARCHAR(50) DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    status VARCHAR(50) DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
