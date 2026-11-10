import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { crmService } from '../services/crmService';
import { X, Upload, CheckCircle, AlertCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const downloadSample = () => {
    const sampleData = [
      {
        'Salutation': 'Mr.',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Account Name': 'Acme Corp',
        'Designation': 'Manager',
        'Department': 'Sales',
        'Email': 'john@acme.com',
        'Phone': '+1234567890',
        'Telephone': '+1987654321',
        'Industry': 'Technology',
        'Website': 'https://acme.com',
        'Flat / House No. / Building / Apartment Name': '123',
        'Street': 'Main St',
        'City': 'New York',
        'Pin Code': '10001',
        'Country': 'USA',
        'Latitude': '40.7128',
        'Longitude': '-74.0060'
      }
    ];
    crmService.exportToExcel(sampleData, 'CRM_Import_Sample', Object.keys(sampleData[0]));
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setProgress({ current: 0, total: jsonData.length });
        const importResult = await crmService.importContacts(jsonData, (current, total) => {
          setProgress({ current, total });
        });
        setResult(importResult);
        setIsImporting(false);
        if (importResult.success > 0) {
          onSuccess();
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      setResult({ success: 0, errors: ['Failed to read Excel file.'] });
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-crm-card-light dark:bg-crm-card-dark rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800/50"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <Upload className="w-5 h-5 text-blue-600" />
            Import Contacts & Accounts
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {!result ? (
            <>
              <div className="flex items-center justify-between p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-black text-blue-900 dark:text-blue-400 text-sm uppercase tracking-widest">Need a template?</p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-500 font-bold uppercase tracking-widest">Download sample Excel sheet</p>
                  </div>
                </div>
                <button 
                  onClick={downloadSample}
                  className="bg-white dark:bg-slate-800 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Sample
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[24px] p-10 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer relative group bg-slate-50/30 dark:bg-slate-800/20">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-sm">
                    <Upload className="w-7 h-7 text-blue-600" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Excel (.xlsx, .xls) or CSV files</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black mb-3 uppercase tracking-[0.2em]">Required Columns:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'First Name', 'Last Name', 'Account Name', 'Designation', 
                    'Email', 'Phone', 'Telephone', 'Department',
                    'Flat / House No. / Building / Apartment Name', 'Street', 'City', 'Pin Code', 'Country'
                  ].map(col => (
                    <span key={col} className="bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg text-[9px] font-black text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase tracking-widest">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  disabled={!file || isImporting}
                  onClick={handleImport}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  {isImporting ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Importing {progress.current} / {progress.total}...</span>
                      </div>
                      <div className="w-full h-2 bg-blue-200/30 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-white"
                          initial={{ width: 0 }}
                          animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    'Start Import'
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <p className="font-black text-green-900 dark:text-green-400 uppercase tracking-widest">Import Complete</p>
                  <p className="text-xs text-green-700 dark:text-green-500 font-bold uppercase tracking-widest">{result.success} records processed successfully.</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-[10px] font-black text-red-900 dark:text-red-400 uppercase tracking-[0.2em]">Errors Encountered:</p>
                  </div>
                  <ul className="text-[11px] text-red-700 dark:text-red-500 space-y-2 font-medium">
                    {result.errors.map((err, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="opacity-50">•</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-lg shadow-slate-900/10 dark:shadow-white/10"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ImportModal;
