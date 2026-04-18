import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#FFF" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>LEGAL</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(200).duration(800)}>
          <Text style={styles.title}>Terms and Conditions</Text>
          <Text style={styles.lastUpdated}>Last Updated: 17.04.26</Text>
          
          <Text style={styles.intro}>
            Welcome to Memecam. By using our app, you agree to these Terms and Conditions.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Use of the App</Text>
            <Text style={styles.sectionText}>
              You agree to use the app only for lawful purposes. You must not misuse, hack, or attempt to disrupt the app or its services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. User Accounts</Text>
            <Text style={styles.sectionText}>
              If your app requires login, you are responsible for maintaining the confidentiality of your account information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Content</Text>
            <Text style={styles.sectionText}>
              All content provided in the app is for general use. We reserve the right to modify or remove content at any time.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Subscription & Payments</Text>
            <Text style={styles.sectionText}>
              If your app includes paid features or subscriptions:
            </Text>
            <Text style={styles.bulletItem}>• Payments are processed through third-party platforms (e.g., Google Play).</Text>
            <Text style={styles.bulletItem}>• Subscriptions renew automatically unless cancelled.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Termination</Text>
            <Text style={styles.sectionText}>
              We may suspend or terminate access to the app if you violate these terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              We are not responsible for any direct or indirect damages arising from the use of the app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We may update these terms at any time. Continued use of the app means you accept the updated terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Contact</Text>
            <Text style={styles.sectionText}>
              For any questions, contact us at: cubiant@gmail.com
            </Text>
          </View>

          <Text style={[styles.sectionText, { marginTop: 20 }]}>
            By using the app, you agree to these Terms.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: 17.04.26</Text>
          
          <Text style={styles.intro}>
            This Privacy Policy explains how Memecam collects and uses information.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.sectionText}>We may collect:</Text>
            <Text style={styles.bulletItem}>• Basic user information (e.g., name, email)</Text>
            <Text style={styles.bulletItem}>• Usage data (app interactions, device info)</Text>
            <Text style={styles.bulletItem}>• Images or media (if your app processes photos)</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Information</Text>
            <Text style={styles.sectionText}>We use collected data to:</Text>
            <Text style={styles.bulletItem}>• Provide and improve the app</Text>
            <Text style={styles.bulletItem}>• Personalize user experience</Text>
            <Text style={styles.bulletItem}>• Process subscriptions or purchases</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Third-Party Services</Text>
            <Text style={styles.sectionText}>We may use third-party services such as:</Text>
            <Text style={styles.bulletItem}>• Google Play Services</Text>
            <Text style={styles.bulletItem}>• Firebase (analytics, authentication)</Text>
            <Text style={styles.sectionText}>These services may collect data according to their own privacy policies.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.sectionText}>
              We take reasonable steps to protect your data but cannot guarantee complete security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. User Rights</Text>
            <Text style={styles.sectionText}>You may:</Text>
            <Text style={styles.bulletItem}>• Request deletion of your data</Text>
            <Text style={styles.bulletItem}>• Stop using the app at any time</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Children’s Privacy</Text>
            <Text style={styles.sectionText}>
              The app is not intended for users under 13 (or relevant age in your country).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Changes to Policy</Text>
            <Text style={styles.sectionText}>
              We may update this policy periodically.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions, contact: cubiant@gmail.com
            </Text>
          </View>

          <Text style={[styles.sectionText, { marginTop: 20, marginBottom: 40 }]}>
            By using the app, you agree to this Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  lastUpdated: {
    fontSize: 14,
    color: Colors.dark.accent,
    fontWeight: '700',
    marginBottom: 24,
  },
  intro: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark.accent,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.dark.muted,
    lineHeight: 22,
    fontWeight: '500',
  },
  bulletItem: {
    fontSize: 15,
    color: Colors.dark.muted,
    lineHeight: 22,
    fontWeight: '500',
    marginLeft: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 48,
  },
});
