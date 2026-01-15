import type { CustomerInfo } from '@revenuecat/purchases-js';
import Purchases from '@revenuecat/purchases-js';

const API_KEY = (import.meta as any).env?.VITE_REVENUECAT_API_KEY || '';
const CUSTOMER_CENTER_URL = (import.meta as any).env?.VITE_REVENUECAT_CUSTOMER_CENTER_URL || '';

let initialized = false;
let appUserId: string | null = null;

const getStoredUserId = (): string => {
  const k = 'wg_app_user_id';
  const existing = localStorage.getItem(k);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(k, id);
  return id;
};

const init = async (): Promise<void> => {
  if (initialized) return;
  appUserId = getStoredUserId();
  if (!API_KEY) throw new Error('Missing RevenueCat API key');
  await Purchases.configure({ apiKey: API_KEY, appUserID: appUserId });
  initialized = true;
};

const logIn = async (userId: string): Promise<CustomerInfo> => {
  const res = await Purchases.logIn(userId);
  appUserId = userId;
  return res;
};

const logOut = async (): Promise<CustomerInfo> => {
  const res = await Purchases.logOut();
  appUserId = getStoredUserId();
  return res;
};

const getOfferings = async () => {
  return Purchases.getOfferings();
};

const purchasePackage = async (pkgIdentifier: string) => {
  return Purchases.purchasePackage(pkgIdentifier);
};

const purchaseProduct = async (productIdentifier: string) => {
  return Purchases.purchaseProduct(productIdentifier);
};

const getCustomerInfo = async (): Promise<CustomerInfo> => {
  return Purchases.getCustomerInfo();
};

const restorePurchases = async (): Promise<CustomerInfo> => {
  return Purchases.restorePurchases();
};

const isEntitled = (info: CustomerInfo | null, entitlementId: string): boolean => {
  if (!info) return false;
  const entitlements: any = (info as any).entitlements?.active || {};
  return Boolean(entitlements[entitlementId]);
};

const openCustomerCenter = (): void => {
  const base = CUSTOMER_CENTER_URL;
  if (!base) return;
  const uid = appUserId || getStoredUserId();
  const url = `${base}${base.includes('?') ? '&' : '?'}appUserID=${encodeURIComponent(uid)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const revenuecatService = {
  init,
  logIn,
  logOut,
  getOfferings,
  purchasePackage,
  purchaseProduct,
  getCustomerInfo,
  restorePurchases,
  isEntitled,
  openCustomerCenter,
};

