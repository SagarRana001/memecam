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
      currency 
    } = body;

    // 1. Get User ID from Auth header
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    console.log(`[Verify] Platform: ${platform}, User: ${user.id}, Product: ${productId}`);

    // --- PURCHASE VERIFICATION ---
    // In a production app, you MUST verify the token with Google/Apple API here.
    // For now, we assume the token is valid if the client passed it after a successful IAP flow.
    let isValid = !!purchaseToken;
    let expiryTimeMillis = Date.now() + (31 * 24 * 60 * 60 * 1000); // Default +31 days

    if (isValid) {
      const finalTransactionId = transactionId || purchaseToken;

      // 2. Update Subscription Table
      const { data: subData, error: subError } = await supabaseClient
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

      if (subError) {
        console.error("Subscription Upsert Error:", subError);
        throw subError;
      }

      // 3. Log Payment History
      const { error: historyError } = await supabaseClient
        .from("payment_history")
        .insert({
          user_id: user.id,
          subscription_id: subData?.id,
          transaction_id: finalTransactionId,
          product_id: productId,
          purchase_token: purchaseToken,
          status: "succeeded",
          amount_micros: amountMicros || 799000000,
          currency: currency || "INR",
          raw_payload: { ...body, verified_at: new Date().toISOString() }
        });

      if (historyError) {
        // If it's a unique constraint violation on transaction_id, it means we already logged it.
        // We can ignore that, but log other errors.
        if (historyError.code !== '23505') {
           console.warn("Payment History Insert Error:", historyError);
        }
      }

      return new Response(JSON.stringify({ success: true, subscription: subData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid purchase" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    console.error("[Verify Error]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
