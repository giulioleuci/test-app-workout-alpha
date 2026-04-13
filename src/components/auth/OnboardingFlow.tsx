import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Languages, 
  ArrowRight, 
  ArrowLeft,
  CloudOff, 
  Calendar, 
  Dumbbell, 
  BarChart3, 
  Zap, 
  Activity,
  Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { t } = useTranslation();
  const { language: currentLanguage, changeLanguage } = useLanguage();
  const [step, setStep] = useState<'language' | 'presentation'>('language');
  const [presentationStep, setPresentationStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'it' | 'es' | 'fr' | 'zh'>(currentLanguage);

  const presentationScreens = [
    {
      id: 'offline',
      title: t('presentation.offline.title'),
      description: t('presentation.offline.description'),
      icon: <CloudOff className="h-12 w-12 text-primary" />,
    },
    {
      id: 'plans',
      title: t('presentation.plans.title'),
      description: t('presentation.plans.description'),
      icon: <Calendar className="h-12 w-12 text-primary" />,
    },
    {
      id: 'exercises',
      title: t('presentation.exercises.title'),
      description: t('presentation.exercises.description'),
      icon: <Dumbbell className="h-12 w-12 text-primary" />,
    },
    {
      id: 'analytics',
      title: t('presentation.analytics.title'),
      description: t('presentation.analytics.description'),
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
    },
    {
      id: 'suggestions',
      title: t('presentation.suggestions.title'),
      description: t('presentation.suggestions.description'),
      icon: <Zap className="h-12 w-12 text-primary" />,
    },
    {
      id: 'features',
      title: t('presentation.features.title'),
      description: t('presentation.features.description'),
      icon: <Activity className="h-12 w-12 text-primary" />,
    }
  ];

  const handleLanguageSelect = (lang: 'en' | 'it' | 'es' | 'fr' | 'zh') => {
    setSelectedLanguage(lang);
    void changeLanguage(lang);
  };

  const handleConfirmLanguage = () => {
    setStep('presentation');
    setPresentationStep(0);
  };

  const handleNextPresentation = () => {
    if (presentationStep < presentationScreens.length - 1) {
      setPresentationStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBackPresentation = () => {
    if (presentationStep > 0) {
      setPresentationStep(prev => prev - 1);
    } else {
      setStep('language');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <AnimatePresence mode="wait">
        {step === 'language' && (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <Card className="flex min-h-[600px] flex-col overflow-hidden border-none shadow-2xl">
              <CardContent className="flex-1 space-y-8 overflow-y-auto pb-6 pt-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Languages className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-h3 font-black">{t('settings.language')}</h1>
                  <p className="px-4 text-sm text-muted-foreground">{t('settings.languageDisclaimer')}</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 px-2">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'it', label: 'Italiano' },
                    { code: 'es', label: 'Español' },
                    { code: 'fr', label: 'Français' },
                    { code: 'zh', label: '中文' }
                  ].map((lang) => (
                    <Button
                      key={lang.code}
                      variant={selectedLanguage === lang.code ? "default" : "outline"}
                      className={cn(
                        "h-14 text-lg font-bold border-2 transition-all",
                        selectedLanguage === lang.code ? "border-primary" : "border-transparent bg-muted/30"
                      )}
                      onClick={() => handleLanguageSelect(lang.code as any)}
                    >
                      {lang.label}
                      {selectedLanguage === lang.code && <Check className="ml-2 h-5 w-5" />}
                    </Button>
                  ))}
                </div>
              </CardContent>
              <div className="border-t bg-muted/20 p-8">
                <Button 
                  className="h-14 w-full text-lg font-bold shadow-lg"
                  onClick={handleConfirmLanguage}
                >
                  {t('onboarding.next')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 'presentation' && (
          <motion.div
            key="presentation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <Card className="flex min-h-[600px] flex-col overflow-hidden border-none shadow-2xl">
              <div className="flex flex-1 flex-col items-center justify-center space-y-8 p-10 text-center">
                <motion.div
                  key={presentationStep}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10"
                >
                  {presentationScreens[presentationStep].icon}
                </motion.div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={presentationStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h2 className="text-h2 font-black tracking-tight">
                      {presentationScreens[presentationStep].title}
                    </h2>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      {presentationScreens[presentationStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="space-y-6 border-t bg-muted/20 p-8">
                <div className="flex justify-center gap-1.5">
                  {presentationScreens.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 transition-all duration-300 rounded-full",
                        i === presentationStep ? "w-8 bg-primary" : "w-2 bg-primary/20"
                      )}
                    />
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="h-14 flex-1 border-2 text-lg font-bold"
                    onClick={handleBackPresentation}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    {t('onboarding.back')}
                  </Button>
                  <Button 
                    className="h-14 flex-[2] text-lg font-bold shadow-lg"
                    onClick={handleNextPresentation}
                  >
                    {presentationStep === presentationScreens.length - 1 ? t('onboarding.start') : t('onboarding.next')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
