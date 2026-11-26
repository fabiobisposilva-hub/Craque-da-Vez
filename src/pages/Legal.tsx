import { Rodape, Topo } from '../components/Comuns';

/** E-mail de contato para dúvidas e pedidos sobre dados pessoais. Preencha quando tiver um. */
export const CONTATO_EMAIL = '';
const ATUALIZADO_EM = '26 de novembro de 2026';

function Contato() {
  return CONTATO_EMAIL ? (
    <>pelo e-mail <b style={{ color: 'var(--text)', userSelect: 'all' }}>{CONTATO_EMAIL}</b></>
  ) : (
    <>com o responsável pelo Craque da Vez (o e-mail de contato será publicado nesta página em breve)</>
  );
}

export function Termos() {
  return (
    <main className="tela sem-menu">
      <Topo titulo="Termos de Uso" />
      <article className="texto-legal">
        <p className="small">Atualizado em {ATUALIZADO_EM}.</p>
        <p>Estes termos explicam as regras para usar o Craque da Vez, um app para registrar a carreira de jogadores de futebol e futsal: jogos, gols, assistências, cartões, campeonatos e títulos. Ao criar uma conta, você concorda com eles.</p>

        <h2>1. Quem pode criar conta</h2>
        <ul>
          <li>Só maiores de 18 anos criam conta.</li>
          <li>Crianças e adolescentes não têm conta própria: são cadastrados como jogadores pelo pai, mãe ou responsável legal, que responde pelas informações e autorizações.</li>
          <li>Ao cadastrar um menor, você declara que é responsável por ele ou que tem autorização de quem é.</li>
        </ul>

        <h2>2. Sua conta</h2>
        <ul>
          <li>Mantenha sua senha em segredo. O que for feito com a sua conta é de sua responsabilidade.</li>
          <li>Informe dados verdadeiros (nome, data de nascimento, telefone).</li>
          <li>Você pode convidar outros responsáveis (até 4 por jogador, com permissão para editar) e familiares só para ver. Convide apenas pessoas de confiança.</li>
        </ul>

        <h2>3. O que você publica</h2>
        <ul>
          <li>Você é responsável pelos jogos, fotos, escudos, resenhas e observações que cadastra.</li>
          <li>Não publique fotos de outras crianças sem autorização dos responsáveis delas, nem conteúdo ofensivo, discriminatório ou que viole direitos de terceiros.</li>
          <li>Escudos e logos de times pertencem aos seus donos; use-os só para identificar os times no app.</li>
          <li>Podemos remover conteúdo ou suspender contas que desrespeitem estes termos.</li>
        </ul>

        <h2>4. Técnicos e times</h2>
        <p>O técnico que cadastra um time vê apenas o que acontece no time dele. Quando técnico e responsável lançam o mesmo jogo, vale a versão do técnico, e o responsável é avisado das diferenças.</p>

        <h2>5. Disponibilidade</h2>
        <p>O app é oferecido como está, gratuitamente, e pode ter falhas, ficar fora do ar ou mudar. Fazemos o possível para manter os dados seguros, mas recomendamos não depender dele como único registro de informações importantes.</p>

        <h2>6. Encerrar o uso</h2>
        <p>Você pode parar de usar o app quando quiser e pedir a exclusão da sua conta e dos dados dos seus jogadores <Contato />.</p>

        <h2>7. Mudanças nestes termos</h2>
        <p>Se estes termos mudarem, a data acima será atualizada e, em mudanças importantes, avisaremos no app.</p>

        <h2>8. Lei aplicável</h2>
        <p>Estes termos seguem as leis do Brasil, incluindo o Estatuto da Criança e do Adolescente e a Lei Geral de Proteção de Dados (LGPD).</p>
      </article>
      <Rodape />
    </main>
  );
}

export function Privacidade() {
  return (
    <main className="tela sem-menu">
      <Topo titulo="Política de Privacidade" />
      <article className="texto-legal">
        <p className="small">Atualizado em {ATUALIZADO_EM}.</p>
        <p>Esta política explica quais dados o Craque da Vez coleta, para quê, com quem são compartilhados e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li><b>Do responsável (titular da conta):</b> nome, e-mail, celular, data de nascimento (para confirmar que é maior de 18) e senha (guardada de forma criptografada).</li>
          <li><b>Dos jogadores:</b> nome, apelido, data de nascimento, perna dominante, times, posição, número da camisa e, se você enviar, foto e papel de parede.</li>
          <li><b>Dos jogos:</b> data, local, adversário, placar, gols, assistências, cartões, escalação, resenha e escudos.</li>
          <li><b>De uso:</b> data do último acesso, para sabermos quantas pessoas usam o app.</li>
        </ul>

        <h2>2. Dados de crianças e adolescentes</h2>
        <ul>
          <li>Todo cadastro de menor é feito pelo responsável, que dá o consentimento exigido pelo artigo 14 da LGPD.</li>
          <li>Fotos de jogadores ficam privadas: só a família vê, a menos que o responsável ligue “Mostrar foto no perfil público”.</li>
          <li>Perfis de menores começam como “Só aprovados”. Data de nascimento completa, local e horário de jogos futuros nunca aparecem para quem não é da família ou técnico do time.</li>
        </ul>

        <h2>3. Para que usamos</h2>
        <ul>
          <li>Montar o histórico e as estatísticas de cada jogador.</li>
          <li>Permitir que responsáveis, familiares convidados e técnicos acompanhem os jogos, conforme as permissões de cada um.</li>
          <li>Entrar em contato sobre a sua conta, quando necessário.</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>

        <h2>4. Com quem compartilhamos</h2>
        <ul>
          <li><b>Dentro do app:</b> só com quem você autorizou (responsáveis, familiares convidados, técnico do time).</li>
          <li><b>Serviços que fazem o app funcionar:</b> Supabase (banco de dados, fotos e login, com servidores nos Estados Unidos) e Vercel (hospedagem do site). Eles guardam os dados para nós e seguem padrões de segurança do mercado.</li>
          <li><b>Autoridades:</b> somente quando a lei exigir.</li>
        </ul>

        <h2>5. Segurança</h2>
        <p>O acesso aos dados é controlado no próprio banco de dados: cada pessoa só consegue ler e alterar o que tem permissão. As conexões são criptografadas (HTTPS) e as fotos de jogadores ficam em área privada.</p>

        <h2>6. Por quanto tempo guardamos</h2>
        <p>Enquanto sua conta existir. Se você pedir a exclusão, apagamos sua conta e os dados dos jogadores que só você administra.</p>

        <h2>7. Seus direitos</h2>
        <p>Você pode, a qualquer momento: confirmar quais dados temos, corrigir (pelo próprio app), pedir uma cópia, retirar o consentimento e pedir a exclusão. Para isso, fale <Contato />.</p>

        <h2>8. Mudanças</h2>
        <p>Se esta política mudar, a data acima será atualizada e, em mudanças importantes, avisaremos no app.</p>
      </article>
      <Rodape />
    </main>
  );
}
