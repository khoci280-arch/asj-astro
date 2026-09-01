/**
 * contexts/applications/repository.ts — Database queries for application forms (mail inbox)
 *
 * Owns: database_asj_form
 * All DB access goes through kernel/http → supabaseJson
 */
import { normalizeWa, pick, supabaseJson, supabaseUpsert } from '../../_lib/db/client';
import {
  findFormByIndexFiltered,
  findForms,
  findFormsByWa,
  mapForm,
  upsertFormRow,
} from '../../_lib/db/forms';

export async function getFormByIndex(idx: number): Promise<any | null> {
  let f = await findFormByIndexFiltered(idx);
  if (f === undefined) {
    const forms = await findForms();
    f = forms[idx] || null;
  }
  return f;
}

export async function getFormsByWa(wa: string): Promise<any[]> {
  let rows = await findFormsByWa(wa);
  if (rows === undefined) {
    rows = await supabaseJson('GET', 'database_asj_form', {
      query: { select: '*', limit: 500 },
    });
  }
  return Array.isArray(rows) ? rows : [];
}

export async function patchForm(id: string, body: Record<string, any>): Promise<void> {
  await supabaseJson('PATCH', 'database_asj_form', {
    query: { id: 'eq.' + id },
    body,
    headers: { Prefer: 'return=minimal' },
  });
}

export async function deleteForm(id: string): Promise<void> {
  await supabaseJson('DELETE', 'database_asj_form', {
    query: { id: 'eq.' + id },
    headers: { Prefer: 'return=minimal' },
  });
}

export async function upsertForm(body: Record<string, any>): Promise<void> {
  await upsertFormRow(body);
}

export { normalizeWa, pick, mapForm, supabaseJson, supabaseUpsert };
