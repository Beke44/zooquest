// Isolated PostgreSQL/WASM checks. Install @electric-sql/pglite separately,
// then: node scripts/check-community.mjs /absolute/path/to/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;`)
await db.exec(await readFile(new URL('../supabase/community.sql',import.meta.url),'utf8'))
const author = randomUUID()
await db.query('insert into auth.users values ($1)',[author])
await db.query("select set_config('app.user_id',$1,false)",[author])
const result = await db.query("select public.submit_community('budapest','tip','Useful tip','A firsthand visitor tip for testing.') id")
const id = result.rows[0].id
await assert.rejects(db.query('select public.confirm_community($1)',[id]), /Cannot confirm own/)
for (let i=0;i<10;i++) {
 const voter = randomUUID()
 await db.query('insert into auth.users values ($1)',[voter])
 await db.query("select set_config('app.user_id',$1,false)",[voter])
 await db.query('select public.confirm_community($1)',[id])
 await db.query('select public.confirm_community($1)',[id])
 const feed = await db.query('select confirmations,active from public.community_feed where id=$1',[id])
 assert.equal(feed.rows[0].confirmations,i+1,'duplicate vote must not count twice')
 assert.equal(feed.rows[0].active,i===9,'activation occurs exactly at ten')
}
await db.exec('set role authenticated')
assert.equal((await db.query('select count(*)::int n from public.community_feed')).rows[0].n,1)
await assert.rejects(db.query('select * from public.community_confirmations'),/permission denied/)
await assert.rejects(db.query("insert into public.community_entries(park_id,author_id,kind,title,body) values ('x',$1,'idea','Bad','Untrusted direct insertion')",[author]),/permission denied/)
await db.exec('reset role')
await db.query("select set_config('app.user_id','',false)")
await assert.rejects(db.query('select public.confirm_community($1)',[id]),/Authentication required/)
await assert.rejects(db.query("select public.submit_community('budapest','tip','Test','Missing authentication')"),/Authentication required/)
await db.close()
console.log('PASS: ten-account activation, duplicate votes, self-votes, private identities, direct-write denial and authentication.')
