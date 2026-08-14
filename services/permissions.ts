
export interface Funcionalidad {
  id: number;
  Funcionalidad_FH: string;
  TipoApp_FH: string;
  [key: string]: any; // For dynamic profile columns
}

export const permissionsService = {
  async getAllowedModules(userProfile: string): Promise<string[]> {
    console.log('Getting hardcoded functionalities for profile:', userProfile);
    
    // Normalize profile name to remove accents, spaces, and convert to lowercase
    const normalizedProfile = (userProfile || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    console.log('Normalized profile:', normalizedProfile);

    // Mapeo de perfiles de usuario a las columnas de la tabla:
    // "Admin" -> Admin_FH
    // "Calidad" -> Calidad_FH
    // "Calidad Operaria" -> CalidadOp_FH
    // "Costura Jefa" -> CostureraJefa_FH
    // "Costura Operaria" -> CostureraOP_FH
    // "Produccion" -> Produccion_FH
    // "Deposito" -> Deposito_FH

    if (normalizedProfile === 'admin') {
      return ['Stock Online', 'Inyecciones', 'Home', 'Compras', 'Aprobaciones', 'Configuracion', 'Administracion'];
    }

    if (normalizedProfile === 'deposito') {
      return ['Stock Online', 'Inyecciones', 'Home', 'Compras'];
    }

    if (normalizedProfile === 'produccion') {
      return ['Home', 'Aprobaciones', 'Configuracion', 'Administracion'];
    }

    // Para los perfiles: Calidad, Calidad Operaria, Costura Jefa, Costura Operaria
    // Según la tabla proporcionada, todos tienen "NO" en los módulos de Desktop.
    // Por lo tanto, solo se les muestra "Home" para que no vean una pantalla vacía.
    return ['Home'];
  }
};
