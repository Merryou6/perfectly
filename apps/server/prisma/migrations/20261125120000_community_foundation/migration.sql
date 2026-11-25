RENAME TABLE `users` TO `user`, `posts` TO `post`;

CREATE TABLE `community` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `owner_id` INTEGER NOT NULL,
    `join_approval_required` BOOLEAN NOT NULL DEFAULT false,
    `member_posting_only` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('NORMAL', 'FROZEN', 'ARCHIVED') NOT NULL DEFAULT 'NORMAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `community_slug_key`(`slug`),
    INDEX `community_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `community_member` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `community_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'LEFT') NOT NULL DEFAULT 'PENDING',
    `joined_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `community_member_community_id_user_id_key`(`community_id`, `user_id`),
    INDEX `community_member_community_id_status_idx`(`community_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `community_join_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `community_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(255) NULL,
    `reviewer_id` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `community_join_request_community_id_status_created_at_idx`(`community_id`, `status`, `created_at`),
    INDEX `community_join_request_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `section` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `community_id` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `posting_rules` JSON NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `section_community_id_sort_order_idx`(`community_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `community`
  (`name`, `slug`, `description`, `owner_id`, `join_approval_required`, `member_posting_only`, `status`, `created_at`, `updated_at`)
SELECT
  'City Walk', 'city-walk', 'Migrated from the legacy post feed.', MIN(`id`), false, true, 'NORMAL', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `user`
HAVING COUNT(*) > 0;

SET @city_community_id = (SELECT `id` FROM `community` WHERE `slug` = 'city-walk' LIMIT 1);

INSERT INTO `section`
  (`community_id`, `name`, `sort_order`, `status`, `created_at`, `updated_at`)
SELECT @city_community_id, 'Daily', 0, 'NORMAL', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE @city_community_id IS NOT NULL;

SET @daily_section_id = (
  SELECT `id`
  FROM `section`
  WHERE `community_id` = @city_community_id AND `name` = 'Daily'
  LIMIT 1
);

ALTER TABLE `post`
  ADD COLUMN `community_id` INTEGER NULL,
  ADD COLUMN `section_id` INTEGER NULL,
  ADD COLUMN `post_type` VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
  CHANGE COLUMN `content` `body` TEXT NULL;

UPDATE `post`
SET `community_id` = @city_community_id, `section_id` = @daily_section_id
WHERE `community_id` IS NULL
  AND @city_community_id IS NOT NULL
  AND @daily_section_id IS NOT NULL;

ALTER TABLE `post`
  MODIFY `community_id` INTEGER NOT NULL,
  MODIFY `section_id` INTEGER NOT NULL;

CREATE INDEX `post_community_id_status_created_at_idx` ON `post`(`community_id`, `status`, `created_at`);
CREATE INDEX `post_section_id_status_created_at_idx` ON `post`(`section_id`, `status`, `created_at`);

ALTER TABLE `community`
  ADD CONSTRAINT `community_owner_id_fkey`
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `community_member`
  ADD CONSTRAINT `community_member_community_id_fkey`
  FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `community_member_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_join_request`
  ADD CONSTRAINT `community_join_request_community_id_fkey`
  FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `community_join_request_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `community_join_request_reviewer_id_fkey`
  FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `section`
  ADD CONSTRAINT `section_community_id_fkey`
  FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `post`
  ADD CONSTRAINT `post_community_id_fkey`
  FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `post_section_id_fkey`
  FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
