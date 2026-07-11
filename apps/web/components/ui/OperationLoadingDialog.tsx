type OperationLoadingDialogProps = {
  open: boolean;
  title: string;
  description: string;
};

export function OperationLoadingDialog({ open, title, description }: OperationLoadingDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="operation-loading-title" aria-describedby="operation-loading-description" aria-busy="true" className="w-full max-w-md rounded-xl border border-border-light bg-panel shadow-2xl">
        <div className="px-5 py-6 text-center">
          <span className="dialog-loading-orbit float-none mx-auto h-8 w-8" aria-hidden="true" />
          <p className="section-label mt-4 text-cyan">同步中</p>
          <h2 id="operation-loading-title" className="mt-1 text-lg font-semibold text-text">{title}</h2>
          <p id="operation-loading-description" className="mt-2 text-sm leading-6 text-text-dim">{description}</p>
        </div>
      </section>
    </div>
  );
}
