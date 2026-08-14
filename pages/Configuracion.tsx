
import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, AlertCircle, Users, Package, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Combobox } from '../components/ui/Combobox';
import { MultiSelect } from '../components/ui/MultiSelect';
import { QuickAddArticleModal } from '../components/compras/QuickAddArticleModal';
import { Provider, Article } from '@/types';
import { configService } from '../services/configService';
import { notify } from '../components/ui/Notice';

type ConfigTab = 'PROVEEDORES' | 'ARTICULOS';

interface ConfiguracionProps {
    initialTab?: ConfigTab;
}

export const Configuracion: React.FC<ConfiguracionProps> = ({ initialTab = 'PROVEEDORES' }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if prop changes (Sidebar navigation)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // --- STATE DATA ---
  const [providers, setProviders] = useState<Provider[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [apiProviders, apiArticles] = await Promise.all([
        configService.getProveedores(undefined, 'Activo'),
        configService.getArticulos(undefined, 'ALTA')
      ]);

      const mappedProviders: Provider[] = apiProviders.map(p => ({
        id: p.id,
        name: p.proveedor,
        segment: p.segmento,
        email: p.emails,
        phone: p.telefono,
        paymentCondition: 'ARS', // Default
        currency: (p.moneda === 'USD' ? 'USD' : 'ARS') as 'ARS' | 'USD'
      }));
      setProviders(mappedProviders);

      const mappedArticles: Article[] = apiArticles.map(a => ({
        id: parseInt(a.id),
        providerIds: (a.proveedores || a.Proveedores || '').split(/[;,]/).map((s: string) => s.trim()).filter(Boolean),
        name: a.descripcion || a.Descripcion || a.titulo || a.Titulo || '',
        category: a.familia || a.Familia || '',
        code: a.sku || a.SKU || '',
        unitPrice: parseFloat(a.precio || a.Precio || '0'),
        nOrden: a.nOrden || a.NOrden || a.NOrden_A,
        principal: a.principal || a.Principal,
        clientCode: a.codigoCliente || a.CodigoCliente,
        clothingType: a.tipoPrenda || a.TipoPrenda,
        status: a.status || a.Status
      }));
      setArticles(mappedArticles);

    } catch (error) {
      console.error("Error fetching config data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkArticleModalOpen, setIsBulkArticleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // --- FORM DATA ---
  const [providerForm, setProviderForm] = useState<Partial<Provider>>({});
  const [articleForm, setArticleForm] = useState<Partial<Article>>({});

  // --- HANDLERS ---

  const handleOpenNewItemModal = () => {
     if (activeTab === 'ARTICULOS') {
         setIsBulkArticleModalOpen(true);
     } else {
         handleOpenModal();
     }
  };

  const handleOpenModal = (item?: any) => {
    setEditingItem(item || null);
    if (activeTab === 'PROVEEDORES') {
        setProviderForm(item || { name: '', segment: '', phone: '', email: '', paymentCondition: 'ARS', currency: 'ARS' });
    } else {
        // Prepare initial form for article. If editing, use existing providerIds or empty array
        setArticleForm(item || { name: '', category: '', code: '', unitPrice: 0, providerIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setEditingItem(item);
    setIsDeleteModalOpen(true);
  };

  const isFormValid = activeTab === 'PROVEEDORES' 
    ? !!providerForm.name?.trim() 
    : !!articleForm.name?.trim() && !!articleForm.code?.trim();

  const handleSave = async () => {
    try {
        if (activeTab === 'PROVEEDORES') {
            if (editingItem) {
                // PATCH: All fields are now editable
                await configService.updateProveedor(editingItem.id, {
                    Status: 'Activo',
                    Proveedor: providerForm.name,
                    Segmento: providerForm.segment,
                    Moneda: providerForm.currency,
                    Emails: providerForm.email,
                    Telefono: providerForm.phone
                });
                
                // Update local state with ALL fields
                setProviders(providers.map(p => p.id === editingItem.id ? { 
                    ...p, 
                    name: providerForm.name || p.name,
                    segment: providerForm.segment || p.segment,
                    currency: providerForm.currency || p.currency,
                    email: providerForm.email || p.email,
                    phone: providerForm.phone || p.phone,
                 } as Provider : p));
            } else {
                // POST: Create Provider
                const newProvider = await configService.createProveedor({
                    Titulo: '[sumar]',
                    Proveedor: providerForm.name,
                    Segmento: providerForm.segment,
                    Moneda: providerForm.currency,
                    Emails: providerForm.email,
                    Telefono: providerForm.phone,
                    Status: 'Activo'
                });
                
                // Map back to local Provider type
                const mappedProvider: Provider = {
                    id: newProvider.id || newProvider.ID || String(Math.random()),
                    name: newProvider.proveedor || newProvider.Proveedor || newProvider.Proveedor_P || providerForm.name || '',
                    segment: newProvider.segmento || newProvider.Segmento || newProvider.Segmento_P || providerForm.segment || '',
                    email: newProvider.emails || newProvider.Emails || newProvider.Emails_P || providerForm.email || '',
                    phone: newProvider.telefono || newProvider.Telefono || newProvider.Telefono_P || providerForm.phone || '',
                    paymentCondition: 'ARS',
                    currency: (newProvider.moneda === 'USD' || newProvider.Moneda === 'USD' ? 'USD' : 'ARS') as 'ARS' | 'USD'
                };
                setProviders([...providers, mappedProvider]);
            }
        } else {
            if (editingItem) {
                // PATCH: Update all fields
                const proveedoresStr = articleForm.providerIds?.join(';') || '';
                
                // Extract Client Code from SKU (3rd part)
                const skuParts = (articleForm.code || '').split('-');
                const derivedClientCode = skuParts.length >= 3 ? skuParts[2] : (editingItem.clientCode || 'AC');

                await configService.updateArticulo(editingItem.id.toString(), {
                    Status: 'ALTA', // Always ALTA unless deleted
                    Precio: articleForm.unitPrice?.toString(),
                    SKU: articleForm.code,
                    Concat: `${articleForm.code} - ${articleForm.name}`,
                    TipoPrenda: articleForm.category, // Assuming Category maps to TipoPrenda as per creation logic
                    Descripcion: articleForm.name,
                    Principal: editingItem.principal || 'SUMAR',
                    Familia: articleForm.category,
                    CodigoCliente: derivedClientCode,
                    // NOrden: editingItem.nOrden || '1', // REMOVED: NOrden should not be updated
                    Proveedores: proveedoresStr
                });

                // Update local state
                setArticles(articles.map(a => a.id === editingItem.id ? { 
                    ...a, 
                    unitPrice: articleForm.unitPrice !== undefined ? articleForm.unitPrice : a.unitPrice,
                    name: articleForm.name || a.name,
                    category: articleForm.category || a.category,
                    code: articleForm.code || a.code,
                    providerIds: articleForm.providerIds || a.providerIds,
                    // Preserve other fields
                    nOrden: editingItem.nOrden || a.nOrden,
                    principal: editingItem.principal || a.principal,
                    clientCode: derivedClientCode,
                    clothingType: articleForm.category || a.clothingType // Update clothingType if category changed
                } as Article : a));
            } else {
                // POST: Create Article
                // Format providers as semicolon separated string of IDs
                const proveedoresStr = articleForm.providerIds?.join(';') || '';
                
                // Calculate NOrden: Max(Filter(Articulos; IsNumeric(NOrden_A)); Value(NOrden_A)) + 1
                const maxNOrden = articles.reduce((max, art) => {
                    const currentNOrden = parseInt(art.nOrden || '0');
                    return !isNaN(currentNOrden) && currentNOrden > max ? currentNOrden : max;
                }, 0);
                
                const newNOrden = (maxNOrden + 1).toString();

                // Extract Client Code from SKU (3rd part)
                const skuParts = (articleForm.code || '').split('-');
                const derivedClientCode = skuParts.length >= 3 ? skuParts[2] : 'AC';
                
                const newArticle = await configService.createArticulo({
                    Titulo: '[sumar]', // Fixed title as requested
                    SKU: articleForm.code,
                    Concat: `${articleForm.code} - ${articleForm.name}`,
                    TipoPrenda: articleForm.category, // Category is TipoPrenda
                    Descripcion: articleForm.name,
                    Status: 'ALTA', // Changed from 'Activo' to 'ALTA'
                    Principal: 'SUMAR',
                    Familia: articleForm.category,
                    CodigoCliente: derivedClientCode,
                    NOrden: newNOrden, 
                    Proveedores: proveedoresStr,
                    Precio: articleForm.unitPrice?.toString()
                });

                const mappedArticle: Article = {
                    id: parseInt(newArticle.id || newArticle.ID || '0'),
                    providerIds: (newArticle.proveedores || newArticle.Proveedores || proveedoresStr).split(/[;,]/).map(s => s.trim()),
                    name: newArticle.descripcion || newArticle.Descripcion || newArticle.titulo || newArticle.Titulo || articleForm.name || '',
                    category: newArticle.familia || newArticle.Familia || articleForm.category || '',
                    code: newArticle.sku || newArticle.SKU || articleForm.code || '',
                    unitPrice: parseFloat(newArticle.precio || newArticle.Precio || articleForm.unitPrice?.toString() || '0')
                };
                setArticles([...articles, mappedArticle]);
            }
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error("Error saving item:", error);
        notify.error("Error al guardar. Por favor intente nuevamente.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!editingItem) return;
    try {
        if (activeTab === 'PROVEEDORES') {
            await configService.updateProveedor(editingItem.id, { Status: 'Inactivo' });
            setProviders(providers.filter(p => p.id !== editingItem.id));
        } else {
            await configService.updateArticulo(editingItem.id.toString(), { Status: 'BAJA' });
            setArticles(articles.filter(a => a.id !== editingItem.id));
        }
        setIsDeleteModalOpen(false);
    } catch (error) {
        console.error("Error deleting item:", error);
        notify.error("Error al eliminar. Por favor intente nuevamente.");
    }
  };

  // --- FILTERING ---
  const filteredProviders = providers.filter(p => {
    const name = p.name || '';
    const segment = p.segment || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           segment.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredArticles = articles.filter(a => {
    const name = a.name || '';
    const code = a.code || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           code.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  // Helper to get provider names string
  const getProviderNames = (ids: string[]) => {
      if (!ids || ids.length === 0) return <span className="text-slate-300 italic">Sin asignar</span>;
      return ids.map(id => providers.find(p => p.id === id)?.name).filter(Boolean).join(", ");
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-slate-50/50 overflow-hidden">
      
      {/* HEADER & SWITCH */}
      <div className="px-4 md:px-8 py-4 md:py-6 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
               <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                   {activeTab === 'PROVEEDORES' ? 'Administración Proveedores' : 'Configuración Artículos'}
               </h2>
               <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1">Gestión de datos maestros del sistema</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full items-center">
             <div className="relative flex-1 w-full group">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               <Input 
                 placeholder="Buscar..." 
                 className="pl-10 w-full"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchData}
                  disabled={isLoading}
                  className="rounded-xl bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                </Button>

                <Button variant="primary" className="flex-1 sm:flex-none rounded-xl shadow-lg shadow-blue-900/20" onClick={handleOpenNewItemModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="whitespace-nowrap">{activeTab === 'PROVEEDORES' ? 'Nuevo Proveedor' : 'Nuevo Artículo'}</span>
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-auto px-4 md:px-8 pb-8 pt-2 custom-scrollbar">
         {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <RefreshCw className="w-12 h-12 mb-4 animate-spin text-blue-500" />
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cargando configuración...</h3>
                <p className="text-slate-500 mt-2 text-center max-w-xs">Por favor espere mientras actualizamos los datos.</p>
            </div>
         ) : (activeTab === 'PROVEEDORES' && filteredProviders.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-slate-100">
                    <Users className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Sin proveedores</h3>
                <p className="text-slate-500 mt-2 text-center max-w-xs">No se encontraron proveedores con los filtros actuales.</p>
                <Button variant="primary" className="mt-6 rounded-xl shadow-lg shadow-blue-900/20" onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Proveedor
                </Button>
            </div>
         ) : (activeTab === 'ARTICULOS' && filteredArticles.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-slate-100">
                    <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Sin artículos</h3>
                <p className="text-slate-500 mt-2 text-center max-w-xs">No se encontraron artículos con los filtros actuales.</p>
                <Button variant="primary" className="mt-6 rounded-xl shadow-lg shadow-blue-900/20" onClick={handleOpenNewItemModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Artículo
                </Button>
            </div>
         ) : (
             <div className="bg-white md:rounded-2xl shadow-xl shadow-slate-200/60 md:ring-1 md:ring-slate-900/5 overflow-hidden min-h-[500px]">
                {activeTab === 'PROVEEDORES' ? (
                    <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredProviders.map((prov) => (
                            <div key={prov.id} className="p-4 bg-white active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{prov.name}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{prov.segment}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                                        {prov.paymentCondition}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Teléfono</span>
                                        <span className="text-xs text-slate-600 font-mono">{prov.phone || '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Mail</span>
                                        <span className="text-xs text-slate-600 truncate">{prov.email || '-'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenModal(prov)}>
                                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100" onClick={() => handleDeleteClick(prov)}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PROVEEDORES TABLE (Desktop) */}
                    <table className="w-full text-left hidden md:table">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Segmento</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Mail</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Condición</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProviders.map((prov) => (
                                <tr key={prov.id} className="hover:bg-blue-50/30 transition-all duration-200 group">
                                    <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{prov.name}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{prov.segment}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-mono">{prov.phone}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{prov.email}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {prov.paymentCondition}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleOpenModal(prov)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(prov)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </>
                ) : (
                    <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredArticles.map((art) => (
                            <div key={art.id} className="p-4 bg-white active:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{art.name}</h4>
                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {art.id} | {art.code}</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">
                                        {formatCurrency(art.unitPrice)}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Proveedores</span>
                                        <span className="text-xs text-slate-600 line-clamp-1">{getProviderNames(art.providerIds)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Categoría</span>
                                        <div>
                                            <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] border border-slate-200 uppercase font-medium mt-0.5">{art.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenModal(art)}>
                                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100" onClick={() => handleDeleteClick(art)}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ARTICULOS TABLE (Desktop) */}
                    <table className="w-full text-left hidden md:table">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nro. Art</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Artículo</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Proveedores</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Precio Unitario</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredArticles.map((art) => (
                                <tr key={art.id} className="hover:bg-blue-50/30 transition-all duration-200 group">
                                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{art.id}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-900 text-sm">{art.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={art.providerIds?.join(', ')}>
                                        {getProviderNames(art.providerIds)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 uppercase">{art.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-mono">{art.code}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(art.unitPrice)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleOpenModal(art)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(art)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </>
                )}
             </div>
         )}
      </div>

      {/* --- MODALS --- */}
      
      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? (activeTab === 'PROVEEDORES' ? 'Editar Proveedor' : 'Editar Artículo') : (activeTab === 'PROVEEDORES' ? 'Nuevo Proveedor' : 'Nuevo Artículo')}
        maxWidth="lg"
        footer={
            <>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!isFormValid}>{editingItem ? 'Editar' : 'Agregar'}</Button>
            </>
        }
      >
         <div className="space-y-4">
            {activeTab === 'PROVEEDORES' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Proveedor" 
                            placeholder="Nombre del proveedor"
                            value={providerForm.name || ''} 
                            onChange={e => setProviderForm({...providerForm, name: e.target.value})}
                        />
                        <Input 
                            label="Segmento" 
                            placeholder="Ej: T. Producto terminado"
                            value={providerForm.segment || ''} 
                            onChange={e => setProviderForm({...providerForm, segment: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Teléfono" 
                            placeholder="+549..."
                            value={providerForm.phone || ''} 
                            onChange={e => setProviderForm({...providerForm, phone: e.target.value})}
                        />
                        <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Moneda</label>
                             <div className="relative">
                                 <select 
                                    className="flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-sm transition-all duration-200 hover:border-slate-400 cursor-pointer"
                                    value={providerForm.currency}
                                    onChange={e => setProviderForm({...providerForm, currency: e.target.value as any})}
                                 >
                                    <option value="ARS">ARS - Peso Argentino</option>
                                    <option value="USD">USD - Dólar Estadounidense</option>
                                 </select>
                                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                    <ChevronDown className="h-4 w-4" />
                                 </div>
                             </div>
                        </div>
                    </div>
                    <Input 
                        label="Mail" 
                        placeholder="contacto@empresa.com"
                        value={providerForm.email || ''} 
                        onChange={e => setProviderForm({...providerForm, email: e.target.value})}
                    />
                </>
            ) : (
                <>
                    <MultiSelect 
                        label="Proveedores"
                        placeholder="Seleccionar proveedores..."
                        options={providers.map(p => ({ label: p.name, value: p.id }))}
                        value={articleForm.providerIds || []}
                        onChange={vals => setArticleForm({...articleForm, providerIds: vals})}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input 
                            label="Artículo" 
                            placeholder="Nombre del artículo"
                            value={articleForm.name || ''} 
                            onChange={e => setArticleForm({...articleForm, name: e.target.value})}
                        />
                         <Input 
                            label="Categoría" 
                            placeholder="Ej: BOLSILLO"
                            value={articleForm.category || ''} 
                            onChange={e => setArticleForm({...articleForm, category: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Código" 
                            placeholder="SKU-0000"
                            value={articleForm.code || ''} 
                            onChange={e => setArticleForm({...articleForm, code: e.target.value})}
                        />
                        <Input 
                            label="Precio Unitario" 
                            type="number"
                            placeholder="0.00"
                            value={articleForm.unitPrice || ''} 
                            onChange={e => setArticleForm({...articleForm, unitPrice: parseFloat(e.target.value)})}
                        />
                    </div>
                </>
            )}
         </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={activeTab === 'PROVEEDORES' ? 'Eliminar Proveedor' : 'Eliminar Artículo'}
        footer={
            <>
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                <Button variant="danger" onClick={handleConfirmDelete}>
                    {activeTab === 'PROVEEDORES' ? 'Eliminar Proveedor' : 'Eliminar Artículo'}
                </Button>
            </>
        }
      >
        <div className="flex items-center gap-4 text-slate-600 bg-red-50 p-5 rounded-xl border border-red-100">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
                <AlertCircle className="text-red-600 w-6 h-6" />
            </div>
            <div>
                <p className="font-bold text-red-900 text-base">¿Estás seguro de que quieres eliminar este elemento?</p>
                <p className="text-sm mt-1 text-red-800/80">Esta acción no se puede deshacer.</p>
            </div>
        </div>
      </Modal>

      <QuickAddArticleModal 
        isOpen={isBulkArticleModalOpen}
        onClose={() => setIsBulkArticleModalOpen(false)}
        providers={providers}
        articles={articles}
        onArticleCreated={(newArticle) => {
            setArticles(prev => [...prev, newArticle]);
        }}
      />
    </div>
  );
};
