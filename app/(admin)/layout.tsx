/**
 * Layout del PANEL INTERNO DE VISAX (futuro, fase 2).
 * Todavía no hay ninguna ruta aquí: cuando se construya, sus páginas
 * colgarán de este grupo (por ejemplo app/(admin)/admin/...) con su
 * propio layout, protegido por sesión y rol "admin".
 * Ver docs/ARQUITECTURA_PORTAL.md.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100svh]">{children}</div>;
}
