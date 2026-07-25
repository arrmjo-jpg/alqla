import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { PageSkeleton, ErrorState } from '@/components/feedback';
import { useAuth } from '@/hooks/useAuth';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { SaveBar } from '@/features/settings/components/SaveBar';
import { SwitchField } from '@/components/form/SwitchField';
import { CompetitionBarPicker } from '../components/CompetitionBarPicker';
import {
  useMatchBarSettings,
  useUpdateMatchBarSettings,
  useCompetitions,
  useToggleCompetitionMatchBar,
  useReorderCompetitionsMatchBar,
} from '../hooks';

/**
 * مفتاح تفعيل/تعطيل واحد أعلى الصفحة، تحته منتقي البطولات الكامل (CompetitionBarPicker المشترك)
 * — الواجهة النهائية لاختيار بطولات شريط المباريات يدويًّا، بغضّ النظر عن وجود مباريات محليّة
 * حاليًّا. مستقلّة تمامًا عن SportsHomeBarSettingsPage رغم مشاركتهما نفس المكوّن والكتالوج.
 */
export default function MatchBarSettingsPage() {
  const { t } = useTranslation('sport');
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings.edit');
  const canManage = hasPermission('competitions.manage');

  const q = useMatchBarSettings();
  const update = useUpdateMatchBarSettings();

  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (q.data) setEnabled(q.data.enabled);
  }, [q.data]);

  const competitionsQuery = useCompetitions();
  const toggleMatchBar = useToggleCompetitionMatchBar();
  const reorderMatchBar = useReorderCompetitionsMatchBar();

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />;

  const eligibleCount = enabled === q.data.enabled ? q.data.eligible_competitions_count : null;
  const showEmptyWarning = enabled && eligibleCount === 0;

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(enabled);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSave} className="space-y-5" noValidate>
        <SettingsSection title={t('matchBarSettings.title')} description={t('matchBarSettings.desc')}>
          <SwitchField
            label={t('matchBarSettings.enable')}
            description={t('matchBarSettings.enableDesc')}
            checked={enabled}
            onChange={setEnabled}
            disabled={!canEdit}
          />

          {eligibleCount !== null ? (
            <p className="text-xs text-muted-foreground">{t('matchBarSettings.eligibleCount', { count: eligibleCount })}</p>
          ) : null}

          {showEmptyWarning ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">{t('matchBarSettings.emptyWarning')}</p>
            </div>
          ) : null}
        </SettingsSection>
        <SaveBar
          saving={update.isPending}
          disabled={!canEdit}
          note={!canEdit ? t('matchBarSettings.noPermission') : undefined}
        />
      </form>

      <SettingsSection
        title={t('matchBarSettings.competitions.title')}
        description={t('matchBarSettings.competitions.desc')}
      >
        <CompetitionBarPicker
          competitions={competitionsQuery.data ?? []}
          isLoading={competitionsQuery.isLoading}
          canManage={canManage}
          isSelected={(c) => c.show_in_match_bar}
          sortOrder={(c) => c.match_bar_sort_order}
          onToggle={(id) => toggleMatchBar.mutate(id)}
          onReorder={(ids) => reorderMatchBar.mutate(ids)}
        />
      </SettingsSection>
    </div>
  );
}
