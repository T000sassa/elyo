export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "hsl(40, 20%, 97%)" }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] p-12 flex-shrink-0 sidebar-texture"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C8 2 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 2 8 2z" fill="white" fillOpacity="0.9"/>
                <path d="M8 6v4M6 8h4" stroke="#0a4540" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span
              className="text-white text-xl font-semibold"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Elyo
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1
              className="text-4xl font-semibold leading-tight text-white"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Wellbeing,<br />das wirklich<br />wirkt.
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Anonymisierte Einblicke. Persönliches Wohlbefinden.<br />
              Datenschutz by Design.
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="space-y-3">
          {[
            { icon: "🔒", text: "Daten immer anonymisiert" },
            { icon: "📊", text: "Wöchentliche Check-ins" },
            { icon: "🌱", text: "Team-Gesundheit im Blick" },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}
            >
              <span>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C8 2 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 2 8 2z" fill="white" fillOpacity="0.9"/>
                <path d="M8 6v4M6 8h4" stroke="#0a4540" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span
              className="text-gray-900 text-lg font-semibold"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Elyo
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
