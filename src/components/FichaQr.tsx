import { useEffect, useState } from 'react';
import { toDataURL } from 'qrcode';
import { hasLan, LAN_INFO } from '../lib/lan';
import { useTableStore } from '../store/useTableStore';

// QR code no rodapé da janela "Ficha" — pedido do usuário: escanear com o
// celular (mesma rede) pra ver/mexer na ficha sem precisar da tela do PC.
// Usa `qrcode` (lib leve do npm) em vez de implementar um encoder do zero.
// Só aparece quando o app está rodando via o servidor local (`hasLan` —
// mesma flag que liga o resto do modo rede local) e sabe o próprio IP; sem
// isso (build publicada fora do executável) não tem servidor nenhum pro
// celular conversar, então o componente simplesmente não renderiza nada.
export function FichaQr({ characterId }: { characterId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  // Numa mesa pela internet (Supabase) não existe servidor local nenhum pro
  // celular alcançar — o QR só funciona numa mesa em rede local.
  const roomMode = useTableStore((s) => s.mode);

  // `phoneIp` (não `localIp`) de propósito — ver comentário em lib/lan.ts.
  // `localIp` prefere a VPN Radmin quando presente (certo pro endereço da
  // mesa hospedada em Home.tsx), mas o celular que escaneia esse QR tá na
  // rede física normal, não na Radmin — usar `localIp` aqui fazia a página
  // simplesmente não carregar pra ninguém com a Radmin ativa no PC.
  const ip = LAN_INFO?.phoneIp || LAN_INFO?.localIp;
  const url =
    hasLan && roomMode === 'lan' && LAN_INFO && ip
      ? `http://${ip}:${LAN_INFO.port}/ficha/${characterId}`
      : null;

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    toDataURL(url, { margin: 1, width: 132, color: { dark: '#0b0b0d', light: '#f4f1ea' } })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    // Distingue "mesa pela internet" (mensagem explicativa, já que o botão
    // "No celular" continua visível e clicável) de "app rodando fora do
    // executável" (hasLan false — nem deveria aparecer esse card, mas por
    // segurança mantém o fallback mudo de sempre).
    if (hasLan && roomMode && roomMode !== 'lan') {
      return (
        <div className="ficha-qr">
          <div className="ficha-qr-text">
            <strong>Ficha no celular</strong>
            <span className="faint">Só disponível em mesa na rede local, por enquanto.</span>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="ficha-qr">
      {dataUrl ? (
        <img className="ficha-qr-img" src={dataUrl} alt="QR code pra abrir a ficha no celular" />
      ) : (
        <div className="ficha-qr-img ficha-qr-loading" />
      )}
      <div className="ficha-qr-text">
        <strong>Ficha no celular</strong>
        <span className="faint">Escaneie (mesma rede) pra ver e mexer na ficha pelo celular.</span>
        <span className="faint ficha-qr-url">{url}</span>
      </div>
    </div>
  );
}
