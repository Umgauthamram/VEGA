import React from 'react';
import { AlertTriangle, Trash2, Shield, Info, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  monospaceDetail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  iconType?: 'danger' | 'warning' | 'info' | 'shield';
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

let confirmPromiseResolve: ((value: boolean) => void) | null = null;
let confirmPromiseResolveCheckbox: ((value: { ok: boolean; checked: boolean }) => void) | null = null;

export function ConfirmDialog({
  isOpen,
  title,
  description,
  monospaceDetail,
  checkboxLabel,
  checkboxChecked,
  onCheckboxChange,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  iconType = 'warning',
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-rose-500" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-accent" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-55 flex items-center justify-center p-4 backdrop-blur-xs select-none text-foreground font-sans">
      <div className="bg-card-bg border border-border-color p-5 rounded-2xl shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-sidebar rounded-xl border border-border-color shrink-0">
            {renderIcon()}
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="font-serif font-bold text-base text-foreground leading-tight">{title}</h3>
            <p className="text-xs text-foreground/70 leading-relaxed">{description}</p>
          </div>
        </div>

        {monospaceDetail && (
          <div className="bg-sidebar border border-border-color rounded-xl p-3 font-mono text-[10px] text-foreground/80 overflow-y-auto max-h-44 whitespace-pre-wrap break-all">
            {monospaceDetail}
          </div>
        )}

        {checkboxLabel && onCheckboxChange && (
          <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => onCheckboxChange(e.target.checked)}
              className="rounded border-border-color text-accent focus:ring-accent accent-accent w-4 h-4"
            />
            <span className="text-[11px] font-semibold text-foreground/80">{checkboxLabel}</span>
          </label>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-border-color/10">
          {!hideCancel && (
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 border border-border-color hover:bg-sidebar rounded-lg text-xs font-bold transition text-foreground/80"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-white shadow-xs ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Global trigger helper
export let triggerConfirmDialog: (options: {
  title: string;
  description: string;
  monospaceDetail?: string;
  checkboxLabel?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  iconType?: 'danger' | 'warning' | 'info' | 'shield';
  hideCancel?: boolean;
}) => Promise<{ ok: boolean; checked: boolean }> = () => Promise.resolve({ ok: false, checked: false });

export function registerConfirmTrigger(triggerFn: typeof triggerConfirmDialog) {
  triggerConfirmDialog = triggerFn;
}
