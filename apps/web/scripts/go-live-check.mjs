import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const googleServicesPath = path.join(rootDir, 'android', 'app', 'google-services.json');

function parseEnv(content) {
  const rows = content.split(/\r?\n/);
  const env = {};
  for (const row of rows) {
    const line = row.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  return parseEnv(content);
}

function assertKey(result, env, key, required = true) {
  const value = env[key];
  const ok = typeof value === 'string' && value.length > 0;
  if (!ok && required) result.errors.push(`ENV manquant: ${key}`);
  if (!ok && !required) result.warnings.push(`ENV optionnel manquant: ${key}`);
  if (ok) result.passed.push(`ENV OK: ${key}`);
}

function run() {
  const env = readEnvFile();
  const result = { passed: [], warnings: [], errors: [] };

  assertKey(result, env, 'VITE_SUPABASE_URL', true);
  assertKey(result, env, 'VITE_SUPABASE_PUBLISHABLE_KEY', true);

  // Prerequis mobile push (web côté client facultatif)
  assertKey(result, env, 'VITE_FIREBASE_PROJECT_ID', false);
  assertKey(result, env, 'VITE_FIREBASE_MESSAGING_SENDER_ID', false);
  assertKey(result, env, 'VITE_FIREBASE_APP_ID', false);

  if (fs.existsSync(googleServicesPath)) {
    result.passed.push('Android OK: google-services.json présent');
  } else {
    result.warnings.push('Android: google-services.json absent (push natif FCM non opérationnel)');
  }

  const requiredFunctions = ['paystack-init', 'paystack-webhook', 'check-subscriptions', 'send-push'];
  result.passed.push(`Fonctions à déployer: ${requiredFunctions.join(', ')}`);

  console.log('\n=== KOBINA PRO • GO-LIVE CHECK ===\n');
  for (const msg of result.passed) console.log(`✅ ${msg}`);
  for (const msg of result.warnings) console.log(`⚠️  ${msg}`);
  for (const msg of result.errors) console.log(`❌ ${msg}`);

  if (result.errors.length > 0) {
    console.log('\nStatut: BLOQUANT (corriger les erreurs avant production)\n');
    process.exitCode = 1;
    return;
  }
  console.log('\nStatut: OK pour continuer la mise en production\n');
}

run();
