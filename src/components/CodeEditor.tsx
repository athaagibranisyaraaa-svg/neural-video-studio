import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

let initialized = false;
function initMonaco() {
  if (initialized) return;
  initialized = true;
  (self as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
      if (label === 'html') return new htmlWorker();
      if (label === 'typescript' || label === 'javascript') return new tsWorker();
      return new editorWorker();
    },
  };
  monaco.editor.defineTheme('nvs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '7dd3fc' },
      { token: 'attribute.name', foreground: 'c4b5fd' },
      { token: 'attribute.value', foreground: '86efac' },
      { token: 'keyword', foreground: 'f0abfc' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fdba74' },
      { token: 'comment', foreground: '64748b' },
    ],
    colors: {
      'editor.background': '#070a14',
      'editor.lineHighlightBackground': '#0d1226',
      'editorLineNumber.foreground': '#33415e',
      'editorCursor.foreground': '#22d3ee',
      'editorIndentGuide.background1': '#131a30',
      'editorWidget.background': '#0b1020',
    },
  });
}

interface Props {
  language: 'html' | 'css' | 'javascript';
  value: string;
  onChange: (v: string) => void;
}

export default function CodeEditor({ language, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    initMonaco();
    const editor = monaco.editor.create(containerRef.current!, {
      value,
      language,
      theme: 'nvs-dark',
      automaticLayout: true,
      fontSize: 13,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      padding: { top: 12 },
      renderLineHighlight: 'line',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
    });
    editorRef.current = editor;
    modelRef.current = editor.getModel();
    const sub = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue());
    });
    return () => { sub.dispose(); editor.dispose(); modelRef.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    const currentLang = model.getLanguageId();
    if (currentLang !== language && (language === 'html' || language === 'css' || language === 'javascript')) {
      monaco.editor.setModelLanguage(model, language);
    }
    if (model.getValue() !== value) model.setValue(value);
  }, [language, value]);

  return <div ref={containerRef} className="h-full w-full min-h-[300px]" />;
}
