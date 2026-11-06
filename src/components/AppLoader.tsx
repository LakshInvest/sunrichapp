import { LaunchArt } from "@/components/LaunchFrame";

/** While a screen loads, keep showing the same static brand frame (no spinner, no second loader). */
export function AppLoader() {
  return (
    <div className="fixed inset-0" role="status" aria-busy="true">
      <LaunchArt />
    </div>
  );
}
