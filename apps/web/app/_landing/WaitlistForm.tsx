"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { joinWaitlist } from "./actions";
import { Magnetic } from "./motion";
import { ROLES, type WaitlistRole, type WaitlistSource, type WaitlistState } from "./waitlist";
import styles from "./landing.module.css";

export interface WaitlistWords {
  label: string;
  placeholder: string;
  submit: string;
  saving: string;
  hint: string;
  sent: string;
  invalid: string;
  error: string;
  unavailable: string;
  role?: string;
  roles?: Record<WaitlistRole, string>;
}

/**
 * The waitlist form (R-01.8, T-1310), in the hero (email only) and in the final panel (with the
 * role). Saving says so and blocks a second tap; success replaces the form and takes the focus;
 * an error keeps what was typed.
 */
export function WaitlistForm({
  source,
  withRole = false,
  ready,
  words,
}: {
  source: WaitlistSource;
  withRole?: boolean;
  /** The waitlist works here (R-01.8); otherwise the form says it is not available yet. */
  ready: boolean;
  words: WaitlistWords;
}) {
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, {
    status: "idle",
  });
  const [role, setRole] = useState<WaitlistRole>("music_director");
  const id = useId();
  const done = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "sent") done.current?.focus();
  }, [state.status]);

  if (!ready) return <p className={styles.formNote}>{words.unavailable}</p>;
  if (state.status === "sent")
    return (
      <p ref={done} tabIndex={-1} role="status" className={styles.sent}>
        {words.sent}
      </p>
    );
  const problem =
    state.status === "invalid"
      ? words.invalid
      : state.status === "error"
        ? words.error
        : state.status === "unavailable"
          ? words.unavailable
          : null;
  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="source" value={source} />
      {/* People never see or reach this field; bots fill it. */}
      <input
        className={styles.trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      {withRole && words.roles && (
        <fieldset className={styles.roles}>
          <legend className={styles.label}>{words.role}</legend>
          <div className={styles.segmented}>
            {ROLES.map((value) => (
              <label key={value} className={styles.segment} data-checked={role === value}>
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                {words.roles?.[value]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className={styles.field}>
        <label htmlFor={`${id}-email`} className={styles.label}>
          {words.label}
        </label>
        <div className={styles.inputRow}>
          <input
            id={`${id}-email`}
            className={styles.input}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={words.placeholder}
            defaultValue={state.email ?? ""}
            aria-invalid={state.status === "invalid" || undefined}
            aria-describedby={problem ? `${id}-problem` : `${id}-hint`}
            required
            maxLength={254}
          />
          <Magnetic>
            <button
              type="submit"
              className={styles.primary}
              disabled={pending}
              aria-busy={pending || undefined}
            >
              {pending ? words.saving : words.submit}
            </button>
          </Magnetic>
        </div>
        {problem ? (
          <p id={`${id}-problem`} role="alert" className={styles.problem}>
            {problem}
          </p>
        ) : (
          <p id={`${id}-hint`} className={styles.formNote}>
            {words.hint}
          </p>
        )}
      </div>
    </form>
  );
}
