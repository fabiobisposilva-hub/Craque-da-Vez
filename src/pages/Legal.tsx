import { Rodape, Topo } from '../components/Comuns';

/** E-mail de contato para dúvidas e pedidos sobre dados pessoais. Preencha quando tiver um. */
export const CONTATO_WHATSAPP = '(61) 99219-5242';
export const CONTATO_WHATSAPP_LINK = 'https://wa.me/5561992195242';
const ATUALIZADO_EM = '27 de novembro de 2026';

/**
 * Dados do responsável pelo app para a Política de Privacidade.
 * Preencha os campos vazios antes do lançamento comercial (os vazios aparecem como "[a definir]").
 */
export const CONFIG_PRIVACIDADE = {
  controlador: 'Fábio Bispo',          // razão social ou nome do responsável pelo app
  documento: '',                       // CNPJ ou CPF
  endereco: '',                        // endereço
  emailPrivacidade: '',                // e-mail para assuntos de privacidade
  encarregado: 'Fábio Bispo',          // encarregado pelo tratamento de dados (DPO)
  publicadaEm: '27 de novembro de 2026',
  prazoExclusaoDias: 30,
  versao: '1.1',
};
const v = (x: string) => x || '[a definir]';

function Contato() {
  return (
    <>pelo WhatsApp <a href={CONTATO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"><b style={{ userSelect: 'all' }}>{CONTATO_WHATSAPP}</b></a> (Fábio Bispo)</>
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
        <p>O app é oferecido como está e pode ter falhas, ficar fora do ar ou mudar. Fazemos o possível para manter os dados seguros, mas recomendamos não depender dele como único registro de informações importantes.</p>

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
  const c = CONFIG_PRIVACIDADE;
  return (
    <main className="tela sem-menu">
      <Topo titulo="Política de Privacidade" />
      <article className="texto-legal">
        <p className="small">Versão {c.versao} · publicada em {c.publicadaEm}.</p>

        <h2>1. Quem somos</h2>
        <p>O <b>Craque da Vez</b> é um aplicativo para registrar jogos, gols, assistências, cartões, campeonatos e estatísticas de jogadores de futebol e futsal, de qualquer idade: da escolinha à pelada, da várzea aos campeonatos.</p>
        <p>O aplicativo é oferecido por <b>{v(c.controlador)}</b>, inscrito no <b>{v(c.documento)}</b>, com endereço em <b>{v(c.endereco)}</b>. Somos o <b>controlador</b> dos dados pessoais tratados no app.</p>
        <p><b>Encarregado pelo tratamento de dados (DPO):</b> {v(c.encarregado)}<br />
          <b>Contato para assuntos de privacidade:</b> {c.emailPrivacidade ? <span style={{ userSelect: 'all' }}>{c.emailPrivacidade}</span> : <Contato />}</p>

        <h2>2. Resumo em linguagem simples</h2>
        <ul>
          <li>Só <b>adultos (18 anos ou mais)</b> criam conta.</li>
          <li><b>Crianças e adolescentes</b> só entram no app cadastrados por um pai, mãe ou responsável legal, que autoriza o uso dos dados.</li>
          <li><b>Não vendemos</b> os seus dados nem os de ninguém.</li>
          <li><b>Não usamos</b> os dados de crianças e adolescentes para publicidade nem para criar perfis de consumo.</li>
          <li><b>Fotos de crianças e adolescentes só aparecem para a família</b> (os responsáveis do jogador e as pessoas que eles convidarem). Ninguém mais vê, nem o técnico, nem outros usuários.</li>
          <li>Para outras pessoas, o jogador menor de idade aparece <b>só pelo apelido, pelo time e pelas estatísticas</b>. O nome, a foto e a data de nascimento não aparecem.</li>
          <li><b>Local e horário de jogos futuros nunca são públicos.</b></li>
          <li>Você pode <b>ver, corrigir, baixar e apagar</b> os dados quando quiser.</li>
        </ul>

        <h2>3. Quais dados coletamos</h2>
        <p><b>3.1 Do usuário adulto (responsável, técnico ou jogador adulto):</b> nome; e-mail; celular; data de nascimento (para confirmar que é maior de 18 anos); senha (guardada de forma criptografada; nem nós conseguimos vê-la); registros de consentimento (o que foi aceito, a versão do documento, data e hora).</p>
        <p><b>3.2 Do jogador (inclusive crianças e adolescentes cadastrados pelo responsável):</b> nome (visível só para a família e para o técnico dos times dele); <b>apelido</b> (o único identificador que outros usuários veem); data de nascimento (usada para calcular a categoria, por exemplo Sub-10); perna dominante, posição e número da camisa; times e categorias em que joga; jogos e estatísticas (placar, gols, assistências, cartões, campeonatos e títulos). <b>Opcionais:</b> foto do jogador, papel de parede e fotos de jogos.</p>
        <p><b>3.3 Dados técnicos:</b> endereço IP, tipo de aparelho e navegador, data e hora de acesso, usados para segurança e para evitar fraudes.</p>
        <p><b>Não coletamos:</b> documentos (RG, CPF) das crianças, localização em tempo real, contatos do celular, dados de saúde nem dados bancários.</p>

        <h2>4. Para que usamos os dados</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Finalidade</th><th>Dados</th><th>Base legal (LGPD)</th></tr></thead>
            <tbody>
              <tr><td>Criar e manter a conta do adulto</td><td>Nome, e-mail, nascimento, senha</td><td>Execução de contrato (art. 7º, V)</td></tr>
              <tr><td>Confirmar que só adultos criam conta</td><td>Data de nascimento do adulto</td><td>Execução de contrato e obrigação legal (art. 7º, II e V)</td></tr>
              <tr><td>Registrar a carreira do jogador</td><td>Dados do jogador</td><td>Menores: consentimento específico e em destaque do responsável (art. 14, §1º). Adultos: execução de contrato</td></tr>
              <tr><td>Mostrar o perfil público limitado</td><td>Apelido, time e estatísticas</td><td>Consentimento do responsável (menores) ou do próprio adulto</td></tr>
              <tr><td>Avisar sobre jogos lançados pelo técnico</td><td>Dados do jogo</td><td>Execução de contrato</td></tr>
              <tr><td>Segurança e prevenção de fraudes</td><td>Dados técnicos</td><td>Legítimo interesse e obrigação legal (art. 7º, II e IX)</td></tr>
            </tbody>
          </table>
        </div>
        <p>Fotos de menores <b>nunca</b> são mostradas fora da família. Os dados de crianças e adolescentes são sempre tratados no seu <b>melhor interesse</b>, como exigem o art. 14 da LGPD e o Estatuto Digital da Criança e do Adolescente (Lei nº 15.211/2025).</p>

        <h2>5. Quem vê o quê dentro do app</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Quem</th><th>O que vê</th><th>O que altera</th></tr></thead>
            <tbody>
              <tr><td>Responsáveis do jogador (até 4) e familiares convidados por eles</td><td>Todos os dados do jogador, <b>inclusive as fotos</b></td><td>Responsáveis: os dados do jogador. Convidados "só ver": nada</td></tr>
              <tr><td>Técnico de um time</td><td>Nome e só o que aconteceu <b>no time dele</b>: jogos, gols, assistências e cartões. <b>Não vê fotos</b> nem a data de nascimento</td><td>Os jogos do próprio time</td></tr>
              <tr><td>Outros usuários do app</td><td><b>Só o apelido, o time, a categoria e as estatísticas</b>, conforme a visibilidade escolhida</td><td>Nada</td></tr>
              <tr><td>Visitantes sem conta</td><td>Nada</td><td>Nada</td></tr>
            </tbody>
          </table>
        </div>
        <p><b>Nunca aparecem para quem não é da família:</b> nome completo do menor (exceto para o técnico do time dele), fotos do menor, data de nascimento, local e horário de jogos futuros.</p>
        <p>O responsável pode deixar o perfil do jogador (apelido, time e estatísticas) <b>público</b>, visível <b>só para pessoas aprovadas</b> ou <b>privado</b>. Para menores de 18 anos, o padrão é <b>só pessoas aprovadas</b>.</p>

        <h2>6. Compartilhamento</h2>
        <p><b>Não vendemos nem alugamos dados pessoais.</b> Usamos prestadores de serviço (operadores) que tratam dados apenas para fazer o app funcionar, sob contrato e com medidas de segurança:</p>
        <ul>
          <li><b>Supabase:</b> banco de dados, login e armazenamento de fotos</li>
          <li><b>Vercel:</b> hospedagem do aplicativo</li>
        </ul>
        <p>Esses serviços podem guardar dados em servidores <b>fora do Brasil</b> (Estados Unidos). Nesses casos, a transferência segue as regras da LGPD (arts. 33 a 36), com garantias contratuais de proteção. Podemos compartilhar dados com autoridades quando houver <b>obrigação legal ou ordem judicial</b>. <b>Dados de crianças e adolescentes nunca são repassados a terceiros</b> para publicidade, marketing ou qualquer finalidade não descrita aqui.</p>

        <h2>7. Publicidade</h2>
        <p>O Craque da Vez <b>não faz perfilamento de crianças e adolescentes para publicidade</b> e não exibe publicidade direcionada a eles com base nos seus dados.</p>

        <h2>8. Por quanto tempo guardamos os dados</h2>
        <ul>
          <li><b>Enquanto a conta estiver ativa.</b></li>
          <li>Quando o responsável <b>exclui o jogador ou a conta</b> (em Perfil › Privacidade), os dados são apagados na hora do app e, das cópias de segurança, em até <b>{c.prazoExclusaoDias} dias</b>. Ficam de fora apenas os registros que a lei obriga a guardar: registros de acesso ao aplicativo (6 meses, Marco Civil da Internet, art. 15) e registros de consentimento, pelo tempo necessário para comprovar que ele foi dado.</li>
          <li>Jogos lançados por um técnico ficam no histórico do time, mas o <b>nome do jogador excluído é removido</b>.</li>
        </ul>

        <h2>9. Segurança</h2>
        <ul>
          <li>Conexão criptografada (HTTPS) em todo o app.</li>
          <li>Senhas guardadas com criptografia (hash), nunca em texto.</li>
          <li>Regras de acesso <b>no próprio banco de dados</b> (Row Level Security): cada pessoa só acessa o que tem permissão de ver.</li>
          <li>Fotos guardadas em área <b>privada</b>, abertas por links temporários de poucos minutos e liberadas <b>só para a família</b>.</li>
          <li>Confirmação de e-mail e proteção contra tentativas repetidas de login.</li>
          <li>Acesso administrativo restrito.</li>
        </ul>
        <p>Nenhum sistema é 100% invulnerável. Se acontecer um incidente de segurança que possa trazer risco ou dano relevante, vamos <b>avisar os titulares afetados e a ANPD</b>, como manda a LGPD (art. 48).</p>

        <h2>10. Seus direitos</h2>
        <p>Pela LGPD (art. 18), o titular, ou o responsável no caso de menores, pode a qualquer momento: confirmar se tratamos seus dados e <b>acessá-los</b>; <b>corrigir</b> dados; pedir <b>anonimização, bloqueio ou eliminação</b>; <b>baixar uma cópia</b> dos dados; <b>revogar o consentimento</b> (por exemplo, tornar o perfil privado ou retirar o acesso de um técnico); saber com quem os dados são compartilhados; e <b>excluir a conta e todos os dados</b>.</p>
        <p><b>Como exercer:</b> pelo próprio app, em <b>Perfil › Privacidade</b>, ou {c.emailPrivacidade ? <>pelo e-mail <b>{c.emailPrivacidade}</b></> : <Contato />}. Respondemos em até 15 dias. Também é possível reclamar à <b>Autoridade Nacional de Proteção de Dados (ANPD)</b>, em www.gov.br/anpd.</p>

        <h2>11. Mudanças nesta política</h2>
        <p>Se esta política mudar, vamos avisar no app antes de a mudança valer. Quando a mudança envolver dados de crianças e adolescentes ou um novo uso dos dados, <b>pediremos o consentimento do responsável de novo</b>.</p>
        <p className="small muted">Referências: Lei nº 13.709/2018 (LGPD), arts. 7º, 14, 18, 33 a 36 e 48; Lei nº 15.211/2025 (ECA Digital); Lei nº 12.965/2014 (Marco Civil da Internet), art. 15.</p>
      </article>
      <Rodape />
    </main>
  );
}
