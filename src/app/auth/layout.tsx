export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-elyo-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-elyo-500 mb-4">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">ELYO</h1>
          <p className="text-sm text-slate-500 mt-1">Employee Wellbeing Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
