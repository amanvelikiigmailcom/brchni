import { BaseService } from './BaseService';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

export type PlanName = 'free' | 'pro' | 'business' | 'premium';

export const PLAN_CREDITS: Record<PlanName, number> = {
    free: 5,
    pro: 100,
    business: 350,
    premium: 1700,
};

const PLAN_RESET_MS: Record<PlanName, number> = {
    free: 24 * 60 * 60 * 1000,          // 24 hours
    pro: 30 * 24 * 60 * 60 * 1000,      // ~30 days
    business: 30 * 24 * 60 * 60 * 1000,
    premium: 30 * 24 * 60 * 60 * 1000,
};

export interface BillingStatus {
    plan: PlanName;
    credits: number;
    creditsResetAt: Date | null;
    polarSubscriptionId: string | null;
}

export class BillingService extends BaseService {

    async getUserBilling(userId: string): Promise<BillingStatus | null> {
        const rows = await this.database
            .select({
                plan: schema.users.plan,
                credits: schema.users.credits,
                creditsResetAt: schema.users.creditsResetAt,
                polarSubscriptionId: schema.users.polarSubscriptionId,
            })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!rows[0]) return null;

        const row = rows[0];
        return {
            plan: (row.plan ?? 'free') as PlanName,
            credits: row.credits ?? 0,
            creditsResetAt: row.creditsResetAt ?? null,
            polarSubscriptionId: row.polarSubscriptionId ?? null,
        };
    }

    async activatePlan(userId: string, plan: PlanName, subscriptionId: string): Promise<void> {
        const now = new Date();
        const resetAt = new Date(now);
        resetAt.setMonth(resetAt.getMonth() + 1);

        await this.database
            .update(schema.users)
            .set({
                plan,
                credits: PLAN_CREDITS[plan],
                creditsResetAt: resetAt,
                polarSubscriptionId: subscriptionId,
                updatedAt: now,
            })
            .where(eq(schema.users.id, userId));
    }

    async cancelPlan(userId: string): Promise<void> {
        const now = new Date();
        await this.database
            .update(schema.users)
            .set({
                plan: 'free',
                credits: PLAN_CREDITS.free,
                creditsResetAt: new Date(now.getTime() + PLAN_RESET_MS.free),
                polarSubscriptionId: null,
                updatedAt: now,
            })
            .where(eq(schema.users.id, userId));
    }

    async decrementCredits(userId: string): Promise<{ ok: boolean; remaining: number }> {
        const billing = await this.getUserBilling(userId);
        if (!billing) return { ok: false, remaining: 0 };

        const now = new Date();

        // Lazy reset: restore credits if the reset period has passed
        if (billing.creditsResetAt && billing.creditsResetAt <= now) {
            const maxCredits = PLAN_CREDITS[billing.plan];
            const nextReset = new Date(now.getTime() + PLAN_RESET_MS[billing.plan]);
            await this.database
                .update(schema.users)
                .set({ credits: maxCredits, creditsResetAt: nextReset, updatedAt: now })
                .where(eq(schema.users.id, userId));
            billing.credits = maxCredits;
        }

        if (billing.credits <= 0) return { ok: false, remaining: 0 };

        const remaining = billing.credits - 1;
        await this.database
            .update(schema.users)
            .set({ credits: remaining, updatedAt: now })
            .where(eq(schema.users.id, userId));

        return { ok: true, remaining };
    }

    async findUserByEmail(email: string): Promise<{ id: string } | null> {
        const rows = await this.database
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);
        return rows[0] ?? null;
    }

    async findUserBySubscriptionId(subscriptionId: string): Promise<{ id: string } | null> {
        const rows = await this.database
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.polarSubscriptionId, subscriptionId))
            .limit(1);
        return rows[0] ?? null;
    }
}
