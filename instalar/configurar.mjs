// Craque da Vez: configura Supabase + Netlify a partir do seu computador.
// Não pede nenhuma senha copiada: o Supabase e o Netlify abrem no navegador
// para você clicar em "Autorizar". Rode pelo CONFIGURAR-WINDOWS.bat ou CONFIGURAR-MAC.command.

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE = 'npx -y supabase@3.2.0';
const NETLIFY = 'npx -y netlify-cli@27.20.1';
const rl = createInterface({ input: process.stdin, output: process.stdout });

const titulo = (t) => console.log(`\n=== ${t} ===\n`);
const rodar = (cmd) => execSync(cmd, { cwd: RAIZ, stdio: 'inherit', shell: true });
const capturar = (cmd) => execSync(cmd, { cwd: RAIZ, stdio: ['inherit', 'pipe', 'inherit'], shell: true }).toString();
const pausa = (msg = 'Aperte ENTER para continuar...') => rl.question(msg);

function lerJson(texto) {
  const i = Math.min(...['[', '{'].map((c) => texto.indexOf(c)).filter((n) => n >= 0));
  return JSON.parse(texto.slice(i));
}

function abrir(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  try { execSync(cmd, { stdio: 'ignore', shell: true }); } catch { /* o endereço também aparece na tela */ }
}

async function escolher(lista, rotulo) {
  if (lista.length === 1) return lista[0];
  lista.forEach((p, i) => console.log(`  ${i + 1}) ${rotulo(p)}`));
  const n = Number(await rl.question('Digite o número: '));
  return lista[n - 1] ?? escolher(lista, rotulo);
}

async function main() {
  console.log('\nCRAQUE DA VEZ — configuração automática\nHoje o destaque é você.\n');

  // 1. Supabase
  titulo('1/5 Entrar no Supabase');
  console.log('O navegador vai abrir. Entre na sua conta e clique em autorizar.');
  rodar(`${SUPABASE} login`);

  titulo('2/5 Pegar as chaves do projeto');
  const projetos = lerJson(capturar(`${SUPABASE} projects list --output-format json`));
  const lista = (Array.isArray(projetos) ? projetos : projetos.projects ?? []).map((p) => ({ ref: p.id ?? p.ref ?? p.reference_id, nome: p.name }));
  if (!lista.length) throw new Error('Nenhum projeto encontrado no Supabase. Crie o projeto craque-da-vez em supabase.com e rode de novo.');
  const candidatos = lista.filter((p) => /craque/i.test(p.nome));
  console.log('Projeto do Craque da Vez:');
  const projeto = await escolher(candidatos.length ? candidatos : lista, (p) => `${p.nome} (${p.ref})`);
  const url = `https://${projeto.ref}.supabase.co`;

  const chaves = lerJson(capturar(`${SUPABASE} projects api-keys --remote=${projeto.ref} --output-format json`));
  const arr = Array.isArray(chaves) ? chaves : chaves.keys ?? chaves.api_keys ?? [];
  const anon =
    arr.find((k) => k.name === 'anon')?.api_key ??
    arr.find((k) => /publishable/i.test(`${k.type} ${k.name}`))?.api_key;
  if (!anon) throw new Error('Não achei a chave anon/publishable do projeto.');
  console.log(`Projeto: ${projeto.nome}\nURL: ${url}\nChave pública: ok`);

  // 3. Banco: confere as tabelas e cria se faltarem
  titulo('3/5 Conferir o banco de dados');
  const teste = await fetch(`${url}/rest/v1/times?select=id&limit=1`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
  if (teste.ok) {
    console.log('As tabelas já existem. Nada a fazer.');
  } else {
    console.log('As tabelas ainda não foram criadas. Vou criá-las agora.');
    const senha = await rl.question('Digite a senha do BANCO que você criou junto com o projeto (Database password): ');
    rodar(`${SUPABASE} db push --remote=${projeto.ref} -p "${senha}" --yes`);
    console.log('Tabelas criadas.');
  }

  // 4. Netlify
  titulo('4/5 Publicar no Netlify');
  writeFileSync(join(RAIZ, '.env.local'), `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\n`);
  console.log('Instalando e montando o app (pode levar 1 a 2 minutos)...');
  rodar('npm install --no-audit --no-fund');
  rodar('npm run build');
  console.log('\nO navegador vai abrir. Entre no Netlify e clique em "Authorize".');
  rodar(`${NETLIFY} login`);

  if (!existsSync(join(RAIZ, '.netlify', 'state.json'))) {
    console.log('\nCriando o site. Se perguntar o "team", escolha o seu e aperte ENTER.');
    console.log('Se o nome craque-da-vez já estiver em uso, digite outro (ex.: craque-da-vez-miguel).');
    rodar(`${NETLIFY} sites:create --name craque-da-vez`);
  }
  const saida = capturar(`${NETLIFY} deploy --prod --no-build --dir dist --json`);
  const deploy = lerJson(saida);
  const site = (deploy.url ?? deploy.site_url ?? deploy.deploy_url ?? '').replace(/\/$/, '');
  rodar(`${NETLIFY} env:set VITE_SUPABASE_URL "${url}"`);
  rodar(`${NETLIFY} env:set VITE_SUPABASE_ANON_KEY "${anon}"`);

  // 5. Supabase: endereço de login
  titulo('5/5 Ligar o login ao endereço do app');
  console.log(`Vou abrir a página "URL Configuration" do Supabase. Faça assim:\n`);
  console.log(`  Site URL ............ ${site}`);
  console.log(`  Redirect URLs ....... clique em "Add URL" e cole: ${site}/**`);
  console.log(`\nDepois clique em "Save".`);
  abrir(`https://supabase.com/dashboard/project/${projeto.ref}/auth/url-configuration`);
  await pausa('\nQuando salvar, aperte ENTER...');

  const resumo = `CRAQUE DA VEZ — configuração\n\nEndereço do app: ${site}\nSupabase: ${url}\nProjeto: ${projeto.nome} (${projeto.ref})\n\nPara atualizar o app depois, rode este configurador de novo.\n`;
  writeFileSync(join(RAIZ, 'RESULTADO.txt'), resumo);
  titulo('Pronto!');
  console.log(resumo);
  abrir(site);
}

main()
  .catch((e) => {
    console.error(`\nAlgo deu errado: ${e.message}\nTire um print desta tela e mande para o Claude.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pausa('\nAperte ENTER para fechar.');
    rl.close();
  });
