import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

type NoticeKind = 'success' | 'error' | 'warning';

interface Notice {
  kind: NoticeKind;
  message: string;
}

// Module-level dispatch so callers replace `alert(msg)` with `notify.error(msg)`
// without threading a hook through every component — including non-React callers.
let dispatch: (notice: Notice) => void = () => {};

const emit = (kind: NoticeKind) => (message: string) => dispatch({ kind, message });

export const notify = {
  success: emit('success'),
  error: emit('error'),
  warning: emit('warning'),
};

const STYLES: Record<NoticeKind, { title: string; icon: typeof CheckCircle2; iconClass: string; ring: string }> = {
  success: { title: 'Listo', icon: CheckCircle2, iconClass: 'text-emerald-600', ring: 'bg-emerald-50' },
  warning: { title: 'Atención', icon: AlertTriangle, iconClass: 'text-amber-600', ring: 'bg-amber-50' },
  error: { title: 'Algo salió mal', icon: XCircle, iconClass: 'text-red-600', ring: 'bg-red-50' },
};

/**
 * Mount once, near the root. Renders whatever the latest `notify.*` call queued.
 */
export const NoticeHost: React.FC = () => {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    dispatch = setNotice;
    return () => { dispatch = () => {}; };
  }, []);

  const style = notice ? STYLES[notice.kind] : null;
  const Icon = style?.icon;

  return (
    <Modal
      isOpen={notice !== null}
      onClose={() => setNotice(null)}
      title={style?.title ?? ''}
      maxWidth="sm"
      footer={<Button onClick={() => setNotice(null)} className="w-full sm:w-auto">Aceptar</Button>}
    >
      <div className="flex gap-4 items-start">
        {Icon && style && (
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.ring}`}>
            <Icon className={`w-5 h-5 ${style.iconClass}`} />
          </div>
        )}
        {/* Messages are authored with \n line breaks; preserve them. */}
        <p className="text-sm text-slate-700 whitespace-pre-line pt-2">{notice?.message}</p>
      </div>
    </Modal>
  );
};
