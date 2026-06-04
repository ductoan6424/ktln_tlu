INSERT INTO "organization_units" (
  "organization_unit_id",
  "code",
  "name",
  "type",
  "is_active",
  "created_at",
  "updated_at"
) VALUES
  (
    'unit_department_tai_chinh_ke_toan',
    'DEPARTMENT_TAI_CHINH_KE_TOAN',
    'Phòng Tài chính - Kế toán',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'unit_department_khao_thi_dbcl',
    'DEPARTMENT_KHAO_THI_DBCL',
    'Phòng Khảo thí và Đảm bảo chất lượng',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'unit_center_ho_tro_sinh_vien',
    'CENTER_HO_TRO_SINH_VIEN',
    'Trung tâm Hỗ trợ sinh viên',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'unit_department_thu_vien',
    'DEPARTMENT_THU_VIEN',
    'Thư viện',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'unit_department_truyen_thong_tuyen_sinh',
    'DEPARTMENT_TRUYEN_THONG_TUYEN_SINH',
    'Ban Truyền thông và Tuyển sinh',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'unit_department_dao_tao',
    'DEPARTMENT_DAO_TAO',
    'Phòng Đào tạo',
    'DEPARTMENT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;
