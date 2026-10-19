/** The state useActionState hands a form action on the first submit. */
export const IDLE = { status: "idle" } as const;

/** Form fields as the browser sends them; a list adds one entry per value, like checkboxes. */
export function formData(fields: Record<string, string | number | number[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of [value].flat()) data.append(name, String(item));
  }
  return data;
}
