import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { VStack } from "@astryxdesign/core/VStack";
import { ChartDownLogo } from "@chartdown/ui";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { isAuthError } from "../../lib/auth/errors";

export { Field } from "./AuthControls";

/**
 * A sign-in page (sign in, sign up, waitlist, password recovery), built with the same Astryx
 * components as the app (Design Handoff 2.0, the screens table: Sign-in pages): the logo, the
 * title, an error when there is one, and the page's forms.
 */
export function AuthPage({
  title,
  error,
  children,
}: {
  title: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  const t = useTranslations("auth.errors");
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={440}
      content={
        <LayoutContent>
          <VStack gap={5}>
            <ChartDownLogo variant="symbol" size={40} />
            <Heading level={1}>{title}</Heading>
            {isAuthError(error) && <Banner status="error" title={t(error)} />}
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/** A form of a sign-in page, in a card. */
export function AuthForm({
  action,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  children: ReactNode;
}) {
  return (
    <Card>
      <form action={action}>
        <VStack gap={4}>{children}</VStack>
      </form>
    </Card>
  );
}
