export type TenantContext={companyId:string;userId:string};
export function requireTenant(ctx:Partial<TenantContext>):TenantContext{if(!ctx.companyId||!ctx.userId)throw new Error("Tenant context is required");return {companyId:ctx.companyId,userId:ctx.userId};}
export function tenantWhere<T extends object>(ctx:TenantContext,where:T){return {...where,companyId:ctx.companyId};}
