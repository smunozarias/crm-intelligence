/**
 * Metrics Service
 * Pure functions for calculating deal metrics from Pipedrive data
 */

/**
 * Parse Pipedrive date string to timestamp
 */
export function parsePipedriveDate(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.replace(' ', 'T') + 'Z';
  const parsedTime = new Date(normalized).getTime();
  return isNaN(parsedTime) ? null : parsedTime;
}

/**
 * Extract the best available date from a Pipedrive flow item.
 * Flow items have dates in item.data.add_time or item.timestamp, NOT item.add_time.
 */
export function getItemDate(item) {
  return item?.data?.add_time || item?.timestamp || item?.add_time || null;
}

/**
 * Check if a flow item is a real contact point (email, whatsapp, linkedin, call)
 */
function isContactPoint(item) {
  if (item.object === 'mailThread' || item.object === 'mailMessage') return true;
  if (item.object === 'activity') {
    const t = (item.data?.type || '').toLowerCase();
    return ['call', 'email', 'linkedin', 'whatsapp', 'ligação'].some(k => t.includes(k));
  }
  return false;
}

/**
 * Check if a flow item is any trackable action
 */
function isTrackableAction(item) {
  if (item.object === 'mailThread' || item.object === 'mailMessage') return true;
  if (item.object === 'activity') {
    const t = (item.data?.type || '').toLowerCase();
    return ['call', 'email', 'meeting', 'task', 'linkedin', 'whatsapp', 'ligação'].some(k => t.includes(k));
  }
  return false;
}

/**
 * Check if an activity is marked as done
 */
function isActivityDone(item) {
  return item.data?.done === true || item.data?.done === 1 || item.data?.done === '1' || item.data?.done === 'true';
}

/**
 * Calculate hard metrics from deal data and flow items
 * Returns pure data object (no side effects)
 */
export function calculateHardMetrics(dealData, flowItems) {
  const today = new Date().getTime();
  const createdDate = parsePipedriveDate(dealData.data.add_time) || today;
  const daysOpen = Math.floor((today - createdDate) / (1000 * 3600 * 24));

  // Find last real contact date
  let lastContactDate = createdDate;
  flowItems.forEach(item => {
    if (isContactPoint(item)) {
      const itemDate = parsePipedriveDate(getItemDate(item));
      if (itemDate && itemDate > lastContactDate) lastContactDate = itemDate;
    }
  });

  const daysInactive = Math.floor((today - lastContactDate) / (1000 * 3600 * 24));
  const totalActions = flowItems.filter(isTrackableAction).length;

  const meetingsOutbound = flowItems.filter(i =>
    i.object === 'activity' &&
    (i.data?.type === 'reuniao_01' || (i.data?.type || '').toLowerCase().includes('reuniao')) &&
    isActivityDone(i)
  ).length;

  const meetingsSales = flowItems.filter(i =>
    i.object === 'activity' &&
    (i.data?.type === 'meeting' || (i.data?.type || '').toLowerCase() === 'meeting') &&
    isActivityDone(i)
  ).length;

  return {
    daysOpen: Math.max(0, daysOpen),
    daysInactive: Math.max(0, daysInactive),
    totalActions,
    meetingsOutbound,
    meetingsSales,
  };
}
