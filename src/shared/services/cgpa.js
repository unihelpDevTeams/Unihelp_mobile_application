import { getJson, postJson, putJson, deleteJson } from './backend';

export async function fetchCgpaRecords() {
  const result = await getJson('/api/cgpa');
  // Backend returns an array of records. Map them to match expected format.
  // In Postgres, they are returned as an array under `data` or directly as the response array.
  // We'll map createdAt to have a toDate() shim if the component calls it.
  return (result?.data || result || []).map(record => ({
    ...record,
    createdAt: record.created_at || record.createdAt,
    updatedAt: record.updated_at || record.updatedAt,
  }));
}

export async function createCgpaRecord(data) {
  return postJson('/api/cgpa', data);
}

export async function updateCgpaRecord(id, data) {
  return putJson(`/api/cgpa/${id}`, data);
}

export async function deleteCgpaRecord(id) {
  return deleteJson(`/api/cgpa/${id}`);
}

export async function fetchGpaRecords() {
  const result = await getJson('/api/gpa');
  return (result?.data || result || []).map(record => ({
    ...record,
    createdAt: record.created_at || record.createdAt,
    updatedAt: record.updated_at || record.updatedAt,
  }));
}

export async function createGpaRecord(data) {
  return postJson('/api/gpa', data);
}

export async function deleteGpaRecord(id) {
  return deleteJson(`/api/gpa/${id}`);
}
