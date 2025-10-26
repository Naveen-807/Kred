/**
 * Goal-Oriented Financial Planner Agent
 * Helps users set and achieve financial goals with automated savings
 * Provides yield strategies and proactive reminders
 */

import { logger } from '../utils/logger.js';
import { FinancialGoalModel } from '../models/FinancialGoal.js';
import { UserContextModel } from '../models/UserContext.js';

interface SavingsGoal {
  goalId: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  duration: number; // months
  monthlyDeposit: number;
  startDate: Date;
  targetDate: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
}

interface YieldStrategy {
  protocol: string;
  apy: number;
  riskScore: number;
  description: string;
  minAmount: number;
}

interface GoalAnalysis {
  feasibility: 'easy' | 'moderate' | 'challenging' | 'impossible';
  monthlyRequired: number;
  totalInterest: number;
  riskAssessment: string;
  recommendations: string[];
}

export class FinancialPlannerAgent {
  private static instance: FinancialPlannerAgent;

  static getInstance(): FinancialPlannerAgent {
    if (!FinancialPlannerAgent.instance) {
      FinancialPlannerAgent.instance = new FinancialPlannerAgent();
    }
    return FinancialPlannerAgent.instance;
  }

  /**
   * Create a new savings goal
   */
  async createSavingsGoal(phoneNumber: string, goalData: {
    description: string;
    targetAmount: number;
    duration: number;
  }): Promise<SavingsGoal> {
    try {
      const goalId = `GOAL-${Date.now()}`;
      const monthlyDeposit = goalData.targetAmount / goalData.duration;
      const startDate = new Date();
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + goalData.duration);

      // Analyze goal feasibility
      const analysis = await this.analyzeGoal(goalData.targetAmount, goalData.duration, phoneNumber);
      
      // Get best yield strategy
      const yieldStrategy = await this.getBestYieldStrategy(goalData.targetAmount);

      const goal = await FinancialGoalModel.create({
        phoneNumber,
        goalId,
        description: goalData.description,
        targetAmount: goalData.targetAmount,
        currentAmount: 0,
        duration: goalData.duration,
        monthlyDeposit: monthlyDeposit,
        startDate,
        targetDate,
        status: 'active',
        yieldStrategy: {
          protocol: yieldStrategy.protocol,
          apy: yieldStrategy.apy,
          riskScore: yieldStrategy.riskScore
        },
        reminders: this.generateReminders(startDate, targetDate, monthlyDeposit)
      });

      logger.info({ phoneNumber, goalId, goalData }, 'Savings goal created');
      
      return {
        goalId: goal.goalId,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        duration: goal.duration,
        monthlyDeposit: goal.monthlyDeposit,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        status: goal.status
      };
    } catch (error) {
      logger.error({ err: error, phoneNumber, goalData }, 'Error creating savings goal');
      throw error;
    }
  }

  /**
   * Analyze goal feasibility
   */
  async analyzeGoal(targetAmount: number, duration: number, phoneNumber: string): Promise<GoalAnalysis> {
    try {
      const monthlyRequired = targetAmount / duration;
      
      // Get user's transaction patterns
      const userContext = await UserContextModel.findOne({ phoneNumber });
      const avgTransaction = userContext?.knowledgeGraph?.transactionPatterns?.averageAmount || 0;
      const monthlyVolume = userContext?.knowledgeGraph?.transactionPatterns?.monthlyVolume || 0;
      
      let feasibility: 'easy' | 'moderate' | 'challenging' | 'impossible';
      let riskAssessment: string;
      const recommendations: string[] = [];
      
      // Determine feasibility based on user's financial capacity
      if (monthlyRequired <= monthlyVolume * 0.1) {
        feasibility = 'easy';
        riskAssessment = 'Very achievable based on your spending patterns';
      } else if (monthlyRequired <= monthlyVolume * 0.3) {
        feasibility = 'moderate';
        riskAssessment = 'Achievable with some adjustments to spending';
        recommendations.push('Consider reducing discretionary spending');
      } else if (monthlyRequired <= monthlyVolume * 0.5) {
        feasibility = 'challenging';
        riskAssessment = 'Requires significant lifestyle changes';
        recommendations.push('Look for ways to increase income');
        recommendations.push('Consider extending the timeline');
      } else {
        feasibility = 'impossible';
        riskAssessment = 'Not achievable with current income patterns';
        recommendations.push('Increase income significantly');
        recommendations.push('Extend timeline to 2+ years');
        recommendations.push('Reduce target amount');
      }
      
      // Calculate potential interest earnings
      const totalInterest = targetAmount * 0.05 * (duration / 12); // Assume 5% APY
      
      return {
        feasibility,
        monthlyRequired,
        totalInterest,
        riskAssessment,
        recommendations
      };
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error analyzing goal');
      return {
        feasibility: 'moderate',
        monthlyRequired: targetAmount / duration,
        totalInterest: 0,
        riskAssessment: 'Unable to analyze',
        recommendations: ['Start with small amounts']
      };
    }
  }

  /**
   * Get best yield strategy for goal amount
   */
  async getBestYieldStrategy(amount: number): Promise<YieldStrategy> {
    const strategies: YieldStrategy[] = [
      {
        protocol: 'Aave',
        apy: 5.2,
        riskScore: 20,
        description: 'Safe lending protocol with good returns',
        minAmount: 10
      },
      {
        protocol: 'Compound',
        apy: 4.8,
        riskScore: 25,
        description: 'Established lending protocol',
        minAmount: 10
      },
      {
        protocol: 'Uniswap',
        apy: 8.5,
        riskScore: 35,
        description: 'Liquidity provision with higher returns',
        minAmount: 50
      },
      {
        protocol: 'Yearn',
        apy: 12.0,
        riskScore: 45,
        description: 'Automated yield farming strategies',
        minAmount: 100
      }
    ];
    
    // Filter strategies by minimum amount and select best risk-adjusted return
    const availableStrategies = strategies.filter(s => s.minAmount <= amount);
    
    if (availableStrategies.length === 0) {
      return strategies[0]; // Default to Aave
    }
    
    // Select strategy with best risk-adjusted return (APY / RiskScore)
    const bestStrategy = availableStrategies.reduce((best, current) => {
      const bestScore = best.apy / best.riskScore;
      const currentScore = current.apy / current.riskScore;
      return currentScore > bestScore ? current : best;
    });
    
    return bestStrategy;
  }

  /**
   * Generate reminders for goal
   */
  private generateReminders(startDate: Date, targetDate: Date, monthlyDeposit: number): Array<{
    type: 'deposit' | 'milestone' | 'deadline';
    scheduledDate: Date;
    sent: boolean;
  }> {
    const reminders = [];
    
    // Monthly deposit reminders
    for (let i = 1; i <= 12; i++) {
      const reminderDate = new Date(startDate);
      reminderDate.setMonth(reminderDate.getMonth() + i);
      reminders.push({
        type: 'deposit',
        scheduledDate: reminderDate,
        sent: false
      });
    }
    
    // Milestone reminders (25%, 50%, 75%)
    const milestones = [0.25, 0.5, 0.75];
    milestones.forEach(milestone => {
      const milestoneDate = new Date(startDate);
      milestoneDate.setMonth(milestoneDate.getMonth() + (milestone * 12));
      reminders.push({
        type: 'milestone',
        scheduledDate: milestoneDate,
        sent: false
      });
    });
    
    // Deadline reminder
    reminders.push({
      type: 'deadline',
      scheduledDate: targetDate,
      sent: false
    });
    
    return reminders;
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(phoneNumber: string, goalId: string, depositAmount: number): Promise<boolean> {
    try {
      const goal = await FinancialGoalModel.findOne({ phoneNumber, goalId });
      if (!goal) return false;
      
      const newAmount = goal.currentAmount + depositAmount;
      const isCompleted = newAmount >= goal.targetAmount;
      
      await FinancialGoalModel.updateOne(
        { phoneNumber, goalId },
        {
          $set: {
            currentAmount: newAmount,
            status: isCompleted ? 'completed' : 'active'
          }
        }
      );
      
      logger.info({ phoneNumber, goalId, depositAmount, newAmount }, 'Goal progress updated');
      return true;
    } catch (error) {
      logger.error({ err: error, phoneNumber, goalId }, 'Error updating goal progress');
      return false;
    }
  }

  /**
   * Get user's active goals
   */
  async getActiveGoals(phoneNumber: string): Promise<SavingsGoal[]> {
    try {
      const goals = await FinancialGoalModel.find({ 
        phoneNumber, 
        status: 'active' 
      }).sort({ createdAt: -1 });
      
      return goals.map(goal => ({
        goalId: goal.goalId,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        duration: goal.duration,
        monthlyDeposit: goal.monthlyDeposit,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        status: goal.status
      }));
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error getting active goals');
      return [];
    }
  }

  /**
   * Get goal status message
   */
  async getGoalStatusMessage(phoneNumber: string, goalId: string): Promise<string> {
    try {
      const goal = await FinancialGoalModel.findOne({ phoneNumber, goalId });
      if (!goal) return 'Goal not found';
      
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const remaining = goal.targetAmount - goal.currentAmount;
      const monthsRemaining = Math.ceil(remaining / goal.monthlyDeposit);
      
      let message = `🎯 Goal: ${goal.description}\n`;
      message += `💰 Progress: ${progress.toFixed(1)}% (${goal.currentAmount.toFixed(2)}/${goal.targetAmount} PYUSD)\n`;
      message += `📅 Remaining: ${remaining.toFixed(2)} PYUSD in ${monthsRemaining} months\n`;
      message += `💡 Monthly deposit: ${goal.monthlyDeposit.toFixed(2)} PYUSD\n`;
      
      if (goal.yieldStrategy) {
        message += `📈 Yield strategy: ${goal.yieldStrategy.protocol} (${goal.yieldStrategy.apy}% APY)\n`;
      }
      
      if (progress >= 100) {
        message += `🎉 CONGRATULATIONS! Goal completed!`;
      } else if (progress >= 75) {
        message += `🚀 Almost there! Keep it up!`;
      } else if (progress >= 50) {
        message += `💪 Halfway there! Great progress!`;
      } else if (progress >= 25) {
        message += `🌟 Good start! Keep going!`;
      } else {
        message += `🌱 Just getting started!`;
      }
      
      return message;
    } catch (error) {
      logger.error({ err: error, phoneNumber, goalId }, 'Error getting goal status');
      return 'Error getting goal status';
    }
  }

  /**
   * Get overdue reminders
   */
  async getOverdueReminders(): Promise<Array<{
    phoneNumber: string;
    goalId: string;
    reminderType: string;
    message: string;
  }>> {
    try {
      const now = new Date();
      const overdueGoals = await FinancialGoalModel.find({
        status: 'active',
        'reminders.scheduledDate': { $lte: now },
        'reminders.sent': false
      });
      
      const reminders = [];
      
      for (const goal of overdueGoals) {
        const overdueReminder = goal.reminders.find(r => 
          r.scheduledDate <= now && !r.sent
        );
        
        if (overdueReminder) {
          let message = '';
          
          switch (overdueReminder.type) {
            case 'deposit':
              message = `💰 Reminder: Time for your monthly deposit of ${goal.monthlyDeposit.toFixed(2)} PYUSD for "${goal.description}"`;
              break;
            case 'milestone':
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              message = `🎯 Milestone: You're ${progress.toFixed(1)}% towards "${goal.description}"!`;
              break;
            case 'deadline':
              message = `⏰ Deadline approaching for "${goal.description}"!`;
              break;
          }
          
          reminders.push({
            phoneNumber: goal.phoneNumber,
            goalId: goal.goalId,
            reminderType: overdueReminder.type,
            message
          });
          
          // Mark reminder as sent
          await FinancialGoalModel.updateOne(
            { _id: goal._id, 'reminders.scheduledDate': overdueReminder.scheduledDate },
            { $set: { 'reminders.$.sent': true } }
          );
        }
      }
      
      return reminders;
    } catch (error) {
      logger.error({ err: error }, 'Error getting overdue reminders');
      return [];
    }
  }

  /**
   * Suggest goal adjustments
   */
  async suggestGoalAdjustments(phoneNumber: string, goalId: string): Promise<string[]> {
    try {
      const goal = await FinancialGoalModel.findOne({ phoneNumber, goalId });
      if (!goal) return [];
      
      const suggestions: string[] = [];
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const monthsElapsed = Math.floor((Date.now() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const expectedProgress = (monthsElapsed / goal.duration) * 100;
      
      if (progress < expectedProgress - 20) {
        suggestions.push('Consider increasing monthly deposits');
        suggestions.push('Look for ways to earn extra income');
      }
      
      if (progress > expectedProgress + 20) {
        suggestions.push('Great progress! Consider increasing your goal');
        suggestions.push('You might finish early!');
      }
      
      if (goal.yieldStrategy && goal.yieldStrategy.apy < 3) {
        suggestions.push('Consider switching to a higher-yield strategy');
      }
      
      return suggestions;
    } catch (error) {
      logger.error({ err: error, phoneNumber, goalId }, 'Error suggesting goal adjustments');
      return [];
    }
  }

  /**
   * Calculate compound interest for goal
   */
  calculateCompoundInterest(principal: number, monthlyDeposit: number, apy: number, months: number): number {
    const monthlyRate = apy / 100 / 12;
    let total = principal;
    
    for (let i = 0; i < months; i++) {
      total = (total + monthlyDeposit) * (1 + monthlyRate);
    }
    
    return total;
  }

  /**
   * Get financial health score
   */
  async getFinancialHealthScore(phoneNumber: string): Promise<{
    score: number;
    factors: string[];
    recommendations: string[];
  }> {
    try {
      const goals = await this.getActiveGoals(phoneNumber);
      const userContext = await UserContextModel.findOne({ phoneNumber });
      
      let score = 50; // Base score
      const factors: string[] = [];
      const recommendations: string[] = [];
      
      // Factor 1: Number of active goals
      if (goals.length > 0) {
        score += 20;
        factors.push(`+20: ${goals.length} active savings goal(s)`);
      } else {
        recommendations.push('Set a savings goal to improve financial health');
      }
      
      // Factor 2: Goal progress
      const avgProgress = goals.reduce((sum, goal) => 
        sum + (goal.currentAmount / goal.targetAmount), 0
      ) / goals.length || 0;
      
      if (avgProgress > 0.5) {
        score += 15;
        factors.push('+15: Good progress on savings goals');
      } else if (avgProgress > 0.25) {
        score += 10;
        factors.push('+10: Moderate progress on savings goals');
      }
      
      // Factor 3: Monthly transaction volume
      const monthlyVolume = userContext?.knowledgeGraph?.transactionPatterns?.monthlyVolume || 0;
      if (monthlyVolume > 500) {
        score += 10;
        factors.push('+10: Good transaction volume');
      } else if (monthlyVolume > 100) {
        score += 5;
        factors.push('+5: Moderate transaction volume');
      }
      
      // Factor 4: Diversification
      const uniqueProtocols = new Set(goals.map(g => g.yieldStrategy?.protocol)).size;
      if (uniqueProtocols > 1) {
        score += 5;
        factors.push('+5: Diversified yield strategies');
      }
      
      return {
        score: Math.min(score, 100),
        factors,
        recommendations
      };
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Error calculating financial health score');
      return {
        score: 50,
        factors: ['Unable to calculate'],
        recommendations: ['Set up savings goals']
      };
    }
  }
}

// Export singleton instance
export const financialPlannerAgent = FinancialPlannerAgent.getInstance();
