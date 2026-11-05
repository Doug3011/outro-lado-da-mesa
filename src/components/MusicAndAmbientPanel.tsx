import { MusicPanel } from './MusicPanel';
import { AmbientPanel } from './AmbientPanel';

// Conteúdo do botão/janela flutuante "Músicas" — pedido do usuário: juntar
// música de fundo e soundboard de sons ambiente num único botão flutuante
// (antes eram dois ícones soltos, fora do sistema de botões flutuantes).
// Só muda ONDE essas telas ficam acessíveis — reaproveita MusicPanel e
// AmbientPanel inteiros, sem tocar na lógica interna de nenhum dos dois.
export function MusicAndAmbientPanel() {
  return (
    <div>
      <MusicPanel />
      <div className="floating-divider" />
      <div className="section-title" style={{ marginTop: 0 }}>
        Sons ambiente
      </div>
      <AmbientPanel />
    </div>
  );
}
