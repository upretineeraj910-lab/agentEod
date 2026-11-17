import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

async function AuthRedirect() {
  const session = await getCurrentUser();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "admin") {
    redirect("/admin");
  } else if (session.role === "manager") {
    redirect("/manager");
  } else if (session.role === "agent") {
    redirect("/agent");
  }

  redirect("/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
          Redirecting to dashboard...
        </div>
      }
    >
      <AuthRedirect />
    </Suspense>
  );
}
