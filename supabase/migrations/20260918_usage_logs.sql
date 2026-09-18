-- 使用统计表：记录每次 AI 使用（谁、什么功能、哪个模型、什么时候）
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴执行

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  -- 谁（关联 auth 用户，用户被删除时置空保留统计）
  user_id uuid references auth.users(id) on delete set null,
  -- 什么功能：视频分析 / 从零创作 / 参考生成
  feature text not null check (feature in ('analyze', 'create', 'reference')),
  -- 用的哪个模型（模型 ID，如 qwen3.8-flash）
  model_id text not null,
  -- 什么时候
  created_at timestamptz not null default now()
);

-- 查询索引：按时间倒序查、按用户查、按功能聚合
create index if not exists usage_logs_created_at_idx on public.usage_logs (created_at desc);
create index if not exists usage_logs_user_id_idx on public.usage_logs (user_id);
create index if not exists usage_logs_feature_idx on public.usage_logs (feature);

-- 行级安全：匿名一律拒绝
alter table public.usage_logs enable row level security;

-- 登录用户只能插入自己的记录（统计上报）
drop policy if exists "users can insert own usage logs" on public.usage_logs;
create policy "users can insert own usage logs"
  on public.usage_logs
  for insert
  with check (auth.uid() = user_id);

-- 不开放 select/update/delete 给前端：
-- 统计数据仅通过 Supabase Dashboard（Table Editor / SQL）查看
