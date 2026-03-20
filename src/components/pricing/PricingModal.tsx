import PricingCard from './PricingCard';
import { X } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden bg-background border border-border">
        {/* Close button */}
        <div className="flex justify-end px-5 pt-5 pb-1">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-full bg-foreground/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-8">
          <PricingCard variant="inapp" onCtaClick={onClose} />
        </div>
      </div>
    </div>
  );
}
