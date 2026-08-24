import { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  FileImage,
  CheckCircle,
} from "lucide-react";

import Card from "../common/Card";
import Button from "../common/Button";
import { classNames } from "../../utils/formatters";

export default function UploadCard({ onUpload }) {
  const inputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  function handleFiles(files) {
  if (!files?.length) return;

  const selected = files[0];

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  if (!allowedTypes.includes(selected.type)) {
    alert("Only JPG, JPEG and PNG images are allowed.");
    return;
  }

  if (selected.size > 10 * 1024 * 1024) {
    alert("Maximum file size is 10 MB.");
    return;
  }

  setFile(selected);
  setPreview(URL.createObjectURL(selected));
}
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleSubmit() {
    if (!file) return;

    setUploading(true);

    try {
      await onUpload(file);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setPreview(null);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }
  function handleReset() {
  if (preview) {
    URL.revokeObjectURL(preview);
  }

  setFile(null);
  setPreview(null);

  if (inputRef.current) {
    inputRef.current.value = "";
  }
}

  return (
    <Card className="p-6">

      {/* Header */}

      <div className="mb-6">

        <h2 className="text-2xl font-bold text-white">
          Upload Product Image
        </h2>

        <p className="mt-1 text-slate-300">
          Select an image to inspect using VisionInspect AI.
        </p>

      </div>

      {/* Upload Area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={classNames(
          "rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300",
          dragActive
            ? "border-cyan-400 bg-slate-700"
            : "border-slate-600 bg-slate-800 hover:border-cyan-400 hover:bg-slate-700"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <UploadCloud
          size={60}
          className="mx-auto text-cyan-400 mb-5"
        />

        <h3 className="text-2xl font-bold text-white">
          Drag & Drop Image
        </h3>

        <p className="mt-3 text-slate-300">
          or click here to browse
        </p>

        <p className="mt-5 text-sm text-slate-400">
          Supported Formats: JPG • JPEG • PNG
        </p>
      </div>
      {/* Preview */}

      {preview && (

        <div className="mt-8">

          <h3 className="font-semibold mb-4">
            Image Preview
          </h3>

          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-80 object-contain rounded-lg border"
          />

        </div>

      )}

      {/* File Information */}

      {file && (

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-5">

          <h3 className="mb-5 text-xl font-bold text-white">
            File Information
          </h3>

          <div className="space-y-4">

            <div className="flex items-center gap-3">

              <FileImage
                size={22}
                className="text-cyan-400"
              />

              <span className="break-all text-slate-200">
                {file.name}
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-slate-400">
                Size
              </span>

              <span className="font-semibold text-white">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-slate-400">
                Type
              </span>

              <span className="font-semibold text-white">
                {file.type}
              </span>

            </div>

            <div className="flex items-center gap-2 text-green-400">

              <CheckCircle size={20} />

              <span>
                Ready for Inspection
              </span>

            </div>

          </div>

        </div>
      )}

      {/* Loading */}

      {uploading && (

        <div className="mt-6">

          <p className="font-medium text-cyan-700 mb-2">
            Analyzing Image...
          </p>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">

            <div className="h-full w-full bg-cyan-600 animate-pulse"></div>

          </div>

        </div>

      )}

      {/* Button */}

      <div className="mt-8 flex gap-4">

        <button
          onClick={handleReset}
          disabled={!file || uploading}
          className="flex-1 rounded-xl border border-slate-600 bg-slate-700 py-3 font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
        >
          Reset
        </button>

        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="flex-1 rounded-xl bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:bg-slate-600"
        >
          {uploading ? "Analyzing..." : "Analyze Image"}
        </button>

      </div>

    </Card>
  );
}