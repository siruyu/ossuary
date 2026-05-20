/**
 * Override layout for /login — renders children directly without
 * the LayoutShell shell so the auth page is a standalone full-screen component.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
