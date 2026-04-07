import { useAdminAuth } from '@/hooks/use-admin-auth'

export function usePermissions() {
  useAdminAuth()

  const IS_PRIMARY = window.location.hostname === 'neuroklast.net'

  // Note: Replace with actual tier check when tier is added to useAdminAuth
  const tier = 'free' as string
  const isAgency = tier === 'agency'
  const isBypassed = IS_PRIMARY || isAgency

  const canUsePremiumThemes = () => {
    if (isBypassed) return true
    return tier === 'premium' || tier === 'agency'
  }

  const canUsePremiumWidgets = () => {
    if (isBypassed) return true
    return tier === 'premium' || tier === 'agency'
  }

  const canUseWidget = (_id: string) => {
    // In the future, this could check specific widget entitlements.
    // For now, it delegates to the general premium widget check if the widget is premium.
    // If we don't know if it's premium here, we assume the caller checks `item.license === 'premium'`
    // and calls `canUsePremiumWidgets()` instead.
    return true
  }

  const isThemeUnlocked = (_id: string) => {
    // Similarly, if a specific theme requires a specific license key, check it here.
    // For now, if bypassed or premium/agency, all premium themes are unlocked.
    return canUsePremiumThemes()
  }

  return {
    isBypassed,
    canUsePremiumThemes,
    canUsePremiumWidgets,
    canUseWidget,
    isThemeUnlocked,
  }
}
