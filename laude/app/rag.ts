import { ollamaClient } from './ollama';
import { ProjectFile, DocumentChunk } from './types';
import { saveProjectFile, saveDocumentChunks, loadDocumentChunks } from './storage';

// Split text into overlapping chunks
export function chunkText(text: string, chunkSize: number = 800, chunkOverlap: number = 150): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
}

// Compute cosine similarity between two vectors
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ingests file: chunks, embeds via Ollama nomic-embed-text, and stores
export async function ingestProjectFile(
  projectId: string,
  fileName: string,
  content: string,
  embedModel: string = 'nomic-embed-text'
): Promise<void> {
  const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(4);
  const size = new Blob([content]).size;

  const fileObj: ProjectFile = {
    id: fileId,
    project_id: projectId,
    name: fileName,
    content,
    size,
  };

  await saveProjectFile(fileObj);

  const textChunks = chunkText(content);
  const chunksToSave: DocumentChunk[] = [];

  for (let i = 0; i < textChunks.length; i++) {
    const txt = textChunks[i];
    const embedding = await ollamaClient.generateEmbedding(embedModel, txt);
    chunksToSave.push({
      id: `chunk_${fileId}_${i}`,
      project_id: projectId,
      file_id: fileId,
      content: txt,
      embedding,
    });
  }

  await saveDocumentChunks(chunksToSave);
}

// Query top-K chunks using local cosine similarity
export async function queryRelevantChunks(
  projectId: string,
  query: string,
  embedModel: string = 'nomic-embed-text',
  topK: number = 3
): Promise<string[]> {
  const queryEmbedding = await ollamaClient.generateEmbedding(embedModel, query);
  const allChunks = await loadDocumentChunks(projectId);

  const scoredChunks = allChunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return { chunk, score };
  });

  // Sort descending by similarity score
  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, topK).map((sc) => sc.chunk.content);
}
