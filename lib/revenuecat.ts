import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';

// Temporário: desativa a verificação de premium e libera todas as funcionalidades para todos os usuários.
// Problema: marketplace da Apple com assinaturas. Para reverter, mude para `false`.
const PREMIUM_OVERRIDE = true;

export const initializeRevenueCat = async () => {
  if (Platform.OS === 'ios') {
    const configuration = {
      apiKey: REVENUECAT_API_KEY_IOS,
    };
    
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    await Purchases.configure(configuration);
  }
};

export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Verificar se está usando sandbox (compras sandbox são detectadas automaticamente)
    if (__DEV__ && customerInfo) {
      console.log('Customer Info:', {
        activeSubscriptions: Object.keys(customerInfo.activeSubscriptions),
        entitlements: Object.keys(customerInfo.entitlements.active),
        // O RevenueCat marca automaticamente compras sandbox
      });
    }
    
    return customerInfo;
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
};

export const isPremiumUser = async (): Promise<boolean> => {
  if (PREMIUM_OVERRIDE) return true;
  try {
    const customerInfo = await getCustomerInfo();
    return customerInfo?.entitlements.active['premium'] !== undefined;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();
    // Debug: em desenvolvimento, logar o que o RevenueCat retornou
    if (__DEV__) {
      console.log('[RevenueCat] Offerings:', {
        hasCurrent: !!offerings.current,
        currentIdentifier: offerings.current?.identifier,
        allOfferingIds: Object.keys(offerings.all),
        packageCount: offerings.current?.availablePackages?.length ?? 0,
      });
    }
    return offerings.current;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
};

export const purchasePackage = async (packageToPurchase: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      throw new Error('Purchase cancelled');
    }
    throw error;
  }
};

export const restorePurchases = async (): Promise<CustomerInfo> => {
  try {
    return await Purchases.restorePurchases();
  } catch (error) {
    console.error('Error restoring purchases:', error);
    throw error;
  }
};

