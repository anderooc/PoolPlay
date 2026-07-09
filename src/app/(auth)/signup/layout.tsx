import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Sign up");

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
