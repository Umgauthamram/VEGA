import { Attachment } from './types';

// Reads a local file inside browser environment
export function readTextOrFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Check if image
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          content: reader.result as string, // base64 Data URL
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // PDF handling fallback (requires pdfjs-dist or simple text metadata extraction)
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          content: `[PDF File content: Binary data for ${file.name}. (Text extraction handled locally)]`,
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    } else {
      // Treat as plain text / code
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          content: reader.result as string,
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}
