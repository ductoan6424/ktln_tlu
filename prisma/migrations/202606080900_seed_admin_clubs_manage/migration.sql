INSERT INTO "admin_permissions" ("admin_permission_id", "code", "module", "name", "description", "created_at", "updated_at")
VALUES
  ('perm_admin_clubs_manage', 'admin.clubs.manage', 'clubs', 'Manage clubs', 'Allows managing club administration.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_roles" ("admin_role_id", "code", "name", "description", "is_system", "created_at", "updated_at")
VALUES
  ('role_club_manager', 'CLUB_MANAGER', 'Club Manager', 'Built-in role for managing clubs.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "admin_role_permissions" ("admin_role_id", "admin_permission_id", "created_at")
SELECT r."admin_role_id", p."admin_permission_id", CURRENT_TIMESTAMP
FROM "admin_roles" r
CROSS JOIN "admin_permissions" p
WHERE r."code" = 'CLUB_MANAGER'
  AND p."code" IN ('admin.access', 'admin.clubs.manage')
ON CONFLICT ("admin_role_id", "admin_permission_id") DO NOTHING;
