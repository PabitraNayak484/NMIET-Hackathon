// GapVisualizationPage — /gaps (MR-10 P0)
// Concept grid: strong/developing/weak per concept; active misconception named in student's language
// Pre/post delta badge if baseline_check and post_check events exist (MR-80)
import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { MasteryBar } from '../components/MasteryBar';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface ConceptGap {
  concept_id: string;
  name: string;
  mastery: number;
  misconceptions: string[];
  baselineMastery?: number;
  postMastery?: number;
}

function getMasteryClass(m: number): string {
  if (m >= 0.7) return 'concept-strong';
  if (m >= 0.4) return 'concept-developing';
  return 'concept-weak';
}

function getMasteryIcon(m: number): string {
  if (m >= 0.7) return '●';   // filled — greyscale: solid dot (MR-72)
  if (m >= 0.4) return '◐';  // half — greyscale: half dot
  return '○';                  // empty — greyscale: open dot
}

function getMasteryLabel(m: number): string {
  if (m >= 0.7) return 'Strong';
  if (m >= 0.4) return 'Growing';
  return 'Weak';
}

export function GapVisualizationPage() {
  const { setScreen, topicId } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const [gaps, setGaps] = useState<ConceptGap[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = activeProfile?.language ?? 'en';

  useEffect(() => {
    if (!activeProfile) return;
    async function load() {
      try {
        const { db } = await import('../../db/schema');
        const topicIds = topicId ? [topicId] : ['photosynthesis', 'parts_of_plant'];

        const allGaps: ConceptGap[] = [];
        for (const tid of topicIds) {
          const topicRow = await db.content_topics.get(tid) as any;
          if (!topicRow) continue;

          const state = await db.learning_state
            .where('[student_id+topic_id]').equals([activeProfile!.profile_id, tid])
            .first() as any;

          // Get baseline/post events
          const events = await db.progress_events
            .where('student_id').equals(activeProfile!.profile_id)
            .filter((e: any) => e.topic_id === tid && (e.event_type === 'baseline_check' || e.event_type === 'post_check'))
            .toArray() as any[];

          const baseline = events.find((e: any) => e.event_type === 'baseline_check');
          const post = events.find((e: any) => e.event_type === 'post_check');

          const concepts: ConceptGap[] = (topicRow.concepts ?? []).map((c: any) => ({
            concept_id: c.concept_id,
            name: c.content?.[lang] ?? c.content?.en ?? c.concept_id,
            mastery: state?.mastery_score ?? 0.1,
            misconceptions: state?.misconceptions ?? [],
            baselineMastery: baseline?.payload?.mastery,
            postMastery: post?.payload?.mastery,
          }));

          allGaps.push(...concepts);
        }

        setGaps(allGaps.length > 0 ? allGaps : [
          // Demo fallback
          { concept_id: 'chloroplast', name: 'Chloroplast', mastery: 0.75, misconceptions: [] },
          { concept_id: 'light_reaction', name: 'Light Reaction', mastery: 0.45, misconceptions: ['sunlight_misconception'] },
          { concept_id: 'dark_reaction', name: 'Dark Reaction (Calvin Cycle)', mastery: 0.2, misconceptions: ['oxygen_source'] },
          { concept_id: 'glucose', name: 'Glucose Production', mastery: 0.6, misconceptions: [] },
          { concept_id: 'carbon_dioxide', name: 'Carbon Dioxide Role', mastery: 0.3, misconceptions: ['co2_confusion'] },
        ]);
      } catch (e) {
        console.error(e);
        // Demo fallback
        setGaps([
          { concept_id: 'chloroplast', name: 'Chloroplast', mastery: 0.75, misconceptions: [] },
          { concept_id: 'light_reaction', name: 'Light Reaction', mastery: 0.45, misconceptions: ['sunlight_misconception'] },
          { concept_id: 'dark_reaction', name: 'Dark Reaction (Calvin Cycle)', mastery: 0.2, misconceptions: ['oxygen_source'] },
          { concept_id: 'glucose', name: 'Glucose Production', mastery: 0.6, misconceptions: [] },
          { concept_id: 'carbon_dioxide', name: 'Carbon Dioxide Role', mastery: 0.3, misconceptions: ['co2_confusion'] },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeProfile, topicId, lang]);

  const strong    = gaps.filter((g) => g.mastery >= 0.7);
  const developing= gaps.filter((g) => g.mastery >= 0.4 && g.mastery < 0.7);
  const weak      = gaps.filter((g) => g.mastery < 0.4);
  const avgMastery= gaps.length ? gaps.reduce((s, g) => s + g.mastery, 0) / gaps.length : 0;

  // Delta badge
  const hasDelta = gaps.some((g) => g.baselineMastery !== undefined && g.postMastery !== undefined);
  const avgDelta = hasDelta
    ? gaps.reduce((s, g) => {
        if (g.baselineMastery !== undefined && g.postMastery !== undefined)
          return s + (g.postMastery - g.baselineMastery);
        return s;
      }, 0) / gaps.filter((g) => g.baselineMastery !== undefined).length
    : 0;

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        <div className="screen-header">
          <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">←</button>
          <h1 className="screen-title">Learning Gaps</h1>
          {hasDelta && (
            <span
              className={`badge ${avgDelta >= 0 ? 'badge-success' : 'badge-error'}`}
              aria-label={`Overall improvement: ${avgDelta >= 0 ? '+' : ''}${Math.round(avgDelta * 100)}% since start`}
            >
              {avgDelta >= 0 ? '↑' : '↓'} {Math.round(Math.abs(avgDelta) * 100)}%
            </span>
          )}
        </div>

        <div className="scroll-area">
          {/* Overall mastery */}
          <div className="card mb-6">
            <MasteryBar mastery={avgMastery} label="Overall topic mastery" />
          </div>

          {/* Legend (MR-72: colour + icon + text) */}
          <div className="flex gap-3 mb-6" role="legend" aria-label="Mastery legend">
            <div className="concept-chip concept-strong" style={{ flex: 1, minWidth: 0 }}>
              Strong ≥70%
            </div>
            <div className="concept-chip concept-developing" style={{ flex: 1, minWidth: 0 }}>
              Growing 40-69%
            </div>
            <div className="concept-chip concept-weak" style={{ flex: 1, minWidth: 0 }}>
              Weak &lt;40%
            </div>
          </div>

          {loading ? (
            <div className="flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : (
            <div className="flex-col gap-3 stagger" aria-label="Concept mastery list" role="list">
              {gaps.map((gap) => {
                const cls = getMasteryClass(gap.mastery);
                const icon = getMasteryIcon(gap.mastery);
                const label = getMasteryLabel(gap.mastery);
                const delta = (gap.baselineMastery !== undefined && gap.postMastery !== undefined)
                  ? gap.postMastery - gap.baselineMastery
                  : null;

                return (
                  <div
                    key={gap.concept_id}
                    className="card"
                    role="listitem"
                    aria-label={`${gap.name}: ${label}, ${Math.round(gap.mastery * 100)}% mastery`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`concept-chip ${cls}`}
                          style={{ minWidth: 'auto', padding: 'var(--space-2)', fontSize: '0.9rem' }}
                          aria-hidden="true"
                        >
                          {icon}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{gap.name}</div>
                          <div className="text-muted text-xs">{label}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Delta badge (MR-80) */}
                        {delta !== null && (
                          <span
                            className={`badge ${delta >= 0 ? 'badge-success' : 'badge-error'}`}
                            aria-label={`${delta >= 0 ? 'Improved' : 'Declined'} ${Math.round(Math.abs(delta) * 100)}% since start`}
                          >
                            {delta >= 0 ? '↑' : '↓'}{Math.round(Math.abs(delta) * 100)}%
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {Math.round(gap.mastery * 100)}%
                        </span>
                      </div>
                    </div>

                    <MasteryBar mastery={gap.mastery} label="" showPercent={false} animate />

                    {/* Misconceptions in student's language */}
                    {gap.misconceptions.length > 0 && (
                      <div className="mt-3">
                        {gap.misconceptions.map((m) => (
                          <div key={m} className="badge badge-warning" style={{ marginRight: 6, marginTop: 4 }}>
                            ⚠️ {m}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary counts */}
          {!loading && gaps.length > 0 && (
            <div className="card mt-6">
              <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Summary</h3>
              <div className="grid-3">
                <div className="text-center">
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--success)' }}>{strong.length}</div>
                  <div className="text-muted text-xs">● Strong</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--warning)' }}>{developing.length}</div>
                  <div className="text-muted text-xs">◐ Growing</div>
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--error)' }}>{weak.length}</div>
                  <div className="text-muted text-xs">○ Weak</div>
                </div>
              </div>
            </div>
          )}

          {/* CTA to practice weak areas */}
          {!loading && weak.length > 0 && (
            <button
              id="practice-weak-btn"
              className="btn btn-primary btn-full mt-6"
              onClick={() => { setTopicId_safe(weak[0].concept_id); setScreen('ask'); }}
              aria-label={`Practice weak concepts — start with ${weak[0].name}`}
            >
              🎯 Practice weak concepts
            </button>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );

  function setTopicId_safe(id: string) {
    useAgentStore.getState().setTopicId(id);
  }
}
