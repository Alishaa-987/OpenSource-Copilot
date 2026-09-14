import { BadRequestException, Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

// Keep the extracted text bounded before it ever reaches the LLM prompt -
// mirrors the same "cap what you send" fix already applied to the chat
// pipeline (ai-orchestration.service.ts) so a large resume can't blow up
// the outgoing Groq payload.
const MAX_EXTRACTED_TEXT_CHARS = 15_000;
const MIN_EXTRACTED_TEXT_CHARS = 40;

export type SupportedResumeFileType = 'pdf' | 'docx' | 'txt';

const EXTENSION_BY_MIME: Record<string, SupportedResumeFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

@Injectable()
export class ResumeTextExtractor {
  detectFileType(originalName: string, mimeType: string): SupportedResumeFileType {
    const byMime = EXTENSION_BY_MIME[mimeType];
    if (byMime) return byMime;
    const extension = originalName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (extension === 'docx') return 'docx';
    if (extension === 'txt') return 'txt';
    throw new BadRequestException('Resume must be a PDF, DOCX, or plain text file');
  }

  async extractText(buffer: Buffer, fileType: SupportedResumeFileType): Promise<string> {
    const raw = await this.extractRaw(buffer, fileType);
    const cleaned = raw.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (cleaned.length < MIN_EXTRACTED_TEXT_CHARS) {
      throw new BadRequestException('Could not extract readable text from this resume. Please upload a text-based PDF, DOCX, or .txt file.');
    }
    return cleaned.slice(0, MAX_EXTRACTED_TEXT_CHARS);
  }

  private async extractRaw(buffer: Buffer, fileType: SupportedResumeFileType): Promise<string> {
    if (fileType === 'txt') return buffer.toString('utf-8');
    if (fileType === 'pdf') {
      try {
        const parsed = await pdfParse(buffer);
        return parsed.text;
      } catch {
        throw new BadRequestException('Failed to read this PDF. It may be scanned/image-only or corrupted.');
      }
    }
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    } catch {
      throw new BadRequestException('Failed to read this DOCX file. It may be corrupted.');
    }
  }
}
