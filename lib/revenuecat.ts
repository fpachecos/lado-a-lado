import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
// Use sandbox para testes. O RevenueCat detecta automaticamente compras sandbox
// quando você usa uma conta sandbox do App Store
const USE_SANDBOX = process.env.EXPO_PUBLIC_REVENUECAT_USE_SANDBOX === 'true' || __DEV__;

export const initializeRevenueCat = async () => {
  if (Platform.OS === 'ios') {
    const configuration = {
      apiKey: REVENUECAT_API_KEY_IOS,
      // O RevenueCat detecta automaticamente o ambiente sandbox baseado na conta usada
      // Não há necessidade de configurar explicitamente, mas podemos adicionar logs
    };
    
    await Purchases.configure(configuration);
    
    // Habilitar logs detalhados em desenvolvimento para verificar sandbox
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      console.log('RevenueCat initialized in', USE_SANDBOX ? 'SANDBOX mode' : 'PRODUCTION mode');
      console.log('Note: Sandbox is automatically detected when using App Store sandbox test accounts');
    }
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

