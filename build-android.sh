#!/bin/bash

# Interrompi lo script in caso di errore
set -e

# --- Configurazione Percorsi ---
export JAVA_HOME="/home/giulio/android-studio/jbr"
export ANDROID_HOME="/home/giulio/Android/Sdk"
NVM_DIR="$HOME/.nvm"

echo "🚀 Avvio procedura di build Android (Debug)..."

# 1. Caricamento Node 22 tramite NVM
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "📦 Caricamento Node.js 22 via NVM..."
    source "$NVM_DIR/nvm.sh"
    nvm use 22 > /dev/null 2>&1 || nvm install 22
else
    echo "❌ Errore: NVM non trovato. Assicurati che sia installato in $NVM_DIR"
    exit 1
fi

# 2. Installazione Dipendenze
echo "📦 1/5 Installazione pacchetti npm..."
npm install

# 3. Build del Frontend
echo "🏗️  2/5 Compilazione applicazione web..."
npm run build

# 4. Generazione Asset Nativi (Icone e Splash)
echo "🎨 3/5 Generazione icone e splash screen..."
npm run generate-assets

# 5. Sincronizzazione Capacitor
echo "🔄 4/5 Sincronizzazione asset con Android..."
npx cap sync android

# 6. Generazione APK con Gradle
echo "🤖 5/5 Generazione APK di debug..."
cd android
./gradlew assembleDebug

echo ""
echo "✅ Build completata con successo!"
echo "📍 APK generato in: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
