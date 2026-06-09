export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Подтвердить', danger }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in" onClick={onCancel}>
      <div className="card p-6 max-w-md w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-stone/80 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary !px-4 !py-2">Отмена</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary !px-4 !py-2'}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
