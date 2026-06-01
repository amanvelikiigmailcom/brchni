ALTER TABLE `users` ADD `plan` text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `credits` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `credits_reset_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `polar_subscription_id` text;