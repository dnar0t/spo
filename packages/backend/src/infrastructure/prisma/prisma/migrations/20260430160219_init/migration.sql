-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "youtrack_login" TEXT,
    "youtrack_user_id" TEXT,
    "ad_login" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "employment_date" TIMESTAMP(3),
    "termination_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "extensions" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "work_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "work_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_role_id" TEXT,
    "manager_id" TEXT,
    "planned_hours_per_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_periods" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PLANNING',
    "work_hours_per_month" INTEGER,
    "reserve_percent" INTEGER DEFAULT 30,
    "test_percent" INTEGER DEFAULT 2000,
    "debug_percent" INTEGER DEFAULT 3000,
    "mgmt_percent" INTEGER DEFAULT 1000,
    "yellow_threshold" INTEGER DEFAULT 8000,
    "red_threshold" INTEGER DEFAULT 10000,
    "business_grouping_level" TEXT DEFAULT 'STORY',
    "closed_at" TIMESTAMP(3),
    "reopened_at" TIMESTAMP(3),
    "reopen_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "reporting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_transitions" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "from_state" TEXT NOT NULL,
    "to_state" TEXT NOT NULL,
    "reason" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_plans" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "fixed_at" TIMESTAMP(3),
    "fixed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "sprint_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprint_plan_versions" (
    "id" TEXT NOT NULL,
    "sprint_plan_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprint_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_tasks" (
    "id" TEXT NOT NULL,
    "sprint_plan_id" TEXT NOT NULL,
    "youtrack_issue_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "planned_minutes" INTEGER NOT NULL DEFAULT 0,
    "debug_minutes" INTEGER NOT NULL DEFAULT 0,
    "test_minutes" INTEGER NOT NULL DEFAULT 0,
    "mgmt_minutes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtrack_issues" (
    "id" TEXT NOT NULL,
    "youtrack_id" TEXT NOT NULL,
    "issue_number" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "project_name" TEXT,
    "system_name" TEXT,
    "sprint_name" TEXT,
    "type_name" TEXT,
    "priority_name" TEXT,
    "state_name" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "reporter_id" TEXT,
    "assignee_id" TEXT,
    "estimation_minutes" INTEGER,
    "parent_issue_id" TEXT,
    "parent_yt_id" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "youtrack_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "youtrack_work_item_id" TEXT,
    "author_id" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "work_date" TIMESTAMP(3),
    "work_type_name" TEXT,
    "period_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_token_encrypted" TEXT NOT NULL,
    "projects" JSONB NOT NULL,
    "search_query" TEXT,
    "agile_board_id" TEXT,
    "sprint_field_id" TEXT,
    "sync_interval" TEXT DEFAULT '0 */6 * * *',
    "batch_size" INTEGER NOT NULL DEFAULT 50,
    "request_timeout" INTEGER NOT NULL DEFAULT 30000,
    "retry_count" INTEGER NOT NULL DEFAULT 3,
    "error_email" TEXT,
    "field_mapping" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "started_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "total_issues" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "extensions" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_log_entries" (
    "id" TEXT NOT NULL,
    "sync_run_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_evaluations" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "youtrack_issue_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "evaluated_by_id" TEXT NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "manager_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_evaluations" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "youtrack_issue_id" TEXT NOT NULL,
    "evaluated_by_id" TEXT NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "business_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_reports" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_base_amount" INTEGER NOT NULL DEFAULT 0,
    "total_manager_amount" INTEGER NOT NULL DEFAULT 0,
    "total_business_amount" INTEGER NOT NULL DEFAULT 0,
    "total_on_hand" INTEGER NOT NULL DEFAULT 0,
    "total_ndfl" INTEGER NOT NULL DEFAULT 0,
    "total_insurance" INTEGER NOT NULL DEFAULT 0,
    "total_reserve" INTEGER NOT NULL DEFAULT 0,
    "total_with_tax" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_frozen" BOOLEAN NOT NULL DEFAULT false,
    "frozen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "personal_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_report_lines" (
    "id" TEXT NOT NULL,
    "personal_report_id" TEXT NOT NULL,
    "youtrack_issue_id" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "base_amount" INTEGER NOT NULL DEFAULT 0,
    "manager_percent" INTEGER,
    "manager_amount" INTEGER NOT NULL DEFAULT 0,
    "business_percent" INTEGER,
    "business_amount" INTEGER NOT NULL DEFAULT 0,
    "total_on_hand" INTEGER NOT NULL DEFAULT 0,
    "ndfl" INTEGER NOT NULL DEFAULT 0,
    "insurance" INTEGER NOT NULL DEFAULT 0,
    "reserve_vacation" INTEGER NOT NULL DEFAULT 0,
    "total_with_tax" INTEGER NOT NULL DEFAULT 0,
    "effective_rate" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_report_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_summary_reports" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "total_planned_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_actual_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_deviation" INTEGER NOT NULL DEFAULT 0,
    "completion_percent" INTEGER NOT NULL DEFAULT 0,
    "unplanned_minutes" INTEGER NOT NULL DEFAULT 0,
    "unplanned_percent" INTEGER NOT NULL DEFAULT 0,
    "remaining_minutes" INTEGER NOT NULL DEFAULT 0,
    "unfinished_tasks" INTEGER NOT NULL DEFAULT 0,
    "data_snapshot" JSONB,
    "is_frozen" BOOLEAN NOT NULL DEFAULT false,
    "calculated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "period_summary_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_rate_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_salary" INTEGER NOT NULL,
    "annual_minutes" INTEGER NOT NULL,
    "hourly_rate" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "changed_by_id" TEXT NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extensions" JSONB,

    CONSTRAINT "employee_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula_type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "formula_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_configuration_versions" (
    "id" TEXT NOT NULL,
    "formula_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_configuration_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_scales" (
    "id" TEXT NOT NULL,
    "scale_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "evaluation_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_settings" (
    "id" TEXT NOT NULL,
    "work_hours_per_month" INTEGER,
    "reserve_percent" INTEGER DEFAULT 30,
    "test_percent" INTEGER DEFAULT 2000,
    "debug_percent" INTEGER DEFAULT 3000,
    "mgmt_percent" INTEGER DEFAULT 1000,
    "yellow_threshold" INTEGER DEFAULT 8000,
    "red_threshold" INTEGER DEFAULT 10000,
    "business_grouping_level" TEXT DEFAULT 'STORY',
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "planning_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "extensions" JSONB,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_runs" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "event_name" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_snapshots" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "employee_rates" JSONB NOT NULL,
    "formulas" JSONB NOT NULL,
    "evaluation_scales" JSONB NOT NULL,
    "work_items" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "issue_hierarchy" JSONB NOT NULL,
    "report_lines" JSONB NOT NULL,
    "aggregates" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "is_success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" TIMESTAMP(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheets" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_rows" (
    "id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "issue_id_readable" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'plan',
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "manager_grade" TEXT NOT NULL DEFAULT 'none',
    "business_grade" TEXT NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_status_transitions" (
    "id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_status_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_row_changes" (
    "id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "row_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "from_value" TEXT NOT NULL,
    "to_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timesheet_row_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_ad_login_idx" ON "users"("ad_login");

-- CreateIndex
CREATE INDEX "users_youtrack_login_idx" ON "users"("youtrack_login");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_roles_name_key" ON "work_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "employee_profiles_manager_id_idx" ON "employee_profiles"("manager_id");

-- CreateIndex
CREATE INDEX "employee_profiles_work_role_id_idx" ON "employee_profiles"("work_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "reporting_periods_month_year_idx" ON "reporting_periods"("month", "year");

-- CreateIndex
CREATE INDEX "reporting_periods_state_idx" ON "reporting_periods"("state");

-- CreateIndex
CREATE INDEX "reporting_periods_year_month_state_idx" ON "reporting_periods"("year", "month", "state");

-- CreateIndex
CREATE INDEX "period_transitions_period_id_idx" ON "period_transitions"("period_id");

-- CreateIndex
CREATE INDEX "sprint_plans_period_id_idx" ON "sprint_plans"("period_id");

-- CreateIndex
CREATE INDEX "sprint_plans_period_id_version_number_idx" ON "sprint_plans"("period_id", "version_number");

-- CreateIndex
CREATE INDEX "sprint_plan_versions_sprint_plan_id_idx" ON "sprint_plan_versions"("sprint_plan_id");

-- CreateIndex
CREATE INDEX "planned_tasks_sprint_plan_id_idx" ON "planned_tasks"("sprint_plan_id");

-- CreateIndex
CREATE INDEX "planned_tasks_assignee_id_idx" ON "planned_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "planned_tasks_youtrack_issue_id_idx" ON "planned_tasks"("youtrack_issue_id");

-- CreateIndex
CREATE UNIQUE INDEX "youtrack_issues_youtrack_id_key" ON "youtrack_issues"("youtrack_id");

-- CreateIndex
CREATE INDEX "youtrack_issues_project_name_idx" ON "youtrack_issues"("project_name");

-- CreateIndex
CREATE INDEX "youtrack_issues_system_name_idx" ON "youtrack_issues"("system_name");

-- CreateIndex
CREATE INDEX "youtrack_issues_assignee_id_idx" ON "youtrack_issues"("assignee_id");

-- CreateIndex
CREATE INDEX "youtrack_issues_parent_issue_id_idx" ON "youtrack_issues"("parent_issue_id");

-- CreateIndex
CREATE INDEX "youtrack_issues_is_resolved_idx" ON "youtrack_issues"("is_resolved");

-- CreateIndex
CREATE INDEX "work_items_issue_id_idx" ON "work_items"("issue_id");

-- CreateIndex
CREATE INDEX "work_items_period_id_idx" ON "work_items"("period_id");

-- CreateIndex
CREATE INDEX "work_items_author_id_idx" ON "work_items"("author_id");

-- CreateIndex
CREATE INDEX "work_items_period_id_author_id_idx" ON "work_items"("period_id", "author_id");

-- CreateIndex
CREATE INDEX "sync_runs_status_idx" ON "sync_runs"("status");

-- CreateIndex
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs"("started_at");

-- CreateIndex
CREATE INDEX "sync_log_entries_sync_run_id_idx" ON "sync_log_entries"("sync_run_id");

-- CreateIndex
CREATE INDEX "manager_evaluations_period_id_idx" ON "manager_evaluations"("period_id");

-- CreateIndex
CREATE INDEX "manager_evaluations_user_id_idx" ON "manager_evaluations"("user_id");

-- CreateIndex
CREATE INDEX "manager_evaluations_period_id_user_id_idx" ON "manager_evaluations"("period_id", "user_id");

-- CreateIndex
CREATE INDEX "business_evaluations_period_id_idx" ON "business_evaluations"("period_id");

-- CreateIndex
CREATE INDEX "business_evaluations_youtrack_issue_id_idx" ON "business_evaluations"("youtrack_issue_id");

-- CreateIndex
CREATE INDEX "personal_reports_period_id_idx" ON "personal_reports"("period_id");

-- CreateIndex
CREATE INDEX "personal_reports_user_id_idx" ON "personal_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_reports_period_id_user_id_key" ON "personal_reports"("period_id", "user_id");

-- CreateIndex
CREATE INDEX "personal_report_lines_personal_report_id_idx" ON "personal_report_lines"("personal_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "period_summary_reports_period_id_key" ON "period_summary_reports"("period_id");

-- CreateIndex
CREATE INDEX "employee_rate_history_user_id_idx" ON "employee_rate_history"("user_id");

-- CreateIndex
CREATE INDEX "employee_rate_history_effective_from_idx" ON "employee_rate_history"("effective_from");

-- CreateIndex
CREATE INDEX "employee_rate_history_user_id_effective_from_idx" ON "employee_rate_history"("user_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "formula_configurations_name_key" ON "formula_configurations"("name");

-- CreateIndex
CREATE INDEX "formula_configuration_versions_formula_id_idx" ON "formula_configuration_versions"("formula_id");

-- CreateIndex
CREATE INDEX "evaluation_scales_scale_type_idx" ON "evaluation_scales"("scale_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_event_name_key" ON "notification_templates"("event_name");

-- CreateIndex
CREATE INDEX "notification_runs_status_idx" ON "notification_runs"("status");

-- CreateIndex
CREATE INDEX "notification_runs_created_at_idx" ON "notification_runs"("created_at");

-- CreateIndex
CREATE INDEX "outbox_messages_status_scheduled_at_idx" ON "outbox_messages"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "outbox_messages_aggregate_id_aggregate_type_idx" ON "outbox_messages"("aggregate_id", "aggregate_type");

-- CreateIndex
CREATE INDEX "outbox_messages_created_at_idx" ON "outbox_messages"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "period_snapshots_period_id_key" ON "period_snapshots"("period_id");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions"("user_id");

-- CreateIndex
CREATE INDEX "refresh_sessions_refresh_token_hash_idx" ON "refresh_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "login_attempts_login_attempted_at_idx" ON "login_attempts"("login", "attempted_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_attempted_at_idx" ON "login_attempts"("ip_address", "attempted_at");

-- CreateIndex
CREATE INDEX "login_attempts_attempted_at_idx" ON "login_attempts"("attempted_at");

-- CreateIndex
CREATE INDEX "timesheets_employee_id_idx" ON "timesheets"("employee_id");

-- CreateIndex
CREATE INDEX "timesheets_year_month_idx" ON "timesheets"("year", "month");

-- CreateIndex
CREATE INDEX "timesheets_status_idx" ON "timesheets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "timesheets_employee_id_year_month_key" ON "timesheets"("employee_id", "year", "month");

-- CreateIndex
CREATE INDEX "timesheet_rows_timesheet_id_idx" ON "timesheet_rows"("timesheet_id");

-- CreateIndex
CREATE INDEX "timesheet_status_transitions_timesheet_id_idx" ON "timesheet_status_transitions"("timesheet_id");

-- CreateIndex
CREATE INDEX "timesheet_row_changes_timesheet_id_idx" ON "timesheet_row_changes"("timesheet_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_work_role_id_fkey" FOREIGN KEY ("work_role_id") REFERENCES "work_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_periods" ADD CONSTRAINT "reporting_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_transitions" ADD CONSTRAINT "period_transitions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_plans" ADD CONSTRAINT "sprint_plans_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprint_plan_versions" ADD CONSTRAINT "sprint_plan_versions_sprint_plan_id_fkey" FOREIGN KEY ("sprint_plan_id") REFERENCES "sprint_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_tasks" ADD CONSTRAINT "planned_tasks_sprint_plan_id_fkey" FOREIGN KEY ("sprint_plan_id") REFERENCES "sprint_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_tasks" ADD CONSTRAINT "planned_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtrack_issues" ADD CONSTRAINT "youtrack_issues_parent_issue_id_fkey" FOREIGN KEY ("parent_issue_id") REFERENCES "youtrack_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "youtrack_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_log_entries" ADD CONSTRAINT "sync_log_entries_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "sync_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_evaluations" ADD CONSTRAINT "manager_evaluations_evaluated_by_id_fkey" FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_evaluations" ADD CONSTRAINT "business_evaluations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_evaluations" ADD CONSTRAINT "business_evaluations_evaluated_by_id_fkey" FOREIGN KEY ("evaluated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_reports" ADD CONSTRAINT "personal_reports_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_reports" ADD CONSTRAINT "personal_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_report_lines" ADD CONSTRAINT "personal_report_lines_personal_report_id_fkey" FOREIGN KEY ("personal_report_id") REFERENCES "personal_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_summary_reports" ADD CONSTRAINT "period_summary_reports_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_rate_history" ADD CONSTRAINT "employee_rate_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_configuration_versions" ADD CONSTRAINT "formula_configuration_versions_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "formula_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_runs" ADD CONSTRAINT "notification_runs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_rows" ADD CONSTRAINT "timesheet_rows_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_status_transitions" ADD CONSTRAINT "timesheet_status_transitions_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_row_changes" ADD CONSTRAINT "timesheet_row_changes_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
