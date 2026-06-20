import type { PanditSummary, Puja } from '../mock/types';
import type { DiscoveryFilters, SortKey } from '../store/discoveryStore';

function matchesQuery(p: PanditSummary, pujas: Puja[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const supportedNames = p.supportedPujas
    .map((sp) => pujas.find((pj) => pj.id === sp.pujaId)?.name ?? '')
    .join(' ');
  const haystack = [p.name, p.city, p.specializations.join(' '), supportedNames].join(' ').toLowerCase();
  return haystack.includes(needle);
}

/**
 * Filters approved pandits by free-text query + the active filters.
 * §0.10: when a `city` is set it overrides distance — distance filter is ignored.
 * `date` is a placeholder in this phase (availability matching arrives with booking).
 */
export function searchPandits(
  pandits: PanditSummary[],
  pujas: Puja[],
  query: string,
  filters: DiscoveryFilters,
): PanditSummary[] {
  const categoryPujaIds = filters.categoryId
    ? new Set(pujas.filter((pj) => pj.categoryId === filters.categoryId).map((pj) => pj.id))
    : null;

  return pandits
    .filter((p) => p.status === 'approved')
    .filter((p) => matchesQuery(p, pujas, query))
    .filter((p) => (categoryPujaIds ? p.supportedPujas.some((sp) => categoryPujaIds.has(sp.pujaId)) : true))
    .filter((p) => (filters.pujaId ? p.supportedPujas.some((sp) => sp.pujaId === filters.pujaId) : true))
    .filter((p) => (filters.minRating != null ? p.rating >= filters.minRating : true))
    .filter((p) => (filters.priceMax != null ? p.startingPrice <= filters.priceMax : true))
    .filter((p) => (filters.city ? p.city === filters.city : true))
    .filter((p) =>
      filters.maxDistanceKm != null && !filters.city ? p.distanceKm <= filters.maxDistanceKm : true,
    );
}

export function sortPandits(pandits: PanditSummary[], sort: SortKey): PanditSummary[] {
  const list = [...pandits];
  switch (sort) {
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'price':
      return list.sort((a, b) => a.startingPrice - b.startingPrice);
    case 'distance':
      return list.sort((a, b) => a.distanceKm - b.distanceKm);
    case 'relevance':
    default:
      return list;
  }
}
