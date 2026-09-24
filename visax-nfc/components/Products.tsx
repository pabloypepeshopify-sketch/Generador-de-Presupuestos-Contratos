import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCard } from '@/components/ProductCard';
import { products } from '@/lib/products';
import { TIERS, eur } from '@/lib/pricing';
import { site } from '@/lib/site.config';

export function Products() {
  const tiers = [...TIERS].reverse().map((t) => `${t.min}+\u00A0−${Math.round(t.off * 100)}\u00A0%`).join(" · ");
  return (
    <section id="productos" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Productos"
          title={
            <>
              Pides, lo programamos
              <br />
              <span className="text-gradient italic">y te llega listo</span>
            </>
          }
          intro={`Precios con IVA incluido. Descuento automático por cantidad: ${tiers}. Envío ${eur(site.shipping.cost)}, gratis desde ${eur(site.shipping.freeFrom)}.`}
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
