# Guida al Design System di Workout Tracker 2

Il Design System centralizza tutti i "token" grafici (colori, spaziature, tipografia, ombre, bordi, ecc.) utilizzati all'interno dell'app. Permette di definire una singola fonte di verità, facilitando modifiche estetiche globali mantenendo l'interfaccia coerente.

Questa guida descrive in dettaglio la struttura dei file del Design System, cosa controllano i vari campi e fornisce esempi visivi per ciascuno.

---

## Architettura del Design System

Tutti i file relativi al design si trovano nella cartella `src/design-system/`.
I valori veri e propri (i *token*) si trovano nella sottocartella `src/design-system/tokens/`.

L'app utilizza Tailwind CSS per lo styling. Il file `tailwind.config.ts` alla radice del progetto *legge* questi token e li rende disponibili come classi Tailwind (es. `gap-layout-md`, `bg-primary`, `text-h1`).

### `src/design-system/palettes.config.ts`

Questo file definisce le **varianti di colore (Temi)** che l'utente può scegliere (Blu, Verde, Rosa, ecc.).
Per ogni tema, definisce due set di colori: uno per la modalità chiara (`light`) e uno per la modalità scura (`dark`).
I valori qui definiti sono stringhe HSL (Hue, Saturation, Lightness).

*   **`primary` / `primary-foreground`:** Colore principale del brand (es. bottoni principali, tab attive) e il colore del testo che ci va sopra.
*   **`secondary` / `secondary-foreground`:** Colore secondario, spesso usato per bottoni meno prominenti o sfondi evidenziati.
*   **`muted` / `muted-foreground`:** Colore "spento" usato per sfondi secondari sottili (es. un blocco di testo informativo) o testo meno importante.
*   **`accent` / `accent-foreground`:** Colore di accento, per richiamare l'attenzione su elementi specifici (es. un badge "Nuovo").
*   **`destructive` / `destructive-foreground`:** Usato per azioni pericolose (es. il pulsante "Elimina Allenamento", tipicamente rosso).
*   **`success` / `warning`:** Colori per indicare successo (es. salvataggio completato, verde) o avviso (es. attenzione a una modifica, arancione).
*   **`card` / `card-foreground`:** Colore di sfondo dei contenitori principali (le "schede" che contengono gli esercizi) e il testo al loro interno.
*   **`ring`:** Colore del bordo di focus quando si naviga con la tastiera o si clicca su un input.
*   **`trend-improving`, `trend-stable`, `trend-stagnant`, `trend-deteriorating`:** Questi sono colori **semantici** usati specificamente nei grafici di progressione e nelle statistiche (es. la freccia che indica se il massimale è salito o sceso).

**Esempio sull'UI:** Se cambi il valore `primary` nella palette "default", cambierà il colore di sfondo del pulsante "Inizia Allenamento" in tutta l'app. Se cambi `card` in `dark`, cambierai il grigio scuro usato per i blocchi degli esercizi nella schermata "Workout" quando l'app è in modalità scura.

---

### I Token (`src/design-system/tokens/`)

#### 1. `colors.ts`

Mappa le primitive HSL (es. `blue.500`) e le raggruppa semanticamente.
Contiene l'oggetto `semantic` che definisce esattamente a cosa servono i colori nel contesto dell'app.

*   `semantic.background.card`: Usa la variabile `--card` (definita in base alla palette attiva).
*   `semantic.text.secondary`: Usa la variabile `--muted-foreground`.

**Cosa controlla:** Dà un nome logico (`action.primary`) al colore, in modo che nel codice React si possa usare `colors.action.primary` senza sapere se al momento l'app è blu, verde o in modalità scura.

#### 2. `spacing.ts`

Definisce il sistema di spaziature, margini e padding dell'app. Ha una scala di base (multipli di 4px, equivalente alla scala standard di Tailwind) e una scala semantica.

*   **`spacing` (Scala Base):** Valori assoluti come `spacing[4]` (1rem / 16px).
*   **`semanticSpacing`:**
    *   `component.md`: (es. 16px) **Esempio UI:** Controlla il *padding interno* (lo spazio tra il bordo e il contenuto) di una card di esercizio.
    *   `layout.sm`: (es. 16px) **Esempio UI:** Controlla lo spazio *tra* due componenti diversi (es. lo spazio verticale tra due esercizi in una lista).
    *   `stack.xs`: (es. 4px) **Esempio UI:** Controlla lo spazietto minuscolo tra un'icona e il testo al suo interno (es. l'icona del cronometro e il tempo scritto vicino).

**Cosa controlla:** Tutti i `gap`, `margin` (`m`, `mt`, `mb`, ecc.) e `padding` (`p`, `pt`, `pb`, ecc.) in Tailwind derivano da qui.

#### 3. `typography.ts`

Definisce font, dimensioni del testo, spessore e interlinea.

*   **`fontFamily`:** `sans` (Inter, usato per quasi tutto il testo) e `mono` (JetBrains Mono, usato per i numeri dei pesi/ripetizioni per allinearli perfettamente).
*   **`semanticTypography`:**
    *   `heading.h1`: **Esempio UI:** Il titolo grande in cima alla pagina ("Allenamento del Giorno").
    *   `heading.h2`: **Esempio UI:** I titoli delle sezioni ("Esercizi", "Cronologia").
    *   `body.default`: **Esempio UI:** Il testo normale dei paragrafi, le note negli esercizi.
    *   `caption`: **Esempio UI:** Le scritte piccole sotto i formati, come "Ultimo peso usato: 50kg".

**Cosa controlla:** Qualsiasi classe come `text-h1`, `text-body`, `font-mono`, o l'uso dell'oggetto `typography` nei componenti React stilizzati in linea.

#### 4. `borders.ts`

Definisce la rotondità degli angoli (border radius) e lo spessore delle linee.

*   **`radius.lg`:** Usa la variabile `--radius` (spesso 8px). **Esempio UI:** La rotondità dei bordi di tutti i pulsanti grandi o delle card degli esercizi.
*   **`width.thin`:** (1px). **Esempio UI:** Lo spessore della linea di separazione tra una riga di log del set (Set 1) e quella successiva (Set 2).

**Cosa controlla:** Classi Tailwind come `rounded-lg`, `rounded-md`, o `border`.

#### 5. `shadows.ts`

Definisce le ombre esterne ed interne.

*   **`sm` / `md` / `lg`:** **Esempio UI:** `sm` è un'ombra leggerissima usata spesso sui pulsanti; `md` o `lg` creano l'effetto di sollevamento per i menu a tendina (dropdown) o le modali in sovrimpressione.

**Cosa controlla:** Classi Tailwind come `shadow-md`, `shadow-lg`.

#### 6. `breakpoints.ts`

Definisce a quali larghezze dello schermo l'interfaccia cambia layout (es. da cellulare a tablet a PC).

*   `sm` (640px), `md` (768px), `lg` (1024px).
**Cosa controlla:** I modificatori responsive di Tailwind (es. `sm:text-h1` significa "usa text-h1 sugli schermi più larghi di 640px"). **Esempio UI:** Decide quando la barra di navigazione inferiore (mobile) si trasforma in una barra laterale (desktop).

#### 7. `z-index.ts`

Definisce la gerarchia di sovrapposizione degli elementi (cosa sta sopra e cosa sta sotto).

*   `docked` (10): **Esempio UI:** Intestazioni di tabelle che restano in alto quando scorri in basso.
*   `fab` (30): **Esempio UI:** Il pulsante galleggiante circolare "+" per aggiungere un set.
*   `modal` (50): **Esempio UI:** Le finestre di dialogo (modali) che si aprono al centro dello schermo oscurando il resto (es. la modale "Seleziona Esercizio").

**Cosa controlla:** Evita che il pulsante "+" finisca per sbaglio "sotto" la card di un esercizio mentre scorri.

#### 8. `transitions.ts`

Definisce la velocità e lo stile delle animazioni.

*   **`duration.normal`** (200ms): **Esempio UI:** Il tempo che impiega il menu a tendina per aprirsi.
*   **`animations.slideUp`**: **Esempio UI:** L'animazione fluida del cassetto (drawer) che sale dal basso dello schermo nei dispositivi mobili.

**Cosa controlla:** La fluidità con cui l'interfaccia reagisce alle azioni dell'utente.

---

## Riepilogo per modificare l'UI

*   Vuoi cambiare il colore rosso del pulsante "Elimina"?
    -> Modifica `destructive` in `palettes.config.ts`.
*   Vuoi più respiro tra il titolo dell'esercizio e i suoi set?
    -> Usa un token di `spacing` più grande per `stack` nel componente React, es `gap-stack-md`.
*   Vuoi angoli meno arrotondati su tutto il sito?
    -> Modifica `--radius` nel file CSS globale o aggiorna `borders.ts`.
*   Vuoi un font diverso per i numeri del cronometro?
    -> Modifica `fontFamily.mono` in `typography.ts`.
