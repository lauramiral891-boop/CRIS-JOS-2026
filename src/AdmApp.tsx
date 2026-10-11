import AdminRoom from "./components/AdminRoom";

/** Aplicação do ADM (site à parte): abre direto na Sala do ADM. */
export default function AdmApp() {
  return (
    <div className="cj-root relative h-[100dvh] overflow-hidden bg-[#050505] text-white">
      <div className="cj-col relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col">
        <div className="cj-frame relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#121212]">
          <AdminRoom onClose={() => window.location.reload()} />
        </div>
      </div>
    </div>
  );
}
