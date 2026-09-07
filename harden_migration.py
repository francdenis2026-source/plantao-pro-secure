#!/usr/bin/env python3
"""Harden the migration file: add GRANTs after every CREATE TABLE and
remove public/anonymous SELECT policies."""
import re
from pathlib import Path

FILE = Path(__file__).parent / "supabase_migration_complete.sql"
text = FILE.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1. GRANT blocks to insert after each CREATE TABLE public.<table>(...);
# ---------------------------------------------------------------------------
RESTRICTED_TABLES = {"master_admin", "master_session_tokens", "login_attempts"}

def grant_block(table: str) -> str:
    if table == "user_roles":
        # user_roles is read by the has_role security definer; keep SELECT only.
        return (
            f"\nGRANT SELECT ON public.{table} TO authenticated;\n"
            f"GRANT ALL ON public.{table} TO service_role;\n"
        )
    if table in RESTRICTED_TABLES:
        # No direct authenticated access; edge functions use service_role.
        return f"\nGRANT ALL ON public.{table} TO service_role;\n"
    return (
        f"\nGRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO authenticated;\n"
        f"GRANT ALL ON public.{table} TO service_role;\n"
    )

# Match CREATE TABLE public.<name> ( ... );
pattern = re.compile(r"CREATE TABLE public\.(\w+) \((.*?)\);", re.DOTALL)

def replacer(m: re.Match) -> str:
    table = m.group(1)
    return m.group(0) + grant_block(table)

text = pattern.sub(replacer, text)

# ---------------------------------------------------------------------------
# 2. Replace public/anonymous SELECT policies with authenticated-only ones.
# ---------------------------------------------------------------------------
policy_fixes = [
    (
        'CREATE POLICY "Units are viewable by everyone" ON public.units FOR SELECT USING (true);\n',
        "",
    ),
    (
        'CREATE POLICY "Allow public CPF lookup" ON public.agents FOR SELECT USING (true);\n',
        "",
    ),
    (
        'CREATE POLICY "Authenticated users can view all agents" ON public.agents FOR SELECT USING (true);\n',
        'CREATE POLICY "Authenticated users can view agents" ON public.agents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);\n',
    ),
    (
        'CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);\n',
        'CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);\n',
    ),
    (
        'CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);\n',
        'CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);\n',
    ),
    (
        'CREATE POLICY "Anyone can view overtime" ON public.overtime_bank FOR SELECT USING (true);\n',
        'CREATE POLICY "Authenticated users can view overtime" ON public.overtime_bank FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);\n',
    ),
    (
        'CREATE POLICY "Anyone can view transfer requests" ON public.transfer_requests FOR SELECT USING (true);\n',
        'CREATE POLICY "Authenticated users can view transfer requests" ON public.transfer_requests FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);\n',
    ),
]

for old, new in policy_fixes:
    if old not in text:
        print(f"WARNING: expected policy not found:\n{old[:80]}")
    text = text.replace(old, new)

# ---------------------------------------------------------------------------
# 3. Add a header note about GRANTs.
# ---------------------------------------------------------------------------
header = (
    "-- =============================================================================\n"
    "-- NOTA DE SEGURANÇA: GRANTs são obrigatórios após cada CREATE TABLE no schema\n"
    "-- public. Sem eles, a Data API (PostgREST) retorna erro de permissão.\n"
    "-- =============================================================================\n\n"
)
if header not in text:
    text = header + text

FILE.write_text(text, encoding="utf-8")
print("Migration hardened successfully.")
