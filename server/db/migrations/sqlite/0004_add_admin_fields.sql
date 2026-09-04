ALTER TABLE `user` ADD `role` text;
--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;
--> statement-breakpoint
ALTER TABLE `user` ADD `banReason` text;
--> statement-breakpoint
ALTER TABLE `user` ADD `banExpires` integer;
--> statement-breakpoint
ALTER TABLE `session` ADD `impersonatedBy` text;
