import { Button } from "@chartdown/ui";
import { getTranslations } from "next-intl/server";
import { answerInvitation } from "../bands/actions";
import styles from "../bands/bands.module.css";

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
    <section aria-labelledby="invitations" className={styles.invitations}>
      <h2 id="invitations" className={styles.label}>
        {t("invitations")}
      </h2>
      <ul className={styles.items}>
        {invitations.map((invitation) => (
          <li key={invitation.id} className={styles.item}>
            <p className={styles.text}>
              {invitation.invited_by_name
                ? t("invitedBy", { band: invitation.band_name, name: invitation.invited_by_name })
                : t("invitedTo", { band: invitation.band_name })}
            </p>
            <form action={answerInvitation} className={styles.buttons}>
              <input type="hidden" name="invitationId" value={invitation.id} />
              <Button
                type="submit"
                name="answer"
                value="accept"
                variant="primary"
                aria-label={t("acceptBand", { band: invitation.band_name })}
              >
                {t("accept")}
              </Button>
              <Button
                type="submit"
                name="answer"
                value="decline"
                aria-label={t("declineBand", { band: invitation.band_name })}
              >
                {t("decline")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
