import { Link } from 'react-router-dom';
import type { Visibilidade } from '../lib/tipos';

export interface EscolhasTermo {
  responsavel: boolean;
  tratamento: boolean;
  tecnico: boolean;
  visibilidade: Visibilidade;
}

export const escolhasVazias = (): EscolhasTermo => ({ responsavel: false, tratamento: false, tecnico: false, visibilidade: 'aprovados' });

export const VIS_OPCOES: [Visibilidade, string][] = [
  ['aprovados', 'Só pessoas que eu aprovar veem o apelido, o time e as estatísticas'],
  ['publico', 'Público: apelido, time e estatísticas para todos os usuários'],
  ['privado', 'Privado: só a família'],
];

/** Termo de consentimento do responsável (Parte 2 do documento de privacidade, versão 1.1). */
export function TermoMenor({ nome, valor, onChange }: { nome: string; valor: EscolhasTermo; onChange: (v: EscolhasTermo) => void }) {
  const n = nome.trim() || 'o atleta';
  const set = (m: Partial<EscolhasTermo>) => onChange({ ...valor, ...m });
  return (
    <section className="termo">
      <h3>Autorização do responsável</h3>
      <p>Você está cadastrando <b>{n}</b>, que tem menos de 18 anos.</p>
      <p>
        Para isso, precisamos da sua autorização como <b>pai, mãe ou responsável legal</b>. Com ela, o Craque da Vez vai guardar o nome,
        o apelido, a data de nascimento, os times, as posições e as estatísticas de jogos do atleta, só para registrar a vida esportiva dele no app.
      </p>
      <ul>
        <li>Não vendemos nem compartilhamos esses dados para publicidade.</li>
        <li><b>As fotos só aparecem para a família.</b> Ninguém mais vê.</li>
        <li>Para outras pessoas, aparecem <b>só o apelido, o time e as estatísticas</b>. Nome, foto, data de nascimento e local e horário dos jogos ficam escondidos.</li>
        <li>Você pode mudar estas escolhas ou apagar tudo quando quiser.</li>
      </ul>
      <Link to="/privacidade" target="_blank" className="link">Ler a Política de Privacidade completa</Link>

      <span className="selo">Obrigatórias</span>
      <label className="aceite">
        <input id="t-resp" type="checkbox" checked={valor.responsavel} onChange={(e) => set({ responsavel: e.target.checked })} />
        <span><b>Declaro que sou pai, mãe ou responsável legal por {n}</b> e que posso autorizar o uso dos dados dele.</span>
      </label>
      <label className="aceite">
        <input id="t-trat" type="checkbox" checked={valor.tratamento} onChange={(e) => set({ tratamento: e.target.checked })} />
        <span><b>Autorizo o Craque da Vez a tratar os dados de {n}</b> (nome, data de nascimento, times, posições e estatísticas) para registrar a vida esportiva dele, conforme a Política de Privacidade.</span>
      </label>

      <span className="selo">Opcional</span>
      <label className="aceite">
        <input id="t-tec" type="checkbox" checked={valor.tecnico} onChange={(e) => set({ tecnico: e.target.checked })} />
        <span>Autorizo que <b>técnicos dos times</b> de {n} vejam e lancem as estatísticas dele nos jogos do time.</span>
      </label>

      <span className="selo">Visibilidade do perfil</span>
      {VIS_OPCOES.map(([k, v]) => (
        <label key={k} className="aceite">
          <input type="radio" name="t-vis" checked={valor.visibilidade === k} onChange={() => set({ visibilidade: k })} />
          <span>{v}</span>
        </label>
      ))}
    </section>
  );
}
