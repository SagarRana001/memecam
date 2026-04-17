import { Colors } from '@/constants/theme';
import { AnimatedButton } from '@/src/components/AnimatedButton';
import { useRouter } from 'expo-router';
import { Check, Crown, LogOut, Menu, Trash2, X } from 'lucide-react-native';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { useBilling } from '@/src/context/BillingContext';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { isPremium, products, loading, requestPurchase, restorePurchases } = useBilling();

  const premiumProduct = products.find(p => p.productId === 'memecam_premium_monthly');
  const priceLabel = premiumProduct ? `SUBSCRIBE FOR ${premiumProduct.localizedPrice}` : 'SUBSCRIBE FOR 799INR/mo';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/');
        }
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Account', 'This is permanent. Are you absolutely sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          // In a real app, delete user data then sign out
          await signOut();
          router.replace('/');
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <X color="#FFF" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>PREMIUM</Text>
        <Pressable onPress={handleLogout}>
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
              disabled={loading}
            />
          ) : (
            <View style={styles.premiumBadge}>
              <Check color="#000" size={20} />
              <Text style={styles.premiumBadgeText}>ACTIVE SUBSCRIPTION</Text>
            </View>
          )}

          <View style={styles.secondaryActions}>
            <Pressable onPress={restorePurchases}>
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </Pressable>
          </View>

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
