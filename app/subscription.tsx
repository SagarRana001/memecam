import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { useRouter } from 'expo-router';
import { Check, Crown, LogOut, Menu, Trash2, X } from 'lucide-react-native';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAlert } from '@/src/context/AlertContext';
import { useAuth } from '@/src/context/AuthContext';
import { useBilling } from '@/src/context/BillingContext';
import { deleteUserAccount } from '@/src/services/authService';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPremium, subscription, products, loading, requestPurchase, restorePurchases } = useBilling();
  const { showAlert } = useAlert();

  const premiumProduct = products.find(p => p.id === 'memecam_premium_monthly');

  const priceLabel = '7-DAY FREE TRIAL • THEN ₹4INR/mo';

  const handleAccountMenu = () => {
    showAlert({
      title: 'Account Settings',
      message: 'What would you like to do in the fire lab?',
      type: 'info',
      buttons: [
        { text: 'Sign Out', style: 'default', onPress: signOut },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Re-confirm for safety
            setTimeout(() => {
              showAlert({
                title: 'Are you sure?',
                message: 'This will extinguish all your fire forever. This action cannot be undone.',
                type: 'error',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete Forever', style: 'destructive', onPress: signOut }
                ]
              });
            }, 500);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    });
  };

  const handleLogout = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of the fire lab?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    });
  };

  const handleDelete = () => {
    showAlert({
      title: 'Delete Account',
      message: 'This is permanent and will extinguish all your fire forever. Are you absolutely sure?',
      type: 'error',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently', style: 'destructive', onPress: async () => {
            try {
              if (user?.id) {
                await deleteUserAccount(user.id);

                showAlert({
                  title: 'Account Deleted',
                  message: 'Your fire has been extinguished. Redirecting...',
                  type: 'success',
                });

                // Allow user to see the success message briefly
                setTimeout(async () => {
                  await signOut();
                  router.replace('/');
                }, 2000);
              }
            } catch (err: any) {
              showAlert({
                title: 'Deletion Failed',
                message: err.message || 'The lab failed to purge your data. 🔥',
                type: 'error'
              });
            }
          }
        },
      ]
    });
  };

  const handleCancelSubscription = () => {
    const url = Platform.select({
      android: 'https://play.google.com/store/account/subscriptions?package=com.aadmi.memecam',
      ios: 'https://apps.apple.com/account/subscriptions',
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <X color="#FFF" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>PREMIUM</Text>
        <Pressable onPress={handleAccountMenu}>
          <Menu color="#FFF" size={28} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={ZoomIn.duration(600)} style={styles.promoContainer}>
          <View style={styles.heroImagePlaceholder}>
            <Crown color={Colors.dark.accent} size={80} fill={Colors.dark.accent} />
          </View>
          <Text style={styles.promoTitle}>
            {isPremium ? 'YOU ARE PREMIUM' : 'MAKE ANY MOMENT FIRE'}
          </Text>
        </Animated.View>

        <View style={styles.features}>
          <FeatureItem text="Unlimited Generations" />
          <FeatureItem text="No Watermarks" />
          <FeatureItem text="Priority AI Processing" />
          <FeatureItem text="HD Meme Export" />
        </View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.actions}>
          {!isPremium ? (
            <AnimatedButton
              variant="primary"
              title={loading ? "PROCESSING..." : priceLabel}
              onPress={() => requestPurchase('memecam_premium_monthly')}
              style={styles.subscribeButton}
              textStyle={styles.subscribeButtonText}
              disabled={loading}
            />
          ) : (
            <View style={styles.premiumContainer}>
              <View style={styles.premiumBadge}>
                <Check color="#000" size={20} />
                <Text style={styles.premiumBadgeText}>ACTIVE SUBSCRIPTION</Text>
              </View>
              {subscription?.current_period_end && (
                <Text style={styles.renewalText}>
                  Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </Text>
              )}
              <Pressable onPress={handleCancelSubscription} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>CANCEL SUBSCRIPTION</Text>
              </Pressable>
            </View>
          )}

          {/* Restore Purchases button removed per request */}

          <View style={styles.dangerZone}>
            <Pressable style={styles.iconAction} onPress={handleLogout}>
              <LogOut color={Colors.dark.muted} size={20} />
              <Text style={styles.iconActionText}>Logout</Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable style={styles.iconAction} onPress={handleDelete}>
              <Trash2 color={Colors.dark.danger} size={20} />
              <Text style={[styles.iconActionText, { color: Colors.dark.danger }]}>Delete Account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Check color={Colors.dark.accent} size={20} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    ...Platform.select({
      web: {
        height: '100dvh',
      },
    }),
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
    gap: 40,
  },
  promoContainer: {
    alignItems: 'center',
    gap: 20,
  },
  heroImagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(0,255,102,0.1)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,102,0.2)',
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 12,
  },
  featureText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    gap: 32,
    paddingBottom: 40,
  },
  subscribeButton: {
    width: '100%',
    height: 64,
  },
  subscribeButtonText: {
    fontSize: 13,
    letterSpacing: 0,
  },
  secondaryActions: {
    alignItems: 'center',
    marginTop: -10,
  },
  restoreText: {
    color: Colors.dark.muted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  premiumBadge: {
    backgroundColor: Colors.dark.accent,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumBadgeText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  premiumContainer: {
    gap: 12,
    alignItems: 'center',
  },
  renewalText: {
    color: Colors.dark.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: Colors.dark.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dangerZone: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionText: {
    color: Colors.dark.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
