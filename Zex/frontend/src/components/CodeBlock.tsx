import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Code } from 'lucide-react';

interface CodeBlockProps {
    code: string;
    language?: string;
}

const CodeBlock = ({ code, language = 'javascript' }: CodeBlockProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Language display names
    const languageNames: Record<string, string> = {
        js: 'JavaScript',
        javascript: 'JavaScript',
        ts: 'TypeScript',
        typescript: 'TypeScript',
        tsx: 'TypeScript React',
        jsx: 'JavaScript React',
        py: 'Python',
        python: 'Python',
        html: 'HTML',
        css: 'CSS',
        json: 'JSON',
        bash: 'Bash',
        sh: 'Shell',
        sql: 'SQL',
        md: 'Markdown',
    };

    return (
        <div className="relative group my-3 rounded-xl overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-400">
                        {languageNames[language?.toLowerCase()] || language || 'Code'}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Kopyalandı</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopyala</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code */}
            <SyntaxHighlighter
                language={language?.toLowerCase() || 'javascript'}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    background: '#1e1e1e',
                }}
                showLineNumbers
                lineNumberStyle={{
                    color: '#555',
                    paddingRight: '1rem',
                    minWidth: '2.5rem',
                }}
            >
                {code.trim()}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
