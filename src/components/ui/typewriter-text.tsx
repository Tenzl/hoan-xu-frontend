"use client";

import { useEffect, useRef, useState } from "react";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
  textClassNames?: string[];
  onComplete?: () => void;
  /** Hold the final phrase this long before restarting (milliseconds). */
  repeatDelay?: number;
  /** Begin with the final phrase fully visible, then run the normal loop. */
  startWithLastText?: boolean;
  /** Static text that shares the active phrase's color. */
  suffix?: string;
  /** Static prefix, optionally one per phrase; it is never typed or erased. */
  prefix?: string | string[];
}

export function Typewriter(props: TypewriterProps) {
  // Restart cleanly when the input changes, including during typing or deletion.
  return <TypewriterSequence key={JSON.stringify([props.text, props.startWithLastText])} {...props} />;
}

function TypewriterSequence({
  text, speed = 100, cursor = "|", loop = false, deleteSpeed = 50,
  delay = 1500, className, textClassNames, onComplete, repeatDelay, startWithLastText = false, suffix = "", prefix = "",
}: TypewriterProps) {
  const texts = Array.isArray(text) ? text : [text];
  const initialIndex = startWithLastText ? Math.max(0, texts.length - 1) : 0;
  const [index, setIndex] = useState(initialIndex);
  const [length, setLength] = useState(startWithLastText ? (texts[initialIndex]?.length || 0) : 0);
  const [deleting, setDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const completed = useRef(false);
  const completionCallback = useRef(onComplete);
  const currentText = texts[index] || "";
  const lastText = texts[texts.length - 1] || "";
  const finished = index === texts.length - 1 && length === currentText.length && !loop;

  useEffect(() => { completionCallback.current = onComplete; }, [onComplete]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion === null || completed.current) return;
    const complete = () => {
      completed.current = true;
      completionCallback.current?.();
    };
    if (reducedMotion || !texts.length) { complete(); return; }
    const repeatCycle = loop && repeatDelay !== undefined && index === texts.length - 1 && length === currentText.length && !deleting;
    const wait = repeatCycle
      ? Math.max(0, repeatDelay)
      : deleting ? Math.max(0, deleteSpeed) : length < currentText.length ? Math.max(0, speed) : Math.max(0, delay);

    // One tracked timer covers typing, the hold, and deletion; unmount cancels it.
    const timeout = window.setTimeout(() => {
      if (deleting) {
        if (length > 1) setLength(value => value - 1);
        else {
          // Switch phrase/color in the same render that erases the last character.
          setLength(0);
          setDeleting(false);
          setIndex(value => (value + 1) % texts.length);
        }
      } else if (length < currentText.length) setLength(value => value + 1);
      else if (finished) complete();
      else setDeleting(true);
    }, wait);
    return () => window.clearTimeout(timeout);
  }, [currentText, length, deleting, finished, texts.length, speed, deleteSpeed, delay, reducedMotion, repeatDelay, index, loop]);

  const activeIndex = reducedMotion ? texts.length - 1 : index;
  const activeClass = textClassNames?.[activeIndex] || "";
  const activePrefix = Array.isArray(prefix) ? prefix[activeIndex] || "" : prefix;
  const lastPrefix = Array.isArray(prefix) ? prefix[texts.length - 1] || "" : prefix;
  return <span className={`${className || ""} ${activeClass}`} aria-label={`${lastPrefix}${lastText}${suffix}`}>
    {activePrefix && <span aria-hidden="true" className="typewriter-prefix">{activePrefix}</span>}
    <span aria-hidden="true" className={`typewriter-value ${activeClass}`}>
      {reducedMotion ? lastText : currentText.slice(0, length)}
    </span>
    {cursor && !reducedMotion && !finished && <span aria-hidden="true" className="typewriter-cursor">{cursor}</span>}
    {suffix && <span aria-hidden="true" className="typewriter-suffix">{suffix}</span>}
  </span>;
}
