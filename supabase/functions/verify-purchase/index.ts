// Supabase Edge Function: verify-purchase
// This function should be deployed to Supabase to securely verify purchases.

/* 
  DEPLOYMENT STEPS:
  1. Install Supabase CLI
  2. Run: supabase functions deploy verify-purchase
  3. Set secrets: 
     supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { 
      purchaseToken, 
      productId, 
      platform, 
      transactionId, 
      amountMicros, 
      currency,
      transactionDate,
      status = 'succeeded'
    } = body;

    // 1. Get User ID from Auth header
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // --- LOGGING & VERIFICATION ---
    console.log(`Processing ${status} purchase for user ${user.id} on ${platform}. Product: ${productId}`);
    
    const finalTransactionId = transactionId || purchaseToken || `failed_${Date.now()}`;
    let subData = null;

    if (status === 'succeeded') {
      // In a production app, you MUST verify the token with Google/Apple API here.
      // For now, we assume the token is valid if the client passed it after a successful IAP flow.
      let isValid = !!purchaseToken || (platform === 'ios' && !!transactionId);
      
      // Anchor the expiration to the actual transaction date, so it doesn't infinitely extend.
      let baseTime: number;
      if (transactionDate) {
        const d = new Date(transactionDate);
        if (!isNaN(d.getTime())) {
          baseTime = d.getTime();
        } else if (!isNaN(Number(transactionDate))) {
          baseTime = Number(transactionDate);
        } else {
          baseTime = Date.now();
        }
      } else {
        baseTime = Date.now();
      }
      
      // Calculate expiration "month-wise" (exactly 1 calendar month from the payment date)
      const expiryDate = new Date(baseTime);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      let expiryTimeMillis = expiryDate.getTime();

      if (isValid) {
        // Check if this subscription is already linked to another user
        const { data: existingSub, error: existingSubError } = await supabaseClient
          .from("user_subscriptions")
          .select("user_id")
          .eq("external_subscription_id", finalTransactionId)
          .maybeSingle();

        if (existingSubError) throw existingSubError;

        if (existingSub && existingSub.user_id !== user.id) {
          // Subscription claim conflict detected - RE-ASSIGN to current user
          console.log(`Re-assigning subscription ${finalTransactionId} from user ${existingSub.user_id} to user ${user.id}`);
          
          await supabaseClient
            .from("user_subscriptions")
            .update({ 
              external_subscription_id: null,
              status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq("user_id", existingSub.user_id);
        }

        // 2. Update Subscription Table
        const { data: updatedSub, error: subError } = await supabaseClient
          .from("user_subscriptions")
          .upsert({
            user_id: user.id,
            status: "active",
            product_id: productId,
            platform: platform,
            current_period_end: new Date(expiryTimeMillis).toISOString(),
            external_subscription_id: finalTransactionId,
          }, { onConflict: "user_id" })
          .select()
          .single();

        if (subError) throw subError;
        subData = updatedSub;
      }
    }

    // 3. Log Payment History (Always do this, whether success or failure)
    const { error: historyError } = await supabaseClient
      .from("payment_history")
      .insert({
        user_id: user.id,
        subscription_id: subData?.id,
        transaction_id: finalTransactionId,
        product_id: productId,
        purchase_token: purchaseToken,
        status: status, // 'succeeded' or 'failed'
        amount_micros: amountMicros || 799000000,
        currency: currency || "INR",
        raw_payload: { ...body, processed_at: new Date().toISOString() }
      });

    if (historyError && historyError.code !== '23505') {
      console.error("Error logging payment history:", historyError);
    }

    return new Response(JSON.stringify({ 
      success: status === 'succeeded', 
      subscription: subData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Internal server error occurred
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
