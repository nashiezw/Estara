import { redirect } from "next/navigation";
import { safeRelativeReturnPath } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function SignInFallback({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const params = await searchParams;
  redirect(`/login?return_to=${encodeURIComponent(safeRelativeReturnPath(params.return_to || "/workspace"))}`);
}
