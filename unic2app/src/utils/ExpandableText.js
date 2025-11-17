import React, { useState } from "react";

export default function ExpandableText({ text, maxLength = 80, className = ""  }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > maxLength;
  const displayText = expanded || !isLong ? text : text.slice(0, maxLength) + "...";

  return (
    <span className={`${className} text-gray-400`}>
      {displayText}
      {isLong && (
        <>
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="text-blue-400 text-[9px] underline ml-1"
            >
              more
            </button>
          ) : (
            <button
              onClick={() => setExpanded(false)}
              className="text-blue-400 text-[9px] underline ml-1"
            >
              less
            </button>
          )}
        </>
      )}
    </span>
  );
}