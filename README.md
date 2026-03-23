# Workout Tracker 2

[English Version](#workout-tracker-2-english) | [Versione Italiana](#workout-tracker-2-italiano)

---

# Workout Tracker 2 (English)

A modern, offline-first workout tracking application built with React, Vite, and TypeScript. Designed for serious lifters, it offers detailed session tracking, volume analysis, progress monitoring, and seamless data backup.

> **Vibe Coding & AI-First Development**: This application was architected and implemented using an end-to-end **Vibe Coding** methodology. Initial scaffolding was performed via **Lovable**, followed by iterative refactoring for Separation of Concerns (SoC) and performance optimization. The codebase was evolved using next-generation LLMs including **Google Gemini 3**, **Claude 4.5**, and **Claude 4.6 (Sonnet/Opus)**, leveraging advanced AI agentic environments such as **Google Antigravity**, **Jules**, and **Claude Code**.

## Detailed Feature Set

### 1. Training & Active Session Logging
- **Real-time Logging**: Intuitive interface for tracking sets, reps, load, and RPE during a workout.
- **Smart Load Suggestions**: Dynamic load recommendations based on historical performance and calculated intensity.
- **Warmup Calculator**: Automatic generation of warmup sets tailored to your target working weight.
- **Rest Timer**: Integrated, configurable timers for managing recovery periods between sets.
- **Exercise Substitution**: Seamlessly replace exercises during an active session while maintaining progress.
- **Performance & Compliance Feedback**: Real-time badges indicating how your current performance compares to your plan and past sessions.
- **Cluster Set Support**: Specialized tracking for cluster sets and rest-pause training.
- **In-Session History**: Quick-access view of your past performance for the specific exercise you're performing.
- **Fatigue Monitoring**: Real-time indicators showing potential fatigue accumulation during a session.

### 2. Workout Planning & Template Management
- **Template Creator**: Build and organize reusable workout routines (templates) to streamline your training.
- **Volume Analysis**: Deep-dive analysis of planned session volume, categorized by muscle group and movement pattern.
- **Muscle Overlap Matrix**: Visualize how exercises in a session interact and overlap in terms of muscle activation.
- **Warmup Strategy Configuration**: Define custom warmup progressions for different exercises or muscle groups.
- **LexoRank Sorting**: Drag-and-drop reordering of exercises and sets using efficient LexoRank logic.

### 3. Advanced Analytics & Progress Tracking
- **Volume & Load Visualization**: Track total volume, average load, and tonnage over time with interactive charts.
- **Performance Trend Indicators**: Sophisticated indicators showing if you are progressing, plateauing, or overreaching.
- **Intensity & RPE Analysis**: Breakdown of training intensity distribution and perceived exertion trends.
- **Theoretical Performance Matrix**: Project your estimated 1RM across different repetition ranges based on your current data.
- **Strength-to-Weight Correlation**: Analyze your strength progress relative to your body weight trends.
- **Compliance Tracking**: Statistical analysis of how closely you adhere to your planned volume and intensity targets.

### 4. Exercise Library & Management
- **Extensive Exercise Database**: A comprehensive, searchable library of exercises with detailed metadata (muscles, movement patterns).
- **Historical Versioning (SCD Type 2)**: Maintains accuracy of past workout history by versioning exercises; if you rename or update an exercise, old records stay intact.
- **Custom Exercises**: Full support for adding and managing user-defined exercises.

### 5. Core Platform Features
- **Offline-First (IndexedDB)**: Built with Dexie.js for full functionality without internet, ensuring your data is always accessible.
- **Dashboard & Calendar**: A centralized training calendar and dashboard for an overview of your training consistency.
- **Backup & Portability**: Secure file-based export/import for data backup and cross-device migration.
- **Multi-User Profiles**: Support for multiple local user profiles with independent training data and profile management.
- **Internationalization (i18n)**: Fully localized in English, Italian, French, Spanish, and Chinese.
- **Cross-Platform Support**: Responsive web app, PWA, and native Android/iOS builds via Capacitor.

## Tech Stack

This project leverages a modern stack to deliver a fast and reliable user experience:

- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand), [Tanstack Query](https://tanstack.com/query/latest)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Mobile Integration**: [Capacitor](https://capacitorjs.com/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (or bun/yarn/pnpm)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

### Development

To start the development server with hot reload:

```bash
npm run dev
```

### Building for Production

To create a production-ready build:

```bash
npm run build
```

### Testing

Run the test suite to ensure everything is working correctly:

```bash
npm test
```

## Project Structure

- `src/components/`: Reusable UI components.
- `src/db/`: Database schema and configuration.
- `src/domain/`: Domain entities and types.
- `src/hooks/`: Custom React hooks.
- `src/pages/`: Main application pages.
- `src/services/`: Business logic.
- `src/stores/`: Global state management.

## License

[GPL-3.0](LICENSE)

---

# Workout Tracker 2 (Italiano)

Un'applicazione moderna per il tracciamento degli allenamenti, offline-first, costruita con React, Vite e TypeScript. Progettata per atleti seri, offre un tracciamento dettagliato delle sessioni, analisi del volume, monitoraggio dei progressi e backup dei dati senza interruzioni.

> **Vibe Coding & AI-First Development**: Questa applicazione è stata architettata e implementata utilizzando una metodologia **Vibe Coding** end-to-end. Lo scaffolding iniziale è stato eseguito tramite **Lovable**, seguito da refactoring iterativi per la Separazione delle Competenze (SoC) e l'ottimizzazione delle prestazioni. Il codice si è evoluto utilizzando LLM di nuova generazione tra cui **Google Gemini 3**, **Claude 4.5** e **Claude 4.6 (Sonnet/Opus)**, sfruttando ambienti agentici AI avanzati come **Google Antigravity**, **Jules** e **Claude Code**.

## Funzionalità Dettagliate

### 1. Tracciamento Allenamento e Sessione Attiva
- **Registrazione in Tempo Reale**: Interfaccia intuitiva per tracciare serie, ripetizioni, carico e RPE durante l'allenamento.
- **Suggerimenti di Carico Intelligenti**: Raccomandazioni dinamiche sul carico basate sulle performance storiche e sull'intensità calcolata.
- **Calcolatore Riscaldamento**: Generazione automatica di serie di riscaldamento personalizzate in base al peso target.
- **Timer di Recupero**: Timer integrati e configurabili per gestire i periodi di recupero tra le serie.
- **Sostituzione Esercizi**: Sostituisci facilmente gli esercizi durante una sessione attiva mantenendo i progressi.
- **Feedback su Performance e Conformità**: Badge in tempo reale che indicano come la performance attuale si confronta con il piano e le sessioni passate.
- **Supporto Cluster Set**: Tracciamento specializzato per cluster set e allenamento rest-pause.
- **Storico in Sessione**: Visualizzazione rapida delle performance passate per lo specifico esercizio che stai eseguendo.
- **Monitoraggio della Fatica**: Indicatori in tempo reale che mostrano il potenziale accumulo di fatica durante una sessione.

### 2. Pianificazione Allenamento e Gestione Template
- **Creatore di Template**: Costruisci e organizza routine di allenamento riutilizzabili (template) per ottimizzare i tuoi allenamenti.
- **Analisi del Volume**: Analisi approfondita del volume della sessione pianificata, categorizzata per gruppo muscolare e schema di movimento.
- **Matrice di Sovrapposizione Muscolare**: Visualizza come gli esercizi in una sessione interagiscono e si sovrappongono in termini di attivazione muscolare.
- **Configurazione Strategia di Riscaldamento**: Definisci progressioni di riscaldamento personalizzate per diversi esercizi o gruppi muscolari.
- **Ordinamento LexoRank**: Riordino drag-and-drop di esercizi e serie utilizzando l'efficiente logica LexoRank.

### 3. Analisi Avanzate e Monitoraggio Progressi
- **Visualizzazione Volume e Carico**: Traccia il volume totale, il carico medio e il tonnellaggio nel tempo con grafici interattivi.
- **Indicatori di Tendenza della Performance**: Indicatori sofisticati che mostrano se stai progredendo, sei in stallo o in sovrallenamento.
- **Analisi Intensità e RPE**: Suddivisione della distribuzione dell'intensità di allenamento e tendenze dello sforzo percepito.
- **Matrice di Performance Teorica**: Proietta il tuo 1RM stimato su diversi intervalli di ripetizioni basandoti sui tuoi dati attuali.
- **Correlazione Forza-Peso**: Analizza i tuoi progressi di forza relativi all'andamento del tuo peso corporeo.
- **Tracciamento della Conformità**: Analisi statistica di quanto aderisci ai tuoi obiettivi pianificati di volume e intensità.

### 4. Libreria Esercizi e Gestione
- **Database Esercizi Esteso**: Una libreria completa e ricercabile di esercizi con metadati dettagliati (muscoli, schemi di movimento).
- **Versioning Storico (SCD Type 2)**: Mantiene l'accuratezza dello storico degli allenamenti passati tramite il versioning degli esercizi; se rinomini o aggiorni un esercizio, i vecchi record rimangono intatti.
- **Esercizi Personalizzati**: Supporto completo per l'aggiunta e la gestione di esercizi definiti dall'utente.

### 5. Caratteristiche Core della Piattaforma
- **Offline-First (IndexedDB)**: Costruito con Dexie.js per una funzionalità completa senza internet, assicurando che i tuoi dati siano sempre accessibili.
- **Dashboard e Calendario**: Un calendario di allenamento centralizzato e una dashboard per una panoramica della tua costanza negli allenamenti.
- **Backup e Portabilità**: Esportazione/importazione sicura basata su file per il backup dei dati e la migrazione tra dispositivi.
- **Profili Multi-Utente**: Supporto per più profili utente locali con dati di allenamento e gestione del profilo indipendenti.
- **Internazionalizzazione (i18n)**: Completamente localizzato in inglese, italiano, francese, spagnolo e cinese.
- **Supporto Cross-Platform**: Web app responsive, PWA e build native Android/iOS tramite Capacitor.

## Tech Stack

Questo progetto utilizza uno stack moderno per offrire un'esperienza utente veloce e affidabile:

- **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand), [Tanstack Query](https://tanstack.com/query/latest)
- **Database**: [Dexie.js](https://dexie.org/) (wrapper IndexedDB)
- **Integrazione Mobile**: [Capacitor](https://capacitorjs.com/)
- **Form e Validazione**: [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/)

## Per Iniziare

Segui queste istruzioni per configurare il progetto localmente.

### Prerequisiti

- Node.js (v18 o superiore raccomandato)
- npm (o bun/yarn/pnpm)

### Installazione

1.  **Clona il repository:**

    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Installa le dipendenze:**

    ```bash
    npm install
    ```

### Sviluppo

Per avviare il server di sviluppo con hot reload:

```bash
npm run dev
```

### Compilazione per la Produzione

Per creare una build pronta per la produzione:

```bash
npm run build
```

### Testing

Esegui la suite di test per assicurarti che tutto funzioni correttamente:

```bash
npm test
```

## Struttura del Progetto

- `src/components/`: Componenti UI riutilizzabili.
- `src/db/`: Schema e configurazione del database.
- `src/domain/`: Entità e tipi di dominio.
- `src/hooks/`: Hook React personalizzati.
- `src/pages/`: Pagine principali dell'applicazione.
- `src/services/`: Logica di business.
- `src/stores/`: Gestione dello stato globale.

## Licenza

[GPL-3.0](LICENSE)
