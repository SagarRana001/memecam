import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

import { Platform } from 'react-native';
import {
  acknowledgePurchaseAndroid,
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  fetchProducts,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase as requestPurchaseIAP,
  type Product,
  type Purchase
} from 'react-native-iap';

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
  products: Product[];
  loading: boolean;
  requestPurchase: (sku: string, offerToken?: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType>({
  isPremium: false,
  subscription: null,
  products: [],
  loading: true,
  requestPurchase: async () => { },
  restorePurchases: async () => { },
  refreshSubscriptionStatus: async () => { },
  // simulateSuccessPurchase: async () => {},
});

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Initialize connection and fetch products
  useEffect(() => {
    const initIAP = async () => {
      try {
        await initConnection();
        console.log("initConnection")
        console.log('IAP: Connection Initialized');

        const getSubs = await fetchProducts({ skus: itemSkus, type: 'subs' });
        console.log('IAP: Subscriptions fetched:', getSubs);
        setProducts(getSubs as Product[] || []);

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
      endConnection();
    };
  }, []);

  // 2. Setup purchase listeners
  useEffect(() => {
    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
      console.log('IAP: Purchase Updated', purchase);
      
      // In v15, we should check for 'purchased' state
      if (purchase.purchaseState === 'purchased' || (purchase.transactionReceipt && Platform.OS === 'ios')) {
        try {
          if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
            await acknowledgePurchaseAndroid(purchase.purchaseToken!);
            console.log('IAP: Android Purchase Acknowledged');
          }

          await finishTransaction({ purchase, isConsumable: false });
          console.log('IAP: Transaction Finished');

          // --- SYNC TO BACKEND ---
          await syncPurchaseWithBackend(purchase);

          showAlert({
            title: 'Success!',
            message: 'Premium subscription activated! You are now fire-ready. 🔥',
            type: 'success'
          });
        } catch (ackErr) {
          console.warn('IAP: Finalization Error', ackErr);
        }
      } else if (purchase.purchaseState === 'pending') {
        console.log('IAP: Purchase is pending...');
      }
    });

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      console.warn('IAP: Purchase Error', error);
      if (error.code !== 'E_USER_CANCELLED' && error.code !== 'USER_CANCELED') {
        showAlert({
          title: 'Purchase Error',
          message: error.message || 'Something went wrong with the transaction.',
          type: 'error'
        });
      }
    });

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
    };
  }, []);

  const checkCurrentPurchases = async () => {
    try {
      const purchases = await getAvailablePurchases();
      console.log('IAP: Available Purchases', purchases);

      // Handle unacknowledged purchases on Android
      for (const p of purchases) {
        if (Platform.OS === 'android' && !p.isAcknowledgedAndroid) {
          try {
            await acknowledgePurchaseAndroid(p.purchaseToken!);
            console.log('IAP: Acknowledged missed purchase:', p.productId);
          } catch (ackErr) {
            console.warn('IAP: Failed to acknowledge missed purchase:', ackErr);
          }
        }
        
        // Always try to finish available purchases to keep the queue clean
        try {
          await finishTransaction({ purchase: p, isConsumable: false });
        } catch (fErr) {
          // Ignore if already finished
        }
      }

      const hasPremium = purchases.some(
        (p) => itemSkus.includes(p.productId)
      );

      setIsPremium(hasPremium);

      if (!user?.id) return;

      // --- SYNC TO SUPABASE ---
      if (hasPremium) {
        // 1. Update Profile
        await supabase
          .from('profiles')
          .update({ is_subscriber: true })
          .eq('id', user.id);

        // 2. Ideally Sync user_subscriptions as well if missing
        const activePurchase = purchases.find(p => itemSkus.includes(p.productId));
        if (activePurchase) {
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1); // Approximate for restore

          await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: user.id,
              status: 'active',
              product_id: activePurchase.productId,
              platform: Platform.OS,
              current_period_end: expiryDate.toISOString(),
              external_subscription_id: activePurchase.transactionId || activePurchase.purchaseToken,
            }, { onConflict: 'user_id' });
        }

        console.log('Premium status restored to Supabase! 🚀');
      }
    } catch (err) {
      console.warn('IAP: Restore/Check Error', err);
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

  const syncPurchaseWithBackend = async (purchase: Purchase) => {
    if (!user?.id) return;

    try {
      // 1. Log the transaction attempt immediately
      const product = products.find(p => p.id === purchase.productId);
      const amountMicros = product ? parseInt(product.priceAmountMicros) : 1000000;
      const currency = product ? product.currency : 'INR';

      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          transaction_id: purchase.transactionId,
          product_id: purchase.productId,
          purchase_token: purchase.purchaseToken,
          status: 'succeeded',
          amount_micros: amountMicros,
          currency: currency
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


  // const simulateSuccessPurchase = async () => {
  //   console.log('--- SIMULATING SUCCESSFUL PURCHASE ---');
  //   const mockPurchase: IAP.Purchase = {
  //     transactionId: `mock_${Date.now()}`,
  //     productId: 'memecam_premium_monthly',
  //     purchaseToken: `mock_token_${Math.random()}`,
  //     transactionReceipt: 'mock_receipt',
  //     purchaseStateAndroid: 1,
  //     // @ts-ignore - Minimal fields needed for our sync logic
  //     transactionDate: Date.now(),
  //   };
  //   
  //   setLoading(true);
  //   await syncPurchaseWithBackend(mockPurchase);
  //   setLoading(false);
  // };

  const requestPurchase = async (sku: string) => {
    console.log('IAP: Requesting purchase for:', sku);
    try {
      setLoading(true);

      if (products.length === 0) {
        showAlert({
          title: 'Store Syncing',
          message: 'Google Play is still processing your new subscription. Please try again in 30 minutes. 🔥',
          type: 'info'
        });
        return;
      }

      const product = products.find(p => p.id === sku);
      if (!product) {
        showAlert({
          title: 'Product Not Found',
          message: `The fire lab couldn't find product "${sku}". Please verify it matches the Play Console.`,
          type: 'error'
        });
        return;
      }

      if (Platform.OS === 'android') {
        const offerToken = 
          (product as any)?.subscriptionOffers?.[0]?.offerTokenAndroid || 
          (product as any)?.subscriptionOfferDetailsAndroid?.[0]?.offerToken ||
          (product as any)?.subscriptionOfferDetails?.[0]?.offerToken;

        if (!offerToken) {
          showAlert({
            title: 'Base Plan Missing',
            message: 'No active base plan found. Please ensure you have "Activated" the base plan in Play Console.',
            type: 'warning'
          });
          return;
        }

        console.log('IAP: Starting subscription flow with token:', offerToken);
        await requestPurchaseIAP({
          type: 'subs',
          request: {
            google: {
              skus: [sku],
              subscriptionOffers: [{ sku, offerToken }]
            }
          }
        });
      } else {
        await requestPurchaseIAP({
          type: 'subs',
          request: {
            apple: {
              sku: sku
            }
          }
        });
      }
    } catch (err: any) {
      console.warn('IAP: Request Subscription Error', err.code, err.message);
      showAlert({
        title: 'Purchase Failed',
        message: err.message || 'The transaction could not be initialized.',
        type: 'error'
      });
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
        showAlert({
          title: 'Purchases Restored',
          message: 'Welcome back! Your premium subscription has been successfully restored. 🚀',
          type: 'success'
        });
      } else {
        showAlert({
          title: 'No Subscription',
          message: 'No active premium subscriptions were found for this account.',
          type: 'info'
        });
      }
    } catch (err) {
      showAlert({
        title: 'Restore Failed',
        message: 'The fire lab failed to recover your purchase history.',
        type: 'error'
      });
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
      // simulateSuccessPurchase
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => useContext(BillingContext);
