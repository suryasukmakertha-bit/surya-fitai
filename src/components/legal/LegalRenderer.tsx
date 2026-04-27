import { LegalSection } from './legalContent';

interface Props {
  sections: LegalSection[];
}

export default function LegalRenderer({ sections }: Props) {
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <section key={i}>
          <h3 className="text-white font-semibold text-sm mb-2">{s.heading}</h3>

          {s.highlight && s.body && (
            <p className="text-amber-400 text-sm leading-relaxed">{s.body}</p>
          )}
          {!s.highlight && s.body && (
            <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
          )}

          {s.items && (
            <div className="space-y-2 mt-1">
              {s.items.map((item, j) => (
                <div key={j} className="text-sm text-gray-400 leading-relaxed">
                  <p>
                    <span className="text-white font-medium">{item.label}: </span>
                    {item.text}
                  </p>
                  {item.bullets && (
                    <ul className="space-y-1 mt-1 ml-1">
                      {item.bullets.map((b, k) => (
                        <li key={k} className="flex gap-2">
                          <span className="text-green-400 flex-shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {s.bullets && (
            <ul className="space-y-1 mt-1">
              {s.bullets.map((b, j) => (
                <li key={j} className="text-sm text-gray-400 flex gap-2">
                  <span className="text-green-400 flex-shrink-0">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {s.contact && (
            <div className="text-sm text-gray-400 space-y-1">
              <p>Email: <span className="text-green-400">fitaisurya@gmail.com</span></p>
              <p>Website: <span className="text-gray-300">surya-fitai.com</span></p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
