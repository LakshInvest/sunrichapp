import type { ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useBackClose } from "@/hooks/use-back-close";

/**
 * Bottom sheet that closes on swipe-down (vaul) and on the browser/Android
 * back button. Wrap all bottom sheets with this.
 */
export function SheetDrawer({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const dismiss = useBackClose(open, () => onOpenChange(false));
  return (
    <Drawer open={open} onOpenChange={(o) => (o ? onOpenChange(true) : dismiss())}>
      <DrawerContent className={`mx-auto max-w-md ${className ?? ""}`}>{children}</DrawerContent>
    </Drawer>
  );
}
