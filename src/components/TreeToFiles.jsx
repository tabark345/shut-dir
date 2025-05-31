import React, { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// دالة التحقق من وجود رموز أو تعليقات أو إيموجي
function hasInvalidChars(line) {
  // رموز وتعليقات وإيموجي
  return /[#@!&]|[\u{1F600}-\u{1F6FF}]/u.test(line);
}

// دالة التحقق من اسم صالح (ملف أو مجلد)
function isValidName(name) {
  return !!name && !hasInvalidChars(name) && !/^(\s*#|\s*\/\/|\s*\/\*|\s*\*)/.test(name);
}

function FileTree({ node }) {
  if (!node || !node.children) return null;
  return (
    <ul className="pl-4 border-l border-gray-300">
      {node.children.map((child, idx) => (
        <li key={idx} className="my-1">
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
  const [treeText, setTreeText] = useState("");
  const [previewTree, setPreviewTree] = useState(null);
  const [error, setError] = useState("");

  const parseTree = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const stack = [];
    const root = { name: "", children: [] };

    for (let line of lines) {
      if (hasInvalidChars(line) || line.trim().startsWith("#")) {
        setError("🚫 لا يُسمح بالرموز أو التعليقات أو الإيموجي في الشجرة.");
        return null;
      }

      const trimmed = line.replace(/^(\s*├─+|\s*└─+|\s*├──?|\s*└──?)/, "").trim();

      if (!isValidName(trimmed)) continue;

      // العمق: عدد المسافات في بداية السطر مقسوم على 3
      const depth = Math.floor((line.match(/^\s*/)[0].length) / 3);

      const node = {
        name: trimmed,
        children: [],
        isFile: /\.[a-z0-9]+$/i.test(trimmed),
      };

      if (depth === 0) {
        root.children.push(node);
        stack[0] = node;
      } else {
        if (!stack[depth - 1]) {
          setError("🚫 هناك خطأ في بنية الشجرة.");
          return null;
        }
        stack[depth - 1].children.push(node);
        stack[depth] = node;
      }
    }

    if (!root.children.length) {
      setError("🚫 الشجرة فارغة أو غير صحيحة.");
      return null;
    }

    return root;
  };

  const addToZip = (zip, node, path = "") => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    if (node.isFile) {
      zip.file(currentPath, "// Your code here");
    } else {
      const folder = zip.folder(currentPath);
      node.children.forEach((child) => addToZip(folder, child, currentPath));
    }
  };

  const handlePreview = () => {
    setError("");
    if (!treeText.trim()) {
      setError("🚫 الرجاء إدخال الشجرة أولاً.");
      setPreviewTree(null);
      return;
    }
    const root = parseTree(treeText);
    if (root) setPreviewTree(root);
    else setPreviewTree(null);
  };

  const handleGenerate = () => {
    setError("");
    if (!treeText.trim()) {
      setError("🚫 الرجاء إدخال الشجرة أولاً.");
      return;
    }
    const root = parseTree(treeText);
    if (!root) return;
    const zip = new JSZip();
    root.children.forEach((child) => addToZip(zip, child));
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "project.zip");
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">
        📂 Tree to Files Converter
      </h2>
      <textarea
        rows={12}
        className="w-full p-2 border rounded mb-4 font-mono"
        placeholder="Paste your tree structure here"
        value={treeText}
        onChange={(e) => {
          setTreeText(e.target.value);
          setError("");
        }}
      />
      {error && (
        <div className="bg-red-100 text-red-700 p-2 mb-2 rounded border border-red-300">
          {error}
        </div>
      )}
      <div className="flex gap-4 mb-4">
        <button
          onClick={handlePreview}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Preview Tree
        </button>
        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate ZIP
        </button>
      </div>
      {previewTree && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Preview:</h3>
          <FileTree node={previewTree} />
        </div>
      )}
    </div>
  );
}
