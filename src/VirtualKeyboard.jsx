import { useState } from 'react';

// 単語に含まれる文字は a-z と "-" のみ
const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-'],
];

function Key({ label, onPress }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // pointerdown で即入力（click 待ちの遅延とダブルタップズームを避ける）
        e.preventDefault();
        setPressed(true);
        onPress(label);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex-1 max-w-[9.5%] h-full flex items-center justify-center rounded-lg border font-mono text-xl font-medium transition-colors duration-75 ${
        pressed
          ? 'bg-zinc-700 border-zinc-600 text-[#fafafa]'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

export function VirtualKeyboard({ onKey }) {
  return (
    <div className="w-full flex flex-col gap-1.5 h-full touch-none">
      {ROWS.map((row, i) => (
        <div key={i} className="flex-1 flex justify-center gap-1.5">
          {row.map((k) => (
            <Key key={k} label={k} onPress={onKey} />
          ))}
        </div>
      ))}
    </div>
  );
}
