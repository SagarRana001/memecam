import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as IAP from 'react-native-iap';

// Product IDs from various stores
const itemSkus = Platform.select({
  ios: ['memecam_premium_monthly'],
  android: ['memecam_premium_monthly'],
}) || [];

interface BillingContextType {
  isPremium: boolean;
  products: IAP.Product[];
  loading: boolean;
  requestPurchase: (sku: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType>({
  isPremium: false,
  products: [],
  loading: true,
  requestPurchase: async () => {},
  restorePurchases: async () => {},
});

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPremium, setIsPremium] = useState(false);
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
          setIsPremium(true);
          Alert.alert('Success', 'Premium subscription activated!');
        } catch (ackErr) {
          console.warn('IAP: Ack Error', ackErr);
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
    } catch (err) {
      console.warn('IAP: Restore Error', err);
    }
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
      products, 
      loading, 
      requestPurchase, 
      restorePurchases 
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => useContext(BillingContext);
