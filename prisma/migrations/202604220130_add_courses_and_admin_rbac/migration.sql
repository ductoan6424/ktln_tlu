UPDATE "user_profiles"
SET "role" = 'ADMIN'
WHERE "role" = 'CLUB_ADMIN';

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'LECTURER', 'ADMIN');

ALTER TABLE "user_profiles"
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" TYPE "UserRole"
USING (
  CASE
    WHEN "role"::text = 'CLUB_ADMIN' THEN 'ADMIN'
    ELSE "role"::text
  END
)::"UserRole",
ALTER COLUMN "role" SET DEFAULT 'STUDENT';

DROP TYPE "UserRole_old";

CREATE TABLE "courses" (
    "course_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id")
);

CREATE TABLE "course_members" (
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_members_pkey" PRIMARY KEY ("user_id","course_id")
);

CREATE TABLE "admin_permissions" (
    "admin_permission_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("admin_permission_id")
);

CREATE TABLE "admin_roles" (
    "admin_role_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("admin_role_id")
);

CREATE TABLE "admin_role_permissions" (
    "admin_role_id" TEXT NOT NULL,
    "admin_permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("admin_role_id","admin_permission_id")
);

CREATE TABLE "user_admin_roles" (
    "user_id" TEXT NOT NULL,
    "admin_role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_admin_roles_pkey" PRIMARY KEY ("user_id","admin_role_id")
);

CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at" DESC);
CREATE INDEX "course_members_course_id_idx" ON "course_members"("course_id");

CREATE UNIQUE INDEX "admin_permissions_code_key" ON "admin_permissions"("code");
CREATE UNIQUE INDEX "admin_roles_code_key" ON "admin_roles"("code");
CREATE INDEX "admin_role_permissions_admin_permission_id_idx" ON "admin_role_permissions"("admin_permission_id");
CREATE INDEX "user_admin_roles_admin_role_id_idx" ON "user_admin_roles"("admin_role_id");

ALTER TABLE "course_members"
ADD CONSTRAINT "course_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_members"
ADD CONSTRAINT "course_members_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("course_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_role_permissions"
ADD CONSTRAINT "admin_role_permissions_admin_role_id_fkey"
FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("admin_role_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_role_permissions"
ADD CONSTRAINT "admin_role_permissions_admin_permission_id_fkey"
FOREIGN KEY ("admin_permission_id") REFERENCES "admin_permissions"("admin_permission_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_admin_roles"
ADD CONSTRAINT "user_admin_roles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_admin_roles"
ADD CONSTRAINT "user_admin_roles_admin_role_id_fkey"
FOREIGN KEY ("admin_role_id") REFERENCES "admin_roles"("admin_role_id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "admin_permissions" ("admin_permission_id", "code", "name", "description", "created_at", "updated_at") VALUES
  ('perm_admin_access', 'admin.access', 'Admin access', 'Allows access to the admin area.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_users_read', 'admin.users.read', 'Read users', 'Allows viewing user administration data.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_users_manage', 'admin.users.manage', 'Manage users', 'Allows managing user accounts.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_posts_moderate', 'admin.posts.moderate', 'Moderate posts', 'Allows moderating posts and reports.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_courses_manage', 'admin.courses.manage', 'Manage courses', 'Allows managing courses and memberships.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_admin_roles_manage', 'admin.roles.manage', 'Manage admin roles', 'Allows assigning admin roles and permissions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "admin_roles" ("admin_role_id", "code", "name", "description", "is_system", "created_at", "updated_at") VALUES
  ('role_user_admin', 'USER_ADMIN', 'User Admin', 'Built-in role for managing users.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_content_moderator', 'CONTENT_MODERATOR', 'Content Moderator', 'Built-in role for moderating posts.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_course_admin', 'COURSE_ADMIN', 'Course Admin', 'Built-in role for managing courses.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_admin_role_manager', 'ADMIN_ROLE_MANAGER', 'Admin Role Manager', 'Built-in role for managing delegated admin roles.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "admin_role_permissions" ("admin_role_id", "admin_permission_id", "created_at") VALUES
  ('role_user_admin', 'perm_admin_access', CURRENT_TIMESTAMP),
  ('role_user_admin', 'perm_admin_users_read', CURRENT_TIMESTAMP),
  ('role_user_admin', 'perm_admin_users_manage', CURRENT_TIMESTAMP),
  ('role_content_moderator', 'perm_admin_access', CURRENT_TIMESTAMP),
  ('role_content_moderator', 'perm_admin_posts_moderate', CURRENT_TIMESTAMP),
  ('role_course_admin', 'perm_admin_access', CURRENT_TIMESTAMP),
  ('role_course_admin', 'perm_admin_courses_manage', CURRENT_TIMESTAMP),
  ('role_admin_role_manager', 'perm_admin_access', CURRENT_TIMESTAMP),
  ('role_admin_role_manager', 'perm_admin_roles_manage', CURRENT_TIMESTAMP);
