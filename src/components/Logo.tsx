import { useState } from 'react';

/**
 * Logo oficial (public/logo.png, versão em fundo azul-marinho).
 * Enquanto o arquivo não estiver na pasta public, mostra o nome e o slogan.
 */
export function Logo({ compacto = false }: { compacto?: boolean }) {
  const [semImagem, setSemImagem] = useState(false);
  if (!semImagem) {
    return (
      <img
        className="logo"
        src="/logo.png"
        alt="Craque da Vez: hoje o destaque é você"
        style={compacto ? { maxWidth: 180 } : undefined}
        onError={() => setSemImagem(true)}
      />
    );
  }
  return (
    <div className="marca" role="img" aria-label="Craque da Vez: hoje o destaque é você">
      <div className="nome" style={compacto ? { fontSize: 26 } : undefined}>CRAQUE DA VEZ</div>
      <div className="slogan">HOJE O DESTAQUE É VOCÊ</div>
    </div>
  );
}
