import { getJson, postJson, patchJson, deleteJson } from './backend';

const normalizePagedResponse = (res, page = 1, pageSize = 20) => {
  const items = res.items || res.data || [];
  const total = Number(res.total || items.length || 0);
  const offset = Number(res.offset || (page - 1) * pageSize || 0);
  const limit = Number(res.limit || pageSize);
  return {
    items,
    hasMore: Boolean(res.hasMore ?? (offset + items.length < total)),
    page: res.page || page,
  };
};

const supportRouteFor = (collectionName) => {
  if (collectionName === 'contactMessages' || collectionName === 'contact') return 'contact';
  if (collectionName === 'reports' || collectionName === 'report') return 'reports';
  if (collectionName === 'suggestions') return 'suggestions';
  return collectionName;
};

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
  return normalizePagedResponse(res, page, pageSize);
}

// ============================================================
// REPORTS
// ============================================================

export async function submitReport({ reportType, title, description, attachments }) {
  return postJson('/api/reports', {
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

  const res = await getJson(`/api/reports?${query.toString()}`);
  return normalizePagedResponse(res, page, pageSize);
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
  return normalizePagedResponse(res, page, pageSize);
}

// ============================================================
// STATUS MANAGEMENT & NOTES
// ============================================================

export async function updateSupportItemStatus(collectionName, itemId, newStatus) {
  const route = supportRouteFor(collectionName);
  return patchJson(`/api/${route}/${itemId}/status`, { status: newStatus });
}

export async function addAdminNote(collectionName, itemId, note) {
  const route = supportRouteFor(collectionName);

  return postJson(`/api/${route}/${itemId}/notes`, { note });
}

export async function fetchAdminNotes(collectionName, itemId) {
  const route = supportRouteFor(collectionName);

  const res = await getJson(`/api/${route}/${itemId}/notes`);
  return res.notes || res.data || (Array.isArray(res) ? res : []);
}

export async function fetchSupportItem(collectionName, itemId) {
  const route = supportRouteFor(collectionName);

  return getJson(`/api/${route}/${itemId}`);
}

export async function deleteSupportItem(collectionName, itemId) {
  const route = supportRouteFor(collectionName);

  return deleteJson(`/api/${route}/${itemId}`);
}
