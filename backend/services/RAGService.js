const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Course = require('../models/Course');
require('dotenv').config();

class RAGService {
    constructor() {
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
        }
    }

    /**
     * Parse a PDF file and extract text
     * @param {string} filePath 
     * @returns {Promise<Object>}
     */
    async parsePDF(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);

            return {
                text: data.text,
                info: data.info,
                metadata: data.metadata,
                numPages: data.numpages
            };
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw error;
        }
    }

    /**
     * Chunk text into smaller segments for better retrieval
     * @param {string} text 
     * @param {number} chunkSize 
     * @returns {Array<string>}
     */
    chunkText(text, chunkSize = 1000) {
        const sentences = text.split(/[.!?]+/);
        const chunks = [];
        let currentChunk = "";

        for (const sentence of sentences) {
            if ((currentChunk.length + sentence.length) < chunkSize) {
                currentChunk += sentence + ". ";
            } else {
                chunks.push(currentChunk.trim());
                currentChunk = sentence + ". ";
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }

    /**
     * Add material to a course
     * @param {string} courseId 
     * @param {Object} fileData { path, originalname }
     */
    async addMaterialToCourse(courseId, fileData) {
        const { text, numPages } = await this.parsePDF(fileData.path);
        const chunkTexts = this.chunkText(text);

        const chunks = [];
        for (const chunkText of chunkTexts) {
            let embedding = [];
            if (this.embeddingModel) {
                try {
                    const result = await this.embeddingModel.embedContent(chunkText);
                    embedding = result.embedding.values;
                } catch (e) {
                    console.error('Embedding generation failed:', e);
                }
            }

            chunks.push({
                text: chunkText,
                pageNumber: 0, // Simplified
                section: 'General',
                embedding: embedding
            });
        }

        const material = {
            title: fileData.originalname,
            content: text,
            type: 'pdf',
            isProcessed: true,
            chunks: chunks
        };

        const course = await Course.findById(courseId);
        if (!course) throw new Error('Course not found');

        course.materials.push(material);
        await course.save();

        return material;
    }

    /**
     * Retrieve relevant chunks for a query
     * @param {string} courseId 
     * @param {string} query 
     * @param {number} topK 
     */
    async retrieveRelevantChunks(courseId, query, topK = 3) {
        const course = await Course.findById(courseId).select('materials');
        if (!course) return [];

        let queryEmbedding = null;
        if (this.embeddingModel) {
            try {
                const result = await this.embeddingModel.embedContent(query);
                queryEmbedding = result.embedding.values;
            } catch (e) {
                console.error('Query embedding failed:', e);
            }
        }

        const allChunks = [];
        course.materials.forEach(m => {
            m.chunks.forEach(c => {
                allChunks.push({
                    text: c.text,
                    source: m.title,
                    page: c.pageNumber,
                    embedding: c.embedding
                });
            });
        });

        if (queryEmbedding && allChunks.some(c => c.embedding && c.embedding.length > 0)) {
            // Vector similarity search
            const scoredChunks = allChunks.map(chunk => {
                if (!chunk.embedding || chunk.embedding.length === 0) return { ...chunk, score: 0 };

                // Cosine similarity
                let dotProduct = 0;
                let normA = 0;
                let normB = 0;
                for (let i = 0; i < queryEmbedding.length; i++) {
                    dotProduct += queryEmbedding[i] * chunk.embedding[i];
                    normA += queryEmbedding[i] * queryEmbedding[i];
                    normB += chunk.embedding[i] * chunk.embedding[i];
                }
                const score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                return { ...chunk, score };
            });

            return scoredChunks
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
        } else {
            // Fallback to keyword matching
            const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
            const scoredChunks = allChunks.map(chunk => {
                let score = 0;
                const chunkTextLower = chunk.text.toLowerCase();
                queryTerms.forEach(term => {
                    if (chunkTextLower.includes(term)) score++;
                });
                return { ...chunk, score };
            });

            return scoredChunks
                .filter(c => c.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
        }
    }
}

module.exports = new RAGService();
