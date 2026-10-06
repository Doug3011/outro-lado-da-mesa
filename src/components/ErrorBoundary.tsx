import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Rede de segurança pro app inteiro — achada numa varredura de bugs: não
// existia NENHUM error boundary, então um erro de render em qualquer
// componente (ex.: um token/cenário salvo corrompido, um campo inesperado
// vindo de outro jogador) derrubava a tela inteira pra branco, sem aviso,
// sem jeito de voltar sem fechar e abrir o app de novo. Fica no topo da
// árvore (App.tsx) — não evita o erro em si, mas evita que ele "estoure" a
// sessão toda: mostra um aviso com botão de recarregar em vez de tela
// branca muda.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] erro capturado, app não travou:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 24,
            textAlign: 'center',
            background: '#0b0b0d',
            color: '#e8e6e3',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: 15, letterSpacing: '0.04em', opacity: 0.85 }}>
            Algo deu errado numa parte da tela.
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, maxWidth: 420 }}>
            {this.state.error.message || 'Erro desconhecido.'}
          </div>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: '1px solid #e01e2b',
              background: '#e01e2b',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
