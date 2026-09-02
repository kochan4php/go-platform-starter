import { reportFrontendError } from "@starter/contracts";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useCopy, useToast } from "./lib/ui";

interface Props {
  children: ReactNode;
  resetKey?: string;
}
interface State {
  error: Error | null;
}

export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportFrontendError(error, "boundary");
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;
    return (
      <div className="p-8">
        <h2 className="text-lg font-bold tracking-tight">Something went wrong</h2>
        <p className="mt-2 max-w-lg text-sm text-[var(--color-muted)]">
          {err.message || "An unexpected error occurred while loading this section."}
        </p>
        <CopyErrorButton error={err} />
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="ui-hover mt-4 block rounded-xl border border-[var(--color-line)] px-3 py-1.5 text-sm transition-colors"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 block text-xs text-[var(--color-muted)] underline underline-offset-2"
        >
          Reload page
        </button>
        <a
          href="https://github.com/kochan4php/go-platform-starter/blob/main/docs/TROUBLESHOOTING.md"
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-xs text-[var(--color-muted)] underline underline-offset-2"
        >
          Open troubleshooting guide
        </a>
      </div>
    );
  }
}

function CopyErrorButton({ error }: { error: Error }) {
  const [copied, copy] = useCopy();
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        copy(error.stack ?? error.message);
        toast("success", "Error details copied");
      }}
      className="mt-3 block text-xs text-[var(--color-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]"
    >
      {copied ? "Copied!" : "Copy error details"}
    </button>
  );
}
