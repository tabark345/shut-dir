import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function FileTree({ node }) {
  if (!node || !node.children) return null;

  const items = node.name ? [node] : node.children;

  return (
    <ul className="pl-4 border-l border-gray-300">
      {items.map((child, index) => (
        <li key={index} className="my-1">
          {child.isFile ? (
            <span className="text-sm">📄 {child.name}</span>
          ) : (
            <>
              <span className="font-semibold text-sm">📁 {child.name}</span>
              <FileTree node={child} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function TreeToFiles() {
  const [treeText, setTreeText] = useState('');
  const [parsedTree, setParsedTree] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const sanitizeLine = (line) => {
    return line
      .replace(/[#@$/\*\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/gu, '')
      .trim();
  };

  const isValidStructure = (text) => {
    const hasValidSyntax = /[├└│]/.test(text) || /\/.+/.test(text);
    const hasFolderOrFile = /(src|components|pages|\.jsx|\.js|\.html)/.test(text);
    return hasValidSyntax && hasFolderOrFile;
  };

  const parseTree = (text) => {
    const lines = text.split('\n').map(sanitizeLine).filter(Boolean);
    const root = { name: '', children: [] };
    const stack = [];

    for (let line of lines) {
      const name = line.replace(/^\s*[├└]──?/, '').trim();
      const depth = (line.match(/(\s{4}|│)/g) || []).length;
      const node = { name, children: [], isFile: name.includes('.') };

      if (depth === 0) {
        root.children.push(node);
        stack[0] = node;
      } else {
        stack[depth - 1]?.children.push(node);
        stack[depth] = node;
      }
    }

    return root;
  };

  const addToZip = (zip, node, path = '') => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    if (node.isFile) {
      zip.file(currentPath, '// Your code here');
    } else {
      const folder = zip.folder(currentPath);
      node.children.forEach(child => addToZip(folder, child, ''));
    }
  };

  const handlePreview = () => {
    setErrorMsg('');
    setLoading(true);
    requestAnimationFrame(() => {
      if (!treeText.trim()) {
        setErrorMsg('❗ Please fill in your structure!');
        setParsedTree(null);
        setLoading(false);
        return;
      }
      if (!isValidStructure(treeText)) {
        setErrorMsg('❗ Syntax for structure not correct!');
        setParsedTree(null);
        setLoading(false);
        return;
      }

      const tree = parseTree(treeText);
      setParsedTree(tree);
      setLoading(false);
    });
  };

  const handleGenerate = () => {
    if (!parsedTree) {
      setErrorMsg('❗ Please preview first!');
      return;
    }

    const zip = new JSZip();
    parsedTree.children.forEach(child => addToZip(zip, child));

    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'project.zip');
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">📂 Shut Dir - Folder Tree to Files</h1>

      <textarea
        className="w-full p-3 border border-gray-300 rounded mb-2 font-mono h-60"
        placeholder={`Paste tree structure here\ne.g.\nsrc/\n├── components/\n│   └── Navbar.jsx\n├── pages/\n│   ├── Home.jsx\n│   └── Login.jsx\n├── App.jsx\n└── main.jsx`}
        value={treeText}
        onChange={(e) => {
          setTreeText(e.target.value);
          setErrorMsg('');
        }}
      />

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded border border-red-300">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <button
          onClick={handlePreview}
          className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Loading...' : 'Preview Tree'}
        </button>
        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Generate ZIP
        </button>
      </div>

      {parsedTree && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">📋 Preview</h2>
          <FileTree node={parsedTree} />
        </div>
      )}
    </div>
  );
}
