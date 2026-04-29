'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      {/* Robot avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-sm shadow-glow-purple">
        🤖
      </div>

      {/* Dots container */}
      <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full bg-accent-purple animate-typing-dot-1"
          style={{ display: 'inline-block' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-accent-purple animate-typing-dot-2"
          style={{ display: 'inline-block' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-accent-purple animate-typing-dot-3"
          style={{ display: 'inline-block' }}
        />
      </div>
    </div>
  );
}
