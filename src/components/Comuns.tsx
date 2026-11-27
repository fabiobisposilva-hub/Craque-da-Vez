import { useNavigate } from 'react-router-dom';
import { iniciais, type Jogador } from '../lib/tipos';

export function Topo({ titulo, voltar = true, children }: { titulo: string; voltar?: boolean; children?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topo">
      {voltar && (
        <button className="voltar" onClick={() => nav(-1)} aria-label="Voltar">
          ←
        </button>
      )}
      <h1>{titulo}</h1>
      {children}
    </header>
  );
}

export function Avatar({ jogador, grande, numero }: { jogador: Pick<Jogador, 'nome' | 'foto_link'>; grande?: boolean; numero?: number | null }) {
  return (
    <div className={'avatar' + (grande ? ' grande' : '')}>
      {jogador.foto_link ? <img src={jogador.foto_link} alt="" /> : numero != null && !grande ? numero : iniciais(jogador.nome)}
    </div>
  );
}

/** Escudo de time ou adversário: a imagem, ou as iniciais na cor do time. */
export function Escudo({ nome, url, cor, tamanho = 56 }: { nome: string; url?: string | null; cor?: string | null; tamanho?: number }) {
  const fundo = cor ?? 'var(--surface-2)';
  const claro = ['#FFFFFF', '#FFC928'].includes((cor ?? '').toUpperCase());
  return (
    <div className="escudo" style={{ width: tamanho, height: tamanho, background: url ? 'var(--surface-2)' : fundo, color: claro ? '#01162C' : '#fff', fontSize: tamanho * 0.34 }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : nome.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

/** Botão que abre a galeria/câmera do celular para escolher uma imagem. */
export function EscolherImagem({ id, onArquivo, children, className = 'btn btn-fantasma btn-pequeno', desativado }: {
  id: string; onArquivo: (f: File) => void; children: React.ReactNode; className?: string; desativado?: boolean;
}) {
  return (
    <label htmlFor={id} className={className} style={{ cursor: desativado ? 'default' : 'pointer', opacity: desativado ? 0.6 : 1 }}>
      {children}
      <input id={id} type="file" accept="image/*" hidden disabled={desativado}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onArquivo(f); }} />
    </label>
  );
}

export function Resultado({ r }: { r: 'V' | 'E' | 'D' }) {
  const nome = r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : 'Derrota';
  return (
    <span className={'res res-' + r} title={nome} aria-label={nome}>
      {r}
    </span>
  );
}

export function Erro({ msg }: { msg: string | null }) {
  return msg ? (
    <div className="erro" role="alert">
      {msg}
    </div>
  ) : null;
}

export function Contador({ valor, onChange, max, rotulo }: { valor: number; onChange: (n: number) => void; max?: number; rotulo: string }) {
  return (
    <div className="contador" role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onChange(Math.max(0, valor - 1))} aria-label={`Diminuir ${rotulo}`}>
        −
      </button>
      <b className="num">{valor}</b>
      <button type="button" onClick={() => onChange(max == null ? valor + 1 : Math.min(max, valor + 1))} aria-label={`Aumentar ${rotulo}`}>
        +
      </button>
    </div>
  );
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/** Etiqueta do tipo de jogo: campeonato (com nome e fase), amistoso ou treino. */
export function TipoJogo({ jogo, campeonato }: {
  jogo: { tipo: 'amistoso' | 'treino' | 'campeonato'; fase: string | null };
  campeonato?: { nome: string } | null;
}) {
  const fases: Record<string, string> = { grupos: 'Grupos', oitavas: 'Oitavas', quartas: 'Quartas', semifinal: 'Semifinal', final: 'Final' };
  if (jogo.tipo === 'campeonato')
    return (
      <span className="tipo-jogo tipo-campeonato">
        🏆 {campeonato?.nome ?? 'Campeonato'}{jogo.fase ? ` · ${fases[jogo.fase] ?? jogo.fase}` : ''}
      </span>
    );
  if (jogo.tipo === 'treino') return <span className="tipo-jogo tipo-treino">⚽ Treino</span>;
  return <span className="tipo-jogo tipo-amistoso">🤝 Amistoso</span>;
}

/** Rodapé com créditos e links legais. */
export function Rodape() {
  const ano = new Date().getFullYear();
  return (
    <footer className="rodape">
      <p className="rodape-marca">Craque da Vez <span>· Hoje o destaque é você</span></p>
      <p>Desenvolvido por <b>Miguel</b> e <b>Fábio Bispo</b></p>
      <p>Criado em 2026 · Brasília, DF · Para todo o Brasil</p>
      <p>Contato: <a className="rodape-zap" href="https://wa.me/5561992195242" target="_blank" rel="noopener noreferrer">WhatsApp (61) 99219-5242</a></p>
      <p>© {ano === 2026 ? '2026' : `2026–${ano}`} Craque da Vez. Todos os direitos reservados.</p>
      <p className="rodape-links">
        <a href="/termos">Termos de Uso</a>
        <span aria-hidden="true">·</span>
        <a href="/privacidade">Política de Privacidade</a>
        <span aria-hidden="true">·</span>
        <a href="/instalar">Como instalar</a>
      </p>
      <p className="rodape-versao">Versão 1.0</p>
    </footer>
  );
}
