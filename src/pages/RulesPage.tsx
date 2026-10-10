import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Play,
  Layers,
  Send,
  Eye,
  Code,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { EventBridgeRule, EventPattern, RuleTarget } from '../engine/types';
import { matchEventPattern } from '../engine/eventPatternMatcher';

export const RulesPage: React.FC = () => {
  const { rules, topics, queues, addRule, updateRule, deleteRule } = useSimulationStore();

  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'test'>('list');

  // New Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [targetType, setTargetType] = useState<'SNS' | 'SQS'>('SNS');
  const [targetId, setTargetId] = useState(topics[0]?.id || '');
  const [patternJson, setPatternJson] = useState(
    JSON.stringify(
      {
        source: ['com.ecommerce.orders'],
        'detail-type': ['OrderCreated'],
        detail: {
          customerTier: ['VIP', 'PLATINUM'],
          amount: [{ numeric: ['>=', 100] }],
        },
      },
      null,
      2
    )
  );
  const [patternError, setPatternError] = useState<string | null>(null);

  // Test Panel State
  const [testEventJson, setTestEventJson] = useState(
    JSON.stringify(
      {
        id: 'evt-test-01',
        time: new Date().toISOString(),
        source: 'com.ecommerce.orders',
        detailType: 'OrderCreated',
        detail: {
          customerTier: 'VIP',
          amount: 150,
          status: 'PENDING',
        },
      },
      null,
      2
    )
  );

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedPattern = JSON.parse(patternJson);
      setPatternError(null);

      const target: RuleTarget = {
        id: `tgt-${Date.now().toString(36)}`,
        type: targetType,
        targetId: targetId || (targetType === 'SNS' ? topics[0]?.id : queues[0]?.id),
      };

      const newRule: EventBridgeRule = {
        id: `rule-${Date.now().toString(36)}`,
        name: ruleName.trim(),
        description: ruleDescription.trim() || 'Custom EventBridge Rule',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: parsedPattern,
        targets: [target],
        createdAt: Date.now(),
      };

      addRule(newRule);
      setRuleName('');
      setRuleDescription('');
      setActiveTab('list');
    } catch (err: any) {
      setPatternError(`Invalid Pattern JSON: ${err.message}`);
    }
  };

  // Evaluate test event against all rules
  let parsedTestEvent: any = null;
  let testParseError: string | null = null;
  try {
    parsedTestEvent = JSON.parse(testEventJson);
  } catch (e: any) {
    testParseError = e.message;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-purple-400" />
            EventBridge Rules & Pattern Matching
          </h1>
          <p className="text-xs text-slate-400">
            Configure real AWS pattern matching rules (exact, prefix, numeric ranges, exists, anything-but) and evaluate targets.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'list' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'create' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            + Create Rule
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === 'test' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Test Pattern Playground
          </button>
        </div>
      </div>

      {/* Tab 1: Rules List */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
              <Sliders className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No rules configured on default bus.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-3 px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-semibold"
              >
                Create your first rule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => {
                const isEnabled = rule.state === 'ENABLED';
                return (
                  <div
                    key={rule.id}
                    className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-mono">{rule.name}</span>
                          <button
                            onClick={() =>
                              updateRule(rule.id, {
                                state: isEnabled ? 'DISABLED' : 'ENABLED',
                              })
                            }
                            className="text-xs"
                            title={isEnabled ? 'Click to disable' : 'Click to enable'}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>

                      {/* Pattern Preview */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] text-purple-300 max-h-36 overflow-y-auto">
                        <pre>{JSON.stringify(rule.eventPattern, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Targets */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>Target:</span>
                        {rule.targets.map((tgt) => (
                          <span
                            key={tgt.id}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                              tgt.type === 'SNS'
                                ? 'bg-pink-500/10 text-pink-300 border-pink-500/30'
                                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            }`}
                          >
                            {tgt.type}: {tgt.targetId}
                          </span>
                        ))}
                      </div>

                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${isEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'}`}>
                        {rule.state}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Create Rule */}
      {activeTab === 'create' && (
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Build EventBridge Rule
            </h2>
            <p className="text-xs text-slate-400">
              Create an event-pattern filtering rule and connect it to an SNS topic or SQS queue target.
            </p>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. HighValueOrderRule"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <input
                type="text"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="e.g. Filters high value retail checkout orders"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    const t = e.target.value as 'SNS' | 'SQS';
                    setTargetType(t);
                    setTargetId(t === 'SNS' ? topics[0]?.id || '' : queues[0]?.id || '');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                >
                  <option value="SNS">SNS Topic (Fan-Out)</option>
                  <option value="SQS">SQS Queue (Direct Queue)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Destination</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-mono"
                >
                  {targetType === 'SNS'
                    ? topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))
                    : queues.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name} ({q.type})
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Event Pattern (JSON matching criteria)
              </label>
              <textarea
                value={patternJson}
                onChange={(e) => {
                  setPatternJson(e.target.value);
                  setPatternError(null);
                }}
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-purple-300 outline-none focus:border-amber-500 resize-none"
                spellCheck={false}
              />
              {patternError && (
                <p className="text-[11px] text-red-400 mt-1 font-mono">{patternError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                Save & Deploy Rule
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Pattern Test Playground */}
      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-amber-400" />
              Candidate Event Payload
            </h2>
            <p className="text-xs text-slate-400">
              Paste or edit an event below to test against all active rules simultaneously.
            </p>
            <textarea
              value={testEventJson}
              onChange={(e) => setTestEventJson(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 outline-none focus:border-amber-500 resize-none"
              spellCheck={false}
            />
            {testParseError && (
              <p className="text-xs text-red-400 font-mono">Syntax error: {testParseError}</p>
            )}
          </div>

          <div className="lg:col-span-6 bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Live Match Evaluation Breakdown
            </h2>
            <p className="text-xs text-slate-400">
              Real-time evaluation showing which rules would trigger and why non-matching rules failed.
            </p>

            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {!parsedTestEvent ? (
                <div className="p-4 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-lg">
                  Fix JSON syntax in candidate payload to view matches.
                </div>
              ) : (
                rules.map((rule) => {
                  const evalResult = matchEventPattern(rule.eventPattern, parsedTestEvent);
                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                        evalResult.matches
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-sm text-white">{rule.name}</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          {evalResult.matches ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400">MATCHED</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-500">NO MATCH</span>
                            </>
                          )}
                        </div>
                      </div>

                      {evalResult.matches ? (
                        <p className="text-[11px] text-emerald-300">
                          &check; Successfully matched all conditions. Would route to target: {rule.targets.map((t) => t.targetId).join(', ')}.
                        </p>
                      ) : (
                        <div className="space-y-1 pt-1 border-t border-slate-800">
                          <span className="text-[11px] font-semibold text-red-400/90 block">
                            Mismatch Breakdown:
                          </span>
                          {evalResult.reasons.map((r, i) => (
                            <p key={i} className="text-[11px] font-mono text-red-300/80 pl-2 border-l border-red-500/30">
                              {r}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

