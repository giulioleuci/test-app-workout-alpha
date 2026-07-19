import { DashboardUseCases, buildTrainingCalendar, getLastWorkoutSummary } from '@/application/dashboard';
import { t } from '@/i18n/t';
import { dashboardGateway } from '@/infrastructure/dashboard/dashboardGateway';
const dashboard = new DashboardUseCases(dashboardGateway, () => new Date(), t);
export const dashboardCommands = { ...dashboard, getDashboardStats: () => dashboard.getDashboardStats(), getConsistencyHeatmap: (days?: number) => dashboard.getConsistencyHeatmap(days), getMuscleFreshness: () => dashboard.getMuscleFreshness(), getLastWorkoutSummary: () => getLastWorkoutSummary(dashboardGateway, t), buildTrainingCalendar: (month: Date) => buildTrainingCalendar(dashboardGateway, new Date(month.getFullYear(), month.getMonth() - 1, 1), new Date(month.getFullYear(), month.getMonth() + 2, 0, 23, 59, 59, 999)) };
