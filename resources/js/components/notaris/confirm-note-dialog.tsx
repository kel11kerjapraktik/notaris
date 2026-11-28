import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type ConfirmNoteDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    confirmVariant?: 'default' | 'destructive';
    requireNote?: boolean;
    showNote?: boolean;
    noteLabel?: string;
    notePlaceholder?: string;
    processing?: boolean;
    onConfirm: (note: string) => void;
};

export function ConfirmNoteDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Konfirmasi',
    confirmVariant = 'default',
    requireNote = false,
    showNote = true,
    noteLabel = 'Catatan',
    notePlaceholder = 'Tulis catatan atau keterangan…',
    processing = false,
    onConfirm,
}: ConfirmNoteDialogProps) {
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (requireNote && note.trim().length < 3) return;
        onConfirm(note.trim());
        setNote('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    {showNote && (
                        <div className="my-4 space-y-2">
                            <Label htmlFor="dialog-note">
                                {noteLabel}{' '}
                                {requireNote && (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>
                            <textarea
                                id="dialog-note"
                                className="flex min-h-22 w-full rounded-xl border border-input bg-background/85 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:outline-none"
                                placeholder={notePlaceholder}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                required={requireNote}
                                minLength={requireNote ? 3 : undefined}
                            />
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant={confirmVariant}
                            disabled={
                                processing ||
                                (requireNote && note.trim().length < 3)
                            }
                        >
                            {processing ? 'Memproses…' : confirmLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
