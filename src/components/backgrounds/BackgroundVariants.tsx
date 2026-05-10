import { cn } from "@/lib/utils";

interface PatternProps {
  className?: string;
}

/** Iron Matrix: Icone manubri e dischi (Ottimizzato per Lista Esercizi) */
export const IronMatrix = ({ className }: PatternProps) => (
  <div 
    className={cn(
      "absolute inset-0 pointer-events-none",
      "bg-foreground opacity-[0.03] dark:opacity-[0.07]",
      className
    )}
    style={{
      WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='black' stroke-width='1.5'%3E%3Cpath d='M15 15l10 10M10 20l10-10'/%3E%3Ccircle cx='45' cy='45' r='6'/%3E%3Ccircle cx='45' cy='45' r='2'/%3E%3Cpath d='M10 45h10M15 40v10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      maskImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='black' stroke-width='1.5'%3E%3Cpath d='M15 15l10 10M10 20l10-10'/%3E%3Ccircle cx='45' cy='45' r='6'/%3E%3Ccircle cx='45' cy='45' r='2'/%3E%3Cpath d='M10 45h10M15 40v10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      maskSize: '60px 60px'
    }}
  />
);

/** Energy Flow: Fulmini e diagonali (Ottimizzato per Sessione Attiva) */
export const EnergyFlow = ({ className }: PatternProps) => (
  <div 
    className={cn(
      "absolute inset-0 pointer-events-none",
      "bg-yellow-500 opacity-[0.05] dark:opacity-[0.08]",
      className
    )}
    style={{
      WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 15l8-10 2 6h6l-8 10 2-6h-6z' fill='black' /%3E%3C/svg%3E")`,
      maskImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 15l8-10 2 6h6l-8 10 2-6h-6z' fill='black' /%3E%3C/svg%3E")`,
      maskSize: '80px 80px'
    }}
  />
);

/** Technical Grid: Griglia 3D isometrica (Ottimizzato per Dashboard/Analytics) */
export const TechnicalGrid = ({ className }: PatternProps) => (
  <div 
    className={cn(
      "absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none",
      className
    )}
    style={{
      backgroundImage: `linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor),
                        linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor),
                        linear-gradient(30deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor),
                        linear-gradient(150deg, currentColor 12%, transparent 12.5%, transparent 87%, currentColor 87.5%, currentColor),
                        linear-gradient(60deg, currentColor 25%, transparent 25.5%, transparent 75%, currentColor 75%, currentColor),
                        linear-gradient(60deg, currentColor 25%, transparent 25.5%, transparent 75%, currentColor 75%, currentColor)`,
      backgroundSize: '40px 70px',
      backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px'
    }}
  />
);

/** Atmospheric Noise: Grana sottile per evitare banding dei gradienti */
export const AtmosphericNoise = () => (
  <div 
    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
    }}
  />
);
