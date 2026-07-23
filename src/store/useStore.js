import { create } from 'zustand';

const generateId = () => Math.random().toString(36).slice(2, 10);
const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const useStore = create((set, get) => ({
  documents: [],
  selectedDocIds: [],
  activityLog: [],

  fetchDocuments: async () => {
    try {
      const res = await fetch(`${API}/documents`);
      if (res.ok) {
        const data = await res.json();
        set({ documents: data });
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  },

  addDocuments: (files) => {
    const newDocs = files.map((file) => ({
      // defaults — all can be overridden by the caller
      id: generateId(),
      filename: file.name || file.filename || 'unknown-file',
      uploadDate: new Date().toISOString(),
      status: 'queued',
      recordCount: 0,
      processingTime: null,
      fileSize: file.size ?? file.fileSize ?? null,
      type: 'Admission Form',
      syncStatus: 'pending',
      extractedData: {},
      progress: 0,
      // spread the full passed object so callers can override any field
      ...file,
    }));
    set((state) => ({ documents: [...newDocs, ...state.documents] }));
  },

  updateDocumentField: (docId, field, value) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              extractedData: {
                ...d.extractedData,
                [field]: { ...d.extractedData[field], value, manuallyEdited: true },
              },
              syncStatus: 'pending',
            }
          : d
      ),
    }));
  },

  deleteDocuments: (ids) => {
    set((state) => ({
      documents: state.documents.filter((d) => !ids.includes(d.id)),
      selectedDocIds: state.selectedDocIds.filter((id) => !ids.includes(id)),
    }));
  },

  toggleSelectDoc: (id) => {
    set((state) => ({
      selectedDocIds: state.selectedDocIds.includes(id)
        ? state.selectedDocIds.filter((i) => i !== id)
        : [...state.selectedDocIds, id],
    }));
  },

  selectAllDocs: (ids) => set({ selectedDocIds: ids }),
  clearSelection: () => set({ selectedDocIds: [] }),
}));
