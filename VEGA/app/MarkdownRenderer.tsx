'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Play, Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onCodeBlockClick?: (language: string, code: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onCodeBlockClick }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="prose prose-invert max-w-none text-sm space-y-3 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            const codeString = String(children).replace(/\n$/, '');

            if (inline) {
              return (
                <code className="bg-zinc-800 text-amber-400 px-1 py-0.5 rounded font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : 'text';
            const blockId = Math.random().toString(36).substring(7);

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950/90 font-mono">
                <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900/80 text-xs text-zinc-400 border-b border-zinc-850">
                  <span className="font-semibold">{language.toUpperCase()}</span>
                  <div className="flex items-center gap-2">
                    {onCodeBlockClick && ['html', 'svg', 'javascript', 'typescript', 'css', 'mermaid', 'xml'].includes(language) && (
                      <button
                        onClick={() => onCodeBlockClick(language, codeString)}
                        className="flex items-center gap-1 hover:text-amber-400 transition"
                        title="Open in Artifacts Panel"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Artifact</span>
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(codeString, blockId)}
                      className="flex items-center gap-1 hover:text-zinc-200 transition"
                    >
                      {copiedId === blockId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === blockId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <pre className="p-4 overflow-x-auto text-zinc-300 text-xs leading-5">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 border border-zinc-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-300 font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="p-3">{children}</th>;
          },
          td({ children }) {
            return <td className="p-3 border-b border-zinc-800/50 text-zinc-400">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
