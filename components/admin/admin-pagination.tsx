import Link from "next/link";

export function AdminPagination({
  page,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  function href(nextPage: number) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value); });
    query.set("page", String(nextPage));
    return `${basePath}?${query.toString()}`;
  }
  return (
    <nav className="admin-pagination" aria-label="Paginazione">
      {page > 1 ? <Link className="button button-ghost button-sm" href={href(page - 1)}>Precedente</Link> : <span />}
      <span>Pagina {page} di {pages}</span>
      {page < pages ? <Link className="button button-ghost button-sm" href={href(page + 1)}>Successiva</Link> : <span />}
    </nav>
  );
}
