export const STATEMENT_LINK_SECONDS = 604800;
export function statementPath(customerId: string, filename: string, id: string): string {
  return `${customerId}/statements/${id}-${filename.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}