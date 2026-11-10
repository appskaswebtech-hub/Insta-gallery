// Simple {placeholder} substitution, e.g. interpolate(t.uploadingMultiple, { count: 3 }).
// Isomorphic (no .server suffix) so it can run client-side too.
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
