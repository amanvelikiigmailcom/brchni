import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';
import { BillingService, PLAN_CREDITS, type PlanName } from '../../database/services/BillingService';
import { successResponse, errorResponse } from '../responses';

const PLAN_NAMES: Record<string, string> = {
    pro: 'Pro',
    business: 'Business',
    premium: 'Premium',
};

async function getPolarProductId(planName: string, env: Env): Promise<string | null> {
    const displayName = PLAN_NAMES[planName];
    if (!displayName) return null;

    const res = await fetch(
        `https://api.polar.sh/v1/products?organization_id=${env.POLAR_ORGANIZATION_ID}&limit=20`,
        { headers: { Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}` } }
    );
    if (!res.ok) return null;

    const body = await res.json() as { items: Array<{ id: string; name: string }> };
    const product = body.items.find((p) => p.name === displayName);
    return product?.id ?? null;
}

export function setupBillingRoutes(app: Hono<AppEnv>): void {
    const billingRouter = new Hono<AppEnv>();

    billingRouter.get('/status', setAuthLevel(AuthConfig.authenticated), async (c) => {
        const user = c.get('user');
        if (!user) return c.json(errorResponse('Unauthorized', 401), 401);

        const service = new BillingService(c.env);
        const billing = await service.getUserBilling(user.id);
        if (!billing) return c.json(errorResponse('User not found', 404), 404);

        return c.json(successResponse({
            plan: billing.plan,
            credits: billing.credits,
            creditsResetAt: billing.creditsResetAt?.toISOString() ?? null,
        }));
    });

    billingRouter.get('/checkout', setAuthLevel(AuthConfig.authenticated), async (c) => {
        const user = c.get('user');
        if (!user) return c.json(errorResponse('Unauthorized', 401), 401);

        const plan = c.req.query('plan') as PlanName | undefined;
        if (!plan || !PLAN_CREDITS[plan] === undefined || plan === 'free') {
            return c.json(errorResponse('Invalid plan', 400), 400);
        }

        const productId = await getPolarProductId(plan, c.env);
        if (!productId) {
            return c.json(errorResponse('Plan not found in Polar', 404), 404);
        }

        const origin = new URL(c.req.url).origin;
        const checkoutRes = await fetch('https://api.polar.sh/v1/checkouts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${c.env.POLAR_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                customer_email: user.email,
                success_url: `${origin}/settings?checkout=success`,
            }),
        });

        if (!checkoutRes.ok) {
            const err = await checkoutRes.text();
            return c.json(errorResponse(`Polar error: ${err}`, 502), 502);
        }

        const checkout = await checkoutRes.json() as { url: string };
        return c.json(successResponse({ url: checkout.url }));
    });

    app.route('/api/billing', billingRouter);
}
