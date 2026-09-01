-- ============================================================
-- ClinicFlow — Supabase schema
-- ============================================================
-- الصق هذا الملف كامل في Supabase Dashboard → SQL Editor → New query → Run
-- بينشئ: الجداول، الحماية (Row Level Security) لعزل بيانات كل عيادة،
-- ودوال حساب موعد الولادة وعمر الحمل تلقائيًا.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) العيادات والفروع
-- ------------------------------------------------------------

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) المستخدمون: ملف شخصي مرتبط بحساب Supabase Auth
-- ------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  full_name text not null,
  role text not null default 'receptionist' check (role in ('admin','doctor','receptionist','nurse')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- دالة مساعدة: تُرجع clinic_id للمستخدم الحالي المسجّل دخوله
create or replace function current_clinic_id()
returns uuid
language sql
security definer
stable
as $$
  select clinic_id from profiles where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- 3) المرضى
-- ------------------------------------------------------------

create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  branch_id uuid not null references branches(id),
  patient_number text not null,
  national_id text,
  name text not null,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  address text,
  emergency_contact text,
  allergies text,
  chronic_conditions text,
  insurance_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, patient_number)
);

-- توليد رقم ملف تلقائي داخل كل عيادة (CL0001, CL0002 ...)
create or replace function set_patient_number()
returns trigger
language plpgsql
as $$
declare
  next_num integer;
begin
  select count(*) + 1 into next_num from patients where clinic_id = new.clinic_id;
  new.patient_number := 'CL' || lpad(next_num::text, 6, '0');
  return new;
end;
$$;

create trigger trg_set_patient_number
before insert on patients
for each row
when (new.patient_number is null or new.patient_number = '')
execute function set_patient_number();

-- ------------------------------------------------------------
-- 4) المواعيد والزيارات والوصفات والفواتير
-- ------------------------------------------------------------

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  branch_id uuid not null references branches(id),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz,
  status text not null default 'booked' check (status in ('booked','arrived','completed','cancelled','no_show')),
  type text not null default 'followup',
  notes text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  appointment_id uuid references appointments(id),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references profiles(id),
  chief_complaint text not null,
  history text,
  examination text,
  diagnosis text,
  plan text,
  bp_systolic numeric,
  bp_diastolic numeric,
  heart_rate numeric,
  temperature numeric,
  weight numeric,
  height numeric,
  followup_date date,
  created_at timestamptz not null default now()
);

create table prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits(id) on delete cascade,
  drug_name text not null,
  strength text,
  form text,
  dose text,
  frequency text,
  duration_days integer,
  instructions text,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  visit_id uuid references visits(id),
  total_amount numeric not null default 0,
  discount numeric not null default 0,
  tax numeric not null default 0,
  grand_total numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','issued','paid','partially_paid','cancelled')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) وحدة الحمل والتوليد
-- ------------------------------------------------------------

create table pregnancies (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  lmp_date date,
  edd_date date,
  edd_source text default 'lmp',
  gravida integer,
  para integer,
  abortions integer,
  is_multiple boolean not null default false,
  risk_factors text,
  blood_group text,
  status text not null default 'active' check (status in ('active','delivered','miscarried','terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- حساب موعد الولادة تلقائيًا من تاريخ آخر دورة (قاعدة Naegele: LMP + 280 يوم)
create or replace function set_pregnancy_edd()
returns trigger
language plpgsql
as $$
begin
  if new.edd_date is null and new.lmp_date is not null then
    new.edd_date := new.lmp_date + interval '280 days';
    new.edd_source := 'lmp';
  end if;
  return new;
end;
$$;

create trigger trg_set_pregnancy_edd
before insert or update on pregnancies
for each row
execute function set_pregnancy_edd();

create table anc_visits (
  id uuid primary key default gen_random_uuid(),
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  visit_id uuid references visits(id),
  doctor_id uuid not null references profiles(id),
  visit_date timestamptz not null default now(),
  gestational_age_weeks integer,
  gestational_age_days integer,
  weight numeric,
  bp_systolic numeric,
  bp_diastolic numeric,
  urine_protein text,
  fundal_height_cm numeric,
  fetal_heart_rate integer,
  fetal_presentation text,
  bpd_mm numeric,
  hc_mm numeric,
  ac_mm numeric,
  fl_mm numeric,
  efw_grams numeric,
  notes text,
  next_visit_date date,
  created_at timestamptz not null default now()
);

-- حساب عمر الحمل بالأسابيع والأيام تلقائيًا وقت تسجيل كل زيارة متابعة
create or replace function set_anc_gestational_age()
returns trigger
language plpgsql
as $$
declare
  p_lmp date;
  delta_days integer;
begin
  select lmp_date into p_lmp from pregnancies where id = new.pregnancy_id;
  if p_lmp is not null then
    delta_days := (new.visit_date::date - p_lmp);
    if delta_days >= 0 then
      new.gestational_age_weeks := delta_days / 7;
      new.gestational_age_days := delta_days % 7;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_set_anc_ga
before insert on anc_visits
for each row
execute function set_anc_gestational_age();

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  delivery_date timestamptz,
  delivery_type text,
  hospital text,
  complications text,
  baby_gender text,
  baby_weight_grams numeric,
  baby_apgar_1min integer,
  baby_apgar_5min integer,
  notes text,
  created_at timestamptz not null default now()
);

-- عند تسجيل الولادة، اقفل ملف الحمل تلقائيًا
create or replace function close_pregnancy_on_delivery()
returns trigger
language plpgsql
as $$
begin
  update pregnancies set status = 'delivered', updated_at = now() where id = new.pregnancy_id;
  return new;
end;
$$;

create trigger trg_close_pregnancy
after insert on deliveries
for each row
execute function close_pregnancy_on_delivery();

-- عرض (view) جاهز: كل حالات الحمل النشطة مع عمر الحمل المحسوب لحظيًا
create view active_pregnancies_view as
select
  p.*,
  case when p.lmp_date is not null then (current_date - p.lmp_date) / 7 else null end as current_ga_weeks,
  case when p.lmp_date is not null then (current_date - p.lmp_date) % 7 else null end as current_ga_days
from pregnancies p
where p.status = 'active';

-- ------------------------------------------------------------
-- 6) وحدة متابعة الأمراض المزمنة (السكر والضغط)
-- ------------------------------------------------------------

create table chronic_conditions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  condition_name text not null,
  icd10_code text,
  diagnosed_date date,
  status text not null default 'active' check (status in ('active','controlled','resolved')),
  target_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vital_readings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  chronic_condition_id uuid references chronic_conditions(id),
  recorded_by uuid references profiles(id),
  reading_type text not null check (reading_type in ('blood_pressure','blood_glucose','weight','hba1c','cholesterol','other')),
  reading_date timestamptz not null default now(),
  systolic numeric,
  diastolic numeric,
  glucose_value numeric,
  glucose_unit text,
  glucose_context text check (glucose_context in ('fasting','postprandial','random','hba1c') or glucose_context is null),
  value numeric,
  unit text,
  is_abnormal text,
  notes text,
  created_at timestamptz not null default now()
);

-- تصنيف تلقائي بسيط للقراءة (تنبيه للموظف فقط، لا يُغني عن قرار الطبيب)
create or replace function assess_vital_reading()
returns trigger
language plpgsql
as $$
begin
  if new.reading_type = 'blood_pressure' and new.systolic is not null and new.diastolic is not null then
    if new.systolic >= 180 or new.diastolic >= 120 then
      new.is_abnormal := 'critical';
    elsif new.systolic >= 140 or new.diastolic >= 90 then
      new.is_abnormal := 'high';
    elsif new.systolic < 90 or new.diastolic < 60 then
      new.is_abnormal := 'low';
    else
      new.is_abnormal := 'normal';
    end if;
  elsif new.reading_type = 'blood_glucose' and new.glucose_value is not null then
    if coalesce(new.glucose_context, 'random') = 'fasting' then
      if new.glucose_value >= 126 then new.is_abnormal := 'high';
      elsif new.glucose_value < 70 then new.is_abnormal := 'low';
      else new.is_abnormal := 'normal'; end if;
    elsif new.glucose_context = 'postprandial' then
      if new.glucose_value >= 200 then new.is_abnormal := 'high';
      elsif new.glucose_value < 70 then new.is_abnormal := 'low';
      else new.is_abnormal := 'normal'; end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_assess_vital
before insert on vital_readings
for each row
execute function assess_vital_reading();

-- ------------------------------------------------------------
-- 7) سجل التدقيق (Audit Log)
-- ------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8) الحماية: Row Level Security (عزل بيانات كل عيادة)
-- ============================================================
-- القاعدة العامة: أي مستخدم لا يقدر يشوف أو يعدّل إلا صفوف
-- clinic_id بتاعته هو (المأخوذة من ملفه الشخصي profiles).

alter table clinics enable row level security;
alter table branches enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table visits enable row level security;
alter table prescriptions enable row level security;
alter table invoices enable row level security;
alter table pregnancies enable row level security;
alter table anc_visits enable row level security;
alter table deliveries enable row level security;
alter table chronic_conditions enable row level security;
alter table vital_readings enable row level security;
alter table audit_logs enable row level security;

-- clinics: يشوف المستخدم عيادته بس
create policy "clinic_select_own" on clinics for select
  using (id = current_clinic_id());

-- profiles: يشوف زملاءه في نفس العيادة، ويعدّل بياناته هو بس
create policy "profiles_select_same_clinic" on profiles for select
  using (clinic_id = current_clinic_id());
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid());

-- branches
create policy "branches_all_same_clinic" on branches for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- patients
create policy "patients_all_same_clinic" on patients for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- appointments
create policy "appointments_all_same_clinic" on appointments for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- visits
create policy "visits_all_same_clinic" on visits for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- prescriptions (عبر ربط الزيارة بالعيادة)
create policy "prescriptions_all_same_clinic" on prescriptions for all
  using (exists (select 1 from visits v where v.id = visit_id and v.clinic_id = current_clinic_id()))
  with check (exists (select 1 from visits v where v.id = visit_id and v.clinic_id = current_clinic_id()));

-- invoices
create policy "invoices_all_same_clinic" on invoices for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- pregnancies
create policy "pregnancies_all_same_clinic" on pregnancies for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- anc_visits (عبر ربط ملف الحمل بالعيادة)
create policy "anc_visits_all_same_clinic" on anc_visits for all
  using (exists (select 1 from pregnancies p where p.id = pregnancy_id and p.clinic_id = current_clinic_id()))
  with check (exists (select 1 from pregnancies p where p.id = pregnancy_id and p.clinic_id = current_clinic_id()));

-- deliveries
create policy "deliveries_all_same_clinic" on deliveries for all
  using (exists (select 1 from pregnancies p where p.id = pregnancy_id and p.clinic_id = current_clinic_id()))
  with check (exists (select 1 from pregnancies p where p.id = pregnancy_id and p.clinic_id = current_clinic_id()));

-- chronic_conditions
create policy "chronic_conditions_all_same_clinic" on chronic_conditions for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- vital_readings
create policy "vital_readings_all_same_clinic" on vital_readings for all
  using (clinic_id = current_clinic_id())
  with check (clinic_id = current_clinic_id());

-- audit_logs: قراءة فقط لأعضاء نفس العيادة، الكتابة عبر الدالة أدناه
create policy "audit_logs_select_same_clinic" on audit_logs for select
  using (clinic_id = current_clinic_id());
create policy "audit_logs_insert_same_clinic" on audit_logs for insert
  with check (clinic_id = current_clinic_id());

-- ============================================================
-- 9) دالة إنشاء عيادة جديدة (أول تسجيل)
-- ============================================================
-- تُستدعى من الفرونت إند بعد نجاح supabase.auth.signUp()
-- بتنشئ العيادة + فرع رئيسي + الملف الشخصي (admin) لصاحب الحساب دفعة واحدة.

create or replace function register_clinic(
  p_clinic_name text,
  p_admin_full_name text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_clinic_id uuid;
  v_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'لديك عيادة مسجّلة بالفعل';
  end if;

  insert into clinics (name) values (p_clinic_name) returning id into v_clinic_id;
  insert into branches (clinic_id, name) values (v_clinic_id, 'الفرع الرئيسي') returning id into v_branch_id;
  insert into profiles (id, clinic_id, full_name, role)
    values (auth.uid(), v_clinic_id, p_admin_full_name, 'admin');

  return v_clinic_id;
end;
$$;

-- ============================================================
-- انتهى. الخطوة التالية: أنشئ مستخدم أول من صفحة التسجيل في الفرونت إند.
-- ============================================================
