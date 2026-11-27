import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rodape } from '../components/Comuns';
import { Logo } from '../components/Logo';

type Sistema = 'android' | 'iphone' | 'computador';

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectar(): Sistema {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'computador';
}

const ENDERECO = 'craquedavez.vercel.app';

/** Passo a passo para instalar o app no celular ou no computador. Página aberta, sem login. */
export function Instalar() {
  const [sistema, setSistema] = useState<Sistema>(detectar);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalado, setInstalado] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false);

  useEffect(() => {
    const pegar = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const pronto = () => setInstalado(true);
    window.addEventListener('beforeinstallprompt', pegar);
    window.addEventListener('appinstalled', pronto);
    return () => { window.removeEventListener('beforeinstallprompt', pegar); window.removeEventListener('appinstalled', pronto); };
  }, []);

  async function instalarAgora() {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === 'accepted') setInstalado(true);
    setEvento(null);
  }

  return (
    <main className="tela sem-menu">
      <Logo compacto />
      <h1 style={{ textAlign: 'center' }}>Instale o Craque da Vez</h1>
      <p className="muted" style={{ textAlign: 'center' }}>
        É grátis e não precisa de loja de aplicativos. O ícone fica na tela do celular e o app abre em tela cheia.
      </p>

      {instalado ? (
        <div className="cartao" style={{ textAlign: 'center', borderColor: 'var(--vitoria)' }}>
          <b>✅ O app já está instalado neste aparelho.</b>
          <p className="muted small">Abra pelo ícone do Craque da Vez na tela inicial.</p>
        </div>
      ) : evento ? (
        <button className="btn btn-primario ao-vivo-btn" onClick={instalarAgora}>📲 Instalar agora</button>
      ) : null}

      <div className="chips" role="tablist" aria-label="Seu aparelho" style={{ justifyContent: 'center' }}>
        {([['android', '🤖 Android'], ['iphone', '🍎 iPhone'], ['computador', '💻 Computador']] as const).map(([k, v]) => (
          <button key={k} className="chip" role="tab" aria-pressed={sistema === k} onClick={() => setSistema(k)}>{v}</button>
        ))}
      </div>

      {sistema === 'android' && (
        <ol className="passos">
          <li><b>Abra no Chrome:</b> <span className="endereco">{ENDERECO}</span>
            <small>Se você tocou no link dentro do WhatsApp ou Instagram, toque nos <b>⋮</b> e escolha <b>Abrir no Chrome</b>.</small></li>
          <li>Toque nos <b>3 pontinhos ⋮</b> no canto de cima, à direita.</li>
          <li>Toque em <b>Instalar app</b>. <small>Se não aparecer, use <b>Adicionar à tela inicial</b>.</small></li>
          <li>Confirme em <b>Instalar</b>.</li>
          <li>Pronto! Procure o ícone <b>Craque da Vez</b> junto com seus aplicativos.</li>
        </ol>
      )}

      {sistema === 'iphone' && (
        <ol className="passos">
          <li><b>Abra no Safari</b> (no iPhone, só funciona pelo Safari): <span className="endereco">{ENDERECO}</span></li>
          <li>Toque no botão <b>Compartilhar</b>: o quadrado com a seta para cima ⬆️, na barra de baixo.</li>
          <li>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</li>
          <li>Confira o nome <b>Craque da Vez</b> e toque em <b>Adicionar</b>.</li>
          <li>Pronto! O ícone aparece na tela do iPhone.</li>
        </ol>
      )}

      {sistema === 'computador' && (
        <ol className="passos">
          <li>Abra no <b>Chrome</b> ou no <b>Edge</b>: <span className="endereco">{ENDERECO}</span></li>
          <li><b>Chrome:</b> clique no ícone de instalar (um monitor com uma seta) no canto direito da barra de endereço. <small>Ou ⋮ → Transmitir, salvar e compartilhar → Instalar Craque da Vez.</small></li>
          <li><b>Edge:</b> ⋯ → Aplicativos → Instalar este site como um aplicativo.</li>
          <li>Pronto! O app abre numa janela própria e ganha um ícone na área de trabalho.</li>
        </ol>
      )}

      <section className="cartao pilha">
        <h3>Depois de instalar</h3>
        <ol className="passos">
          <li>Abra o app pelo ícone e toque em <b>Criar conta</b>. <small>Só maiores de 18 anos criam conta. Crianças são cadastradas pelo responsável.</small></li>
          <li>Preencha nome, data de nascimento, celular, e-mail e senha, aceite os termos e pronto: você já entra.</li>
          <li>Toque em <b>+ Cadastrar</b> e cadastre o seu atleta. A categoria (Sub-10, Sub-11…) sai sozinha pelo ano de nascimento.</li>
          <li>Em <b>Times</b>, crie o time (ou use o código que o técnico passar) e coloque o atleta nele.</li>
          <li>Toque no <b>+ vermelho</b> e lance o primeiro jogo. ⚽</li>
        </ol>
        <p className="muted small">Recebeu um código de convite de outro responsável? Depois de criar a conta, vá em <b>Perfil → Código de convite</b>.</p>
      </section>

      <section className="cartao pilha">
        <h3>Dúvidas</h3>
        <p className="small"><b>Ocupa espaço no celular?</b> <span className="muted">Quase nada: os dados ficam guardados online.</span></p>
        <p className="small"><b>Precisa atualizar?</b> <span className="muted">Não. As novidades chegam sozinhas: é só fechar e abrir o app.</span></p>
        <p className="small"><b>Trocou de celular?</b> <span className="muted">Instale de novo e entre com o mesmo e-mail e senha. Tudo continua lá.</span></p>
        <p className="small"><b>Precisa de internet?</b> <span className="muted">Sim, para carregar e salvar os jogos.</span></p>
      </section>

      <Link to="/" className="btn btn-contorno">Abrir o app</Link>
      <Rodape />
    </main>
  );
}
