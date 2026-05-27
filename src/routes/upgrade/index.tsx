import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { PlanName } from '@/api-types';

interface Plan {
	name: string;
	price: { monthly: number; annual: number } | null;
	credits: number | null;
	description: string;
	features: string[];
	highlighted: boolean;
	cta: string;
}

const plans: Plan[] = [
	{
		name: 'Free',
		price: null,
		credits: null,
		description: 'Get started for free',
		features: [
			'Basic credit limits',
			'Community support',
			'Public projects',
		],
		highlighted: false,
		cta: 'Current plan',
	},
	{
		name: 'Pro',
		price: { monthly: 19, annual: 15 },
		credits: 100,
		description: 'For individuals building fast',
		features: [
			'100 credits / month',
			'5 daily credits (up to 150/month)',
			'Credit rollovers',
			'On-demand credit top-ups',
			'Custom domains',
			'User roles & permissions',
		],
		highlighted: true,
		cta: 'Upgrade to Pro',
	},
	{
		name: 'Business',
		price: { monthly: 49, annual: 39 },
		credits: 350,
		description: 'For teams building together',
		features: [
			'350 credits / month',
			'Everything in Pro',
			'Internal publish',
			'Team workspace',
			'Personal projects',
			'Design templates',
			'Role-based access',
			'Security center',
		],
		highlighted: false,
		cta: 'Upgrade to Business',
	},
	{
		name: 'Premium',
		price: { monthly: 199, annual: 159 },
		credits: 1700,
		description: 'For power users & agencies',
		features: [
			'1700 credits / month',
			'Everything in Business',
			'Volume-based credit pricing',
			'Dedicated support',
		],
		highlighted: false,
		cta: 'Upgrade to Premium',
	},
];

export default function UpgradePage() {
	const [annual, setAnnual] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);
	const { user } = useAuth();

	const handleUpgrade = async (plan: Plan) => {
		if (!plan.price) return;
		setLoading(plan.name);
		try {
			const res = await apiClient.getBillingCheckoutUrl(plan.name.toLowerCase() as PlanName);
			if (res.success && res.data?.url) {
				window.location.href = res.data.url;
			}
		} finally {
			setLoading(null);
		}
	};

	return (
		<div className="min-h-screen bg-bg-1 px-4 py-16">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent px-3 py-1 rounded-full text-sm font-medium mb-4">
						<Zap className="h-4 w-4" />
						Upgrade your plan
					</div>
					<h1 className="text-4xl font-semibold text-text-primary mb-3">
						Simple, transparent pricing
					</h1>
					<p className="text-text-tertiary text-lg">
						Choose the plan that works for you
					</p>

					{/* Annual toggle */}
					<div className="flex items-center justify-center gap-3 mt-6">
						<span className={cn('text-sm', !annual ? 'text-text-primary' : 'text-text-tertiary')}>Monthly</span>
						<button
							onClick={() => setAnnual(!annual)}
							className={cn(
								'relative w-11 h-6 rounded-full transition-colors duration-200',
								annual ? 'bg-accent' : 'bg-bg-4'
							)}
						>
							<span className={cn(
								'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
								annual && 'translate-x-5'
							)} />
						</button>
						<span className={cn('text-sm', annual ? 'text-text-primary' : 'text-text-tertiary')}>
							Annual <span className="text-accent font-medium">−20%</span>
						</span>
					</div>
				</div>

				{/* Plans grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
					{plans.map((plan) => (
						<div
							key={plan.name}
							className={cn(
								'relative rounded-2xl p-6 flex flex-col border transition-all duration-200',
								plan.highlighted
									? 'bg-accent border-accent shadow-lg shadow-accent/20 text-white'
									: 'bg-bg-2 border-accent/20 hover:border-accent/40'
							)}
						>
							{plan.highlighted && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-accent text-xs font-semibold px-3 py-1 rounded-full">
									Most popular
								</div>
							)}

							<div className="mb-6">
								<h2 className={cn(
									'text-lg font-semibold mb-1',
									plan.highlighted ? 'text-white' : 'text-text-primary'
								)}>
									{plan.name}
								</h2>
								<p className={cn(
									'text-sm',
									plan.highlighted ? 'text-white/70' : 'text-text-tertiary'
								)}>
									{plan.description}
								</p>
							</div>

							<div className="mb-6">
								{plan.price ? (
									<div className="flex items-end gap-1">
										<span className={cn(
											'text-4xl font-bold',
											plan.highlighted ? 'text-white' : 'text-text-primary'
										)}>
											${annual ? plan.price.annual : plan.price.monthly}
										</span>
										<span className={cn(
											'text-sm mb-1',
											plan.highlighted ? 'text-white/70' : 'text-text-tertiary'
										)}>
											/ month
										</span>
									</div>
								) : (
									<span className={cn(
										'text-4xl font-bold',
										'text-text-primary'
									)}>
										Free
									</span>
								)}
								{plan.credits && (
									<p className={cn(
										'text-sm mt-1',
										plan.highlighted ? 'text-white/70' : 'text-text-tertiary'
									)}>
										{plan.credits} credits / month
									</p>
								)}
							</div>

							<button
								onClick={() => handleUpgrade(plan)}
								disabled={!plan.price || loading === plan.name}
								className={cn(
									'w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-6',
									plan.highlighted
										? 'bg-white text-accent hover:bg-white/90'
										: plan.price
											? 'bg-accent text-white hover:bg-accent/90'
											: 'bg-bg-4 text-text-tertiary cursor-default'
								)}
							>
								{loading === plan.name ? 'Loading...' : (!plan.price && user ? 'Current plan' : plan.cta)}
							</button>

							<ul className="space-y-3 flex-1">
								{plan.features.map((feature) => (
									<li key={feature} className="flex items-start gap-2">
										<Check className={cn(
											'h-4 w-4 mt-0.5 flex-shrink-0',
											plan.highlighted ? 'text-white' : 'text-accent'
										)} />
										<span className={cn(
											'text-sm',
											plan.highlighted ? 'text-white/80' : 'text-text-secondary'
										)}>
											{feature}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
