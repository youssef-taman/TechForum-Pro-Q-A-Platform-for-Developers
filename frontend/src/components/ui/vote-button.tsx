import {ThumbsUp, ThumbsDown} from "lucide-react";
import type {MouseEventHandler} from "react";

type VoteButtonProps = {
  direction: "up" | "down";
  active?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  title?: string;
};

export function VoteButton({
  direction,
  active = false,
  disabled = false,
  onClick,
  ariaLabel,
  title,
}: VoteButtonProps) {
  const base = "flex h-8 w-8 items-center justify-center rounded-full border transition-shadow";

  const upActive = "bg-neon/10 border-neon text-neon shadow-neon/20";
  const upInactive = "border-border text-muted-foreground hover:border-neon hover:text-neon";

  const downActive = "bg-destructive/10 border-destructive text-destructive shadow-destructive/10";
  const downInactive = "border-border text-muted-foreground hover:border-destructive hover:text-destructive";

  const disabledCls = "opacity-50 cursor-not-allowed";

  const className = `${base} ${active ? (direction === "up" ? upActive : downActive) : direction === "up" ? upInactive : downInactive} ${disabled ? disabledCls : ""}`;

  const Icon = direction === "up" ? ThumbsUp : ThumbsDown;

  return (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      aria-pressed={active}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default VoteButton;
