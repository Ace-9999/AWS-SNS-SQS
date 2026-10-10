import React, { useState } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Mail,
  Globe,
  Layers,
  Filter,
  CheckCircle2,
  Share2,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { SNSSubscription, SNSTopic } from '../engine/types';

export const SNSTopicsPage: React.FC = () => {
  const { topics, queues, addTopic, deleteTopic, updateTopic } = useSimulationStore();

  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');
  const [newTopicName, setNewTopicName] = useState('');

  // Subscription modal / inline state
  const [newSubProtocol, setNewSubProtocol] = useState<'sqs' | 'http' | 'email'>('sqs');
  const [newSubEndpoint, setNewSubEndpoint] = useState(queues[0]?.id || '');
  const [newSubFilterPolicy, setNewSubFilterPolicy] = useState('{\n  "customer_tier": ["VIP"]\n}');
  const [showSubForm, setShowSubForm] = useState(false);

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    const topicId = `topic-${newTopicName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newTopic: SNSTopic = {
      id: topicId,
      arn: `arn:aws:sns:us-east-1:123456789012:${newTopicName.trim()}`,
      name: newTopicName.trim(),
      displayName: newTopicName.trim(),
      subscriptions: [],
      createdAt: Date.now(),
    };

    addTopic(newTopic);
    setNewTopicName('');
    setSelectedTopicId(newTopic.id);
  };

  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopic) return;

    let filterPolicyObj: any = undefined;
    if (newSubFilterPolicy.trim()) {
      try {
        filterPolicyObj = JSON.parse(newSubFilterPolicy);
      } catch (e) {
        alert('Invalid JSON in Subscription Filter Policy');
        return;
      }
    }

    const sub: SNSSubscription = {
      id: `sub-${Date.now().toString(36)}`,
      topicId: currentTopic.id,
      protocol: newSubProtocol,
      endpoint: newSubEndpoint,
      filterPolicy: filterPolicyObj,
      filterPolicyScope: 'MessageAttributes',
    };

    const updatedSubs = [...currentTopic.subscriptions, sub];
    updateTopic(currentTopic.id, { subscriptions: updatedSubs });
    setShowSubForm(false);
  };

  const handleDeleteSub = (subId: string) => {
    if (!currentTopic) return;
    const updatedSubs = currentTopic.subscriptions.filter((s) => s.id !== subId);
    updateTopic(currentTopic.id, { subscriptions: updatedSubs });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-pink-400" />
            Amazon Simple Notification Service (SNS)
          </h1>
          <p className="text-xs text-slate-400">
            Publish/Subscribe fan-out hub supporting SQS queues, mock HTTP webhooks, and email subscribers with attribute filter policies.
          </p>
        </div>

        {/* Quick Topic Creator */}
        <form onSubmit={handleCreateTopic} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="New Topic Name..."
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-pink-500 font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-md shadow-pink-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Topic
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Topics List Navigation */}
        <div className="lg:col-span-4 bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Topics ({topics.length})
            </h2>
          </div>

          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTopicId(t.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  selectedTopicId === t.id
                    ? 'bg-pink-950/20 border-pink-500/40 text-pink-200'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div>
                  <h3 className="font-mono text-xs font-bold text-white">{t.name}</h3>
                  <span className="text-[10px] text-slate-400">
                    {t.subscriptions.length} Subscriptions
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTopic(t.id);
                  }}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Delete Topic"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Topic Detail & Subscriptions */}
        <div className="lg:col-span-8 space-y-6">
          {currentTopic ? (
            <>
              {/* Topic Info Card */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white font-mono">{currentTopic.name}</h2>
                    <p className="text-[11px] font-mono text-slate-400">{currentTopic.arn}</p>
                  </div>
                  <button
                    onClick={() => setShowSubForm(!showSubForm)}
                    className="px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 font-semibold text-xs transition-colors flex items-center gap-1 w-fit"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subscription
                  </button>
                </div>

                {/* Subscriptions List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-pink-400" />
                    Fan-Out Subscriptions ({currentTopic.subscriptions.length})
                  </h3>

                  {currentTopic.subscriptions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-lg border border-slate-800">
                      No subscribers attached to this topic yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentTopic.subscriptions.map((sub) => {
                        const Icon =
                          sub.protocol === 'sqs'
                            ? Layers
                            : sub.protocol === 'http'
                            ? Globe
                            : Mail;

                        return (
                          <div
                            key={sub.id}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-pink-400">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-white">
                                    {sub.endpoint}
                                  </span>
                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                    {sub.protocol}
                                  </span>
                                </div>
                                {sub.filterPolicy && (
                                  <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Filter className="w-3 h-3" />
                                    Filter: {JSON.stringify(sub.filterPolicy)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteSub(sub.id)}
                              className="text-slate-500 hover:text-red-400 p-1 self-end sm:self-auto"
                              title="Delete Subscription"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Subscription Drawer / Form */}
              {showSubForm && (
                <div className="bg-[#131B2E] border border-pink-500/30 rounded-xl p-5 space-y-4 animate-in fade-in">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-pink-400" />
                    Configure New Subscription
                  </h3>

                  <form onSubmit={handleAddSubscription} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Protocol
                        </label>
                        <select
                          value={newSubProtocol}
                          onChange={(e) => {
                            const p = e.target.value as 'sqs' | 'http' | 'email';
                            setNewSubProtocol(p);
                            if (p === 'sqs') {
                              setNewSubEndpoint(queues[0]?.id || '');
                            } else if (p === 'http') {
                              setNewSubEndpoint('https://api.external.com/webhook');
                            } else {
                              setNewSubEndpoint('alerts@company.internal');
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                        >
                          <option value="sqs">SQS Queue</option>
                          <option value="http">HTTP / Webhook Mock</option>
                          <option value="email">Email Mock</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Endpoint
                        </label>
                        {newSubProtocol === 'sqs' ? (
                          <select
                            value={newSubEndpoint}
                            onChange={(e) => setNewSubEndpoint(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500 font-mono"
                          >
                            {queues.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.name} ({q.type})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={newSubEndpoint}
                            onChange={(e) => setNewSubEndpoint(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-pink-500 font-mono"
                            required
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Subscription Filter Policy (JSON, optional)
                      </label>
                      <textarea
                        value={newSubFilterPolicy}
                        onChange={(e) => setNewSubFilterPolicy(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-purple-300 outline-none focus:border-pink-500"
                        placeholder='{"customer_tier": ["VIP"]}'
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs shadow-md transition-all"
                      >
                        Create Subscription
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSubForm(false)}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Fan-Out Architecture Diagram Preview */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-pink-400" />
                  Live Fan-Out Topology
                </h3>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="bg-pink-500/20 border border-pink-500/40 text-pink-300 px-4 py-3 rounded-xl font-mono text-xs font-bold text-center">
                    Topic: {currentTopic.name}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 sm:rotate-0" />

                  <div className="space-y-2 w-full max-w-xs">
                    {currentTopic.subscriptions.map((s) => (
                      <div
                        key={s.id}
                        className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-[11px] font-mono flex items-center justify-between text-slate-300"
                      >
                        <span className="truncate max-w-[150px]">{s.endpoint}</span>
                        <span className="text-pink-400 font-semibold">{s.protocol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select or create an SNS Topic.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

