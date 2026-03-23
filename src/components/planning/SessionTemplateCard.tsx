import { memo } from 'react';

import { MoreVertical, Trash2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SessionTemplate } from '@/domain/entities';


interface SessionTemplateCardProps {
  template: SessionTemplate;
  onDelete: (id: string) => void;
}

export const SessionTemplateCard = memo(function SessionTemplateCard({ template, onDelete }: SessionTemplateCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className="group"
    >
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <h3 className="min-w-0 truncate text-sm font-semibold">{template.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(template.id)}>
              <Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {/* Middle: info */}
        <div className="text-body-sm space-y-0.5 text-muted-foreground">
          {template.description && <p>{template.description}</p>}
          <p>{template.content.groups.length} {t('sessions.groups')} · {template.content.groups.reduce((acc, g) => acc + g.items.length, 0)} {t('common.exercises')}</p>
        </div>
        {/* Bottom: actions right-aligned */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="text-body-sm h-7 px-2 sm:px-3" onClick={() => navigate(`/templates/${template.id}/edit`)}>
            <Pencil className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">{t('actions.edit')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
});
