-- 新增 profile_notification_prefs.project_scope_mode 字段，默认值为 'all_accessible'，表示用户在项目范围内的通知偏好设置。
ALTER TABLE profile_notification_prefs
  ADD COLUMN project_scope_mode TEXT NOT NULL DEFAULT 'all_accessible';


-- 新增 profile_notification_prefs.include_archived_projects 字段，默认值为 0
-- 在“项目显示范围”里新增“加载归档项目”开关，并入库到个人偏好。
-- 默认值为 0，表示不加载归档项目；当值为 1 时，表示加载归档项目。
ALTER TABLE profile_notification_prefs
  ADD COLUMN include_archived_projects INTEGER NOT NULL DEFAULT 0;