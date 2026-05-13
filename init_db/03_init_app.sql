CREATE SCHEMA IF NOT EXISTS app;

CREATE TYPE app.userrole AS ENUM ('GUEST', 'USER', 'ADMIN');

CREATE TABLE IF NOT EXISTS app.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role app.userrole NOT NULL DEFAULT 'GUEST',
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS app.refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app.users(id) ON DELETE CASCADE UNIQUE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);