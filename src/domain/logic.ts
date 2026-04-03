import { type PreparedItem, type Product, type ZoneItem } from './types';

export function calculateBudgetZone(
  preparedItems: PreparedItem[], 
  products: Product[], 
  budget: number
) {
  let covered = 0;
  let noPriceCount = 0;
  const items: ZoneItem[] = [];

  for (const item of preparedItems) {
    const product = products.find(p => p.id === item.productId);
    const price = item.estimatedUnitPrice ?? (product?.priceHistory[0] ?? null);
    
    if (price === null) {
      noPriceCount++;
    }
    
    const estimatedTotal = price !== null ? price * item.qty : null;
    const inZone = estimatedTotal !== null && (covered + estimatedTotal) <= budget;

    if (inZone && estimatedTotal !== null) {
      covered += estimatedTotal;
    }

    items.push({
      ...item,
      estimatedTotal,
      inZone
    });
  }

  const remainder = budget - covered;
  return { items, covered, remainder, noPriceCount };
}

export function getPriceRange(priceHistory: number[]): [number, number] | null {
  if (!priceHistory || priceHistory.length === 0) return null;
  return [Math.min(...priceHistory), Math.max(...priceHistory)];
}
