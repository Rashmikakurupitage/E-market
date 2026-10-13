'use client';

import { useHydrated, useSession } from '../lib/auth';

// Visitors can browse every product, but the seller's contact options (WhatsApp, Messenger)
// are only for registered customers. Everyone else simply sees no contact buttons.
export function useCanContact() {
  const session = useSession();
  const hydrated = useHydrated();
  return { hydrated, canContact: session?.user?.role === 'CUSTOMER' };
}
