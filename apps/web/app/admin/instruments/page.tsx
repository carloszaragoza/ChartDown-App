import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutPanel } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { VStack } from "@astryxdesign/core/VStack";
import { hasInstrumentIcon, Icon } from "@chartdown/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "../../../lib/admin/guard";
import { AddIcon, DeactivateIcon, EditIcon, ReactivateIcon } from "../../_components/ActionIcons";
import { AdminField } from "../AdminControls";
import { AdminHeader } from "../AdminHeader";
import { addInstrument, setInstrumentActive, updateInstrument } from "./actions";

type Search = Promise<{
  saved?: string;
  deactivated?: string;
  reactivated?: string;
  error?: string;
  edit?: string;
}>;
interface Instrument {
  id: string;
  slug: string;
  name_en: string;
  name_es: string;
  aliases: string[];
  active: boolean;
}
const PROBLEMS = ["slug", "name", "alias", "taken"] as const;

/**
 * The instrument catalog (Design Handoff 2.0 screen 12, T-1101, R-07.3): a table with how many
 * musicians chose each instrument, and a panel to add one or edit one. Instruments are deactivated
 * and reactivated, never deleted; the id is fixed once added, since charts use it.
 */
export default async function AdminInstrumentsPage({ searchParams }: { searchParams: Search }) {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: counts }] = await Promise.all([
    supabase.from("instruments").select("id, slug, name_en, name_es, aliases, active"),
    // Counts only: the Admin cannot read who plays what (Technical Plan, T-1305).
    supabase.rpc("instrument_musicians"),
  ]);
  const musicians = new Map(
    ((counts ?? []) as { instrument_id: string; musicians: number }[]).map((row) => [
      row.instrument_id,
      row.musicians,
    ]),
  );
  const locale = await getLocale();
  const nameOf = (instrument: Instrument) =>
    locale === "es" ? instrument.name_es : instrument.name_en;
  const otherName = (instrument: Instrument) =>
    locale === "es" ? instrument.name_en : instrument.name_es;
  const instruments = ((data ?? []) as Instrument[]).sort(
    (a, b) => Number(b.active) - Number(a.active) || nameOf(a).localeCompare(nameOf(b), locale),
  );
  const t = await getTranslations("admin.instruments");
  const admin = await getTranslations("admin");
  const { saved, deactivated, reactivated, error, edit } = await searchParams;
  const editing = instruments.find((instrument) => instrument.id === edit);
  const status = saved
    ? t("saved", { slug: saved })
    : deactivated
      ? t("deactivatedDone", { slug: deactivated })
      : reactivated
        ? t("reactivatedDone", { slug: reactivated })
        : null;
  const active = instruments.filter((instrument) => instrument.active).length;

  const panelTitle = editing ? t("edit", { name: nameOf(editing) }) : t("add");
  const panel = (
    // Keyed by what it edits, so its fields start again from that instrument.
    <form
      key={editing?.id ?? "new"}
      action={editing ? updateInstrument : addInstrument}
      aria-label={panelTitle}
      id="instrument-form"
    >
      <VStack gap={4}>
        <Heading level={2}>{panelTitle}</Heading>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <AdminField
          label={t("slug")}
          name="slug"
          initial={editing?.slug}
          hint={editing ? t("slugLocked") : t("slugHint")}
          required={!editing}
          readOnly={Boolean(editing)}
        />
        <AdminField label={t("nameEn")} name="name_en" initial={editing?.name_en} required />
        <AdminField label={t("nameEs")} name="name_es" initial={editing?.name_es} required />
        <AdminField
          label={t("aliases")}
          name="aliases"
          initial={editing?.aliases.join(", ")}
          hint={t("aliasesHint")}
          optional
        />
        <HStack gap={2}>
          <Button type="submit" variant="primary" label={editing ? t("save") : t("addSubmit")} />
          {editing && <Button label={t("cancel")} href="/admin/instruments" variant="ghost" />}
        </HStack>
      </VStack>
    </form>
  );

  return (
    <Layout
      height="auto"
      // One gutter on every page: 32 px around the content (Design Handoff 2.0, 1.6).
      padding={8}
      header={
        <AdminHeader
          area={{ label: admin("title"), isLink: true }}
          title={t("title")}
          description={t("description", { active, total: instruments.length })}
          action={
            <Button
              label={t("addSubmit")}
              variant="primary"
              icon={<AddIcon />}
              href="/admin/instruments#instrument-form"
            />
          }
        />
      }
      end={
        <LayoutPanel width={320} hasDivider label={panelTitle}>
          {panel}
        </LayoutPanel>
      }
      content={
        <LayoutContent>
          <VStack gap={4}>
            {status && <Banner status="success" title={status} />}
            {error && (
              <Banner
                status="error"
                title={
                  (PROBLEMS as readonly string[]).includes(error)
                    ? t(`problems.${error as (typeof PROBLEMS)[number]}`)
                    : t("problems.unknown")
                }
              />
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t("instrumentColumn")}</TableHeaderCell>
                  <TableHeaderCell>{t("slug")}</TableHeaderCell>
                  <TableHeaderCell>{t("aliases")}</TableHeaderCell>
                  <TableHeaderCell>{t("statusColumn")}</TableHeaderCell>
                  <TableHeaderCell>
                    <VisuallyHidden>{t("actionsColumn")}</VisuallyHidden>
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instruments.map((instrument) => {
                  const name = nameOf(instrument);
                  return (
                    <TableRow key={instrument.id}>
                      <TableCell>
                        <HStack gap={2} vAlign="center">
                          {hasInstrumentIcon(instrument.slug) && (
                            <Icon name={instrument.slug} size={20} />
                          )}
                          <VStack gap={0}>
                            <Text weight="bold" color={instrument.active ? "primary" : "secondary"}>
                              {name}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {otherName(instrument)}
                            </Text>
                          </VStack>
                        </HStack>
                      </TableCell>
                      <TableCell>
                        <Text type="code">{instrument.slug}</Text>
                      </TableCell>
                      <TableCell>
                        <Text type="code" color="secondary">
                          {instrument.aliases.join(", ")}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <VStack gap={0}>
                          <HStack gap={1.5} vAlign="center">
                            <StatusDot
                              variant={instrument.active ? "success" : "neutral"}
                              label={instrument.active ? t("active") : t("inactive")}
                            />
                            <Text>{instrument.active ? t("active") : t("inactive")}</Text>
                          </HStack>
                          <Text type="supporting" color="secondary">
                            {t("musicians", { count: musicians.get(instrument.id) ?? 0 })}
                          </Text>
                        </VStack>
                      </TableCell>
                      <TableCell>
                        <HStack gap={1} hAlign="end">
                          <Button
                            label={t("edit", { name })}
                            tooltip={t("edit", { name })}
                            icon={<EditIcon />}
                            isIconOnly
                            variant="ghost"
                            href={`/admin/instruments?edit=${instrument.id}#instrument-form`}
                          />
                          <form action={setInstrumentActive}>
                            <input type="hidden" name="id" value={instrument.id} />
                            <input type="hidden" name="active" value={String(!instrument.active)} />
                            <Button
                              type="submit"
                              label={
                                instrument.active
                                  ? t("deactivate", { name })
                                  : t("reactivate", { name })
                              }
                              tooltip={
                                instrument.active
                                  ? t("deactivate", { name })
                                  : t("reactivate", { name })
                              }
                              icon={instrument.active ? <DeactivateIcon /> : <ReactivateIcon />}
                              isIconOnly
                              variant="ghost"
                            />
                          </form>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
