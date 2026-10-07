import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Item } from "@astryxdesign/core/Item";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { List } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { getLocale, getTranslations } from "next-intl/server";
import { blocks, inline } from "../../lib/legal/Markdown";
import { LEGAL_TEXTS, type LegalDocument } from "../../lib/legal/texts";

/**
 * The Terms of Use or the Privacy Notice (T-1202), in the reader's language, with Astryx
 * typography (Design Handoff 2.0, the screens table: Terms and Privacy). Open to everyone, in
 * production too, so they can be read before creating an account.
 */
export async function LegalPage({ document }: { document: LegalDocument }) {
  const locale = await getLocale();
  const t = await getTranslations("legal");
  const other: LegalDocument = document === "terms" ? "privacy" : "terms";
  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      contentWidth={760}
      content={
        <LayoutContent>
          <VStack gap={4}>
            <HStack>
              <Button label={t("home")} variant="ghost" href="/" />
            </HStack>
            <Card>
              <VStack gap={4}>
                {blocks(LEGAL_TEXTS[document][locale === "es" ? "es" : "en"]).map((block, index) =>
                  block.type === "h1" ? (
                    <Heading key={index} level={1}>
                      {inline(block.text)}
                    </Heading>
                  ) : block.type === "h2" ? (
                    <Heading key={index} level={2}>
                      {inline(block.text)}
                    </Heading>
                  ) : block.type === "ul" ? (
                    <List key={index} listStyle="disc" density="compact">
                      {block.items.map((item, i) => (
                        <Item key={i} as="li" label={<Text>{inline(item)}</Text>} />
                      ))}
                    </List>
                  ) : (
                    <Text key={index} as="p">
                      {inline(block.text)}
                    </Text>
                  ),
                )}
              </VStack>
            </Card>
            <HStack>
              <Button label={t("other", { name: t(other) })} variant="ghost" href={`/${other}`} />
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
