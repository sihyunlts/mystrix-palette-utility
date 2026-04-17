import { useCallback, useState } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStatus,
  type Placement,
} from '@floating-ui/react';

interface UsePopoverOptions {
  placement?: Placement;
  fallbackPlacements?: Placement[];
  offsetPx?: number;
}

export const usePopover = ({
  placement = 'bottom-start',
  fallbackPlacements,
  offsetPx = 8,
}: UsePopoverOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const { refs, floatingStyles, context, placement: resolvedPlacement } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetPx),
      flip({ fallbackPlacements }),
      shift({ padding: 8 }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, {
    escapeKey: false,
    outsidePressEvent: 'mousedown',
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  const { isMounted, status } = useTransitionStatus(context, {
    duration: {
      open: 200,
      close: 150,
    },
  });

  return {
    referenceRef: refs.setReference,
    floatingRef: refs.setFloating,
    isOpen,
    floatingStyles: {
      ...floatingStyles,
      zIndex: 1000,
    },
    placement: resolvedPlacement,
    transitionStatus: status,
    getReferenceProps,
    getFloatingProps,
    isMounted,
    close,
  };
};
