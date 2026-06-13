CREATE TABLE `invites` (
	`code` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text NOT NULL,
	`note` text,
	`used_by_user_id` text,
	`used_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `invites_created_by_idx` ON `invites` (`created_by_user_id`);