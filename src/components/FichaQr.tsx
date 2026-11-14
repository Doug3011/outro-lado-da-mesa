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
  // Mesa em rede local funciona direto (o próprio relay é local). Mesa pela
  // internet (Supabase) também funciona, contanto que o executável esteja
  // rodando (hasLan) — nesse caso o app abre uma ponte local pro relay só
  // pra ficha/rolagem (ver withLanBridge em lib/realtime.ts): o celular
  // continua falando só com o SERVIDOR LOCAL deste PC, só precisa estar na
  // mesma rede DELE (não da mesa toda). Só "local" (BroadcastChannel entre
  // abas, sem servidor nenhum) fica de fora mesmo.
  const roomMode = useTableStore((s) => s.mode);

  // `phoneIp` (não `localIp`) de propósito — ver comentário em lib/lan.ts.
  // `localIp` prefere a VPN Radmin quando presente (certo pro endereço da
  // mesa hospedada em Home.tsx), mas o celular que escaneia esse QR tá na
  // rede física normal, não na Radmin — usar `localIp` aqui fazia a página
  // simplesmente não carregar pra ninguém com a Radmin ativa no PC.
  const ip = LAN_INFO?.phoneIp || LAN_INFO?.localIp;
  const url =
    hasLan && (roomMode === 'lan' || roomMode === 'supabase') && LAN_INFO && ip
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
    // "local" (BroadcastChannel entre abas do mesmo navegador, sem servidor
    // nenhum) é o único modo que realmente não dá pra atender — mostra o
    // aviso só nesse caso (lan/supabase já caem no card com QR acima). Fora
    // do executável (hasLan false) nem deveria aparecer esse card.
    if (hasLan && roomMode === 'local') {
      return (
        <div className="ficha-qr">
          <div className="ficha-qr-text">
            <strong>Ficha no celular</strong>
            <span className="faint">Só disponível hospedando uma mesa de verdade (rede local ou pela internet).</span>
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
