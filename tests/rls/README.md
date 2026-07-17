# RLS tests

Row Level Security is the project's authorization backbone, so it is tested two
ways.

## 1. Fast local harness (no cloud, deterministic)

`shim.sql` recreates just enough of Supabase (`auth.users`, `auth.uid()`,
`storage.objects`, the `anon` / `authenticated` / `service_role` roles) on a
vanilla Postgres instance. `auth.uid()` reads a session GUC (`test.user_id`) so
we can impersonate any actor with `SET ROLE authenticated; SET test.user_id = '<uuid>'`.

```bash
# from a machine with postgres installed
initdb -D /tmp/pg/data -U postgres --auth=trust
pg_ctl -D /tmp/pg/data -o "-k /tmp/pg -p 5433 -c listen_addresses=" start
PSQL="psql -h /tmp/pg -p 5433 -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f shim.sql
$PSQL -f ../../supabase/migrations/0001_schema.sql
$PSQL -f ../../supabase/migrations/0002_rls.sql
$PSQL -f ../../supabase/migrations/0003_storage.sql
$PSQL -c "grant select,insert,update,delete on all tables in schema public to anon, authenticated;"
$PSQL -f rls_test.sql
./assert.sh   # prints PASS/FAIL for the test-matrix authorization cases
```

`assert.sh` covers matrix items 1–7, 9, 11, 12, 15, 16, 21 and several positive
controls (anon can read public reference data; principal can read private
tables). It exits non-zero if any assertion fails, so it can gate CI.

## 2. Real Supabase (end-to-end)

The authoritative check runs against a real (preview) Supabase project using
three JWTs — anon, an approved teacher, and the principal — issued by Supabase
Auth. See `docs/TESTING_GUIDE.md`. Cases that require the service role (birthday
display without DOB, submissions from anon) are exercised through the Netlify
Functions, never by talking to the tables directly.
