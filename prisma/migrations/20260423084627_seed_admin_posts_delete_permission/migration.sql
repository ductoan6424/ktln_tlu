-- Seed permission `admin.posts.delete` (idempotent) và gán cho role CONTENT_MODERATOR
INSERT INTO "admin_permissions" ("admin_permission_id", "code", "module", "name", "description", "created_at", "updated_at") VALUES
  ('perm_admin_posts_delete', 'admin.posts.delete', 'posts', 'Xoá bài viết bất kỳ', 'Cho phép gỡ bài viết của người dùng khác.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_role_permissions" ("admin_role_id", "admin_permission_id", "created_at")
SELECT r."admin_role_id", p."admin_permission_id", CURRENT_TIMESTAMP
FROM "admin_roles" r
CROSS JOIN "admin_permissions" p
WHERE r."code" = 'CONTENT_MODERATOR' AND p."code" = 'admin.posts.delete'
ON CONFLICT ("admin_role_id", "admin_permission_id") DO NOTHING;
