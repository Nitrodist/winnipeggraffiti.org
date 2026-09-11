/**
 * Next numeric id as a string, matching the cheapmlcc convention of string ids.
 *
 * @param {Iterable<{id?: string|number}>} records
 */
export function nextId(records) {
  let max = 0;
  for (const record of records) {
    const n = Number(record.id);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}
