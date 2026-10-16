// Charge les variables du fichier .env s'il existe (Node 20.12+).
// Importé en premier par server.js pour que les autres modules voient la clé.
try {
  process.loadEnvFile();
} catch {}
