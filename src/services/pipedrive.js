/**
 * Pipedrive API Service
 * Handles all communication with the Pipedrive API via proxy
 */

const PIPEDRIVE_BASE = '/api/pipedrive';

/**
 * Fetch deal data by ID
 */
export async function fetchDeal(dealId, token) {
  const url = `${PIPEDRIVE_BASE}/deals/${dealId}?api_token=${token}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Erro na API (${res.status}): ${res.status === 401 ? 'Token inválido' : 'Negócio não encontrado'}. Detalhes: ${errorText.substring(0, 50)}`
    );
  }

  const data = await res.json();
  if (!data.success) throw new Error('A API do Pipedrive retornou sucesso=false para este Deal.');
  return data;
}

/**
 * Fetch deal participants with enriched contact data
 */
export async function fetchParticipants(dealId, token) {
  const url = `${PIPEDRIVE_BASE}/deals/${dealId}/participants?api_token=${token}`;
  const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });

  if (!res.ok) return { success: false, data: [] };

  const participantsData = await res.json();

  // Enrich participants with data from p.person
  if (participantsData.data && participantsData.data.length > 0) {
    participantsData.data = participantsData.data.map(p => {
      const person = p.person || {};
      return {
        ...p,
        name: person.name || p.person_id?.name || p.name,
        email: person.email || p.person_id?.email || p.email,
        phone: person.phone || p.person_id?.phone || p.phone,
        org_name: person.org_name || person.org_id?.name || '',
        job_title: person.job_title || person['8a759b92f4243c926cfeda450011949ac51a7a95'] || '',
        linkedin: person['6bc768aa12d302afae99f70f8349fcfe714ca394'] || '',
        whatsapp: person['8639d6c9321e6de529429d20021623aad637cc1a'] || '',
        label: person.label || p.label,
        tags: person.label || '',
      };
    });
  }

  return participantsData;
}

/**
 * Fetch all Pipedrive users and return as a map { id: name }
 */
export async function fetchUsersMap(token) {
  const usersMap = {};
  try {
    const url = `${PIPEDRIVE_BASE}/users?api_token=${token}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        data.data.forEach(u => { usersMap[u.id] = u.name; });
      }
    }
  } catch (e) {
    console.warn('Could not fetch users:', e);
  }
  return usersMap;
}

/**
 * Fetch all flow/timeline items for a deal (paginated, max 3 pages = 300 items)
 */
export async function fetchFlowItems(dealId, token, maxPages = 3) {
  let allItems = [];
  let start = 0;
  let moreItems = true;
  let pageCount = 0;

  while (moreItems && pageCount < maxPages) {
    const url = `${PIPEDRIVE_BASE}/deals/${dealId}/flow?api_token=${token}&limit=100&start=${start}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Erro ao buscar histórico.');

    const data = await res.json();
    if (data.data) allItems = allItems.concat(data.data);

    if (data.additional_data?.pagination?.more_items_in_collection) {
      start = data.additional_data.pagination.next_start;
      pageCount++;
    } else {
      moreItems = false;
    }
  }

  return allItems;
}
