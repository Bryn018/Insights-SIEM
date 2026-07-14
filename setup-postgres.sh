#!/usr/bin/env bash
# setup-postgres.sh — provision a real PostgreSQL backend for Insights SIEM (P0).
# Idempotent-ish: safe to re-run. Assumes Debian/Ubuntu (Parrot, Kali, etc.).
set -euo pipefail

DB_NAME="siem"
DB_USER="siem"
DB_PASS="$(openssl rand -hex 16)"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_VERSION="${PG_VERSION:-17}"

echo "==> Installing PostgreSQL $PG_VERSION"
if command -v pg_ctlcluster >/dev/null 2>&1 || command -v postgres >/dev/null 2>&1; then
  echo "    PostgreSQL already present, skipping install."
else
  sudo apt-get update -y
  sudo apt-get install -y "postgresql-$PG_VERSION" "postgresql-client-$PG_VERSION"
fi

echo "==> Starting PostgreSQL"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || sudo service postgresql start 2>/dev/null || true

# Wait for the cluster to accept connections
for i in $(seq 1 30); do
  if sudo -u postgres psql -c '\l' >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "==> Creating role + database ($DB_USER / $DB_NAME)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$DB_USER') THEN
    CREATE ROLE "$DB_USER" LOGIN PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" || true

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

echo "==> Writing DATABASE_URL to $APP_DIR/.env (Postgres)"
# Preserve NEXTAUTH_SECRET if present, else generate one.
if grep -q '^NEXTAUTH_SECRET=' "$APP_DIR/.env" 2>/dev/null; then
  SECRET="$(grep '^NEXTAUTH_SECRET=' "$APP_DIR/.env" | cut -d= -f2-)"
else
  SECRET="$(openssl rand -hex 32)"
fi
# Replace or append DATABASE_URL + NEXTAUTH_SECRET
grep -v -E '^(DATABASE_URL|NEXTAUTH_SECRET)=' "$APP_DIR/.env" > "$APP_DIR/.env.tmp" 2>/dev/null || true
cat >> "$APP_DIR/.env.tmp" <<EOF
DATABASE_URL=$DATABASE_URL
NEXTAUTH_SECRET=$SECRET
EOF
mv "$APP_DIR/.env.tmp" "$APP_DIR/.env"

echo "==> Running Prisma migrate (creates schema)"
cd "$APP_DIR"
export DATABASE_URL
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate

echo "==> Creating initial admin user (NO demo seed)"
node -e "
const {PrismaClient}=require('@prisma/client');
const crypto=require('crypto');
const db=new PrismaClient();
const KEYLEN=64,N=16384,R=8,Pp=1;
function hash(p){const s=crypto.randomBytes(16);const h=crypto.scryptSync(p,s,KEYLEN,{N,r:R,p:Pp});return 'scrypt\$'+N+'\$'+s.toString('hex')+'\$'+h.toString('hex');}
(async()=>{
  const email='admin@insights.local';
  const existing=await db.user.findUnique({where:{email}}).catch(()=>null);
  if(existing){console.log('admin already exists:',email);await db.\$disconnect();process.exit(0);}
  const pw=process.env.ADMIN_PASSWORD||'ChangeMe!'+crypto.randomBytes(4).toString('hex');
  await db.user.create({data:{email,name:'Administrator',passwordHash:hash(pw),role:'admin',isActive:true}});
  console.log('CREATED admin user:',email);
  console.log('TEMPORARY PASSWORD:',pw);
  console.log('CHANGE IT AFTER FIRST LOGIN.');
  await db.\$disconnect();
})();
"

echo "==> Done. Start the app: cd $APP_DIR && npm run build && npm run start"
echo "    Then open http://localhost:3000 and sign in with the admin above."
