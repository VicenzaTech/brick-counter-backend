export type TPagination = {
  page: number;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
};

export const Pagination_Helper = {
  extractDefaultFromQuery: (query): TPagination => {
    const { page = 1, sort, order = 'asc', limit = 10 }: TPagination = query;
    return {
      page: Number(page),
      sort,
      order,
      limit: Number(limit),
    };
  },
};

export class PaginationDTO {
  page: number;
  sort: string;
  order: 'asc' | 'desc';
  limit: number;
}
