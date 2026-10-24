import type { Ref } from "react";

/** The question on screen; focusable, so keyboard users and screen readers continue at it. */
export function QuestionHeading({
  ref,
  children,
}: {
  ref: Ref<HTMLHeadingElement>;
  children: string;
}) {
  return (
    <h2
      ref={ref}
      tabIndex={-1}
      className="text-xl leading-snug font-semibold wrap-break-word outline-none sm:text-2xl"
    >
      {children}
    </h2>
  );
}
