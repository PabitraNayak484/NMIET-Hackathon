// HomePage — /home
// Topic chip grid, search bar, mastery summary strip, network badge, storage warning
import React, { useEffect, useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useProfileStore } from '../../stores/profileStore';
import { useNetworkStore } from '../../stores/networkStore';
import { NetworkBadge } from '../components/NetworkBadge';
import { StorageWarningBanner } from '../components/StorageWarningBanner';
import { MasteryBar } from '../components/MasteryBar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { LearnerState } from '../../types';

interface TopicSummary {
  topic_id: string;
  name: string;
  mastery: number;
  chapter: string;
}

export function HomePage() {
  const { setScreen, setTopicId, availableTimeMin } = useAgentStore();
  const { activeProfile } = useProfileStore();
  const { status: netStatus } = useNetworkStore();

  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [learnerStates, setLearnerStates] = useState<Record<string, LearnerState>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfile) return;
    async function load() {
      try {
        const { db } = await import('../../db/schema');
        const topicRows = await db.content_topics.toArray();
        const stateRows = await db.learning_state
          .where('student_id').equals(activeProfile!.profile_id)
          .toArray();

        const stateMap: Record<string, LearnerState> = {};
        for (const s of stateRows) stateMap[s.topic_id] = s as unknown as LearnerState;

        const summaries: TopicSummary[] = topicRows.map((t: any) => ({
          topic_id: t.topic_id,
          name: t.aliases?.[activeProfile!.language]?.[0] ?? t.topic_id,
          chapter: t.chapter ?? '',
          mastery: stateMap[t.topic_id]?.mastery_score ?? 0,
        }));

        setTopics(summaries);
        setLearnerStates(stateMap);
      } catch (e) {
        console.error(e);
        // Demo fallback
        setTopics([
          { topic_id: 'photosynthesis', name: 'Photosynthesis', chapter: 'Chapter 1', mastery: 0.3 },
          { topic_id: 'parts_of_plant', name: 'Parts of a Plant', chapter: 'Chapter 1', mastery: 0.1 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeProfile]);

  const filtered = topics.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.chapter.toLowerCase().includes(search.toLowerCase())
  );

  const avgMastery = topics.length
    ? topics.reduce((s, t) => s + t.mastery, 0) / topics.length
    : 0;

  function handleTopicSelect(topicId: string) {
    setTopicId(topicId);
    setScreen('ask');
  }

  return (
    <ErrorBoundary>
      <div className="screen fade-in">
        <NetworkBadge />

        {/* Header */}
        <div className="screen-header" style={{ paddingBottom: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <p className="text-secondary text-sm">Class {activeProfile?.class} · {activeProfile?.board}</p>
            <h1 style={{ fontSize: 'var(--text-2xl)' }}>
              {activeProfile?.avatar} {activeProfile?.nickname}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              id="gaps-nav-btn"
              className="icon-btn"
              onClick={() => setScreen('gaps')}
              aria-label="View learning gaps"
              title="Learning gaps"
            >
              📊
            </button>
            <button
              id="settings-nav-btn"
              className="icon-btn"
              onClick={() => setScreen('settings')}
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Storage warning */}
        <StorageWarningBanner />

        {/* Session info strip */}
        {availableTimeMin && (
          <div className="banner banner-info mb-4" role="status">
            <span aria-hidden="true">⏱️</span>
            <span>Session: {availableTimeMin} min · {netStatus === 'OFFLINE' ? '📴 Offline mode' : '🌐 Online'}</span>
          </div>
        )}

        {/* Mastery summary */}
        {topics.length > 0 && (
          <div className="card mb-6">
            <MasteryBar mastery={avgMastery} label="Overall progress" />
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
          <input
            id="topic-search"
            className="input"
            placeholder="Search topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search topics"
            style={{ paddingLeft: 'var(--space-10)' }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: 'var(--space-4)', top: '50%',
              transform: 'translateY(-50%)', fontSize: '1.1rem', color: 'var(--text-muted)',
            }}
          >
            🔍
          </span>
        </div>

        {/* Topics grid */}
        <h2 style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>
          Topics
        </h2>

        {loading ? (
          <div className="flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
            <span aria-hidden="true" style={{ fontSize: '2rem' }}>📚</span>
            <p className="text-secondary mt-4">
              {search ? 'No topics found' : 'No topics loaded yet. Go online to sync content.'}
            </p>
          </div>
        ) : (
          <div className="flex-col gap-3 stagger">
            {filtered.map((topic) => (
              <button
                key={topic.topic_id}
                id={`topic-${topic.topic_id}`}
                className="card interactive"
                onClick={() => handleTopicSelect(topic.topic_id)}
                aria-label={`Study ${topic.name} — ${Math.round(topic.mastery * 100)}% mastery`}
                style={{ textAlign: 'left', padding: 'var(--space-4) var(--space-5)' }}
              >
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{topic.name}</div>
                  <div className="text-muted text-xs">{topic.chapter}</div>
                </div>
                <MasteryBar mastery={topic.mastery} label="" showPercent animate={false} />
              </button>
            ))}
          </div>
        )}

        {/* Bottom nav */}
        <div className="bottom-action">
          <div className="flex gap-3">
            <button
              id="home-ask-btn"
              className="btn btn-primary btn-full"
              onClick={() => { setTopicId(null); setScreen('ask'); }}
              aria-label="Ask SATHI a question"
            >
              🤔 Ask SATHI
            </button>
            <button
              id="home-trace-btn"
              className="btn btn-secondary"
              onClick={() => setScreen('trace')}
              aria-label="View decision trace"
              style={{ minWidth: 56, padding: 0 }}
            >
              🔬
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
