import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import SignatureCapture from "@/components/SignatureCapture";
import { PenTool, FileSignature, Calendar, Type, CheckSquare, X, Save, Trash2, Plus, Star, User, Briefcase } from "lucide-react";
import { CHECK_STYLES, type CheckStyle } from "@/lib/checkStyles";
import { COMPANY_SEALS, companySealDataUrl } from "@/lib/companySeals";
import NextActionSelect from "@/components/NextActionSelect";

const SELF_SIGN_FIELD_TYPES = [
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "initials", label: "Initials", icon: FileSignature },
  { type: "full_name", label: "Full Name", icon: User },
  { type: "title", label: "Title", icon: Briefcase },
  { type: "date", label: "Date", icon: Calendar },
  { type: "text", label: "Text", icon: Type },
  { type: "checkmark", label: "Checkmark", icon: CheckSquare },
];

interface SavedSig {
  id: string;
  image_data: string;
  type: string;
  label: string | null;
}

interface FillSignSidebarProps {
  pendingFieldType: string | null;
  onFieldTypeClick: (type: string) => void;
  savedSignature: string | null;
  savedInitials: string | null;
  onSaveSignature: (data: string) => void;
  onSaveInitials: (data: string) => void;
  onDeleteSignature: () => void;
  onDeleteInitials: () => void;
  onSignAndSave: () => void;
  onCancel: () => void;
  signing: boolean;
  // Persisted signatures from DB
  allSavedSignatures: SavedSig[];
  allSavedInitials: SavedSig[];
  onPersistSignature: (data: string) => void;
  onPersistInitials: (data: string) => void;
  onDeleteSavedSig: (id: string) => void;
  // Text field callback
  onTextFieldRequest: () => void;
  /** Opens the placement dialog for Full Name or Title, prefilled from the account. */
  onIdentityField?: (type: "full_name" | "title") => void;
  accountFullName?: string;
  accountTitle?: string;
  accountDate?: string;
  checkStyle?: CheckStyle;
  onCheckStyle?: (style: CheckStyle) => void;
  onPlaceSeal?: (stampLabel: string) => void;
  onNext?: () => void;
  onAdvance?: (nextType: string) => void;
}

export default function FillSignSidebar({
  pendingFieldType,
  onFieldTypeClick,
  savedSignature,
  savedInitials,
  onSaveSignature,
  onSaveInitials,
  onDeleteSignature,
  onDeleteInitials,
  onSignAndSave,
  onCancel,
  signing,
  allSavedSignatures,
  allSavedInitials,
  onPersistSignature,
  onPersistInitials,
  onDeleteSavedSig,
  onTextFieldRequest,
  onIdentityField,
  accountFullName,
  accountTitle,
  accountDate,
  checkStyle,
  onCheckStyle,
  onPlaceSeal,
  onNext,
  onAdvance,
}: FillSignSidebarProps) {
  const [captureMode, setCaptureMode] = useState<"signature" | "initials" | null>(null);
  const [pickerMode, setPickerMode] = useState<"signature" | "initials" | null>(null);

  const handleFieldClick = (type: string) => {
    if (type === "signature") {
      // Show picker if saved sigs exist, otherwise open capture
      if (allSavedSignatures.length > 0 || savedSignature) {
        setPickerMode("signature");
      } else {
        setCaptureMode("signature");
      }
      return;
    }
    if (type === "initials") {
      if (allSavedInitials.length > 0 || savedInitials) {
        setPickerMode("initials");
      } else {
        setCaptureMode("initials");
      }
      return;
    }
    if (type === "full_name" || type === "title") {
      if (onIdentityField) onIdentityField(type);
      else onTextFieldRequest();
      return;
    }
    if (type === "text") {
      onTextFieldRequest();
      return;
    }
    // date, checkmark — place directly
    onFieldTypeClick(type);
  };

  const handlePickSaved = (sig: SavedSig) => {
    if (pickerMode === "signature") {
      onSaveSignature(sig.image_data);
    } else {
      onSaveInitials(sig.image_data);
    }
    setPickerMode(null);
    onFieldTypeClick(pickerMode!);
  };

  const handleCreateNewFromPicker = () => {
    const mode = pickerMode;
    setPickerMode(null);
    setCaptureMode(mode);
  };

  const handleCaptureSave = (data: string) => {
    if (captureMode === "signature") {
      onSaveSignature(data);
      onPersistSignature(data);
    } else {
      onSaveInitials(data);
      onPersistInitials(data);
    }
    setCaptureMode(null);
  };

  const pickerItems = pickerMode === "signature" ? allSavedSignatures : allSavedInitials;

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <PenTool className="h-4 w-4" /> Fill & Sign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Field type toolbar */}
          {(accountFullName || accountTitle || accountDate) && (
            <div className="rounded-md border border-border/60 bg-secondary/30 p-2 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Your details</p>
              <p className="text-xs"><span className="text-muted-foreground">Name: </span>{accountFullName || "Set your name in Settings"}</p>
              <p className="text-xs"><span className="text-muted-foreground">Title: </span>{accountTitle || "Set your title in Settings"}</p>
              <p className="text-xs"><span className="text-muted-foreground">Date: </span>{accountDate}</p>
              <p className="text-[10px] text-muted-foreground">Full Name, Title, Date, and Signature use these when you place them.</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Drag onto the PDF or click to place. Text wraps inside the field.</p>
            <div className="grid grid-cols-2 gap-2">
              {SELF_SIGN_FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant={pendingFieldType === type ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("fieldType", type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleFieldClick(type)}
                >
                  <Icon className="h-3 w-3" /> {label}
                </Button>
              ))}
            </div>
          </div>

          {onCheckStyle && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Check marks</p>
              <div className="flex flex-wrap gap-1">
                {CHECK_STYLES.map((style) => (
                  <Button
                    key={style.id}
                    variant={checkStyle === style.id ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title={style.label}
                    onClick={() => { onCheckStyle(style.id); onFieldTypeClick("checkmark"); }}
                  >
                    {style.glyph}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {onPlaceSeal && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Company seals</p>
              <div className="flex gap-2">
                {COMPANY_SEALS.map((seal) => (
                  <button
                    key={seal.id}
                    type="button"
                    title={seal.legalName}
                    className="rounded-full border border-border bg-card p-1 hover:ring-2 hover:ring-primary"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("fieldType", "seal");
                      e.dataTransfer.setData("sealLabel", seal.stampLabel);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onPlaceSeal(seal.stampLabel)}
                  >
                    <img src={companySealDataUrl(seal.id)} alt={`${seal.legalName} corporate seal`} className="h-12 w-12" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Signature management */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Signatures</p>

            {/* Signature */}
            {savedSignature ? (
              <div
                className="relative group border border-border rounded-lg p-2 bg-secondary/20 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("fieldType", "signature");
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <p className="text-[10px] text-muted-foreground mb-1">Signature</p>
                <img src={savedSignature} alt="Signature" className="h-10 object-contain pointer-events-none" />
                <button
                  onClick={onDeleteSignature}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => handleFieldClick("signature")}>
                <PenTool className="h-3 w-3" /> {allSavedSignatures.length > 0 ? "Choose Signature" : "Add Signature"}
              </Button>
            )}

            {/* Initials */}
            {savedInitials ? (
              <div
                className="relative group border border-border rounded-lg p-2 bg-secondary/20 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("fieldType", "initials");
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <p className="text-[10px] text-muted-foreground mb-1">Initials</p>
                <img src={savedInitials} alt="Initials" className="h-8 object-contain pointer-events-none" />
                <button
                  onClick={onDeleteInitials}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => handleFieldClick("initials")}>
                <FileSignature className="h-3 w-3" /> {allSavedInitials.length > 0 ? "Choose Initials" : "Add Initials"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {(onAdvance || onNext) && (
        <NextActionSelect
          onPick={(nextType) => {
            if (onAdvance) onAdvance(nextType);
            else if (nextType === "auto") onNext?.();
          }}
          label="Stick & next"
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={onSignAndSave} disabled={signing} className="flex-1 gap-1.5">
          <Save className="h-4 w-4" />
          {signing ? "Signing…" : "Sign & Save"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={signing}>
          Cancel
        </Button>
      </div>

      {/* Signature picker dialog */}
      <Dialog open={pickerMode !== null} onOpenChange={(open) => !open && setPickerMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {pickerMode === "signature" ? "Choose Signature" : "Choose Initials"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pickerItems.map((sig) => (
              <div
                key={sig.id}
                className="relative group flex items-center gap-3 border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handlePickSaved(sig)}
              >
                <img src={sig.image_data} alt={sig.label || sig.type} className="h-10 object-contain flex-1" />
                {(sig as any).is_default && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSavedSig(sig.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full gap-1.5" onClick={handleCreateNewFromPicker}>
              <Plus className="h-4 w-4" /> Create New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature capture dialog */}
      <Dialog open={captureMode !== null} onOpenChange={(open) => !open && setCaptureMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {captureMode === "signature" ? "Create Signature" : "Create Initials"}
            </DialogTitle>
          </DialogHeader>
          <SignatureCapture
            compact
            saveLabel={captureMode === "signature" ? "Save Signature" : "Save Initials"}
            onSave={handleCaptureSave}
            onCancel={() => setCaptureMode(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
