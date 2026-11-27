import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Logo } from './components/Logo';
import { Menu } from './components/Menu';
import { supabase } from './lib/supabase';
import { Admin } from './pages/Admin';
import { CONTATO_WHATSAPP_LINK, Privacidade, Termos } from './pages/Legal';
import { Instalar } from './pages/Instalar';
import { PrivacidadeConfig } from './pages/PrivacidadeConfig';
import { PapelDeParede } from './components/PapelDeParede';
import { AuthProvider, useAuth } from './lib/auth';
import { configurado } from './lib/supabase';
import { Abertura } from './pages/Abertura';
import { Conta } from './pages/Conta';
import { CriarConta } from './pages/CriarConta';
import { EditarJogador } from './pages/EditarJogador';
import { Entrar, NovaSenha } from './pages/Entrar';
import { Inicio } from './pages/Inicio';
import { Agenda } from './pages/Agenda';
import { JogoDetalhe } from './pages/JogoDetalhe';
import { LancarJogo } from './pages/LancarJogo';
import { PerfilJogador } from './pages/PerfilJogador';
import { NovoTime, TimeDetalhe, Times } from './pages/Times';

function ComMenu() {
  return (
    <>
      <Outlet />
      <Menu />
    </>
  );
}

/** Avisa o banco que a pessoa está usando o app (para o painel do administrador). */
function MarcarAcesso() {
  useEffect(() => {
    const marcar = () => { if (document.visibilityState === 'visible') supabase.rpc('marcar_acesso').then(() => {}); };
    marcar();
    const t = setInterval(marcar, 120000);
    document.addEventListener('visibilitychange', marcar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', marcar); };
  }, []);
  return null;
}

/** Conta nova espera o administrador liberar. */
function useAprovacao(usuario: string | undefined) {
  const [s, setS] = useState<string | null>(null);
  useEffect(() => {
    if (!usuario) return setS(null);
    let vivo = true;
    const ver = () => supabase.rpc('minha_aprovacao').then(({ data, error }) => vivo && setS(error ? 'liberado' : (data as string) ?? 'liberado'));
    ver();
    const t = setInterval(ver, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [usuario]);
  return s;
}

function EmAnalise({ recusado }: { recusado: boolean }) {
  return (
    <main className="tela sem-menu pilha" style={{ paddingTop: 40, textAlign: 'center' }}>
      <Logo compacto />
      {recusado ? (
        <>
          <h2>Cadastro não liberado</h2>
          <p className="muted">O administrador não liberou esta conta. Se acha que foi engano, fale com a gente pelo WhatsApp.</p>
        </>
      ) : (
        <>
          <div className="bola" aria-hidden="true" style={{ fontSize: 48 }}>⏳</div>
          <h2>Seu cadastro está em análise</h2>
          <p className="muted">Para proteger as crianças, cada conta nova é conferida antes de entrar. Assim que o administrador liberar, o app abre sozinho aqui.</p>
        </>
      )}
      <a className="btn btn-fantasma" href={CONTATO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">💬 Fale conosco no WhatsApp</a>
      <button className="btn btn-contorno" onClick={() => supabase.auth.signOut()}>Sair</button>
    </main>
  );
}

function Rotas() {
  const { sessao, carregando } = useAuth();
  const aprovacao = useAprovacao(sessao?.user.id);
  if (carregando) return <Abertura />;
  if (!sessao)
    return (
      <Routes>
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/instalar" element={<Instalar />} />
        <Route path="*" element={<Entrar />} />
      </Routes>
    );
  if (!aprovacao) return <Abertura />;
  if (aprovacao !== 'liberado')
    return (
      <Routes>
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="*" element={<EmAnalise recusado={aprovacao === 'recusado'} />} />
      </Routes>
    );
  return (
    <>
    <MarcarAcesso />
    <PapelDeParede />
    <Routes>
      <Route element={<ComMenu />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/jogos" element={<Navigate to="/agenda" replace />} />
        <Route path="/jogo/:id" element={<JogoDetalhe />} />
        <Route path="/jogo/:id/editar" element={<LancarJogo key="editar" />} />
        <Route path="/lancar" element={<LancarJogo />} />
        <Route path="/times" element={<Times />} />
        <Route path="/times/:id" element={<TimeDetalhe />} />
        <Route path="/jogador/:id" element={<PerfilJogador />} />
        <Route path="/conta" element={<Conta />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/conta/privacidade" element={<PrivacidadeConfig />} />
      </Route>
      <Route path="/jogador/novo" element={<EditarJogador />} />
      <Route path="/jogador/:id/editar" element={<EditarJogador />} />
      <Route path="/times/novo" element={<NovoTime />} />
      <Route path="/nova-senha" element={<NovaSenha />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/instalar" element={<Instalar />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default function App() {
  if (!configurado) {
    return (
      <main className="tela sem-menu" style={{ paddingTop: 40 }}>
        <h1>Falta configurar o Supabase</h1>
        <p className="muted">
          Crie o arquivo <code>.env.local</code> com <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja <code>.env.example</code>) e reinicie o app.
        </p>
      </main>
    );
  }
  return (
    <div className="app">
      <AuthProvider>
        <BrowserRouter>
          <Rotas />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
