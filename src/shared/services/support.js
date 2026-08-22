import { getJson, postJson, putJson, deleteJson } from './backend';

// ============================================================
// CONTACT MESSAGES
// ============================================================

export async function submitContactMessage({ name, email, phone, subject, message }) {
  return postJson('/api/contact', { name, email, phone, subject, message });
}

export async function fetchContactMessages({
  statusFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  page = 1,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    sortField,
    sortDirection,
  });

  if (statusFilter && statusFilter !== 'all') {
    query.append('status', statusFilter);
  }

  if (searchQuery) {
    query.append('search', searchQuery);
  }

  const res = await getJson(`/api/contact?${query.toString()}`);
  return {
    items: res.items || [],
    hasMore: res.hasMore || false,
    page: res.page || 1,
  };
}

// ============================================================
// REPORTS
// ============================================================

export async function submitReport({ reportType, title, description, attachments }) {
  return postJson('/api/report', {
    reportType,
    title,
    description,
    attachments,
  });
}

export async function fetchReports({
  statusFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  page = 1,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    sortField,
    sortDirection,
  });

  if (statusFilter && statusFilter !== 'all') {
    query.append('status', statusFilter);
  }

  if (searchQuery) {
    query.append('search', searchQuery);
  }

  const res = await getJson(`/api/report?${query.toString()}`);
  return {
    items: res.items || [],
    hasMore: res.hasMore || false,
    page: res.page || 1,
  };
}

// ============================================================
// SUGGESTIONS
// ============================================================

export async function submitSuggestion({ title, category, description }) {
  return postJson('/api/suggestions', { title, category, description });
}

export async function fetchSuggestions({
  statusFilter,
  categoryFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  page = 1,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    sortField,
    sortDirection,
  });

  if (statusFilter && statusFilter !== 'all') {
    query.append('status', statusFilter);
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query.append('category', categoryFilter);
  }

  if (searchQuery) {
    query.append('search', searchQuery);
  }

  const res = await getJson(`/api/suggestions?${query.toString()}`);
  return {
    items: res.items || [],
    hasMore: res.hasMore || false,
    page: res.page || 1,
  };
}

// ============================================================
// STATUS MANAGEMENT & NOTES
// ============================================================

export async function updateSupportItemStatus(collectionName, itemId, newStatus) {
  // collectionName should map to the base route (e.g. 'contactMessages' -> 'contact', 'reports' -> 'report', 'suggestions' -> 'suggestions')
  let route = collectionName;
  if (collectionName === 'contactMessages') route = 'contact';
  if (collectionName === 'reports') route = 'report';

  return putJson(`/api/${route}/${itemId}/status`, { status: newStatus });
}

export async function addAdminNote(collectionName, itemId, note) {
  let route = collectionName;
  if (collectionName === 'contactMessages') route = 'contact';
  if (collectionName === 'reports') route = 'report';

  return postJson(`/api/${route}/${itemId}/notes`, { note });
}

export async function fetchAdminNotes(collectionName, itemId) {
  let route = collectionName;
  if (collectionName === 'contactMessages') route = 'contact';
  if (collectionName === 'reports') route = 'report';

  const res = await getJson(`/api/${route}/${itemId}/notes`);
  return res.notes || [];
}

export async function fetchSupportItem(collectionName, itemId) {
  let route = collectionName;
  if (collectionName === 'contactMessages') route = 'contact';
  if (collectionName === 'reports') route = 'report';

  return getJson(`/api/${route}/${itemId}`);
}

export async function deleteSupportItem(collectionName, itemId) {
  let route = collectionName;
  if (collectionName === 'contactMessages') route = 'contact';
  if (collectionName === 'reports') route = 'report';

  return deleteJson(`/api/${route}/${itemId}`);
}
