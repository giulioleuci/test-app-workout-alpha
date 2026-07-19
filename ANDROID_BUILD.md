# Guida alla Build Android (APK)

Questa guida spiega come generare un APK di sviluppo per il progetto Workout Tracker 2 senza utilizzare l'interfaccia grafica di Android Studio.

## Prerequisiti

Per compilare correttamente il progetto da riga di comando, assicurati di avere i seguenti componenti installati (i percorsi indicati sono quelli rilevati nel sistema attuale):

- **Node.js**: Versione 22 o superiore (necessaria per Capacitor 8).
- **Java JDK**: JDK 21 o superiore (situato in `/home/giulio/android-studio/jbr`).
- **Gradle**: Versione 8.13 o superiore (gestita dal Gradle Wrapper).
- **Android SDK**: Installato in `/home/giulio/Android/Sdk`.

## Procedura di Build

Esegui i seguenti comandi dalla root del progetto:

### 1. Build del Frontend e Generazione Asset
Compila l'applicazione web, genera le icone native e sincronizza gli asset con la cartella Android. Nota l'uso di una versione di Node compatibile per Capacitor.

```bash
# Build dell'app web
npm run build

# Generazione icone e splash screen per Android da dist/icon.png
npm run generate-assets

# Sincronizzazione con Android (usando Node 22+)
PATH="/home/giulio/.nvm/versions/node/v22.22.0/bin:$PATH" npx cap sync android
```

### 2. Generazione APK con Gradle
Spostati nella directory `android` ed esegui lo script Gradle fornendo i percorsi per Java e Android SDK.

```bash
cd android

# Build dell'APK di debug
JAVA_HOME=/home/giulio/android-studio/jbr 
ANDROID_HOME=/home/giulio/Android/Sdk 
./gradlew assembleDebug
```

## Output della Build

Una volta completata l'operazione, l'APK generato sarà disponibile al seguente percorso:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Note Tecniche
- Se ricevi errori relativi a `javac` mancante, assicurati che `JAVA_HOME` punti a una cartella JDK valida che contenga la sottocartella `bin` con il compilatore.
- Il comando `./gradlew assembleDebug` scaricherà automaticamente le dipendenze necessarie e i Build-Tools dell'SDK se mancanti.
