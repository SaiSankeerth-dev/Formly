import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jvzvfpfzhmidsztfexsd.supabase.co";
const supabaseKey = "sb_publishable_3asBWnzHlx_AKzwDFvWhWA_j5Zod3Yd";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLivePhoneOtp() {
  console.log("Testing Supabase signInWithOtp directly...");
  console.log("Supabase URL:", supabaseUrl);
  console.log("Target phone: +918499801489");

  const start = Date.now();
  const res = await supabase.auth.signInWithOtp({
    phone: "+918499801489",
  });
  const duration = Date.now() - start;

  console.log(`signInWithOtp completed in ${duration}ms`);
  console.log("Result data:", JSON.stringify(res.data, null, 2));
  console.log("Result error:", JSON.stringify(res.error, null, 2));

  if (res.error) {
    console.log("Error code:", res.error.code);
    console.log("Error status:", res.error.status);
    console.log("Error message:", res.error.message);
    console.log("Error name:", res.error.name);
  }
}

testLivePhoneOtp();
