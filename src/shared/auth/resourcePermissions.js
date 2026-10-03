export const RESOURCE_ADMIN_EMAILS = [
  'iadejuwon77@gmail.com',
  'onakomayaokiki@gmail.com',
  'agbajejoshua36@gmail.com',
];

const emailOf = (profile, user) =>
  String(profile?.email || user?.email || '').trim().toLowerCase();

export const isResourceAdmin = (profile, user) =>
  profile?.admin === true || RESOURCE_ADMIN_EMAILS.includes(emailOf(profile, user));

export const getResourceOwnerId = (item = {}) =>
  item.ownerId ||
  item.uploadedBy ||
  item.userId ||
  item.postedById ||
  item.creatorId ||
  item.authorId ||
  null;

export const canUploadResource = ({ type, user, profile }) => {
  const uid = profile?.uid || user?.uid;
  return Boolean(uid);
};

export const canManageResource = ({ type, item, user, profile }) => {
  const uid = profile?.uid || user?.uid;
  if (!uid || !item) return false;
  if (isResourceAdmin(profile, user)) return true;
  if (type === 'question') return false;
  if (type === 'note') return getResourceOwnerId(item) === uid;
  return false;
};
