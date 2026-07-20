export interface Pagination {
  page: number;
  perPage: number;
  offset: number;
}

export function getPagination(url: URL): Pagination {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "50") || 50));
  const offset = (page - 1) * perPage;
  return { page, perPage, offset };
}

export function paginatedResponse<T>(data: T[], total: number, pagination: Pagination) {
  const totalPages = Math.ceil(total / pagination.perPage);
  return {
    data,
    meta: {
      page: pagination.page,
      per_page: pagination.perPage,
      total,
      total_pages: totalPages,
    },
  };
}
