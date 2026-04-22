import { Colors } from '@/constants/theme';
import { getRemainingMemesCount } from '@/src/services/memeService';
import { useAuth } from '@/src/context/AuthContext';
import { Crown, Flame } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useBilling } from '@/src/context/BillingContext';

export function UsageIndicator() {
  const { user } = useAuth();
  const { isPremium } = useBilling();
  const [data, setData] = useState<{ remaining: number, total: number, isPremium: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!user?.id) return;
    const usage = await getRemainingMemesCount(user.id);
    setData(usage);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, isPremium]);

  if (loading) return null;

  if (data?.isPremium || isPremium) {
    return (
      <View style={[styles.container, styles.premiumContainer]}>
        <Crown color={Colors.dark.accent} size={16} fill={Colors.dark.accent} />
        <Text style={styles.premiumText}>PREMIUM ACTIVE</Text>
      </View>
    );
  }

  const isLow = (data?.remaining || 0) <= 1;

  return (
    <View style={styles.container}>
      <Flame color={isLow ? Colors.dark.danger : Colors.dark.accent} size={16} />
      <Text style={[styles.text, isLow && styles.lowText]}>
        {data?.remaining} OF {data?.total} FREE MEMES LEFT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  premiumContainer: {
    backgroundColor: 'rgba(0,255,102,0.1)',
    borderColor: 'rgba(0,255,102,0.2)',
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lowText: {
    color: Colors.dark.danger,
  },
  premiumText: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
