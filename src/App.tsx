/**
 * Workout Tracker 2
 * Copyright (C) 2026 Giulio
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { lazy, Suspense, useEffect } from 'react';

import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { createHashRouter, RouterProvider } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import { Toaster as Sonner } from "@/components/ui/sonner";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOnboardingStatus } from '@/hooks/queries/onboardingQueries';
import dayjs from '@/lib/dayjs';
import { queryClient } from '@/lib/queryClient';

// Lazy load page components
const NotFound = lazy(() => import("./pages/NotFound"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExerciseList = lazy(() => import("./pages/ExerciseList"));
const WorkoutList = lazy(() => import("./pages/WorkoutList"));
const WorkoutCreate = lazy(() => import("./pages/WorkoutCreate"));
const WorkoutDetail = lazy(() => import("./pages/WorkoutDetail"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ActiveSession = lazy(() => import("./pages/ActiveSession"));
const OneRepMaxPage = lazy(() => import("./pages/OneRepMaxPage"));
const HistoryList = lazy(() => import("./pages/HistoryList"));
const HistoryDetail = lazy(() => import("./pages/HistoryDetail"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const TemplateEdit = lazy(() => import("./pages/TemplateEdit"));

const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/exercises", element: <ExerciseList /> },
      { path: "/workouts", element: <WorkoutList /> },
      { path: "/workouts/new", element: <WorkoutCreate /> },
      { path: "/workouts/:id", element: <WorkoutDetail /> },
      { path: "/workouts/:id/sessions/:sessionId", element: <SessionDetail /> },
      { path: "/analytics", element: <AnalyticsPage /> },
      { path: "/1rm", element: <OneRepMaxPage /> },
      { path: "/history", element: <HistoryList /> },
      { path: "/history/:id", element: <HistoryDetail /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/backup", element: <BackupPage /> },
      { path: "/templates/:templateId/edit", element: <TemplateEdit /> },
      { path: "/session/active", element: <ActiveSession /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

const loadingFallback = (
  <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
    <DetailPageSkeleton />
  </div>
);

function AppContent() {
  const { data: onboardingDone, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return loadingFallback;
  }

  if (!onboardingDone) {
    return (
      <Suspense fallback={loadingFallback}>
        <OnboardingPage onComplete={() => {
          void queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
        }} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={loadingFallback}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

const App = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    dayjs.locale(i18n.language);
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
