-- Professional Subscription & Payment Tracking Schema
-- Designed by Senior App Engineer

-- 1. Create Enums for standardized status tracking
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active', 
        'trialing', 
        'past_due', 
        'canceled', 
        'expired', 
        'unpaid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending', 
        'succeeded', 
        'failed', 
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. User Subscriptions Table (Source of Truth for Access)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'unpaid',
    
    -- Product Info
    product_id TEXT NOT NULL, -- e.g., 'monthly-plan'
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'stripe')),
    
    -- Lifecycle Dates
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMP WITH TIME ZONE, -- When the subscription expires
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- External Reference
    external_subscription_id TEXT UNIQUE, -- Google/Apple Subscription ID
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Payment History / Transaction Ledger (Audit Trail)
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    
    -- Transaction Info
    transaction_id TEXT UNIQUE NOT NULL, -- Google Play Order ID or Transaction ID
    product_id TEXT, -- Added missing column
    amount_micros BIGINT NOT NULL, -- Storing in micros (e.g., 799000000 for 799)
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- Verification Metadata
    purchase_token TEXT,
    raw_payload JSONB, -- Store the full response from Google/Apple for debugging
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- IMPORTANT: In production, once you move to Edge Functions, you should 
-- remove the INSERT/UPDATE policies to prevent users from spoofing their own premium status.

-- user_subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions." ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscriptions." ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions." ON public.user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions." ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions." ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscriptions." ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- payment_history policies
DROP POLICY IF EXISTS "Users can view their own payment history." ON public.payment_history;
CREATE POLICY "Users can view their own payment history." ON public.payment_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment history." ON public.payment_history;
CREATE POLICY "Users can insert their own payment history." ON public.payment_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Trigger to automatically sync 'is_subscriber' in profiles (Legacy Support)
CREATE OR REPLACE FUNCTION sync_profile_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET is_subscriber = (NEW.status IN ('active', 'trialing'))
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_change ON public.user_subscriptions;
CREATE TRIGGER on_subscription_change
    AFTER INSERT OR UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION sync_profile_subscription_status();

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.user_subscriptions(status);
