import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, ChevronRight, ChevronLeft, RefreshCw, Award, BookOpen, AlertCircle } from 'lucide-react';

interface Question {
    questionId: string;
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface AdaptiveQuizProps {
    courseId: string;
    topicName: string;
    onComplete?: (score: number) => void;
}

const AdaptiveQuizRenderer: React.FC<AdaptiveQuizProps> = ({ courseId, topicName, onComplete }) => {
    const [quiz, setQuiz] = useState<any>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        generateQuiz();
    }, [courseId, topicName]);

    const generateQuiz = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                'http://localhost:5001/api/learning/adaptive-quiz/generate',
                { courseId, topicName },
                { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
            );
            if (response.data.success) {
                setQuiz(response.data.quiz);
            } else {
                setError('Failed to generate quiz questions.');
            }
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            setError(err.response?.data?.message || 'Error connecting to the quiz service.');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (optionIndex: number) => {
        if (showResults) return;
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestionIndex]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = async () => {
        if (Object.keys(selectedAnswers).length < quiz.questions.length) {
            if (!window.confirm('You haven\'t answered all questions. Submit anyway?')) return;
        }

        setSubmitting(true);
        try {
            const answers = quiz.questions.map((q: Question, index: number) => ({
                questionId: q.questionId,
                selectedAnswerIndex: selectedAnswers[index],
                isCorrect: selectedAnswers[index] === q.correctAnswerIndex
            }));

            const response = await axios.post(
                `http://localhost:5001/api/learning/adaptive-quiz/${quiz._id}/submit`,
                { answers },
                { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
            );

            if (response.data.success) {
                setShowResults(true);
                if (onComplete) onComplete(response.data.percentageScore);
            }
        } catch (err) {
            console.error('Quiz submission error:', err);
            alert('Failed to submit quiz results.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-xl border border-gray-100">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">AI is crafting your personalized adaptive quiz...</p>
                <p className="text-xs text-gray-400 mt-2 italic">Based on your mastery of {topicName}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-800 mb-2">Oops! Something went wrong</h3>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                    onClick={generateQuiz}
                    className="px-6 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!quiz) return null;

    if (showResults) {
        const score = quiz.userAttempts?.[quiz.userAttempts.length - 1]?.percentageScore || 0;
        const isPass = score >= 70;

        return (
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className={`p-8 text-center ${isPass ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                    <Award className="w-20 h-20 mx-auto mb-4 opacity-90" />
                    <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                    <p className="text-5xl font-black mb-4">{score}%</p>
                    <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-semibold backdrop-blur-md">
                        {isPass ? 'Mastery Increasing 📈' : 'Needs Review 📖'}
                    </div>
                </div>

                <div className="p-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Feedback</h3>
                    <div className="space-y-6">
                        {quiz.questions.map((q: Question, idx: number) => {
                            const userAnswer = selectedAnswers[idx];
                            const isCorrect = userAnswer === q.correctAnswerIndex;
                            return (
                                <div key={idx} className={`p-4 rounded-2xl border ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                                    <div className="flex items-start gap-3">
                                        {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />}
                                        <div>
                                            <p className="font-semibold text-gray-800 mb-2">{idx + 1}. {q.questionText}</p>
                                            <p className="text-sm text-gray-600 mb-2">
                                                Your answer: <span className={isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{q.options[userAnswer] || 'Not answered'}</span>
                                            </p>
                                            {!isCorrect && (
                                                <p className="text-sm text-gray-600 mb-2">
                                                    Correct answer: <span className="text-green-700 font-medium font-bold">{q.options[q.correctAnswerIndex]}</span>
                                                </p>
                                            )}
                                            <div className="mt-2 p-3 bg-white/50 rounded-xl text-xs text-gray-500 italic border border-gray-100">
                                                {q.explanation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button
                            onClick={generateQuiz}
                            className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" /> Retake Another Adaptive Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Adaptive Topic Quiz</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">
                        {currentQuestion.difficulty.toUpperCase()} LEVEL
                    </span>
                </div>
                <h2 className="text-2xl font-bold">{topicName}</h2>
                <div className="mt-6 w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                        className="bg-white h-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    />
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-bold opacity-70">
                    <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}% Complete</span>
                </div>
            </div>

            <div className="p-8">
                <div className="min-h-[120px] mb-8">
                    <h3 className="text-xl font-bold text-gray-800 leading-relaxed">
                        {currentQuestion.questionText}
                    </h3>
                </div>

                <div className="space-y-4 mb-10">
                    {currentQuestion.options.map((option: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${selectedAnswers[currentQuestionIndex] === idx
                                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                                    : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-white'
                                }`}
                        >
                            <span className={`text-sm font-medium ${selectedAnswers[currentQuestionIndex] === idx ? 'text-blue-700' : 'text-gray-700'}`}>
                                {option}
                            </span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedAnswers[currentQuestionIndex] === idx
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300 group-hover:border-blue-400'
                                }`}>
                                {selectedAnswers[currentQuestionIndex] === idx && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 text-gray-500 font-bold disabled:opacity-30"
                    >
                        <ChevronLeft className="w-5 h-5" /> Prev
                    </button>

                    {currentQuestionIndex === quiz.questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Finish Quiz'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
                        >
                            Next <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdaptiveQuizRenderer;
