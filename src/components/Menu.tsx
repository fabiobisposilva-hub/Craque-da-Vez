import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const I = {
  inicio: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
  jogos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l4 3-1.5 5h-5L8 10z" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  times: <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />,
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

function Icone({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}

export function Menu() {
  const [naoLidas, setNaoLidas] = useState(0);
  useEffect(() => {
    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('lida', false)
      .then(({ count }) => setNaoLidas(count ?? 0));
  }, []);
  return (
    <div className="menu">
      <nav aria-label="Menu principal">
        <NavLink to="/" end>
          <span style={{ position: 'relative' }}>
            <Icone d={I.inicio} />
            {naoLidas > 0 && <span className="badge">{naoLidas}</span>}
          </span>
          Início
        </NavLink>
        <NavLink to="/jogos">
          <Icone d={I.jogos} />
          Jogos
        </NavLink>
        <NavLink to="/lancar" className="mais" aria-label="Lançar jogo">
          <Icone d={I.mais} />
        </NavLink>
        <NavLink to="/times">
          <Icone d={I.times} />
          Times
        </NavLink>
        <NavLink to="/conta">
          <Icone d={I.perfil} />
          Perfil
        </NavLink>
      </nav>
    </div>
  );
}
