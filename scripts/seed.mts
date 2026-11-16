import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPass123!";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "alice@demo.test", full_name: "Alice Demo" },
  { email: "bob@demo.test", full_name: "Bob Demo" },
  { email: "carol@demo.test", full_name: "Carol Demo" },
];

for (const user of users) {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = existingUsers.users.find(
    (candidate) => candidate.email?.toLowerCase() === user.email,
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });
    if (error) throw error;
    console.log(`Updated ${user.email}`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    });
    if (error) throw error;
    console.log(`Created ${user.email}`);
  }
}

console.log("Seed complete. The auth.users trigger creates each profile row.");
