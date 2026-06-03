"use client";

import {
  ChangeEvent,
  ClipboardEventHandler,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FileUIPart, SourceDocumentUIPart } from "ai";
import { nanoid } from "nanoid";
import { cn } from "@/lib/utils";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";

import {
  convertBlobUrlToDataUrl,
  inferMediaType,
  fileToDataUrl
} from "./utils";

import {
  PromptInputControllerProps,
  useOptionalPromptInputController,
  LocalAttachmentsContext,
  LocalReferencedSourcesContext,
  AttachmentsContext,
  ReferencedSourcesContext,
  usePromptInputAttachments
} from "./context";

export * from "./context";
export * from "./parts";
export * from "./utils";

export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => void | Promise<void>;
};

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller.attachments.files : items;

  const [referencedSources, setReferencedSources] = useState<(SourceDocumentUIPart & { id: string })[]>([]);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const openFileDialogLocal = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = useCallback(
    (f: File) => {
      if (!accept || accept.trim() === "") return true;
      const patterns = accept.split(",").map((s) => s.trim()).filter(Boolean);
      return patterns.some((pattern) => {
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -1);
          return f.type.startsWith(prefix);
        }
        return f.type === pattern;
      });
    },
    [accept]
  );

  const addLocal = useCallback(
    async (fileList: File[] | FileList) => {
      const incoming = [...fileList];
      const accepted = incoming.filter((f) => matchesAccept(f));
      if (incoming.length && accepted.length === 0) {
        onError?.({ code: "accept", message: "No files match the accepted types." });
        return;
      }
      const withinSize = (f: File) => maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: "max_file_size", message: "All files exceed the maximum size." });
        return;
      }

      const newAttachments = await Promise.all(
        sized.map(async (file) => ({
          filename: file.name,
          id: nanoid(),
          mediaType: inferMediaType(file.name, file.type),
          type: "file" as const,
          url: await fileToDataUrl(file),
        }))
      );

      setItems((prev) => {
        const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - prev.length) : undefined;
        const capped = typeof capacity === "number" ? newAttachments.slice(0, capacity) : newAttachments;
        if (typeof capacity === "number" && sized.length > capacity) {
          onError?.({ code: "max_files", message: "Too many files. Some were not added." });
        }
        return [...prev, ...capped];
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError]
  );

  const removeLocal = useCallback((id: string) => setItems((prev) => prev.filter((file) => file.id !== id)), []);

  const addWithProviderValidation = useCallback(
    async (fileList: File[] | FileList) => {
      const incoming = [...fileList];
      const accepted = incoming.filter((f) => matchesAccept(f));
      if (incoming.length && accepted.length === 0) {
        onError?.({ code: "accept", message: "No files match the accepted types." });
        return;
      }
      const withinSize = (f: File) => maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: "max_file_size", message: "All files exceed the maximum size." });
        return;
      }

      const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - files.length) : undefined;
      const capped = typeof capacity === "number" ? sized.slice(0, capacity) : sized;
      if (typeof capacity === "number" && sized.length > capacity) {
        onError?.({ code: "max_files", message: "Too many files. Some were not added." });
      }

      if (capped.length > 0) {
        await controller?.attachments.add(capped);
      }
    },
    [matchesAccept, maxFileSize, maxFiles, onError, files.length, controller]
  );

  const clearAttachments = useCallback(() => usingProvider ? controller?.attachments.clear() : setItems([]), [usingProvider, controller]);
  const clearReferencedSources = useCallback(() => setReferencedSources([]), []);
  const add = usingProvider ? addWithProviderValidation : addLocal;
  const remove = usingProvider ? controller.attachments.remove : removeLocal;
  const openFileDialog = usingProvider ? controller.attachments.openFileDialog : openFileDialogLocal;

  const clear = useCallback(() => {
    clearAttachments();
    clearReferencedSources();
  }, [clearAttachments, clearReferencedSources]);

  useEffect(() => {
    if (!usingProvider) return;
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = "";
    }
  }, [files, syncHiddenInput]);

  useEffect(() => {
    const form = formRef.current;
    if (!form || globalDrop) return;

    const onDragOver = (e: DragEvent) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) add(e.dataTransfer.files);
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  useEffect(() => {
    if (!globalDrop) return;
    const onDragOver = (e: DragEvent) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) add(e.dataTransfer.files);
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  useEffect(() => () => {
    if (!usingProvider) {
      for (const f of filesRef.current) { if (f.url) URL.revokeObjectURL(f.url); }
    }
  }, [usingProvider]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) add(event.currentTarget.files);
    event.currentTarget.value = "";
  }, [add]);

  const attachmentsCtx = useMemo<AttachmentsContext>(() => ({
    add, clear: clearAttachments, fileInputRef: inputRef,
    files: files.map((item) => ({ ...item, id: item.id })),
    openFileDialog, remove,
  }), [files, add, remove, clearAttachments, openFileDialog]);

  const refsCtx = useMemo<ReferencedSourcesContext>(() => ({
    add: (incoming) => {
      const array = Array.isArray(incoming) ? incoming : [incoming];
      setReferencedSources((prev) => [...prev, ...array.map((s) => ({ ...s, id: nanoid() }))]);
    },
    clear: clearReferencedSources,
    remove: (id: string) => setReferencedSources((prev) => prev.filter((s) => s.id !== id)),
    sources: referencedSources,
  }), [referencedSources, clearReferencedSources]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const text = usingProvider ? controller.textInput.value : (() => {
        const formData = new FormData(form);
        return (formData.get("message") as string) || "";
      })();

      if (!usingProvider) form.reset();

      try {
        const convertedFiles: FileUIPart[] = await Promise.all(
          files.map(async ({ id: _id, ...item }) => {
            if (item.url?.startsWith("blob:")) {
              const dataUrl = await convertBlobUrlToDataUrl(item.url);
              return { ...item, url: dataUrl ?? item.url };
            }
            return item;
          })
        );

        const result = onSubmit({ files: convertedFiles, text }, event);
        if (result instanceof Promise) {
          try { await result; clear(); if (usingProvider) controller.textInput.clear(); } catch { }
        } else {
          clear(); if (usingProvider) controller.textInput.clear();
        }
      } catch { }
    },
    [usingProvider, controller, files, onSubmit, clear]
  );

  const inner = (
    <>
      <input accept={accept} aria-label="Upload files" className="hidden" multiple={multiple} onChange={handleChange} ref={inputRef} title="Upload files" type="file" />
      <form className={cn("w-full", className)} onSubmit={handleSubmit} ref={formRef} {...props}>
        <InputGroup className="overflow-hidden">{children}</InputGroup>
      </form>
    </>
  );

  return (
    <LocalAttachmentsContext.Provider value={attachmentsCtx}>
      <LocalReferencedSourcesContext.Provider value={refsCtx}>
        {inner}
      </LocalReferencedSourcesContext.Provider>
    </LocalAttachmentsContext.Provider>
  );
};

export const PromptInputTextarea = ({ onChange, onKeyDown, className, placeholder = "What would you like to know?", ...props }: ComponentProps<typeof InputGroupTextarea>) => {
  const controller = useOptionalPromptInputController();
  const attachments = usePromptInputAttachments();
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === "Enter") {
        if (isComposing || e.nativeEvent.isComposing || e.shiftKey) return;
        e.preventDefault();
        const { form } = e.currentTarget;
        const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (submitButton?.disabled) return;
        form?.requestSubmit();
      }
      if (e.key === "Backspace" && e.currentTarget.value === "" && attachments.files.length > 0) {
        e.preventDefault();
        const lastAttachment = attachments.files.at(-1);
        if (lastAttachment) attachments.remove(lastAttachment.id);
      }
    },
    [onKeyDown, isComposing, attachments]
  );

  const handlePaste = useCallback((event: any) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) { if (item.kind === "file") { const file = item.getAsFile(); if (file) files.push(file); } }
    if (files.length > 0) { event.preventDefault(); attachments.add(files); }
  }, [attachments]);

  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);
  const handleCompositionStart = useCallback(() => setIsComposing(true), []);

  const controlledProps = controller
    ? { onChange: (e: any) => { controller.textInput.setInput(e.currentTarget.value); onChange?.(e); }, value: controller.textInput.value }
    : { onChange };

  return (
    <InputGroupTextarea
      className={cn("field-sizing-content max-h-48 min-h-16", className)}
      name="message"
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      {...controlledProps}
    />
  );
};
