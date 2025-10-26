/**
 * ELI5 (Explain Like I'm Five) Onboarding Agent
 * Provides simple explanations of DeFi concepts using analogies
 * Helps onboard users with educational responses
 */

import { logger } from '../utils/logger.js';
import defiGlossary from '../knowledge/defi-glossary.json' assert { type: 'json' };

interface EducationalResponse {
  explanation: string;
  analogy: string;
  example: string;
  riskLevel: string;
  relatedTerms: string[];
  followUpQuestions: string[];
}

interface LearningProgress {
  phoneNumber: string;
  completedLessons: string[];
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  lastLessonDate: Date;
  quizScores: { [lesson: string]: number };
}

export class ELI5OnboardingAgent {
  private static instance: ELI5OnboardingAgent;

  static getInstance(): ELI5OnboardingAgent {
    if (!ELI5OnboardingAgent.instance) {
      ELI5OnboardingAgent.instance = new ELI5OnboardingAgent();
    }
    return ELI5OnboardingAgent.instance;
  }

  /**
   * Get educational response for a DeFi term
   */
  async explainTerm(query: string, phoneNumber: string): Promise<EducationalResponse> {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Find matching term in glossary
      for (const [term, data] of Object.entries(defiGlossary.defi_terms)) {
        const termLower = term.replace('_', ' ');
        if (lowerQuery.includes(termLower) || lowerQuery.includes(term)) {
          const termData = data as any;
          
          const response: EducationalResponse = {
            explanation: termData.simple_explanation,
            analogy: termData.analogy,
            example: termData.example,
            riskLevel: termData.risk_level,
            relatedTerms: termData.related_terms || [],
            followUpQuestions: this.generateFollowUpQuestions(term)
          };
          
          logger.info({ phoneNumber, term, query }, 'Educational response generated');
          return response;
        }
      }
      
      // Handle common questions
      const commonResponse = this.handleCommonQuestions(lowerQuery);
      if (commonResponse) {
        return commonResponse;
      }
      
      // Default response for unknown terms
      return {
        explanation: "I don't know that term yet, but I'm learning!",
        analogy: "Like asking about a new word you've never heard before.",
        example: "Try asking about: yield farming, staking, DeFi, smart contracts, or wallets.",
        riskLevel: "unknown",
        relatedTerms: ["yield_farming", "staking", "defi"],
        followUpQuestions: [
          "What is yield farming?",
          "What is staking?",
          "What is DeFi?"
        ]
      };
    } catch (error) {
      logger.error({ err: error, query, phoneNumber }, 'Error explaining term');
      return {
        explanation: "Sorry, I had trouble explaining that. Please try again!",
        analogy: "Like when your teacher needs a moment to think.",
        example: "Try asking about DeFi basics.",
        riskLevel: "unknown",
        relatedTerms: [],
        followUpQuestions: []
      };
    }
  }

  /**
   * Generate follow-up questions for a term
   */
  private generateFollowUpQuestions(term: string): string[] {
    const followUpMap: { [key: string]: string[] } = {
      'yield_farming': [
        "How do I start yield farming?",
        "What are the risks of yield farming?",
        "Which protocols are safest for yield farming?"
      ],
      'staking': [
        "How long do I need to stake?",
        "Can I unstake anytime?",
        "What rewards do I get from staking?"
      ],
      'defi': [
        "How is DeFi different from regular banking?",
        "What can I do with DeFi?",
        "Is DeFi safe for beginners?"
      ],
      'smart_contract': [
        "How do smart contracts work?",
        "Can smart contracts be hacked?",
        "Who controls smart contracts?"
      ],
      'wallet': [
        "How do I create a wallet?",
        "What's the difference between wallet types?",
        "How do I keep my wallet safe?"
      ]
    };
    
    return followUpMap[term] || [
      "Can you give me an example?",
      "How do I use this?",
      "What should I be careful about?"
    ];
  }

  /**
   * Handle common questions
   */
  private handleCommonQuestions(query: string): EducationalResponse | null {
    const commonQuestions = defiGlossary.common_questions;
    
    if (query.includes('how to start') || query.includes('how do i begin')) {
      return {
        explanation: commonQuestions.how_to_start.answer,
        analogy: "Like learning to ride a bike - start with training wheels!",
        example: "Begin with small PYUSD transfers to friends.",
        riskLevel: "low",
        relatedTerms: ["wallet", "transaction"],
        followUpQuestions: [
          "How do I send PYUSD?",
          "How do I check my balance?",
          "What is a wallet?"
        ]
      };
    }
    
    if (query.includes('is it safe') || query.includes('safe')) {
      return {
        explanation: commonQuestions.is_it_safe.answer,
        analogy: "Like crossing the street - safe if you look both ways!",
        example: "Start with small amounts and trusted protocols.",
        riskLevel: "medium",
        relatedTerms: ["security", "risk"],
        followUpQuestions: [
          "How do I identify safe protocols?",
          "What are the warning signs?",
          "How do I protect my money?"
        ]
      };
    }
    
    if (query.includes('how to earn') || query.includes('make money')) {
      return {
        explanation: commonQuestions.how_to_earn.answer,
        analogy: "Like putting money in a savings account that pays interest!",
        example: "Put 100 PYUSD in yield farming, earn 5 PYUSD per month.",
        riskLevel: "medium",
        relatedTerms: ["yield_farming", "staking"],
        followUpQuestions: [
          "What is yield farming?",
          "What is staking?",
          "How much can I earn?"
        ]
      };
    }
    
    return null;
  }

  /**
   * Create a learning path for new users
   */
  async createLearningPath(phoneNumber: string): Promise<string[]> {
    const learningPath = [
      "What is DeFi?",
      "What is a wallet?",
      "What is PYUSD?",
      "How do I send money?",
      "What is yield farming?",
      "What is staking?",
      "How do I stay safe?",
      "What are smart contracts?"
    ];
    
    logger.info({ phoneNumber }, 'Learning path created');
    return learningPath;
  }

  /**
   * Get next lesson recommendation
   */
  async getNextLesson(phoneNumber: string, completedLessons: string[]): Promise<string> {
    const allLessons = [
      "What is DeFi?",
      "What is a wallet?",
      "What is PYUSD?",
      "How do I send money?",
      "What is yield farming?",
      "What is staking?",
      "How do I stay safe?",
      "What are smart contracts?"
    ];
    
    const remainingLessons = allLessons.filter(lesson => 
      !completedLessons.includes(lesson)
    );
    
    return remainingLessons[0] || "You've completed all lessons! Try advanced topics.";
  }

  /**
   * Generate quiz questions for a term
   */
  async generateQuiz(term: string): Promise<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[]> {
    const quizMap: { [key: string]: any[] } = {
      'yield_farming': [
        {
          question: "What is yield farming like?",
          options: ["A savings account", "A lottery ticket", "A piggy bank", "A credit card"],
          correctAnswer: 0,
          explanation: "Yield farming is like putting money in a high-interest savings account!"
        },
        {
          question: "What do you earn from yield farming?",
          options: ["Nothing", "Interest", "Lottery tickets", "Free food"],
          correctAnswer: 1,
          explanation: "You earn interest on your money, just like a savings account!"
        }
      ],
      'staking': [
        {
          question: "What happens when you stake crypto?",
          options: ["It disappears", "It's locked for rewards", "It becomes worthless", "It doubles instantly"],
          correctAnswer: 1,
          explanation: "Staking locks your crypto to earn rewards, like a fixed deposit!"
        }
      ],
      'defi': [
        {
          question: "What does DeFi stand for?",
          options: ["Digital Finance", "Decentralized Finance", "Direct Finance", "Daily Finance"],
          correctAnswer: 1,
          explanation: "DeFi stands for Decentralized Finance - finance without banks!"
        }
      ]
    };
    
    return quizMap[term] || [{
      question: "What did you learn about " + term + "?",
      options: ["It's useful", "It's confusing", "It's risky", "It's expensive"],
      correctAnswer: 0,
      explanation: "Great question! Keep learning!"
    }];
  }

  /**
   * Provide personalized learning recommendations
   */
  async getPersonalizedRecommendations(phoneNumber: string, userLevel: 'beginner' | 'intermediate' | 'advanced'): Promise<string[]> {
    const recommendations: { [key: string]: string[] } = {
      'beginner': [
        "Start with: What is DeFi?",
        "Learn about: What is a wallet?",
        "Try: How do I send money?",
        "Understand: What is PYUSD?"
      ],
      'intermediate': [
        "Explore: What is yield farming?",
        "Learn: What is staking?",
        "Understand: How do I stay safe?",
        "Try: Advanced DeFi features"
      ],
      'advanced': [
        "Master: Smart contract interactions",
        "Explore: Advanced yield strategies",
        "Learn: Risk management",
        "Try: DeFi protocols"
      ]
    };
    
    return recommendations[userLevel] || recommendations['beginner'];
  }

  /**
   * Generate encouragement message
   */
  generateEncouragement(progress: number): string {
    if (progress < 25) {
      return "🌟 Great start! You're learning the basics of DeFi. Keep going!";
    } else if (progress < 50) {
      return "🚀 Excellent progress! You're understanding how DeFi works!";
    } else if (progress < 75) {
      return "💎 Amazing! You're becoming a DeFi expert!";
    } else {
      return "🏆 Outstanding! You've mastered DeFi basics! Ready for advanced topics?";
    }
  }

  /**
   * Format educational response for SMS
   */
  formatForSMS(response: EducationalResponse): string {
    let smsResponse = `📚 ${response.explanation}\n\n`;
    smsResponse += `🔍 Analogy: ${response.analogy}\n\n`;
    smsResponse += `💡 Example: ${response.example}\n\n`;
    smsResponse += `⚠️ Risk: ${response.riskLevel.toUpperCase()}\n\n`;
    
    if (response.followUpQuestions.length > 0) {
      smsResponse += `❓ Try asking:\n`;
      response.followUpQuestions.slice(0, 2).forEach(question => {
        smsResponse += `• ${question}\n`;
      });
    }
    
    return smsResponse;
  }

  /**
   * Check if user needs onboarding
   */
  async needsOnboarding(phoneNumber: string): Promise<boolean> {
    // This would typically check user's transaction history and learning progress
    // For now, return true for new users
    return true;
  }

  /**
   * Get onboarding welcome message
   */
  getOnboardingWelcome(): string {
    return `🎉 Welcome to OfflinePay!

I'm your DeFi teacher! I'll explain everything in simple terms.

Start with: "What is DeFi?"
Or try: "How do I send money?"

I'm here to help you learn! 📚`;
  }
}

// Export singleton instance
export const eli5OnboardingAgent = ELI5OnboardingAgent.getInstance();
