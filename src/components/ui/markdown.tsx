"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { Button } from './button';

const remarkPlugins = [remarkGfm];

const markdownComponents = (isFullBleed?: boolean) => ({
  pre({ node, inline, className, children, ...props }: any) {
    return <>{children}</>;
  },
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match) {
      const codeString = String(children).replace(/\n$/, '');
      const lineCount = codeString.split('\n').length;
      
      // Calculate height: ~19px per line + padding, clamp between 100px and 500px for inline blocks
      const editorHeight = isFullBleed ? '100%' : Math.min(Math.max(lineCount * 19 + 20, 60), 500);

      return (
        <div 
          className={cn("relative group w-full", !isFullBleed && "mt-3 mb-3")} 
          style={{ height: editorHeight }}
        >
          {!isFullBleed && (
            <div className="absolute right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <CopyButton value={codeString} />
            </div>
          )}
          <div className={cn(
            "w-full h-full",
            isFullBleed ? "" : "rounded-lg border border-border overflow-hidden bg-black/40 py-3"
          )}>
            <Editor
              height="100%"
              language={match[1] === 'js' ? 'javascript' : match[1] === 'ts' ? 'typescript' : match[1]}
              theme="brane-dark"
              beforeMount={(monaco) => {
                monaco.editor.defineTheme('brane-dark', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [],
                  colors: {
                    'editor.background': '#00000000',
                    'editor.lineHighlightBackground': '#ffffff0a',
                  },
                });
              }}
              value={codeString}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'none',
                contextmenu: false,
                folding: true,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  alwaysConsumeMouseWheel: false,
                },
                padding: { top: 0, bottom: 0 },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              }}
            />
          </div>
        </div>
      );
    }
    return (
      <code className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-[0.8em]", className)} {...props}>
        {children}
      </code>
    );
  },
});

export const Markdown = React.memo(function Markdown({ 
  content, 
  className,
  fullBleed = false 
}: { 
  content: string, 
  className?: string,
  fullBleed?: boolean
}) {
  return (
    <div className={cn(
      "markdown-prose prose prose-sm prose-neutral dark:prose-invert max-w-none break-words text-txt-2 prose-headings:text-txt-1 prose-strong:text-txt-1 prose-code:text-txt-1",
      fullBleed && "h-full w-full",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={markdownComponents(fullBleed)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content && 
         prevProps.className === nextProps.className &&
         prevProps.fullBleed === nextProps.fullBleed;
});

function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button variant="secondary" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-700 bg-zinc-800 border-zinc-700" onClick={copy}>
      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}