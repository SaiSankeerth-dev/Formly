import { loginUser, getEmployeeBySession } from "../src/lib/server/db.ts";

async function main() {
  console.log("=== Testing Citizen Login ===");
  const cit = await loginUser("sankeerths615@gmail.com", "1234567890");
  console.log("Citizen login OK:", { id: cit.user.id, name: cit.user.name, email: cit.user.email, role: cit.user.role });

  console.log("\n=== Testing Officer Login ===");
  const gov = await loginUser("sankeerthvss@gmail.com", "1234567890");
  console.log("Officer login OK:", { id: gov.user.id, name: gov.user.name, email: gov.user.email });

  const emp = await getEmployeeBySession(gov.token);
  console.log("Employee session OK:", {
    code: emp?.employee_code,
    name: emp?.full_name,
    email: emp?.email,
    role: emp?.role,
    isActive: emp?.is_active
  });

  console.log("\n=== All Login Tests Passed Successfully! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Login verification failed:", err);
  process.exit(1);
});
