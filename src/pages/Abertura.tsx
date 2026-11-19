import { Logo } from '../components/Logo';

export function Abertura() {
  return (
    <div className="abertura">
      <div className="miolo">
        <Logo />
        <div className="carregando" role="progressbar" aria-label="Carregando">
          <i />
        </div>
      </div>
    </div>
  );
}
