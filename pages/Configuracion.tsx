
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
import { Loader } from '../components/ui/Loader';
import { PageHeader } from '../components/ui/PageHeader';
import { capitalizeFirst } from '../utils/text';

type ConfigTab = 'PROVEEDORES' | 'ARTICULOS';

interface ConfiguracionProps {
    initialTab?: ConfigTab;
}

export const Configuracion: React.FC<ConfiguracionProps> = ({ initialTab = 'PROVEEDORES' }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if prop changes (Sidebar navigation).
  // Switching tabs also clears the search and refetches: the previous tab's
  // filter does not apply to the new list, and leaving it on made the page look
  // empty. The component is not remounted, so nothing else would reset it.
  useEffect(() => {
    setActiveTab(initialTab);
    setSearchTerm('');
    fetchData();
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

  /**
   * Resolved provider names for an article. Each name is capitalised on its
   * own — capitalising the joined string would only reach the first provider.
   */
  const providerNames = (ids?: string[]): string =>
      (ids ?? []).map(id => capitalizeFirst(providers.find(p => p.id === id)?.name)).filter(Boolean).join(', ');

  const getProviderNames = (ids: string[]) => {
      const names = providerNames(ids);
      if (!names) return <span className="text-muted-foreground italic">Sin asignar</span>;
      return names;
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500 bg-muted/50 overflow-hidden">
      
      {/* HEADER & SWITCH */}
      <div className="shrink-0 border-b border-border bg-muted px-4 py-4 md:px-8">
        <PageHeader
          title={activeTab === 'PROVEEDORES' ? 'Administración Proveedores' : 'Configuración Artículos'}
          subtitle="Gestión de datos maestros del sistema"
          actions={
            <>
              <div className="relative min-w-[7rem] flex-1 sm:w-64 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar..."
                  className="h-10 bg-card pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchData}
                disabled={isLoading}
                className="h-10 w-10 shrink-0 bg-card"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button className="h-10 shrink-0" onClick={handleOpenNewItemModal}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="whitespace-nowrap">{activeTab === 'PROVEEDORES' ? 'Nuevo Proveedor' : 'Nuevo Artículo'}</span>
              </Button>
            </>
          }
        />
      </div>

      {/* CONTENT AREA */}
      <div className="flex min-h-0 flex-1 flex-col px-4 md:px-8 pb-4 pt-5 md:overflow-hidden overflow-y-auto">
         {isLoading ? (
            <div className="flex h-full min-h-[400px] items-center justify-center">
            <Loader text="Cargando configuración…" />
          </div>
         ) : (activeTab === 'PROVEEDORES' && filteredProviders.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center mb-6 shadow-sm ring-1 ring-border">
                    <Users className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Sin proveedores</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-xs">No se encontraron proveedores con los filtros actuales.</p>
                <Button variant="default" className="mt-6 rounded-md" onClick={() => handleOpenModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Proveedor
                </Button>
            </div>
         ) : (activeTab === 'ARTICULOS' && filteredArticles.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center mb-6 shadow-sm ring-1 ring-border">
                    <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">Sin artículos</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-xs">No se encontraron artículos con los filtros actuales.</p>
                <Button variant="default" className="mt-6 rounded-md" onClick={handleOpenNewItemModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Artículo
                </Button>
            </div>
         ) : (
             <div className="flex min-h-0 flex-1 flex-col bg-card md:rounded-lg border border-border shadow-sm md:overflow-hidden">
                {activeTab === 'PROVEEDORES' ? (
                    <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden divide-y divide-border">
                        {filteredProviders.map((prov) => (
                            <div key={prov.id} className="p-4 bg-card active:bg-muted transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-foreground">{capitalizeFirst(prov.name)}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">{prov.segment}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground uppercase">
                                        {prov.paymentCondition}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Teléfono</span>
                                        <span className="text-xs text-muted-foreground">{prov.phone || '-'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Mail</span>
                                        <span className="text-xs text-muted-foreground truncate">{prov.email || '-'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
                    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
                    <table className="w-full text-left hidden md:table text-[13px]">
                        <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                            <tr className="border-b border-border bg-muted/50">
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Proveedor</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Segmento</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Teléfono</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Mail</th>
                                <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Condición</th>
                                <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                            {filteredProviders.map((prov) => (
                                <tr key={prov.id} className="hover:bg-brand/10/30 transition-all duration-200 group">
                                    <td className="h-16 px-4 py-3 font-semibold text-foreground">{capitalizeFirst(prov.name)}</td>
                                    <td className="h-16 px-4 py-3 text-muted-foreground">{prov.segment}</td>
                                    <td className="h-16 px-4 py-3 text-muted-foreground">{prov.phone}</td>
                                    <td className="h-16 px-4 py-3 text-muted-foreground">{prov.email}</td>
                                    <td className="h-16 px-4 py-3 text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                                            {prov.paymentCondition}
                                        </span>
                                    </td>
                                    <td className="h-16 px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleOpenModal(prov)} className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(prov)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    </>
                ) : (
                    <>
                    {/* MOBILE CARDS VIEW */}
                    <div className="md:hidden divide-y divide-border">
                        {filteredArticles.map((art) => (
                            <div key={art.id} className="p-4 bg-card active:bg-muted transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-foreground">{capitalizeFirst(art.name)}</h4>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">ID: {art.id} | {art.code}</p>
                                    </div>
                                    <span className="text-sm font-bold text-foreground">
                                        {formatCurrency(art.unitPrice)}
                                    </span>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Proveedores</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{getProviderNames(art.providerIds)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Categoría</span>
                                        <div>
                                            <span className="inline-block bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] border border-border uppercase font-medium mt-0.5">{art.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
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
                    <div className="hidden min-h-0 flex-1 overflow-auto md:block">
                    <table className="w-full text-left hidden md:table text-[13px]">
                        <thead className="sticky top-0 z-20 bg-muted border-b border-border">
                            <tr className="border-b border-border bg-muted/50">
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Nro. Art</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Artículo</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Proveedores</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Categoría</th>
                                <th className="h-12 px-4 text-left text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Código</th>
                                <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Precio Unitario</th>
                                <th className="h-12 px-4 text-right text-sm align-middle font-medium text-muted-foreground whitespace-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">
                            {filteredArticles.map((art) => (
                                <tr key={art.id} className="hover:bg-brand/10/30 transition-all duration-200 group">
                                    <td className="h-16 px-4 py-3 text-muted-foreground text-[11px]">{art.id}</td>
                                    <td className="h-16 px-4 py-3 font-semibold text-foreground">{capitalizeFirst(art.name)}</td>
                                    {/* The tooltip is what the truncation hides, so it must be the
                                        resolved names — it used to print the raw provider IDs. */}
                                    <td className="h-16 px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={providerNames(art.providerIds) || undefined}>
                                        {getProviderNames(art.providerIds)}
                                    </td>
                                    <td className="h-16 px-4 py-3">
                                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs border border-border uppercase">{art.category}</span>
                                    </td>
                                    <td className="h-16 px-4 py-3 text-muted-foreground">{art.code}</td>
                                    <td className="h-16 px-4 py-3 text-right font-bold text-foreground">{formatCurrency(art.unitPrice)}</td>
                                    <td className="h-16 px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleOpenModal(art)} className="p-2 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(art)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
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
                             <label className="block text-sm font-semibold text-foreground mb-1.5 ml-1">Moneda</label>
                             <div className="relative">
                                 <select 
                                    className="flex h-10 w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring shadow-sm transition-all duration-200 hover:border-ring cursor-pointer"
                                    value={providerForm.currency}
                                    onChange={e => setProviderForm({...providerForm, currency: e.target.value as any})}
                                 >
                                    <option value="ARS">ARS - Peso Argentino</option>
                                    <option value="USD">USD - Dólar Estadounidense</option>
                                 </select>
                                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
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
                            onChange={e => setArticleForm({...articleForm, unitPrice: parseFloat(e.target.value) || 0})}
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
                <Button variant="destructive" onClick={handleConfirmDelete}>
                    {activeTab === 'PROVEEDORES' ? 'Eliminar Proveedor' : 'Eliminar Artículo'}
                </Button>
            </>
        }
      >
        <div className="flex items-center gap-4 text-muted-foreground bg-red-50 p-5 rounded-md border border-red-100">
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
