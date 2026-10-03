import { extractRequirementIds } from "./requirements.ts";

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Maps every task id in the task list (T-001…) to the requirement ids in its Requirements column. */
export function parseTaskRequirements(taskList: string): Map<string, string[]> {
  const tasks = new Map<string, string[]>();
  let requirementsColumn = -1;

  for (const line of taskList.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const row = cells(line);
    if (row[0] === "ID") {
      requirementsColumn = row.indexOf("Requirements");
      continue;
    }
    const id = row[0];
    if (id === undefined || !/^T-\d+$/.test(id) || requirementsColumn < 0) continue;
    tasks.set(id, extractRequirementIds(row[requirementsColumn] ?? ""));
  }
  return tasks;
}
