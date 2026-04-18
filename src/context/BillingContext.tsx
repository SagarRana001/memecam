import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

import { Platform, Alert } from 'react-native';
import * as IAP from 'react-native-iap';

// Product IDs from various stores
const itemSkus = Platform.select({
  ios: ['memecam_premium_monthly'],
  android: ['memecam_premium_monthly'],
}) || [];


interface UserSubscription {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'unpaid';
  current_period_end: string | null;
  product_id: string;
}

interface BillingContextType {
  isPremium: boolean;
  subscription: UserSubscription | null;
  products: IAP.Product[];
  loading: boolean;
  requestPurchase: (sku: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  simulateSuccessPurchase: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType>({
  isPremium: false,
  subscription: null,
  products: [],
  loading: true,
  requestPurchase: async () => {},
  restorePurchases: async () => {},
  refreshSubscriptionStatus: async () => {},
  simulateSuccessPurchase: async () => {},
});

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  const [products, setProducts] = useState<IAP.Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Initialize connection and fetch products
  useEffect(() => {
    const initIAP = async () => {
      try {
        await IAP.initConnection();
        console.log('IAP: Connection Initialized');
        
        if (Platform.OS === 'android') {
          await IAP.flushFailedPurchasesCachedAsPendingAndroid();
        }

        const getProducts = await IAP.getProducts({ skus: itemSkus });
        console.log('IAP: Products fetched:', getProducts);
        setProducts(getProducts);

        // Check for existing purchases (Restore)
        await checkCurrentPurchases();
      } catch (err) {
        console.warn('IAP: Initialization Error', err);
      } finally {
        setLoading(false);
      }
    };

    initIAP();

    return () => {
      IAP.endConnection();
    };
  }, []);

  // 2. Setup purchase listeners
  useEffect(() => {
    const purchaseUpdateSubscription = IAP.purchaseUpdatedListener(async (purchase) => {
      console.log('IAP: Purchase Updated', purchase);
      const receipt = purchase.transactionReceipt;
      
      if (receipt) {
        try {
          if (Platform.OS === 'android') {
            await IAP.acknowledgePurchaseAndroid({ token: purchase.purchaseToken! });
          }
          
          await IAP.finishTransaction({ purchase, isConsumable: false });
          
          // --- SYNC TO BACKEND ---
          await syncPurchaseWithBackend(purchase);

          Alert.alert('Success', 'Premium subscription activated!');

        } catch (ackErr) {
          console.warn('IAP: Finalization Error', ackErr);
        }
      }
    });

    const purchaseErrorSubscription = IAP.purchaseErrorListener((error) => {
      console.warn('IAP: Purchase Error', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Error', error.message);
      }
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  }, []);

  const checkCurrentPurchases = async () => {
    try {
      const purchases = await IAP.getAvailablePurchases();
      console.log('IAP: Available Purchases', purchases);
      
      const hasPremium = purchases.some(
        (p) => itemSkus.includes(p.productId)
      );
      
      
      setIsPremium(hasPremium);

      // --- SYNC TO SUPABASE ---
      if (hasPremium && user?.id) {
        await supabase
          .from('profiles')
          .update({ is_subscriber: true })
          .eq('id', user.id);
        console.log('Premium status restored to Supabase! 🚀');
      }

    } catch (err) {
      console.warn('IAP: Restore Error', err);
    }
  };

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      // 1. Check user_subscriptions for active store cycles
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('status, current_period_end, product_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      // 2. Check profiles for manual "is_subscriber" flag
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_subscriber')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const hasActiveStoreSub = subData && ['active', 'trialing'].includes(subData.status);
      const hasManualSub = profileData?.is_subscriber === true;

      if (subData) setSubscription(subData as UserSubscription);
      setIsPremium(!!(hasActiveStoreSub || hasManualSub));

    } catch (err) {
      console.error('Error refreshing subscription:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const syncPurchaseWithBackend = async (purchase: IAP.Purchase) => {
    if (!user?.id) return;

    try {
      // 1. Log the transaction attempt immediately
      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          transaction_id: purchase.transactionId,
          product_id: purchase.productId,
          purchase_token: purchase.purchaseToken,
          status: 'succeeded', // Ideally 'pending' until verified
          amount_micros: 799000000, // Hardcoded for now, should come from product data
          currency: 'INR'
        });

      if (historyError) console.warn('Payment recording error:', historyError);

      // 2. Update the subscription state
      // NOTE: In a production app, this should be done by an Edge Function 
      // responding to the purchase verification or a webhook.
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          product_id: purchase.productId,
          platform: Platform.OS,
          current_period_end: expiryDate.toISOString(),
          external_subscription_id: purchase.transactionId,
        }, { onConflict: 'user_id' });

      if (subError) throw subError;
      
      await refreshSubscriptionStatus();
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  const simulateSuccessPurchase = async () => {
    console.log('--- SIMULATING SUCCESSFUL PURCHASE ---');
    const mockPurchase: IAP.Purchase = {
      transactionId: `mock_${Date.now()}`,
      productId: 'memecam_premium_monthly',
      purchaseToken: `mock_token_${Math.random()}`,
      transactionReceipt: 'mock_receipt',
      purchaseStateAndroid: 1,
      // @ts-ignore - Minimal fields needed for our sync logic
      transactionDate: Date.now(),
    };
    
    setLoading(true);
    await syncPurchaseWithBackend(mockPurchase);
    setLoading(false);
  };

  const requestPurchase = async (sku: string) => {
    try {
      setLoading(true);
      await IAP.requestPurchase({ sku });
    } catch (err: any) {
      console.warn('IAP: Request Purchase Error', err.code, err.message);
    } finally {
      setLoading(false);
    }
  };

  const restorePurchases = async () => {
    try {
      setLoading(true);
      await checkCurrentPurchases();
      await refreshSubscriptionStatus();
      
      if (isPremium) {
        Alert.alert('Restore', 'Your premium subscription has been restored.');
      } else {
        Alert.alert('Restore', 'No active subscriptions found.');
      }
    } catch (err) {
      Alert.alert('Restore', 'Failed to restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BillingContext.Provider value={{ 
      isPremium, 
      subscription,
      products, 
      loading, 
      requestPurchase, 
      restorePurchases,
      refreshSubscriptionStatus,
      simulateSuccessPurchase
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => useContext(BillingContext);
