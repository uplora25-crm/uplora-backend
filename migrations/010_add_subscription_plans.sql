-- Subscription Plans Table
-- This table stores subscription plans and pricing information
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    billing_period VARCHAR(50) DEFAULT 'monthly', -- 'monthly', 'yearly', 'one-time'
    features JSONB, -- Array of features as JSON
    is_active BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false, -- Custom plans created by admin
    display_order INTEGER DEFAULT 0, -- For ordering plans
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON subscription_plans(display_order);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_custom ON subscription_plans(is_custom);

