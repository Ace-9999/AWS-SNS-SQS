import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Inbox,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Flame,
} from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { SQSMessage, SQSQueue } from '../engine/types';

export const SQSQueuesPage: React.FC = () => {
  const {
    queues,
    messages,
    addQueue,
    updateQueue,
    deleteQueue,
    manualEnqueue,
    manualReceive,
    manualDeleteMessage,
    purgeQueue,
    clockState,
  } = useSimulationStore();

  const [selectedQueueId, setSelectedQueueId] = useState(queues[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'visible' | 'inflight' | 'delayed' | 'dlq'>('visible');

  // Manual send modal / inline state
  const [manualPayloadJson, setManualPayloadJson] = useState('{\n  "orderId": "manual-999",\n  "amount": 250\n}');
  const [manualDelay, setManualDelay] = useState(0);
  const [manualGroupId, setManualGroupId] = useState('group-1');
  const [manualDedupId, setManualDedupId] = useState('');

  // New queue form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueueType, setNewQueueType] = useState<'STANDARD' | 'FIFO'>('STANDARD');
  const [newVisibility, setNewVisibility] = useState(10);
  const [newMaxReceive, setNewMaxReceive] = useState(3);
  const [newDlqTarget, setNewDlqTarget] = useState('');

  const currentQueue = queues.find((q) => q.id === selectedQueueId) || queues[0];

  // Filter messages for current queue
  const queueMessages = messages.filter((m) => m.queueId === currentQueue?.id);
  const visibleMessages = queueMessages.filter((m) => m.state === 'visible');
  const inflightMessages = queueMessages.filter((m) => m.state === 'inflight');
  const delayedMessages = queueMessages.filter((m) => m.state === 'delayed');
  const dlqMessages = queueMessages.filter((m) => m.state === 'dlq');

  const displayedMessages =
    activeTab === 'visible'
      ? visibleMessages
      : activeTab === 'inflight'
      ? inflightMessages
      : activeTab === 'delayed'
      ? delayedMessages
      : dlqMessages;

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQueue) return;
    try {
      const parsed = JSON.parse(manualPayloadJson);
      manualEnqueue(
        currentQueue.id,
        parsed,
        manualDelay,
        currentQueue.type === 'FIFO' ? manualGroupId : undefined,
        currentQueue.type === 'FIFO' ? manualDedupId || undefined : undefined
      );
      setManualDedupId('');
    } catch (e: any) {
      alert(`Invalid JSON: ${e.message}`);
    }
  };

  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;

    let finalName = newQueueName.trim();
    if (newQueueType === 'FIFO' && !finalName.endsWith('.fifo')) {
      finalName += '.fifo';
    }

    const queueId = `queue-${finalName.toLowerCase().replace(/[^a-z0-9.-]/g, '-')}`;
    const q: SQSQueue = {
      id: queueId,
      arn: `arn:aws:sqs:us-east-1:123456789012:${finalName}`,
      name: finalName,
      type: newQueueType,
      visibilityTimeoutSec: newVisibility,
      delaySec: 0,
      retentionSec: 86400,
      maxReceiveCount: newMaxReceive,
      deadLetterQueueId: newDlqTarget || undefined,
      contentBasedDeduplication: newQueueType === 'FIFO',
      createdAt: Date.now(),
    };

    addQueue(q);
    setNewQueueName('');
    setShowCreateModal(false);
    setSelectedQueueId(q.id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Amazon Simple Queue Service (SQS)
          </h1>
          <p className="text-xs text-slate-400">
            Standard and FIFO queues with state machine lifecycle: visible, in-flight lease countdown, dead-letter routing, and deduplication.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20 w-fit"
        >
          <Plus className="w-4 h-4" /> Create Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Queues List */}
        <div className="lg:col-span-4 bg-[#131B2E] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Queues ({queues.length})
            </h2>
          </div>

          <div className="space-y-2">
            {queues.map((q) => {
              const qMsgs = messages.filter((m) => m.queueId === q.id && m.state !== 'deleted');
              const isDlq = q.name.toLowerCase().includes('dlq');

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQueueId(q.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedQueueId === q.id
                      ? isDlq
                        ? 'bg-red-950/20 border-red-500/40 text-red-200'
                        : 'bg-indigo-950/20 border-indigo-500/40 text-indigo-200'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-white truncate max-w-[150px]">
                        {q.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-800 text-indigo-300">
                        {q.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {qMsgs.length} messages (Vis: {q.visibilityTimeoutSec}s)
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQueue(q.id);
                    }}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete Queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Queue Operations & Inspector */}
        <div className="lg:col-span-8 space-y-6">
          {currentQueue ? (
            <>
              {/* Queue Controls & Metrics Header */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white font-mono">{currentQueue.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {currentQueue.type}
                      </span>
                      {currentQueue.deadLetterQueueId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          DLQ: {currentQueue.deadLetterQueueId}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Max Receive Count: {currentQueue.maxReceiveCount} &bull; Visibility Timeout: {currentQueue.visibilityTimeoutSec}s
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualReceive(currentQueue.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-medium text-xs transition-colors flex items-center gap-1"
                    >
                      <Inbox className="w-3.5 h-3.5" /> Receive/Lease (1)
                    </button>
                    <button
                      onClick={() => purgeQueue(currentQueue.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium text-xs transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Purge
                    </button>
                  </div>
                </div>

                {/* Queue State Metrics Tabs */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <button
                    onClick={() => setActiveTab('visible')}
                    className={`p-3 rounded-lg border transition-all ${
                      activeTab === 'visible'
                        ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-lg text-white">{visibleMessages.length}</div>
                    <span className="text-[11px]">Visible Messages</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('inflight')}
                    className={`p-3 rounded-lg border transition-all ${
                      activeTab === 'inflight'
                        ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-lg text-white">{inflightMessages.length}</div>
                    <span className="text-[11px]">In-Flight</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('delayed')}
                    className={`p-3 rounded-lg border transition-all ${
                      activeTab === 'delayed'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-lg text-white">{delayedMessages.length}</div>
                    <span className="text-[11px]">Delayed</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('dlq')}
                    className={`p-3 rounded-lg border transition-all ${
                      activeTab === 'dlq'
                        ? 'bg-red-950/30 border-red-500/40 text-red-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-lg text-white">{dlqMessages.length}</div>
                    <span className="text-[11px]">DLQ Diverted</span>
                  </button>
                </div>

                {/* Messages Inspection Table */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 max-h-72 overflow-y-auto">
                  {displayedMessages.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No {activeTab} messages currently in this queue.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Message ID</th>
                          <th className="py-2 px-3">Attempts</th>
                          <th className="py-2 px-3">Lease / Expiration</th>
                          <th className="py-2 px-3">Body Payload</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {displayedMessages.map((msg) => {
                          const now = clockState.simTimeMs;
                          const visRemainingSec = Math.max(
                            0,
                            Math.ceil((msg.visibilityExpiresAt - now) / 1000)
                          );

                          return (
                            <tr key={msg.id} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 text-indigo-300 font-semibold truncate max-w-[120px]">
                                {msg.id}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                                    msg.receiveCount >= currentQueue.maxReceiveCount
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {msg.receiveCount} / {currentQueue.maxReceiveCount}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-400">
                                {msg.state === 'inflight' ? (
                                  <span className="text-cyan-400 font-semibold">
                                    Expires in {visRemainingSec}s
                                  </span>
                                ) : msg.state === 'delayed' ? (
                                  <span className="text-amber-400">Delayed</span>
                                ) : (
                                  'Ready'
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-300 truncate max-w-[200px]">
                                {JSON.stringify(msg.body)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => manualDeleteMessage(msg.id)}
                                  className="text-red-400 hover:text-red-300 text-[11px]"
                                  title="ACK and delete message"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Manual Send Message to this Queue */}
              <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  Manual Message Enqueue
                </h3>

                <form onSubmit={handleManualSend} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Message Body (JSON)
                    </label>
                    <textarea
                      value={manualPayloadJson}
                      onChange={(e) => setManualPayloadJson(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-indigo-200 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Delay Seconds
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={900}
                        value={manualDelay}
                        onChange={(e) => setManualDelay(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>

                    {currentQueue.type === 'FIFO' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Message Group ID
                          </label>
                          <input
                            type="text"
                            value={manualGroupId}
                            onChange={(e) => setManualGroupId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Deduplication ID
                          </label>
                          <input
                            type="text"
                            value={manualDedupId}
                            onChange={(e) => setManualDedupId(e.target.value)}
                            placeholder="Optional dedup key"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-500/20"
                  >
                    Enqueue Message
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select or create an SQS queue.
            </div>
          )}
        </div>
      </div>

      {/* Create Queue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Create SQS Queue
            </h3>

            <form onSubmit={handleCreateQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Queue Name</label>
                <input
                  type="text"
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  placeholder="e.g. orders-queue"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Queue Type</label>
                <select
                  value={newQueueType}
                  onChange={(e) => setNewQueueType(e.target.value as 'STANDARD' | 'FIFO')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="STANDARD">Standard (High throughput, best-effort ordering)</option>
                  <option value="FIFO">FIFO (First-In-First-Out, exactly-once deduplication)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Visibility Timeout (sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Max Receive Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newMaxReceive}
                    onChange={(e) => setNewMaxReceive(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Dead-Letter Queue (DLQ Target, optional)
                </label>
                <select
                  value={newDlqTarget}
                  onChange={(e) => setNewDlqTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="">No DLQ</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors"
                >
                  Create Queue
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

