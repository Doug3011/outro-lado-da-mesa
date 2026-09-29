import { useState, type CSSProperties } from 'react';
import { ELEMENT_QUIZ } from '../data/elementQuiz';
import { scoreElementQuiz } from '../lib/elementQuiz';
import { ELEMENTS, ELEMENT_DESCRIPTION, ELEMENT_PALETTE, type Element } from '../data/ordem';

function paletteStyle(el: Element): CSSProperties {
  const p = ELEMENT_PALETTE[el];
  return {
    '--daily-accent': p.accent,
    '--daily-accent-bright': p.bright,
    '--daily-accent-deep': p.deep,
    '--daily-accent-glow': p.glow,
    '--daily-accent-glow-soft': p.glowSoft,
    '--daily-bg-tint': p.bgTint,
  } as CSSProperties;
}

// Teste "qual elemento combina com você" — página cheia estilo cartaz, mesmo
// padrão do Desafio Diário (daily-page): pergunta por vez, sem poder voltar
// (senão dava pra "forçar" o resultado tentando de novo até dar o elemento
// que queria), termina numa revelação temática na cor do elemento sorteado.
export function ElementQuizPage({
  onFinish,
  onBack,
}: {
  onFinish: (el: Element) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Element[]>([]);
  const [result, setResult] = useState<Element | null>(null);

  const total = ELEMENT_QUIZ.length;
  const done = result !== null;
  const q = ELEMENT_QUIZ[step];

  const answer = (el: Element) => {
    const next = [...picks, el];
    if (step + 1 < total) {
      setPicks(next);
      setStep(step + 1);
    } else {
      setResult(scoreElementQuiz(next));
    }
  };

  const restart = () => {
    setStep(0);
    setPicks([]);
    setResult(null);
  };

  return (
    <div className="daily-page" style={done && result ? paletteStyle(result) : undefined}>
      <img className="daily-sigil-corner" src="/sigils/sigil-white.png" alt="" aria-hidden />

      <div className="daily-topbar">
        <ElementIcon />
        <span>O Outro Lado da Mesa</span>
      </div>

      <div className="daily-content">
        <button className="daily-back" onClick={onBack}>
          ← Voltar
        </button>

        <h1 className="daily-title">Teste de Elemento</h1>
        <div className="daily-title-rule" />

        {!done && (
          <>
            <p className="daily-rule-box">
              Responda com o que vier mais natural — sem pensar demais. No fim, o app revela
              qual dos 5 elementos de Ordem Paranormal mais combina com você.
            </p>

            <div className="quiz-progress">
              <div
                className="quiz-progress-fill"
                style={{ width: `${(step / total) * 100}%` }}
              />
            </div>
            <p className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
              Pergunta {step + 1} de {total}
            </p>

            <p className="quiz-question">{q.question}</p>
            <div className="quiz-option-list">
              {q.options.map((o) => (
                <button key={o.text} className="quiz-option" onClick={() => answer(o.element)}>
                  {o.text}
                </button>
              ))}
            </div>
          </>
        )}

        {done && result && (
          <div className="quiz-reveal">
            <div className="quiz-reveal-badge">
              <ElementIcon />
              <span>{ELEMENTS.find((e) => e.key === result)?.name}</span>
            </div>
            <p className="quiz-reveal-text">{ELEMENT_DESCRIPTION[result]}</p>

            <button className="daily-cta" onClick={() => onFinish(result)}>
              <ElementIcon size={22} />
              <span>Salvar no meu perfil</span>
              <span className="daily-cta-arrow">→</span>
            </button>
            <button className="link-back" style={{ marginTop: 12 }} onClick={restart}>
              refazer o teste
            </button>
          </div>
        )}
      </div>

      <div className="daily-sigil-small">
        <ElementIcon size={20} />
        <span className="daily-sigil-line" />
      </div>
    </div>
  );
}

function ElementIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c3 3.6 5.5 7 5.5 10.2A5.5 5.5 0 0 1 12 17.7a5.5 5.5 0 0 1-5.5-5.5C6.5 9 9 5.6 12 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 22v-4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
