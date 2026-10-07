import { Button } from "@chartdown/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authEnabled } from "../../../lib/auth/enabled";
import { createClient } from "../../../lib/supabase/server";
import { UUID } from "../../versions/[id]/load";
import {
  cancelInvitation,
  inviteMember,
  leaveBand,
  removeMember,
  renameBand,
  setMemberInstruments,
} from "../actions";
import styles from "../bands.module.css";

type Search = Promise<Record<string, string | undefined>>;
interface Member {
  id: string;
  user_id: string;
  role: "md" | "musician";
  profile: { name: string } | { name: string }[] | null;
  instruments: { instrument_id: string }[];
}
interface CatalogInstrument {
  id: string;
  name_en: string;
  name_es: string;
  active: boolean;
}

const STATUS = ["created", "renamed", "invited", "cancelled", "instruments", "removed", "joined"];
const ERRORS = new Set(["name", "email_invalid", "yourself"]);

/**
 * A band: its members and their default instruments, its invitations, and leaving (R-04.2 to
 * R-04.4). Only its members see it; the MD manages it.
 */
export default async function BandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  if (!authEnabled()) notFound();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();

  const [{ data: band }, { data: memberRows }, { data: catalog }] = await Promise.all([
    supabase.from("bands").select("id, name, is_personal").eq("id", id).maybeSingle(),
    supabase
      .from("band_members")
      .select(
        "id, user_id, role, profile:profiles(name), instruments:member_instruments(instrument_id)",
      )
      .eq("band_id", id)
      .order("joined_at"),
    supabase.from("instruments").select("id, name_en, name_es, active"),
  ]);
  // A band the person is not in, and the personal space, have no page here (R-04.7).
  if (!band || band.is_personal) notFound();
  const members = (memberRows ?? []) as Member[];
  const me = members.find((member) => member.user_id === auth.user.id);
  if (!me) notFound();
  const isMd = me.role === "md";
  const { data: invitations } = isMd
    ? await supabase
        .from("band_invitations")
        .select("id, email, created_at")
        .eq("band_id", id)
        .is("responded_at", null)
        .order("created_at")
    : { data: [] };

  const t = await getTranslations("bands");
  const locale = await getLocale();
  const instruments = (catalog ?? []) as CatalogInstrument[];
  const nameOf = (instrument: CatalogInstrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const nameById = new Map(instruments.map((instrument) => [instrument.id, nameOf(instrument)]));
  const search = await searchParams;
  const status = STATUS.find((key) => search[key]);
  const profileName = (member: Member) =>
    (Array.isArray(member.profile) ? member.profile[0]?.name : member.profile?.name) ?? "";

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{band.name}</h1>
        <p className={styles.hint}>{isMd ? t("youAreMd") : t("youAreMusician")}</p>
      </div>
      <Link href={`/bands/${band.id}/sets`} className="cd-button cd-button--primary">
        {t("sets")}
      </Link>
      {status && (
        <p role="status" className={styles.message}>
          {t(`status.${status}`)}
        </p>
      )}
      {search.error && (
        <p role="alert" className={`${styles.message} ${styles.alert}`}>
          {t(`errors.${ERRORS.has(search.error) ? search.error : "unknown"}`)}
        </p>
      )}

      <section aria-labelledby="members" className={styles.list}>
        <h2 id="members" className={styles.label}>
          {t("members", { count: members.length })}
        </h2>
        <ul className={styles.items}>
          {members.map((member) => {
            const name = profileName(member);
            const chosen = new Set(member.instruments.map((item) => item.instrument_id));
            const plays = [...chosen].map((instrumentId) => nameById.get(instrumentId) ?? "");
            return (
              <li key={member.id} className={styles.item}>
                <p className={styles.text}>
                  <b>{name}</b> · {member.role === "md" ? t("md") : t("musician")}
                  {member.user_id === auth.user.id ? ` · ${t("you")}` : ""}
                </p>
                <p className={styles.hint}>
                  {plays.length > 0 ? plays.join(", ") : t("noInstruments")}
                </p>
                {isMd && (
                  <details className={styles.details}>
                    <summary className={styles.summary}>{t("instrumentsOf", { name })}</summary>
                    <form action={setMemberInstruments} className={styles.form}>
                      <input type="hidden" name="bandId" value={band.id} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <div className={styles.instruments}>
                        {instruments
                          .filter((instrument) => instrument.active || chosen.has(instrument.id))
                          .sort((a, b) => nameOf(a).localeCompare(nameOf(b), locale))
                          .map((instrument) => (
                            <label key={instrument.id} className={styles.check}>
                              <input
                                type="checkbox"
                                name="instrument"
                                value={instrument.id}
                                defaultChecked={chosen.has(instrument.id)}
                              />
                              {nameOf(instrument)}
                            </label>
                          ))}
                      </div>
                      <Button type="submit">{t("saveInstruments")}</Button>
                    </form>
                  </details>
                )}
                {isMd && member.role === "musician" && (
                  <form action={removeMember}>
                    <input type="hidden" name="bandId" value={band.id} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <Button type="submit" aria-label={t("removeName", { name })}>
                      {t("remove")}
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isMd && (
        <>
          <form action={inviteMember} className={styles.form}>
            <h2 className={styles.label}>{t("invite")}</h2>
            <input type="hidden" name="bandId" value={band.id} />
            <label className={styles.field}>
              {t("email")}
              <input
                name="email"
                type="email"
                required
                className={styles.input}
                autoComplete="off"
              />
            </label>
            <p className={styles.hint}>{t("inviteHint")}</p>
            <Button type="submit" variant="primary">
              {t("inviteButton")}
            </Button>
          </form>
          {(invitations ?? []).length > 0 && (
            <section aria-labelledby="pending" className={styles.list}>
              <h2 id="pending" className={styles.label}>
                {t("pending")}
              </h2>
              <ul className={styles.items}>
                {(invitations ?? []).map((invitation) => (
                  <li key={invitation.id as string} className={styles.row}>
                    <span className={styles.text}>{invitation.email as string}</span>
                    <form action={cancelInvitation}>
                      <input type="hidden" name="bandId" value={band.id} />
                      <input type="hidden" name="invitationId" value={invitation.id as string} />
                      <Button
                        type="submit"
                        aria-label={t("cancelFor", { email: invitation.email as string })}
                      >
                        {t("cancel")}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <form action={renameBand} className={styles.form}>
            <h2 className={styles.label}>{t("rename")}</h2>
            <input type="hidden" name="bandId" value={band.id} />
            <label className={styles.field}>
              {t("name")}
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={band.name}
                className={styles.input}
                autoComplete="off"
              />
            </label>
            <Button type="submit">{t("renameButton")}</Button>
          </form>
        </>
      )}

      {!isMd && (
        <form action={leaveBand} className={styles.form}>
          <h2 className={styles.label}>{t("leave")}</h2>
          <p className={styles.hint}>{t("leaveHint")}</p>
          <input type="hidden" name="bandId" value={band.id} />
          <Button type="submit">{t("leaveButton")}</Button>
        </form>
      )}
      <Link href="/bands" className={styles.back}>
        {t("back")}
      </Link>
    </div>
  );
}
