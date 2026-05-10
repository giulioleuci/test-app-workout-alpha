import { useLocation } from 'react-router-dom';
import { IronMatrix, EnergyFlow, TechnicalGrid, AtmosphericNoise } from './BackgroundVariants';

export function PageBackground() {
  const { pathname } = useLocation();

  const renderPattern = () => {
    // Dashboard, Analytics e 1RM: Griglia Tecnica 3D
    if (pathname === '/' || pathname === '/analytics' || pathname === '/1rm' || pathname.includes('/templates')) {
      return <TechnicalGrid />;
    }

    // Sessione Attiva: Energy Flow (Fulmini/Diagonali)
    if (pathname.includes('/session/active')) {
      return <EnergyFlow />;
    }

    // Esercizi, Workout e Storia: Iron Matrix (Manubri/Dischi)
    if (
      pathname.includes('/exercises') || 
      pathname.includes('/workouts') || 
      pathname.includes('/history') ||
      pathname.includes('/profile')
    ) {
      return <IronMatrix />;
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none bg-background text-foreground">
      {/* 1. Base Gradient: Un leggero bagliore dal basso per dare profondità */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-50 dark:opacity-30" />
      
      {/* 2. Pattern Dinamico in base alla rotta */}
      {renderPattern()}

      {/* 3. Noise Texture: Essenziale per il Tema Scuro (evita il banding dei colori) */}
      <AtmosphericNoise />
      
      {/* 4. Vignette: Scura i bordi per focalizzare l'attenzione sul contenuto centrale */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)] opacity-40 dark:opacity-60" />
    </div>
  );
}
