"use client";

import React, { useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MarkdownIt = require("markdown-it");

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className = "" }) => {
  const md = useMemo(() => {
    const parser = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: true,
    });

    // Open links in a new tab with noopener
    const defaultRender =
      parser.renderer.rules.link_open ||
      function (tokens: unknown[], idx: number, options: unknown, _env: unknown, self: { renderToken: (t: unknown[], i: number, o: unknown) => string }) {
        return self.renderToken(tokens, idx, options);
      };

    parser.renderer.rules.link_open = function (tokens: unknown[], idx: number, options: unknown, env: unknown, self: { renderToken: (t: unknown[], i: number, o: unknown) => string }) {
      const aIndex = (tokens[idx] as { attrIndex: (name: string) => number }).attrIndex("target");
      if (aIndex < 0) {
        (tokens[idx] as { attrPush: (attr: [string, string]) => void }).attrPush(["target", "_blank"]);
      }
      const relIndex = (tokens[idx] as { attrIndex: (name: string) => number }).attrIndex("rel");
      if (relIndex < 0) {
        (tokens[idx] as { attrPush: (attr: [string, string]) => void }).attrPush(["rel", "noopener noreferrer"]);
      }
      return defaultRender(tokens, idx, options, env, self);
    };

    return parser;
  }, []);

  const html = useMemo(() => {
    if (!content) return "";
    return md.render(content);
  }, [content, md]);

  return (
    <div
      className={`astro-markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
