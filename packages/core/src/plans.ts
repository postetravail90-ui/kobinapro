export interface PlanRule {
  maxBusinesses: number;
  maxManagers: number;
  maxProducts: number;
}

export interface Usage {
  businesses: number;
  managers: number;
  products: number;
}

export function canCreateBusiness(rule: PlanRule, usage: Usage): boolean {
  return usage.businesses < rule.maxBusinesses;
}

export function canCreateManager(rule: PlanRule, usage: Usage): boolean {
  return usage.managers < rule.maxManagers;
}

export function canCreateProduct(rule: PlanRule, usage: Usage): boolean {
  return usage.products < rule.maxProducts;
}
