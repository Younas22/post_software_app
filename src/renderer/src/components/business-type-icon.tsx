import {
  Briefcase,
  CalendarClock,
  Hammer,
  Pill,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Warehouse,
  type LucideIcon
} from 'lucide-react'

/** The Lucide icon a Super Admin set on a business type — a curated map; unknown names fall back to Store. */
const ICONS: Record<string, LucideIcon> = {
  'shopping-basket': ShoppingBasket,
  'utensils-crossed': UtensilsCrossed,
  pill: Pill,
  smartphone: Smartphone,
  shirt: Shirt,
  scissors: Scissors,
  hammer: Hammer,
  briefcase: Briefcase,
  warehouse: Warehouse,
  stethoscope: Stethoscope,
  'calendar-clock': CalendarClock,
  store: Store
}

export function BusinessTypeIcon({ name, className }: { name?: string | null; className?: string }): React.JSX.Element {
  const Icon = (name && ICONS[name]) || Store
  return <Icon className={className} />
}
