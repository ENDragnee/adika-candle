// Shared browser-download trigger for ToCsv's string output (ToPdf
// downloads itself via jsPDF's own `.save()`, which does the same thing
// internally). A plain, immediately-removed <a download> — the standard
// no-dependency way to save a client-generated file.
export function DownloadBlob(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
