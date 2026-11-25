CREATE TABLE `community_page` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `community_id` INTEGER NOT NULL,
    `page_key` VARCHAR(32) NOT NULL DEFAULT 'home',
    `draft_schema` JSON NULL,
    `current_version_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `community_page_community_id_page_key_key`(`community_id`, `page_key`),
    UNIQUE INDEX `community_page_current_version_id_key`(`current_version_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `community_page_version` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `page_id` INTEGER NOT NULL,
    `version_no` INTEGER NOT NULL,
    `schema_json` JSON NOT NULL,
    `prompt_text` VARCHAR(500) NULL,
    `change_summary` VARCHAR(255) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_by_id` INTEGER NOT NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `community_page_version_page_id_version_no_key`(`page_id`, `version_no`),
    INDEX `community_page_version_page_id_status_created_at_idx`(`page_id`, `status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `community_page`
  ADD CONSTRAINT `community_page_community_id_fkey`
  FOREIGN KEY (`community_id`) REFERENCES `community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_page_version`
  ADD CONSTRAINT `community_page_version_page_id_fkey`
  FOREIGN KEY (`page_id`) REFERENCES `community_page`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `community_page_version_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `community_page`
  ADD CONSTRAINT `community_page_current_version_id_fkey`
  FOREIGN KEY (`current_version_id`) REFERENCES `community_page_version`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
