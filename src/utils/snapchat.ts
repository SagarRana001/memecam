import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Tracks a Snapchat Conversions API Install event.
 * https://developers.snap.com/marketing-api/Conversions-API/Introduction
 */
export const trackSnapchatInstall = async (email?: string) => {
  const SNAP_APP_ID = process.env.EXPO_PUBLIC_SNAP_APP_ID;
  const CAPI_TOKEN = process.env.EXPO_PUBLIC_SNAP_CAPI_TOKEN;

  if (!SNAP_APP_ID) {
    console.warn('Snapchat App ID is missing.');
    return;
  }

  if (!CAPI_TOKEN || CAPI_TOKEN === 'YOUR_TOKEN_HERE') {
    console.warn('Snapchat CAPI token is missing or placeholder. Skipping install tracking.');
    return;
  }

  try {
    const uuid = Crypto.randomUUID();
    const eventTime = Math.floor(Date.now() / 1000);

    let clientIp = '0.0.0.0';
    try {
      // Fetch the real public IP address of the device
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      clientIp = ipData.ip;
    } catch (e) {
      console.warn('Failed to fetch IP address for Snapchat tracking', e);
    }

    const userAgent = Platform.OS === 'ios'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
      : 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36';

    let hashedIdfv = null;
    let hashedMadid = null;

    if (Platform.OS === 'ios') {
      try {
        const rawIdfv = await Application.getIosIdForVendorAsync();
        if (rawIdfv) {
          hashedIdfv = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawIdfv);
        }
      } catch (e) {
        console.warn('Failed to get iOS IDFV', e);
      }
    } else if (Platform.OS === 'android') {
      const rawMadid = Application.getAndroidId(); // Unique device ID fallback for Android
      if (rawMadid) {
        hashedMadid = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawMadid);
      }
    }

    let hashedEmail = null;
    if (email) {
      hashedEmail = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email.trim().toLowerCase());
    }

    const hashedExternalId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uuid);

    const payload = {
      data: [
        {
          event_name: 'APP_INSTALL',
          event_time: eventTime,
          action_source: 'app',
          event_id: uuid,
          user_data: {
            // A required identifier. We pass a generated UUID as external_id to deduplicate.
            external_id: hashedExternalId,
            // Provide a realistic User-Agent and real IP to avoid "Invalid Event" errors
            client_user_agent: userAgent,
            client_ip_address: clientIp,
            // Provide strong device identifiers to fix Error 507
            ...(hashedEmail ? { em: hashedEmail } : {}),
            ...(hashedIdfv ? { idfv: hashedIdfv } : {}),
            ...(hashedMadid ? { madid: hashedMadid } : {})
          },
          app_data: {
            app_id: Application.applicationId || 'com.memecam.app',
            advertiser_tracking_enabled: 0,
            // extinfo format: [version, package_name, short_version, long_version, os_version, device_model, locale, timezone, ...]
            extinfo: ["a2", Application.applicationId || "com.memecam.app", "1.0", "1.0.0", "1.0", "Mobile", "en_US", "GMT", "", "", "", "", "", "", "", ""]
          }
        }
      ]
    };

    // The endpoint is `https://tr.snapchat.com/v3/{pixel_id}/events` but for apps, we use the snap_app_id
    const response = await fetch(`https://tr.snapchat.com/v3/${SNAP_APP_ID}/events?access_token=${CAPI_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("response", JSON.stringify(response))
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Snapchat CAPI response error:', errorText);
    } else {
      console.log('Successfully tracked Snapchat install event');
    }
  } catch (error) {
    console.error('Error sending Snapchat install event:', error);
  }
};
