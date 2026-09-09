import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | VisionInspect AI",
  description: "Secure sign-in and sign-up experience for VisionInspect AI",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
