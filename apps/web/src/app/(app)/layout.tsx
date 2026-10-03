import { AuthenticatedShell } from "@/components/auth/authenticated-shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
