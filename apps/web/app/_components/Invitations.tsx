import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { List } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/VStack";
import { getTranslations } from "next-intl/server";
import { answerInvitation } from "../bands/actions";

export interface Invitation {
  id: string;
  band_name: string;
  invited_by_name: string | null;
}

/** The person's pending band invitations, to accept or decline (R-04.2). */
export async function Invitations({ invitations }: { invitations: Invitation[] }) {
  if (invitations.length === 0) return null;
  const t = await getTranslations("bands");
  return (
    <Card>
      <section aria-labelledby="invitations">
        <VStack gap={2}>
          <Heading level={2} id="invitations">
            {t("invitations")}
          </Heading>
          <List hasDividers edgeCompensation="inline">
            {invitations.map((invitation) => (
              <Item
                key={invitation.id}
                as="li"
                label={
                  invitation.invited_by_name
                    ? t("invitedBy", {
                        band: invitation.band_name,
                        name: invitation.invited_by_name,
                      })
                    : t("invitedTo", { band: invitation.band_name })
                }
                endContent={
                  <form action={answerInvitation}>
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <HStack gap={2}>
                      <Button
                        type="submit"
                        name="answer"
                        value="accept"
                        variant="primary"
                        label={t("acceptBand", { band: invitation.band_name })}
                      >
                        {t("accept")}
                      </Button>
                      <Button
                        type="submit"
                        name="answer"
                        value="decline"
                        label={t("declineBand", { band: invitation.band_name })}
                      >
                        {t("decline")}
                      </Button>
                    </HStack>
                  </form>
                }
              />
            ))}
          </List>
        </VStack>
      </section>
    </Card>
  );
}
