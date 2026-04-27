import { useUserContext } from './user-context';

export function usePremium() {
  const { isPremium, refreshPremium } = useUserContext();
  return { isPremium, loading: false, refresh: refreshPremium };
}
