import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { BillingService, type PlanName } from '../../database/services/BillingService';
import { createLogger } from '../../logger';

const logger = createLogger('PolarWebhook');

const PLAN_MAP: Record<string, PlanName> = {
    Pro: 'pro',
    Business: 'business',
    Premium: 'premium',
};

async function verifyPolarSignature(req: Request, secret: string): Promise<boolean> {
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');

    if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

    const body = await req.text();
    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
    const computed = `v1,${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    return webhookSignature.split(' ').some((sig) => sig === computed);
}

export function setupWebhookRoutes(app: Hono<AppEnv>): void {
    app.post('/api/webhooks/polar', async (c) => {
        const secret = c.env.POLAR_WEBHOOK_SECRET;
        if (secret) {
            const cloned = c.req.raw.clone();
            const valid = await verifyPolarSignature(cloned, secret);
            if (!valid) {
                logger.warn('Invalid Polar webhook signature');
                return c.json({ error: 'Invalid signature' }, 401);
            }
        }

        const event = await c.req.json() as {
            type: string;
            data: {
                id: string;
                status?: string;
                product?: { name: string };
                customer?: { email: string };
            };
        };

        const service = new BillingService(c.env);
        const { type, data } = event;

        logger.info('Polar webhook received', { type, subscriptionId: data.id });

        if (type === 'subscription.created' || type === 'subscription.updated') {
            const productName = data.product?.name ?? '';
            const plan = PLAN_MAP[productName];
            if (!plan) {
                logger.warn('Unknown product name in webhook', { productName });
                return c.json({ received: true });
            }

            const email = data.customer?.email;
            if (!email) return c.json({ received: true });

            const user = await service.findUserByEmail(email);
            if (!user) {
                logger.warn('User not found for webhook', { email });
                return c.json({ received: true });
            }

            await service.activatePlan(user.id, plan, data.id);
            logger.info('Plan activated', { userId: user.id, plan });

        } else if (type === 'subscription.canceled' || type === 'subscription.revoked') {
            const user = await service.findUserBySubscriptionId(data.id);
            if (user) {
                await service.cancelPlan(user.id);
                logger.info('Plan canceled', { userId: user.id });
            }

        } else if (type === 'order.created') {
            logger.info('Order created', { orderId: data.id });
        }

        return c.json({ received: true });
    });
}
