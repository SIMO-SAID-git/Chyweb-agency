-- Run AFTER the main migration, and AFTER creating your login user in
-- Dashboard -> Authentication -> Users -> "Add user" (email + password, tick "Auto Confirm User").
-- Replace the email below with the one you created. Run in the SQL Editor.
insert into public.profiles (id, email, name, role)
select id, email, 'Owner', 'admin' from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'
on conflict (id) do update set role = 'admin';
-- Expected: "Success. 1 row affected". If it says 0 rows, the email does not match a user in Authentication.
