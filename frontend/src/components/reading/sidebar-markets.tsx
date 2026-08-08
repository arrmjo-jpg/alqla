import { BourseRotator } from '@/components/economy/bourse-rotator';
import { GoldWidget } from '@/components/economy/gold-widget';
import { getAseTicker } from '@/lib/ase-market';
import { getLatestGold } from '@/lib/gold';
import { aseMarketStatus } from '@/lib/market';

// «بورصة عمّان + أسعار الذهب» بالشريط الجانبيّ — نفس كرتَي قسم الاقتصاد بالرئيسية (economy-showcase.tsx)
// بلا أيّ تعديل، مكدّستين بعمود واحد ضيّق بدل الشبكة. بلا بيانات سوق وبلا ذهب معاً ⇒ يُخفى بصمت.
export async function SidebarMarkets() {
  const [aseTicker, gold] = await Promise.all([getAseTicker(), getLatestGold()]);
  if ((aseTicker ?? []).length === 0 && !gold) return null;

  const market = aseMarketStatus();

  return (
    <div className="flex flex-col gap-4">
      <BourseRotator items={aseTicker ?? []} marketOpen={market.open} marketLabel={market.label} />
      <GoldWidget gold={gold} />
    </div>
  );
}
