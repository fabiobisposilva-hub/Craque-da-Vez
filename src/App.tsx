import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { Menu } from './components/Menu';
import { supabase } from './lib/supabase';
import { Admin } from './pages/Admin';
import { Privacidade, Termos } from './pages/Legal';
import { Instalar } from './pages/Instalar';
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

function Rotas() {
  const { sessao, carregando } = useAuth();
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
