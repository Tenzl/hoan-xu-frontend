"use client";

import { Typewriter } from "@/components/ui/typewriter-text";

export function DemoVariant1() {
  return <Typewriter
    text={["Welcome to HextaUI", "Build awesome websites.", "hextaui.com"]}
    speed={100}
    loop
    className="typewriter-demo"
  />;
}
