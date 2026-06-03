"use client";

import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect, ReactNode, RefObject, PropsWithChildren } from "react";
import type { FileUIPart, SourceDocumentUIPart } from "ai";
import { nanoid } from "nanoid";
import { inferMediaType, fileToDataUrl } from "./utils";

export interface AttachmentsContext {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface TextInputContext {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
}

export interface PromptInputControllerProps {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  __registerFileInput: (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void
  ) => void;
}

export const PromptInputController = createContext<PromptInputControllerProps | null>(null);
export const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error("Wrap your component inside <PromptInputProvider> to use usePromptInputController().");
  }
  return ctx;
};

export const useOptionalPromptInputController = () => useContext(PromptInputController);

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error("Wrap your component inside <PromptInputProvider> to use useProviderAttachments().");
  }
  return ctx;
};

export const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = local ?? provider;
  if (!context) {
    throw new Error("usePromptInputAttachments must be used within a PromptInput or PromptInputProvider");
  }
  return context;
};

export interface ReferencedSourcesContext {
  sources: (SourceDocumentUIPart & { id: string })[];
  add: (sources: SourceDocumentUIPart[] | SourceDocumentUIPart) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const LocalReferencedSourcesContext = createContext<ReferencedSourcesContext | null>(null);

export const usePromptInputReferencedSources = () => {
  const ctx = useContext(LocalReferencedSourcesContext);
  if (!ctx) {
    throw new Error("usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider");
  }
  return ctx;
};

export const PromptInputProvider = ({
  initialInput: initialTextInput = "",
  children,
}: PropsWithChildren<{ initialInput?: string }>) => {
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = useCallback(() => setTextInput(""), []);

  const [attachmentFiles, setAttachmentFiles] = useState<(FileUIPart & { id: string })[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef<() => void>(() => { });

  const add = useCallback(async (files: File[] | FileList) => {
    const incoming = [...files];
    if (incoming.length === 0) return;

    const newAttachments = await Promise.all(
      incoming.map(async (file) => ({
        filename: file.name,
        id: nanoid(),
        mediaType: inferMediaType(file.name, file.type),
        type: "file" as const,
        url: await fileToDataUrl(file),
      }))
    );

    setAttachmentFiles((prev) => [...prev, ...newAttachments]);
  }, []);

  const remove = useCallback((id: string) => {
    setAttachmentFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => {
    setAttachmentFiles((prev) => {
      for (const f of prev) {
        if (f.url) URL.revokeObjectURL(f.url);
      }
      return [];
    });
  }, []);

  const attachmentsRef = useRef(attachmentFiles);
  useEffect(() => {
    attachmentsRef.current = attachmentFiles;
  }, [attachmentFiles]);

  useEffect(() => () => {
    for (const f of attachmentsRef.current) {
      if (f.url) URL.revokeObjectURL(f.url);
    }
  }, []);

  const openFileDialog = useCallback(() => {
    openRef.current?.();
  }, []);

  const attachments = useMemo<AttachmentsContext>(
    () => ({
      add,
      clear,
      fileInputRef,
      files: attachmentFiles,
      openFileDialog,
      remove,
    }),
    [attachmentFiles, add, remove, clear, openFileDialog]
  );

  const __registerFileInput = useCallback(
    (ref: RefObject<HTMLInputElement | null>, open: () => void) => {
      fileInputRef.current = ref.current;
      openRef.current = open;
    },
    []
  );

  const controller = useMemo<PromptInputControllerProps>(
    () => ({
      __registerFileInput,
      attachments,
      textInput: {
        clear: clearInput,
        setInput: setTextInput,
        value: textInput,
      },
    }),
    [textInput, clearInput, attachments, __registerFileInput]
  );

  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>
        {children}
      </ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
};
