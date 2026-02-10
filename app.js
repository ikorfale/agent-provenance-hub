/**
 * Agent Provenance Hub - Main Application
 * 
 * A dashboard for OpenClaw agents to view:
 * - Memory provenance logs
 * - Distillation drafts
 * - Social tasks
 * 
 * Mock data is included for demonstration.
 * Supabase connection instructions in README.md
 */

// ============================================
// MOCK DATA
// ============================================

const mockData = {
    // Provenance logs track the origin and history of agent decisions/actions
    provenanceLogs: [
        {
            id: 'prov-001',
            type: 'memory',
            title: 'Memory Consolidation: User Preferences',
            description: 'Consolidated user preferences from 3 conversation sessions into long-term memory. Key learnings: user prefers concise responses, dislikes emojis in professional contexts.',
            timestamp: '2026-02-03T08:30:00Z',
            source: 'MEMORY.md',
            confidence: 0.95,
            relatedIds: ['prov-002', 'prov-005'],
            metadata: {
                agentVersion: 'v2.1.0',
                sessionId: 'sess-12345'
            }
        },
        {
            id: 'prov-002',
            type: 'decision',
            title: 'Decision: Prioritize Email Over Social',
            description: 'Agent chose to process urgent email from boss before checking social notifications based on priority rules in AGENTS.md. Decision latency: 120ms.',
            timestamp: '2026-02-03T07:15:00Z',
            source: 'AGENTS.md',
            confidence: 0.98,
            relatedIds: ['prov-001'],
            metadata: {
                agentVersion: 'v2.1.0',
                context: 'heartbeat_check'
            }
        },
        {
            id: 'prov-003',
            type: 'action',
            title: 'Action: Sent Telegram Message',
            description: 'Sent reminder message to user about upcoming meeting. Used friendly tone per USER.md preferences. Message delivered successfully.',
            timestamp: '2026-02-03T06:45:00Z',
            source: 'Telegram API',
            confidence: 1.0,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.1.0',
                channel: 'telegram',
                recipient: 'main'
            }
        },
        {
            id: 'prov-004',
            type: 'learning',
            title: 'Learning: New Skill Acquired',
            description: 'Agent learned to use web_search tool via Brave API. Added to TOOLS.md with notes on rate limits and filtering options.',
            timestamp: '2026-02-02T22:10:00Z',
            source: 'SKILL.md',
            confidence: 0.92,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.9',
                skillName: 'web_search'
            }
        },
        {
            id: 'prov-005',
            type: 'memory',
            title: 'Context Window Management',
            description: 'Archived older conversation context to maintain performance. Preserved key facts in MEMORY.md for future sessions.',
            timestamp: '2026-02-02T18:30:00Z',
            source: 'System',
            confidence: 0.88,
            relatedIds: ['prov-001'],
            metadata: {
                agentVersion: 'v2.0.9',
                tokensFreed: 2048
            }
        },
        {
            id: 'prov-006',
            type: 'decision',
            title: 'Decision: Escalate to Human',
            description: 'Detected ambiguous user request about "that thing we discussed". Confidence too low (0.45), escalated to human for clarification.',
            timestamp: '2026-02-02T14:20:00Z',
            source: 'AGENTS.md',
            confidence: 0.45,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.9',
                escalationReason: 'low_confidence'
            }
        },
        {
            id: 'prov-007',
            type: 'action',
            title: 'Action: Created Calendar Event',
            description: 'Parsed natural language request and created calendar event "Team Sync" for Friday 3pm. Verified no conflicts.',
            timestamp: '2026-02-02T11:00:00Z',
            source: 'Calendar API',
            confidence: 0.97,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.9',
                eventId: 'evt-789'
            }
        },
        {
            id: 'prov-008',
            type: 'learning',
            title: 'Pattern Recognition: User Work Hours',
            description: 'Identified pattern: user typically online 9am-6pm weekdays. Will adjust proactive check-in timing accordingly.',
            timestamp: '2026-02-01T20:00:00Z',
            source: 'Analysis',
            confidence: 0.89,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.8',
                patternType: 'usage_times'
            }
        },
        {
            id: 'prov-009',
            type: 'memory',
            title: 'Fact Update: Project Deadline',
            description: 'Updated project deadline from March 15 to March 22 per user message. Propagated to all relevant context files.',
            timestamp: '2026-02-01T16:45:00Z',
            source: 'USER.md',
            confidence: 0.99,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.8',
                factType: 'deadline'
            }
        },
        {
            id: 'prov-010',
            type: 'action',
            title: 'Action: Executed Shell Command',
            description: 'Ran git status check as requested. No uncommitted changes detected in workspace.',
            timestamp: '2026-02-01T10:30:00Z',
            source: 'Shell',
            confidence: 1.0,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.8',
                command: 'git status',
                cwd: '/root/.openclaw/workspace'
            }
        },
        {
            id: 'prov-011',
            type: 'decision',
            title: 'Decision: Batch Similar Requests',
            description: 'Detected 3 similar heartbeat tasks. Batched into single execution to reduce API calls.',
            timestamp: '2026-01-31T22:15:00Z',
            source: 'AGENTS.md',
            confidence: 0.94,
            relatedIds: [],
            metadata: {
                agentVersion: 'v2.0.7',
                batchSize: 3
            }
        },
        {
            id: 'prov-012',
            type: 'learning',
            title: 'Distillation Trigger: Weekly Review',
            description: 'Weekly memory review triggered. 12 new provenance entries, 3 candidates for distillation identified.',
            timestamp: '2026-01-31T08:00:00Z',
            source: 'System',
            confidence: 0.91,
            relatedIds: ['dist-001', 'dist-002', 'dist-003'],
            metadata: {
                agentVersion: 'v2.0.7',
                entriesReviewed: 12
            }
        }
    ],

    // Distillation drafts are compressed, high-value insights from raw logs
    distillationDrafts: [
        {
            id: 'dist-001',
            title: 'User Communication Preferences',
            content: `SUMMARY: User prefers direct, concise communication without excessive formatting.

KEY INSIGHTS:
- Dislikes emoji overuse in professional contexts
- Prefers bullet points for complex information
- Appreciates proactive summaries after long conversations
- Tone should be friendly but efficient

ACTION ITEMS:
- Update response templates
- Configure auto-summarization threshold (500+ tokens)

SOURCE: 8 provenance entries (prov-001, prov-003, prov-007, prov-010)`,
            status: 'draft',
            createdAt: '2026-02-02T20:00:00Z',
            updatedAt: '2026-02-03T09:00:00Z',
            sourcesCount: 8,
            confidence: 0.91,
            tags: ['communication', 'preferences', 'user-profile']
        },
        {
            id: 'dist-002',
            title: 'Optimal Task Scheduling Pattern',
            content: `SUMMARY: User exhibits consistent usage patterns that enable predictive task scheduling.

KEY INSIGHTS:
- Peak availability: 9am-12pm, 2pm-5pm weekdays
- Minimal weekend engagement (preference for passive monitoring only)
- Email responses fastest between 10-11am
- Calendar events rarely before 8am or after 7pm

ACTION ITEMS:
- Schedule non-urgent tasks for 10am window
- Batch weekend notifications for Monday delivery
- Set quiet hours: 7pm-8am, all weekend

SOURCE: 15 provenance entries, calendar analysis`,
            status: 'review',
            createdAt: '2026-02-01T18:00:00Z',
            updatedAt: '2026-02-02T10:00:00Z',
            sourcesCount: 15,
            confidence: 0.88,
            tags: ['scheduling', 'patterns', 'optimization']
        },
        {
            id: 'dist-003',
            title: 'Tool Usage Efficacy Report',
            content: `SUMMARY: Analysis of tool usage patterns shows strong performance in search and file operations.

KEY INSIGHTS:
- web_search: 95% success rate, 1.2s avg latency
- browser automation: 87% success (8% failures due to JS-heavy sites)
- file operations: 99% success, highly reliable
- exec/shell: 92% success, 5% timeout issues on long commands

IMPROVEMENT AREAS:
- Add retry logic for browser timeouts
- Consider headless browser alternatives for JS-heavy sites
- Implement command timeout warnings

SOURCE: 32 action-type provenance entries`,
            status: 'draft',
            createdAt: '2026-01-31T22:00:00Z',
            updatedAt: '2026-02-01T08:00:00Z',
            sourcesCount: 32,
            confidence: 0.85,
            tags: ['tools', 'performance', 'metrics']
        },
        {
            id: 'dist-004',
            title: 'Project Context: Q1 Goals',
            content: `SUMMARY: User Q1 priorities center on automation and workflow optimization.

KEY INSIGHTS:
- Primary focus: Reducing manual repetitive tasks
- Secondary: Improving cross-platform integration
- Deadline sensitivity: High for client deliverables
- Preferred workflow: Async communication, batch processing

RELATED PROJECTS:
- Agent Provenance Hub (in progress)
- Email automation pipeline (planned)
- Calendar optimization (ongoing)

SOURCE: 6 provenance entries, user conversations`,
            status: 'approved',
            createdAt: '2026-01-28T14:00:00Z',
            updatedAt: '2026-01-30T16:00:00Z',
            sourcesCount: 6,
            confidence: 0.93,
            tags: ['projects', 'goals', 'Q1']
        },
        {
            id: 'dist-005',
            title: 'Security Preferences & Constraints',
            content: `SUMMARY: User has clear security boundaries that must be respected.

KEY INSIGHTS:
- Never send emails without explicit approval
- Ask before shell commands with destructive potential
- Private data stays local (no cloud sync of sensitive files)
- Preferred: Trash > RM for file deletion

RED FLAGS:
- Destructive commands: require confirmation
- External sharing: always ask first
- Authentication tokens: never expose in logs

SOURCE: 4 provenance entries, AGENTS.md`,
            status: 'archived',
            createdAt: '2026-01-25T10:00:00Z',
            updatedAt: '2026-01-27T12:00:00Z',
            sourcesCount: 4,
            confidence: 0.96,
            tags: ['security', 'constraints', 'preferences']
        }
    ],

    // Social tasks for various platforms
    socialTasks: [
        {
            id: 'task-001',
            title: 'Reply to team Slack thread about API changes',
            platform: 'discord',
            priority: 'high',
            status: 'pending',
            dueAt: '2026-02-03T12:00:00Z',
            createdAt: '2026-02-03T09:00:00Z',
            description: 'Thread in #engineering about v2 API deprecation timeline. Need to provide migration guidance.',
            tags: ['work', 'api', 'urgent']
        },
        {
            id: 'task-002',
            title: 'Schedule Twitter thread about new feature',
            platform: 'twitter',
            priority: 'medium',
            status: 'pending',
            dueAt: '2026-02-04T10:00:00Z',
            createdAt: '2026-02-03T08:00:00Z',
            description: 'Create thread announcing the Agent Provenance Hub. Include screenshots and key benefits.',
            tags: ['marketing', 'launch']
        },
        {
            id: 'task-003',
            title: 'Send weekly summary email to stakeholders',
            platform: 'email',
            priority: 'medium',
            status: 'in-progress',
            dueAt: '2026-02-03T17:00:00Z',
            createdAt: '2026-02-03T07:00:00Z',
            description: 'Compile progress on active projects, include metrics and upcoming milestones.',
            tags: ['report', 'weekly']
        },
        {
            id: 'task-004',
            title: 'Respond to Telegram question about setup',
            platform: 'telegram',
            priority: 'low',
            status: 'completed',
            dueAt: '2026-02-03T10:00:00Z',
            createdAt: '2026-02-02T20:00:00Z',
            description: 'User asked about connecting Supabase credentials. Provided step-by-step guide.',
            tags: ['support', 'docs']
        },
        {
            id: 'task-005',
            title: 'Post Discord announcement about maintenance',
            platform: 'discord',
            priority: 'high',
            status: 'pending',
            dueAt: '2026-02-03T14:00:00Z',
            createdAt: '2026-02-03T06:00:00Z',
            description: 'Scheduled maintenance window tonight 2-3am UTC. Post in #announcements.',
            tags: ['maintenance', 'ops']
        }
    ]
};

// ============================================
// APPLICATION STATE
// ============================================

const state = {
    currentSection: 'dashboard',
    connected: false,
    supabase: null,
    useMock: true,
    data: {
        provenanceLogs: [],
        distillationDrafts: [],
        socialTasks: []
    },
    filters: {
        provenance: { type: 'all', time: '24h' },
        distillation: { status: 'all' },
        social: { priority: 'all', platform: 'all' }
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) {
            const minutes = Math.floor(diff / (60 * 1000));
            return minutes < 1 ? 'Just now' : `${minutes}m ago`;
        }
        return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days}d ago`;
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getData() {
    return state.useMock ? mockData : state.data;
}

// ============================================
// SUPABASE INTEGRATION
// ============================================

async function connectToSupabase(url, key) {
    if (!window.supabase) {
        alert('Supabase client not loaded. Check network or CDN.');
        return false;
    }
    state.supabase = window.supabase.createClient(url, key);
    state.connected = true;
    state.useMock = false;
    updateConnectionStatus();
    await loadFromSupabase();
    return true;
}

async function loadFromSupabase() {
    if (!state.supabase) return;

    const [provRes, distRes, taskRes] = await Promise.all([
        state.supabase.from('provenance_logs').select('*').order('timestamp', { ascending: false }),
        state.supabase.from('distillation_drafts').select('*').order('updated_at', { ascending: false }),
        state.supabase.from('social_tasks').select('*').order('due_at', { ascending: true })
    ]);

    if (provRes.error || distRes.error || taskRes.error) {
        console.error('Supabase fetch error:', provRes.error || distRes.error || taskRes.error);
        alert('Supabase fetch error. Check RLS policies and table names.');
        return;
    }

    state.data.provenanceLogs = provRes.data || [];
    state.data.distillationDrafts = distRes.data || [];
    state.data.socialTasks = taskRes.data || [];

    renderDashboard();
    renderProvenance();
    renderDistillation();
    renderSocial();
    updateBadges();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderDashboard() {
    const data = getData();
    // Update stats
    document.getElementById('stat-provenance').textContent = data.provenanceLogs.length;
    document.getElementById('stat-distillation').textContent = 
        data.distillationDrafts.filter(d => d.status === 'draft' || d.status === 'review').length;
    document.getElementById('stat-social').textContent = 
        data.socialTasks.filter(t => t.status !== 'completed').length;
    
    // Recent activity (last 5 provenance logs)
    const recentActivity = document.getElementById('recent-activity');
    const recentLogs = [...data.provenanceLogs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    recentActivity.innerHTML = recentLogs.map(log => `
        <div class="activity-item" onclick="showProvenanceDetail('${log.id}')">
            <div class="activity-icon ${log.type}">${getTypeIcon(log.type)}</div>
            <div class="activity-content">
                <div class="activity-title">${escapeHtml(log.title)}</div>
                <div class="activity-meta">${escapeHtml(log.type)} • ${log.confidence * 100}% confidence</div>
            </div>
            <div class="activity-time">${formatDate(log.timestamp)}</div>
        </div>
    `).join('');
    
    // Pending distillations
    const pendingDistillations = document.getElementById('pending-distillations');
    const pending = data.distillationDrafts
        .filter(d => d.status === 'draft' || d.status === 'review')
        .slice(0, 3);
    
    pendingDistillations.innerHTML = pending.map(dist => `
        <div class="distillation-mini" onclick="showDistillationDetail('${dist.id}')">
            <h4>${escapeHtml(dist.title)}</h4>
            <p>${escapeHtml(dist.content.substring(0, 100))}...</p>
            <div class="distillation-meta">
                <span>${dist.sourcesCount} sources</span>
                <span class="status-badge ${dist.status}">${dist.status}</span>
            </div>
        </div>
    `).join('') || '<div class="empty-state"><p>No pending distillations</p></div>';
}

function renderProvenance() {
    const container = document.getElementById('provenance-timeline');
    const data = getData();
    let logs = [...data.provenanceLogs];
    
    // Apply filters
    const typeFilter = document.getElementById('type-filter').value;
    if (typeFilter !== 'all') {
        logs = logs.filter(l => l.type === typeFilter);
    }
    
    const timeFilter = document.getElementById('time-filter').value;
    const now = new Date();
    if (timeFilter === '24h') {
        const cutoff = new Date(now - 24 * 60 * 60 * 1000);
        logs = logs.filter(l => new Date(l.timestamp) > cutoff);
    } else if (timeFilter === '7d') {
        const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
        logs = logs.filter(l => new Date(l.timestamp) > cutoff);
    } else if (timeFilter === '30d') {
        const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
        logs = logs.filter(l => new Date(l.timestamp) > cutoff);
    }
    
    // Search
    const searchTerm = document.getElementById('provenance-search').value.toLowerCase();
    if (searchTerm) {
        logs = logs.filter(l => 
            l.title.toLowerCase().includes(searchTerm) || 
            l.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No logs found</h3>
                <p>Try adjusting your filters or search</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="timeline">
            ${logs.map(log => `
                <div class="timeline-item">
                    <div class="timeline-dot">${getTypeIcon(log.type)}</div>
                    <div class="timeline-content" onclick="showProvenanceDetail('${log.id}')">
                        <div class="timeline-header">
                            <span class="timeline-type ${log.type}">${log.type}</span>
                            <span class="timeline-time">${formatFullDate(log.timestamp)}</span>
                        </div>
                        <div class="timeline-title">${escapeHtml(log.title)}</div>
                        <div class="timeline-desc">${escapeHtml(log.description)}</div>
                        <div class="timeline-meta">
                            <span>📊 ${(log.confidence * 100).toFixed(0)}% confidence</span>
                            <span>📄 ${escapeHtml(log.source)}</span>
                            ${log.relatedIds.length > 0 ? `<span>🔗 ${log.relatedIds.length} related</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderDistillation() {
    const grid = document.getElementById('distillation-grid');
    const data = getData();
    let drafts = [...data.distillationDrafts];
    
    // Apply filters
    const statusFilter = document.getElementById('status-filter').value;
    if (statusFilter !== 'all') {
        drafts = drafts.filter(d => d.status === statusFilter);
    }
    
    // Search
    const searchTerm = document.getElementById('distillation-search').value.toLowerCase();
    if (searchTerm) {
        drafts = drafts.filter(d => 
            d.title.toLowerCase().includes(searchTerm) || 
            d.content.toLowerCase().includes(searchTerm) ||
            d.tags.some(t => t.toLowerCase().includes(searchTerm))
        );
    }
    
    // Sort by updated (newest first)
    drafts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    if (drafts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📝</div>
                <h3>No drafts found</h3>
                <p>Try adjusting your filters or create a new distillation</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = drafts.map(draft => `
        <div class="distillation-card" onclick="showDistillationDetail('${draft.id}')">
            <div class="distillation-header">
                <div>
                    <div class="distillation-title">${escapeHtml(draft.title)}</div>
                    <div class="distillation-date">Updated ${formatDate(draft.updatedAt)}</div>
                </div>
                <span class="status-badge ${draft.status}">${draft.status}</span>
            </div>
            <div class="distillation-preview">${escapeHtml(draft.content)}</div>
            <div class="distillation-stats">
                <span>📄 ${draft.sourcesCount} sources</span>
                <span>📊 ${(draft.confidence * 100).toFixed(0)}% confidence</span>
                <span>🏷️ ${draft.tags.length} tags</span>
            </div>
        </div>
    `).join('');
}

function renderSocial() {
    const list = document.getElementById('social-task-list');
    const data = getData();
    let tasks = [...data.socialTasks];
    
    // Apply filters
    const priorityFilter = document.getElementById('priority-filter').value;
    if (priorityFilter !== 'all') {
        tasks = tasks.filter(t => t.priority === priorityFilter);
    }
    
    const platformFilter = document.getElementById('platform-filter').value;
    if (platformFilter !== 'all') {
        tasks = tasks.filter(t => t.platform === platformFilter);
    }
    
    // Search
    const searchTerm = document.getElementById('social-search').value.toLowerCase();
    if (searchTerm) {
        tasks = tasks.filter(t => 
            t.title.toLowerCase().includes(searchTerm) || 
            t.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort: pending first, then by priority, then by due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueAt) - new Date(b.dueAt);
    });
    
    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <h3>No tasks found</h3>
                <p>You're all caught up!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = tasks.map(task => `
        <div class="task-item">
            <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                 onclick="toggleTask('${task.id}', event)">
                ${task.status === 'completed' ? '✓' : ''}
            </div>
            <div class="task-content" onclick="showTaskDetail('${task.id}')">
                <div class="task-title ${task.status === 'completed' ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    <span class="task-platform">${getPlatformIcon(task.platform)} ${task.platform}</span>
                    <span>Due ${formatDate(task.dueAt)}</span>
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                    ${task.status === 'in-progress' ? '<span>⏳ In progress</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTypeIcon(type) {
    const icons = {
        memory: '🧠',
        decision: '⚡',
        action: '▶️',
        learning: '📚'
    };
    return icons[type] || '📄';
}

function getPlatformIcon(platform) {
    const icons = {
        telegram: '✈️',
        discord: '💬',
        twitter: '🐦',
        email: '📧'
    };
    return icons[platform] || '📱';
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showProvenanceDetail(id) {
    const data = getData();
    const log = data.provenanceLogs.find(l => l.id === id);
    if (!log) return;
    
    document.getElementById('modal-title').textContent = 'Provenance Log Details';
    document.getElementById('modal-body').innerHTML = `
        <div class="detail-section">
            <h4>Title</h4>
            <p>${escapeHtml(log.title)}</p>
        </div>
        <div class="detail-section">
            <h4>Type</h4>
            <p><span class="timeline-type ${log.type}">${log.type}</span></p>
        </div>
        <div class="detail-section">
            <h4>Description</h4>
            <p>${escapeHtml(log.description)}</p>
        </div>
        <div class="detail-section">
            <h4>Timestamp</h4>
            <p>${formatFullDate(log.timestamp)}</p>
        </div>
        <div class="detail-section">
            <h4>Source</h4>
            <p>${escapeHtml(log.source)}</p>
        </div>
        <div class="detail-section">
            <h4>Confidence</h4>
            <p>${(log.confidence * 100).toFixed(1)}%</p>
        </div>
        ${log.relatedIds.length > 0 ? `
        <div class="detail-section">
            <h4>Related Entries</h4>
            <p>${log.relatedIds.join(', ')}</p>
        </div>
        ` : ''}
        <div class="detail-section">
            <h4>Metadata</h4>
            <pre>${JSON.stringify(log.metadata, null, 2)}</pre>
        </div>
    `;
    
    openModal();
}

function showDistillationDetail(id) {
    const data = getData();
    const draft = data.distillationDrafts.find(d => d.id === id);
    if (!draft) return;
    
    document.getElementById('modal-title').textContent = draft.title;
    document.getElementById('modal-body').innerHTML = `
        <div class="detail-section">
            <h4>Status</h4>
            <p><span class="status-badge ${draft.status}">${draft.status}</span></p>
        </div>
        <div class="detail-section">
            <h4>Content</h4>
            <pre style="white-space: pre-wrap;">${escapeHtml(draft.content)}</pre>
        </div>
        <div class="detail-section">
            <h4>Tags</h4>
            <p>${draft.tags.map(t => `<span class="timeline-type memory" style="margin-right: 8px;">${t}</span>`).join('')}</p>
        </div>
        <div class="detail-section">
            <h4>Statistics</h4>
            <p>
                Sources: ${draft.sourcesCount}<br>
                Confidence: ${(draft.confidence * 100).toFixed(1)}%<br>
                Created: ${formatFullDate(draft.createdAt)}<br>
                Updated: ${formatFullDate(draft.updatedAt)}
            </p>
        </div>
    `;
    
    openModal();
}

function showTaskDetail(id) {
    const data = getData();
    const task = data.socialTasks.find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('modal-title').textContent = 'Social Task Details';
    document.getElementById('modal-body').innerHTML = `
        <div class="detail-section">
            <h4>Title</h4>
            <p>${escapeHtml(task.title)}</p>
        </div>
        <div class="detail-section">
            <h4>Description</h4>
            <p>${escapeHtml(task.description)}</p>
        </div>
        <div class="detail-section">
            <h4>Platform</h4>
            <p>${getPlatformIcon(task.platform)} ${task.platform}</p>
        </div>
        <div class="detail-section">
            <h4>Priority</h4>
            <p><span class="task-priority ${task.priority}">${task.priority}</span></p>
        </div>
        <div class="detail-section">
            <h4>Status</h4>
            <p>${task.status === 'completed' ? '✅ Completed' : task.status === 'in-progress' ? '⏳ In Progress' : '⏸️ Pending'}</p>
        </div>
        <div class="detail-section">
            <h4>Due Date</h4>
            <p>${formatFullDate(task.dueAt)}</p>
        </div>
        <div class="detail-section">
            <h4>Tags</h4>
            <p>${task.tags.map(t => `<span class="timeline-type memory" style="margin-right: 8px;">${t}</span>`).join('')}</p>
        </div>
    `;
    
    openModal();
}

function openModal() {
    document.getElementById('detail-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

// ============================================
// INTERACTION FUNCTIONS
// ============================================

async function toggleTask(id, event) {
    event.stopPropagation();
    const data = getData();
    const task = data.socialTasks.find(t => t.id === id);
    if (task) {
        task.status = task.status === 'completed' ? 'pending' : 'completed';
        renderSocial();
        updateBadges();
        if (state.connected && state.supabase) {
            await state.supabase.from('social_tasks').update({ status: task.status }).eq('id', id);
        }
    }
}

function switchSection(sectionId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        provenance: 'Provenance Logs',
        distillation: 'Distillation Drafts',
        social: 'Social Tasks',
        settings: 'Settings'
    };
    document.getElementById('page-title').textContent = titles[sectionId];
    
    state.currentSection = sectionId;
    
    // Render section content
    if (sectionId === 'dashboard') renderDashboard();
    if (sectionId === 'provenance') renderProvenance();
    if (sectionId === 'distillation') renderDistillation();
    if (sectionId === 'social') renderSocial();
}

function updateBadges() {
    const data = getData();
    const pendingDistillations = data.distillationDrafts.filter(d => 
        d.status === 'draft' || d.status === 'review'
    ).length;
    const pendingTasks = data.socialTasks.filter(t => 
        t.status !== 'completed'
    ).length;
    
    document.getElementById('provenance-badge').textContent = data.provenanceLogs.length;
    document.getElementById('distillation-badge').textContent = pendingDistillations;
    document.getElementById('social-badge').textContent = pendingTasks;
}

// ============================================
// CONNECTION STATUS
// ============================================

function updateConnectionStatus() {
    const indicator = document.getElementById('conn-indicator');
    const text = document.getElementById('conn-text');
    
    if (state.connected) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
        text.textContent = 'Connected to Supabase';
    } else {
        indicator.classList.add('offline');
        indicator.classList.remove('online');
        text.textContent = 'Offline (Mock Mode)';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Restore saved Supabase creds if available
    const savedUrl = localStorage.getItem('supabaseUrl');
    const savedKey = localStorage.getItem('supabaseKey');
    if (savedUrl) document.getElementById('supabase-url').value = savedUrl;
    if (savedKey) document.getElementById('supabase-key').value = savedKey;
    if (savedUrl && savedKey) {
        connectToSupabase(savedUrl, savedKey).catch(console.error);
    }

    // Initial render
    renderDashboard();
    updateBadges();
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(item.dataset.section);
        });
    });
    
    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('detail-modal')) {
            closeModal();
        }
    });
    
    // Filter listeners
    document.getElementById('type-filter').addEventListener('change', renderProvenance);
    document.getElementById('time-filter').addEventListener('change', renderProvenance);
    document.getElementById('provenance-search').addEventListener('input', renderProvenance);
    
    document.getElementById('status-filter').addEventListener('change', renderDistillation);
    document.getElementById('distillation-search').addEventListener('input', renderDistillation);
    
    document.getElementById('priority-filter').addEventListener('change', renderSocial);
    document.getElementById('platform-filter').addEventListener('change', renderSocial);
    document.getElementById('social-search').addEventListener('input', renderSocial);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        btn.textContent = '🔄 Refreshing...';
        if (state.connected) {
            await loadFromSupabase();
            btn.textContent = '🔄 Refresh';
            return;
        }
        setTimeout(() => {
            renderDashboard();
            renderProvenance();
            renderDistillation();
            renderSocial();
            updateBadges();
            btn.textContent = '🔄 Refresh';
        }, 500);
    });
    
    // New task button
    document.getElementById('new-task-btn').addEventListener('click', () => {
        alert('New task creation would open a form here. This is a demo with mock data.');
    });
    
    // Settings - Connect button
    document.getElementById('connect-btn').addEventListener('click', async () => {
        const url = document.getElementById('supabase-url').value;
        const key = document.getElementById('supabase-key').value;
        
        if (!url || !key) {
            alert('Please enter both Supabase URL and Anon Key');
            return;
        }

        localStorage.setItem('supabaseUrl', url);
        localStorage.setItem('supabaseKey', key);
        await connectToSupabase(url, key);
    });
    
    // Settings - Test button
    document.getElementById('test-btn').addEventListener('click', async () => {
        if (!state.connected) {
            alert('Not connected. Click Connect first.');
            return;
        }
        await loadFromSupabase();
        alert('✅ Connection OK. Data refreshed.');
    });
    
    // Settings - Save preferences
    document.getElementById('save-settings').addEventListener('click', () => {
        const name = document.getElementById('agent-name').value;
        const interval = document.getElementById('refresh-interval').value;
        const notifications = document.getElementById('notifications').checked;
        const darkMode = document.getElementById('dark-mode').checked;
        
        // Apply dark mode
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        alert(`Settings saved:\n- Agent: ${name}\n- Refresh: ${interval}s\n- Notifications: ${notifications ? 'On' : 'Off'}\n- Dark Mode: ${darkMode ? 'On' : 'Off'}`);
    });
});

// Make functions available globally for onclick handlers
window.showProvenanceDetail = showProvenanceDetail;
window.showDistillationDetail = showDistillationDetail;
window.showTaskDetail = showTaskDetail;
window.toggleTask = toggleTask;
