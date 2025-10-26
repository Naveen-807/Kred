/**
 * Proactive Risk Assessment Agent
 * Analyzes protocol risks and provides warnings before investments
 * Maintains protocol reputation database and risk scoring
 */

import { logger } from '../utils/logger.js';
import protocolReputation from '../knowledge/protocol-reputation.json' assert { type: 'json' };

interface RiskAssessment {
  protocol: string;
  riskScore: number; // 0-100
  riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  factors: string[];
  warnings: string[];
  alternatives: string[];
  recommendation: 'safe' | 'caution' | 'avoid';
}

interface ProtocolAnalysis {
  name: string;
  category: string;
  riskScore: number;
  audited: boolean;
  auditFirms: string[];
  tvlUsd: number;
  ageMonths: number;
  exploits: number;
  description: string;
  apyRange: string;
  recommended: boolean;
  safetyFeatures: string[];
  risks?: string[];
}

interface InvestmentContext {
  amount: number;
  userRiskTolerance: 'low' | 'medium' | 'high';
  userExperience: 'beginner' | 'intermediate' | 'advanced';
  portfolioDiversity: number;
}

export class RiskOracleAgent {
  private static instance: RiskOracleAgent;

  static getInstance(): RiskOracleAgent {
    if (!RiskOracleAgent.instance) {
      RiskOracleAgent.instance = new RiskOracleAgent();
    }
    return RiskOracleAgent.instance;
  }

  /**
   * Assess risk for a protocol investment
   */
  async assessProtocolRisk(protocol: string, context: InvestmentContext): Promise<RiskAssessment> {
    try {
      const protocolData = this.getProtocolData(protocol);
      const riskScore = this.calculateRiskScore(protocolData, context);
      const riskLevel = this.getRiskLevel(riskScore);
      
      const assessment: RiskAssessment = {
        protocol,
        riskScore,
        riskLevel,
        factors: this.getRiskFactors(protocolData, context),
        warnings: this.generateWarnings(protocolData, riskScore, context),
        alternatives: this.getSaferAlternatives(protocolData, context),
        recommendation: this.getRecommendation(riskScore, context)
      };
      
      logger.info({ protocol, riskScore, riskLevel, context }, 'Risk assessment completed');
      return assessment;
    } catch (error) {
      logger.error({ err: error, protocol, context }, 'Error assessing protocol risk');
      return this.getDefaultHighRiskAssessment(protocol);
    }
  }

  /**
   * Get protocol data from reputation database
   */
  private getProtocolData(protocol: string): ProtocolAnalysis {
    const protocolKey = protocol.toLowerCase();
    const protocolData = protocolReputation.protocols[protocolKey];
    
    if (protocolData) {
      return {
        name: protocolData.name,
        category: protocolData.category,
        riskScore: protocolData.risk_score,
        audited: protocolData.audited,
        auditFirms: protocolData.audit_firms || [],
        tvlUsd: protocolData.tvl_usd || 0,
        ageMonths: protocolData.age_months || 0,
        exploits: protocolData.exploits || 0,
        description: protocolData.description,
        apyRange: protocolData.apy_range,
        recommended: protocolData.recommended,
        safetyFeatures: protocolData.safety_features || [],
        risks: protocolData.risks || []
      };
    }
    
    // Return unknown protocol data
    return {
      name: protocol,
      category: 'unknown',
      riskScore: 90,
      audited: false,
      auditFirms: [],
      tvlUsd: 0,
      ageMonths: 0,
      exploits: 0,
      description: 'Unknown protocol - high risk',
      apyRange: 'unknown',
      recommended: false,
      safetyFeatures: [],
      risks: ['No audit history', 'Unknown team', 'High risk of scam', 'No track record']
    };
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(protocolData: ProtocolAnalysis, context: InvestmentContext): number {
    let riskScore = protocolData.riskScore;
    
    // Adjust based on user context
    if (context.userRiskTolerance === 'low' && riskScore > 30) {
      riskScore += 20; // Increase risk for conservative users
    } else if (context.userRiskTolerance === 'high' && riskScore < 50) {
      riskScore -= 10; // Decrease risk for aggressive users
    }
    
    // Adjust based on user experience
    if (context.userExperience === 'beginner' && riskScore > 20) {
      riskScore += 15; // Increase risk for beginners
    } else if (context.userExperience === 'advanced' && riskScore < 60) {
      riskScore -= 5; // Decrease risk for experienced users
    }
    
    // Adjust based on investment amount
    if (context.amount > 1000 && riskScore > 40) {
      riskScore += 10; // Increase risk for large investments
    }
    
    // Adjust based on portfolio diversity
    if (context.portfolioDiversity < 0.3 && riskScore > 30) {
      riskScore += 10; // Increase risk for concentrated portfolios
    }
    
    return Math.min(Math.max(riskScore, 0), 100);
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(riskScore: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (riskScore <= 20) return 'very_low';
    if (riskScore <= 40) return 'low';
    if (riskScore <= 60) return 'medium';
    if (riskScore <= 80) return 'high';
    return 'very_high';
  }

  /**
   * Get risk factors
   */
  private getRiskFactors(protocolData: ProtocolAnalysis, context: InvestmentContext): string[] {
    const factors: string[] = [];
    
    // Protocol-specific factors
    if (!protocolData.audited) {
      factors.push('No security audit');
    }
    
    if (protocolData.exploits > 0) {
      factors.push(`${protocolData.exploits} past exploit(s)`);
    }
    
    if (protocolData.ageMonths < 6) {
      factors.push('Very new protocol (< 6 months)');
    }
    
    if (protocolData.tvlUsd < 1000000) {
      factors.push('Low total value locked');
    }
    
    // User-specific factors
    if (context.userExperience === 'beginner' && protocolData.riskScore > 20) {
      factors.push('Complex for beginners');
    }
    
    if (context.amount > context.userRiskTolerance === 'low' ? 100 : 1000) {
      factors.push('Large investment amount');
    }
    
    return factors;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(protocolData: ProtocolAnalysis, riskScore: number, context: InvestmentContext): string[] {
    const warnings: string[] = [];
    
    if (riskScore > 80) {
      warnings.push('🚨 EXTREME RISK: This protocol is very dangerous');
      warnings.push('⚠️ Consider this money lost if you invest');
    } else if (riskScore > 60) {
      warnings.push('⚠️ HIGH RISK: Significant chance of loss');
      warnings.push('💡 Only invest what you can afford to lose');
    } else if (riskScore > 40) {
      warnings.push('⚠️ MEDIUM RISK: Some risk involved');
      warnings.push('💡 Start with small amounts');
    }
    
    if (!protocolData.audited) {
      warnings.push('🔍 No security audit - proceed with caution');
    }
    
    if (protocolData.exploits > 0) {
      warnings.push(`🚨 ${protocolData.exploits} past exploit(s) - high risk`);
    }
    
    if (context.userExperience === 'beginner' && riskScore > 20) {
      warnings.push('👶 Not recommended for beginners');
    }
    
    return warnings;
  }

  /**
   * Get safer alternatives
   */
  private getSaferAlternatives(protocolData: ProtocolAnalysis, context: InvestmentContext): string[] {
    const alternatives: string[] = [];
    
    // Get protocols in same category with lower risk
    const categoryProtocols = Object.values(protocolReputation.protocols)
      .filter((p: any) => p.category === protocolData.category && p.risk_score < protocolData.riskScore)
      .sort((a: any, b: any) => a.risk_score - b.risk_score)
      .slice(0, 3);
    
    categoryProtocols.forEach((p: any) => {
      alternatives.push(`${p.name} (Risk: ${p.risk_score}/100) - ${p.description}`);
    });
    
    // Add general safe alternatives
    if (alternatives.length === 0) {
      alternatives.push('Aave (Risk: 20/100) - Safe lending protocol');
      alternatives.push('Compound (Risk: 25/100) - Established protocol');
      alternatives.push('Uniswap (Risk: 30/100) - Leading DEX');
    }
    
    return alternatives;
  }

  /**
   * Get recommendation
   */
  private getRecommendation(riskScore: number, context: InvestmentContext): 'safe' | 'caution' | 'avoid' {
    if (riskScore <= 30) return 'safe';
    if (riskScore <= 60) return 'caution';
    return 'avoid';
  }

  /**
   * Get default high-risk assessment for unknown protocols
   */
  private getDefaultHighRiskAssessment(protocol: string): RiskAssessment {
    return {
      protocol,
      riskScore: 90,
      riskLevel: 'very_high',
      factors: ['Unknown protocol', 'No audit history', 'No track record'],
      warnings: [
        '🚨 UNKNOWN PROTOCOL: Extremely high risk',
        '⚠️ This protocol is not in our database',
        '💡 Consider well-known alternatives instead'
      ],
      alternatives: [
        'Aave (Risk: 20/100) - Safe lending protocol',
        'Compound (Risk: 25/100) - Established protocol',
        'Uniswap (Risk: 30/100) - Leading DEX'
      ],
      recommendation: 'avoid'
    };
  }

  /**
   * Check for red flags in protocol name or description
   */
  async checkRedFlags(protocol: string): Promise<string[]> {
    const redFlags = protocolReputation.red_flags;
    const protocolLower = protocol.toLowerCase();
    const foundFlags: string[] = [];
    
    // Check for common scam indicators
    if (protocolLower.includes('moon') || protocolLower.includes('rocket')) {
      foundFlags.push('Promises unrealistic returns');
    }
    
    if (protocolLower.includes('free') || protocolLower.includes('easy')) {
      foundFlags.push('Too good to be true promises');
    }
    
    if (protocolLower.includes('new') && !protocolLower.includes('protocol')) {
      foundFlags.push('Unproven new protocol');
    }
    
    // Check against known red flags
    redFlags.forEach(flag => {
      if (protocolLower.includes(flag.toLowerCase())) {
        foundFlags.push(flag);
      }
    });
    
    return foundFlags;
  }

  /**
   * Get protocol comparison
   */
  async compareProtocols(protocols: string[]): Promise<Array<{
    protocol: string;
    riskScore: number;
    apyRange: string;
    recommendation: string;
  }>> {
    const comparisons = protocols.map(protocol => {
      const protocolData = this.getProtocolData(protocol);
      return {
        protocol: protocolData.name,
        riskScore: protocolData.riskScore,
        apyRange: protocolData.apyRange,
        recommendation: protocolData.recommended ? 'Recommended' : 'Not recommended'
      };
    });
    
    return comparisons.sort((a, b) => a.riskScore - b.riskScore);
  }

  /**
   * Get risk-adjusted APY
   */
  calculateRiskAdjustedAPY(protocol: string, baseAPY: number): number {
    const protocolData = this.getProtocolData(protocol);
    const riskAdjustment = protocolData.riskScore / 100;
    
    // Risk-adjusted APY = Base APY * (1 - Risk Adjustment)
    return baseAPY * (1 - riskAdjustment);
  }

  /**
   * Generate risk report
   */
  async generateRiskReport(protocol: string, context: InvestmentContext): Promise<string> {
    const assessment = await this.assessProtocolRisk(protocol, context);
    
    let report = `🔍 Risk Assessment for ${protocol}\n\n`;
    report += `Risk Score: ${assessment.riskScore}/100 (${assessment.riskLevel.toUpperCase()})\n`;
    report += `Recommendation: ${assessment.recommendation.toUpperCase()}\n\n`;
    
    if (assessment.factors.length > 0) {
      report += `Risk Factors:\n`;
      assessment.factors.forEach(factor => {
        report += `• ${factor}\n`;
      });
      report += `\n`;
    }
    
    if (assessment.warnings.length > 0) {
      report += `Warnings:\n`;
      assessment.warnings.forEach(warning => {
        report += `${warning}\n`;
      });
      report += `\n`;
    }
    
    if (assessment.alternatives.length > 0) {
      report += `Safer Alternatives:\n`;
      assessment.alternatives.forEach(alternative => {
        report += `• ${alternative}\n`;
      });
    }
    
    return report;
  }

  /**
   * Update protocol reputation (for future ML integration)
   */
  async updateProtocolReputation(protocol: string, newData: Partial<ProtocolAnalysis>): Promise<void> {
    // This would typically update a database or ML model
    logger.info({ protocol, newData }, 'Protocol reputation update requested');
  }

  /**
   * Get portfolio risk score
   */
  async getPortfolioRiskScore(protocols: string[], amounts: number[]): Promise<number> {
    if (protocols.length === 0) return 0;
    
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    let weightedRiskScore = 0;
    
    protocols.forEach((protocol, index) => {
      const protocolData = this.getProtocolData(protocol);
      const weight = amounts[index] / totalAmount;
      weightedRiskScore += protocolData.riskScore * weight;
    });
    
    return Math.round(weightedRiskScore);
  }
}

// Export singleton instance
export const riskOracleAgent = RiskOracleAgent.getInstance();
