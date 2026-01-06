const LearningCopilotService = require('./LearningCopilotService');
const RAGService = require('./RAGService');
const GeminiAI = require('./geminiAI');
const LearningMemory = require('../models/LearningMemory');
const TopicMastery = require('../models/TopicMastery');
const LearningPlan = require('../models/LearningPlan');
const EvaluationService = require('./EvaluationService');

class LearningAgent {
    constructor() {
        this.copilot = new LearningCopilotService();
        this.gemini = new GeminiAI();
    }

    /**
     * The core Agentic loop: Think and Act based on user state
     * @param {string} userId 
     * @param {string} courseId 
     * @param {string} userMessage 
     */
    async processInteraction(userId, courseId, userMessage) {
        const startTime = Date.now();
        // 1. ANALYZE STATE (Reflection)
        const memory = await LearningMemory.findOne({ userId, courseId });
        const plan = await LearningPlan.findOne({ userId, courseId });
        const recentMastery = await TopicMastery.find({ userId, courseId }).sort({ updatedAt: -1 }).limit(5);

        const weakTopics = recentMastery.filter(m => m.classification === 'weak').map(m => m.topicName);

        // 2. RETRIEVE KNOWLEDGE
        const context = await RAGService.retrieveRelevantChunks(courseId, userMessage);
        const contextText = context.map(c => `[Source: ${c.source}] ${c.text}`).join('\n\n');

        // 3. THINK & GENERATE RESPONSE
        // We use Gemini to act as the agent's brain
        const userContext = {
            weakTopics,
            completedCount: memory?.completedTopics?.length || 0,
            lastTopic: memory?.currentTopics?.[0]?.topicName
        };

        const agentSystemPrompt = `
You are the Arivom Learning Agent. You are not just a chatbot; you are a personal mentor.
Your goal is to guide the student through their course by following this cycle: Plan -> Retrieve -> Quiz -> Evaluate -> Replan.

CURRENT STATE:
- User is studying Course ID: ${courseId}
- Weak Topics identified: ${weakTopics.join(', ') || 'None yet'}
- Progress: ${userContext.completedCount} topics completed.

RELEVANT MATERIAL SNIPPETS (RAG):
${contextText || 'No specific snippets found in the course materials.'}

INSTRUCTIONS:
1. If the user asks a question, answer it using the provided snippets. ALWAYS CITE THE SOURCE.
2. If the user seems to understand a topic, suggest a quick QUIZ.
3. If the user is struggling with a topic (one of the weak topics), give an extra clear explanation with examples.
4. Reflect on their past performance. Example: "Last week nee Signals la weak-aa irundha, let's focus on that." (Use Tamil-English mix if appropriate or English).
5. Suggest the NEXT STEP in their study roadmap.

RESPONSE FORMAT:
- A clear answer/explanation.
- Citation if material was used.
- Reflection on progress.
- Actionable next step (Study/Quiz/Review).
`;

        const reply = await this.gemini.generateCopilotReply(userMessage, userContext, { title: 'Course Content' }, { systemPrompt: agentSystemPrompt });

        // 4. ACT: Record interaction and check if we need to auto-adjust plan
        if (memory) {
            memory.copilotInteractions.push({
                type: 'agent-session',
                query: userMessage,
                response: reply.response,
                timestamp: new Date()
            });
            await memory.save();
        }

        const duration = Date.now() - startTime;
        await EvaluationService.logLatency('agent-interaction', duration);

        return {
            reply: reply.response,
            contextUsed: context.map(c => c.source),
            suggestedNextStep: this.determineNextAction(memory, plan, weakTopics)
        };
    }

    determineNextAction(memory, plan, weakTopics) {
        if (weakTopics.length > 0) {
            return `Review ${weakTopics[0]}`;
        }
        // Logic for next topic in plan...
        return "Continue current module";
    }

    /**
     * Auto-adjust plan based on performance (The "Replan" step)
     */
    async selfReflectAndReplan(userId, courseId) {
        const memory = await LearningMemory.findOne({ userId, courseId });
        const plan = await LearningPlan.findOne({ userId, courseId });

        if (!memory || !plan) return null;

        const weakTopics = await TopicMastery.find({ userId, courseId, classification: 'weak' });

        if (weakTopics.length > 0) {
            // REPLAN: Inject review tasks for weak topics into the next available week
            const nextWeekIndex = plan.weeks.findIndex(w => !w.status || w.status !== 'completed');
            if (nextWeekIndex !== -1) {
                const topicToReview = weakTopics[0].topicName;
                if (!plan.weeks[nextWeekIndex].tasks.includes(`Review: ${topicToReview}`)) {
                    plan.weeks[nextWeekIndex].tasks.push(`Review: ${topicToReview}`);
                    plan.weeks[nextWeekIndex].description += ` (Includes remedial focus on ${topicToReview})`;

                    memory.planAdjustments.push({
                        adjustmentDate: new Date(),
                        reason: 'weak-topic-repeat',
                        topicsAffected: [topicToReview],
                        automatedBy: 'copilot-recommendation'
                    });

                    await plan.save();
                    await memory.save();
                    return `I've adjusted your plan for Week ${plan.weeks[nextWeekIndex].weekNumber} to include a review of "${topicToReview}" based on your recent quiz results.`;
                }
            }
        }

        return "Your current plan looks solid. Keep it up!";
    }
}

module.exports = new LearningAgent();
