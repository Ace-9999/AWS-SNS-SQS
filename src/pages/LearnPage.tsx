import React from 'react';
import {
  BookOpen,
  Zap,
  Send,
  Layers,
  Cpu,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export const LearnPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400" />
          AWS Event-Driven Architecture Guide & Comparison
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deep-dive guide into EventBridge, SNS, SQS, consumer patterns, and how PulseBridge maps directly to AWS cloud semantics.
        </p>
      </div>

      {/* Comparison Table: EventBridge vs SNS vs SQS */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Service Comparison: EventBridge vs SNS vs SQS
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-purple-300">Amazon EventBridge</th>
                <th className="py-3 px-4 text-pink-300">Amazon SNS</th>
                <th className="py-3 px-4 text-indigo-300">Amazon SQS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Primary Role</td>
                <td className="py-3 px-4">Serverless Event Bus router</td>
                <td className="py-3 px-4">Pub/Sub push fan-out hub</td>
                <td className="py-3 px-4">Message queuing & buffer</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Delivery Model</td>
                <td className="py-3 px-4">Push to targets</td>
                <td className="py-3 px-4">Push to subscribers</td>
                <td className="py-3 px-4">Pull (polled by consumers)</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Filtering Engine</td>
                <td className="py-3 px-4 text-purple-300">
                  Rich JSON Event Patterns (prefix, ranges, exists)
                </td>
                <td className="py-3 px-4 text-pink-300">
                  Message Attribute & Body Filter Policies
                </td>
                <td className="py-3 px-4 text-slate-500">
                  No built-in filtering (consumers filter)
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Ordering</td>
                <td className="py-3 px-4">Best-effort ordering</td>
                <td className="py-3 px-4">FIFO topics or standard</td>
                <td className="py-3 px-4 text-indigo-300">
                  Standard (unordered) / FIFO (MessageGroupId)
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Backpressure & Buffering</td>
                <td className="py-3 px-4">No consumer queue buffering</td>
                <td className="py-3 px-4">No consumer queue buffering</td>
                <td className="py-3 px-4 text-indigo-300">
                  &check; High buffer capacity (decouples producers)
                </td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-white">Fault Handling</td>
                <td className="py-3 px-4">Rule DLQs & retry policy</td>
                <td className="py-3 px-4">Subscription DLQs & backoff</td>
                <td className="py-3 px-4 text-indigo-300">
                  Visibility timeout + maxReceiveCount DLQ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Core AWS Architectural Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Zap className="w-4 h-4" />
            1. EventBridge Pattern Matching
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            EventBridge rules evaluate JSON envelopes matching source, detail-type, and nested detail keys. It uses declarative array-based syntax where lists represent OR combinations, supporting prefix matches, suffix matches, numeric comparisons, and existence assertions.
          </p>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
            <Send className="w-4 h-4" />
            2. SNS Fan-Out Architecture
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            By connecting an SNS Topic between EventBridge and multiple SQS Queues, an event can be simultaneously pushed to multiple microservices (e.g. Fulfillment, Analytics, and Notifications) without the producer knowing about the downstream consumers.
          </p>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Layers className="w-4 h-4" />
            3. SQS Visibility Timeout
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When a worker receives a message, SQS doesn't immediately delete it. It leases the message by starting a Visibility Timeout countdown. If the worker crashes or fails before ACKing, the timeout expires and the message safely reappears for another worker.
          </p>
        </div>

        <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            4. Dead-Letter Queues (DLQ) & Poison Pills
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If a message contains bad data that repeatedly crashes workers (a "poison pill"), SQS increments <code className="text-amber-400">receiveCount</code>. Once it reaches <code className="text-amber-400">maxReceiveCount</code>, SQS isolates it in a DLQ so it doesn't block the rest of the queue.
          </p>
        </div>
      </div>

      {/* Terminology Glossary */}
      <div className="bg-[#131B2E] border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          Event-Driven Architecture Glossary
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-amber-400 font-bold">FIFO Exactly-Once Processing</span>
            <p className="text-slate-400">
              Guarantees strict in-order processing per MessageGroupId and deduplicates identical messages within a 5-minute deduplication window.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-cyan-400 font-bold">Input Transformer</span>
            <p className="text-slate-400">
              Extracts JSON paths from the original event (inputPathsMap) and reshapes them into a customized payload template for the target.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-purple-400 font-bold">Event Archive & Replay</span>
            <p className="text-slate-400">
              Retains historical events on the bus, allowing engineers to reproduce past incidents by replaying messages across specified timeframes and rules.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
            <span className="text-red-400 font-bold">Chaos Injection</span>
            <p className="text-slate-400">
              The deliberate introduction of network faults, crashes, and latency into the pipeline to verify self-healing retries and DLQ escalation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

