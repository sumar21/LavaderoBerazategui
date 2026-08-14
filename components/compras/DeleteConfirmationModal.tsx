import React from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string | null;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, orderId }) => {
  if (!isOpen || !orderId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Baja de Orden"
      description={`¿Está seguro de que desea dar de baja la orden de compra #${orderId}? Esta acción no se puede deshacer.`}
      maxWidth="lg"
    >
      <div className="flex flex-col items-center text-center space-y-4 py-4">
        <div className="bg-red-100 p-3 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-slate-600">
          La orden pasará a estado <span className="font-bold">"Baja"</span> y no será visible en el gestor principal.
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm}>Confirmar Baja</Button>
      </div>
    </Modal>
  );
};
