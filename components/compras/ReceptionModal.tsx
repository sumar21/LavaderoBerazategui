
import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PurchaseOrder } from '@/types';
import { notify } from '../ui/Notice';
import { capitalizeFirst } from '../../utils/text';

interface ReceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onSave: (orderId: string, inputs: {[sku: string]: number}, remito: string, lote: string, images: {type: 'Remito' | 'Recepcion', data: string, detailId?: string}[]) => void;
  isLoading?: boolean;
}

export const ReceptionModal: React.FC<ReceptionModalProps> = ({ isOpen, onClose, order, onSave, isLoading = false }) => {
  const [currentReceptionInput, setCurrentReceptionInput] = useState<{[sku: string]: string}>({});
  const [remito, setRemito] = useState('');
  const [lote, setLote] = useState('');
  const [remitoImage, setRemitoImage] = useState<string | null>(null);
  const [itemImages, setItemImages] = useState<{[sku: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
        setCurrentReceptionInput({}); // Reset on open
        setRemito('');
        setLote('');
        setRemitoImage(null);
        setItemImages({});
    }
  }, [isOpen]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const elem = document.createElement('canvas');
          const MAX_WIDTH = 800; // Ancho máximo deseado
          const scaleFactor = MAX_WIDTH / img.width;
          elem.width = MAX_WIDTH;
          elem.height = img.height * scaleFactor;
          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, elem.width, elem.height);
          ctx?.canvas.toBlob((blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => resolve(reader.result as string);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          }, 'image/jpeg', 0.7); // Calidad de compresión (0.7 = 70%)
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const stripBase64Prefix = (base64String: string): string => {
    const prefixIndex = base64String.indexOf(';base64,');
    if (prefixIndex > -1) {
      return base64String.substring(prefixIndex + ';base64,'.length);
    }
    return base64String;
  };

  const handleInputChange = (sku: string, value: string) => {
    setCurrentReceptionInput(prev => ({ ...prev, [sku]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'Remito' | 'Item', sku?: string) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file).then(base64String => {
        if (type === 'Remito') {
            setRemitoImage(base64String);
        } else if (sku) {
            setItemImages(prev => ({ ...prev, [sku]: base64String }));
        }
      }).catch(error => {
        console.error("Error compressing image:", error);
        notify.error("Error al procesar la imagen.");
      });
    }
  };

  const removeImage = (type: 'Remito' | 'Item', sku?: string) => {
      if (type === 'Remito') {
          setRemitoImage(null);
      } else if (sku) {
          const newImages = {...itemImages};
          delete newImages[sku];
          setItemImages(newImages);
      }
  };

  const handleSave = () => {
    if (order) {
        if (!remito) {
            notify.warning("Por favor ingrese el número de remito.");
            return;
        }
        
        const imagesPayload: {type: 'Remito' | 'Recepcion', data: string, detailId?: string}[] = [];
        
        if (remitoImage) {
            imagesPayload.push({ type: 'Remito', data: stripBase64Prefix(remitoImage) });
        }
        
        Object.keys(itemImages).forEach(sku => {
            const imgData: string = itemImages[sku];
            // Find detail ID for this SKU
            const item = order.items.find(i => i.sku === sku);
            if (item && item.id) { // Assuming item.id is the SharePoint ID
                const imgDataValue = itemImages[sku] as string;
                if (imgDataValue) {
                    const imageObject: { type: 'Recepcion'; data: string; detailId: string } = {
                        type: 'Recepcion',
                        data: stripBase64Prefix(imgDataValue),
                        detailId: String(item.id),
                    };
                    imagesPayload.push(imageObject);
                }
            }
        });

        const numericInputs: {[sku: string]: number} = {};
        Object.keys(currentReceptionInput).forEach(sku => {
            const numVal = parseInt(currentReceptionInput[sku], 10);
            if (!isNaN(numVal) && numVal > 0) {
                numericInputs[sku] = numVal;
            }
        });

        onSave(order.id, numericInputs, remito, lote, imagesPayload);
    }
  };

  if (!order) return null;

  return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ingresar Mercadería"
        description={`Ingrese las cantidades recibidas para la OC #${order.sharepointId}`}
        maxWidth="4xl" // Más ancho para que entre más info
        loading={isLoading}
        loadingText="Registrando recepción…"
        footer={
            <>
                <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSave} variant="default" disabled={!remito.trim() || isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        'Confirmar Recepción'
                    )}
                </Button>
            </>
        }
      >
        <div className="flex flex-col md:h-[65vh] space-y-6 p-1">
             <div className="bg-brand/10 border border-brand/20 p-4 rounded-md flex items-start gap-3 shrink-0">
                <div className="p-2 bg-brand/10 rounded-full">
                   <Truck className="w-4 h-4 text-brand" />
                </div>
                <div className="text-sm text-brand mt-1">
                   <p className="font-semibold">Recepción Parcial o Total</p>
                   <p className="opacity-80">Ingrese la cantidad que llegó físicamente en este envío. Si completa el total, la orden se cerrará automáticamente.</p>
                </div>
             </div>

             <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                 <div className="flex-1 flex flex-col gap-4 h-full min-w-0">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                         <div>
                             <label className="block text-sm font-medium text-foreground mb-1">Nro. Remito <span className="text-red-500">*</span></label>
                             <input 
                                 type="text"
                                 className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none"
                                 placeholder="Ej: REM-00123"
                                 value={remito}
                                 onChange={(e) => setRemito(e.target.value)}
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-foreground mb-1">Lote</label>
                             <input 
                                 type="text"
                                 className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none"
                                 placeholder="Ej: LOTE-001"
                                 value={lote}
                                 onChange={(e) => setLote(e.target.value)}
                             />
                         </div>
                     </div>

                     <div className="border rounded-md overflow-hidden border-border shadow-sm flex-1 min-h-0 overflow-y-auto custom-scrollbar relative">
                         {/* MOBILE VIEW (Cards) */}
                         <div className="md:hidden divide-y divide-border">
                             {order.items.map((item, idx) => {
                                 const prevReceived = item.receivedQuantity || 0;
                                 const pending = item.quantity - prevReceived;
                                 const isComplete = prevReceived >= item.quantity;
                                 const hasImage = !!itemImages[item.sku];
                                 const currentInput = currentReceptionInput[item.sku] ?? '';

                                 return (
                                     <div key={idx} className={`p-4 ${isComplete ? 'bg-muted/50' : 'bg-card'}`}>
                                         <div className="flex justify-between items-start mb-3">
                                             <div>
                                                 <span className={`block font-bold ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{capitalizeFirst(item.description)}</span>
                                                 <span className="text-xs text-muted-foreground">{item.sku}</span>
                                             </div>
                                             {isComplete && (
                                                 <div className="flex justify-center text-emerald-600 font-bold text-[10px] uppercase items-center gap-1 bg-emerald-50 py-1 px-2 rounded-full border border-emerald-100">
                                                     <CheckCircle className="w-3 h-3" /> Completo
                                                 </div>
                                             )}
                                         </div>

                                         <div className="grid grid-cols-3 gap-2 mb-4">
                                             <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Solic.</span>
                                                 <span className="text-sm font-bold text-foreground">{item.quantity}</span>
                                             </div>
                                             <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                                                 <span className="text-[10px] uppercase font-bold text-muted-foreground">Recib.</span>
                                                 <span className="text-sm font-bold text-foreground">{prevReceived}</span>
                                             </div>
                                             <div className="flex flex-col items-center p-2 bg-brand/10 rounded-lg border border-brand/20">
                                                 <span className="text-[10px] uppercase font-bold text-blue-400">Pend.</span>
                                                 <span className="text-sm font-bold text-brand">{pending}</span>
                                             </div>
                                         </div>

                                         {!isComplete && (
                                             <div className="flex items-center gap-3">
                                                 <div className="flex-1">
                                                     <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Ingresar Cantidad</label>
                                                     <input 
                                                         type="number"
                                                         min="0"
                                                         max={pending}
                                                         className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none transition-colors"
                                                         placeholder="0"
                                                         value={currentInput}
                                                         onChange={(e) => {
                                                             let val = e.target.value;
                                                             if (val !== '') {
                                                                 const numVal = parseInt(val, 10);
                                                                 if (!isNaN(numVal)) {
                                                                     val = Math.min(numVal, pending).toString();
                                                                 }
                                                             }
                                                             handleInputChange(item.sku, val);
                                                         }}
                                                     />
                                                 </div>
                                                 <div className="shrink-0 flex flex-col items-center">
                                                     <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Foto</label>
                                                     <div className="relative">
                                                         <input
                                                             type="file"
                                                             accept="image/*"
                                                             id={`file-mobile-${item.sku}`}
                                                             className="hidden"
                                                             onChange={(e) => handleImageUpload(e, 'Item', item.sku)}
                                                         />
                                                         <label 
                                                             htmlFor={`file-mobile-${item.sku}`}
                                                             className={`h-10 w-10 rounded-lg cursor-pointer transition-colors flex items-center justify-center ${hasImage ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                                                         >
                                                             <Camera className="w-5 h-5" />
                                                         </label>
                                                         {hasImage && (
                                                             <button 
                                                                 onClick={() => removeImage('Item', item.sku)}
                                                                 className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 dark:hover:text-red-950"
                                                             >
                                                                 <X className="w-2.5 h-2.5" />
                                                             </button>
                                                         )}
                                                     </div>
                                                 </div>
                                                 <div className="shrink-0 flex flex-col items-center">
                                                     <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Todo</label>
                                                     <div className="h-10 flex items-center">
                                                         <input
                                                             type="checkbox"
                                                             className="h-6 w-6 rounded border-border text-brand focus:ring-ring cursor-pointer"
                                                             checked={currentInput === String(pending) && pending > 0}
                                                             onChange={(e) => {
                                                                 if (e.target.checked) {
                                                                     handleInputChange(item.sku, String(pending));
                                                                 } else {
                                                                     handleInputChange(item.sku, '');
                                                                 }
                                                             }}
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>

                         {/* DESKTOP VIEW (Table) */}
                         <table className="w-full table-fixed hidden md:table text-[13px]">
                             <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                                 <tr>
                                     <th className="px-4 py-3 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                                     <th className="px-2 py-3 text-center w-20 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Solic.</th>
                                     <th className="px-2 py-3 text-center w-20 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Recib.</th>
                                     <th className="px-2 py-3 text-center w-24 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Ingreso</th>
                                     <th className="px-2 py-3 text-center w-10 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Img</th><th className="px-2 py-3 text-center w-16 text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Todo</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                                 {order.items.map((item, idx) => {
                                     const prevReceived = item.receivedQuantity || 0;
                                     const pending = item.quantity - prevReceived;
                                     const currentInput = currentReceptionInput[item.sku] ?? '';
                                     const isComplete = prevReceived >= item.quantity;
                                     const hasImage = !!itemImages[item.sku];

                                     return (
                                         <tr key={idx} className={`bg-card transition-colors ${isComplete ? 'bg-muted/50' : 'hover:bg-accent'}`}>
                                             <td className="px-4 py-3">
                                                 <span className={`block font-medium ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{capitalizeFirst(item.description)}</span>
                                                 <span className="text-xs text-muted-foreground">{item.sku}</span>
                                             </td>
                                             <td className="px-2 py-3 text-center text-foreground font-medium">{item.quantity}</td>
                                             <td className="px-2 py-3 text-center text-muted-foreground">{prevReceived}</td>
                                             <td className="px-2 py-3">
                                                 {!isComplete ? (
                                                     <input 
                                                         type="number"
                                                         min="0"
                                                         max={pending}
                                                         className="w-full text-center border border-border rounded-lg px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring outline-none transition-colors appearance-none"
                                                         placeholder="0"
                                                         value={currentInput}
                                                         onChange={(e) => {
                                                             let val = e.target.value;
                                                             if (val !== '') {
                                                                 const numVal = parseInt(val, 10);
                                                                 if (!isNaN(numVal)) {
                                                                     val = Math.min(numVal, pending).toString();
                                                                 }
                                                             }
                                                             handleInputChange(item.sku, val);
                                                         }}
                                                     />
                                                 ) : (
                                                     <div className="flex justify-center text-emerald-600 font-bold text-xs uppercase items-center gap-1 bg-emerald-50 py-1.5 px-2 rounded-full border border-emerald-100">
                                                         <CheckCircle className="w-3.5 h-3.5" />
                                                     </div>
                                                 )}
                                             </td>
                                             <td className="px-2 py-3 text-center">
                                                 {!isComplete && (
                                                     <div className="relative inline-block">
                                                         <input
                                                             type="file"
                                                             accept="image/*"
                                                             id={`file-${item.sku}`}
                                                             className="hidden"
                                                             onChange={(e) => handleImageUpload(e, 'Item', item.sku)}
                                                         />
                                                         <label 
                                                             htmlFor={`file-${item.sku}`}
                                                             className={`p-1.5 rounded-lg cursor-pointer transition-colors inline-flex ${hasImage ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
                                                             title="Adjuntar foto del producto"
                                                         >
                                                             <Camera className="w-4 h-4" />
                                                         </label>
                                                         {hasImage && (
                                                             <button 
                                                                 onClick={() => removeImage('Item', item.sku)}
                                                                 className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600 dark:hover:text-red-950"
                                                             >
                                                                 <X className="w-2 h-2" />
                                                             </button>
                                                         )}
                                                     </div>
                                                 )}
                                             </td>
                                             <td className="px-2 py-3 text-center">
                                                {!isComplete && (
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-border text-brand focus:ring-ring cursor-pointer"
                                                        checked={currentInput === String(pending) && pending > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                handleInputChange(item.sku, String(pending));
                                                            } else {
                                                                handleInputChange(item.sku, '');
                                                            }
                                                        }}
                                                        title="Recibir todo lo pendiente"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                     );
                                 })}
                             </tbody>
                         </table>
                     </div>
                 </div>

                 {/* Remito Image Section */}
                 <div className="lg:w-72 shrink-0 flex flex-col h-full">
                     <label className="block text-sm font-medium text-foreground mb-2 shrink-0">Foto del Remito</label>
                     <div className="border-2 border-dashed border-border rounded-md p-4 flex flex-col items-center justify-center text-center flex-1 min-h-[200px] bg-muted hover:bg-accent transition-colors relative">
                         {remitoImage ? (
                             <div className="relative w-full h-full">
                                 <img src={remitoImage} alt="Remito" className="w-full h-full object-contain rounded-lg" />
                                 <button 
                                     onClick={() => removeImage('Remito')}
                                     className="absolute top-2 right-2 bg-red-500/80 text-white p-1.5 rounded-full hover:bg-red-600 dark:hover:text-red-950 backdrop-blur-sm"
                                 >
                                     <X className="w-4 h-4" />
                                 </button>
                             </div>
                         ) : (
                             <>
                                 <input
                                     type="file"
                                     accept="image/*"
                                     id="remito-upload"
                                     className="hidden"
                                     onChange={(e) => handleImageUpload(e, 'Remito')}
                                 />
                                 <label htmlFor="remito-upload" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                                     <div className="p-3 bg-card rounded-full shadow-sm mb-3">
                                         <Camera className="w-6 h-6 text-muted-foreground" />
                                     </div>
                                     <span className="text-sm text-muted-foreground font-medium">Subir foto del remito</span>
                                     <span className="text-xs text-muted-foreground mt-1">Click para adjuntar</span>
                                 </label>
                             </>
                         )}
                     </div>
                 </div>
             </div>
         </div>
      </Modal>
  );
};
