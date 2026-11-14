#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = "guimacieljr/buzrr";

function docker(...args) {
  console.log(`\n> docker ${args.join(" ")}`);
  const result = spawnSync("docker", args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Docker falhou (${result.signal ?? result.status}). Publicação interrompida.`,
    );
  }
}

function validHost(host) {
  if (isIP(host)) return true;
  if (/^[\d.]+$/.test(host) || host.length > 253) return false;
  return host
    .split(".")
    .every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
}

async function main() {
  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let host;
  let version;
  try {
    host = (
      await input.question("IP ou hostname (sem protocolo ou porta): ")
    ).trim();
    if (!validHost(host))
      throw new Error(
        "Informe um IP ou hostname válido, sem protocolo, porta ou caminho.",
      );
    version = (
      await input.question("Versão para publicar (ex.: 1.0.0): ")
    ).trim();
    if (
      !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,120}$/.test(version) ||
      version.toLowerCase() === "latest"
    ) {
      throw new Error(
        "Versão inválida. Use até 121 caracteres: letras, números, ponto, hífen ou sublinhado; não use latest.",
      );
    }
  } finally {
    input.close();
  }

  const address = isIP(host) === 6 ? `[${host}]` : host;
  const webUrl = `http://${address}:3000`;
  const apiUrl = `http://${address}:3001`;
  const server = `${repository}:server-${version}`;
  const web = `${repository}:web-${version}`;
  console.log(`\nPublicando ${version}: ${webUrl} (API: ${apiUrl})`);
  docker("info");

  // Finish both builds and versioned pushes before updating moving aliases.
  docker("build", "-f", "apps/server/Dockerfile", "-t", server, ".");
  docker(
    "build",
    "-f",
    "apps/web/Dockerfile",
    "--build-arg",
    `PUBLIC_WEB_URL=${webUrl}`,
    "--build-arg",
    `PUBLIC_API_URL=${apiUrl}`,
    "-t",
    web,
    ".",
  );
  docker("push", server);
  docker("push", web);
  for (const [source, aliases] of [
    [server, ["server-latest", "server"]],
    [web, ["web-latest", "web", "latest"]],
  ]) {
    for (const alias of aliases) {
      const target = `${repository}:${alias}`;
      docker("tag", source, target);
      docker("push", target);
    }
  }

  // Preserve unrelated runtime settings in the deployment environment.
  const envPath = resolve(root, ".env.intranet");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries({
    PUBLIC_WEB_URL: webUrl,
    PUBLIC_API_URL: apiUrl,
  })) {
    const pattern = new RegExp(`^${key}=.*$`, "gm");
    env = pattern.test(env)
      ? env.replace(pattern, `${key}=${value}`)
      : `${env}${env.endsWith("\n") || !env ? "" : "\n"}${key}=${value}\n`;
  }
  writeFileSync(envPath, env);
  console.log(
    `\nPublicado: ${server} e ${web}. Aliases latest atualizados (latest = frontend).`,
  );
  console.log(".env.intranet atualizado. Para iniciar/atualizar a instalação:");
  console.log(
    "docker compose --env-file .env.intranet -f docker-compose.yml -f docker-compose.hub.yml up -d --no-build --pull always",
  );
}

main().catch((error) => {
  console.error(`\nErro: ${error.message}`);
  console.error(
    "Uploads concluídos não são revertidos; as tags são atualizadas individualmente. Corrija o erro e execute novamente.",
  );
  process.exitCode = 1;
});
