import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

import { Platform } from 'react-native';
import {
  acknowledgePurchaseAndroid,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase as requestPurchaseIAP,
  type Product,
  type Purchase,
  PurchaseState
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
        const connected = await initConnection();
        if (!connected) {
          console.log("Billing client not ready. Running in free model.");
          setLoading(false);
          return;
        }

        try {
          const getSubs = await fetchProducts({ skus: itemSkus, type: 'subs' });
          setProducts(getSubs as Product[] || []);
        } catch (prodErr) {
          console.log("Failed to fetch products, running in free model:", prodErr);
        }

        try {
          // Check for existing purchases (Restore)
          await checkCurrentPurchases();
        } catch (purchErr) {
          console.log("Failed to check current purchases:", purchErr);
        }
      } catch (err) {
        console.log("Billing client failed to initialize. Running in free model:", err);
      } finally {
        setLoading(false);
      }
    };

    initIAP();

    return () => {
      endConnection().catch(() => {});
    };
  }, []);

  // 2. Setup purchase listeners
  useEffect(() => {
    const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase) => {
      if (purchase.purchaseState === 'purchased' || purchase.purchaseState === PurchaseState.PurchasedAndroid || (purchase.transactionReceipt && Platform.OS === 'ios')) {
        try {
          // 1. OPTIMISTIC UPDATE
          setIsPremium(true);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          
          setSubscription({
            status: 'active',
            current_period_end: thirtyDaysFromNow.toISOString(),
            product_id: purchase.productId
          });

          // 2. SYNC TO BACKEND
          const success = await syncPurchaseWithBackend(purchase, 'succeeded');

          if (success) {
            if (Platform.OS === 'android' && !purchase.isAcknowledgedAndroid) {
              await acknowledgePurchaseAndroid(purchase.purchaseToken!);
            }

            await finishTransaction({ purchase, isConsumable: false });

            showAlert({
              title: 'Success!',
              message: 'Premium subscription activated! You are now fire-ready. 🔥',
              type: 'success'
            });
          }
        } catch (ackErr) {
          // Transaction finalization failed
        }
      }
    });

    const purchaseErrorSubscription = purchaseErrorListener((error) => {
      if (error.code !== 'E_USER_CANCELLED' && error.code !== 'USER_CANCELED') {
        // Log failure to database
        syncPurchaseWithBackend({
          productId: itemSkus[0], // Default SKU
          transactionDate: String(Date.now()),
        } as any, 'failed', error.message);

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

  const checkCurrentPurchases = async (isSilent = true): Promise<boolean> => {
    try {
      const purchases = await getAvailablePurchases();

      // Handle unacknowledged purchases on Android
      for (const p of purchases) {
        if (Platform.OS === 'android' && !p.isAcknowledgedAndroid) {
          try {
            await acknowledgePurchaseAndroid(p.purchaseToken!);
          } catch (ackErr) {
            // Failed to acknowledge missed purchase
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

      if (!user?.id) return;

      // --- SYNC TO SUPABASE ---
      if (hasPremium) {
        const activePurchase = purchases.find(p => itemSkus.includes(p.productId));
        if (activePurchase) {
          // Sync it securely. It will refresh subscription status internally if successful.
          const syncSuccess = await syncPurchaseWithBackend(activePurchase, 'succeeded', undefined, isSilent);
          return syncSuccess;
        }
      } else {
        // If they have no active premium purchases from the store, but they are logged in,
        // we should ensure they aren't incorrectly marked as active in Supabase if their time passed.
        await refreshSubscriptionStatus();
      }
      return false;
    } catch (err) {
      return false;
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

      let hasActiveStoreSub = false;
      if (subData && ['active', 'trialing'].includes(subData.status)) {
        if (subData.current_period_end) {
          const isExpired = new Date(subData.current_period_end).getTime() < Date.now();
          hasActiveStoreSub = !isExpired;
        } else {
          hasActiveStoreSub = true;
        }
      }
      const hasManualSub = profileData?.is_subscriber === true;

      if (subData) setSubscription(subData as UserSubscription);
      setIsPremium(!!(hasActiveStoreSub || hasManualSub));

    } catch (err) {
      // Error refreshing subscription state
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const syncPurchaseWithBackend = async (purchase: Purchase, status: 'succeeded' | 'failed' = 'succeeded', errorMessage?: string, isSilent = false) => {
    if (!user?.id) return false;

    try {
      const product = products.find(p => p.id === purchase.productId);
      const amountMicros = product ? parseInt(product.priceAmountMicros) : 799000000;
      const currency = product ? product.currency : 'INR';

      // Call the Edge Function for secure verification and sync
      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: {
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
          platform: Platform.OS,
          transactionId: purchase.transactionId,
          amountMicros: amountMicros,
          currency: currency,
          transactionDate: purchase.transactionDate,
          status: status,
          errorMessage: errorMessage
        }
      });

      if (error) {
        throw error;
      }

      if (data && status === 'succeeded') {
        // Refresh the local subscription state
        await refreshSubscriptionStatus();
      }
      return true;
    } catch (err) {
      // Sync error handled via alert in UI flow
      if (!isSilent && status === 'succeeded') {
        showAlert({
          title: 'Sync Failed',
          message: 'This subscription is already linked to another account, or there was a network error.',
          type: 'warning'
        });
      }
      return false;
    }
  };



  const requestPurchase = async (sku: string) => {
    try {
      setLoading(true);

      if (products.length === 0) {
        // Try one more fetch if the connection was slow to initialize
        try {
          const getSubs = await fetchProducts({ skus: itemSkus, type: 'subs' });
          if (getSubs && getSubs.length > 0) {
            setProducts(getSubs as Product[]);
            // Continue with the newly fetched product
          } else {
            showAlert({
              title: 'Store Syncing',
              message: 'Google Play is still processing your new subscription. Please try again in a few moments. 🔥',
              type: 'info'
            });
            return;
          }
        } catch (e) {
          showAlert({
            title: 'Store Connection',
            message: 'Unable to reach Google Play. Please check your internet and try again.',
            type: 'warning'
          });
          return;
        }
      }

      // Re-check products after potential retry
      const currentProducts = products.length > 0 ? products : (await fetchProducts({ skus: itemSkus, type: 'subs' }) as Product[]);
      const product = currentProducts.find(p => p.id === sku);
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
      // Purchase request failed
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
      const wasSuccessful = await checkCurrentPurchases(false);
      await refreshSubscriptionStatus();

      if (isPremium) {
        showAlert({
          title: 'Purchases Restored',
          message: 'Welcome back! Your premium subscription has been successfully restored. 🚀',
          type: 'success'
        });
      } else if (!wasSuccessful) {
        // If it failed to sync (and already showed an alert), or just no subscription found
        // checkCurrentPurchases(false) will have shown an alert if it was a sync error.
        // But if it just returned false because `hasPremium` was false, we show the fallback alert:
        const purchases = await getAvailablePurchases();
        const hasAny = purchases.some((p) => itemSkus.includes(p.productId));
        
        if (!hasAny) {
          showAlert({
            title: 'No Subscription',
            message: 'No active premium subscriptions were found for this account.',
            type: 'info'
          });
        }
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
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => useContext(BillingContext);
